import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

router.get("/dashboard", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const [leads, contacts, deals, tickets] = await Promise.all([
    prisma.lead.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.contact.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.deal.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.ticket.count({ where: { organizationId: org, deletedAt: null } }),
  ]);
  const won = await prisma.deal.aggregate({ where: { organizationId: org, stage: { isWon: true }, deletedAt: null }, _sum: { value: true } });
  const openTickets = await prisma.ticket.count({ where: { organizationId: org, status: { in: ["NEW", "OPEN", "PENDING", "IN_PROGRESS"] }, deletedAt: null } });
  return ok(res, { totalLeads: leads, totalContacts: contacts, totalDeals: deals, totalTickets: tickets, wonRevenue: Number(won._sum.value || 0), openTickets });
});

router.get("/sales-by-month", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const deals = await prisma.deal.findMany({ where: { organizationId: org, stage: { isWon: true }, deletedAt: null }, select: { value: true, wonAt: true } });
  const byMonth: Record<string, number> = {};
  deals.forEach((d) => {
    if (!d.wonAt) return;
    const m = d.wonAt.toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + Number(d.value);
  });
  return ok(res, Object.entries(byMonth).map(([month, value]) => ({ month, value })));
});

router.get("/leads-by-source", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const rows = await prisma.lead.groupBy({ by: ["source"], where: { organizationId: org, deletedAt: null }, _count: { source: true } });
  return ok(res, rows.map((r) => ({ source: r.source, count: r._count.source })));
});

router.get("/conversion", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const total = await prisma.lead.count({ where: { organizationId: org, deletedAt: null } });
  const converted = await prisma.lead.count({ where: { organizationId: org, status: "CONVERTED", deletedAt: null } });
  return ok(res, { total, converted, rate: total ? (converted / total) * 100 : 0 });
});

router.get("/salesperson-performance", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const rows = await prisma.deal.groupBy({ by: ["ownerId"], where: { organizationId: org, deletedAt: null }, _sum: { value: true }, _count: { ownerId: true } });
  return ok(res, rows.map((r) => ({ ownerId: r.ownerId, revenue: Number(r._sum.value || 0), count: r._count.ownerId })));
});

router.get("/export/:report", async (req: AuthedRequest, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${req.params.report}.csv`);
  return res.send("id,name,value\n1,placeholder,0\n");
});

export default router;
