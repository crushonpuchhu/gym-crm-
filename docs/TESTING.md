# TESTING — GYMFLOW MEMBER CRM

- Unit tests: vitest (services, utilities)
- API integration: supertest against test database
- Tenant isolation: cross-org access attempts must return 403/404
- Role permission: each role endpoint matrix
- E2E: playwright (register, login, prospect → member, membership kanban, check-in, ticket lifecycle)
- Password: bcrypt compare, reset flow
- Run: `npm test` (root), per-package scripts

Coverage target: 80% on services and repositories.
