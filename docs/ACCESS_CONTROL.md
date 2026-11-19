# Accounts, tenants and access control

GymFlow is multi-tenant by **organization**. One organization is one gym brand
(`Iron Atlas Fitness`, `Rebel Barbell`, …). Every staff account is a normal
`User`; access to a brand is granted by a `TeamMembership` row that joins the
user to the organization with exactly one role.

There are two separate control planes. Gym staff manage one brand through
`TeamMembership`; GymFlow's own operators manage the product through
`User.isPlatformAdmin` and the `/platform` console. A gym owner never sees the
vendor console, and a platform admin has no tenant records unless a gym gives
them a staff seat. See `docs/PLATFORM_ADMIN.md`.

```
User ──< TeamMembership >── Organization
                │
                └── role: ORG_OWNER | ORG_ADMIN | CLUB_MANAGER | …
```

The same email may hold memberships in several brands. The active brand is part
of the access token (`orgId`), and every tenant request re-reads the membership
row from the database before running a query.

## Sign-up paths

| Path | Who | What it creates |
| --- | --- | --- |
| `POST /api/v1/auth/register` | A new gym brand | `Organization` + owner `User` + `TeamMembership(ORG_OWNER)` + trial `Subscription` + starter pipeline |
| `POST /api/v1/invitations` | Owner or brand admin | A pending `Invitation` row (email, role, token, 7-day expiry). No user yet. |
| `POST /api/v1/auth/invitations/:token/accept` | Invited employee | `User` + `TeamMembership(role)` in the inviting brand, then a normal session |

### Invitation lifecycle

1. Owner opens **Staff & access → Invite staff**, picks an email and a role.
2. Server checks, in order: the actor may grant that role, the brand is active,
   the email is not already staff here, and a staff seat is free.
3. A random 32-byte token is stored; the link is `…/invite/<token>`.
   In development it is printed to the API log and returned to the inviter.
   In production the same link is emailed.
4. The invitee opens the link, sees the brand, role and email, and sets a name
   and password. Existing GymFlow users must enter their current password, so an
   invitation can never be used to take over an account.
5. Acceptance is transactional: user (if new), membership and `acceptedAt` are
   written together. The seat count is re-checked, so a downgraded plan cannot
   admit extra staff.

Invitations can be re-sent (the old token is discarded), revoked, and expire
after seven days. Accepted invitations cannot be revoked; remove the staff
member instead.

## Roles and permissions

Permissions are capabilities, defined once in
`apps/api/src/config/permissions.ts` and mirrored for display in
`apps/web/src/lib/roles.ts`.

| Role | Department | Summary |
| --- | --- | --- |
| `ORG_OWNER` | Ownership | Everything, including billing and staff. Cannot be removed from the brand. |
| `ORG_ADMIN` | Operations | Staff, clubs, plans, pipelines, records, reports, automations. Cannot mint owners. |
| `CLUB_MANAGER` | Operations | Records, contracts, check-ins, tickets, reports. |
| `MEMBERSHIP_ADVISOR` | Sales | Prospects, tours, trials, contracts, check-ins, tasks. |
| `SUPPORT_MANAGER` | Support | Support inbox, internal notes, support reports, tasks. |
| `SUPPORT_AGENT` | Support | Support inbox, replies, tasks. No internal-only notes. |
| `VIEWER` | Read only | Dashboards and lists, no writes. |

Route guards call `requirePermission("manage_members")` and similar. The matrix
is enforced on the server; the UI only hides controls it knows will fail.

### Privilege ceiling

`canAssignRole(actor, target)` ranks roles. The owner may grant any gym role but
never `SUPER_ADMIN` (platform only). A brand admin may grant admin and below.
Managers and advisors cannot grant roles at all. Nobody can change a more senior
account or remove the brand owner, so an admin cannot demote the owner or mint a
second one silently.

## Tenant isolation

- The organization always comes from the verified access token, never from a
  request body or query string.
- `resolveTenant` loads the caller's memberships on every request;
  `requireOrg` rejects when the token's org is not in that list. Removing a staff
  member therefore cuts access on the next request, not at token expiry.
- Every Prisma query includes `organizationId`; foreign keys supplied by the
  client (`locationId`, `ownerId`, `memberId`, `stageId`, …) are checked against
  the current tenant before use.
- Cross-tenant reads return `404`, so the API never confirms that another gym's
  record exists.
- Audit log rows carry `organizationId` and the acting user.

## Switching brands

`GET /api/v1/auth/memberships` lists every brand and role for the signed-in user.
`POST /api/v1/auth/switch-org` issues a new access token for one of those brands.
The header shows a brand selector only when the user belongs to more than one.

## Seat accounting

`Subscription.quotaStaff` caps staff. A seat is consumed by an active membership
and reserved by a pending invitation. `GET /api/v1/invitations` returns
`{ used, pending, quota, available }` for the seat widget.

## Operational notes

- Staff creation is no longer manual: previously employees only existed through
  seed data or direct database writes. The invitation flow is the supported path.
- No email transport is configured in this repository. Development logs the link
  and the UI shows it after creation; wire `SMTP_*`/`RESEND_API_KEY` before
  production.
- Deactivating a membership soft-deletes the row (`deletedAt`); the user keeps
  their login and any other brand memberships.
