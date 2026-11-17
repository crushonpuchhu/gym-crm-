# GymFlow — demo and manual test guide

This guide explains the gym member model, what each page does, and how to test every module against the seeded demo brand.

## 1. What GymFlow is

GymFlow is a member CRM for gym brands. It holds the whole member lifecycle in one place: the enquiry at the front desk, the tour, the trial, the contract, the monthly payment, the check-in at 6am, the support ticket about a broken treadmill, and the retention number the owner reads on Monday.

Without one, the same facts live in a booking sheet, a billing provider, a turnstile log and somebody's memory. A member cancels and nobody can say whether they stopped attending three weeks earlier.

GymFlow solves four concrete problems:

1. **Lost context** — one record per prospect, member, contract and ticket, with an activity trail.
2. **Unclear join pipeline** — contracts sit in stages with a probability, so forecast comes from records, not a meeting.
3. **Handoff gaps** — a prospect converts into a member plus an opening contract; the front desk, advisors and support see the same person.
4. **Cross-tenant leakage** — every query is scoped by gym brand, and roles control administration and internal notes.

## 2. The objects (mental model)

```
Organization (gym brand)
└── Location (club)
    ├── MembershipPlan (product catalogue)
    ├── Prospect ──convert──▶ Member ──▶ Membership (contract)
    │                        │              │
    │                        │              └──▶ Pipeline ──▶ Stage (probability, won/lost)
    │                        └──▶ CheckIn (QR / app / front desk)
    └── Ticket ──▶ Comments (member-visible / internal)

Task      ──▶ related membership or ticket
Workflow  ──▶ trigger + condition + actions ──▶ executions
Activity  ──▶ who did what, when, on which record
```

- **Organization** is the tenant: one gym brand.
- **Location** is a club or branch. It has a capacity and opening hours.
- **MembershipPlan** is a sellable product: day pass, monthly, annual, PT pack. Price + billing cycle.
- **Prospect** is unqualified interest: walk-in, website, Instagram, referral. Has a source, score and goal.
- **Member** is the customer. Home club, goal, status (TRIAL, ACTIVE, PAUSED, CANCELLED, EXPIRED).
- **Membership** is a contract in motion. A stage gives it a probability; the won stage activates the contract and marks the member ACTIVE.
- **CheckIn** is one entry at a club. Drives attendance and retention reporting.
- **Tickets** are member support: billing, equipment, class booking, access, cleanliness, staff.
- **Tasks** are follow-ups with an owner and due date.
- **Workflows** are automation rules (trial follow-up, dunning, win-back).
- **Reports** are read-only aggregations over the same records.

## 3. Pages and where to use them

| Page | Use it for |
| --- | --- |
| `/dashboard` | Volume check: active members, MRR, check-ins today, open support, joins by month, 14-day traffic |
| `/prospects` | Capture enquiries, filter, convert to member, CSV import |
| `/members` | Member list, home club, current plan, status |
| `/memberships` | Kanban of contracts by stage, drag to move, weighted value, open-only toggle |
| `/plans` | Plan catalogue, price, billing cycle, pause/archive |
| `/checkins` | Daily attendance, log a check-in, method and duration |
| `/locations` | Clubs, capacity, opening hours, member and check-in counts |
| `/tickets` | Support queue, selection, status changes, member/internal comments, categories |
| `/tasks` | Follow-ups, overdue work, completion |
| `/reports` | Joins by month, prospects by source, conversion, retention/churn, 30-day traffic, advisor MRR, CSV exports |
| `/workflows` | Automation rules and execution outcomes |
| `/users` | Staff and roles (owner/admin only) |
| `/subscriptions` | GymFlow plan, member/staff quota usage |
| `/settings` | Brand profile and audit trail |

The marketing site lives at `/`; the app lives under the pages above.

## 4. Seeded demo dataset

Reset anytime:

```bash
npm run build --workspace=packages/db
npm run db:seed
```

The seed deletes and recreates only the `iron-atlas` organization, so it is safe to rerun.

Brand: **Iron Atlas Fitness** (`iron-atlas`), timezone `America/Chicago`.

Volumes:

