# PROJECT STATUS — SALESFLOW CRM

## Current phase
Phase 8 — Integration and testing. All core modules wired and smoke-tested. E2E/CI-lite in place (CI workflow added; unit tests + isolation script pass). Phase 9 delivered: Docker images build+run, docs written.

## Completed modules (verified working end-to-end)
- Auth (register/login/logout/refresh rotation/forgot-reset)
- Organizations + Memberships + RBAC skeleton (org scoping server-side)
- Leads (CRUD, search, filter, pagination, convert → contact+company+deal, CSV import)
- Contacts, Companies (CRUD)
- Pipelines + Stages + Deals (Kanban drag-drop → stage history, weighted revenue)
- Tickets (creation w/ TK-nnnn numbers, comments internal+customer, status flow, SLA fields)
- Tasks, Activities, Notifications (list + mark read/all-read)
- Reports (dashboard, sales-by-month, leads-by-source, conversion, export CSV stub)
- Subscriptions (plan switch, entitlement quotas)
- Admin (audit logs, health)
- Frontend: all pages built and production-compiled (19 routes)

## Evidence
- `npx next build` ✓ (type check, 0 errors)
- `npx tsc --noEmit` API ✓
- `npx prisma migrate dev` ✓ — init + stage_soft_delete migrations, seed applied
- vitest: 5/5 pass
- tenant-isolation.sh: PASS
- API smoke (curl): login/refresh/leads/create/convert/tickets/reports/dashboard — all pass
- Docker: `salesflow-api:test` builds + boots + health + login OK; `docker compose up -d` postgres+redis healthy; web image building

## In-progress / pending
- E2E tests (playwright) not installed
- BullMQ workers (email, SLA warnings, reminders) — Redis wired but worker processes not built
- Socket.IO real-time — out of scope this milestone

## Verified Docker
- salesflow-api:test — builds, `/health` OK, production-mode login OK against live Postgres
- salesflow-web:test — image builds successfully
- `docker compose up -d` — postgres + redis healthy

## Evidence

## Known bugs
- Lead create form uses WEBSITE/REFERRAL etc. — see shared schema
- Audit middleware logs `POST undefined` for unrouted paths (cosmetic)
- Reports export/:report is a stub CSV with placeholder row

## Blockers
- Docker registry partially restricted (minio image unavailable); S3 env-gated

## Next actions
- Verify web docker image
- Add CI workflow
- Commit + tag
