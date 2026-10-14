import { z } from "zod";

/** Store-scoped staff roles (platform/customer identities are separate). */
export const StaffRole = z.enum([
  "owner",
  "manager",
  "bookkeeper",
  "receiver",
  "cashier",
  "auditor",
]);
export type StaffRole = z.infer<typeof StaffRole>;

/** Capabilities derived server-side from membership — never trust client claims. */
export const Capability = z.enum([
  "org:read",
  "org:manage",
  "store:read",
  "store:manage",
  "inventory:read",
  "inventory:count",
  "inventory:adjust",
  "invoice:ingest",
  "invoice:review",
  "invoice:approve",
  "audit:read",
]);
export type Capability = z.infer<typeof Capability>;

export const ROLE_CAPABILITIES: Record<StaffRole, readonly Capability[]> = {
  owner: [
    "org:read",
    "org:manage",
    "store:read",
    "store:manage",
    "inventory:read",
    "inventory:count",
    "inventory:adjust",
    "invoice:ingest",
    "invoice:review",
    "invoice:approve",
    "audit:read",
  ],
  manager: [
    "org:read",
    "store:read",
    "store:manage",
    "inventory:read",
    "inventory:count",
    "inventory:adjust",
    "invoice:ingest",
    "invoice:review",
    "invoice:approve",
    "audit:read",
  ],
  bookkeeper: [
    "org:read",
    "store:read",
    "inventory:read",
    "invoice:review",
    "audit:read",
  ],
  receiver: [
    "store:read",
    "inventory:read",
    "inventory:count",
    "invoice:ingest",
    "invoice:review",
  ],
  cashier: ["store:read", "inventory:read"],
  auditor: ["org:read", "store:read", "inventory:read", "invoice:review", "audit:read"],
};

export const StoreType = z.enum([
  "fuel_cstore",
  "cstore",
  "cstore_deli",
  "liquor",
  "grocery",
  "smoke_vape",
  "sandwich_qsr",
  "pretzel_bakery",
  "ice_cream",
  "coffee",
  "pizza",
  "burger_chicken",
  "specialty_retail",
  "truck_stop",
  "hybrid",
]);
export type StoreType = z.infer<typeof StoreType>;

export const InvoiceStatus = z.enum([
  "draft",
  "proposed",
  "needs_review",
  "approved",
  "rejected",
  "posted",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const MoneyMinor = z.number().int();
export type MoneyMinor = z.infer<typeof MoneyMinor>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  /** Required when the same email exists in more than one organization. */
  organizationId: z.string().uuid().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthUser = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  organizationId: z.string().uuid(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const StoreMembershipView = z.object({
  storeId: z.string().uuid(),
  storeName: z.string(),
  storeCode: z.string(),
  role: StaffRole,
  capabilities: z.array(Capability),
});
export type StoreMembershipView = z.infer<typeof StoreMembershipView>;

export const LoginResponse = z.object({
  accessToken: z.string(),
  user: AuthUser,
  memberships: z.array(StoreMembershipView),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const CreateInvoiceProposalRequest = z.object({
  storeId: z.string().uuid(),
  vendorName: z.string().min(1).max(200),
  invoiceNumber: z.string().min(1).max(100),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  currency: z.string().length(3).default("USD"),
  lines: z
    .array(
      z.object({
        skuCode: z.string().min(1).max(64),
        description: z.string().min(1).max(500),
        quantityEaches: z.number().int().positive(),
        unitCostMinor: MoneyMinor.nonnegative(),
        /** OCR/AI confidence 0–100; low confidence forces needs_review */
        confidence: z.number().int().min(0).max(100).optional(),
      }),
    )
    .min(1),
  /** Provenance note — no fabricated OCR vendor claims */
  sourceNote: z.string().max(500).optional(),
});
export type CreateInvoiceProposalRequest = z.infer<typeof CreateInvoiceProposalRequest>;

export const ApproveInvoiceRequest = z.object({
  /** Step-up approval PIN (dual auth) — verified server-side */
  approvalPin: z.string().min(4).max(12),
  idempotencyKey: z.string().min(8).max(128),
});
export type ApproveInvoiceRequest = z.infer<typeof ApproveInvoiceRequest>;

export const InventoryItemView = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  skuCode: z.string(),
  name: z.string(),
  onHandEaches: z.number().int(),
});
export type InventoryItemView = z.infer<typeof InventoryItemView>;

export const InvoiceView = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  vendorName: z.string(),
  invoiceNumber: z.string(),
  status: InvoiceStatus,
  totalMinor: MoneyMinor,
  currency: z.string(),
  lineCount: z.number().int(),
});
export type InvoiceView = z.infer<typeof InvoiceView>;

export const ApiError = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("hiya-api"),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

/** Base seat = 1 store; each additional store = +$100/mo (MOCK billing until Stripe). */
export const EXTRA_STORE_PRICE_MINOR = 10_000;
export const INCLUDED_STORE_SEATS = 1;

export const OrgPlanView = z.object({
  organizationId: z.string().uuid(),
  includedStoreSeats: z.number().int().positive(),
  additionalStorePriceMinor: MoneyMinor.nonnegative(),
  currency: z.string().length(3),
  billingMode: z.literal("MOCK"),
  activeStoreCount: z.number().int().nonnegative(),
  billableExtraStores: z.number().int().nonnegative(),
  monthlyTotalMinor: MoneyMinor.nonnegative(),
  honesty: z.string(),
});
export type OrgPlanView = z.infer<typeof OrgPlanView>;

export const AddStoreRequest = z.object({
  code: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, or hyphen"),
  name: z.string().min(2).max(120),
  storeType: StoreType.default("cstore"),
  /** Explicit ack that add-store charges +$100/mo MOCK — not a real card charge */
  acceptMockBilling: z.literal(true),
});
export type AddStoreRequest = z.infer<typeof AddStoreRequest>;
