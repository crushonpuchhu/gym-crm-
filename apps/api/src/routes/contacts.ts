import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";

const router = Router();
const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  // empty string means "not provided" in the UI forms
  email: z.union([z.string().email(), z.literal("")]).optional().transform((v) => (v ? v : undefined)),
  phone: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  companyId: z.string().uuid().optional(),
});

/** Reject references to records outside the current tenant. */
async function assertCompanyInOrg(orgId: string, companyId: string | undefined) {
  if (!companyId) return true;
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  return !!company;
}

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.contact.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { owner: { select: { id: true, name: true } }, company: true } }),
    prisma.contact.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = contactSchema.parse(req.body);
  if (!(await assertCompanyInOrg(req.orgId!, data.companyId))) {
    return err(res, "validation_error", "companyId not found in organization", 400, "companyId");
  }
  const contact = await prisma.contact.create({ data: { organizationId: req.orgId!, ownerId: req.userId!, ...data }, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "contact.create", entityType: "contact", entityId: contact.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, contact, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null }, include: { company: true } });
  if (!contact) return err(res, "not_found", "Contact not found", 404);
  return ok(res, contact);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!contact) return err(res, "not_found", "Contact not found", 404);
  const data = contactSchema.partial().parse(req.body);
  if (!(await assertCompanyInOrg(req.orgId!, data.companyId))) {
    return err(res, "validation_error", "companyId not found in organization", 400, "companyId");
  }
  const updated = await prisma.contact.update({ where: { id: req.params.id }, data, include: { owner: { select: { id: true, name: true } } } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "contact.update", entityType: "contact", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!contact) return err(res, "not_found", "Contact not found", 404);
  await prisma.contact.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "contact.delete", entityType: "contact", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
