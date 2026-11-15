# API SPECIFICATION — SALESFLOW CRM

## Base
/v1 mounted at /api/v1. JSON envelope: { data, error, meta }. Errors: { code, message, field? }.

## Auth — /api/v1/auth
POST /register — body { email, password, name, organizationName } -> creates user + org + membership Owner
POST /login — body { email, password } -> access token + refresh cookie
POST /logout — clear refresh cookie
POST /refresh — rotate access token from refresh cookie
POST /forgot-password — body { email } -> reset token emailed
POST /reset-password — body { token, password }
POST /verify-email — body { token }
GET /me — current user + memberships

## Organizations — /api/v1/organizations
GET /list — user's organizations
GET /:id — profile
PATCH /:id — settings
POST /:id/invitations — body { email, role }
POST /invitations/:token/accept

## Users — /api/v1/users
GET / — list org users (pagination)
GET /:id — profile
PATCH /:id — update
DELETE /:id — deactivate
POST /:id/role — change role (owner/admin only)

## Roles & Permissions — /api/v1/roles
GET / — list roles
POST / — create role
PATCH /:id — update permissions
GET /permissions — list all permissions

## Leads — /api/v1/leads
GET / — list with search/filter/sort/pagination
POST / — create
GET /:id — detail
PATCH /:id — update
DELETE /:id — soft delete
POST /bulk — bulk update/delete
POST /:id/convert — convert to contact+company+deal
POST /import — CSV import

## Contacts — /api/v1/contacts
GET / — list
POST / — create
GET /:id — detail
PATCH /:id — update
DELETE /:id — soft delete

## Companies — /api/v1/companies
GET / — list
POST / — create
GET /:id — detail
PATCH /:id — update
DELETE /:id — soft delete

## Pipelines — /api/v1/pipelines
GET / — list org pipelines
POST / — create
PATCH /:id — update stages/order
DELETE /:id — delete (if no deals)

## Stages — /api/v1/stages
GET /:pipelineId — list
POST / — create
PATCH /:id — update
DELETE /:id — delete

## Deals — /api/v1/deals
GET / — list
POST / — create
GET /:id — detail + stage history
PATCH /:id — update (incl. stage move -> creates DealStageHistory)
DELETE /:id — soft delete

## Tickets — /api/v1/tickets
GET / — list with filters
POST / — create (generates ticket number)
GET /:id — detail + comments
PATCH /:id — update
POST /:id/comments — add comment (internal or customer-visible)
POST /:id/assign — assign owner
POST /:id/escalate — escalate priority/SLA

## Tasks — /api/v1/tasks
GET / — list
POST / — create
PATCH /:id — update/complete
DELETE /:id — delete

## Activities — /api/v1/activities
GET / — list (timeline) filterable by entity
POST / — log activity

## Notifications — /api/v1/notifications
GET / — list unread/read
PATCH /:id/read — mark read
PATCH /read-all — mark all read

## Workflows — /api/v1/workflows
GET / — list
POST / — create
PATCH /:id — toggle active
POST /:id/test — dry-run execution
GET /:id/executions — execution log

## Reports — /api/v1/reports
GET /dashboard — summary stats
GET /sales-by-month — grouped
GET /leads-by-source — grouped
GET /conversion — rate
GET /salesperson-performance — per user
GET /pipeline — stage distribution + weighted revenue
GET /ticket-resolution — time stats
GET /export/:report — CSV

## Subscriptions — /api/v1/subscriptions
GET / — current plan + entitlements
POST /:plan — upgrade/downgrade (test mode)

## Admin — /api/v1/admin
GET /audit-logs — audit trail
GET /health — health check

## Auth middleware
All routes except auth public routes require valid access token. Tenant scope enforced by membership lookup. Role/permission checked per endpoint.
