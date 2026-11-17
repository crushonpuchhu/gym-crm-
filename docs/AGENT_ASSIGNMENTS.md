# AGENT ASSIGNMENTS — GYMFLOW MEMBER CRM

Single-agent session (this instance) acts as Principal Orchestrator and performs all implementation directly. Subagents (cavecrew-builder, explore, cavecrew-reviewer) are used for independent parallel tasks: file scaffolding, code search, diff review.

Responsibilities by module (all owned by orchestrator unless delegated):
- Auth/Orgs/RBAC: backend routes, services, middleware
- Locations/Plans/Prospects: backend + frontend
- Members/Memberships: backend + frontend kanban
- Check-ins + Tickets: backend + frontend
- Tasks/Activities/Notifications: backend + frontend
- Workflows: backend engine + BullMQ
- Reports/Subscriptions/Admin: backend + frontend
- Frontend shell/design system: layout, theme, components
- Testing: unit, API integration, E2E, tenant isolation
- DevOps: Docker, compose, CI, deployment docs

No duplicate agents created. Parallel work only where file ownership does not overlap.
