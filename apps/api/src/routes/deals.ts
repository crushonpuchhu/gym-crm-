import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();
const dealSchema = z.object({
  pipelineId: z.string(),
  stageId: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseAt: z.string().datetime().optional(),
});

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
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: data.stageId, pipeline: { organizationId: req.orgId!, deletedAt: null } },
  });
  if (!stage) return err(res, "not_found", "Stage not found in org", 404);
  const deal = await prisma.deal.create({ data: { organizationId: req.orgId!, ownerId: req.userId!, ...data, expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined }, include: { stage: true } });
  await prisma.dealStageHistory.create({ data: { dealId: deal.id, toStageId: stage.id, changedById: req.userId! } });
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
  const updateData: any = { ...data, expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : undefined };
  if (data.stageId && data.stageId !== deal.stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { id: data.stageId, pipelineId: deal.pipelineId } });
    if (!stage) return err(res, "not_found", "Stage not found", 404);
    await prisma.dealStageHistory.create({ data: { dealId: deal.id, fromStageId: deal.stageId, toStageId: data.stageId, changedById: req.userId! } });
    if (stage.isWon) updateData.wonAt = new Date();
    if (stage.isLost) updateData.lostAt = new Date();
  }
  const updated = await prisma.deal.update({ where: { id: req.params.id }, data: updateData, include: { stage: true } });
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
