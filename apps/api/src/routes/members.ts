import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

const memberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.union([z.string().email(), z.literal("")]).optional().transform((v) => (v ? v : undefined)),
  phone: z.string().max(50).optional(),
  locationId: z.union([z.string().uuid(), z.literal("")]).optional().transform((v) => (v ? v : undefined)),
  status: z.enum(["TRIAL", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"]).default("ACTIVE"),
  fitnessGoal: z.string().max(200).optional(),
  emergencyContact: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  joinedAt: z.string().datetime().optional(),
});

const memberInclude = {
  owner: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  memberships: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, status: true, monthlyValue: true, plan: { select: { id: true, name: true } } },
  },
};

/** Reject references to records outside the current tenant. */
async function assertLocationInOrg(orgId: string, locationId: string | undefined) {
  if (!locationId) return true;
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  return !!location;
}

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.status) where.status = req.query.status;
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.query.search) {
    where.OR = [
      { firstName: { contains: req.query.search } },
      { lastName: { contains: req.query.search } },
      { email: { contains: req.query.search } },
      { phone: { contains: req.query.search } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.member.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: memberInclude }),
    prisma.member.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", requirePermission("manage_members"), async (req: AuthedRequest, res) => {
  const data = memberSchema.parse(req.body);
  if (!(await assertLocationInOrg(req.orgId!, data.locationId))) {
    return err(res, "validation_error", "locationId not found in organization", 400, "locationId");
  }
  const member = await prisma.member.create({
    data: {
      organizationId: req.orgId!,
      ownerId: req.userId!,
      ...data,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
    },
    include: memberInclude,
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "member.create", entityType: "member", entityId: member.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, member, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const member = await prisma.member.findFirst({
    where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null },
    include: {
      ...memberInclude,
      memberships: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { plan: true, stage: true } },
      checkIns: { orderBy: { checkedInAt: "desc" }, take: 20 },
      tickets: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!member) return err(res, "not_found", "Member not found", 404);
  return ok(res, member);
});

router.patch("/:id", requirePermission("manage_members"), async (req: AuthedRequest, res) => {
  const member = await prisma.member.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!member) return err(res, "not_found", "Member not found", 404);
  const data = memberSchema.partial().parse(req.body);
  if (!(await assertLocationInOrg(req.orgId!, data.locationId))) {
    return err(res, "validation_error", "locationId not found in organization", 400, "locationId");
  }
  const updated = await prisma.member.update({
    where: { id: req.params.id },
    data: { ...data, joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined },
    include: memberInclude,
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "member.update", entityType: "member", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", requirePermission("manage_members"), async (req: AuthedRequest, res) => {
  const member = await prisma.member.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!member) return err(res, "not_found", "Member not found", 404);
  await prisma.member.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: "CANCELLED" } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "member.delete", entityType: "member", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
