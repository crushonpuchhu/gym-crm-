import {
  PrismaClient,
  RoleKey,
  ProspectStatus,
  ProspectSource,
  ProspectPriority,
  MemberStatus,
  MembershipStatus,
  BillingCycle,
  CheckInMethod,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TaskStatus,
  ActivityType,
  NotificationType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SLUG = "iron-atlas";
const PASSWORD = "password123";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 12);

/* Deterministic pseudo-random so the demo dataset is identical on every reseed. */
let seed = 20261118;
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
  { email: "manager@demo.com", name: "Dana Whitfield", role: RoleKey.CLUB_MANAGER },
  { email: "rep@demo.com", name: "Jordan Reyes", role: RoleKey.MEMBERSHIP_ADVISOR },
  { email: "rep2@demo.com", name: "Luis Márquez", role: RoleKey.MEMBERSHIP_ADVISOR },
  { email: "supportlead@demo.com", name: "Nia Brooks", role: RoleKey.SUPPORT_MANAGER },
  { email: "support@demo.com", name: "Sam Okafor", role: RoleKey.SUPPORT_AGENT },
  { email: "viewer@demo.com", name: "Riley Kim", role: RoleKey.VIEWER },
] as const;

const locationsSeed = [
  { name: "Iron Atlas Downtown", address: "240 Market Street", city: "Springfield", region: "IL", phone: "+1 555 0100", capacity: 320, opensAt: "05:00", closesAt: "23:00" },
  { name: "Iron Atlas Riverside", address: "8 River Walk", city: "Springfield", region: "IL", phone: "+1 555 0101", capacity: 240, opensAt: "06:00", closesAt: "22:00" },
  { name: "Iron Atlas Northgate", address: "1200 Northgate Blvd", city: "Shelbyville", region: "IL", phone: "+1 555 0102", capacity: 180, opensAt: "06:00", closesAt: "21:00" },
] as const;

