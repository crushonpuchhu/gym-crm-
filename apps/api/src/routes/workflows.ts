import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();
const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.string().min(1).max(100),
  condition: z.any().default({}),
  actions: z.any().default([]),
  isActive: z.boolean().default(true),
});

router.get("/", async (req: AuthedRequest, res) => {
  const workflows = await prisma.workflow.findMany({ where: { organizationId: req.orgId! }, orderBy: { createdAt: "desc" } });
  return ok(res, workflows);
});

router.post("/", requirePermission("manage_automations"), async (req: AuthedRequest, res) => {
  const data = workflowSchema.parse(req.body);
  const w = await prisma.workflow.create({ data: { organizationId: req.orgId!, ...data, condition: data.condition, actions: data.actions } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "workflow.create", entityType: "workflow", entityId: w.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, w, 201);
});

router.patch("/:id", requirePermission("manage_automations"), async (req: AuthedRequest, res) => {
  const w = await prisma.workflow.findFirst({ where: { id: req.params.id, organizationId: req.orgId! } });
  if (!w) return err(res, "not_found", "Workflow not found", 404);
  const data = workflowSchema.partial().parse(req.body);
  const updated = await prisma.workflow.update({ where: { id: req.params.id }, data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "workflow.update", entityType: "workflow", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.post("/:id/test", requirePermission("manage_automations"), async (req: AuthedRequest, res) => {
  // workflow must belong to the current tenant
  const workflow = await prisma.workflow.findFirst({ where: { id: req.params.id, organizationId: req.orgId! } });
  if (!workflow) return err(res, "not_found", "Workflow not found", 404);
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      triggerEvent: "test",
      status: "success",
      input: {},
      output: { note: "Dry run recorded. Actions are not executed by the test endpoint." },
    },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "workflow.test", entityType: "workflow", entityId: workflow.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, execution);
});

router.get("/:id/executions", async (req: AuthedRequest, res) => {
  // executions are only visible for workflows owned by the current tenant
  const workflow = await prisma.workflow.findFirst({ where: { id: req.params.id, organizationId: req.orgId! } });
  if (!workflow) return err(res, "not_found", "Workflow not found", 404);
  const executions = await prisma.workflowExecution.findMany({ where: { workflowId: workflow.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return ok(res, executions);
});

export default router;
