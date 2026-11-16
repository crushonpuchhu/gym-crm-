import {
  PrismaClient,
  RoleKey,
  LeadStatus,
  LeadSource,
  LeadPriority,
  TicketStatus,
  TicketPriority,
  TaskStatus,
  ActivityType,
  NotificationType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SLUG = "demo-corp";
const PASSWORD = "password123";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 12);

/* Deterministic pseudo-random so the demo dataset is identical on every reseed. */
let seed = 20261117;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
const round = (value: number, step: number) => Math.round(value / step) * step;

const now = new Date();
const daysAgo = (days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, between(0, 59), 0, 0);
  return d;
};
const daysAhead = (days: number, hour = 17) => daysAgo(-days, hour);

const usersSeed = [
  { email: "owner@demo.com", name: "Avery Chen", role: RoleKey.ORG_OWNER },
  { email: "admin@demo.com", name: "Morgan Patel", role: RoleKey.ORG_ADMIN },
  { email: "manager@demo.com", name: "Dana Whitfield", role: RoleKey.SALES_MANAGER },
  { email: "rep@demo.com", name: "Jordan Reyes", role: RoleKey.SALES_REP },
  { email: "rep2@demo.com", name: "Luis Márquez", role: RoleKey.SALES_REP },
  { email: "supportlead@demo.com", name: "Nia Brooks", role: RoleKey.SUPPORT_MANAGER },
  { email: "support@demo.com", name: "Sam Okafor", role: RoleKey.SUPPORT_AGENT },
  { email: "viewer@demo.com", name: "Riley Kim", role: RoleKey.VIEWER },
] as const;

const companiesSeed = [
  { name: "Acme Co", industry: "Technology", employees: 120, revenueRange: "$10M–$50M" },
  { name: "Globex Manufacturing", industry: "Manufacturing", employees: 1200, revenueRange: "$250M–$1B" },
  { name: "Initech Financial", industry: "Fintech", employees: 85, revenueRange: "$5M–$10M" },
  { name: "Umbrella Health", industry: "Healthcare", employees: 3400, revenueRange: "$1B+" },
  { name: "Soylent Logistics", industry: "Logistics", employees: 600, revenueRange: "$100M–$250M" },
  { name: "Vandelay Imports", industry: "Import / Export", employees: 40, revenueRange: "$1M–$5M" },
  { name: "Hooli Cloud", industry: "SaaS", employees: 260, revenueRange: "$50M–$100M" },
  { name: "Stark Industrial", industry: "Energy", employees: 900, revenueRange: "$250M–$1B" },
  { name: "Wayne Legal", industry: "Legal", employees: 65, revenueRange: "$10M–$50M" },
  { name: "Wonka Foods", industry: "Food & Beverage", employees: 430, revenueRange: "$50M–$100M" },
  { name: "Cyberdyne Robotics", industry: "Robotics", employees: 210, revenueRange: "$10M–$50M" },
  { name: "Pied Piper Data", industry: "Data", employees: 30, revenueRange: "$1M–$5M" },
] as const;

const firstNames = [
  "Priya", "Marcus", "Elena", "Tomás", "Grace", "Omar", "Sofia", "Daniel",
  "Aisha", "Ben", "Chloe", "Ravi", "Nora", "Felix", "Imani", "Jonas",
  "Leila", "Mateo", "Hannah", "Kwame", "Julia", "Andre", "Mei", "Victor",
  "Zara", "Peter", "Amara", "Noah", "Ines", "Caleb",
] as const;
const lastNames = [
  "Nair", "Bell", "Fischer", "Silva", "Okafor", "Haddad", "Rossi", "Kim",
  "Ahmed", "Walsh", "Dubois", "Mehta", "Lindqvist", "Weber", "Mensah", "Berg",
  "Haddad", "Alvarez", "Novak", "Owusu", "Kowalski", "Santos", "Zhang", "Popov",
  "Hassan", "Olsen", "Diallo", "Bennett", "Costa", "Rivera",
] as const;
const positions = [
  "CTO", "VP Sales", "Head of Operations", "Procurement Lead", "CFO",
  "IT Manager", "Founder", "Customer Success Lead", "COO", "Marketing Director",
] as const;

const dealTitles = [
  "Enterprise license renewal", "Platform rollout — 120 seats", "Annual support plan",
  "Data migration package", "Multi-region deployment", "Pilot to production",
  "Security review add-on", "Analytics module", "Onboarding services",
  "API integration project", "Support desk expansion", "Field sales rollout",
  "Warehouse module", "Compliance package", "Executive reporting suite",
] as const;

