import { Request, Response, NextFunction } from "express";
import { verifyAccess, verifyRefresh } from "../utils/jwt";
import { err } from "../utils/response";
import { prisma } from "../config/prisma";
import { hasPermission } from "../config/permissions";

export { hasPermission };

export interface AuthedRequest extends Request {
  userId?: string;
  orgId?: string;
  role?: string;
  orgStatus?: string;
  isPlatformAdmin?: boolean;
  memberships?: Array<{ organizationId: string; role: string }>;
}

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const access = req.headers.authorization?.replace("Bearer ", "");
  const refresh = req.cookies?.refresh_token;

  if (access) {
    try {
      const payload = verifyAccess(access);
      req.userId = payload.userId;
      req.orgId = payload.orgId;
      return next();
    } catch {
      // fall through to refresh rotation
    }
  }

  if (refresh) {
    try {
      const payload = verifyRefresh(refresh);
      req.userId = payload.userId;
      // mark for token rotation
      (req as any)._rotateRefresh = true;
      return next();
    } catch {
      return err(res, "auth_invalid", "Invalid or expired session", 401);
    }
  }

  return err(res, "auth_required", "Authentication required", 401);
}

export async function resolveTenant(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) return next();
  try {
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: req.userId, deletedAt: null, organization: { deletedAt: null } },
      select: {
        organizationId: true,
        role: true,
        organization: { select: { status: true } },
      },
    });
    req.memberships = memberships.map((m) => ({ organizationId: m.organizationId, role: m.role }));
    if (!req.orgId && req.memberships[0]) req.orgId = req.memberships[0].organizationId;
    const current = memberships.find((m) => m.organizationId === req.orgId);
    if (current) {
      req.role = current.role;
      req.orgStatus = current.organization.status;
    }
    next();
  } catch {
    next();
  }
}

export function requireOrg(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.orgId) return err(res, "org_required", "No organization context", 400);
  if (!req.memberships?.some((m) => m.organizationId === req.orgId)) {
    return err(res, "forbidden", "Not a member of this organization", 403);
  }
  if (req.orgStatus && req.orgStatus !== "active") {
    return err(res, "org_suspended", "This gym brand is suspended", 403);
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.orgId) return err(res, "org_required", "No organization context", 400);
    const membership = req.memberships?.find((m) => m.organizationId === req.orgId);
    if (!membership) return err(res, "forbidden", "Not a member of this organization", 403);
    if (req.orgStatus && req.orgStatus !== "active") {
      return err(res, "org_suspended", "This gym brand is suspended", 403);
    }
    if (!hasPermission(membership.role, permission)) {
      return err(res, "forbidden", "Insufficient permission", 403);
    }
    next();
  };
}

/**
 * Vendor-side operator gate.
 *
 * Checked against the database rather than a token claim, so revoking platform
 * access takes effect on the next request. Platform admins are deliberately not
 * given tenant routes; this only unlocks `/api/v1/platform`.
 */
export async function requirePlatformAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) return err(res, "auth_required", "Authentication required", 401);
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId, deletedAt: null },
      select: { isPlatformAdmin: true },
    });
    if (!user?.isPlatformAdmin) return err(res, "forbidden", "Platform access only", 403);
    req.isPlatformAdmin = true;
    next();
  } catch {
    return err(res, "forbidden", "Platform access only", 403);
  }
}
