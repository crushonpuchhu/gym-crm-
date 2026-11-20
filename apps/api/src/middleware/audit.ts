import { Request, Response, NextFunction } from "express";
import { audit } from "../utils/audit";

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    if (req.method !== "GET" && res.statusCode < 400) {
      // best-effort audit of mutating requests
      void audit({
        orgId: (req as any).orgId || undefined,
        userId: (req as any).userId || undefined,
        action: `${req.method} ${req.route?.path}`,
        entityType: "request",
        // Support sessions are read-only, so this is normally absent; keep the
        // marker in case a future route opts into delegated writes.
        newValues: (req as any).isImpersonating
          ? { impersonated: true, impersonatorId: (req as any).impersonatorId }
          : undefined,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }
  });
  next();
}
