# SalesFlow CRM

Multi-tenant commercial CRM + sales platform. Inspired by Salesforce, HubSpot, Zendesk — original implementation, not derived from their source.

**Modules:** auth, organizations, RBAC, leads, contacts, companies, pipelines, deals (Kanban + weighted forecasting), tickets (+ SLA + internal/customer comments), tasks, activities, notifications, workflow automation, reports, subscriptions, audit logs.

## Stack
- **apps/web** — Next.js 14 (App Router), React 18, Tailwind CSS, Recharts, @dnd-kit
- **apps/api** — Node.js 22, TypeScript, Express, Prisma (PostgreSQL), JWT (access+refresh), bcrypt, rate limiting
- **packages/db** — Prisma schema, migrations, seed
- **packages/shared** — Zod contracts
- **Infra** — Docker, Docker Compose, PostgreSQL (primary), Redis (optional queues)

## Quick start
```bash
cp .env.example .env            # placeholders are fine for dev
docker compose up -d            # postgres + redis
npm install
cd packages/db && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run db:seed               # build packages/db first (npm run build --workspace=packages/db)
npm run dev:api                 # API on :4000
npm run dev:web                 # Web on :3000 (proxies /api/v1 to :4000)
```

Demo data resets the `Demo Corp` organization deterministically, so it is safe to rerun. It seeds 8 users, 2 pipelines, 12 companies, 60 contacts, 90 leads (10 converted), 62 deals, 30 tickets, 32 tasks, 80 activities, 5 workflows and audit logs.

All demo accounts use password `password123`:

| Email | Role |
| --- | --- |
| `owner@demo.com` | ORG_OWNER |
| `admin@demo.com` | ORG_ADMIN |
| `manager@demo.com` | SALES_MANAGER |
| `rep@demo.com` | SALES_REP |
| `rep2@demo.com` | SALES_REP |
| `supportlead@demo.com` | SUPPORT_MANAGER |
| `support@demo.com` | SUPPORT_AGENT |
| `viewer@demo.com` | VIEWER |

New to CRM concepts? Read [`DEMO_GUIDE.md`](DEMO_GUIDE.md) — it explains the object model, maps each page to its purpose, lists the seeded fixtures, and gives eight short manual test paths.

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
