import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";
import { PLAN_PRICES, PLAN_QUOTAS } from "../config/plans";

/**
 * Vendor-side platform console API.
 *
 * This is the only surface mounted without a tenant context. It is gated by
 * `requirePlatformAdmin`, sees every brand in aggregate, and never writes gym
 * records — only commercial state (status, plan, quotas).
 */
const router = Router();

const PLAN_KEYS = ["STARTER", "GROWTH", "SCALE"] as const;
const ORG_STATUSES = ["active", "suspended"] as const;
const SUB_STATUSES = ["ACTIVE", "PAST_DUE", "CANCELLED", "TRIAL", "EXPIRED"] as const;

function latestByOrg<T extends { organizationId: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.organizationId)) map.set(row.organizationId, row);
  }
  return map;
}

/** The product dashboard: how many gyms, how much they use, what they pay. */
router.get("/overview", async (_req: AuthedRequest, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orgs, users, members, staff, subscriptions, recentOrgs] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { deletedAt: null, isPlatformAdmin: false } }),
    prisma.member.count({ where: { deletedAt: null, organization: { deletedAt: null } } }),
    prisma.teamMembership.count({ where: { deletedAt: null, organization: { deletedAt: null } } }),
    prisma.subscription.findMany({
      select: { organizationId: true, plan: true, status: true, quotaStaff: true, quotaMembers: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        createdAt: true,
        _count: { select: { members: true, team: true, prospects: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const subs = latestByOrg(subscriptions);
  const active = orgs.filter((org) => org.status === "active");
  const byPlan = { STARTER: 0, GROWTH: 0, SCALE: 0 };
  for (const org of orgs) byPlan[org.plan] += 1;

  const paying = active.filter((org) => subs.get(org.id)?.status === "ACTIVE");
  const mrr = paying.reduce((sum, org) => sum + PLAN_PRICES[org.plan], 0);
  const trialing = orgs.filter((org) => subs.get(org.id)?.status === "TRIAL").length;

  return ok(res, {
    totals: {
      organizations: orgs.length,
      activeOrganizations: active.length,
      suspendedOrganizations: orgs.length - active.length,
      trialing,
      paying: paying.length,
      users,
      members,
      staff,
      mrr,
      newOrganizations30d: orgs.filter((org) => org.createdAt >= since).length,
    },
    byPlan,
    recentOrganizations: recentOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
      members: org._count.members,
      staff: org._count.team,
      prospects: org._count.prospects,
    })),
  });
});

