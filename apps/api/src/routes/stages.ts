import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();
const stageSchema = z.object({
  pipelineId: z.string(),
  name: z.string().min(1).max(100),
  key: z.string().min(1).max(100),
  order: z.coerce.number().int().default(0),
  probability: z.coerce.number().int().min(0).max(100).default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

router.get("/:pipelineId", async (req: AuthedRequest, res) => {
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: req.params.pipelineId },
    orderBy: { order: "asc" },
  });
  return ok(res, stages);
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = stageSchema.parse(req.body);
  const pipeline = await prisma.pipeline.findFirst({ where: { id: data.pipelineId, organizationId: req.orgId!, deletedAt: null } });
  if (!pipeline) return err(res, "not_found", "Pipeline not found", 404);
  const stage = await prisma.pipelineStage.create({ data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "stage.create", entityType: "pipelineStage", entityId: stage.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, stage, 201);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: req.params.id, pipeline: { organizationId: req.orgId!, deletedAt: null } },
  });
  if (!stage) return err(res, "not_found", "Stage not found", 404);
  const data = stageSchema.partial().parse(req.body);
  const updated = await prisma.pipelineStage.update({ where: { id: req.params.id }, data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "stage.update", entityType: "pipelineStage", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const dealCount = await prisma.deal.count({ where: { stageId: req.params.id, deletedAt: null } });
  if (dealCount > 0) return err(res, "conflict", "Stage has deals", 409);
  await prisma.pipelineStage.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deleted: true });
});

export default router;
