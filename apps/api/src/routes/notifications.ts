import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { organizationId: req.orgId!, userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // count unread across the whole history, not only the newest page
    prisma.notification.count({ where: { organizationId: req.orgId!, userId: req.userId!, readAt: null } }),
  ]);
  return ok(res, { items: notifications, unread });
});

router.patch("/:id/read", async (req: AuthedRequest, res) => {
  const n = await prisma.notification.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, userId: req.userId! } });
  if (!n) return err(res, "not_found", "Notification not found", 404);
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
  return ok(res, updated);
});

router.patch("/read-all", async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { organizationId: req.orgId!, userId: req.userId!, readAt: null }, data: { readAt: new Date() } });
  return ok(res, { marked: true });
});

export default router;
