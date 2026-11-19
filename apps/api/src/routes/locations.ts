import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

const locationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  opensAt: z.string().max(5).optional(),
  closesAt: z.string().max(5).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true, checkIns: true, memberships: true } },
        members: { where: { deletedAt: null, status: "ACTIVE" }, select: { id: true }, take: 5 },
      },
    }),
    prisma.location.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const data = locationSchema.parse(req.body);
  const location = await prisma.location.create({ data: { organizationId: req.orgId!, ...data } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "location.create", entityType: "location", entityId: location.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, location, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const location = await prisma.location.findFirst({
    where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null },
    include: {
      _count: { select: { members: true, memberships: true, checkIns: true } },
    },
  });
  if (!location) return err(res, "not_found", "Location not found", 404);
  return ok(res, location);
});

router.patch("/:id", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const location = await prisma.location.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!location) return err(res, "not_found", "Location not found", 404);
  const data = locationSchema.partial().parse(req.body);
  const updated = await prisma.location.update({ where: { id: req.params.id }, data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "location.update", entityType: "location", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const location = await prisma.location.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!location) return err(res, "not_found", "Location not found", 404);
  const memberCount = await prisma.member.count({ where: { locationId: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (memberCount > 0) return err(res, "conflict", "Move or cancel the members at this location first", 409);
  await prisma.location.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "location.delete", entityType: "location", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
