# CURSOR_START_HERE — HIYA SmartPOS / StationIQ

Read this before changing code.

## Product

**HIYA SmartPOS / StationIQ** — multi-store owner platform for c-store/fuel/QSR/franchise ops.

Requirements source: Project store Master Prompt (consolidated brief). This repo is the implementation target (formerly empty `Ramila` README).

## Current reality

Pilot scaffold + thin vertical slice is landed. Owner web now has an **iPhone-style Home tile grid** (13 modules, Daily Station v2 chrome) with shared device capture tools and DEMO AI proposal helpers. **Vendor cash/check payments**, **invoice camera/AI scan propose**, and **bank statement attachments** are in the pilot API + UI (AI never posts inventory/money; bank sync remains MOCK). Most other product backends are still **MISSING/MOCK**. Do not claim vendor integrations or Plaid “connected.”

Truth table: [docs/FEATURE_STATUS.md](./docs/FEATURE_STATUS.md)  
Home tiles map: Project store `docs/home-tiles.md`

## Stack

- pnpm workspaces monorepo
- `packages/api` — Fastify
- `packages/db` — Prisma + PostgreSQL
- `packages/contracts` — Zod shared types
- `apps/owner-web` — Vite React owner console
- `apps/staff-mobile`, `apps/customer-app` — Expo shells

## First principles (do not violate)

1. Inspect + update FEATURE_STATUS before large builds.
2. Prefer complete tested vertical slices over placeholder endpoints.
3. Authorization from DB memberships only.
4. Append-only audit / inventory movements; reversals for corrections.
5. Human approve-before-post for inventory from invoices; AI never posts.
6. Stop for real vendor credentials/contracts — never fabricate access.
7. No face recognition / guilt language for loss AI.

## Suggested next increments

1. Harden identity (OIDC/passkeys/MFA, refresh revocation, rate limits)
2. Inventory counts (opening/cycle) with offline scan queue contracts
3. Production OCR vendor path (still proposal-only until approve) + email ingest
4. Owner daily report / profitability read models from posted facts
5. Connector registry stubs with capability reporting (writes off)

## Local commands

```bash
pnpm install
pnpm db:generate && pnpm --filter @hiya/db exec prisma migrate dev
pnpm db:seed
pnpm test
pnpm dev:api
pnpm dev:web
```

## Demo accounts (SYNTHETIC)

| User | Password | Notes |
|------|----------|-------|
| owner@demo.hiya.local | demo-pass-change-me | Both demo stores; can approve |
| receiver@demo.hiya.local | demo-pass-change-me | Store DEMO-01 only; cannot approve |
| Approval PIN | 123456 | Step-up for posting |

## Where to edit

| Goal | Start here |
|------|------------|
| Authz / capabilities | `packages/contracts`, `packages/api/src/services/authz.ts` |
| Invoice post rules | `packages/api/src/services/invoice.ts` |
| Invoice scan propose | `packages/api/src/services/invoice-scan.ts` |
| Vendor payments | `packages/api/src/services/vendor-payment.ts` |
| Bank statement attach | `packages/api/src/services/bank-statement.ts` |
| Schema | `packages/db/prisma/schema.prisma` |
| Owner UI / home tiles | `apps/owner-web/src/pages/HomePage.tsx` + `pages/*` |
| Shared capture tools | `apps/owner-web/src/components/ModuleWorkspace.tsx` |
| AI proposal helpers | `apps/owner-web/src/lib/ai-assist.ts` |
| Staff mobile scan | `apps/staff-mobile/app/invoice-scan.tsx` |
| Status matrix | `docs/FEATURE_STATUS.md` |
