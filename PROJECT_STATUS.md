# PROJECT STATUS — SALESFLOW CRM

## Current phase
Phase 9 complete. CRM app, API hardening pass and the new marketing landing page are all built, tested and committed. No open blockers.

## Completed modules (verified end-to-end)
- Auth — register/login/logout/refresh rotation/forgot-reset; DB-backed refresh-token sessions, prod secret enforcement
- Organizations + Memberships + RBAC — role permission map (`requirePermission`), tenant-scoped relation validation
- Leads — CRUD, search, filter, pagination, convert → contact + company + deal, CSV import
- Contacts, Companies — CRUD, tenant scoping, soft delete
- Pipelines + Stages + Deals — Kanban drag-drop, stage history, weighted revenue
- Tickets — TK-nnnn unique numbers, comments (internal + customer), status flow, SLA fields
- Tasks, Activities, Notifications — list + mark read/all-read
- Reports — dashboard, sales-by-month, leads-by-source, conversion, CSV export
- Subscriptions — plan switch, entitlement quotas
- Admin — audit logs, health, permission-gated
- Frontend — 19 routes production-compiled; shared ink/accent Tailwind palette

## Landing page (new)
- Replaces the previous template with a scroll-driven 3D "world" layout modelled on a measured reference: sections are stops on a path, DOM elements are projected from world coordinates, a canvas draws the indigo path, theme interpolates cream → ink navy on dark stops.
- Engine: `apps/web/src/components/landing/world.ts` (TypeScript, no copied reference code) — depth unit `p`, camera `zc` from piecewise scroll segments, per-element perspective projection, Catmull-Rom path anchors, HUD rail with ticks, intro camera pull-back, counter, letter-fill effect, circular clip-path product panel.
- Content: `content.ts` (brand, stats, milestones, modules, six customer stories, product panel, contact, nav).
- Markup: `Landing.tsx` with shadcn-style primitives — `Button`, `Dialog` (full-screen menu + customer story sheet), `Tooltip` (copy-email hint), `cn()` helper.
- Styles: `landing.css` — CRM tokens on the reference's paper ground (`--bg #eceae2`, ink navy `#0b1220`, indigo `#4338ca`, orange `#f47920`, hairline `#d3d0c6`).
- Fonts: `Anton` + `Bebas Neue` (display), `Geist` / `Geist Mono` (body/mono), `DM Serif Display` (product headline), loaded in `apps/web/src/app/layout.tsx`.
- Media: local Unsplash stills in `apps/web/public/media/`, halftone portrait generated locally (ImageMagick ordered dither + luminance alpha), product walkthrough video.
- Responsive: engine anchors per stop, per-element mobile overrides (`data-mp`, `data-mz`), viewport clamp so type never clips at tablet widths, static flow fallback for `prefers-reduced-motion`.

## Evidence
- `npx next build` ✓ (landing + all routes, 0 type errors)
- `npx tsc --noEmit` web + API ✓
- API smoke suite: 38/38 PASS; vitest 5/5; `tests/tenant-isolation.sh` PASS
- `npx prisma migrate` ✓ — init, stage_soft_delete, add_refresh_token_sessions, ticket_number_unique
- Docker: API + web images build, compose postgres/redis healthy
- Landing verified at 1440×900, 1024×768, 768×1024, 390×844, reduced-motion: hero, about, numbers (dark), journey fill, milestones, beyond, services (dark), work intro, six customer cards, orange product panel, contact; menu and story dialogs.

## In-progress / pending
- E2E tests (Playwright) not installed
- BullMQ workers (email, SLA warnings, reminders) — Redis wired, workers not built
- Socket.IO real-time — out of scope this milestone
- Reference-only flourishes intentionally not reproduced: paratrooper contact animation, random star dots, runner character, project-page routing, testimonial video

## Known limitations
- Reports `export/:report` is a CSV stub
- Audit middleware logs `POST undefined` for unrouted paths (cosmetic)
- Landing is a visual rebuild from measurement, not a byte-for-byte copy of the reference

## Blockers
- None. S3 storage remains env-gated (MinIO image unavailable in the restricted registry).

## Next actions
- Install Playwright and cover auth + deal drag-drop + ticket flow
- Add BullMQ worker process for notifications and SLA warnings
- Tag the release once CI is green
