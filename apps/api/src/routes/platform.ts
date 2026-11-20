import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ok, err } from "../utils/response";
import { audit } from "../utils/audit";
import { AuthedRequest } from "../middleware/auth";
import { PLAN_PRICES, PLAN_QUOTAS } from "../config/plans";
import { signAccess } from "../utils/jwt";
import { platformAudit } from "../utils/platform-audit";

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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [orgs, users, members, staff, subscriptions, recentOrgs, activeOrgs7d] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { deletedAt: null, isPlatformAdmin: false } }),
    prisma.member.count({ where: { deletedAt: null, organization: { deletedAt: null } } }),
    prisma.teamMembership.count({ where: { deletedAt: null, organization: { deletedAt: null } } }),
    prisma.subscription.findMany({
      select: {
        organizationId: true,
        plan: true,
        status: true,
        quotaStaff: true,
        quotaMembers: true,
        trialEndsAt: true,
        updatedAt: true,
      },
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
    // Distinct brands that did anything in the last seven days.
    prisma.auditLog.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: weekAgo } },
      _count: { _all: true },
    }),
  ]);

  const subs = latestByOrg(subscriptions);
  const active = orgs.filter((org) => org.status === "active");
  const byPlan = { STARTER: 0, GROWTH: 0, SCALE: 0 };
  for (const org of orgs) byPlan[org.plan] += 1;

  const paying = active.filter((org) => subs.get(org.id)?.status === "ACTIVE");
  const mrr = paying.reduce((sum, org) => sum + PLAN_PRICES[org.plan], 0);
  const trialRows = [...subs.values()].filter((sub) => sub.status === "TRIAL");
  const trialing = orgs.filter((org) => subs.get(org.id)?.status === "TRIAL").length;
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const trialsEnding7d = trialRows.filter(
    (sub) => sub.trialEndsAt && sub.trialEndsAt >= new Date() && sub.trialEndsAt <= inSevenDays,
  ).length;
  const trialsOverdue = trialRows.filter((sub) => sub.trialEndsAt && sub.trialEndsAt < new Date()).length;
  const churned30d = [...subs.values()].filter(
    (sub) => (sub.status === "CANCELLED" || sub.status === "EXPIRED") && sub.updatedAt >= since,
  ).length;
  const trialConversion = trialing + paying.length > 0 ? Math.round((paying.length / (trialing + paying.length)) * 100) : 0;
  const arpu = paying.length > 0 ? Math.round(mrr / paying.length) : 0;

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
      arpu,
      trialConversion,
      trialsEnding7d,
      trialsOverdue,
      churned30d,
      activeOrganizations7d: activeOrgs7d.length,
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
      select: {
        organizationId: true,
        status: true,
        quotaStaff: true,
        quotaMembers: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
      },
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
        trialEndsAt: sub?.trialEndsAt ?? null,
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
  await platformAudit({
    actorUserId: req.userId!,
    action: "organization.update",
    organizationId: before.id,
    metadata: {
      before: { plan: before.plan, status: before.status },
      after: parsed.data,
    },
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
      isActive: true,
      lastLoginAt: true,
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


/** Extend (or restart) a free trial from the current end date. */
router.post("/organizations/:id/trial", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "Organization not found", 404);
  }
  const parsed = z.object({ days: z.number().int().min(1).max(90) }).safeParse(req.body);
  if (!parsed.success) return err(res, "validation_error", "days must be 1-90", 400, "days");

  const org = await prisma.organization.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, name: true, plan: true },
  });
  if (!org) return err(res, "not_found", "Organization not found", 404);

  const existing = await prisma.subscription.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const base = existing?.trialEndsAt && existing.trialEndsAt > now ? existing.trialEndsAt : now;
  const trialEndsAt = new Date(base.getTime() + parsed.data.days * 24 * 60 * 60 * 1000);

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: "TRIAL", trialEndsAt },
      })
    : await prisma.subscription.create({
        data: {
          organizationId: org.id,
          plan: org.plan,
          status: "TRIAL",
          trialEndsAt,
          ...PLAN_QUOTAS[org.plan],
        },
      });

  await audit({
    orgId: org.id,
    userId: req.userId,
    action: "platform.trial_extended",
    entityType: "subscription",
    entityId: subscription.id,
    oldValues: { trialEndsAt: existing?.trialEndsAt ?? null, status: existing?.status ?? null },
    newValues: { trialEndsAt, days: parsed.data.days },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  await platformAudit({
    actorUserId: req.userId!,
    action: "organization.trial_extended",
    organizationId: org.id,
    metadata: { days: parsed.data.days, trialEndsAt, previous: existing?.trialEndsAt ?? null },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, { trialEndsAt, status: subscription.status });
});

const userUpdateSchema = z
  .object({ isActive: z.boolean().optional(), isPlatformAdmin: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });

/** Disable an account, revoke its sessions, or change vendor access. */
router.patch("/users/:id", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "User not found", 404);
  }
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return err(res, "validation_error", "Invalid user update", 400);

  const target = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, name: true, email: true, isActive: true, isPlatformAdmin: true },
  });
  if (!target) return err(res, "not_found", "User not found", 404);

  if (target.id === req.userId && (parsed.data.isActive === false || parsed.data.isPlatformAdmin === false)) {
    return err(res, "forbidden", "You cannot disable or demote your own account", 403);
  }

  const removesPlatformAccess =
    target.isPlatformAdmin &&
    (parsed.data.isPlatformAdmin === false || parsed.data.isActive === false);
  if (removesPlatformAccess) {
    const others = await prisma.user.count({
      where: {
        id: { not: target.id },
        isPlatformAdmin: true,
        isActive: true,
        deletedAt: null,
      },
    });
    if (others === 0) {
      return err(res, "last_platform_admin", "At least one active platform admin must remain", 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, isActive: true, isPlatformAdmin: true },
  });

  // A disabled or demoted operator must not keep a usable refresh token.
  if (parsed.data.isActive === false || parsed.data.isPlatformAdmin === false) {
    await prisma.refreshToken.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await platformAudit({
    actorUserId: req.userId!,
    action: "user.update",
    targetUserId: target.id,
    metadata: {
      before: { isActive: target.isActive, isPlatformAdmin: target.isPlatformAdmin },
      after: parsed.data,
    },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, updated);
});

