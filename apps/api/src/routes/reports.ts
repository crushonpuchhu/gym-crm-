import { Router } from "express";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { AuthedRequest, requirePermission } from "../middleware/auth";

const router = Router();

router.get("/dashboard", async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [prospects, members, activeMembers, trialMembers, memberships, tickets, checkInsToday, mrr] = await Promise.all([
    prisma.prospect.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.member.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.member.count({ where: { organizationId: org, deletedAt: null, status: "ACTIVE" } }),
    prisma.member.count({ where: { organizationId: org, deletedAt: null, status: "TRIAL" } }),
    prisma.membership.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.ticket.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.checkIn.count({ where: { organizationId: org, checkedInAt: { gte: startOfToday } } }),
    prisma.membership.aggregate({
      where: { organizationId: org, deletedAt: null, status: "ACTIVE" },
      _sum: { monthlyValue: true },
    }),
  ]);
  const openTickets = await prisma.ticket.count({
    where: { organizationId: org, status: { in: ["NEW", "OPEN", "PENDING", "IN_PROGRESS"] }, deletedAt: null },
  });
  return ok(res, {
    totalProspects: prospects,
    totalMembers: members,
    activeMembers,
    trialMembers,
    totalMemberships: memberships,
    totalTickets: tickets,
    openTickets,
    checkInsToday,
    mrr: Number(mrr._sum.monthlyValue || 0),
  });
});

router.get("/joins-by-month", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const memberships = await prisma.membership.findMany({
    where: { organizationId: org, deletedAt: null, wonAt: { gte: since } },
    select: { value: true, wonAt: true },
  });
  const byMonth: Record<string, { value: number; count: number }> = {};
  memberships.forEach((m) => {
    if (!m.wonAt) return;
    const key = m.wonAt.toISOString().slice(0, 7);
    byMonth[key] = byMonth[key] || { value: 0, count: 0 };
    byMonth[key].value += Number(m.value);
    byMonth[key].count += 1;
  });
  return ok(
    res,
    Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, row]) => ({ month, value: row.value, count: row.count })),
  );
});

router.get("/prospects-by-source", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const rows = await prisma.prospect.groupBy({ by: ["source"], where: { organizationId: org, deletedAt: null }, _count: { source: true } });
  return ok(res, rows.map((r) => ({ source: r.source, count: r._count.source })));
});

router.get("/conversion", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const total = await prisma.prospect.count({ where: { organizationId: org, deletedAt: null } });
  const converted = await prisma.prospect.count({ where: { organizationId: org, status: "JOINED", deletedAt: null } });
  return ok(res, { total, converted, rate: total ? (converted / total) * 100 : 0 });
});

router.get("/checkins-by-day", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const days = Math.min(Number(req.query.days) || 14, 90);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.checkIn.findMany({
    where: { organizationId: org, checkedInAt: { gte: since } },
    select: { checkedInAt: true },
  });
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets[localDateKey(d)] = 0;
  }
  rows.forEach((r) => {
    const key = localDateKey(r.checkedInAt);
    if (key in buckets) buckets[key] += 1;
  });
  return ok(res, Object.entries(buckets).map(([date, count]) => ({ date, count })));
});

router.get("/retention", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const rows = await prisma.member.groupBy({
    by: ["status"],
    where: { organizationId: org, deletedAt: null },
    _count: { status: true },
  });
  const counts = Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
  const active = counts.ACTIVE || 0;
  const paused = counts.PAUSED || 0;
  const cancelled = counts.CANCELLED || 0;
  const trial = counts.TRIAL || 0;
  const expired = counts.EXPIRED || 0;
  const base = active + paused + cancelled;
  return ok(res, {
    active,
    paused,
    cancelled,
    trial,
    expired,
    churnRate: base ? (cancelled / base) * 100 : 0,
  });
});

router.get("/staff-performance", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const rows = await prisma.membership.groupBy({
    by: ["ownerId"],
    where: { organizationId: org, deletedAt: null, status: "ACTIVE" },
    _sum: { monthlyValue: true, value: true },
    _count: { ownerId: true },
  });
  return ok(res, rows.map((r) => ({
    ownerId: r.ownerId,
    mrr: Number(r._sum.monthlyValue || 0),
    contractValue: Number(r._sum.value || 0),
    count: r._count.ownerId,
  })));
});

/** Local calendar key (YYYY-MM-DD). toISOString() would shift the day in non-UTC timezones. */
function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Escape a CSV cell (quotes, commas, newlines). */
function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

router.get("/export/:report", requirePermission("view_reports"), async (req: AuthedRequest, res) => {
  const org = req.orgId!;
  const report = req.params.report.toLowerCase();
  let csv = "";

  if (report === "prospects") {
    const rows = await prisma.prospect.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { location: { select: { name: true } }, owner: { select: { name: true } } },
    });
    csv = toCsv(
      ["firstName", "lastName", "email", "phone", "location", "source", "status", "priority", "score", "monthlyValue", "goal", "owner", "createdAt"],
      rows.map((p) => [p.firstName, p.lastName, p.email, p.phone, p.location?.name, p.source, p.status, p.priority, p.score, p.value, p.fitnessGoal, p.owner?.name, p.createdAt.toISOString()]),
    );
  } else if (report === "memberships") {
    const rows = await prisma.membership.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { stage: { select: { name: true } }, member: { select: { firstName: true, lastName: true } }, plan: { select: { name: true } }, location: { select: { name: true } }, owner: { select: { name: true } } },
    });
    csv = toCsv(
      ["title", "member", "plan", "location", "stage", "status", "contractValue", "monthlyValue", "billingCycle", "owner", "startDate", "endDate"],
      rows.map((m) => [m.title, m.member ? `${m.member.firstName} ${m.member.lastName}` : "", m.plan?.name, m.location?.name, m.stage?.name, m.status, m.value, m.monthlyValue, m.billingCycle, m.owner?.name, m.startDate?.toISOString(), m.endDate?.toISOString()]),
    );
  } else if (report === "members") {
    const rows = await prisma.member.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { location: { select: { name: true } }, owner: { select: { name: true } } },
    });
    csv = toCsv(
      ["firstName", "lastName", "email", "phone", "location", "status", "goal", "owner", "joinedAt"],
      rows.map((m) => [m.firstName, m.lastName, m.email, m.phone, m.location?.name, m.status, m.fitnessGoal, m.owner?.name, m.joinedAt?.toISOString()]),
    );
  } else if (report === "tickets") {
    const rows = await prisma.ticket.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { location: { select: { name: true } } },
    });
    csv = toCsv(
      ["ticketNumber", "subject", "reporterName", "reporterEmail", "location", "category", "priority", "status", "createdAt"],
      rows.map((t) => [t.ticketNumber, t.subject, t.reporterName, t.reporterEmail, t.location?.name, t.category, t.priority, t.status, t.createdAt.toISOString()]),
    );
  } else if (report === "checkins") {
    const rows = await prisma.checkIn.findMany({
      where: { organizationId: org },
      orderBy: { checkedInAt: "desc" },
      take: 5000,
      include: { member: { select: { firstName: true, lastName: true } }, location: { select: { name: true } } },
    });
    csv = toCsv(
      ["member", "location", "method", "checkedInAt", "durationMinutes"],
      rows.map((c) => [`${c.member.firstName} ${c.member.lastName}`, c.location.name, c.method, c.checkedInAt.toISOString(), c.durationMinutes]),
    );
  } else {
    return err(res, "not_found", "Unknown report", 404);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${report}.csv`);
  return res.send(csv);
});

export default router;
