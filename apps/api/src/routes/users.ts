import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { organizationId: req.orgId!, deletedAt: null },
    include: { user: true },
  });
  return ok(res, memberships.map((m) => ({ ...m.user, role: m.role })));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null }, include: { user: true } });
  if (!membership) return err(res, "not_found", "User not found in org", 404);
  return ok(res, { ...membership.user, role: membership.role });
});

router.patch("/:id/role", async (req: AuthedRequest, res) => {
  const { role } = req.body as any;
  if (!role) return err(res, "validation_error", "role required", 400);
  const membership = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!membership) return err(res, "not_found", "Membership not found", 404);
  const updated = await prisma.membership.update({ where: { id: req.params.id }, data: { role } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "user.role_change", entityType: "membership", entityId: req.params.id, newValues: { role }, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!membership) return err(res, "not_found", "Membership not found", 404);
  await prisma.membership.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deactivated: true });
});

export default router;
