import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { authenticate, resolveTenant, requireOrg } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/error";
import { auditMiddleware } from "./middleware/audit";
import { validate } from "./middleware/validation";
import authRoutes from "./routes/auth";
import orgRoutes from "./routes/organizations";
import userRoutes from "./routes/users";
import roleRoutes from "./routes/roles";
import leadRoutes from "./routes/leads";
import contactRoutes from "./routes/contacts";
import companyRoutes from "./routes/companies";
import pipelineRoutes from "./routes/pipelines";
import stageRoutes from "./routes/stages";
import dealRoutes from "./routes/deals";
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

  app.get("/health", (_req, res) => res.json({ ok: true, service: "salesflow-api" }));

  app.use(auditMiddleware);

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/organizations", authenticate, resolveTenant, requireOrg, orgRoutes);
  app.use("/api/v1/users", authenticate, resolveTenant, requireOrg, userRoutes);
  app.use("/api/v1/roles", authenticate, resolveTenant, requireOrg, roleRoutes);
  app.use("/api/v1/leads", authenticate, resolveTenant, requireOrg, leadRoutes);
  app.use("/api/v1/contacts", authenticate, resolveTenant, requireOrg, contactRoutes);
  app.use("/api/v1/companies", authenticate, resolveTenant, requireOrg, companyRoutes);
  app.use("/api/v1/pipelines", authenticate, resolveTenant, requireOrg, pipelineRoutes);
  app.use("/api/v1/stages", authenticate, resolveTenant, requireOrg, stageRoutes);
  app.use("/api/v1/deals", authenticate, resolveTenant, requireOrg, dealRoutes);
  app.use("/api/v1/tickets", authenticate, resolveTenant, requireOrg, ticketRoutes);
  app.use("/api/v1/tasks", authenticate, resolveTenant, requireOrg, taskRoutes);
  app.use("/api/v1/activities", authenticate, resolveTenant, requireOrg, activityRoutes);
  app.use("/api/v1/notifications", authenticate, resolveTenant, requireOrg, notificationRoutes);
  app.use("/api/v1/workflows", authenticate, resolveTenant, requireOrg, workflowRoutes);
  app.use("/api/v1/reports", authenticate, resolveTenant, requireOrg, reportRoutes);
  app.use("/api/v1/subscriptions", authenticate, resolveTenant, requireOrg, subscriptionRoutes);
  app.use("/api/v1/admin", authenticate, adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
