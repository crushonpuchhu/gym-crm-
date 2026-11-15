# DEPLOYMENT — SALESFLOW CRM

## Local development
1. `cp .env.example .env` and fill values (placeholders ok for dev).
2. `docker compose up -d` (postgres, redis, minio).
3. `cd packages/db && npx prisma migrate dev` then `npx prisma db seed`.
4. `cd apps/api && npm run dev` ; `cd apps/web && npm run dev`.

## Production
- Build: `npm run build` in apps/api and apps/web.
- Run via Docker Compose with production .env (strong secrets, HTTPS, CORS restricted).
- Migrations: `npx prisma migrate deploy` on startup.
- Backups: pg_dump scheduled to S3-compatible storage.
- Health: GET /api/v1/admin/health.

## Environment variables (see .env.example)
DATABASE_URL, REDIS_URL, JWT_SECRET, REFRESH_SECRET, CORS_ORIGINS, SMTP_HOST/PORT/USER/PASS or RESEND_API_KEY, S3_ENDPOINT/BUCKET/KEY/SECRET, NODE_ENV=production.
