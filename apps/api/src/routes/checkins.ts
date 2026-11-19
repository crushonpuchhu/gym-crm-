import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

const checkInSchema = z.object({
  memberId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  method: z.enum(["QR", "APP", "FRONT_DESK"]).default("FRONT_DESK"),
  durationMinutes: z.coerce.number().int().positive().max(600).optional(),
});

const checkInInclude = {
  member: { select: { id: true, firstName: true, lastName: true, status: true, email: true } },
  location: { select: { id: true, name: true } },
};

router.get("/", async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const where: any = { organizationId: req.orgId! };
  if (req.query.locationId) where.locationId = req.query.locationId;
  if (req.query.memberId) where.memberId = req.query.memberId;

  if (req.query.date) {
    // Parse YYYY-MM-DD as a local calendar day; `new Date("YYYY-MM-DD")` is UTC and shifts the day.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(req.query.date));
    if (!match) return err(res, "validation_error", "Invalid date", 400, "date");
    const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(start.getTime())) return err(res, "validation_error", "Invalid date", 400, "date");
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.checkedInAt = { gte: start, lt: end };
  } else if (req.query.sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - Number(req.query.sinceDays));
    where.checkedInAt = { gte: since };
  }

  const [items, total, todayCount] = await Promise.all([
    prisma.checkIn.findMany({ where, orderBy: { checkedInAt: "desc" }, take: limit, include: checkInInclude }),
    prisma.checkIn.count({ where }),
    prisma.checkIn.count({
      where: {
        organizationId: req.orgId!,
        checkedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return ok(res, { items, total, todayCount });
});

router.post("/", requirePermission("manage_checkins"), async (req: AuthedRequest, res) => {
  const data = checkInSchema.parse(req.body);
  const member = await prisma.member.findFirst({
    where: { id: data.memberId, organizationId: req.orgId!, deletedAt: null },
    select: { id: true, locationId: true, status: true },
  });
  if (!member) return err(res, "validation_error", "memberId not found in organization", 400, "memberId");
  if (member.status === "CANCELLED" || member.status === "EXPIRED") {
    return err(res, "conflict", "Member is not active; renew the membership before check-in", 409);
  }
  const locationId = data.locationId || member.locationId;
  if (!locationId) return err(res, "validation_error", "locationId is required when the member has no home location", 400, "locationId");
  const location = await prisma.location.findFirst({ where: { id: locationId, organizationId: req.orgId!, deletedAt: null }, select: { id: true } });
  if (!location) return err(res, "validation_error", "locationId not found in organization", 400, "locationId");

  const checkIn = await prisma.checkIn.create({
    data: {
      organizationId: req.orgId!,
      memberId: data.memberId,
      locationId,
      method: data.method,
      durationMinutes: data.durationMinutes,
    },
    include: checkInInclude,
  });
  await prisma.activity.create({
    data: {
      organizationId: req.orgId!,
      actorId: req.userId!,
      type: "CHECK_IN",
      subject: `${checkIn.member.firstName} ${checkIn.member.lastName} checked in at ${checkIn.location.name}`,
      entityType: "Member",
      entityId: data.memberId,
    },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "checkin.create", entityType: "checkIn", entityId: checkIn.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, checkIn, 201);
});

export default router;
