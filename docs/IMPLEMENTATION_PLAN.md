# IMPLEMENTATION PLAN — SALESFLOW CRM

Order (dependency-aware):
1. Foundation: repo init, package installs, prisma schema, docker-compose, .env.example
2. Auth + orgs + membership + RBAC (middleware, registration, login, invites)
3. Leads + contacts + companies (CRUD, search, filter, pagination, conversion)
4. Pipelines + deals + kanban (stages, stage history, weighted revenue)
5. Tickets + comments + attachments + SLA
6. Tasks + activities + notifications
7. Workflows + background jobs (BullMQ) + email
8. Reports + subscriptions + admin settings + audit logs
9. Frontend: design system + layout + all pages
10. Integration + tests (unit, API, tenant isolation, E2E)
11. Docker/prod readiness + docs

Each module accepted only when frontend + backend + DB + permissions + tests verified.
