import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";
import { ASSIGNABLE_ROLES } from "../config/permissions";
import { createInvitation, InviteError, inviteUrl } from "../utils/invitations";
import { seatUsage } from "../utils/seats";

const router = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]),
});

/** Pending and past invitations for the brand, newest first. */
router.get("/", requirePermission("manage_users"), async (req: AuthedRequest, res) => {
  const [items, seats] = await Promise.all([
    prisma.invitation.findMany({
      where: { organizationId: req.orgId! },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    seatUsage(req.orgId!),
  ]);
  return ok(res, {
    items: items.map((item) => ({
      id: item.id,
      email: item.email,
      role: item.role,
      expiresAt: item.expiresAt,
      acceptedAt: item.acceptedAt,
      createdAt: item.createdAt,
      invitedBy: item.createdBy?.name ?? null,
      status: item.acceptedAt ? "accepted" : item.expiresAt < new Date() ? "expired" : "pending",
      // Only pending links are useful to copy.
      link: item.acceptedAt ? null : inviteUrl(item.token),
    })),
    seats,
  });
});

router.post("/", requirePermission("manage_users"), async (req: AuthedRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(res, "validation_error", issue?.message || "Invalid invitation", 400, issue?.path.join("."));
  }
  try {
    const { invitation, inviteUrl: link } = await createInvitation({
      orgId: req.orgId!,
      actorId: req.userId!,
      actorRole: req.role,
      email: parsed.data.email,
      role: parsed.data.role,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return ok(res, { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt, link }, 201);
  } catch (error) {
    if (error instanceof InviteError) return err(res, error.code, error.message, error.status, error.field);
    throw error;
  }
});

router.delete("/:id", requirePermission("manage_users"), async (req: AuthedRequest, res) => {
  const invitation = await prisma.invitation.findFirst({
    where: { id: req.params.id, organizationId: req.orgId! },
  });
  if (!invitation) return err(res, "not_found", "Invitation not found", 404);
  if (invitation.acceptedAt) return err(res, "conflict", "Invitation already accepted", 409);
  await prisma.invitation.delete({ where: { id: invitation.id } });
  await audit({
    orgId: req.orgId,
    userId: req.userId,
    action: "user.invite_revoke",
    entityType: "invitation",
    entityId: invitation.id,
    oldValues: { email: invitation.email, role: invitation.role },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, { revoked: true });
});

export default router;
