import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { authenticate, resolveTenant, requireOrg, requirePermission, requirePlatformAdmin } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/error";
import { auditMiddleware } from "./middleware/audit";
import { validate } from "./middleware/validation";
import authRoutes from "./routes/auth";
import orgRoutes from "./routes/organizations";
import userRoutes from "./routes/users";
import roleRoutes from "./routes/roles";
import invitationRoutes from "./routes/invitations";
import platformRoutes from "./routes/platform";
import prospectRoutes from "./routes/prospects";
import memberRoutes from "./routes/members";
import locationRoutes from "./routes/locations";
import planRoutes from "./routes/plans";
import checkInRoutes from "./routes/checkins";
import pipelineRoutes from "./routes/pipelines";
import stageRoutes from "./routes/stages";
import membershipRoutes from "./routes/memberships";
import ticketRoutes from "./routes/tickets";
import taskRoutes from "./routes/tasks";
import activityRoutes from "./routes/activities";
import notificationRoutes from "./routes/notifications";
import workflowRoutes from "./routes/workflows";
import reportRoutes from "./routes/reports";
import subscriptionRoutes from "./routes/subscriptions";
import adminRoutes from "./routes/admin";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "gymflow-api" }));

  app.use(auditMiddleware);

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/organizations", authenticate, resolveTenant, requireOrg, orgRoutes);
  app.use("/api/v1/users", authenticate, resolveTenant, requireOrg, userRoutes);
  app.use("/api/v1/roles", authenticate, resolveTenant, requireOrg, roleRoutes);
  app.use("/api/v1/invitations", authenticate, resolveTenant, requireOrg, invitationRoutes);
  app.use("/api/v1/prospects", authenticate, resolveTenant, requireOrg, prospectRoutes);
  app.use("/api/v1/members", authenticate, resolveTenant, requireOrg, memberRoutes);
  app.use("/api/v1/locations", authenticate, resolveTenant, requireOrg, locationRoutes);
  app.use("/api/v1/plans", authenticate, resolveTenant, requireOrg, planRoutes);
  app.use("/api/v1/checkins", authenticate, resolveTenant, requireOrg, checkInRoutes);
  app.use("/api/v1/pipelines", authenticate, resolveTenant, requireOrg, pipelineRoutes);
  app.use("/api/v1/stages", authenticate, resolveTenant, requireOrg, stageRoutes);
  app.use("/api/v1/memberships", authenticate, resolveTenant, requireOrg, membershipRoutes);
  app.use("/api/v1/tickets", authenticate, resolveTenant, requireOrg, ticketRoutes);
  app.use("/api/v1/tasks", authenticate, resolveTenant, requireOrg, taskRoutes);
  app.use("/api/v1/activities", authenticate, resolveTenant, requireOrg, activityRoutes);
  app.use("/api/v1/notifications", authenticate, resolveTenant, requireOrg, notificationRoutes);
  app.use("/api/v1/workflows", authenticate, resolveTenant, requireOrg, workflowRoutes);
  app.use("/api/v1/reports", authenticate, resolveTenant, requireOrg, reportRoutes);
  app.use("/api/v1/subscriptions", authenticate, resolveTenant, requireOrg, subscriptionRoutes);
  app.use("/api/v1/admin", authenticate, resolveTenant, requireOrg, adminRoutes);
  // Vendor console: no tenant context, platform-admin gate only.
  app.use("/api/v1/platform", authenticate, requirePlatformAdmin, platformRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
