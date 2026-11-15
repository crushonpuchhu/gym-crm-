import { PrismaClient, RoleKey, LeadStatus, TicketStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Demo organization
  const org = await prisma.organization.create({
    data: {
      name: "Demo Corp",
      slug: "demo-corp",
      plan: SubscriptionPlan.PROFESSIONAL,
      status: "active",
    },
  });

  // Demo users
  const owner = await prisma.user.create({
    data: {
      email: "owner@demo.com",
      passwordHash: "$2b$12$EXAMPLE.hash.do.not.use.in.production",
      name: "Org Owner",
      emailVerified: true,
    },
  });
  const rep = await prisma.user.create({
    data: {
      email: "rep@demo.com",
      passwordHash: "$2b$12$EXAMPLE.hash.do.not.use.in.production",
      name: "Sales Rep",
      emailVerified: true,
    },
  });
  const support = await prisma.user.create({
    data: {
      email: "support@demo.com",
      passwordHash: "$2b$12$EXAMPLE.hash.do.not.use.in.production",
      name: "Support Agent",
      emailVerified: true,
    },
  });
  const viewer = await prisma.user.create({
    data: {
      email: "viewer@demo.com",
      passwordHash: "$2b$12$EXAMPLE.hash.do.not.use.in.production",
      name: "Viewer",
      emailVerified: true,
    },
  });

  // Memberships
  await prisma.membership.createMany({
    data: [
      { userId: owner.id, organizationId: org.id, role: RoleKey.ORG_OWNER },
      { userId: rep.id, organizationId: org.id, role: RoleKey.SALES_REP },
      { userId: support.id, organizationId: org.id, role: RoleKey.SUPPORT_AGENT },
      { userId: viewer.id, organizationId: org.id, role: RoleKey.VIEWER },
    ],
  });

  // Default pipeline + stages
  const pipeline = await prisma.pipeline.create({
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
  });

  // Leads
  const l1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      ownerId: rep.id,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+15550100",
      company: "Acme Co",
      source: LeadSource.WEBSITE,
      status: LeadStatus.QUALIFIED,
      priority: LeadPriority.HIGH,
      score: 85,
    },
  });
  const l2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      ownerId: rep.id,
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      company: "Globex",
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEW,
      priority: LeadPriority.MEDIUM,
      score: 40,
    },
  });

  // Contacts
  await prisma.contact.create({
    data: {
      organizationId: org.id,
      ownerId: rep.id,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      position: "CTO",
    },
  });

  // Company
  const co = await prisma.company.create({
    data: {
      organizationId: org.id,
      name: "Acme Co",
      industry: "Technology",
      website: "https://acme.example.com",
      employees: 120,
    },
  });

  // Deal
  const wonStage = await prisma.pipelineStage.findFirst({
    where: { pipelineId: pipeline.id, key: "won" },
  });
  if (wonStage) {
    await prisma.deal.create({
      data: {
        organizationId: org.id,
        pipelineId: pipeline.id,
        stageId: wonStage.id,
        ownerId: rep.id,
        companyId: co.id,
        title: "Acme Co Enterprise License",
        value: 50000,
        probability: 100,
      },
    });
  }

  // Ticket
  await prisma.ticket.create({
    data: {
      organizationId: org.id,
      ticketNumber: "DEMO-1001",
      customerEmail: "customer@example.com",
      customerName: "Demo Customer",
      ownerId: support.id,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      subject: "Cannot access dashboard",
      description: "User reports dashboard not loading.",
    },
  });

  // Subscription
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      status: SubscriptionStatus.ACTIVE,
      quotaLeads: 10000,
      quotaUsers: 25,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
