import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

router.get("/list", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId!, deletedAt: null },
    include: { organization: true },
  });
  return ok(res, memberships.map((m) => m.organization));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  // only the tenant in context is readable
  const org = await prisma.organization.findFirst({
    where: { id: req.orgId!, deletedAt: null },
  });
  if (!org) return err(res, "not_found", "Organization not found", 404);
  return ok(res, org);
});

const updateOrgSchema = z.object({ name: z.string().min(1).max(200).optional(), slug: z.string().min(1).max(100).optional() });

router.patch(
  "/:id",
  requirePermission("manage_users"),
  async (req: AuthedRequest, res) => {
    if (req.params.id !== req.orgId) return err(res, "forbidden", "Cannot modify another organization", 403);
    const org = await prisma.organization.findFirst({ where: { id: req.orgId!, deletedAt: null } });
    if (!org) return err(res, "not_found", "Organization not found", 404);
    const updated = await prisma.organization.update({
      where: { id: req.orgId! },
      data: { ...(req.body as any).name && { name: (req.body as any).name }, ...(req.body as any).slug && { slug: (req.body as any).slug } },
    });
    await audit({ orgId: req.orgId, userId: req.userId, action: "org.update", entityType: "organization", entityId: req.orgId, ip: req.ip, userAgent: req.get("user-agent") });
    return ok(res, updated);
  },
);

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "SUPER_ADMIN",
    "ORG_OWNER",
    "ORG_ADMIN",
    "SALES_MANAGER",
    "SALES_REP",
    "SUPPORT_MANAGER",
    "SUPPORT_AGENT",
    "VIEWER",
  ]),
});

router.post(
  "/:id/invitations",
  requirePermission("manage_users"),
  async (req: AuthedRequest, res) => {
    if (req.params.id !== req.orgId) return err(res, "forbidden", "Cannot invite into another organization", 403);
    const parsed = invitationSchema.safeParse(req.body);
    if (!parsed.success) return err(res, "validation_error", "email and role required", 400, parsed.error.issues[0]?.path.join("."));
    const { email, role } = parsed.data;
    const token = require("crypto").randomBytes(32).toString("hex");
    const invitation = await prisma.invitation.create({
      data: { organizationId: req.orgId!, email, role, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdById: req.userId! },
    });
    await audit({ orgId: req.orgId, userId: req.userId, action: "org.invite", entityType: "invitation", entityId: invitation.id, newValues: { email, role }, ip: req.ip, userAgent: req.get("user-agent") });
    return ok(res, invitation, 201);
  },
);

export default router;
