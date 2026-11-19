import { randomBytes } from "node:crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { audit } from "./audit";
import { canAssignRole } from "../config/permissions";
import { seatBlockedReason } from "./seats";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function inviteUrl(token: string) {
  return `${env.WEB_URL.replace(/\/$/, "")}/invite/${token}`;
}

export class InviteError extends Error {
  code: string;
  field?: string;
  status: number;
  constructor(code: string, message: string, status = 400, field?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

/**
 * Create (or replace) a pending invitation for one email address.
 *
 * Guards, in order: actor may grant the role, the brand is active, the email is
 * not already staff here, and a seat is free. Re-inviting the same address
 * rotates the token and expiry instead of stacking duplicates.
 */
export async function createInvitation({
  orgId,
  actorId,
  actorRole,
  email,
  role,
  ip,
  userAgent,
}: {
  orgId: string;
  actorId: string;
  actorRole?: string;
  email: string;
  role: string;
  ip?: string;
  userAgent?: string;
}) {
  const normalized = email.trim().toLowerCase();

  if (!canAssignRole(actorRole, role)) {
    throw new InviteError("forbidden", "You cannot grant a role above your own", 403, "role");
  }

  const organization = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { id: true, name: true, status: true },
  });
  if (!organization) throw new InviteError("not_found", "Organization not found", 404);
  if (organization.status !== "active") {
    throw new InviteError("org_suspended", "This gym brand is suspended", 403);
  }

  const user = await prisma.user.findFirst({ where: { email: normalized, deletedAt: null }, select: { id: true } });
  if (user) {
    const membership = await prisma.teamMembership.findFirst({
      where: { userId: user.id, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (membership) {
      throw new InviteError("already_member", "That email is already on your staff list", 409, "email");
    }
  }

  const blocked = await seatBlockedReason(orgId);
  if (blocked) throw new InviteError("seat_limit", blocked, 402);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invitation = await prisma.$transaction(async (tx) => {
    // A re-invite supersedes the earlier pending link for the same address.
    await tx.invitation.deleteMany({
      where: { organizationId: orgId, email: normalized, acceptedAt: null },
    });
    return tx.invitation.create({
      data: { organizationId: orgId, email: normalized, role: role as any, token, expiresAt, createdById: actorId },
    });
  });

  await audit({
    orgId,
    userId: actorId,
    action: "user.invite",
    entityType: "invitation",
    entityId: invitation.id,
    newValues: { email: normalized, role },
    ip,
    userAgent,
  });

  // Dev has no mail transport wired up, so the link is logged for the operator.
  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[invite] ${organization.name} → ${normalized} (${role}): ${inviteUrl(token)}`);
  }

  return { invitation, organization, inviteUrl: inviteUrl(token) };
}
