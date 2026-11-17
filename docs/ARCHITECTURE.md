# ARCHITECTURE — GYMFLOW MEMBER CRM

## Pattern
Modular monolith. Single deployable API, internally split by domain module. A separate Next.js app consumes it; types are shared through `packages/shared`.

## Tenancy
Multi-tenant by organization. One organization is one gym brand. Every business record carries `organizationId`. Authorization is resolved server-side from the session JWT subject, never trusted from the client. Row-level isolation is enforced in every query via `where: { organizationId }`.

## Domain
- **Organization** — the gym brand (tenant root).
- **Location** — a club or branch with capacity and opening hours.
- **MembershipPlan** — a sellable product with price and billing cycle.
- **Prospect** — an enquiry, tour, guest pass or trial. Converts into a member plus an opening contract.
- **Member** — the customer record, attached to a home club.
- **Membership** — a contract moving through pipeline stages; the won stage activates the contract and the member.
- **CheckIn** — attendance at a club through QR, app or front desk.
- **Ticket** — member support, linked to a member and club.
- Plus: tasks, activities, notifications, workflows, subscriptions, audit logs, RBAC.

## Layers
- API layer (Express routes): validation (Zod), auth middleware, tenant scope, error handling, consistent JSON envelope.
- Service layer: business logic, transaction boundaries, cross-module orchestration (conversion, stage moves, check-in logging).
- Repository layer: Prisma queries, tenant-scoped.
- Domain modules: auth, organizations, team, locations, plans, prospects, members, memberships, check-ins, tickets, tasks, activities, notifications, workflows, reports, subscriptions, audit.

## Communication
- Frontend ↔ API: REST over HTTP, versioned `/api/v1`, proxied through Next.js rewrites.
- API ↔ DB: Prisma (PostgreSQL).
- API ↔ Redis: BullMQ queues (email, reminders, workflow executions), rate limiting.
- API ↔ clients: Socket.IO for real-time updates (optional, env-gated).
- API ↔ email: Resend/SMTP via nodemailer (env-configurable; no real send without credentials).

## Auth
- Register (user + gym brand creation), login, logout, forgot/reset password, email verification.
- JWT access (15 min) + refresh (7 days, HTTP-only Secure SameSite=Strict cookie).
- Password bcrypt (salt 12).
- Session invalidation on password change / deactivation.

## Authorization
- Roles: Super Admin, Org Owner, Org Admin, Club Manager, Membership Advisor, Support Manager, Support Agent, Viewer.
- Permissions: `manage_users`, `manage_prospects`, `manage_members`, `manage_memberships`, `manage_pipelines`, `manage_tickets`, `manage_tickets_internal`, `manage_reports`, `view_audit_logs`.
- Permission checks run server-side; strict gating is applied to staff/org administration, audit logs and internal ticket comments. Other gym routes enforce tenant scope.

## Money and metrics
- `Membership.value` is total contract value; `Membership.monthlyValue` is the recurring amount used for MRR.
- One-time products (day pass, PT pack) contribute 0 to MRR.
- MRR sums `monthlyValue` of ACTIVE contracts only.

## Security
- Helmet, CORS (env-configured origins), CSRF on state-changing cookie endpoints, rate limiting (express-rate-limit + Redis), input validation (Zod), file upload limits, audit logs, secrets in env only.

## Real-time
- Socket.IO namespaces `/notifications` and `/activity`, authenticated via JWT, reconnect-safe. Out of scope for the current milestone; notifications poll on page load.

## Background jobs
- BullMQ: email sending, trial-ending reminders, SLA warnings, dunning, win-back, workflow executions, retry with backoff, idempotency keys.

## Deployment
- Docker Compose: web, api, postgres, redis, minio.
- Health check on `/health`.
