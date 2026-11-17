import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();
const activitySchema = z.object({
  type: z.enum(["CALL", "TOUR", "EMAIL", "TASK", "NOTE", "STATUS_CHANGE", "ASSIGNMENT", "CHECK_IN"]),
  subject: z.string().min(1).max(200),
  entityType: z.string().min(1).max(50),
  entityId: z.string(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const where: any = { organizationId: req.orgId! };
  if (req.query.entityType) where.entityType = req.query.entityType;
  if (req.query.entityId) where.entityId = req.query.entityId;
  const activities = await prisma.activity.findMany({ where, orderBy: { occurredAt: "desc" }, take: 100, include: { actor: { select: { id: true, name: true } } } });
  return ok(res, activities);
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = activitySchema.parse(req.body);
  const activity = await prisma.activity.create({ data: { organizationId: req.orgId!, actorId: req.userId!, ...data }, include: { actor: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "activity.log", entityType: data.entityType, entityId: data.entityId, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, activity, 201);
});

export default router;
