import { prisma } from "../config/prisma";

export async function audit({
  orgId,
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ip,
  userAgent,
}: {
  orgId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  if (!orgId) return; // audit is always tenant-scoped; skip when org unknown
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        ip,
        userAgent,
      },
    });
  } catch {
    // audit must never break the request
  }
}
