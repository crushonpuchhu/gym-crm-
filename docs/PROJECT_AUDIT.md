# PROJECT AUDIT — SALESFLOW CRM

## Repository
- Path: /media/mittal/New Volume/WEB/a2
- Git: not initialized
- Contents: empty (0 entries)
- Existing code: none

## Runtime tooling
- OpenCode CLI: v2.3.0
- Node.js: v22.23.4
- npm: 10.9.9
- Docker: 29.9.1
- PostgreSQL: not installed locally (will run via Docker Compose)
- Prisma CLI: not installed (will add as devDependency)

## Free OpenCode models (opencode provider, $0 cost)
- iceman-free, inkling-2-small-free, longcat-2.5-free, flint-40b-free,
  minimax-m3.1-flash-free, deepseek-v4.1-flash-free,
  nemotron-3.5-super-vl-free, beam-free, mimo-v2.6-flash-free,
  glm-5.3-flash-free, big-pickle

## Orchestration
- Single agent instance acting as Principal Orchestrator.
- Subagents available: cavecrew-builder, cavecrew-investigator, cavecrew-reviewer, explore, general.
- No duplicate agents created; subagents used for independent parallel work.

## Risk report
- Empty repo: everything built from scratch.
- No paid models permitted; all work on free OpenCode models.
- Local Postgres absent -> Docker Compose required for dev database.
- Large scope: 14 modules. Mitigation: incremental phase delivery with verified acceptance criteria per phase.
- Tenant isolation and RBAC are security-critical; tested explicitly.
- Real payments not initiated; Stripe test-mode adapter only.
