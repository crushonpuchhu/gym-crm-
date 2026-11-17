# GymFlow — Member CRM for gym brands

Multi-tenant gym CRM. One organization is one gym brand; each brand owns many clubs (locations), staff, membership plans, members, membership contracts, check-ins, support tickets and reports.

**Modules:** auth, organizations, RBAC, prospects (enquiries, tours, trials), members, locations (clubs), membership plans, membership pipeline (Kanban contracts), check-ins, tickets (member support, SLA, internal notes), tasks, activities, notifications, workflow automation, reports, subscriptions, audit logs.

## Stack
- **apps/web** — Next.js 14 (App Router), React 18, Tailwind CSS, Recharts, @dnd-kit
- **apps/api** — Node.js 22, TypeScript, Express, Prisma (PostgreSQL), JWT (access+refresh), bcrypt, rate limiting
- **packages/db** — Prisma schema, migration, gym demo seed
- **packages/shared** — Zod contracts
- **Infra** — Docker, Docker Compose, PostgreSQL (primary), Redis (optional queues)

## Quick start
```bash
cp .env.example .env            # placeholders are fine for dev
docker compose up -d            # postgres + redis
npm install
cd packages/db && npx prisma migrate deploy && cd ../..
npm run build --workspace=packages/db
npm run db:seed                 # builds and seeds the Iron Atlas demo brand
npm run dev:api                 # API on :4000
npm run dev:web                 # Web on :3000 (proxies /api/v1 to :4000)
```

The seed deletes and recreates the `iron-atlas` organization, so it is safe to rerun. It creates 8 staff, 3 clubs, 6 plans, 120 members, 90 prospects, 186 membership contracts, 450 check-ins, 30 tickets, 32 tasks, 80 activities, 28 notifications, 5 workflows and 45 audit events.

Demo brand: **Iron Atlas Fitness** (`iron-atlas`), clubs Downtown / Riverside / Northgate. Password for every account is `password123`:

| Email | Role |
| --- | --- |
| `owner@demo.com` | ORG_OWNER |
| `admin@demo.com` | ORG_ADMIN |
| `manager@demo.com` | CLUB_MANAGER |
| `rep@demo.com` | MEMBERSHIP_ADVISOR |
| `rep2@demo.com` | MEMBERSHIP_ADVISOR |
| `supportlead@demo.com` | SUPPORT_MANAGER |
| `support@demo.com` | SUPPORT_AGENT |
| `viewer@demo.com` | VIEWER |

New to the model? Read [`DEMO_GUIDE.md`](DEMO_GUIDE.md) — object definitions, page map, seeded fixtures and guided test paths.

## Object model in one line each
- **Organization** — a gym brand (tenant). Everything below is scoped to it.
- **Location** — one club or branch. Owns capacity, opening hours, members, check-ins.
- **MembershipPlan** — a sellable product (day pass, monthly, annual, PT pack) with price and billing cycle.
- **Prospect** — an enquiry, guest pass or trial that has not joined yet. Converts into a member + opening contract.
- **Member** — the customer record: contact details, home club, goal, status.
- **Membership** — a contract in the pipeline (Enquiry → Tour → Trial → Offer → Joined). Winning a stage activates the member and the contract.
- **CheckIn** — one entry at a club via QR, app or front desk. Drives attendance and retention.
- **Ticket** — member support issue (billing, equipment, class booking, access, cleanliness, staff).
- **Subscription** — GymFlow's own plan for the brand: STARTER / GROWTH / SCALE with member and staff quotas.

## Docs
See `docs/` — ARCHITECTURE, DATABASE_DESIGN, API_SPECIFICATION, SECURITY, DEPLOYMENT, TESTING.

## Tests
```bash
npm test                                    # vitest (apps/api/tests)
bash apps/api/tests/tenant-isolation.sh     # cross-tenant access check
```

## Known limitations
- Email, S3 attachments, and Redis queues are env-gated; live integrations await credentials. Surfaces are stubbed and safe.
- Payments: Stripe test-mode abstraction only; **no real charges are ever initiated**.
- Socket.IO real-time is out of scope for the current milestone; notifications poll on page load.
- Class scheduling, door/turnstile hardware and direct-debit mandates are out of scope; check-ins are logged through the API.
