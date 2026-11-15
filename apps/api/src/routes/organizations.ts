import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "./auth";

const router = Router();

router.get("/list", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId!, deletedAt: null },
    include: { organization: true },
  });
  return ok(res, memberships.map((m) => m.organization));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const org = await prisma.organization.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!org) return err(res, "not_found", "Organization not found", 404);
  return ok(res, org);
});

const updateOrgSchema = z.object({ name: z.string().min(1).max(200).optional(), slug: z.string().min(1).max(100).optional() });

router.patch("/:id", validateBody(updateOrgSchema), async (req: AuthedRequest, res) => {
  const org = await prisma.organization.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!org) return err(res, "not_found", "Organization not found", 404);
  const updated = await prisma.organization.update({
    where: { id: req.params.id },
    data: { ...(req.body as any).name && { name: (req.body as any).name }, ...(req.body as any).slug && { slug: (req.body as any).slug } },
  });
  await audit({ orgId: req.params.id, userId: req.userId, action: "org.update", entityType: "organization", entityId: req.params.id, ip: req.ip, userAgent: req.get("user-agent") });
  return ok(res, updated);
});

router.post("/:id/invitations", async (req: AuthedRequest, res) => {
  const { email, role } = req.body as any;
  if (!email || !role) return err(res, "validation_error", "email and role required", 400);
  const token = require("crypto").randomBytes(32).toString("hex");
  const invitation = await prisma.invitation.create({
    data: { organizationId: req.params.id, email, role, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdById: req.userId! },
  });
  return ok(res, invitation, 201);
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
