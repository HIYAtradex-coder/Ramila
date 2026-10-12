# HIYA SmartPOS / StationIQ

Multi-store retail, restaurant, franchise, and fuel operations platform.

> **Repo note:** This repository was previously named `Ramila`. Product name is **HIYA SmartPOS / StationIQ**.

## What’s in this pilot slice

- TypeScript pnpm monorepo (`packages/*`, `apps/*`)
- Fastify API with store-scoped authorization (DB memberships; never trust client tenant/role claims)
- PostgreSQL + Prisma models: org, users, stores, memberships, append-only audit, inventory movements, invoice documents
- Invoice **proposal → human approve (step-up PIN) → post inventory** — AI/OCR cannot post stock
- Minimal owner web console + Expo staff/customer app shells
- Integration tests for authz + approve-before-post

See [CURSOR_START_HERE.md](./CURSOR_START_HERE.md) and [docs/FEATURE_STATUS.md](./docs/FEATURE_STATUS.md).

## Packages

| Path | Package | Role |
|------|---------|------|
| `packages/contracts` | `@hiya/contracts` | Shared Zod contracts / capabilities |
| `packages/db` | `@hiya/db` | Prisma schema, client, seed |
| `packages/api` | `@hiya/api` | Fastify HTTP API |
| `apps/owner-web` | `@hiya/owner-web` | Owner web console (Vite + React) |
| `apps/staff-mobile` | `@hiya/staff-mobile` | Expo staff/manager shell |
| `apps/customer-app` | `@hiya/customer-app` | Expo customer shell (scaffold) |

## Quick start

Prerequisites: Node 20+, pnpm 10+, PostgreSQL 16.

```bash
cp .env.example .env
# start Postgres (docker compose up -d  OR local install)
pnpm install
pnpm db:generate
pnpm --filter @hiya/db exec prisma migrate dev --name init
pnpm db:seed
pnpm dev:api          # http://localhost:3001
pnpm dev:web          # http://localhost:5173 (proxies /api → API)
pnpm test
```

### Synthetic demo login

- `owner@demo.hiya.local` / `demo-pass-change-me`
- Approval PIN: `123456`
- Fixtures are labeled **SYNTHETIC** — not real store data.

## Hard rules (enforced in code where applicable)

- Never trust client-supplied organization IDs, roles, or capabilities
- Economic/audit records are append-only; corrections via linked reversals
- LLM/OCR may propose; **deterministic human approval** posts inventory
- No fabricated vendor/POS/camera access; connector writes default off
- No face recognition

## Out of scope for this PR

POS connectors, cameras, franchise recipes, loyalty/ordering, evidence export, production OIDC/passkeys — see feature status matrix.
