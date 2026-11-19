import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

const membershipSchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  monthlyValue: z.coerce.number().nonnegative().default(0),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"]).default("MONTHLY"),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().datetime().optional(),
});

/** Validate every relation referenced by a membership belongs to the current tenant. */
async function assertRelationsInOrg(
  orgId: string,
  data: { pipelineId?: string; stageId?: string; memberId?: string; planId?: string; locationId?: string },
) {
  if (data.pipelineId) {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: data.pipelineId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!pipeline) return "pipelineId not found in organization";
  }
  if (data.stageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: data.stageId, deletedAt: null, pipeline: { organizationId: orgId, deletedAt: null } },
      select: { id: true, pipelineId: true },
    });
    if (!stage) return "stageId not found in organization";
    if (data.pipelineId && stage.pipelineId !== data.pipelineId) {
      return "stageId does not belong to pipelineId";
    }
  }
  if (data.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: data.memberId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!member) return "memberId not found in organization";
  }
  if (data.planId) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: data.planId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!plan) return "planId not found in organization";
  }
  if (data.locationId) {
    const location = await prisma.location.findFirst({
      where: { id: data.locationId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!location) return "locationId not found in organization";
  }
  return null;
}

const membershipInclude = {
  stage: true,
  member: { select: { id: true, firstName: true, lastName: true, status: true } },
  plan: { select: { id: true, name: true, price: true, billingCycle: true } },
  location: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
};

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.pipelineId) where.pipelineId = req.query.pipelineId;
  if (req.query.stageId) where.stageId = req.query.stageId;
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    where.OR = [
      { title: { contains: req.query.search } },
      { member: { firstName: { contains: req.query.search } } },
      { member: { lastName: { contains: req.query.search } } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: membershipInclude,
    }),
    prisma.membership.count({ where }),
  ]);
  const weighted = items.reduce((sum, d) => sum + Number(d.value) * (d.probability / 100), 0);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit), weightedRevenue: weighted });
});

router.post("/", requirePermission("manage_memberships"), async (req: AuthedRequest, res) => {
  const data = membershipSchema.parse(req.body);
  const relationError = await assertRelationsInOrg(req.orgId!, data);
  if (relationError) return err(res, "validation_error", relationError, 400);
  const stage = await prisma.pipelineStage.findUnique({ where: { id: data.stageId } });
  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.membership.create({
      data: {
        organizationId: req.orgId!,
        ownerId: req.userId!,
        ...data,
        expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined,
      },
      include: membershipInclude,
    });
    await tx.membershipStageHistory.create({ data: { membershipId: created.id, toStageId: stage!.id, changedById: req.userId! } });
    return created;
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "membership.create", entityType: "membership", entityId: membership.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, membership, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({
    where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null },
    include: {
      ...membershipInclude,
      stageHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!membership) return err(res, "not_found", "Membership not found", 404);
  return ok(res, membership);
});

router.patch("/:id", requirePermission("manage_memberships"), async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!membership) return err(res, "not_found", "Membership not found", 404);
  const data = membershipSchema.partial().parse(req.body);
  const relationError = await assertRelationsInOrg(req.orgId!, {
    ...data,
    pipelineId: data.pipelineId ?? membership.pipelineId,
  });
  if (relationError) return err(res, "validation_error", relationError, 400);

  const updateData: any = { ...data, expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined };
  const stageChanged = !!data.stageId && data.stageId !== membership.stageId;
  let nextStage: { id: string; isWon: boolean; isLost: boolean } | null = null;
  if (stageChanged) {
    nextStage = await prisma.pipelineStage.findFirst({
      where: { id: data.stageId, pipelineId: membership.pipelineId, deletedAt: null },
    });
    if (!nextStage) return err(res, "validation_error", "stageId does not belong to this pipeline", 400, "stageId");
    if (nextStage.isWon) {
      updateData.wonAt = new Date();
      updateData.lostAt = null;
      updateData.cancelledAt = null;
      updateData.status = "ACTIVE";
      updateData.startDate = membership.startDate ?? new Date();
      updateData.probability = 100;
    } else if (nextStage.isLost) {
      updateData.lostAt = new Date();
      updateData.cancelledAt = new Date();
      updateData.status = "CANCELLED";
      updateData.probability = 0;
      updateData.cancelReason = "Lost in pipeline";
    } else {
      updateData.probability = undefined;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.membership.update({ where: { id: req.params.id }, data: updateData, include: membershipInclude });
    if (stageChanged && nextStage) {
      await tx.membershipStageHistory.create({
        data: { membershipId: membership.id, fromStageId: membership.stageId, toStageId: nextStage.id, changedById: req.userId! },
      });
      if (nextStage.isWon && membership.memberId) {
        await tx.member.update({
          where: { id: membership.memberId },
          data: { status: "ACTIVE", joinedAt: membership.startDate ?? new Date() },
        });
      }
    }
    return result;
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "membership.update", entityType: "membership", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", requirePermission("manage_memberships"), async (req: AuthedRequest, res) => {
  const membership = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!membership) return err(res, "not_found", "Membership not found", 404);
  await prisma.membership.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "membership.delete", entityType: "membership", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
