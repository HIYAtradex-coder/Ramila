# Feature status matrix

Statuses: **WORKING** · **PARTIAL** · **MOCK** · **MISSING** · **BLOCKED**

Audited against repository code after pilot scaffold (not aspirational).

| Module / capability | Status | Evidence / notes |
|---------------------|--------|------------------|
| Monorepo scaffold (TS, pnpm workspaces) | WORKING | Root workspace + packages/apps |
| Shared contracts (`@hiya/contracts`) | PARTIAL | Auth/capabilities/invoice Zod; not full OpenAPI yet |
| PostgreSQL + Prisma schema | WORKING | Org/store/user/membership/audit/inventory/invoice |
| Migrations + synthetic seed | WORKING | `prisma migrate`, `pnpm db:seed` |
| Fastify API health | WORKING | `GET /health` |
| Password login + JWT | PARTIAL | Local bcrypt login; no OIDC/passkeys/MFA yet |
| Store-scoped memberships | WORKING | DB-backed; client role claims not trusted |
| Capability checks per route | WORKING | `requireStoreCapability` on inventory/invoice/audit |
| Append-only audit log | WORKING | `AuditEvent` create-only helper + login/invoice events |
| Inventory on-hand read | WORKING | `GET /stores/:storeId/inventory` |
| Inventory movements (append-only) | PARTIAL | Created on invoice post; no reversal UX yet |
| Inventory counts / barcode / offline queue | MISSING | — |
| Invoice manual proposal | WORKING | `POST /invoices/proposals` |
| OCR / email ingest / vendor OCR | MISSING | No fabricated vendor; ingest interfaces not built |
| Human approve + step-up PIN post | WORKING | `POST /invoices/:id/approve`; PIN required |
| AI/LLM auto-post inventory | N/A (forbidden) | Explicitly not implemented; proposals never post |
| Idempotent approve | WORKING | `idempotencyKey` on invoice |
| Duplicate invoice hash guard | WORKING | `contentHash` uniqueness check |
| Owner web console | PARTIAL | iPhone-style home tiles + 9 modules; login + store scope |
| Owner home tile grid | WORKING | `/` — 13 tiles incl. Vendors, Orders, Pricing, Multi-store |
| Vendor directory UI | MOCK | `/vendors` — categories + invoice name link; no EDI/portal |
| Orders / PO / pickup UI | MOCK | `/orders` — sections only; no marketplace/DoorDash/Wawa |
| Pricing / price books UI | MOCK | `/pricing` — proposals only; publish writes OFF; no FPC vendor |
| Multi-store portfolio UI | PARTIAL | Membership list + switch; rollup KPIs UNKNOWN; no vendor sync claim |
| Org store-seat plan (base 1 + $100/mo) | PARTIAL | `OrganizationPlan` + `/billing/plan` + `POST /stores`; billingMode MOCK only |
| Stripe / real subscription charge | MISSING | Explicitly not wired — MOCK ledger labels required |
| Shared capture tools (copy/cut/paste/scan/camera) | WORKING | Device clipboard + local file/camera; not hardware scanner/VMS |
| AI proposal assist per tile | MOCK | Checklists/summaries only; never posts inventory/money/payroll |
| POS module UI | MISSING | Stub route `/pos`; no vendor connected |
| Daily reports module | PARTIAL | `/reports` — live inventory/invoice counts; sales KPIs UNKNOWN |
| Profitability / P&amp;L reports | PARTIAL | `/profitability` + `GET /v1/reports/profitability` + `/analysis`; SalesDaily GP + posted opex; DEMO sales unlabeled as certified; proposal-only auto analysis; no bank feed |
| Expense draft → post → void | PARTIAL | `POST /v1/expenses` (+ post/void); owner/mgr/bookkeeper draft; owner/bookkeeper post; owner void; draft excluded from net |
| Lottery module UI | MOCK | `/lottery` workpaper shell; not a filing |
| Sales tax monthly module | MOCK | `/sales-tax` workpaper shell; not a filing |
| Employee management module | PARTIAL | `/employees` — memberships live; payroll/schedule/onboarding MOCK |
| Expense management module | PARTIAL | `/expenses` draft/post UI; no bank/card feed |
| Inventory module UI | WORKING | `/inventory` wired to store inventory API |
| Invoice module UI | WORKING | `/invoices` propose → PIN approve-before-post |
| Expo staff app | PARTIAL | Bootable shell only |
| Expo customer rewards/order app | PARTIAL | Bootable shell only |
| Franchise profiles / recipes / BOMs | MISSING | StoreType enum + configJson hook only |
| Purchasing / rebates / lots / expiry | MISSING | — |
| Price books / fuel price writes | MISSING | — |
| Retail POS baskets / age checks | MISSING | — |
| Franchise/POS connector registry | MISSING | Writes must default off when added |
| Loyalty / marketplace ordering | MISSING | — |
| Owner daily command center reports | PARTIAL | Tile summary + profitability period reports from SalesDaily/expenses; POS-certified feeds still MISSING |
| Cameras / Live Wall / UniFi | BLOCKED | `/cameras` placeholder; needs owner-confirmed VMS + credentials |
| Payroll connector (ADP/Gusto/etc.) | MISSING | UI stub only; no connected claim |
| Possible-loss AI correlation | MISSING | — |
| Evidence preserve/export | MISSING | — |
| AI bots / workers / outbox | MISSING | In-UI proposal helpers only (MOCK) |
| OpenAPI publish | MISSING | Contracts exist; OpenAPI not generated |
| Threat model / privacy docs | MISSING | Deliverable backlog |
| Production deployment | MISSING | Local/dev only |

## Pilot v1 verdict

**Architecture proof works:** multi-store authz + audit + invoice propose/approve/post with tests.

**Not a product launch:** most modules remain MISSING/BLOCKED pending vendor choices and next vertical slices.
