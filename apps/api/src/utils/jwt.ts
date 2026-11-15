import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function signAccess(payload: object) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TTL_MS });
}

export function signRefresh(payload: object) {
  return jwt.sign(payload, env.REFRESH_SECRET, { expiresIn: env.REFRESH_TTL_MS });
}

export function verifyAccess(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string; orgId?: string };
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, env.REFRESH_SECRET) as { userId: string };
}
