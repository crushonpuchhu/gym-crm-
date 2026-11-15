# ARCHITECTURE — SALESFLOW CRM

## Pattern
Modular monolith. Single deployable unit, internally split by domain module. Frontend and backend are separate apps sharing types via packages/shared.

## Tenancy
Multi-tenant by organization. Every business record carries `organizationId`. Authorization resolved server-side from session JWT subject, never trusted from client. Row-level tenant isolation enforced in every repository query via `where: { organizationId }`.

## Layers
- API layer (Express routes): validation (Zod), auth middleware, tenant scope, error handling, consistent JSON envelope.
- Service layer: business logic, transaction boundaries, cross-module orchestration, event publishing.
- Repository layer: Prisma queries, tenant-scoped.
- Domain modules: auth, organizations, users, leads, contacts, companies, pipelines, deals, tickets, tasks, activities, notifications, workflows, reports, subscriptions, audit.

## Communication
- Frontend <-> API: REST over HTTP, versioned /api/v1.
- API <-> DB: Prisma (PostgreSQL).
- API <-> Redis: BullMQ queues (email, reminders, workflow executions), rate limiting.
- API <-> clients: Socket.IO for real-time notification/activity updates (optional, env-gated).
- API <-> email: Resend/SMTP via nodemailer (env-configurable; no real send unless credentials supplied).

## Auth
- Register (user + org creation), login, logout, forgot/reset password, email verification.
- JWT access (15 min) + refresh (7 days, HTTP-only Secure SameSite=Strict cookie).
- Password bcrypt (salt 12).
- Session invalidation on password change / deactivation.

## Authorization
- Roles: Super Admin, Org Owner, Org Admin, Sales Manager, Sales Rep, Support Manager, Support Agent, Viewer.
- Permissions checked server-side via middleware + service guards.
- Role-level + record-level (owner or assigned) access.

## Security
- Helmet, CORS (env-configured origins), CSRF on state-changing cookie endpoints (double-submit or same-site cookie), rate limiting (express-rate-limit + Redis), input validation (Zod), file upload limits + type restrictions, audit logs, secrets in env only.

## Real-time
- Socket.IO namespace /notifications and /activity, authenticated via JWT query param, reconnect-safe.

## Background jobs
- BullMQ: email sending, follow-up reminders, SLA warnings, workflow executions, retry with backoff, idempotency keys.

## Deployment
- Docker Compose: web, api, postgres, redis, minio.
- Health checks on /health.
