import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest } from "./auth";

const router = Router();

router.get("/audit-logs", async (req: AuthedRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where: { organizationId: req.orgId! }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.auditLog.count({ where: { organizationId: req.orgId! } }),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok(res, { status: "healthy", db: "connected" });
  } catch (e) {
    return err(res, "db_error", "Database unreachable", 500);
  }
});

export default router;
