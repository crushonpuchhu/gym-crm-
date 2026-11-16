# SalesFlow CRM — demo and manual test guide

This guide explains what a CRM is, what this app does with it, and how to test every module against the seeded demo dataset.

## 1. What a CRM is

A CRM (customer relationship management) system is the shared record of everyone who might buy from you, everyone who already did, and everything your team promised them.

Without one, the same facts live in inboxes, spreadsheets, chat threads and people's heads. A rep leaves and the account history leaves with them. A customer emails support and support cannot see the deal that was just signed.

This app solves four concrete problems:

1. **Lost context** — one record per lead, contact, company, deal and ticket, with an activity trail.
2. **Unclear pipeline** — deals sit in stages with a probability, so the forecast is calculated from records instead of guessed in a meeting.
3. **Handoff gaps** — a lead converts into a contact and a deal; a ticket knows its owner, SLA and conversation; tasks and workflows carry the follow-up.
4. **Cross-tenant leakage** — every query is scoped by organization, and roles control administration and internal notes.

## 2. The objects (mental model)

```
Lead ──convert──▶ Contact ──▶ Company
                   │
                   └──▶ Deal ──▶ Pipeline ──▶ Stage (probability, won/lost)
                                     │
                                     └──▶ Deal stage history

Ticket ──▶ Comments (customer-visible / internal)
Task   ──▶ related deal or ticket
Workflow ──▶ trigger + condition + actions ──▶ executions
Activity ──▶ who did what, when, on which record
```

- **Leads** are unqualified interest. They have a source and a score.
- **Contacts** are real people you work with. They belong to an optional company.
- **Companies** group contacts and deals.
- **Deals** are money in motion. A stage gives them a probability; won/lost closes them.
- **Pipelines** group stages. The demo has the default *Sales Pipeline* and a *Renewals 2027* pipeline.
- **Tickets** are support requests with priority, status, owner and SLA clock.
- **Tasks** are follow-ups with an owner and due date.
- **Workflows** are automation rules (assignment, reminders, onboarding).
- **Reports** are read-only aggregations over the same records.

## 3. Pages and where to use them

| Page | Use it for |
| --- | --- |
| `/dashboard` | Volume check: leads, contacts, active deals, open tickets, won revenue, sales by month |
| `/leads` | Capture, filter, score, convert, CSV import |
| `/contacts` | People, company links, ownership |
| `/companies` | Accounts and their contacts/deals |
| `/deals` | Kanban by stage, drag to move, weighted revenue, new deal |
| `/tickets` | Queue, selection, status changes, customer/internal comments |
| `/tasks` | Follow-ups, overdue work, completion |
| `/reports` | Sales by month, leads by source, conversion rate, CSV exports |
| `/workflows` | Automation rules and execution outcomes |
| `/users` | Members and roles (owner/admin only) |
| `/subscriptions` | Plan and quotas |
| `/settings` | Org preferences |

The marketing site lives at `/`; the app lives under the pages above.

## 4. Seeded demo dataset

Reset anytime:

```bash
npm run db:seed
```

The seed wipes and recreates only the `Demo Corp` organization, so it is safe to rerun.

Volumes:

- 8 users, 8 memberships (one per role)
- 2 pipelines, 11 stages
- 12 companies, 60 contacts
- 90 leads (10 already converted, all sources and statuses represented)
- 62 deals (48 sales + 14 renewals; 10 won, 5 lost in sales; 3 renewed, 2 churned)
- 30 tickets, 65+ comments, statuses from NEW to CLOSED
- 32 tasks (6 overdue, mixed statuses)
- 80 activities, 28 notifications, 5 workflows (+20 executions), 45 audit log rows

Named fixtures worth finding:

- **Priya Nair** — lead, score 96, Acme Co, owner Jordan Reyes. Good candidate for the conversion test.
- **Acme Co — Enterprise license renewal** style deal — Acme deal already won; use it to inspect won revenue.
- **DEMO-1001** — URGENT, OPEN, unassigned ticket. Use it to test assignment and SLA.
- **Six overdue tasks** — open `/tasks` and look for due dates in the past.
- **Renewals 2027** — second pipeline with its own stages and deals.

## 5. Logins

Password for all accounts: `password123`

| Email | Role | What is gated |
| --- | --- | --- |
| `owner@demo.com` | ORG_OWNER | Full access, including users and audit logs |
| `admin@demo.com` | ORG_ADMIN | Users, pipelines, reports, internal notes, audit logs |
| `manager@demo.com` | SALES_MANAGER | Leads, pipelines, reports |
| `rep@demo.com` | SALES_REP | Lead management; no administration |
| `rep2@demo.com` | SALES_REP | Same, different record ownership |
| `supportlead@demo.com` | SUPPORT_MANAGER | Tickets and internal notes |
| `support@demo.com` | SUPPORT_AGENT | Tickets; internal notes hidden |
| `viewer@demo.com` | VIEWER | Read-only intent; no admin permissions |