- 8 staff accounts, one per role
- 3 clubs: Downtown (320 capacity), Riverside (240), Northgate (180)
- 6 plans: Day Pass $25, Starter Monthly $39, Unlimited Monthly $69, Annual Unlimited $690, Student Monthly $29, PT Pack $480
- 2 pipelines: *New Memberships* (Enquiry → Tour booked → Trial → Offer sent → Joined / Lost) and *Renewals 2027*
- 120 members: 88 ACTIVE, 10 TRIAL, 8 PAUSED, 9 CANCELLED, 5 EXPIRED
- 90 prospects, all sources represented, 10 already JOINED
- 186 membership contracts: active/closed for members, open sales stages, 12 lost, renewals
- 450 check-ins across 30 days, 18 of them today
- 30 tickets, `GF-1001` … `GF-1030`, mixed categories and priorities
- 32 tasks (6 overdue), 80 activities, 28 notifications, 5 workflows (+20 executions), 45 audit rows

Numbers worth knowing before a demo:

- MRR = **$4,135** (sum of `monthlyValue` for ACTIVE contracts only; one-off products contribute 0)
- Trial conversion = **11.1%** (10 of 90 prospects joined)
- Churn = **8.6%** (9 cancelled ÷ 105 active + paused + cancelled)

Named fixtures worth finding:

- **Priya Nair** — prospect index 0, score 96, home club Downtown. Good candidate for the conversion test.
- **GF-1001** — URGENT, OPEN, unassigned ticket. Use it to test assignment and SLA.
- **Six overdue tasks** — open `/tasks` and look for due dates in the past.
- **Renewals 2027** — second pipeline with its own stages and contracts.

## 5. Logins

Password for all accounts: `password123`

| Email | Role | What is gated |
| --- | --- | --- |
| `owner@demo.com` | ORG_OWNER | Full access, including staff and audit logs |
| `admin@demo.com` | ORG_ADMIN | Staff, pipelines, reports, internal notes, audit logs |
| `manager@demo.com` | CLUB_MANAGER | Prospects, members, memberships, pipelines, tickets, reports |
| `rep@demo.com` | MEMBERSHIP_ADVISOR | Prospect, member and membership work; no administration |
| `rep2@demo.com` | MEMBERSHIP_ADVISOR | Same, different record ownership |
| `supportlead@demo.com` | SUPPORT_MANAGER | Tickets and internal notes |
| `support@demo.com` | SUPPORT_AGENT | Tickets; internal notes hidden |
| `viewer@demo.com` | VIEWER | Read-only intent; no admin permissions |

The login page has quick-fill buttons for owner, club manager, advisor and support lead.

## 6. Manual test paths

Run them in order; each one is short and observable.

### A. Dashboard sanity (2 min)

1. Sign in as `owner@demo.com`.
2. Expect: 120 members (88 active, 10 on trial), MRR $4,135, 18 check-ins today, 20 open support tickets.
3. The joins-by-month chart shows bars across recent months.
4. The 14-day check-in line has a point per day.
5. Click **Refresh**; numbers stay stable.

### B. Prospect → member + contract (5 min)

1. Go to **Prospects**, search `Priya`.
2. Confirm score 96 and that she is not JOINED.
3. Click the convert icon (⇄) on her row.
4. Expect: status becomes JOINED; a member record is created; an opening contract appears in the membership pipeline's first stage.
5. Check **Members** for the new record and **Memberships** for the contract.
6. Convert her again: the API returns `409 Prospect already converted`.

Also test capture: **New prospect** with only a name and club. Then run the CSV import with `firstname,lastname,email,phone,source,priority,value,fitnessgoal` rows.

### C. Membership Kanban and MRR (5 min)

1. Go to **Memberships**; the default pipeline is selected and **Open only** is on.
2. Note the weighted contract value in the header.
3. Drag a contract from **Enquiry** to **Offer sent**; probability and weighted value change.
4. Drag a contract to **Joined**: the contract becomes ACTIVE, `wonAt` is set, and the member becomes ACTIVE.
5. Refresh the dashboard; MRR increases by that contract's monthly value.
6. Drag one to **Lost**: the contract is CANCELLED and a stage-history entry is written.
7. Turn **Open only** off to see active and closed contracts; switch to **Renewals 2027** to see its own columns.