/** Sign a person out everywhere without changing their password. */
router.post("/users/:id/revoke-sessions", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "User not found", 404);
  }
  const target = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!target) return err(res, "not_found", "User not found", 404);

  const result = await prisma.refreshToken.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await platformAudit({
    actorUserId: req.userId!,
    action: "user.sessions_revoked",
    targetUserId: target.id,
    metadata: { sessions: result.count },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, { revoked: result.count });
});

/**
 * Start a read-only support session for one brand.
 *
 * The token carries `impersonating`, so tenant middleware re-checks the platform
 * flag, forces owner-level reads and rejects every write. Nothing about the
 * gym's owner account or password is borrowed.
 */
router.post("/organizations/:id/impersonate", async (req: AuthedRequest, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return err(res, "not_found", "Organization not found", 404);
  }
  const parsed = z
    .object({ reason: z.string().trim().min(5).max(300) })
    .safeParse(req.body);
  if (!parsed.success) {
    return err(res, "validation_error", "A reason of at least 5 characters is required", 400, "reason");
  }
  const org = await prisma.organization.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!org) return err(res, "not_found", "Organization not found", 404);
  if (org.status !== "active") {
    return err(res, "org_suspended", "Reactivate the brand before viewing it", 403);
  }

  const accessToken = signAccess({
    userId: req.userId!,
    orgId: org.id,
    impersonating: true,
    impersonatedBy: req.userId!,
    reason: parsed.data.reason,
  });

  await platformAudit({
    actorUserId: req.userId!,
    action: "impersonation.start",
    organizationId: org.id,
    metadata: { reason: parsed.data.reason, mode: "read-only" },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  await audit({
    orgId: org.id,
    userId: req.userId,
    action: "platform.impersonation_start",
    entityType: "organization",
    entityId: org.id,
    newValues: { reason: parsed.data.reason, mode: "read-only" },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, {
    accessToken,
    organization: { id: org.id, name: org.name, slug: org.slug },
    reason: parsed.data.reason,
    readOnly: true,
  });
});

/** Vendor audit trail, newest first. */
router.get("/audit", async (req: AuthedRequest, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const [items, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
    }),
    prisma.platformAuditLog.count(),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) });
});

/** Flat CSV for finance/ops; exports are themselves audited. */
router.get("/export/gyms.csv", async (req: AuthedRequest, res) => {
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      slug: true,
      plan: true,
      status: true,
      createdAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, quotaStaff: true, quotaMembers: true, trialEndsAt: true, currentPeriodEnd: true },
      },
      _count: { select: { members: true, team: true } },
    },
  });

  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Gym", "Slug", "Plan", "Brand status", "Subscription", "Staff", "Staff quota", "Members", "Member quota", "Trial ends", "Period ends", "Created"];
  const lines = orgs.map((org) => {
    const sub = org.subscriptions[0];
    return [
      org.name,
      org.slug,
      org.plan,
      org.status,
      sub?.status ?? "TRIAL",
      org._count.team,
      sub?.quotaStaff ?? "",
      org._count.members,
      sub?.quotaMembers ?? "",
      sub?.trialEndsAt?.toISOString() ?? "",
      sub?.currentPeriodEnd?.toISOString() ?? "",
      org.createdAt.toISOString(),
    ]
      .map(escape)
      .join(",");
  });

  await platformAudit({
    actorUserId: req.userId!,
    action: "export.gyms_csv",
    metadata: { rows: orgs.length },
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="gymflow-gyms.csv"');
  return res.send([header.map(escape).join(","), ...lines].join("\n"));
});

export default router;
