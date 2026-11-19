import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const roles = await prisma.role.findMany({ where: { organizationId: req.orgId! } });
  return ok(res, roles);
});

router.post("/", requirePermission("manage_users"), async (req: AuthedRequest, res) => {
  const { name, key, permissions } = req.body as any;
  if (!name || !key) return err(res, "validation_error", "name and key required", 400);
  const role = await prisma.role.create({ data: { organizationId: req.orgId!, name, key, permissions: permissions || {} } });
  return ok(res, role, 201);
});

router.patch("/:id", requirePermission("manage_users"), async (req: AuthedRequest, res) => {
  const { name, key, permissions } = req.body as any;
  const role = await prisma.role.findFirst({ where: { id: req.params.id, organizationId: req.orgId! } });
  if (!role) return err(res, "not_found", "Role not found", 404);
  const updated = await prisma.role.update({ where: { id: req.params.id }, data: { ...(name && { name }), ...(key && { key }), ...(permissions !== undefined && { permissions }) } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "role.update", entityType: "role", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

export default router;
