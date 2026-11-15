# SECURITY — SALESFLOW CRM

## Authentication
- Passwords hashed with bcrypt (salt 12). Never stored plaintext.
- Access JWT: 15 min TTL, signed with JWT_SECRET.
- Refresh JWT: 7 days TTL, HTTP-only Secure SameSite=Strict cookie, rotating.
- Logout clears refresh cookie and revokes token family.
- Password reset/email verification tokens: single-use, expiry 15 min / 24h.

## Authorization
- All business endpoints require authenticated session.
- Tenant scope: every query filtered by organizationId derived from session memberships. Client-supplied organizationId never trusted as proof of access.
- Role-based permissions checked server-side (leads.read, deals.manage, tickets.manage, users.manage, settings.manage, reports.read).
- Record-level: owner or assigned user can act on own records; managers can act on org records.

## Input & injection
- Zod validation on every request body/query/params.
- Prisma parameterized queries — no raw SQL concatenation.
- XSS: shadcn/ui escapes content; CSP via helmet.
- File upload: max 10MB, mime allowlist (pdf, png, jpg, doc, docx), stored outside web root / signed URLs.

## Rate limiting
- express-rate-limit + Redis store: auth endpoints 5 req/min, general 100 req/min per IP.

## CORS
- Allowed origins from CORS_ORIGINS env; credentials enabled only for same-site.

## Secrets
- JWT_SECRET, REFRESH_SECRET, DATABASE_URL, REDIS_URL, SMTP/Resend key, S3 keys in .env only.
- .env.example has placeholders. No secrets committed.

## Audit
- AuditLog captures action, actor, entity, before/after values, IP, userAgent.
- Auth events (login, logout, password change) always audited.

## Tests
- Cross-tenant access test: user of org A cannot read/update/delete org B records (API + DB level).
- Permission tests per role.
