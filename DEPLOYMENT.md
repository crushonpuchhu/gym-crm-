# DEPLOYMENT — SALESFLOW CRM

## Prerequisites
- Docker + Docker Compose, or Node 22 + managed PostgreSQL
- Strong secrets in production: `JWT_SECRET`, `REFRESH_SECRET`, `DATABASE_URL`

## Local / single-host
1. `cp .env.example .env` and edit.
2. `docker compose up -d` — starts postgres (5432) and redis (6379).
3. `docker build -t salesflow-api .` and `docker build -f Dockerfile.web -t salesflow-web .`
4. `docker run --network host --env-file .env -p 4000:4000 salesflow-api`
5. `docker run --network host --env-file .env -p 3000:3000 salesflow-web`

Verified: API image (`salesflow-api:test`) builds and serves `/health` + auth against a live PostgreSQL in production mode.

## Database migrations
`cd packages/db && npx prisma migrate deploy` — apply before first boot and on every upgrade. Seed dev data only in non-prod (`npx prisma db seed`).

## Production checklist
- HTTPS terminated at load balancer / reverse proxy (nginx, Caddy, Traefik)
- `CORS_ORIGINS` restricted to the web origin
- Refresh cookie `Secure` flag is set automatically when `NODE_ENV=production`
- `trust proxy` is enabled in the API; configure proxy headers
- Database backups: scheduled `pg_dump` to S3-compatible storage; test restore quarterly
- Health endpoint: `GET /api/v1/admin/health` — wire to uptime monitor
- Logs: JSON to stdout; ship to your log stack (Loki/ELK/CloudWatch)
- Rotate JWT secrets with dual-key rollout (accept previous key for one TTL window)
- Rate limiting via Redis (`REDIS_URL`) for multi-instance deployments

## Backups & recovery
```bash
docker compose exec postgres pg_dump -U salesflow salesflow > backup-$(date +%F).sql
# restore
docker compose exec -T postgres psql -U salesflow salesflow < backup-$(date +%F).sql
```

## Scaling
Reports and lead queries are indexed by `organizationId`. Redis is optional but enables shared rate-limit counters and BullMQ workers when you add the email/reminder workers.
