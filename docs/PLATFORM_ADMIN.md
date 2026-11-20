# Platform console (vendor side)

GymFlow has two separate surfaces:

| Surface | Who | Scope |
| --- | --- | --- |
| `/dashboard`, `/members`, … | Gym staff (`TeamMembership`) | One gym brand |
| `/platform` | GymFlow operators (`User.isPlatformAdmin`) | All gym brands, commercial data plus audited support access |

They are not the same role system. A gym owner runs their own brand; a platform
admin runs the product. `SUPER_ADMIN` inside a gym brand is not used for this —
platform access is a user-level flag, checked against the database on every
request.

## What the console shows

- **Product overview** — gym brands, active vs suspended, estimated MRR, ARPU,
  trial conversion, trials ending in seven days, overdue trials, 30-day churn,
  brands active in the last seven days, staff seats, members managed, new
  signups in the last 30 days.
- **Gyms** — every brand with plan, subscription state, trial countdown, staff
  and member usage against quota, and last recorded activity. Search by name or
  slug, filter by status, and export the full list as CSV.
- **Manage gym** — usage, staff roster, latest tenant audit events, trial
  controls, and commercial controls for brand status (`active` / `suspended`),
  plan, subscription status, staff seats and member cap.
- **People** — every login in the product, which gyms it can enter, account
  state and last sign-in. Operators can disable an account, force a global sign
  out, or grant/revoke platform access.
- **Platform log** — append-only vendor audit trail: who changed which brand,
  trial, account or export, when, from which IP, and with what metadata.
- **Tenant activity** — the last 50 audit events across all brands, useful for
  incident review.

The console never shows member, prospect or contract records by default. To
inspect a gym's records, use **View as gym (read-only)** described below. That
path is reason-gated and audited, so support access stays explicit instead of
becoming a silent back door.

## Access model

```prisma
model User {
  isPlatformAdmin Boolean @default(false)
  isActive        Boolean @default(true)
}
```

- `requirePlatformAdmin` reads the flag and `isActive` from the database per
  request, so revoking either takes effect immediately.
- `/api/v1/platform/*` is mounted without `resolveTenant` / `requireOrg`; it has
  no brand context by design.
- A platform admin with no brand membership logs in and lands on `/platform`.
- A platform admin who is also gym staff sees a **Platform console** link in the
  app sidebar and can move between the two surfaces.
- Gym staff never see `/platform`. The API rejects them with `403 forbidden`,
  even if they guess the URL.
- Disabling an operator revokes their refresh tokens and refuses login and
  refresh with `403 account_disabled`. At least one active platform admin must
  remain; the API returns `409 last_platform_admin` rather than locking the
  vendor out.
- An operator cannot disable or demote their own account.

## Suspending a gym

`PATCH /api/v1/platform/organizations/:id` with `{ "status": "suspended" }`:

- tenant routes return `403 org_suspended` on the next request;
- staff cannot log in;
- invite previews and acceptance are blocked;
- every record is preserved;
- reactivating restores access with no data loss.

Plan changes through the console update the subscription and its quotas. Sending
a plan without explicit quotas applies that plan's defaults
(`apps/api/src/config/plans.ts`).

## Trials

New gyms start on a 14-day `TRIAL` with `Subscription.trialEndsAt`. The console
can extend a trial by 1–90 days from whichever is later: now, or the current end
date. Extending a lapsed trial restarts it from today.

Trial health appears in the overview: trials ending within seven days, overdue
trials, and a simple conversion rate (paying brands divided by paying plus
trialing brands). This is product telemetry, not invoicing.

## Read-only support access (impersonation)

**View as gym (read-only)** on a gym's manage panel creates a short-lived access
token that carries `impersonating`, `impersonatedBy` and `reason`. It does not
borrow the owner's account, password or refresh cookie.

What the token can do:

- read the brand's records through normal tenant GET routes, as owner-level
  visibility;
- see `/auth/me` return an `impersonation` block used by the dashboard banner.

What it cannot do:

- any non-`GET`/`HEAD` tenant request — `requireOrg` and `requirePermission`
  return `403 impersonation_read_only`;