const wonReasons = [
  "Strong champion and clear ROI model",
  "Fastest implementation among the shortlist",
  "Best fit for multi-tenant requirements",
  "Incumbent contract expired; migration was low risk",
] as const;
const lostReasons = [
  "Budget frozen for the quarter",
  "Chose a cheaper point solution",
  "No executive sponsor",
  "Implementation timeline too long",
] as const;

const leadSources = [
  LeadSource.WEBSITE,
  LeadSource.REFERRAL,
  LeadSource.COLD_CALL,
  LeadSource.EMAIL,
  LeadSource.EVENT,
  LeadSource.OTHER,
] as const;

const ticketSubjects = [
  "Cannot access dashboard after password reset",
  "Bulk import fails on CSV with 5,000 rows",
  "Deal stage will not save for one user",
  "Invoice PDF missing company VAT number",
  "SSO login loops on Safari",
  "Email notifications arrive late",
  "Report export returns empty file",
  "Duplicate contact created by webhook",
  "Ticket SLA timer not visible",
  "API key rotation request",
  "Kanban board slow with 800 deals",
  "Custom field deleted by mistake",
  "Calendar sync drops meetings",
  "Two-factor reset for a locked user",
  "Data retention export for audit",
] as const;

async function resetDemoData() {
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
  }
  await prisma.user.deleteMany({
    where: { email: { in: usersSeed.map((u) => u.email) } },
  });
}

