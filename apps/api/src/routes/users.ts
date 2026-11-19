import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";
import { canAssignRole } from "../config/permissions";

const router = Router();

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  avatarUrl: true,
} as const;

const roleSchema = z.object({
  role: z.enum([
    "SUPER_ADMIN",
    "ORG_OWNER",
    "ORG_ADMIN",
    "CLUB_MANAGER",
    "MEMBERSHIP_ADVISOR",
    "SUPPORT_MANAGER",
    "SUPPORT_AGENT",
    "VIEWER",
  ]),
});

/** Members are addressed by user id from the client; resolve membership by user. */
async function findMembership(orgId: string, id: string) {
  return prisma.teamMembership.findFirst({
    where: { organizationId: orgId, deletedAt: null, userId: id },
  });
}

router.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { organizationId: req.orgId!, deletedAt: null },
    include: { user: { select: publicUserSelect } },
  });
  return ok(res, memberships.map((m) => ({ ...m.user, role: m.role })));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const membership = await prisma.teamMembership.findFirst({
    where: { organizationId: req.orgId!, deletedAt: null, userId: req.params.id },
    include: { user: { select: publicUserSelect } },
  });
  if (!membership) return err(res, "not_found", "User not found in org", 404);
  return ok(res, { ...membership.user, role: membership.role });
});

router.patch(
  "/:id/role",
  requirePermission("manage_users"),
  async (req: AuthedRequest, res) => {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return err(res, "validation_error", "Invalid role", 400, "role");
    const membership = await findMembership(req.orgId!, req.params.id);
    if (!membership) return err(res, "not_found", "Membership not found", 404);
    if (membership.userId === req.userId) {
      return err(res, "forbidden", "Cannot change your own role", 403);
    }
    // Nobody may edit a role above their own, or hand out one above their own.
    if (!canAssignRole(req.role, membership.role)) {
      return err(res, "forbidden", "Cannot change the role of a more senior staff member", 403);
    }
    if (!canAssignRole(req.role, parsed.data.role)) {
      return err(res, "forbidden", "You cannot grant a role above your own", 403, "role");
    }
    if (membership.role === "ORG_OWNER" && req.role !== "ORG_OWNER") {
      return err(res, "forbidden", "Only the owner can change the owner role", 403);
    }
    const updated = await prisma.teamMembership.update({
      where: { id: membership.id },
      data: { role: parsed.data.role },
    });
    await audit({ orgId: req.orgId, userId: req.userId, action: "user.role_change", entityType: "membership", entityId: membership.id, newValues: { role: parsed.data.role }, ip: req.ip, userAgent: req.get("user-agent") });
    return ok(res, { id: updated.id, userId: updated.userId, role: updated.role });
  },
);

router.delete(
  "/:id",
  requirePermission("manage_users"),
  async (req: AuthedRequest, res) => {
    const membership = await findMembership(req.orgId!, req.params.id);
    if (!membership) return err(res, "not_found", "Membership not found", 404);
    if (membership.userId === req.userId) {
      return err(res, "forbidden", "Cannot deactivate yourself", 403);
    }
    if (membership.role === "ORG_OWNER") {
      return err(res, "forbidden", "The brand owner cannot be removed", 403);
    }
    if (!canAssignRole(req.role, membership.role)) {
      return err(res, "forbidden", "Cannot remove a more senior staff member", 403);
    }
    await prisma.teamMembership.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
    await audit({ orgId: req.orgId, userId: req.userId, action: "user.deactivate", entityType: "membership", entityId: membership.id, ip: req.ip, userAgent: req.get("user-agent") });
    return ok(res, { deactivated: true });
  },
);

export default router;
