import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

const planSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.coerce.number().nonnegative(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"]).default("MONTHLY"),
  durationDays: z.coerce.number().int().positive().default(30),
  color: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId: req.orgId!, deletedAt: null },
    orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { memberships: true } } },
  });
  return ok(res, plans);
});

router.post("/", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const data = planSchema.parse(req.body);
  const plan = await prisma.membershipPlan.create({ data: { organizationId: req.orgId!, ...data } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "plan.create", entityType: "membershipPlan", entityId: plan.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, plan, 201);
});

router.patch("/:id", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const plan = await prisma.membershipPlan.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!plan) return err(res, "not_found", "Plan not found", 404);
  const data = planSchema.partial().parse(req.body);
  const updated = await prisma.membershipPlan.update({ where: { id: req.params.id }, data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "plan.update", entityType: "membershipPlan", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", requirePermission("manage_org"), async (req: AuthedRequest, res) => {
  const plan = await prisma.membershipPlan.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!plan) return err(res, "not_found", "Plan not found", 404);
  const openCount = await prisma.membership.count({
    where: { planId: req.params.id, organizationId: req.orgId!, deletedAt: null, status: { in: ["PENDING", "ACTIVE", "PAUSED"] } },
  });
  if (openCount > 0) return err(res, "conflict", "Plan is in use by open memberships; archive it instead", 409);
  await prisma.membershipPlan.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "plan.delete", entityType: "membershipPlan", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
