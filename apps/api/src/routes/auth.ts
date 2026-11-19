import { Router } from "express";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@salesflow/shared";
import { validate } from "../middleware/validation";
import { ok, err } from "../utils/response";
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from "../utils/jwt";
import { hash, compare } from "../utils/hash";
import { prisma } from "../config/prisma";
import { audit } from "../utils/audit";
import { env } from "../config/env";
import { seatBlockedReason } from "../utils/seats";

const router = Router();

/** Never leak password hashes or internal flags to the client. */
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  avatarUrl: true,
} as const;

async function getOrgContext(userId: string) {
  const m = await prisma.teamMembership.findFirst({
    where: { userId, deletedAt: null },
    select: { organizationId: true, role: true },
  });
  return m;
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: env.REFRESH_TTL_MS,
    path: "/",
  };
}

/** Issue a refresh token and persist its session so it can be revoked. */
async function issueRefreshToken(userId: string) {
  const { token, jti } = signRefresh({ userId });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenId: jti,
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_MS),
    },
  });
  return token;
}

async function revokeRefreshToken(token: string | undefined) {
  if (!token) return;
  try {
    const payload = verifyRefresh(token);
    await prisma.refreshToken.updateMany({
      where: { tokenId: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // token already invalid or expired
  }
}

router.post(
  "/register",
  validate(registerSchema),
  async (req, res) => {
    const { email, password, name, organizationName } = req.body as any;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err(res, "conflict", "Email already registered", 409, "email");

    const passwordHash = await hash(password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, emailVerified: false },
      });
      const org = await tx.organization.create({
        data: { name: organizationName, slug: organizationName.toLowerCase().replace(/\s+/g, "-"), status: "active" },
      });
      await tx.teamMembership.create({
        data: { userId: user.id, organizationId: org.id, role: "ORG_OWNER" },
      });
      await tx.subscription.create({
        data: { organizationId: org.id, plan: "STARTER", status: "TRIAL" },
      });
      await tx.emailVerificationToken.create({
        data: { userId: user.id, token: require("crypto").randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      return { user, org };
    });

    const access = signAccess({ userId: result.user.id, orgId: result.org.id });
    const refresh = await issueRefreshToken(result.user.id);
    res.cookie("refresh_token", refresh, refreshCookieOptions());
    await audit({
      orgId: result.org.id,
      userId: result.user.id,
      action: "auth_register",
      entityType: "user",
      entityId: result.user.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    const user = await prisma.user.findUnique({ where: { id: result.user.id }, select: publicUserSelect });
    return ok(res, { accessToken: access, user, organization: { id: result.org.id, name: result.org.name, slug: result.org.slug } }, 201);
  },
);

router.post(
  "/login",
  validate(loginSchema),
  async (req, res) => {
    const { email, password } = req.body as any;
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user || !(await compare(password, user.passwordHash))) {
      return err(res, "auth_invalid", "Invalid credentials", 401);
    }
    const membership = await getOrgContext(user.id);
    if (!membership) return err(res, "auth_invalid", "No organization membership", 401);

    const access = signAccess({ userId: user.id, orgId: membership.organizationId });
    const refresh = await issueRefreshToken(user.id);
    res.cookie("refresh_token", refresh, refreshCookieOptions());
    await audit({
      orgId: membership.organizationId,
      userId: user.id,
      action: "auth_login",
      entityType: "user",
      entityId: user.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
    return ok(res, { accessToken: access, user: safeUser, organizationId: membership.organizationId });
  },
);

router.post("/logout", async (req, res) => {
  await revokeRefreshToken(req.cookies?.refresh_token);
  res.clearCookie("refresh_token", { path: "/" });
  return ok(res, { loggedOut: true });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return err(res, "auth_required", "No refresh token", 401);
  try {
    const decoded = verifyRefresh(token);
    const session = await prisma.refreshToken.findUnique({ where: { tokenId: decoded.jti } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return err(res, "auth_invalid", "Session expired", 401);
    }
    const user = await prisma.user.findFirst({ where: { id: decoded.userId, deletedAt: null }, select: { id: true } });
    if (!user) return err(res, "auth_invalid", "User not found", 401);
    const membership = await getOrgContext(user.id);
    if (!membership) return err(res, "auth_invalid", "No membership", 401);

    // rotate: revoke the used token, issue a new one
    await prisma.refreshToken.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const access = signAccess({ userId: user.id, orgId: membership.organizationId });
    const newRefresh = await issueRefreshToken(user.id);
    res.cookie("refresh_token", newRefresh, refreshCookieOptions());
    return ok(res, { accessToken: access });
  } catch {
    return err(res, "auth_invalid", "Invalid refresh token", 401);
  }
});

router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body as any;
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) return ok(res, { message: "If the account exists, a reset link was sent" });
  const token = require("crypto").randomBytes(32).toString("hex");
  const existing = await prisma.passwordResetToken.findFirst({ where: { userId: user.id, used: false } });
  if (existing) {
    await prisma.passwordResetToken.update({ where: { id: existing.id }, data: { token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
  } else {
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
  }
  // In dev, log token; in prod, send email
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[reset-token] ${user.email}: ${token}`);
  }
  return ok(res, { message: "If the account exists, a reset link was sent" });
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body as any;
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date() || record.used) {
    return err(res, "auth_invalid", "Invalid or expired reset token", 401);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hash(password) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);
  return ok(res, { message: "Password reset" });
});

router.post("/verify-email", validate(verifyEmailSchema), async (req, res) => {
  const { token } = req.body as any;
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return err(res, "auth_invalid", "Invalid or expired verification token", 401);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
  return ok(res, { message: "Email verified" });
});

/** Public: what the invitee is about to join. The token is the credential. */
router.get("/invitations/:token", async (req, res) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { organization: { select: { id: true, name: true, slug: true, status: true } } },
  });
  if (!invitation) return err(res, "not_found", "Invitation not found", 404);
  if (invitation.acceptedAt) return err(res, "invite_used", "This invitation was already accepted", 410);
  if (invitation.expiresAt < new Date()) return err(res, "invite_expired", "This invitation has expired", 410);
  if (invitation.organization.status !== "active") {
    return err(res, "org_suspended", "This gym brand is suspended", 403);
  }
  const account = await prisma.user.findFirst({
    where: { email: invitation.email, deletedAt: null },
    select: { id: true, name: true },
  });
  return ok(res, {
    email: invitation.email,
    role: invitation.role,
    organization: { id: invitation.organization.id, name: invitation.organization.name, slug: invitation.organization.slug },
    expiresAt: invitation.expiresAt,
    // An existing sign-in needs the password; a new one also needs a name.
    existingAccount: !!account,
    suggestedName: account?.name ?? "",
  });
});

/**
 * Public: redeem an invitation.
 *
 * A brand-new email creates the user and joins the brand in one transaction.
 * An email that already has a GymFlow login must prove it with the existing
 * password — an invitation never becomes a password reset. Either way the seat
 * count is re-checked, so revoked plans cannot sneak a member in.
 */
router.post("/invitations/:token/accept", async (req, res) => {
  const body = z
    .object({
      name: z.string().min(1).max(100).optional(),
      password: z.string().min(8),
    })
    .safeParse(req.body);
  if (!body.success) {
    const issue = body.error.issues[0];
    return err(res, "validation_error", issue?.message || "Invalid sign-up details", 400, issue?.path.join("."));
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { organization: { select: { id: true, name: true, slug: true, status: true } } },
  });
  if (!invitation) return err(res, "not_found", "Invitation not found", 404);
  if (invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return err(res, "invite_expired", "This invitation is no longer valid", 410);
  }
  if (invitation.organization.status !== "active") {
    return err(res, "org_suspended", "This gym brand is suspended", 403);
  }

  const blocked = await seatBlockedReason(invitation.organizationId);
  if (blocked) return err(res, "seat_limit", blocked, 402);

  const email = invitation.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  let userId: string;
  if (existing) {
    if (!(await compare(body.data.password, existing.passwordHash))) {
      return err(res, "auth_invalid", "Password does not match the existing account for this email", 401, "password");
    }
    userId = existing.id;
    const membership = await prisma.teamMembership.findFirst({
      where: { userId, organizationId: invitation.organizationId },
    });
    await prisma.$transaction([
      membership
        ? prisma.teamMembership.update({
            where: { id: membership.id },
            data: { deletedAt: null, role: invitation.role },
          })
        : prisma.teamMembership.create({
            data: { userId, organizationId: invitation.organizationId, role: invitation.role },
          }),
      prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    ]);
  } else {
    const name = body.data.name?.trim();
    if (!name) return err(res, "validation_error", "Your name is required", 400, "name");
    const passwordHash = await hash(body.data.password);
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, emailVerified: true },
      });
      await tx.teamMembership.create({
        data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return user;
    });
    userId = created.id;
  }

  const access = signAccess({ userId, orgId: invitation.organizationId });
  const refresh = await issueRefreshToken(userId);
  res.cookie("refresh_token", refresh, refreshCookieOptions());
  await audit({
    orgId: invitation.organizationId,
    userId,
    action: "user.invite_accept",
    entityType: "invitation",
    entityId: invitation.id,
    newValues: { email, role: invitation.role },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  return ok(
    res,
    {
      accessToken: access,
      user,
      organization: { id: invitation.organization.id, name: invitation.organization.name, slug: invitation.organization.slug },
      role: invitation.role,
    },
    201,
  );
});

/** Every brand the signed-in user belongs to, with the role they hold there. */
router.get("/memberships", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return err(res, "auth_required", "Authentication required", 401);
  try {
    const decoded = verifyAccess(token);
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: decoded.userId, deletedAt: null, organization: { deletedAt: null } },
      select: {
        role: true,
        organizationId: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, memberships.map((m) => ({ organization: m.organization, role: m.role })));
  } catch {
    return err(res, "auth_invalid", "Invalid token", 401);
  }
});

/** Switch the active brand without re-entering credentials. */
router.post("/switch-org", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return err(res, "auth_required", "Authentication required", 401);
  const parsed = z.object({ organizationId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return err(res, "validation_error", "organizationId is required", 400, "organizationId");
  let userId: string;
  try {
    userId = verifyAccess(token).userId;
  } catch {
    return err(res, "auth_invalid", "Invalid token", 401);
  }
  const membership = await prisma.teamMembership.findFirst({
    where: { userId, organizationId: parsed.data.organizationId, deletedAt: null },
    select: { role: true },
  });
  if (!membership) return err(res, "forbidden", "Not a member of this organization", 403);
  const access = signAccess({ userId, orgId: parsed.data.organizationId });
  return ok(res, { accessToken: access, organizationId: parsed.data.organizationId, role: membership.role });
});

router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return err(res, "auth_required", "Authentication required", 401);
  try {
    const decoded = verifyAccess(token);
    const user = await prisma.user.findFirst({ where: { id: decoded.userId, deletedAt: null }, select: publicUserSelect });
    if (!user) return err(res, "not_found", "User not found", 404);
    const memberships = await prisma.teamMembership.findMany({ where: { userId: user.id, deletedAt: null } });
    return ok(res, { user, memberships });
  } catch {
    return err(res, "auth_invalid", "Invalid token", 401);
  }
});

export default router;
