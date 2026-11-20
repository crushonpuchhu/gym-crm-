import { prisma } from "../config/prisma";

/**
 * Vendor-side audit trail.
 *
 * Separate from `AuditLog` on purpose: customers can read their own audit log,
 * but they must never see platform operations, support notes, or which operator
 * looked at which brand. Append-only in practice — there is no update/delete
 * helper, and rows are only written after the action succeeded.
 */
export async function platformAudit({
  actorUserId,
  action,
  organizationId,
  targetUserId,
  metadata,
  ip,
  userAgent,
}: {
  actorUserId: string;
  action: string;
  organizationId?: string | null;
  targetUserId?: string | null;
  metadata?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action,
        organizationId: organizationId || null,
        targetUserId: targetUserId || null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ip,
        userAgent,
      },
    });
  } catch {
    // Never break a support action because the trail write failed.
  }
}
