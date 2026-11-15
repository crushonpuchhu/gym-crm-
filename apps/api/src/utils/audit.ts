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
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId || "",
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ip,
        userAgent,
      },
    });
  } catch {
    // audit must never break the request
  }
}
