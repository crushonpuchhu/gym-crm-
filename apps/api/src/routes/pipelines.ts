import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();
const pipelineSchema = z.object({ name: z.string().min(1).max(200), isDefault: z.boolean().default(false) });

router.get("/", async (req: AuthedRequest, res) => {
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: req.orgId!, deletedAt: null },
    include: { stages: { where: { deletedAt: null }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, pipelines);
});

router.post("/", requirePermission("manage_pipelines"), async (req: AuthedRequest, res) => {
  const data = pipelineSchema.parse(req.body);
  let pipeline: any;
  if (data.isDefault) {
    await prisma.pipeline.updateMany({ where: { organizationId: req.orgId!, deletedAt: null }, data: { isDefault: false } });
  }
  pipeline = await prisma.pipeline.create({ data: { organizationId: req.orgId!, ...data }, include: { stages: true } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "pipeline.create", entityType: "pipeline", entityId: pipeline.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, pipeline, 201);
});

router.patch("/:id", requirePermission("manage_pipelines"), async (req: AuthedRequest, res) => {
  const pipeline = await prisma.pipeline.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!pipeline) return err(res, "not_found", "Pipeline not found", 404);
  const data = pipelineSchema.partial().parse(req.body);
  if (data.isDefault) {
    await prisma.pipeline.updateMany({ where: { organizationId: req.orgId!, deletedAt: null, id: { not: req.params.id } }, data: { isDefault: false } });
  }
  const updated = await prisma.pipeline.update({ where: { id: req.params.id }, data, include: { stages: { where: { deletedAt: null }, orderBy: { order: "asc" } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "pipeline.update", entityType: "pipeline", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", requirePermission("manage_pipelines"), async (req: AuthedRequest, res) => {
  const pipeline = await prisma.pipeline.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!pipeline) return err(res, "not_found", "Pipeline not found", 404);
  const dealCount = await prisma.membership.count({ where: { pipelineId: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (dealCount > 0) return err(res, "conflict", "Pipeline has memberships", 409);
  await prisma.pipeline.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "pipeline.delete", entityType: "pipeline", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
