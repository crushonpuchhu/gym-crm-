# INTEGRATION STATUS — GYMFLOW MEMBER CRM

- Auth <-> Orgs: DONE — register creates user + gym brand + team membership + subscription in one transaction
- Orgs <-> RBAC middleware: DONE — resolveTenant + requireOrg; brand context server-side
- Prospects <-> Members/Memberships: DONE — prospect.convert creates member + opening contract, sets JOINED, links FKs, preserves activity
- Pipelines/Stages <-> Memberships <-> Kanban frontend: DONE — drag-drop PATCH -> MembershipStageHistory; won activates member, lost cancels contract
- Tickets <-> Comments <-> SLA fields: DONE
- Check-ins <-> Members/Locations <-> Reports: DONE — today counter, daily filter, attendance series
- Notifications: PARTIAL — list/mark read works; producers (BullMQ) not built
- Workflows: PARTIAL — CRUD + manual test-run; execution engine not built
- Reports <-> DB: DONE — dashboard, joins-by-month, prospects-by-source, conversion, retention, checkins-by-day, staff-performance, CSV exports
- Subscriptions <-> entitlements: DONE server-side quotas
- Frontend <-> API via Next rewrites: DONE — /api/v1/* proxied; auth via httpOnly refresh cookie
- Audit logging: DONE (best-effort, non-blocking)
