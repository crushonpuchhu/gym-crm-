import { Router } from "express";
import { z } from "zod";
import {
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
} from "@salesflow/shared";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CONVERTED", "DISQUALIFIED"] as const;
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
  const q = leadQuerySchema.safeParse(req.query);
  if (!q.success) return err(res, "validation_error", "Invalid query", 400);
  const { page, limit, search, status, ownerId, sortBy, sortOrder } = q.data;
  if (status && !LEAD_STATUSES.includes(status as any)) {
    return err(res, "validation_error", "Invalid status filter", 400, "status");
  }
  const sortField = (SORTABLE_FIELDS as readonly string[]).includes(sortBy) ? sortBy : "createdAt";
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }];
  if (status) where.status = status;
  if (ownerId) where.ownerId = ownerId;
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: { owner: { select: { id: true, name: true, email: true } } },
    }),
    prisma.lead.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", validateBody(createLeadSchema), async (req: AuthedRequest, res) => {
  const data = req.body as any;
  const lead = await prisma.lead.create({
    data: { organizationId: req.orgId!, ownerId: req.userId!, ...data, followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined },
    include: { owner: { select: { id: true, name: true } } },
  });
  await prisma.activity.create({
    data: { organizationId: req.orgId!, actorId: req.userId!, type: "STATUS_CHANGE", subject: `Lead created: ${lead.firstName} ${lead.lastName}`, entityType: "Lead", entityId: lead.id },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "lead.create", entityType: "lead", entityId: lead.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, lead, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null }, include: { owner: { select: { id: true, name: true } } } });
  if (!lead) return err(res, "not_found", "Lead not found", 404);
  return ok(res, lead);
});

router.patch("/:id", validateBody(updateLeadSchema), async (req: AuthedRequest, res) => {
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!lead) return err(res, "not_found", "Lead not found", 404);
  const data = req.body as any;
  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { ...data, followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined },
    include: { owner: { select: { id: true, name: true } } },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "lead.update", entityType: "lead", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!lead) return err(res, "not_found", "Lead not found", 404);
  await prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "lead.delete", entityType: "lead", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

router.post("/:id/convert", async (req: AuthedRequest, res) => {
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!lead) return err(res, "not_found", "Lead not found", 404);
  if (lead.status === "CONVERTED" || lead.convertedToContactId || lead.convertedToDealId) {
    return err(res, "conflict", "Lead already converted", 409);
  }
  const result = await prisma.$transaction(async (tx) => {
    let contact: any = null;
    if (lead.email) {
      contact = await tx.contact.create({
        data: {
          organizationId: req.orgId!, ownerId: lead.ownerId,
          firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone, company: undefined,
        },
      });
    }
    let deal: any = null;
    if (lead.value && Number(lead.value) > 0) {
      const pipeline = await tx.pipeline.findFirst({ where: { organizationId: req.orgId!, deletedAt: null, isDefault: true } });
      const stage = pipeline ? await tx.pipelineStage.findFirst({ where: { pipelineId: pipeline.id, deletedAt: null, isWon: false }, orderBy: { order: "asc" } }) : null;
      if (pipeline && stage) {
        deal = await tx.deal.create({
          data: {
            organizationId: req.orgId!, pipelineId: pipeline.id, stageId: stage.id, ownerId: lead.ownerId,
            contactId: contact?.id, companyId: undefined,
            title: `Deal from ${lead.firstName} ${lead.lastName}`, value: lead.value, probability: 0,
          },
        });
      }
    }
    return tx.lead.update({
      where: { id: req.params.id },
      data: { status: "CONVERTED", convertedToContactId: contact?.id || null, convertedToDealId: deal?.id || null },
      include: { owner: { select: { id: true, name: true } } },
    });
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "lead.convert", entityType: "lead", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
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
    const parsed = createLeadSchema.safeParse({
      firstName: record.firstname,
      lastName: record.lastname,
      email: record.email || undefined,
      phone: record.phone || undefined,
      company: record.company || undefined,
      source: record.source?.toUpperCase() || "WEBSITE",
      priority: record.priority?.toUpperCase() || "MEDIUM",
      value: record.value ? Number(record.value) : undefined,
    });
    if (parsed.success) {
      await prisma.lead.create({
        data: { organizationId: req.orgId!, ownerId: req.userId!, ...parsed.data },
      });
      created++;
    } else {
      errors.push(`row ${index + 2}: ${parsed.error.issues[0]?.message}`);
    }
  }
  await audit({ orgId: req.orgId, userId: req.userId, action: "lead.import", entityType: "lead", newValues: { created, rejected: errors.length }, ip: req.ip, userAgent: req.get("user-agent") });
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
