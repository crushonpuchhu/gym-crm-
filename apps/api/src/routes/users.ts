import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

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
    "SALES_MANAGER",
    "SALES_REP",
    "SUPPORT_MANAGER",
    "SUPPORT_AGENT",
    "VIEWER",
  ]),
});

/** Members are addressed by user id from the client; resolve membership by user. */
async function findMembership(orgId: string, id: string) {
  return prisma.membership.findFirst({
    where: { organizationId: orgId, deletedAt: null, userId: id },
  });
}

router.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: req.orgId!, deletedAt: null },
    include: { user: { select: publicUserSelect } },
  });
  return ok(res, memberships.map((m) => ({ ...m.user, role: m.role })));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({
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
    const updated = await prisma.membership.update({
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
    await prisma.membership.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
    await audit({ orgId: req.orgId, userId: req.userId, action: "user.deactivate", entityType: "membership", entityId: membership.id, ip: req.ip, userAgent: req.get("user-agent") });
    return ok(res, { deactivated: true });
  },
);

export default router;
