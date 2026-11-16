import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, hasPermission } from "../middleware/auth";

const router = Router();
const ticketSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

const TICKET_STATUSES = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function canSeeInternalComments(req: AuthedRequest) {
  const role = req.memberships?.find((m) => m.organizationId === req.orgId)?.role;
  return hasPermission(role, "manage_tickets_internal");
}

/** Ticket owners must be members of the current tenant. */
async function isOrgMember(orgId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId: orgId, userId, deletedAt: null },
    select: { id: true },
  });
  return !!membership;
}

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.status) {
    if (!TICKET_STATUSES.includes(req.query.status as any)) {
      return err(res, "validation_error", "Invalid status filter", 400, "status");
    }
    where.status = req.query.status;
  }
  if (req.query.priority) {
    if (!TICKET_PRIORITIES.includes(req.query.priority as any)) {
      return err(res, "validation_error", "Invalid priority filter", 400, "priority");
    }
    where.priority = req.query.priority;
  }
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  const includeInternal = canSeeInternalComments(req);
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true } },
        comments: {
          take: 5,
          orderBy: { createdAt: "desc" },
          where: includeInternal ? {} : { isInternal: false },
          select: { id: true, body: true, isInternal: true, createdAt: true, author: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.ticket.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = ticketSchema.parse(req.body);
  const last = await prisma.ticket.findFirst({
    where: { organizationId: req.orgId! },
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });
  let counter = last ? Number((last.ticketNumber.match(/\d+$/) || ["1000"])[0]) + 1 : 1001;

  // unique per organization: retry on collision instead of failing the request
  let ticket: any = null;
  for (let attempt = 0; attempt < 5 && !ticket; attempt++) {
    try {
      ticket = await prisma.ticket.create({
        data: {
          organizationId: req.orgId!, ticketNumber: `TK-${counter}`,
          customerEmail: data.customerEmail, customerName: data.customerName,
          subject: data.subject, description: data.description, priority: data.priority.toUpperCase() as any,
          slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
        include: { owner: { select: { id: true, name: true } } },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        counter++;
        continue;
      }
      throw e;
    }
  }
  if (!ticket) return err(res, "conflict", "Could not allocate ticket number", 409);
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.create", entityType: "ticket", entityId: ticket.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, ticket, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const includeInternal = canSeeInternalComments(req);
  const ticket = await prisma.ticket.findFirst({
    where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        where: includeInternal ? {} : { isInternal: false },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  return ok(res, ticket);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  const data = z.object({
    subject: z.string().max(200).optional(),
    description: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    status: z.enum(["NEW", "OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    ownerId: z.string().optional(),
  }).parse(req.body);
  const { ownerId, ...rest } = data;
  if (ownerId && !(await isOrgMember(req.orgId!, ownerId))) {
    return err(res, "validation_error", "ownerId is not a member of this organization", 400, "ownerId");
  }
  const updateData: any = { ...rest };
  if (ownerId) updateData.ownerId = ownerId;
  if (data.status === "RESOLVED" && !ticket.resolvedAt) updateData.resolvedAt = new Date();
  if (data.status === "CLOSED" && !ticket.closedAt) updateData.closedAt = new Date();
  const updated = await prisma.ticket.update({ where: { id: req.params.id }, data: updateData, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.update", entityType: "ticket", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.post("/:id/comments", async (req: AuthedRequest, res) => {
  const { body, isInternal } = z.object({ body: z.string().min(1).max(4000), isInternal: z.boolean().default(false) }).parse(req.body);
  if (isInternal && !canSeeInternalComments(req)) {
    return err(res, "forbidden", "Only support staff can add internal comments", 403);
  }
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  const comment = await prisma.ticketComment.create({
    data: { ticketId: req.params.id, authorId: req.userId!, body, isInternal: !!isInternal },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!ticket.firstResponseAt && !isInternal) await prisma.ticket.update({ where: { id: req.params.id }, data: { firstResponseAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.comment", entityType: "ticket", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, comment, 201);
});

router.post("/:id/assign", async (req: AuthedRequest, res) => {
  const { ownerId } = z.object({ ownerId: z.string() }).parse(req.body);
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  if (!(await isOrgMember(req.orgId!, ownerId))) {
    return err(res, "validation_error", "ownerId is not a member of this organization", 400, "ownerId");
  }
  const updated = await prisma.ticket.update({ where: { id: req.params.id }, data: { ownerId }, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.assign", entityType: "ticket", entityId: req.params.id, newValues: { ownerId }, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

export default router;
