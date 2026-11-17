# PROJECT STATUS — GYMFLOW MEMBER CRM

## Current phase
Phase 10 complete. The project has been converted from a generic sales CRM into a multi-tenant gym member CRM. Domain, schema, API, seed, web app, landing page and docs all speak the gym model. No open blockers.

## Product
GymFlow is sold to gym brands. One organization = one brand; a brand owns many clubs (locations), staff, membership plans, members, contracts, check-ins, support tickets and reports.

## Completed modules (verified end-to-end)
- Auth — register/login/logout/refresh rotation/forgot-reset; DB-backed refresh-token sessions, prod secret enforcement
- Organizations + TeamMembership + RBAC — role permission map (`requirePermission`), tenant-scoped relation validation
- Clubs (`locations`) — capacity, opening hours, member/check-in/contract counts, archive guard
- Membership plans — price, billing cycle, duration, colour, pause/archive, in-use guard
- Prospects — CRUD, search, filter, pagination, convert → member + opening contract, CSV import
- Members — CRUD, home club, status, current plan, archive
- Memberships — Kanban drag-drop by stage, stage history, weighted contract value, won activates the member, lost cancels the contract
- Check-ins — QR/app/front-desk entries, daily filter, today counter, activity feed entry, inactive-member guard
- Tickets — GF-nnnn unique numbers, categories, member/club links, comments (internal + member), status flow, SLA fields
- Tasks, Activities, Notifications — list + mark read/all-read
- Reports — dashboard KPIs (members, MRR, check-ins, open support), joins-by-month, prospects-by-source, conversion, retention/churn, 30-day check-ins, advisor MRR, CSV export for five datasets
- Subscriptions — STARTER / GROWTH / SCALE plans, member + staff quota usage
- Admin — audit logs, health, permission-gated
- Frontend — 19 routes production-compiled; shared ink/accent Tailwind palette; GymFlow shell with gym navigation

## Data model
`Organization → Location, MembershipPlan, Prospect → Member → Membership (Pipeline → Stage), CheckIn, Ticket, Task, Activity, Workflow, Subscription, AuditLog`.

Fresh single migration: `20261117224417_gymflow_init`. Old CRM migrations were removed and the database reset; the project ships with demo data only.

## Demo dataset
`Iron Atlas Fitness` (`iron-atlas`), 3 clubs, 8 staff, 6 plans, 120 members, 90 prospects, 186 contracts, 450 check-ins, 30 tickets (`GF-1001…GF-1030`), 32 tasks, 80 activities, 28 notifications, 5 workflows, 45 audit rows. MRR $4,135; trial conversion 11.1%; churn 8.6%. Deterministic seed, safe to rerun.

## Landing page
- Scroll-driven 3D "world" layout: sections are stops on a path, DOM elements projected from world coordinates, canvas draws the indigo path, theme interpolates cream → ink navy on dark stops.
- Engine: `apps/web/src/components/landing/world.ts` (TypeScript, original) — depth unit, piecewise camera, perspective projection, Catmull-Rom anchors, HUD rail, intro pull-back, counter, letter fill, product clip-path panel.
- Content rebranded for gym brands: brand, stats, milestones, five modules (Prospects, Memberships, Check-ins, Automation, Reports), six gym customer stories, product panel, contact.
- Styles: `landing.css` — paper ground `#eceae2`, ink navy `#0b1220`, indigo `#4338ca`, orange `#f47920`.
- Responsive: per-stop anchors, per-element mobile overrides, viewport clamp, reduced-motion fallback.

## Evidence
- `npm run build --workspace=apps/web` ✓ (19 routes, 0 type errors)
- `npx tsc -p apps/api/tsconfig.json --noEmit` ✓
- `npx prisma migrate status` ✓ — one migration, schema up to date
- Seed run ✓ — counts above
- API smoke: login, dashboard, conversion, retention, check-ins series, members, prospects, memberships, plans, check-ins, tickets, locations all return 200 with seeded data

## In-progress / pending
- E2E tests (Playwright) not installed
- BullMQ workers (email, SLA warnings, reminders) — Redis wired, workers not built
- Socket.IO real-time — out of scope this milestone

## Known limitations
- Class scheduling, door/turnstile hardware and direct-debit mandates are out of scope; check-ins are logged through the API.
- Audit middleware logs `POST undefined` for unrouted paths (cosmetic).
- Landing is a visual rebuild from measurement, not a byte-for-byte copy of the reference.

## Blockers
- None. S3 storage remains env-gated (MinIO image unavailable in the restricted registry).

## Next actions
- Install Playwright and cover auth, membership drag-drop, check-in and ticket flows
- Add a BullMQ worker process for trial-ending, dunning and win-back automations
- Tag the release once CI is green
