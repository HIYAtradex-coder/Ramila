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
  "expense:draft",
  "expense:post",
  "expense:void",
  "report:profitability",
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
    "expense:draft",
    "expense:post",
    "expense:void",
    "report:profitability",
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
    "expense:draft",
    "report:profitability",
  ],
  bookkeeper: [
    "org:read",
    "store:read",
    "inventory:read",
    "invoice:review",
    "audit:read",
    "expense:draft",
    "expense:post",
    "report:profitability",
  ],
  receiver: [
    "store:read",
    "inventory:read",
    "inventory:count",
    "invoice:ingest",
    "invoice:review",
  ],
  cashier: ["store:read", "inventory:read"],
  auditor: [
    "org:read",
    "store:read",
    "inventory:read",
    "invoice:review",
    "audit:read",
    "report:profitability",
  ],
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

/** Operating expense categories for profitability reporting. */
export const ExpenseCategory = z.enum([
  "electricity",
  "gas_utility",
  "water_sewer",
  "internet_phone",
  "pos_processing_fees",
  "credit_card_fees",
  "rent_lease",
  "payroll_wages",
  "payroll_taxes",
  "insurance",
  "repairs_maintenance",
  "cleaning_pest_control",
  "security_monitoring",
  "licenses_permits",
  "accounting_legal",
  "bank_fees",
  "advertising_marketing",
  "delivery_freight",
  "store_supplies",
  "waste_shrink",
  "property_tax",
  "other_miscellaneous",
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategory>;

export const ExpenseStatus = z.enum(["draft", "posted", "voided"]);
export type ExpenseStatus = z.infer<typeof ExpenseStatus>;

export const ExpenseSourceType = z.enum([
  "MANUAL",
  "SCAN_PROPOSAL",
  "IMPORT",
  /** Linked from a bank-statement attachment pipeline (sibling feature) — still draft until human post */
  "BANK_STATEMENT",
]);
export type ExpenseSourceType = z.infer<typeof ExpenseSourceType>;

export const CreateExpenseRequest = z.object({
  storeId: z.string().uuid(),
  category: ExpenseCategory,
  amountMinor: MoneyMinor.positive(),
  incurredDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(1).max(500),
  sourceType: ExpenseSourceType.default("MANUAL"),
  idempotencyKey: z.string().min(8).max(128),
  vendorName: z.string().max(200).optional(),
  paymentMethod: z.string().max(64).optional(),
  receiptUrl: z.string().url().max(1000).optional(),
  sourceReference: z.string().max(200).optional(),
  /**
   * Optional opaque id for a bank-statement / document attachment owned by the
   * attachment pipeline. No FK here — attachment storage lands separately.
   * AI/bank import may set this; posting still requires owner/bookkeeper.
   */
  attachmentId: z.string().uuid().optional(),
  recurring: z.boolean().optional(),
});
export type CreateExpenseRequest = z.infer<typeof CreateExpenseRequest>;

export const PostExpenseRequest = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type PostExpenseRequest = z.infer<typeof PostExpenseRequest>;

export const VoidExpenseRequest = z.object({
  reason: z.string().min(3).max(500),
});
export type VoidExpenseRequest = z.infer<typeof VoidExpenseRequest>;

export const ExpenseView = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  category: ExpenseCategory,
  amountMinor: MoneyMinor,
  incurredDate: z.string(),
  description: z.string(),
  sourceType: ExpenseSourceType,
  status: ExpenseStatus,
  vendorName: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  sourceReference: z.string().nullable().optional(),
  /** Opaque attachment id when sourceType is BANK_STATEMENT (or other ingest) */
  attachmentId: z.string().uuid().nullable().optional(),
  recurring: z.boolean(),
  postedAt: z.string().nullable().optional(),
  voidedAt: z.string().nullable().optional(),
  voidReason: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type ExpenseView = z.infer<typeof ExpenseView>;

export const ProfitabilityPeriod = z.enum([
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "YEARLY",
]);
export type ProfitabilityPeriod = z.infer<typeof ProfitabilityPeriod>;

export const ProfitabilityQuery = z.object({
  period: ProfitabilityPeriod.default("WEEKLY"),
  /** Store scope; omit for all stores the actor can access */
  locationId: z.string().uuid().optional(),
  anchor: z.string().optional(),
});
export type ProfitabilityQuery = z.infer<typeof ProfitabilityQuery>;

export const ACCOUNTING_NOTICE =
  "Gross profit uses SalesDaily.grossProfit (COGS already included). Posted inventory purchases are shown for cash-flow only and are never subtracted again. Draft expenses never change net profit. Missing sales/expense feeds are marked incomplete — not verified zeros.";
