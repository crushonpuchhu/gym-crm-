# PROJECT AUDIT — GYMFLOW MEMBER CRM

## Repository
- Path: /media/mittal/New Volume/WEB/a2
- Monorepo: `apps/web`, `apps/api`, `packages/db`, `packages/shared`
- Product: GymFlow — multi-tenant gym member CRM (brands → clubs → members)

## Runtime tooling
- Node.js: v22
- npm workspaces
- Next.js 14 (App Router) on `:3000`
- Express 4 + Prisma + PostgreSQL on `:4000`
- Docker Compose for Postgres / Redis / MinIO

## Domain coverage
- Auth, organizations (gym brands), staff roles and permissions
- Clubs (`locations`), membership plans
- Prospects → member conversion, CSV import
- Members, membership contracts, Kanban pipeline, stage history
- Check-ins (attendance) and retention reporting
- Tickets with categories, SLA fields and internal comments
- Tasks, activities, notifications, workflow automation
- Reports: KPIs, joins by month, prospects by source, conversion, retention, 30-day attendance, advisor MRR, CSV export
- Subscriptions (STARTER / GROWTH / SCALE) with member and staff quotas
- Audit logs

## Verification
- `npm run build --workspace=apps/web` — 19 routes, 0 type errors
- `npx tsc -p apps/api/tsconfig.json --noEmit` — clean
- `npm test` — vitest 5/5
- `bash apps/api/tests/tenant-isolation.sh` — PASS (prospects, memberships, check-ins)
- Seed run — 8 staff, 3 clubs, 6 plans, 120 members, 90 prospects, 186 contracts, 450 check-ins, 30 tickets

## Risk report
- Payment provider is a test-mode adapter; no real charges are initiated.
- Email, S3 attachments and Redis queues are env-gated; nothing is sent without credentials.
- Class scheduling, turnstile hardware and direct-debit mandates are out of scope; check-ins are logged through the API.
- Real-time notifications are polled on page load; Socket.IO is out of scope for this milestone.
- Role enforcement is strong on staff/org administration, audit logs and internal notes; other gym routes enforce tenant scope rather than fine-grained writes.