## 6. Manual test paths

Run them in order; each one is short and observable.

### A. Dashboard sanity (2 min)

1. Sign in as `owner@demo.com`.
2. Expect: 90 leads, 60 contacts, 62 active deals, 20 open tickets, won revenue ≈ $793,500.
3. Sales-by-month chart shows bars across 7 months.
4. Click **Refresh**; numbers stay stable.

### B. Lead → contact + deal conversion (5 min)

1. Go to **Leads**, search `Priya`.
2. Confirm score 96, status not CONVERTED.
3. Click the convert icon (⇄) on her row.
4. Expect: her status becomes CONVERTED; new contact and a "Deal from Priya Nair" deal appear.
5. Check **Contacts** and **Pipeline** for the new records.
6. Try converting an already-converted lead: API returns `409 Lead already converted` (the UI surfaces the message).

Also test capture: **New lead** with only a name and email. Then run the CSV import with a small file containing `firstName,lastName,email,company,source,status,priority,score,value` rows.

### C. Kanban and forecast (5 min)

1. Go to **Pipeline**; default pipeline selected.
2. Note weighted revenue in the header.
3. Drag a deal from **New** to **Negotiation**.
4. Expect: stage, probability (75%), and weighted revenue update; the deal detail shows a stage-history entry.
5. Drag a deal to **Won**: `wonAt` is set, and it appears in won revenue/reports.
6. Switch the selector to **Renewals 2027**; confirm its own columns and deals.

### D. Reports and export (3 min)

1. Go to **Reports**.
2. Check pipeline value, conversion rate (10/90 = 11.1%), leads-by-source donut (15 per source), sales-by-month.
3. Export leads, deals, contacts and tickets; open each CSV and confirm rows.

### E. Support flow (5 min)

1. Go to **Tickets** as `support@demo.com`.
2. Select **DEMO-1001** (URGENT, OPEN, unassigned).
3. Change status to IN_PROGRESS; add a public reply.
4. Tick **Internal** and add a note: it renders amber, labelled "internal note".
5. Sign out, sign in as `viewer@demo.com`; open the same ticket: internal notes are not returned by the API.
6. Sign in as `owner@demo.com`; the internal note is visible again.
7. Resolve the ticket; `resolvedAt` is set, SLA fields remain visible.

### F. Tasks and notifications (3 min)

1. Go to **Tasks**; find overdue items (due dates before today).
2. Mark one COMPLETED.
3. Open the bell in the header; unread notifications are seeded.
4. Mark all read; the badge clears after refresh.

### G. Workflows (2 min)

1. Go to **Workflows**. Five rules are listed with their trigger, action count and an Active/Paused badge.
2. Toggle one to Paused; reload and confirm the state persists.
3. The list has no detail view. Inspect conditions and execution history through the API:

```bash
# list rules with their condition and actions
curl -s http://localhost:4000/api/v1/workflows -H "Authorization: Bearer $TOKEN"

# execution history for one workflow (replace ID with a rule id)
curl -s http://localhost:4000/api/v1/workflows/<ID>/executions -H "Authorization: Bearer $TOKEN"
```

Expect four executions per rule, with some `status: "failed"` and `error: "Webhook returned 502"`. Create a rule from the page to see the form fields (name, trigger, action type, action value).

### H. Roles and isolation (4 min)

1. As `viewer@demo.com`, call the user list from the browser console:

```js
await fetch("/api/v1/users", { credentials: "include" }).then((r) => r.status);
// 403 — no manage_users permission
```

2. As `owner@demo.com`, the same call returns `200` and the member list.
3. Sign in as `support@demo.com`; confirm `/users` is unusable from the API even if the page is opened directly.
4. Tenant isolation is covered by `bash apps/api/tests/tenant-isolation.sh`.

Role enforcement today is strongest on users/org administration, audit logs and internal ticket comments. Other CRM routes check tenant membership, not fine-grained writes — test accordingly.

## 7. API smoke test (optional)

```bash
# login
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@demo.com","password":"password123"}'

# with the returned accessToken
curl -s http://localhost:4000/api/v1/reports/dashboard \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:4000/api/v1/leads?search=priya" \
  -H "Authorization: Bearer $TOKEN"
```

Full API surface: `docs/API_SPECIFICATION.md`.

## 8. Troubleshooting

- **401/blank app after reseed** — old refresh tokens are gone with the deleted users. Sign in again.
- **Ports in use** — web `3000`, API `4000`, Postgres `5432`, Redis `6379`.
- **Seed says compiled file missing** — run `npm run build --workspace=packages/db` (or `npm run db:seed`, which expects `dist/seed.js`).
- **Reports look empty** — check you are in the `Demo Corp` organization; every query is tenant-scoped.
