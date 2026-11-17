# API SPECIFICATION — GYMFLOW MEMBER CRM

## Base
`/api/v1`. Success envelope: `{ success: true, data }`. Error envelope: `{ success: false, error: { code, message, field? } }`.

All routes except public auth routes require a bearer access token. Tenant scope comes from the JWT, never from the request body.

## Auth — `/api/v1/auth`
- `POST /register` — body `{ email, password, name, organizationName }` → user + gym brand + ORG_OWNER team membership
- `POST /login` — body `{ email, password }` → access token + refresh cookie
- `POST /logout` — clear refresh cookie
- `POST /refresh` — rotate access token from refresh cookie
- `POST /forgot-password` — body `{ email }`
- `POST /reset-password` — body `{ token, password }`
- `POST /verify-email` — body `{ token }`
- `GET /me` — current user + team memberships

## Organizations — `/api/v1/organizations`
- `GET /list` — organizations for the current user
- `GET /:id` — brand profile
- `PATCH /:id` — settings (name, currency, timezone, status)
- `POST /:id/invitations` — body `{ email, role }` (requires `manage_users`)

## Staff — `/api/v1/users`
- `GET /` — staff list with role (returns an array)
- `GET /:id` — one staff member with role
- `PATCH /:id/role` — body `{ role }` (requires `manage_users`; cannot change self)
- `DELETE /:id` — deactivate staff membership (requires `manage_users`; cannot deactivate self)

## Roles — `/api/v1/roles`
- `GET /` — roles in this brand
- `POST /` — create role
- `PATCH /:id` — update permissions

## Clubs — `/api/v1/locations`
- `GET /` — list with member/check-in/contract counts (pagination)
- `POST /` — create club (name, address, city, region, phone, capacity, opensAt, closesAt)
- `GET /:id` — detail with counts
- `PATCH /:id` — update
- `DELETE /:id` — archive (409 while members are assigned)

## Plans — `/api/v1/plans`
- `GET /` — plan catalogue with contract counts
- `POST /` — create `{ name, description, price, billingCycle, durationDays, color }`
- `PATCH /:id` — update or pause
- `DELETE /:id` — archive (409 while open memberships use it)

## Prospects — `/api/v1/prospects`
- `GET /` — list with `search`, `status`, `locationId`, `ownerId`, `sortBy`, `sortOrder`, pagination
- `POST /` — create (validated by `createProspectSchema`)
- `GET /:id` — detail + activity trail
- `PATCH /:id` — update
- `DELETE /:id` — soft delete
- `POST /:id/convert` — create member + opening membership, mark JOINED (409 if already converted)
- `POST /import` — body `{ csv }`, header `firstname,lastname,email,phone,source,priority,value,fitnessgoal`

## Members — `/api/v1/members`
- `GET /` — list with `search`, `status`, `locationId`, pagination; includes latest contract
- `POST /` — create member
- `GET /:id` — detail + contracts + recent check-ins + tickets
- `PATCH /:id` — update
- `DELETE /:id` — archive and mark CANCELLED

## Memberships — `/api/v1/memberships`
- `GET /` — list with `pipelineId`, `stageId`, `ownerId`, `status`, `search`; returns `weightedRevenue`
- `POST /` — create contract (pipeline, stage, member, plan, club, title, value, monthlyValue, cycle)
- `GET /:id` — detail + stage history
- `PATCH /:id` — update; a stage move writes history, the won stage sets `wonAt` + ACTIVE status and activates the member, the lost stage cancels the contract
- `DELETE /:id` — soft delete

## Check-ins — `/api/v1/checkins`
- `GET /` — list with `date`, `sinceDays`, `locationId`, `memberId`, `limit`; returns `todayCount`
- `POST /` — log a check-in `{ memberId, locationId?, method, durationMinutes? }` (409 for CANCELLED/EXPIRED members)

## Pipelines — `/api/v1/pipelines`
- `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` (delete blocked while contracts exist)

## Stages — `/api/v1/stages`
- `GET /:pipelineId`, `POST /`, `PATCH /:id`, `DELETE /:id` (delete blocked while contracts exist)

## Tickets — `/api/v1/tickets`
- `GET /` — filters: status, priority, category, owner, search; internal comments filtered by permission
- `POST /` — create `{ reporterEmail, reporterName, memberId?, locationId?, category, subject, description, priority }`; numbers are `GF-nnnn`
- `GET /:id` — detail + comments
- `PATCH /:id` — status, priority, category, owner
- `POST /:id/comments` — body `{ body, isInternal }`
- `POST /:id/assign` — body `{ ownerId }`

## Tasks — `/api/v1/tasks`
- `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`

## Activities — `/api/v1/activities`
- `GET /` — timeline, filterable by entity
- `POST /` — log an activity (CALL, TOUR, EMAIL, TASK, NOTE, STATUS_CHANGE, ASSIGNMENT, CHECK_IN)

## Notifications — `/api/v1/notifications`
- `GET /` — list with read state
- `PATCH /:id/read` — mark one read
- `PATCH /read-all` — mark all read

## Workflows — `/api/v1/workflows`
- `GET /` — rules with condition and actions
- `POST /` — create
- `PATCH /:id` — update or toggle
- `POST /:id/test` — dry-run
- `GET /:id/executions` — execution log

## Reports — `/api/v1/reports`
- `GET /dashboard` — totalProspects, totalMembers, activeMembers, trialMembers, totalMemberships, totalTickets, openTickets, checkInsToday, mrr
- `GET /joins-by-month` — signed contract value per month (last 12 months)
- `GET /prospects-by-source` — grouped counts
- `GET /conversion` — `{ total, converted, rate }` for prospects
- `GET /checkins-by-day?days=30` — attendance series (local calendar days)
- `GET /retention` — active, paused, cancelled, trial, expired, churnRate
- `GET /staff-performance` — MRR and contract value per advisor
- `GET /export/:report` — CSV for `prospects`, `memberships`, `members`, `tickets`, `checkins`

## Subscriptions — `/api/v1/subscriptions`
- `GET /` — current plan, status, `quotaMembers`, `quotaStaff`, period end
- `POST /:plan` — switch STARTER / GROWTH / SCALE, resets quotas and syncs the organization plan (test mode)

## Admin — `/api/v1/admin`
- `GET /audit-logs` — audit trail (permission-gated)
- `GET /health` — health check

## Auth middleware
`authenticate` validates the access token, `resolveTenant` resolves the organization, `requireOrg` rejects a missing tenant, `requirePermission` gates administration endpoints. Tenant scope is enforced by membership lookup; role checks apply to staff, organization administration, audit logs and internal ticket comments.
