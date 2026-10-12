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
| Owner web console | PARTIAL | Login, store select, propose, approve, list stock |
| Expo staff app | PARTIAL | Bootable shell only |
| Expo customer rewards/order app | PARTIAL | Bootable shell only |
| Franchise profiles / recipes / BOMs | MISSING | StoreType enum + configJson hook only |
| Purchasing / rebates / lots / expiry | MISSING | — |
| Price books / fuel price writes | MISSING | — |
| Retail POS baskets / age checks | MISSING | — |
| Franchise/POS connector registry | MISSING | Writes must default off when added |
| Loyalty / marketplace ordering | MISSING | — |
| Owner daily command center reports | MISSING | — |
| Cameras / Live Wall / UniFi | BLOCKED | Needs owner-confirmed VMS + credentials |
| Possible-loss AI correlation | MISSING | — |
| Evidence preserve/export | MISSING | — |
| AI bots / workers / outbox | MISSING | — |
| OpenAPI publish | MISSING | Contracts exist; OpenAPI not generated |
| Threat model / privacy docs | MISSING | Deliverable backlog |
| Production deployment | MISSING | Local/dev only |

## Pilot v1 verdict

**Architecture proof works:** multi-store authz + audit + invoice propose/approve/post with tests.

**Not a product launch:** most modules remain MISSING/BLOCKED pending vendor choices and next vertical slices.
