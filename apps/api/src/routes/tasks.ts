import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["call", "meeting", "email", "task", "note", "status_change", "assignment"]).default("task"),
  ownerId: z.string(),
  dueAt: z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).default("open"),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.string().optional(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  if (req.query.status) where.status = req.query.status;
  const tasks = await prisma.task.findMany({ where, orderBy: { dueAt: "asc", createdAt: "desc" } });
  return ok(res, tasks);
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = taskSchema.parse(req.body);
  const task = await prisma.task.create({ data: { organizationId: req.orgId!, ...data, dueAt: data.dueAt ? new Date(data.dueAt) : undefined, reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined }, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "task.create", entityType: "task", entityId: task.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, task, 201);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!task) return err(res, "not_found", "Task not found", 404);
  const data = taskSchema.partial().parse(req.body);
  const updated = await prisma.task.update({ where: { id: req.params.id }, data: { ...data, dueAt: data.dueAt ? new Date(data.dueAt) : undefined } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "task.update", entityType: "task", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!task) return err(res, "not_found", "Task not found", 404);
  await prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return ok(res, { deleted: true });
});

export default router;
