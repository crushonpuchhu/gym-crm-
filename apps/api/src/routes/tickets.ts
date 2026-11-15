import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();
const ticketSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

let ticketCounter = 0;

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  if (req.query.status) where.status = req.query.status;
  if (req.query.priority) where.priority = req.query.priority;
  if (req.query.ownerId) where.ownerId = req.query.ownerId;
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { owner: { select: { id: true, name: true } }, comments: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, body: true, isInternal: true, createdAt: true, author: { select: { id: true, name: true } } } } },
    }),
    prisma.ticket.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = ticketSchema.parse(req.body);
  const last = await prisma.ticket.findFirst({ where: { organizationId: req.orgId! }, orderBy: { createdAt: "desc" } });
  ticketCounter = last ? Number((last.ticketNumber.match(/\d+$/) || ["0"])[0]) + 1 : 1001;
  const ticket = await prisma.ticket.create({
    data: {
      organizationId: req.orgId!, ticketNumber: `TK-${ticketCounter}`,
      customerEmail: data.customerEmail, customerName: data.customerName,
      subject: data.subject, description: data.description, priority: data.priority.toUpperCase() as any,
      slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
    include: { owner: { select: { id: true, name: true } } },
  });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.create", entityType: "ticket", entityId: ticket.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, ticket, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null }, include: { owner: { select: { id: true, name: true } }, comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } } } });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  return ok(res, ticket);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!ticket) return err(res, "not_found", "Ticket not found", 404);
  const data = z.object({ subject: z.string().max(200).optional(), description: z.string().optional(), priority: z.string().optional(), status: z.string().optional(), ownerId: z.string().optional() }).parse(req.body);
  const updateData: any = { ...data };
  if (data.status === "RESOLVED" && !ticket.resolvedAt) updateData.resolvedAt = new Date();
  if (data.status === "CLOSED" && !ticket.closedAt) updateData.closedAt = new Date();
  const updated = await prisma.ticket.update({ where: { id: req.params.id }, data: updateData, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.update", entityType: "ticket", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.post("/:id/comments", async (req: AuthedRequest, res) => {
  const { body, isInternal } = z.object({ body: z.string().min(1).max(4000), isInternal: z.boolean().default(false) }).parse(req.body);
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
  const updated = await prisma.ticket.update({ where: { id: req.params.id }, data: { ownerId }, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "ticket.assign", entityType: "ticket", entityId: req.params.id, newValues: { ownerId }, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

export default router;
