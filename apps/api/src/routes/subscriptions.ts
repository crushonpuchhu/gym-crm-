import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findFirst({ where: { organizationId: req.orgId! } });
  return ok(res, sub || { plan: "STARTER", status: "TRIAL", quotaMembers: 500, quotaStaff: 5 });
});

const planSchema = z.object({ plan: z.enum(["STARTER", "GROWTH", "SCALE"]) });

router.post("/:plan", requirePermission("manage_billing"), validateBody(planSchema), async (req: AuthedRequest, res) => {
  const { plan } = req.body as any;
  let sub = await prisma.subscription.findFirst({ where: { organizationId: req.orgId! } });
  const data: any = { plan, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  // STARTER must not inherit elevated quotas from a previous paid plan
  if (plan === "STARTER") { data.quotaMembers = 500; data.quotaStaff = 5; }
  if (plan === "GROWTH") { data.quotaMembers = 5000; data.quotaStaff = 25; }
  if (plan === "SCALE") { data.quotaMembers = 100000; data.quotaStaff = 200; }
  if (sub) sub = await prisma.subscription.update({ where: { id: sub.id }, data });
  else sub = await prisma.subscription.create({ data: { organizationId: req.orgId!, ...data } });
  // keep the organization plan in sync with the subscription
  await prisma.organization.update({ where: { id: req.orgId! }, data: { plan } });
  return ok(res, sub);
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