const plansSeed = [
  { name: "Day Pass", description: "Single visit, gym floor and showers.", price: 25, billingCycle: BillingCycle.ONE_TIME, durationDays: 1, color: "#64748b" },
  { name: "Starter Monthly", description: "Gym floor access at one club, cancel anytime.", price: 39, billingCycle: BillingCycle.MONTHLY, durationDays: 30, color: "#4f46e5" },
  { name: "Unlimited Monthly", description: "All clubs, all group classes, guest pass each month.", price: 69, billingCycle: BillingCycle.MONTHLY, durationDays: 30, color: "#7c3aed" },
  { name: "Annual Unlimited", description: "Twelve months paid upfront, two months free.", price: 690, billingCycle: BillingCycle.ANNUAL, durationDays: 365, color: "#0891b2" },
  { name: "Student Monthly", description: "Discounted monthly plan with a valid student ID.", price: 29, billingCycle: BillingCycle.MONTHLY, durationDays: 30, color: "#059669" },
  { name: "PT Pack — 8 sessions", description: "Eight one-to-one sessions, valid for 90 days.", price: 480, billingCycle: BillingCycle.ONE_TIME, durationDays: 90, color: "#d97706" },
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

const goals = [
  "Lose 10 kg", "Build strength", "Marathon prep", "Rehab after injury",
  "General fitness", "Improve mobility", "Train for a triathlon", "Postnatal recovery",
] as const;

const prospectSources = [
  ProspectSource.WALK_IN,
  ProspectSource.WEBSITE,
  ProspectSource.REFERRAL,
  ProspectSource.INSTAGRAM,
  ProspectSource.FACEBOOK,
  ProspectSource.GOOGLE,
  ProspectSource.EVENT,
  ProspectSource.PARTNER,
] as const;

const prospectStatuses = [
  ProspectStatus.NEW,
  ProspectStatus.NEW,
  ProspectStatus.CONTACTED,
  ProspectStatus.TOUR_BOOKED,
  ProspectStatus.TOURED,
  ProspectStatus.TRIAL,
  ProspectStatus.NEGOTIATING,
  ProspectStatus.LOST,
] as const;

const ticketSubjects = [
  "Direct debit failed but card is valid",
  "Locker room 3 shower has no hot water",
  "Cannot book the 6pm spin class in the app",
  "Squat rack 4 cable is frayed",
  "QR code will not scan at the turnstile",
  "Guest pass did not arrive by email",
  "Pool temperature is too low",
  "Membership freeze request ignored",
  "Sauna timer is broken",
  "Charged twice for the PT pack",
  "App shows the wrong home club",
  "Towel service ran out before 8am",
  "Corporate discount not applied",
  "Personal trainer cancelled three sessions",
  "Parking validation does not work",
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

/** Monthly recurring value of a plan. One-off products do not count towards MRR. */
function monthlyValue(price: number, cycle: BillingCycle) {
  if (cycle === BillingCycle.ANNUAL) return Math.round((price / 12) * 100) / 100;
  if (cycle === BillingCycle.QUARTERLY) return Math.round((price / 3) * 100) / 100;
  if (cycle === BillingCycle.ONE_TIME) return 0;
  return price;
}

async function main() {
  await resetDemoData();

  const org = await prisma.organization.create({
    data: {
      name: "Iron Atlas Fitness",
      slug: DEMO_SLUG,
      plan: SubscriptionPlan.GROWTH,
      status: "active",
      currency: "USD",
      timezone: "America/Chicago",
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
    await prisma.teamMembership.create({
      data: { userId: user.id, organizationId: org.id, role: entry.role },
    });
  }

  const owner = users["owner@demo.com"];
  const manager = users["manager@demo.com"];
  const rep = users["rep@demo.com"];
  const rep2 = users["rep2@demo.com"];
  const supportLead = users["supportlead@demo.com"];
  const support = users["support@demo.com"];
  const advisors = [rep, rep2, manager];

  // Locations ------------------------------------------------------------
  const locations: { id: string; name: string }[] = [];
  for (const entry of locationsSeed) {
    const location = await prisma.location.create({
      data: { organizationId: org.id, ...entry, email: `${entry.name.toLowerCase().replace(/[^a-z]+/g, "")}@ironatlas.example` },
      select: { id: true, name: true },
    });
    locations.push(location);
  }

  // Plans ----------------------------------------------------------------
  const plans: { id: string; name: string; price: number; billingCycle: BillingCycle; monthly: number; durationDays: number }[] = [];
  for (const entry of plansSeed) {
    const plan = await prisma.membershipPlan.create({
      data: { organizationId: org.id, ...entry },
      select: { id: true, name: true, price: true, billingCycle: true, durationDays: true },
    });
    plans.push({
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      billingCycle: plan.billingCycle,
      monthly: monthlyValue(Number(plan.price), plan.billingCycle),
      durationDays: plan.durationDays,
    });
  }

  // Pipelines ------------------------------------------------------------
  const salesPipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: "New Memberships",
      isDefault: true,
      stages: {
        create: [
          { name: "Enquiry", key: "enquiry", order: 1, probability: 15 },
          { name: "Tour booked", key: "tour", order: 2, probability: 35 },
          { name: "Trial", key: "trial", order: 3, probability: 55 },
          { name: "Offer sent", key: "offer", order: 4, probability: 75 },
          { name: "Joined", key: "joined", order: 5, probability: 100, isWon: true },
          { name: "Lost", key: "lost", order: 6, probability: 0, isLost: true },
        ],
      },
    },
    include: { stages: true },
  });
  const salesStage = Object.fromEntries(salesPipeline.stages.map((s) => [s.key, s]));

  const renewalPipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: "Renewals 2027",
      isDefault: false,
      stages: {
        create: [
          { name: "Renewal due", key: "renewal_due", order: 1, probability: 25 },
          { name: "In review", key: "in_review", order: 2, probability: 50 },
          { name: "Negotiating", key: "renewal_negotiating", order: 3, probability: 75 },
          { name: "Renewed", key: "renewed", order: 4, probability: 100, isWon: true },
          { name: "Churned", key: "churned", order: 5, probability: 0, isLost: true },
        ],
      },
    },
    include: { stages: true },
  });
  const renewalStage = Object.fromEntries(renewalPipeline.stages.map((s) => [s.key, s]));

  // Members --------------------------------------------------------------
  const members: { id: string; name: string; status: MemberStatus; locationId: string; joinedAt: Date; planIndex: number }[] = [];
  for (let i = 0; i < 120; i += 1) {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 3) % lastNames.length];
    const location = locations[i % locations.length];
    const status =
      i < 88
        ? MemberStatus.ACTIVE
        : i < 98
          ? MemberStatus.TRIAL
          : i < 106
            ? MemberStatus.PAUSED
            : i < 115
              ? MemberStatus.CANCELLED
              : MemberStatus.EXPIRED;
    const planIndex = i % 5 === 0 ? 3 : i % 4 === 0 ? 4 : i % 3 === 0 ? 2 : 1;
    const joinedAt = status === MemberStatus.TRIAL ? daysAgo(between(1, 20), 9) : daysAgo(between(25, 900), 9);
    const member = await prisma.member.create({
      data: {
        organizationId: org.id,
        ownerId: advisors[i % advisors.length].id,
        locationId: location.id,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        phone: `+1 555 ${String(2000 + i).padStart(4, "0")}`,
        dateOfBirth: new Date(1985 + (i % 22), (i * 5) % 12, 1 + (i % 27)),
        address: `${between(10, 990)} ${pick(["Oak", "Maple", "Cedar", "Pine", "Elm"])} Street`,
        emergencyContact: `${pick(firstNames)} ${pick(lastNames)} · +1 555 ${String(7000 + i).padStart(4, "0")}`,
        fitnessGoal: goals[i % goals.length],
        status,
        joinedAt: status === MemberStatus.TRIAL ? null : joinedAt,
        notes: i % 9 === 0 ? "Prefers early morning sessions. Flagged for a free PT intro." : null,
        createdAt: joinedAt,
      },
      select: { id: true },
    });
    members.push({ id: member.id, name: `${first} ${last}`, status, locationId: location.id, joinedAt, planIndex });
  }

  // Contracts ------------------------------------------------------------
  const memberships: { id: string; title: string; stageKey: string; status: MembershipStatus }[] = [];
  const membershipByMember = new Map<string, { id: string; monthly: number; planId: string }>();

  for (let i = 0; i < members.length; i += 1) {
    const member = members[i];
    const plan = plans[member.planIndex];
    const isTrial = member.status === MemberStatus.TRIAL;
    const status =
      isTrial
        ? MembershipStatus.PENDING
        : member.status === MemberStatus.ACTIVE
          ? MembershipStatus.ACTIVE
          : member.status === MemberStatus.PAUSED
            ? MembershipStatus.PAUSED
            : member.status === MemberStatus.CANCELLED
              ? MembershipStatus.CANCELLED
              : MembershipStatus.EXPIRED;
    const stage = isTrial ? salesStage.trial : salesStage.joined;
    const startDate = member.joinedAt;
    const endDate = plan.billingCycle === BillingCycle.ANNUAL ? daysAhead(300) : daysAhead(between(1, 30));
    const contract = await prisma.membership.create({
      data: {
        organizationId: org.id,
        pipelineId: salesPipeline.id,
        stageId: stage.id,
        ownerId: advisors[i % advisors.length].id,
        memberId: member.id,
        planId: plan.id,
        locationId: member.locationId,
        title: `${member.name} — ${plan.name}`,
        value: plan.billingCycle === BillingCycle.ANNUAL ? plan.price : plan.price * 12,
        monthlyValue: plan.monthly,
        billingCycle: plan.billingCycle,
        status,
        probability: isTrial ? 55 : status === MembershipStatus.CANCELLED || status === MembershipStatus.EXPIRED ? 0 : 100,
        expectedCloseAt: isTrial ? daysAhead(between(2, 20)) : undefined,
        startDate: isTrial ? undefined : startDate,
        endDate: isTrial ? undefined : endDate,
        wonAt: isTrial ? undefined : startDate,
        lostAt: status === MembershipStatus.CANCELLED || status === MembershipStatus.EXPIRED ? daysAgo(between(1, 60), 12) : undefined,
        cancelledAt: status === MembershipStatus.CANCELLED ? daysAgo(between(1, 60), 12) : undefined,
        cancelReason:
          status === MembershipStatus.CANCELLED ? pick(["Moved away", "Too expensive", "Injury", "Switched gyms"]) : undefined,
        createdAt: isTrial ? daysAgo(between(1, 20), 9) : startDate,
      },
      select: { id: true, title: true },
    });
    memberships.push({ id: contract.id, title: contract.title, stageKey: isTrial ? "trial" : "joined", status });
    membershipByMember.set(member.id, { id: contract.id, monthly: plan.monthly, planId: plan.id });
  }

  // Open sales pipeline (enquiries, tours, trials, offers).
  const openPlan = [
    { key: "enquiry", count: 12 },
    { key: "tour", count: 10 },
    { key: "trial", count: 6 },
    { key: "offer", count: 8 },
  ];
  for (const entry of openPlan) {
    const stage = salesStage[entry.key];
    for (let i = 0; i < entry.count; i += 1) {
      const first = firstNames[(i * 3 + 7) % firstNames.length];
      const last = lastNames[(i * 7 + 2) % lastNames.length];
      const plan = plans[1 + (i % 4)];
      const location = locations[i % locations.length];
      const created = daysAgo(between(1, 45), 10);
      const contract = await prisma.membership.create({
        data: {
          organizationId: org.id,
          pipelineId: salesPipeline.id,
          stageId: stage.id,
          ownerId: advisors[i % advisors.length].id,
          planId: plan.id,
          locationId: location.id,
          title: `${first} ${last} — ${plan.name}`,
          value: plan.billingCycle === BillingCycle.ANNUAL ? plan.price : plan.price * 12,
          monthlyValue: plan.monthly,
          billingCycle: plan.billingCycle,
          status: MembershipStatus.PENDING,
          probability: stage.probability,
          expectedCloseAt: daysAhead(between(1, 30)),
          createdAt: created,
        },
        select: { id: true, title: true },
      });
      memberships.push({ id: contract.id, title: contract.title, stageKey: entry.key, status: MembershipStatus.PENDING });
    }
  }

  // Lost deals.
  for (let i = 0; i < 12; i += 1) {
    const first = firstNames[(i * 5 + 3) % firstNames.length];
    const last = lastNames[(i * 11 + 4) % lastNames.length];
    const plan = plans[1 + (i % 4)];
    const contract = await prisma.membership.create({
      data: {
        organizationId: org.id,
        pipelineId: salesPipeline.id,
        stageId: salesStage.lost.id,
        ownerId: advisors[i % advisors.length].id,
        planId: plan.id,
        locationId: locations[i % locations.length].id,
        title: `${first} ${last} — ${plan.name}`,
        value: plan.price * 12,
        monthlyValue: plan.monthly,
        billingCycle: plan.billingCycle,
        status: MembershipStatus.CANCELLED,
        probability: 0,
        expectedCloseAt: daysAgo(between(1, 20)),
        lostAt: daysAgo(between(1, 60), 14),
        cancelledAt: daysAgo(between(1, 60), 14),
        cancelReason: pick(["Chose a cheaper gym", "Moved away", "Trial ended with no follow-up", "Budget"]),
        createdAt: daysAgo(between(20, 90), 11),
      },
      select: { id: true, title: true },
    });
    memberships.push({ id: contract.id, title: contract.title, stageKey: "lost", status: MembershipStatus.CANCELLED });
  }

  // Renewal pipeline for active members.
  const renewalPlan = [
    { key: "renewal_due", count: 8 },
    { key: "in_review", count: 5 },
    { key: "renewal_negotiating", count: 5 },
  ];
  for (const entry of renewalPlan) {
    const stage = renewalStage[entry.key];
    for (let i = 0; i < entry.count; i += 1) {
      const member = members[i * 3];
      const plan = plans[member.planIndex];
      const contract = await prisma.membership.create({
        data: {
          organizationId: org.id,
          pipelineId: renewalPipeline.id,
          stageId: stage.id,
          ownerId: advisors[i % advisors.length].id,
          memberId: member.id,
          planId: plan.id,
          locationId: member.locationId,
          title: `${member.name} — 2027 renewal`,
          value: plan.billingCycle === BillingCycle.ANNUAL ? plan.price : plan.price * 12,
          monthlyValue: plan.monthly,
          billingCycle: plan.billingCycle,
          status: MembershipStatus.PENDING,
          probability: stage.probability,
          expectedCloseAt: daysAhead(between(7, 90)),
          createdAt: daysAgo(between(5, 40), 12),
        },
        select: { id: true, title: true },
      });
      memberships.push({ id: contract.id, title: contract.title, stageKey: entry.key, status: MembershipStatus.PENDING });
    }
  }

  // Stage history for contracts that moved.
  for (let i = 0; i < memberships.length; i += 1) {
    const entry = memberships[i];
    if (entry.stageKey === "enquiry" || entry.stageKey === "renewal_due") continue;
    const isRenewal = ["in_review", "renewal_negotiating", "renewed", "churned"].includes(entry.stageKey);
    const allStages = isRenewal ? renewalStage : salesStage;
    const order = isRenewal ? ["renewal_due", "in_review", "renewal_negotiating"] : ["enquiry", "tour", "trial", "offer"];
    const target = order.indexOf(entry.stageKey);
    const steps = target > 0 ? target : 1;
    let from: string | null = null;
    for (let s = 1; s <= steps; s += 1) {
      const key = s === steps ? entry.stageKey : order[s - 1];
      const stage = allStages[key];
      if (!stage) continue;
      await prisma.membershipStageHistory.create({
        data: {
          membershipId: entry.id,
          fromStageId: from,
          toStageId: stage.id,
          changedById: advisors[i % advisors.length].id,
          changedAt: daysAgo(between(1, 90), 14),
        },
      });
      from = stage.id;
    }
  }

  // Prospects ------------------------------------------------------------
  const prospects: { id: string; name: string; status: ProspectStatus }[] = [];
  for (let i = 0; i < 90; i += 1) {
    const first = firstNames[(i * 7) % firstNames.length];
    const last = lastNames[(i * 5) % lastNames.length];
    const location = locations[i % locations.length];
    const joined = i >= 60 && i < 70;
    const status = joined ? ProspectStatus.JOINED : prospectStatuses[i % prospectStatuses.length];
    const trialMember = joined ? members[i - 60] : null;
    const converted = trialMember ? membershipByMember.get(trialMember.id) : null;
    const plan = plans[1 + (i % 4)];
    const prospect = await prisma.prospect.create({
      data: {
        organizationId: org.id,
        ownerId: advisors[i % advisors.length].id,
        locationId: location.id,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        phone: `+1 555 ${String(3000 + i).padStart(4, "0")}`,
        source: prospectSources[i % prospectSources.length],
        status,
        priority: i % 9 === 0 ? ProspectPriority.HIGH : i % 4 === 0 ? ProspectPriority.LOW : ProspectPriority.MEDIUM,
        score: i === 0 ? 96 : between(10, 95),
        value: plan.monthly || plan.price,
        fitnessGoal: goals[i % goals.length],
        followUpAt: i % 3 === 0 ? daysAhead(between(1, 10), 17) : undefined,
        convertedMemberId: joined && trialMember ? trialMember.id : undefined,
        convertedMembershipId: joined && converted ? converted.id : undefined,
        createdAt: daysAgo(between(1, 120), 8),
      },
      select: { id: true },
    });
    prospects.push({ id: prospect.id, name: `${first} ${last}`, status });
  }

  // Prospect activity trail.
  const prospectNotes: { type: ActivityType; subject: string }[] = [
    { type: ActivityType.CALL, subject: "Discovery call — wants a 6am training slot" },
    { type: ActivityType.TOUR, subject: "Club tour completed; liked the free-weights floor" },
    { type: ActivityType.EMAIL, subject: "Sent the trial pass and class timetable" },
    { type: ActivityType.NOTE, subject: "Price is the blocker; offer the student plan" },
    { type: ActivityType.CALL, subject: "Follow-up booked for Thursday evening" },
  ];
  for (let i = 0; i < 24; i += 1) {
    const note = prospectNotes[i % prospectNotes.length];
    await prisma.prospectActivity.create({
      data: {
        prospectId: prospects[i].id,
        authorId: advisors[i % advisors.length].id,
        type: note.type,
        subject: note.subject,
        occurredAt: daysAgo(between(1, 40), 13),
      },
    });
  }

  // Check-ins ------------------------------------------------------------
  const activeMembers = members.filter((m) => m.status === MemberStatus.ACTIVE);
  for (let i = 0; i < 450; i += 1) {
    const member = activeMembers[i % activeMembers.length];
    const checkedInAt = i < 18 ? daysAgo(0, 6 + (i % 14)) : daysAgo(between(1, 30), 6 + (i % 15));
    await prisma.checkIn.create({
      data: {
        organizationId: org.id,
        memberId: member.id,
        locationId: member.locationId,
        method: (i % 5 === 0 ? CheckInMethod.QR : i % 3 === 0 ? CheckInMethod.APP : CheckInMethod.FRONT_DESK) as CheckInMethod,
        checkedInAt,
        durationMinutes: between(35, 95),
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
  const ticketCategories = [
    TicketCategory.BILLING,
    TicketCategory.EQUIPMENT,
    TicketCategory.CLASS_BOOKING,
    TicketCategory.ACCESS,
    TicketCategory.CLEANLINESS,
    TicketCategory.STAFF,
    TicketCategory.OTHER,
  ];
  const tickets: { id: string; number: string; subject: string }[] = [];
  for (let i = 0; i < 30; i += 1) {
    const member = members[(i * 4) % members.length];
    const location = locations[i % locations.length];
    const status = i === 0 ? TicketStatus.OPEN : ticketStatuses[i % ticketStatuses.length];
    const priority = i === 0 ? TicketPriority.URGENT : ([TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT] as const)[i % 4];
    const created = daysAgo(between(1, 70), 9);
    const firstResponseAt = status === TicketStatus.NEW ? null : new Date(created.getTime() + between(20, 300) * 60 * 1000);
    const resolved = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
    const resolvedAt = resolved ? new Date(created.getTime() + between(2, 60) * 60 * 60 * 1000) : null;
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: org.id,
        ticketNumber: `GF-${1001 + i}`,
        reporterName: member.name,
        reporterEmail: `${member.name.toLowerCase().replace(/ /g, ".")}@example.com`,
        memberId: member.id,
        locationId: location.id,
        ownerId: i === 0 ? null : i % 5 === 0 ? supportLead.id : support.id,
        category: ticketCategories[i % ticketCategories.length],
        priority,
        status,
        subject: ticketSubjects[i % ticketSubjects.length],
        description:
          "Reported through the member app. The member added photos and the time of the incident; the front desk confirmed the report.",
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
        body: "Thanks for reporting this. We have logged it with the club manager and will update you within one business day.",
        isInternal: false,
        createdAt: daysAgo(between(1, 30), 11),
      },
    });
    if (i % 2 === 0) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: supportLead.id,
          body: "Internal: maintenance contractor is on site Thursday. Do not promise a fix date to the member yet.",
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
          body: "Checked with the club manager — the parts are ordered and the repair is scheduled.",
          isInternal: true,
          createdAt: daysAgo(between(1, 20), 15),
        },
      });
    }
  }

  // Tasks ----------------------------------------------------------------
  const taskTitles = [
    "Call Priya about the trial ending",
    "Send renewal quote to Marcus Bell",
    "Book a PT intro for Elena Fischer",
    "Follow up on the failed direct debit",
    "Prepare the monthly retention review",
    "Chase the Riverside shower repair",
    "Confirm the 6am spin class waitlist",
    "Win back the cancelled Northgate member",
    "Draft the student promotion for September",
    "Check the corporate discount paperwork",
    "Order replacement turnstile QR scanners",
    "Plan the new-year open house",
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
        ownerId: i % 6 === 0 ? manager.id : advisors[i % 3].id,
        dueAt: overdue ? daysAgo(between(1, 8), 17) : daysAhead(between(0, 30), 17),
        reminderAt: daysAhead(between(0, 5), 9),
        status,
        relatedEntityType: i % 2 === 0 ? "membership" : "ticket",
        relatedEntityId: i % 2 === 0 ? memberships[i % memberships.length].id : tickets[i % tickets.length].id,
        createdAt: daysAgo(between(2, 60), 9),
      },
    });
  }

  // Activity feed --------------------------------------------------------
  const activityTemplates: { type: ActivityType; subject: string }[] = [
    { type: ActivityType.CALL, subject: "Trial follow-up call completed" },
    { type: ActivityType.TOUR, subject: "Club tour completed" },
    { type: ActivityType.EMAIL, subject: "Membership quote sent" },
    { type: ActivityType.STATUS_CHANGE, subject: "Contract moved to Offer sent" },
    { type: ActivityType.CHECK_IN, subject: "Member checked in" },
    { type: ActivityType.NOTE, subject: "Member mentioned a cheaper competitor" },
  ];
  for (let i = 0; i < 80; i += 1) {
    const template = activityTemplates[i % activityTemplates.length];
    const isMember = i % 3 === 0;
    const member = members[i % members.length];
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        actorId: advisors[i % advisors.length].id,
        type: template.type,
        subject: `${template.subject} — ${member.name}`,
        entityType: isMember ? "member" : i % 3 === 1 ? "prospect" : "membership",
        entityId: isMember
          ? member.id
          : i % 3 === 1
            ? prospects[i % prospects.length].id
            : memberships[i % memberships.length].id,
        occurredAt: daysAgo(between(0, 60), between(8, 18)),
      },
    });
  }

  // Notifications --------------------------------------------------------
  const notifications: { type: NotificationType; title: string; body: string }[] = [
    { type: NotificationType.ASSIGNMENT, title: "New trial booked", body: "Priya Nair booked a trial at Downtown and scored 96." },
    { type: NotificationType.MEMBERSHIP_UPDATE, title: "Membership signed", body: "Marcus Bell joined on Unlimited Monthly." },
    { type: NotificationType.SLA_WARNING, title: "SLA warning", body: "GF-1001 is urgent and still unassigned." },
    { type: NotificationType.TICKET_UPDATE, title: "Ticket updated", body: "Support replied on the locker room repair." },
    { type: NotificationType.FOLLOW_UP, title: "Follow-up due today", body: "Call the Riverside trial before 17:00." },
    { type: NotificationType.RENEWAL, title: "Renewal window opened", body: "12 memberships renew in the next 90 days." },
    { type: NotificationType.MENTION, title: "You were mentioned", body: "Dana mentioned you in a retention note." },
    { type: NotificationType.SYSTEM, title: "Weekly retention report ready", body: "Churn and attendance for last week are available." },
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
        data: { link: i % 2 === 0 ? "/memberships" : "/tickets" },
        readAt: i % 3 === 0 ? daysAgo(between(0, 4), 12) : null,
        createdAt: daysAgo(between(0, 10), between(7, 19)),
      },
    });
  }

  // Workflows ------------------------------------------------------------
  const workflowSeed = [
    {
      name: "New enquiry → assign an advisor",
      trigger: "prospect.created",
      condition: { field: "source", in: ["WEBSITE", "INSTAGRAM", "GOOGLE"] },
      actions: [{ type: "assign", target: "round_robin" }, { type: "notify", template: "prospect_assigned" }],
    },
    {
      name: "Trial ends in 2 days → follow-up task",
      trigger: "prospect.trial_ending",
      condition: { days: 2 },
      actions: [{ type: "create_task", title: "Call the trial member and offer a plan" }, { type: "notify", template: "trial_ending" }],
    },
    {
      name: "Failed payment → dunning sequence",
      trigger: "payment.failed",
      condition: { retries: 3 },
      actions: [{ type: "send_email", template: "payment_failed" }, { type: "create_task", title: "Call the member about the failed card" }],
    },
    {
      name: "No check-in for 14 days → win-back",
      trigger: "checkin.inactive",
      condition: { days: 14 },
      actions: [{ type: "create_task", title: "Win-back call" }, { type: "send_email", template: "we_miss_you" }],
    },
    {
      name: "New member → onboarding checklist",
      trigger: "membership.won",
      condition: {},
      actions: [{ type: "create_tasks", template: "onboarding" }, { type: "notify", template: "membership_won" }],
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
          input: { entityId: memberships[e % memberships.length].id },
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
      plan: SubscriptionPlan.GROWTH,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: daysAhead(23),
      quotaMembers: 5000,
      quotaStaff: 25,
    },
  });

  // Audit log ------------------------------------------------------------
  const auditActions = [
    "member.created", "membership.created", "membership.stage_changed", "prospect.converted",
    "ticket.assigned", "user.role_changed", "workflow.updated", "report.exported", "checkin.created",
  ];
  for (let i = 0; i < 45; i += 1) {
    const action = auditActions[i % auditActions.length];
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: i % 9 === 0 ? owner.id : advisors[i % advisors.length].id,
        action,
        entityType: action.split(".")[0],
        entityId: i % 2 === 0 ? memberships[i % memberships.length].id : members[i % members.length].id,
        oldValues: action.includes("stage") ? { stage: "offer" } : undefined,
        newValues: action.includes("stage") ? { stage: "joined" } : { ok: true },
        ip: `203.0.113.${between(1, 250)}`,
        userAgent: "Mozilla/5.0 (demo seed)",
        createdAt: daysAgo(between(0, 45), between(8, 20)),
      },
    });
  }

  const counts = {
    users: usersSeed.length,
    locations: locations.length,
    plans: plans.length,
    members: members.length,
    prospects: prospects.length,
    memberships: memberships.length,
    checkIns: 450,
    tickets: tickets.length,
    tasks: 32,
    activities: 80,
    notifications: 28,
    workflows: workflowSeed.length,
    auditLogs: 45,
  };
  console.log("Gym demo data ready:", counts);
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
