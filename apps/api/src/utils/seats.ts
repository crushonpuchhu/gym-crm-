import { prisma } from "../config/prisma";

/**
 * Seat accounting for a gym brand.
 *
 * A seat is consumed by an active TeamMembership (an accepted employee) and
 * reserved by an invitation that has not expired yet, so an owner cannot send
 * more invites than the subscription can absorb.
 */
export interface SeatUsage {
  used: number;
  pending: number;
  quota: number;
  available: number;
}

export async function seatUsage(orgId: string): Promise<SeatUsage> {
  const [used, pending, subscription] = await Promise.all([
    prisma.teamMembership.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.invitation.count({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.subscription.findFirst({
      where: { organizationId: orgId },
      select: { quotaStaff: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const quota = subscription?.quotaStaff ?? 5;
  return { used, pending, quota, available: Math.max(quota - used - pending, 0) };
}

/** Returns null when a seat is free, otherwise a human-readable reason. */
export async function seatBlockedReason(orgId: string): Promise<string | null> {
  const usage = await seatUsage(orgId);
  if (usage.available > 0) return null;
  return `Staff seat limit reached (${usage.used} active + ${usage.pending} pending of ${usage.quota}). Upgrade the plan or remove a member first.`;
}
