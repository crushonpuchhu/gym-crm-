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
