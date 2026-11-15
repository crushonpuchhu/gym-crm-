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
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }
  });
  next();
}
