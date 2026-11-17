import { Router } from "express";
import { z } from "zod";
import {
  createProspectSchema,
  updateProspectSchema,
  prospectQuerySchema,
} from "@salesflow/shared";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

const PROSPECT_STATUSES = ["NEW", "CONTACTED", "TOUR_BOOKED", "TOURED", "TRIAL", "NEGOTIATING", "JOINED", "LOST"] as const;
const SORTABLE_FIELDS = ["createdAt", "updatedAt", "firstName", "lastName", "status", "priority", "value", "followUpAt"] as const;

/** Minimal RFC 4180 CSV parser: handles quoted fields, commas and escaped quotes. */
function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

router.get("/", async (req: AuthedRequest, res) => {
  const q = prospectQuerySchema.safeParse(req.query);
  if (!q.success) return err(res, "validation_error", "Invalid query", 400);
  const { page, limit, search, status, ownerId, locationId, sortBy, sortOrder } = q.data;
  if (status && !PROSPECT_STATUSES.includes(status as any)) {
    return err(res, "validation_error", "Invalid status filter", 400, "status");
  }
  const sortField = (SORTABLE_FIELDS as readonly string[]).includes(sortBy) ? sortBy : "createdAt";
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }];
  if (status) where.status = status;
  if (ownerId) where.ownerId = ownerId;
  if (locationId) where.locationId = locationId;
  const [items, total] = await Promise.all([
    prisma.prospect.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: { owner: { select: { id: true, name: true, email: true } }, location: { select: { id: true, name: true } } },
    }),
    prisma.prospect.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", validateBody(createProspectSchema), async (req: AuthedRequest, res) => {
  const data = req.body as any;
  if (data.locationId) {
    const location = await prisma.location.findFirst({ where: { id: data.locationId, organizationId: req.orgId!, deletedAt: null }, select: { id: true } });
    if (!location) return err(res, "validation_error", "locationId not found in organization", 400, "locationId");
  }
  const prospect = await prisma.prospect.create({
    data: { organizationId: req.orgId!, ownerId: req.userId!, ...data, followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined },
    include: { owner: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
  });
  await prisma.activity.create({
    data: { organizationId: req.orgId!, actorId: req.userId!, type: "STATUS_CHANGE", subject: `Prospect created: ${prospect.firstName} ${prospect.lastName}`, entityType: "Prospect", entityId: prospect.id },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "prospect.create", entityType: "prospect", entityId: prospect.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, prospect, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const prospect = await prisma.prospect.findFirst({
    where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null },
    include: { owner: { select: { id: true, name: true } }, location: { select: { id: true, name: true } }, activities: { orderBy: { occurredAt: "desc" }, include: { author: { select: { id: true, name: true } } } } },
  });
  if (!prospect) return err(res, "not_found", "Prospect not found", 404);
  return ok(res, prospect);
});

router.patch("/:id", validateBody(updateProspectSchema), async (req: AuthedRequest, res) => {
  const prospect = await prisma.prospect.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!prospect) return err(res, "not_found", "Prospect not found", 404);
  const data = req.body as any;
  const updated = await prisma.prospect.update({
    where: { id: req.params.id },
    data: { ...data, followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined },
    include: { owner: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "prospect.update", entityType: "prospect", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const prospect = await prisma.prospect.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!prospect) return err(res, "not_found", "Prospect not found", 404);
  await prisma.prospect.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "prospect.delete", entityType: "prospect", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

/**
 * Convert a trial or enquiry into a member plus an opening membership.
 * The membership starts in the first stage of the default pipeline.
 */
router.post("/:id/convert", async (req: AuthedRequest, res) => {
  const prospect = await prisma.prospect.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!prospect) return err(res, "not_found", "Prospect not found", 404);
  if (prospect.status === "JOINED" || prospect.convertedMemberId || prospect.convertedMembershipId) {
    return err(res, "conflict", "Prospect already converted", 409);
  }
  const result = await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        organizationId: req.orgId!,
        ownerId: prospect.ownerId,
        locationId: prospect.locationId ?? undefined,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        phone: prospect.phone,
        fitnessGoal: prospect.fitnessGoal,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    let membership: any = null;
    const monthly = prospect.value ? Number(prospect.value) : 0;
    if (monthly > 0) {
      const pipeline = await tx.pipeline.findFirst({ where: { organizationId: req.orgId!, deletedAt: null, isDefault: true } });
      const stage = pipeline
        ? await tx.pipelineStage.findFirst({ where: { pipelineId: pipeline.id, deletedAt: null, isWon: false }, orderBy: { order: "asc" } })
        : null;
      const plan = await tx.membershipPlan.findFirst({
        where: { organizationId: req.orgId!, deletedAt: null, isActive: true },
        orderBy: { price: "asc" },
      });
      if (pipeline && stage) {
        membership = await tx.membership.create({
          data: {
            organizationId: req.orgId!,
            pipelineId: pipeline.id,
            stageId: stage.id,
            ownerId: prospect.ownerId,
            memberId: member.id,
            planId: plan?.id,
            locationId: prospect.locationId ?? undefined,
            title: `${member.firstName} ${member.lastName} — membership`,
            value: monthly * 12,
            monthlyValue: monthly,
            billingCycle: "MONTHLY",
            status: "PENDING",
            probability: stage.probability,
            startDate: new Date(),
          },
        });
        await tx.membershipStageHistory.create({ data: { membershipId: membership.id, toStageId: stage.id, changedById: req.userId! } });
      }
    }

    const updated = await tx.prospect.update({
      where: { id: req.params.id },
      data: { status: "JOINED", convertedMemberId: member.id, convertedMembershipId: membership?.id ?? null },
      include: { owner: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
    });
    return { prospect: updated, member, membership };
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "prospect.convert", entityType: "prospect", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, result);
});

router.post("/import", async (req: AuthedRequest, res) => {
  const { csv } = z.object({ csv: z.string().min(1) }).parse(req.body);
  const rows = parseCsvRows(csv);
  if (!rows.length) return err(res, "validation_error", "CSV is empty", 400);
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (!["firstname", "lastname"].every((c) => header.includes(c))) {
    return err(res, "validation_error", "CSV must include firstname,lastname columns", 400);
  }
  let created = 0;
  const errors: string[] = [];
  for (const [index, cells] of rows.slice(1).entries()) {
    const record: Record<string, string> = {};
    header.forEach((h, i) => {
      record[h] = (cells[i] ?? "").trim();
    });
    const parsed = createProspectSchema.safeParse({
      firstName: record.firstname,
      lastName: record.lastname,
      email: record.email || undefined,
      phone: record.phone || undefined,
      source: record.source?.toUpperCase() || "WALK_IN",
      priority: record.priority?.toUpperCase() || "MEDIUM",
      fitnessGoal: record.fitnessgoal || record.goal || undefined,
      value: record.value ? Number(record.value) : undefined,
    });
    if (parsed.success) {
      await prisma.prospect.create({
        data: { organizationId: req.orgId!, ownerId: req.userId!, ...parsed.data },
      });
      created++;
    } else {
      errors.push(`row ${index + 2}: ${parsed.error.issues[0]?.message}`);
    }
  }
  await audit({ orgId: req.orgId, userId: req.userId, action: "prospect.import", entityType: "prospect", newValues: { created, rejected: errors.length }, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { created, rejected: errors.length, errors });
});

function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const f = r.error.issues[0];
      return res.status(400).json({ success: false, error: { code: "validation_error", message: f?.message, field: f?.path.join(".") } });
    }
    req.body = r.data;
    next();
  };
}

export default router;
