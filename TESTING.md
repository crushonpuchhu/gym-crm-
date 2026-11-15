# TESTING — SALESFLOW CRM

## Unit (vitest — apps/api/tests/utils.test.ts)
Covers password hashing/verification, JWT sign/verify + tamper rejection, response envelope helpers.
Run: `npx vitest run` (5 tests, all green at time of writing).

## Tenant isolation (apps/api/tests/tenant-isolation.sh)
Black-box script: org B registers fresh; asserts org A's leads are invisible and cross-tenant deal fetch is rejected.
Run: `bash apps/api/tests/tenant-isolation.sh` — PASS.

## API integration (manual smoke — all passing)
- register → login → refresh rotation → /me
- create lead → convert (creates contact + deal, preserves history) → weighted pipeline → drag deal stage via PATCH → DealStageHistory row recorded
- ticket create → comment (customer + internal) → status transitions → SLA timestamps (firstResponseAt/resolvedAt/closedAt)
- reports/dashboard reflects live DB counts; sales-by-month aggregates won deals
- subscriptions plan switch enforces entitlements server-side

## Web build
`npx next build` — production build succeeds (19 routes, 0 type errors). Static prerendered pages; data fetched client-side from the API.

## E2E
Not yet wired (playwright not installed). Next step: `tests/e2e/auth.spec.ts` covering login → leads list → convert.

## Gaps
- No CI pipeline yet (`.github/workflows/ci.yml` planned)
- No load test; p99 latency unknown
- Accessibility: interactive elements have labels; no automated axe audit yet
