import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();
const dealSchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().datetime().optional(),
});

/** Validate every relation referenced by a deal belongs to the current tenant. */
async function assertRelationsInOrg(
  orgId: string,
  data: { pipelineId?: string; stageId?: string; contactId?: string; companyId?: string },
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
  if (data.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: data.contactId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!contact) return "contactId not found in organization";
  }
  if (data.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: data.companyId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!company) return "companyId not found in organization";
  }
  return null;
}

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.pipelineId) where.pipelineId = req.query.pipelineId;
  if (req.query.stageId) where.stageId = req.query.stageId;
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { stage: true, contact: true, company: true, owner: { select: { id: true, name: true } } },
    }),
    prisma.deal.count({ where }),
  ]);
  const weighted = items.reduce((sum, d) => sum + Number(d.value) * (d.probability / 100), 0);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit), weightedRevenue: weighted });
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = dealSchema.parse(req.body);
  const relationError = await assertRelationsInOrg(req.orgId!, data);
  if (relationError) return err(res, "validation_error", relationError, 400);
  const stage = await prisma.pipelineStage.findUnique({ where: { id: data.stageId } });
  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        organizationId: req.orgId!,
        ownerId: req.userId!,
        ...data,
        expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined,
      },
      include: { stage: true },
    });
    await tx.dealStageHistory.create({ data: { dealId: created.id, toStageId: stage!.id, changedById: req.userId! } });
    return created;
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "deal.create", entityType: "deal", entityId: deal.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, deal, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const deal = await prisma.deal.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null }, include: { stage: true, stageHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { id: true, name: true } } } }, contact: true, company: true } });
  if (!deal) return err(res, "not_found", "Deal not found", 404);
  return ok(res, deal);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const deal = await prisma.deal.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!deal) return err(res, "not_found", "Deal not found", 404);
  const data = dealSchema.partial().parse(req.body);
  const relationError = await assertRelationsInOrg(req.orgId!, {
    ...data,
    pipelineId: data.pipelineId ?? deal.pipelineId,
  });
  if (relationError) return err(res, "validation_error", relationError, 400);

  const updateData: any = { ...data, expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined };
  const stageChanged = !!data.stageId && data.stageId !== deal.stageId;
  let nextStage: { id: string; isWon: boolean; isLost: boolean } | null = null;
  if (stageChanged) {
    nextStage = await prisma.pipelineStage.findFirst({
      where: { id: data.stageId, pipelineId: deal.pipelineId, deletedAt: null },
    });
    if (!nextStage) return err(res, "validation_error", "stageId does not belong to this pipeline", 400, "stageId");
    if (nextStage.isWon) updateData.wonAt = new Date();
    if (nextStage.isLost) updateData.lostAt = new Date();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.deal.update({ where: { id: req.params.id }, data: updateData, include: { stage: true } });
    if (stageChanged && nextStage) {
      await tx.dealStageHistory.create({
        data: { dealId: deal.id, fromStageId: deal.stageId, toStageId: nextStage.id, changedById: req.userId! },
      });
    }
    return result;
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "deal.update", entityType: "deal", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const deal = await prisma.deal.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!deal) return err(res, "not_found", "Deal not found", 404);
  await prisma.deal.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "deal.delete", entityType: "deal", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