- reach `/platform` — the console layout redirects an active support session to
  `/dashboard`;
- outlive the operator's platform flag — tenant middleware re-checks that the
  actor is an active platform admin on every request;
- access a suspended brand.

The gym sees `platform.impersonation_start` and `platform.impersonation_end` in
its own audit log. The vendor trail records `impersonation.start` and
`impersonation.end` with the reason and IP. **Exit support view** in the banner
calls `POST /auth/stop-impersonation`, which returns a normal platform token.

## Account controls

| Action | Endpoint | Effect |
| --- | --- | --- |
| Disable account | `PATCH /platform/users/:id` `{ "isActive": false }` | Login/refresh rejected, refresh tokens revoked, gym roles kept |
| Enable account | `PATCH /platform/users/:id` `{ "isActive": true }` | Sign-in works again |
| Grant vendor access | `PATCH /platform/users/:id` `{ "isPlatformAdmin": true }` | User can open `/platform` and support sessions |
| Revoke vendor access | `PATCH /platform/users/:id` `{ "isPlatformAdmin": false }` | Refresh tokens revoked, tenant workspace unaffected |
| Force sign-out | `POST /platform/users/:id/revoke-sessions` | Every refresh token revoked; access tokens expire within minutes |

Disabling a person is preferred to deletion: records, ownership and audit
history stay intact.

## Exports

`GET /api/v1/platform/export/gyms.csv` returns a flat CSV: gym, slug, plan,
brand status, subscription status, staff vs quota, members vs quota, trial end,
period end, created. Every export writes an `export.gyms_csv` row to the platform
log. The console's **Export CSV** button uses the same endpoint.

## Setting up access

The seed creates one operator:

```
platform@gymflow.app / password123   →  /platform
```

For production, create your own account and delete or rotate the seed one:

```sql
-- 1. create the user through the normal register flow, or a password hash
--    generated with bcrypt (cost 12)
UPDATE "User" SET "isPlatformAdmin" = true WHERE email = 'you@yourcompany.com';
```

Never grant `isPlatformAdmin` to a customer, and never ship the demo password.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/platform/overview` | Totals, revenue health, plan mix, recent signups |
| `GET` | `/api/v1/platform/organizations` | Paged brands; `search`, `status`, `plan` |
| `GET` | `/api/v1/platform/organizations/:id` | Usage, subscription, staff, trial, audit |
| `PATCH` | `/api/v1/platform/organizations/:id` | Status, plan, subscription, quotas |
| `POST` | `/api/v1/platform/organizations/:id/trial` | Extend or restart a trial (`days`) |
| `POST` | `/api/v1/platform/organizations/:id/impersonate` | Start read-only support session (`reason`) |
| `GET` | `/api/v1/platform/users` | Product-wide logins and brand access |
| `PATCH` | `/api/v1/platform/users/:id` | Enable/disable, promote/demote operator |
| `POST` | `/api/v1/platform/users/:id/revoke-sessions` | Force a global sign-out |
| `GET` | `/api/v1/platform/audit` | Vendor audit trail, newest first, paged |
| `GET` | `/api/v1/platform/activity` | Cross-tenant audit feed |
| `GET` | `/api/v1/platform/export/gyms.csv` | Audited CSV export |
| `POST` | `/api/v1/auth/stop-impersonation` | End support session, restore platform token |

## Not included yet

- **Billing provider** — MRR is computed from list prices, not from invoices.
  Stripe (or similar) would own dunning, taxes, proration and webhooks.
- **Email** — invitations and account notices are still link-based until
  `SMTP_*` / `RESEND_API_KEY` is configured.
- **MFA for operators** — platform accounts rely on password auth today. TOTP
  enforcement for `isPlatformAdmin` is the next security step.
- **Data deletion / GDPR workflow** — suspension preserves data; there is no
  self-serve export-and-delete request flow yet.
- **Feature flags** — support can change plan and quotas, but there is no
  per-tenant feature flag system.
- **Per-tenant rate limits and job isolation** — one noisy brand can still
  consume shared capacity.
