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

/** Escape a CSV cell (quotes, commas, newlines). */
function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

router.get("/export/:report", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const report = req.params.report.toLowerCase();
  let csv = "";

  if (report === "leads") {
    const leads = await prisma.lead.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { firstName: true, lastName: true, email: true, phone: true, company: true, source: true, status: true, priority: true, value: true, createdAt: true },
    });
    csv = toCsv(
      ["firstName", "lastName", "email", "phone", "company", "source", "status", "priority", "value", "createdAt"],
      leads.map((l) => [l.firstName, l.lastName, l.email, l.phone, l.company, l.source, l.status, l.priority, l.value, l.createdAt.toISOString()]),
    );
  } else if (report === "deals") {
    const deals = await prisma.deal.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { stage: { select: { name: true } }, owner: { select: { name: true } } },
    });
    csv = toCsv(
      ["title", "stage", "value", "probability", "owner", "expectedCloseAt", "updatedAt"],
      deals.map((d) => [d.title, d.stage?.name, d.value, d.probability, d.owner?.name, d.expectedCloseAt?.toISOString(), d.updatedAt.toISOString()]),
    );
  } else if (report === "contacts") {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { firstName: true, lastName: true, email: true, phone: true, position: true, createdAt: true },
    });
    csv = toCsv(
      ["firstName", "lastName", "email", "phone", "position", "createdAt"],
      contacts.map((c) => [c.firstName, c.lastName, c.email, c.phone, c.position, c.createdAt.toISOString()]),
    );
  } else if (report === "tickets") {
    const tickets = await prisma.ticket.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { ticketNumber: true, subject: true, customerName: true, customerEmail: true, priority: true, status: true, createdAt: true },
    });
    csv = toCsv(
      ["ticketNumber", "subject", "customerName", "customerEmail", "priority", "status", "createdAt"],
      tickets.map((t) => [t.ticketNumber, t.subject, t.customerName, t.customerEmail, t.priority, t.status, t.createdAt.toISOString()]),
    );
  } else {
    return err(res, "not_found", "Unknown report", 404);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${report}.csv`);
  return res.send(csv);
});

export default router;
