import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest } from "./auth";

const router = Router();

router.get("/", async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { organizationId: req.orgId!, userId: req.userId!, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;
  return ok(res, { items: notifications, unread });
});

router.patch("/:id/read", async (req: AuthedRequest, res) => {
  const n = await prisma.notification.findFirst({ where: { id: req.params.id, organizationId: req.orgId!, userId: req.userId!, deletedAt: null } });
  if (!n) return err(res, "not_found", "Notification not found", 404);
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
  return ok(res, updated);
});

router.patch("/read-all", async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { organizationId: req.orgId!, userId: req.userId!, readAt: null, deletedAt: null }, data: { readAt: new Date() } });
  return ok(res, { marked: true });
});

export default router;