/** All gym brands with usage, plan and status. */
router.get("/organizations", async (req: AuthedRequest, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const plan = String(req.query.plan ?? "").trim();

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }
  if (ORG_STATUSES.includes(status as (typeof ORG_STATUSES)[number])) where.status = status;
  if (PLAN_KEYS.includes(plan as (typeof PLAN_KEYS)[number])) where.plan = plan;

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, name: true, slug: true, plan: true, status: true, currency: true, createdAt: true },
    }),
    prisma.organization.count({ where }),
  ]);

  const ids = orgs.map((org) => org.id);
  const [staffCounts, memberCounts, subscriptions, activity] = await Promise.all([
    prisma.teamMembership.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.member.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.subscription.findMany({
      where: { organizationId: { in: ids } },
      orderBy: { createdAt: "desc" },
      select: { organizationId: true, status: true, quotaStaff: true, quotaMembers: true, currentPeriodEnd: true },
    }),
    prisma.auditLog.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);

  const staffMap = new Map(staffCounts.map((row) => [row.organizationId, row._count._all]));
  const memberMap = new Map(memberCounts.map((row) => [row.organizationId, row._count._all]));
  const subMap = latestByOrg(subscriptions);
  const activityMap = new Map(activity.map((row) => [row.organizationId, row._max.createdAt]));

  return ok(res, {
    items: orgs.map((org) => {
      const sub = subMap.get(org.id);
      return {
        ...org,
        staff: staffMap.get(org.id) ?? 0,
        members: memberMap.get(org.id) ?? 0,
        subscriptionStatus: sub?.status ?? "TRIAL",
        quotaStaff: sub?.quotaStaff ?? PLAN_QUOTAS[org.plan].quotaStaff,
        quotaMembers: sub?.quotaMembers ?? PLAN_QUOTAS[org.plan].quotaMembers,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        lastActivityAt: activityMap.get(org.id) ?? null,
      };
    }),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

/** One gym: usage, subscription, staff roster and the latest audit events. */
router.get("/organizations/:id", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "Organization not found", 404);
  }
  const org = await prisma.organization.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      currency: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!org) return err(res, "not_found", "Organization not found", 404);

  const [subscription, staff, memberCount, prospectCount, locationCount, invitations, auditLogs] =
    await Promise.all([
      prisma.subscription.findFirst({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.teamMembership.findMany({
        where: { organizationId: org.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, emailVerified: true } },
        },
      }),
      prisma.member.count({ where: { organizationId: org.id, deletedAt: null } }),
      prisma.prospect.count({ where: { organizationId: org.id, deletedAt: null } }),
      prisma.location.count({ where: { organizationId: org.id, deletedAt: null } }),
      prisma.invitation.count({
        where: { organizationId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  return ok(res, {
    organization: org,
    subscription,
    usage: {
      members: memberCount,
      prospects: prospectCount,
      staff: staff.length,
      locations: locationCount,
      pendingInvitations: invitations,
    },
    staff: staff.map((row) => ({ ...row.user, role: row.role, joinedAt: row.createdAt })),
    recentActivity: auditLogs,
  });
});

const updateSchema = z
  .object({
    status: z.enum(ORG_STATUSES).optional(),
    plan: z.enum(PLAN_KEYS).optional(),
    subscriptionStatus: z.enum(SUB_STATUSES).optional(),
    quotaStaff: z.number().int().min(1).max(10000).optional(),
    quotaMembers: z.number().int().min(1).max(1000000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });

/**
 * Commercial controls. Suspending a brand blocks tenant routes immediately
 * (`org_suspended`), but preserves every record for when it is reactivated.
 */
router.patch("/organizations/:id", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "Organization not found", 404);
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(res, "validation_error", issue?.message || "Invalid update", 400, issue?.path.join("."));
  }

  const before = await prisma.organization.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, name: true, plan: true, status: true },
  });
  if (!before) return err(res, "not_found", "Organization not found", 404);

  const { status, plan, subscriptionStatus, quotaStaff, quotaMembers } = parsed.data;
  const quotas = plan ? PLAN_QUOTAS[plan] : undefined;

  await prisma.$transaction(async (tx) => {
    if (status || plan) {
      await tx.organization.update({
        where: { id: before.id },
        data: { ...(status ? { status } : {}), ...(plan ? { plan } : {}) },
      });
    }
    if (plan || subscriptionStatus || quotaStaff || quotaMembers) {
      const existing = await tx.subscription.findFirst({
        where: { organizationId: before.id },
        orderBy: { createdAt: "desc" },
      });
      const data = {
        ...(plan ? { plan } : {}),
        ...(subscriptionStatus ? { status: subscriptionStatus } : {}),
        ...(quotaStaff ?? quotas ? { quotaStaff: quotaStaff ?? quotas!.quotaStaff } : {}),
        ...(quotaMembers ?? quotas ? { quotaMembers: quotaMembers ?? quotas!.quotaMembers } : {}),
      };
      if (existing) {
        await tx.subscription.update({ where: { id: existing.id }, data });
      } else {
        await tx.subscription.create({
          data: {
            organizationId: before.id,
            plan: plan ?? before.plan,
            status: subscriptionStatus ?? "TRIAL",
            quotaStaff: quotaStaff ?? PLAN_QUOTAS[plan ?? before.plan].quotaStaff,
            quotaMembers: quotaMembers ?? PLAN_QUOTAS[plan ?? before.plan].quotaMembers,
          },
        });
      }
    }
  });

  await audit({
    // Written into the tenant trail so the gym can see vendor changes too.
    orgId: before.id,
    userId: req.userId,
    action: "platform.org_update",
    entityType: "organization",
    entityId: before.id,
    oldValues: { plan: before.plan, status: before.status },
    newValues: parsed.data,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  const after = await prisma.organization.findUnique({
    where: { id: before.id },
    select: { id: true, name: true, slug: true, plan: true, status: true },
  });
  return ok(res, { organization: after });
});

/** Every human with a login, and which gyms they can enter. */
router.get("/users", async (req: AuthedRequest, res) => {
  const search = String(req.query.search ?? "").trim();
  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      isPlatformAdmin: true,
      createdAt: true,
      team: {
        where: { deletedAt: null },
        select: { role: true, organization: { select: { id: true, name: true } } },
      },
    },
  });
  return ok(
    res,
    users.map((user) => ({
      ...user,
      memberships: user.team.map((row) => ({ role: row.role, organization: row.organization })),
      team: undefined,
    })),
  );
});

/** Cross-tenant activity feed for support and incident review. */
router.get("/activity", async (_req: AuthedRequest, res) => {
  const items = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      ip: true,
      organization: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
    },
  });
  return ok(res, items);
});

export default router;
