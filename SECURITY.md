# SECURITY — SALESFLOW CRM

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
- Role model: SUPER_ADMIN, ORG_OWNER, ORG_ADMIN, SALES_MANAGER, SALES_REP, SUPPORT_MANAGER, SUPPORT_AGENT, VIEWER
- Permission checks are server-side at the service/route layer

## Verified evidence
- `apps/api/tests/tenant-isolation.sh`: org B registers, sees 0 of org A's leads, cross-tenant deal read blocked
- Lead/deal/ticket/contact/company detail routes all include `organizationId` in `where`

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
