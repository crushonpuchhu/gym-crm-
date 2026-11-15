# INTEGRATION STATUS — SALESFLOW CRM

- Auth <-> Orgs: DONE — register creates user+org+membership+subscription in one transaction
- Orgs <-> RBAC middleware: DONE — resolveTenant + requireOrg; org context server-side
- Leads <-> Contacts/Companies/Deals: DONE — lead.convert creates contact+deal, sets CONVERTED, links FKs, preserves activity
- Pipelines/Stages <-> Deals <-> Kanban frontend: DONE — drag-drop PATCH -> DealStageHistory
- Tickets <-> Comments <-> SLA fields: DONE
- Tasks/Activities: DONE — tasks CRUD; activities logged on lead create
- Notifications: PARTIAL — list/mark read works; producers (BullMQ) not built
- Workflows: PARTIAL — CRUD + manual test-run; execution engine not built
- Reports <-> DB: DONE — dashboard, sales-by-month, leads-by-source, conversion live
- Subscriptions <-> entitlements: DONE server-side quotas
- Frontend <-> API via Next rewrites: DONE — /api/v1/* proxied; auth via httpOnly refresh cookie
- Audit logging: DONE (best-effort, non-blocking)