### D. Plans and check-ins (4 min)

1. Go to **Plans**; six products with price, cycle and contract counts.
2. Open **New plan**, create "Summer Student — $25/month", then pause it with the Active/Paused toggle.
3. Go to **Check-ins**; today's list is pre-filled.
4. **Log check-in**: pick an ACTIVE member, keep the home club, method `QR`, duration 60.
5. Confirm the row appears and the today counter increments.
6. Try a CANCELLED member: the API returns `409 Member is not active; renew the membership before check-in`.
7. Change the date picker to a past day; the list and total follow.

### E. Reports and export (3 min)

1. Go to **Reports**.
2. Check conversion (10/90 = 11.1%), active members, churn 8.6%, joins by month, prospects by source, 30-day check-in line.
3. The advisor table ranks staff by active MRR.
4. Export **Prospects**, **Memberships**, **Members**, **Tickets** and **Check-ins**; open each CSV and confirm rows.

### F. Support flow (5 min)

1. Go to **Tickets** as `support@demo.com`.
2. Select **GF-1001** (URGENT, OPEN, unassigned) and note the category and club.
3. Change status to IN_PROGRESS; add a public reply.
4. Tick **Internal** and add a note: it renders amber, labelled "internal note".
5. Sign out, sign in as `viewer@demo.com`; open the same ticket: internal notes are not returned by the API.
6. Sign in as `owner@demo.com`; the internal note is visible again.
7. Resolve the ticket; `resolvedAt` is set and SLA fields remain visible.

### G. Tasks and notifications (3 min)

1. Go to **Tasks**; find overdue items (due dates before today).
2. Mark one COMPLETED.
3. Open the bell in the header; unread notifications are seeded (trial reminders, SLA warnings, renewals).
4. Mark all read; the badge clears after refresh.

### H. Workflows (2 min)

1. Go to **Automations**. Five rules are listed with trigger, action count and an Active/Paused badge.
2. Toggle one to Paused; reload and confirm the state persists.
3. Inspect conditions and execution history through the API:

```bash
# list rules with their condition and actions
curl -s http://localhost:4000/api/v1/workflows -H "Authorization: Bearer $TOKEN"

# execution history for one workflow (replace ID with a rule id)
curl -s http://localhost:4000/api/v1/workflows/<ID>/executions -H "Authorization: Bearer $TOKEN"
```

Expect four executions per rule, some with `status: "failed"` and `error: "Webhook returned 502"`. Create a rule from the page to see name, trigger and action fields.

### I. Roles and isolation (4 min)

1. As `viewer@demo.com`, call the staff list from the browser console:

```js
await fetch("/api/v1/users", { credentials: "include" }).then((r) => r.status);
// 403 — no manage_users permission
```

2. As `owner@demo.com`, the same call returns `200` and the staff list.
3. Sign in as `support@demo.com`; `/users` stays unusable from the API even if the page is opened directly.
4. Tenant isolation is covered by `bash apps/api/tests/tenant-isolation.sh`.

Role enforcement is strongest on staff/org administration, audit logs and internal ticket comments. Other gym routes check tenant scope, not fine-grained writes — test accordingly.

## 7. API smoke test (optional)

```bash
# login
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@demo.com","password":"password123"}'

# with the returned accessToken
curl -s http://localhost:4000/api/v1/reports/dashboard \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:4000/api/v1/reports/retention \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:4000/api/v1/prospects?search=priya" \
  -H "Authorization: Bearer $TOKEN"
```

Full API surface: `docs/API_SPECIFICATION.md`.

## 8. Troubleshooting

- **401/blank app after reseed** — old refresh tokens are gone with the deleted users. Sign in again.
- **Ports in use** — web `3000`, API `4000`, Postgres `5432`, Redis `6379`.
- **Seed says compiled file missing** — run `npm run build --workspace=packages/db` (or `npm run db:seed`, which expects `dist/seed.js`).
- **Reports look empty** — check you are in the `iron-atlas` organization; every query is tenant-scoped.
- **Attendance chart shows zeros** — check-ins are seeded for the last 30 days; a date filter outside that window is empty by design.