async function main() {
  await resetDemoData();

  const org = await prisma.organization.create({
    data: {
      name: "Demo Corp",
      slug: DEMO_SLUG,
      plan: SubscriptionPlan.PROFESSIONAL,
      status: "active",
    },
  });

  const users: Record<string, { id: string; name: string }> = {};
  for (const entry of usersSeed) {
    const user = await prisma.user.create({
      data: {
        email: entry.email,
        passwordHash: PASSWORD_HASH,
        name: entry.name,
        emailVerified: true,
      },
      select: { id: true, name: true },
    });
    users[entry.email] = user;
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: entry.role },
    });
  }

  const owner = users["owner@demo.com"];
  const manager = users["manager@demo.com"];
  const rep = users["rep@demo.com"];
  const rep2 = users["rep2@demo.com"];
  const supportLead = users["supportlead@demo.com"];
  const support = users["support@demo.com"];
  const reps = [rep, rep2, manager];

  // Pipelines ------------------------------------------------------------
  const salesPipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: "Sales Pipeline",
      isDefault: true,
      stages: {
        create: [
          { name: "New", key: "new", order: 1, probability: 10 },
          { name: "Qualified", key: "qualified", order: 2, probability: 30 },
          { name: "Proposal", key: "proposal", order: 3, probability: 50 },
          { name: "Negotiation", key: "negotiation", order: 4, probability: 75 },
          { name: "Won", key: "won", order: 5, probability: 100, isWon: true },
          { name: "Lost", key: "lost", order: 6, probability: 0, isLost: true },
        ],
      },
    },
    include: { stages: true },
  });
  const stageByKey = Object.fromEntries(salesPipeline.stages.map((s) => [s.key, s]));

  const renewalPipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: "Renewals 2027",
      isDefault: false,
      stages: {
        create: [
          { name: "Renewal due", key: "renewal_due", order: 1, probability: 20 },
          { name: "In review", key: "in_review", order: 2, probability: 45 },
          { name: "Negotiation", key: "renewal_negotiation", order: 3, probability: 70 },
          { name: "Renewed", key: "renewed", order: 4, probability: 100, isWon: true },
          { name: "Churned", key: "churned", order: 5, probability: 0, isLost: true },
        ],
      },
    },
    include: { stages: true },
  });
  const renewalStage = Object.fromEntries(renewalPipeline.stages.map((s) => [s.key, s]));

  // Companies + contacts -------------------------------------------------
  const companies: { id: string; name: string }[] = [];
  for (const entry of companiesSeed) {
    const company = await prisma.company.create({
      data: {
        organizationId: org.id,
        name: entry.name,
        industry: entry.industry,
        website: `https://${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
        employees: entry.employees,
        revenueRange: entry.revenueRange,
        address: `${between(10, 990)} Market Street, Suite ${between(100, 900)}`,
      },
      select: { id: true, name: true },
    });
    companies.push(company);
  }

  const contacts: { id: string; name: string }[] = [];
  for (let i = 0; i < 60; i += 1) {
    const company = companies[i % companies.length];
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 3) % lastNames.length];
    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        ownerId: reps[i % reps.length].id,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${company.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")}.example.com`,
        phone: `+1 555 ${String(1000 + i).padStart(4, "0")}`,
        position: pick(positions),
        companyId: company.id,
        notes: i % 7 === 0 ? "Primary technical contact. Prefers email over calls." : null,
        createdAt: daysAgo(between(20, 240), 9),
      },
      select: { id: true },
    });
    contacts.push({ id: contact.id, name: `${first} ${last}` });
  }

  // Deals ----------------------------------------------------------------
  const salesPlan = [
    { key: "new", count: 12 },
    { key: "qualified", count: 8 },
    { key: "proposal", count: 7 },
    { key: "negotiation", count: 6 },
    { key: "won", count: 10 },
    { key: "lost", count: 5 },
  ];
  const deals: { id: string; title: string; stageKey: string }[] = [];

  for (const plan of salesPlan) {
    const stage = stageByKey[plan.key];
    for (let i = 0; i < plan.count; i += 1) {
      const company = companies[between(0, companies.length - 1)];
      const created = daysAgo(between(5, 150), 11);
      const value = round(between(4000, 120000), 500);
      const isWon = stage.isWon;
      const isLost = stage.isLost;
      const wonAt = isWon ? daysAgo(between(1, 210), 15) : null;
      const lostAt = isLost ? daysAgo(between(1, 150), 15) : null;
      const deal = await prisma.deal.create({
        data: {
          organizationId: org.id,
          pipelineId: salesPipeline.id,
          stageId: stage.id,
          ownerId: reps[between(0, reps.length - 1)].id,
          companyId: company.id,
          contactId: contacts[between(0, contacts.length - 1)].id,
          title: `${company.name} — ${pick(dealTitles)}`,
          value,
          probability: stage.probability,
          expectedCloseAt: daysAhead(between(-20, 90), 17),
          wonAt,
          lostAt,
          wonReason: isWon ? pick(wonReasons) : null,
          lostReason: isLost ? pick(lostReasons) : null,
          createdAt: created,
        },
        select: { id: true, title: true },
      });
      deals.push({ id: deal.id, title: deal.title, stageKey: plan.key });
    }
  }

  const renewalPlan = [
    { key: "renewal_due", count: 4 },
    { key: "in_review", count: 3 },
    { key: "renewal_negotiation", count: 2 },
    { key: "renewed", count: 3 },
    { key: "churned", count: 2 },
  ];
  for (const plan of renewalPlan) {
    const stage = renewalStage[plan.key];
    for (let i = 0; i < plan.count; i += 1) {
      const company = companies[between(0, companies.length - 1)];
      const renewed = stage.isWon;
      const deal = await prisma.deal.create({
        data: {
          organizationId: org.id,
          pipelineId: renewalPipeline.id,
          stageId: stage.id,
          ownerId: reps[between(0, reps.length - 1)].id,
          companyId: company.id,
          title: `${company.name} — 2027 renewal`,
          value: round(between(12000, 90000), 500),
          probability: stage.probability,
          expectedCloseAt: daysAhead(between(-10, 120), 17),
          wonAt: renewed ? daysAgo(between(1, 60), 14) : null,
          wonReason: renewed ? "Renewed early with a two-year commitment" : null,
          createdAt: daysAgo(between(10, 120), 12),
        },
        select: { id: true, title: true },
      });
      deals.push({ id: deal.id, title: deal.title, stageKey: plan.key });
    }
  }

  // Stage history for the board's detail views.
  const historyOrder = ["new", "qualified", "proposal", "negotiation"];
  for (let i = 0; i < deals.length; i += 1) {
    const deal = deals[i];
    if (deal.stageKey === "new" || deal.stageKey === "renewal_due") continue;
    const target = historyOrder.indexOf(deal.stageKey);
    const steps = target > 0 ? target : 1;
    let from: string | null = null;
    for (let s = 0; s <= steps; s += 1) {
      const key = s === steps ? deal.stageKey : historyOrder[Math.min(s, 3)];
      const stage = stageByKey[key] ?? renewalStage[key];
      if (!stage) continue;
      await prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStageId: from,
          toStageId: stage.id,
          changedById: reps[i % reps.length].id,
          changedAt: daysAgo(between(1, 90), 14),
        },
      });
      from = stage.id;
    }
  }

  // Leads ----------------------------------------------------------------
  const leadStatuses = [
    LeadStatus.NEW,
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.PROPOSAL,
    LeadStatus.NEGOTIATION,
    LeadStatus.DISQUALIFIED,
  ];
  const leads: { id: string; name: string }[] = [];
  for (let i = 0; i < 90; i += 1) {
    const first = firstNames[(i * 7) % firstNames.length];
    const last = lastNames[(i * 5) % lastNames.length];
    const company = companies[i % companies.length];
    const converted = i > 0 && i <= 10;
    const status = converted ? LeadStatus.CONVERTED : leadStatuses[i % leadStatuses.length];
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        ownerId: reps[i % reps.length].id,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${company.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")}.example.com`,
        phone: `+1 555 ${String(2000 + i).padStart(4, "0")}`,
        company: company.name,
        source: leadSources[i % leadSources.length],
        status,
        priority: i % 9 === 0 ? LeadPriority.HIGH : i % 4 === 0 ? LeadPriority.LOW : LeadPriority.MEDIUM,
        score: i === 0 ? 96 : between(10, 95),
        value: round(between(2000, 60000), 500),
        createdAt: daysAgo(between(1, 120), 8),
      },
      select: { id: true },
    });
    leads.push({ id: lead.id, name: `${first} ${last}` });
    if (converted) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          convertedToContactId: contacts[i - 1].id,
          convertedToDealId: deals[i + 5].id,
        },
      });
    }
  }

  // Lead activity trail on the hottest leads.
  const leadNotes: { type: ActivityType; subject: string }[] = [
    { type: ActivityType.CALL, subject: "Discovery call — budget confirmed for Q1" },
    { type: ActivityType.EMAIL, subject: "Sent pricing and security overview" },
    { type: ActivityType.MEETING, subject: "Technical demo with the platform team" },
    { type: ActivityType.NOTE, subject: "Champion is the VP Sales; legal review is the blocker" },
    { type: ActivityType.CALL, subject: "Follow-up call scheduled for next Tuesday" },
  ];
  for (let i = 0; i < 24; i += 1) {
    const note = leadNotes[i % leadNotes.length];
    await prisma.leadActivity.create({
      data: {
        leadId: leads[i].id,
        authorId: reps[i % reps.length].id,
        type: note.type,
        subject: note.subject,
        occurredAt: daysAgo(between(1, 40), 13),
      },
    });
  }

  // Tickets --------------------------------------------------------------
  const ticketStatuses = [
    TicketStatus.NEW,
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.PENDING,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ];
  const tickets: { id: string; number: string; subject: string }[] = [];
  for (let i = 0; i < 30; i += 1) {
    const company = companies[i % companies.length];
    const status = i === 0 ? TicketStatus.OPEN : ticketStatuses[i % ticketStatuses.length];
    const priority = i === 0 ? TicketPriority.URGENT : ([TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT] as const)[i % 4];
    const created = daysAgo(between(1, 70), 9);
    const firstResponseAt = status === TicketStatus.NEW ? null : new Date(created.getTime() + between(20, 300) * 60 * 1000);
    const resolved = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
    const resolvedAt = resolved ? new Date(created.getTime() + between(2, 60) * 60 * 60 * 1000) : null;
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: org.id,
        ticketNumber: `DEMO-${1001 + i}`,
        customerEmail: `customer${i}@${company.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
        customerName: `${firstNames[(i * 3) % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`,
        ownerId: i === 0 ? null : i % 5 === 0 ? supportLead.id : support.id,
        priority,
        status,
        subject: ticketSubjects[i % ticketSubjects.length],
        description:
          "Reported through the support portal. Steps to reproduce and account details are attached to the first comment.",
        firstResponseAt,
        resolvedAt,
        closedAt: status === TicketStatus.CLOSED && resolvedAt ? new Date(resolvedAt.getTime() + 3600_000) : null,
        slaDueAt: new Date(created.getTime() + (priority === TicketPriority.URGENT ? 4 : 24) * 60 * 60 * 1000),
        createdAt: created,
      },
      select: { id: true, ticketNumber: true, subject: true },
    });
    tickets.push({ id: ticket.id, number: ticket.ticketNumber, subject: ticket.subject });
  }

  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i];
    const author = i % 4 === 0 ? supportLead : support;
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: author.id,
        body: "Thanks for the report. We reproduced this on a demo tenant and are checking the account permissions now.",
        isInternal: false,
        createdAt: daysAgo(between(1, 30), 11),
      },
    });
    if (i % 2 === 0) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: supportLead.id,
          body: "Internal: escalation path is the platform on-call. Do not share the tenant id with the customer.",
          isInternal: true,
          createdAt: daysAgo(between(1, 30), 12),
        },
      });
    }
    if (i % 3 === 0) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: owner.id,
          body: "Checked with engineering — the fix ships in the next patch window.",
          isInternal: true,
          createdAt: daysAgo(between(1, 20), 15),
        },
      });
    }
  }

  // Tasks ----------------------------------------------------------------
  const taskTitles = [
    "Call back the champion at Acme Co",
    "Send renewal quote to Globex",
    "Review security questionnaire",
    "Prepare QBR deck for Umbrella Health",
    "Chase signature on the Initech contract",
    "Follow up on the overdue invoice",
    "Book technical demo with Soylent",
    "Update close date for the Vandelay deal",
    "Draft win story for Hooli Cloud",
    "Confirm onboarding kickoff",
    "Escalate the Safari SSO ticket",
    "Clean up duplicate contacts",
  ];
  const taskStatuses = [TaskStatus.OPEN, TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED];
  for (let i = 0; i < 32; i += 1) {
    const status = i < 4 ? taskStatuses[0] : taskStatuses[i % taskStatuses.length];
    const overdue = i < 6;
    await prisma.task.create({
      data: {
        organizationId: org.id,
        title: taskTitles[i % taskTitles.length],
        type: ActivityType.TASK,
        ownerId: i % 6 === 0 ? manager.id : reps[i % 3].id,
        dueAt: overdue ? daysAgo(between(1, 8), 17) : daysAhead(between(0, 30), 17),
        reminderAt: daysAhead(between(0, 5), 9),
        status,
        relatedEntityType: i % 2 === 0 ? "deal" : "ticket",
        relatedEntityId: i % 2 === 0 ? deals[i % deals.length].id : tickets[i % tickets.length].id,
        createdAt: daysAgo(between(2, 60), 9),
      },
    });
  }

  // Activity feed --------------------------------------------------------
  const activityTemplates: { type: ActivityType; subject: string }[] = [
    { type: ActivityType.CALL, subject: "Discovery call completed" },
    { type: ActivityType.MEETING, subject: "Product demo with stakeholders" },
    { type: ActivityType.EMAIL, subject: "Proposal sent for review" },
    { type: ActivityType.STATUS_CHANGE, subject: "Deal moved to Negotiation" },
    { type: ActivityType.ASSIGNMENT, subject: "Lead assigned to owner" },
    { type: ActivityType.NOTE, subject: "Competitor mentioned: point solution" },
  ];
  for (let i = 0; i < 80; i += 1) {
    const template = activityTemplates[i % activityTemplates.length];
    const isDeal = i % 3 === 0;
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        actorId: reps[i % reps.length].id,
        type: template.type,
        subject: `${template.subject} — ${companies[i % companies.length].name}`,
        entityType: isDeal ? "deal" : i % 3 === 1 ? "lead" : "ticket",
        entityId: isDeal
          ? deals[i % deals.length].id
          : i % 3 === 1
            ? leads[i % leads.length].id
            : tickets[i % tickets.length].id,
        occurredAt: daysAgo(between(0, 60), between(8, 18)),
      },
    });
  }

  // Notifications --------------------------------------------------------
  const notifications: { type: NotificationType; title: string; body: string }[] = [
    { type: NotificationType.ASSIGNMENT, title: "New lead assigned", body: "Priya Nair was assigned to you and scored 96." },
    { type: NotificationType.DEAL_UPDATE, title: "Deal moved to Won", body: "Acme Co enterprise license closed at $50,000." },
    { type: NotificationType.SLA_WARNING, title: "SLA warning", body: "DEMO-1001 is due in under 4 hours and is still unassigned." },
    { type: NotificationType.TICKET_UPDATE, title: "Ticket updated", body: "Support replied on the CSV import failure." },
    { type: NotificationType.FOLLOW_UP, title: "Follow-up due today", body: "Call back the champion at Globex before 17:00." },
    { type: NotificationType.MENTION, title: "You were mentioned", body: "Dana mentioned you in an internal ticket note." },
    { type: NotificationType.SYSTEM, title: "Weekly forecast ready", body: "Your pipeline review for this week is available." },
  ];
  for (let i = 0; i < 28; i += 1) {
    const template = notifications[i % notifications.length];
    const target = i % 5 === 0 ? owner : i % 4 === 0 ? manager : i % 7 === 0 ? support : rep;
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: target.id,
        type: template.type,
        title: template.title,
        body: template.body,
        data: { link: i % 2 === 0 ? "/deals" : "/tickets" },
        readAt: i % 3 === 0 ? daysAgo(between(0, 4), 12) : null,
        createdAt: daysAgo(between(0, 10), between(7, 19)),
      },
    });
  }

  // Workflows ------------------------------------------------------------
  const workflowSeed = [
    {
      name: "New lead → assign to rep",
      trigger: "lead.created",
      condition: { field: "source", equals: "WEBSITE" },
      actions: [{ type: "assign", target: "round_robin" }, { type: "notify", template: "lead_assigned" }],
    },
    {
      name: "Deal stuck in Proposal for 14 days",
      trigger: "deal.stalled",
      condition: { stage: "proposal", days: 14 },
      actions: [{ type: "create_task", title: "Nudge the deal owner" }, { type: "notify", template: "deal_stalled" }],
    },
    {
      name: "Urgent ticket → page on-call",
      trigger: "ticket.created",
      condition: { priority: "URGENT" },
      actions: [{ type: "assign", target: "support_manager" }, { type: "webhook", url: "https://example.com/oncall" }],
    },
    {
      name: "Renewal 90 days out",
      trigger: "subscription.renewal_window",
      condition: { days: 90 },
      actions: [{ type: "create_task", title: "Start renewal conversation" }],
    },
    {
      name: "Won deal → onboarding checklist",
      trigger: "deal.won",
      condition: {},
      actions: [{ type: "create_tasks", template: "onboarding" }, { type: "notify", template: "deal_won" }],
    },
  ];
  for (let i = 0; i < workflowSeed.length; i += 1) {
    const entry = workflowSeed[i];
    const workflow = await prisma.workflow.create({
      data: {
        organizationId: org.id,
        name: entry.name,
        trigger: entry.trigger,
        condition: entry.condition,
        actions: entry.actions,
        isActive: i !== 4,
      },
    });
    for (let e = 0; e < 4; e += 1) {
      const failed = (i + e) % 5 === 0;
      await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          triggerEvent: entry.trigger,
          status: failed ? "failed" : "success",
          input: { entityId: deals[e % deals.length].id },
          output: failed ? undefined : { steps: entry.actions.length, durationMs: between(20, 400) },
          error: failed ? "Webhook returned 502" : null,
          createdAt: daysAgo(between(0, 20), 11),
        },
      });
    }
  }

  // Subscription ---------------------------------------------------------
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: daysAhead(23),
      quotaLeads: 10000,
      quotaUsers: 25,
    },
  });

  // Audit log ------------------------------------------------------------
  const auditActions = [
    "user.login", "deal.created", "deal.stage_changed", "lead.converted",
    "ticket.assigned", "user.role_changed", "workflow.updated", "report.exported",
  ];
  for (let i = 0; i < 45; i += 1) {
    const action = auditActions[i % auditActions.length];
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: i % 9 === 0 ? owner.id : reps[i % reps.length].id,
        action,
        entityType: action.split(".")[0],
        entityId: i % 2 === 0 ? deals[i % deals.length].id : leads[i % leads.length].id,
        oldValues: action.includes("stage") ? { stage: "proposal" } : undefined,
        newValues: action.includes("stage") ? { stage: "negotiation" } : { ok: true },
        ip: `203.0.113.${between(1, 250)}`,
        userAgent: "Mozilla/5.0 (demo seed)",
        createdAt: daysAgo(between(0, 45), between(8, 20)),
      },
    });
  }

  const counts = {
    users: usersSeed.length,
    companies: companies.length,
    contacts: contacts.length,
    pipelines: 2,
    deals: deals.length,
    leads: leads.length,
    tickets: tickets.length,
    tasks: 32,
    activities: 80,
    notifications: 28,
    workflows: workflowSeed.length,
    auditLogs: 45,
  };
  console.log("Demo data ready:", counts);
  console.log("Login with any of:", usersSeed.map((u) => `${u.email} / ${PASSWORD}`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
