import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface RefreshPayload {
  userId: string;
  jti: string;
  /** Brand the session was using, preserved across rotation. */
  orgId?: string;
}

/**
 * jsonwebtoken treats numeric `expiresIn` as SECONDS.
 * TTL config is in milliseconds, so convert before signing.
 */
export function signAccess(payload: object) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: Math.floor(env.ACCESS_TTL_MS / 1000) });
}

export function signRefresh(payload: { userId: string; orgId?: string }) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: payload.userId, ...(payload.orgId ? { orgId: payload.orgId } : {}), jti },
    env.REFRESH_SECRET,
    { expiresIn: Math.floor(env.REFRESH_TTL_MS / 1000) },
  );
  return { token, jti };
}

export interface AccessPayload {
  userId: string;
  orgId?: string;
  /** Short-lived support session: platform staff viewing one brand. */
  impersonating?: boolean;
  impersonatedBy?: string;
  reason?: string;
}

export function verifyAccess(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AccessPayload;
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, env.REFRESH_SECRET) as RefreshPayload;
}
