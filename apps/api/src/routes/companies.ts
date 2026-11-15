import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();
const companySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
  employees: z.coerce.number().int().nonnegative().optional(),
  revenueRange: z.string().max(50).optional(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where: any = { organizationId: req.orgId!, deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.company.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { contacts: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    prisma.company.count({ where }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const data = companySchema.parse(req.body);
  const company = await prisma.company.create({ data: { organizationId: req.orgId!, ...data } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "company.create", entityType: "company", entityId: company.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, company, 201);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!company) return err(res, "not_found", "Company not found", 404);
  return ok(res, company);
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!company) return err(res, "not_found", "Company not found", 404);
  const data = companySchema.partial().parse(req.body);
  const updated = await prisma.company.update({ where: { id: req.params.id }, data });
  await audit({ orgId: req.orgId, userId: req.userId, action: "company.update", entityType: "company", entityId: req.params.id, newValues: data, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, deletedAt: null } });
  if (!company) return err(res, "not_found", "Company not found", 404);
  await prisma.company.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ orgId: req.orgId, userId: req.userId, action: "company.delete", entityType: "company", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, { deleted: true });
});

export default router;
