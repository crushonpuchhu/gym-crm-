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

router.get("/", async (req: AuthedRequest, res) => {
  const q = leadQuerySchema.safeParse(req.query);
  if (!q.success) return err(res, "validation_error", "Invalid query", 400);
  const { page, limit, search, status, ownerId, sortBy, sortOrder } = q.data;
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }];
  if (status) where.status = status;
  if (ownerId) where.ownerId = ownerId;
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
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
      const pipeline = await tx.pipeline.findFirst({ where: { organizationId: req.orgId!, isDefault: true } });
      const stage = pipeline ? await tx.pipelineStage.findFirst({ where: { pipelineId: pipeline.id, isWon: false }, orderBy: { order: "asc" } }) : null;
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
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  if (!["firstname", "lastname"].every((c) => header.includes(c))) {
    return err(res, "validation_error", "CSV must include firstname,lastname columns", 400);
  }
  const rows = lines.slice(1);
  let created = 0;
  const errors: string[] = [];
  for (const [index, row] of rows.entries()) {
    const cells = row.split(",").map((c) => c.trim());
    const record: Record<string, string> = {};
    header.forEach((h, i) => {
      record[h] = cells[i];
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
