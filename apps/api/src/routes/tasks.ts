import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "NOTE", "STATUS_CHANGE", "ASSIGNMENT"]).default("TASK"),
  ownerId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("OPEN"),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.string().optional(),
});

const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

/** Owners must be members of the current tenant. */
async function isOrgMember(orgId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId: orgId, userId, deletedAt: null },
    select: { id: true },
  });
  return !!membership;
}

router.get("/", async (req: AuthedRequest, res) => {
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  if (req.query.status) {
    if (!TASK_STATUSES.includes(req.query.status as any)) {
      return err(res, "validation_error", "Invalid status filter", 400, "status");
    }
    where.status = req.query.status;
  }
  const tasks = await prisma.task.findMany({ where, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] });
  return ok(res, tasks);
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = taskSchema.parse(req.body);
  const ownerId = data.ownerId ?? req.userId!;
  if (!(await isOrgMember(req.orgId!, ownerId))) {
    return err(res, "validation_error", "ownerId is not a member of this organization", 400, "ownerId");
  }
  const task = await prisma.task.create({ data: { organizationId: req.orgId!, ...data, ownerId, dueAt: data.dueAt ? new Date(data.dueAt) : undefined, reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined }, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "task.create", entityType: "task", entityId: task.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, task, 201);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!task) return err(res, "not_found", "Task not found", 404);
  const data = taskSchema.partial().parse(req.body);
  const { ownerId, ...rest } = data;
  if (ownerId && !(await isOrgMember(req.orgId!, ownerId))) {
    return err(res, "validation_error", "ownerId is not a member of this organization", 400, "ownerId");
  }
  const updateData: any = { ...rest, dueAt: data.dueAt ? new Date(data.dueAt) : undefined };
  if (ownerId) updateData.owner = { connect: { id: ownerId } };
  const updated = await prisma.task.update({ where: { id: req.params.id }, data: updateData });
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
