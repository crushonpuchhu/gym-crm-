# Platform console (vendor side)

GymFlow has two separate surfaces:

| Surface | Who | Scope |
| --- | --- | --- |
| `/dashboard`, `/members`, … | Gym staff (`TeamMembership`) | One gym brand |
| `/platform` | GymFlow operators (`User.isPlatformAdmin`) | All gym brands, commercial data only |

They are not the same role system. A gym owner runs their own brand; a platform
admin runs the product. `SUPER_ADMIN` inside a gym brand is not used for this —
platform access is a user-level flag, checked against the database on every
request.

## What the console shows

- **Product overview** — gym brands, active vs suspended, estimated MRR from the
  plan list price, staff seats, members managed, new signups in the last 30 days.
- **Gyms** — every brand with plan, subscription state, staff and member usage
  against quota, and last recorded activity.
- **Manage gym** — usage, staff roster, latest audit events, and controls for:
  brand status (`active` / `suspended`), plan, subscription status, staff seats,
  member cap.
- **People** — every login in the product and which gyms it can enter.
- **Activity** — the last 50 audit events across all brands.

The console deliberately shows **no member, prospect or contract records**. If
you need to inspect a gym's records, the owner should give you a staff seat.
This keeps support access explicit and auditable instead of giving the vendor a
back door.

## Access model

```prisma
model User {
  isPlatformAdmin Boolean @default(false)
}
```

- `requirePlatformAdmin` reads the flag from the database per request, so
  revoking it takes effect immediately.
- `/api/v1/platform/*` is mounted without `resolveTenant` / `requireOrg`; it has
  no brand context by design.
- A platform admin with no brand membership logs in and lands on `/platform`.
- A platform admin who is also gym staff sees a **Platform console** link in the
  app sidebar and can move between the two surfaces.
- Gym staff never see `/platform`. The API rejects them with `403 forbidden`,
  even if they guess the URL.

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
| `GET` | `/api/v1/platform/overview` | Totals, plan mix, recent signups |
| `GET` | `/api/v1/platform/organizations` | Paged brands; `search`, `status`, `plan` |
| `GET` | `/api/v1/platform/organizations/:id` | Usage, subscription, staff, audit |
| `PATCH` | `/api/v1/platform/organizations/:id` | Status, plan, subscription, quotas |
| `GET` | `/api/v1/platform/users` | Product-wide logins and brand access |
| `GET` | `/api/v1/platform/activity` | Cross-tenant audit feed |

## Not included yet

- **Impersonation** — no "log in as this gym" button. It is a security-sensitive
  feature and should be time-boxed, logged and consented to before it exists.
- **Billing provider** — MRR is computed from list prices, not from invoices.
  Stripe (or similar) would own dunning, taxes and proration.
- **Email** — invitations are still link-based until `SMTP_*` /
  `RESEND_API_KEY` is configured.
- **Platform audit table** — commercial changes are written into the affected
  gym's audit log (`platform.org_update`), visible to that gym. A separate
  vendor audit trail is the next hardening step.
