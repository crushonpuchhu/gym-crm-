# TECH STACK — SALESFLOW CRM

## Monorepo (single git repo)
- apps/web — Next.js App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui, Lucide, React Hook Form, Zod, TanStack Table, Recharts, @dnd-kit (Kanban), date-fns
- apps/api — Node.js, TypeScript, Express, Prisma, zod, jsonwebtoken, bcryptjs, cookie-parser, cors, helmet, express-rate-limit, bullmq (Redis), ioredis, socket.io, multer, nodemailer (Resend/SMTP via env), openapi-typescript, swagger-ui-express, jsdoc
- packages/db — Prisma schema, migrations, seed
- packages/shared — shared TypeScript types, Zod request/response schemas, OpenAPI spec source

## Database
- PostgreSQL (primary), Prisma ORM
- Redis (caching, rate limiting, BullMQ queues)

## Infrastructure
- Docker + Docker Compose
- Resend / configurable SMTP for email
- S3-compatible object storage (MinIO locally, env-configurable for prod)

## Auth
- JWT access token (short-lived) + refresh token (HTTP-only secure cookie)
- bcrypt password hashing
- Email verification + password reset tokens

## Tooling
- ESLint, Prettier, TypeScript strict, vitest (unit), supertest (API integration), playwright (E2E)

## Models (free, opencode provider)
- Orchestration/architecture: nemotron-3.5-super-vl-free
- Code generation: deepseek-v4.1-flash-free / flint-40b-free
- Fallback: minimax-m3.1-flash-free
