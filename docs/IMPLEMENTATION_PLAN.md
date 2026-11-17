# IMPLEMENTATION PLAN — GYMFLOW MEMBER CRM

Order (dependency-aware):
1. Foundation: repo init, package installs, prisma schema, docker-compose, .env.example
2. Auth + orgs + membership + RBAC (middleware, registration, login, invites)
3. Locations (clubs) + membership plans + prospects (CRUD, search, filter, pagination, conversion, CSV import)
4. Members + memberships + kanban (stages, stage history, weighted value, activation)
5. Tickets + comments + attachments + SLA
6. Tasks + activities + notifications
7. Workflows + background jobs (BullMQ) + email
8. Reports + subscriptions + admin settings + audit logs
9. Frontend: design system + layout + all pages
10. Integration + tests (unit, API, tenant isolation, E2E)
11. Docker/prod readiness + docs

Each module accepted only when frontend + backend + DB + permissions + tests verified.
