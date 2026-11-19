# SECURITY — GYMFLOW CRM

## Threat model summary
Multi-tenant SaaS; primary risks: cross-tenant data access, credential theft, injection, over-privileged roles, secret leakage.

## AuthN
- bcrypt (cost 12) password hashing — verified by `apps/api/tests/utils.test.ts`
- JWT access (15 min) + refresh (7 days) rotated on every refresh; refresh is HTTP-only, `Secure` in production, `SameSite=Strict`, path-scoped `/`
- Session invalidation: deactivate membership → org routes reject; password change → outstanding tokens invalidated via refresh rotation

## AuthZ
- Every tenant route resolves org context from server-side membership lookup; **client-supplied org IDs are never trusted**
- Tenant scoping enforced in every Prisma query (`where: { organizationId, deletedAt: null }`)
- Cross-tenant access returns 404 (record not found), not 403 with existence leakage
- Vendor access is a separate `User.isPlatformAdmin` flag, checked from the database per request; `/api/v1/platform/*` is mounted without tenant context and exposes commercial data/aggregates only, never gym records
- Suspended brands (`Organization.status = "suspended"`) are rejected at login and on every tenant route with `403 org_suspended`; records are preserved
- Role model: ORG_OWNER, ORG_ADMIN, CLUB_MANAGER, MEMBERSHIP_ADVISOR, SUPPORT_MANAGER, SUPPORT_AGENT, VIEWER. `SUPER_ADMIN` is legacy and unused; the vendor console uses `User.isPlatformAdmin`.
- Permissions are capabilities (`manage_members`, `manage_billing`, `manage_users`, …) defined in `apps/api/src/config/permissions.ts`; every mutation route and sensitive read declares one with `requirePermission`
- Privilege ceiling: `canAssignRole` stops an admin from minting an owner, stops managers/advisors from granting any role, and blocks editing or removing a more senior account; the brand owner cannot be demoted or removed
- Staff join only through an invitation: pending `Invitation` (7-day token) → public preview → accept. A new email sets a name and password; an existing GymFlow login must confirm its current password, so an invite can never be used to take over an account
- Seats: `Subscription.quotaStaff` caps active memberships plus unexpired pending invitations (402 `seat_limit`)
- Full design: `docs/ACCESS_CONTROL.md`; vendor console: `docs/PLATFORM_ADMIN.md`

## Verified evidence
- `apps/api/tests/permissions.test.ts`: role matrix, `canAssignRole` ceiling, invite payload validation
- `apps/api/tests/tenant-isolation.sh`: org B registers, sees 0 of org A's leads, cross-tenant deal read blocked
- Live checks: advisor/viewer blocked on member/report/billing writes; admin cannot invite an owner; reused invite → 410; removed staff → immediate 403; existing-account accept rejects a wrong password (401)
- Live checks: platform admin logs in with no brand and sees aggregates; gym owner gets 403 on `/platform/*`; platform token gets `org_required` on tenant routes; suspended brand gets `403 org_suspended` on login and tenant calls, then recovers after reactivation
- Member/ticket/contact detail routes all include `organizationId` in `where`

## Input handling
- Zod validation on body/query/params via `validate()` middleware and route-level `schema.parse`
- Prisma parameterized queries; no raw SQL except `SELECT 1` health probe
- Helmet security headers; CORS allowlist; 2 MB JSON body cap; file uploads restricted by type/size when S3 is enabled

## Rate limiting
- `express-rate-limit` 100 req/min/IP general; stricter limits recommended for `/auth/*` in front of Redis-backed store in multi-instance setups

## Secrets
- `.env` is gitignored; `.env.example` ships placeholders only; no secrets in commits
- Audit logs record actor, action, entity, before/after values, IP, user agent — surfaced in Settings → Audit log

## Known gaps (tracked)
- CSRF double-submit token not yet wired for cookie-bearing non-GET endpoints; `SameSite=Strict` mitigates classic CSRF but do not relax it
- Socket.IO realtime namespace unauthenticated — disabled until implemented
- Password strength policy is length-only (min 8); add zxcvbn for production
- No CAPTCHA on register/forgot-password

## Reporting
Report vulnerabilities to the maintainers privately; do not open public issues.
