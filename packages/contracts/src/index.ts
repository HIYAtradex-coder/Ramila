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
  "payment:record",
  "payment:read",
  "attachment:upload",
  "attachment:read",
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
    "payment:record",
    "payment:read",
    "attachment:upload",
    "attachment:read",
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
    "payment:record",
    "payment:read",
    "attachment:upload",
    "attachment:read",
    "audit:read",
  ],
  bookkeeper: [
    "org:read",
    "store:read",
    "inventory:read",
    "invoice:review",
    "payment:record",
    "payment:read",
    "attachment:upload",
    "attachment:read",
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
  auditor: [
    "org:read",
    "store:read",
    "inventory:read",
    "invoice:review",
    "payment:read",
    "attachment:read",
    "audit:read",
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

/** Vendor payout method — ach/card are honesty stubs, not live bank rails. */
export const VendorPaymentMethod = z.enum([
  "cash",
  "check",
  "ach_stub",
  "card_stub",
  "other",
]);
export type VendorPaymentMethod = z.infer<typeof VendorPaymentMethod>;

export const VendorPaymentStatus = z.enum(["recorded", "voided"]);
export type VendorPaymentStatus = z.infer<typeof VendorPaymentStatus>;

export const RecordVendorPaymentRequest = z
  .object({
    storeId: z.string().uuid(),
    vendorName: z.string().min(1).max(200),
    method: VendorPaymentMethod,
    amountMinor: MoneyMinor.positive(),
    currency: z.string().length(3).default("USD"),
    checkNumber: z.string().min(1).max(64).optional(),
    checkDate: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(),
    memo: z.string().max(500).optional(),
    bankStatementAttachmentId: z.string().uuid().optional(),
    /** Soft ref — does not create/post OperatingExpense */
    linkedExpenseId: z.string().uuid().optional(),
    idempotencyKey: z.string().min(8).max(128),
  })
  .superRefine((val, ctx) => {
    if (val.method === "check") {
      if (!val.checkNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "checkNumber required for check payments",
          path: ["checkNumber"],
        });
      }
      if (!val.checkDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "checkDate required for check payments",
          path: ["checkDate"],
        });
      }
    }
  });
export type RecordVendorPaymentRequest = z.infer<typeof RecordVendorPaymentRequest>;

export const VendorPaymentView = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  vendorName: z.string(),
  method: VendorPaymentMethod,
  amountMinor: MoneyMinor,
  currency: z.string(),
  status: VendorPaymentStatus,
  checkNumber: z.string().nullable().optional(),
  checkDate: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  bankStatementAttachmentId: z.string().uuid().nullable().optional(),
  linkedExpenseId: z.string().uuid().nullable().optional(),
  moneyPostedByAi: z.literal(false),
  honesty: z.string(),
});
export type VendorPaymentView = z.infer<typeof VendorPaymentView>;

export const ALLOWED_ATTACHMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export const UploadBankStatementRequest = z.object({
  storeId: z.string().uuid(),
  fileName: z.string().min(1).max(260),
  mimeType: z.enum(ALLOWED_ATTACHMENT_MIME),
  /** Raw file bytes as base64 (pilot local storage — not a bank API upload) */
  contentBase64: z.string().min(8).max(12_000_000),
  periodLabel: z.string().max(64).optional(),
  note: z.string().max(500).optional(),
  linkedVendorPaymentId: z.string().uuid().optional(),
  /** Soft ref for future OperatingExpense — reference only */
  linkedExpenseId: z.string().uuid().optional(),
});
export type UploadBankStatementRequest = z.infer<typeof UploadBankStatementRequest>;

export const BankStatementAttachmentView = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  contentHash: z.string(),
  periodLabel: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  linkedVendorPaymentId: z.string().uuid().nullable().optional(),
  linkedExpenseId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  bankSyncConnected: z.literal(false),
  honesty: z.string(),
});
export type BankStatementAttachmentView = z.infer<typeof BankStatementAttachmentView>;

/** Camera / file capture → DEMO AI field proposals → invoice proposal (never posts). */
export const InvoiceScanProposeRequest = z.object({
  storeId: z.string().uuid(),
  fileName: z.string().min(1).max(260),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]),
  contentBase64: z.string().min(8).max(12_000_000),
  /** When true, DEMO AI treats source as handwriting and forces needs_review */
  handwriting: z.boolean().default(false),
  captureSource: z.enum(["camera", "file", "mobile"]).default("camera"),
  /** Optional human hints — never authorize posting */
  vendorHint: z.string().max(200).optional(),
  invoiceNumberHint: z.string().max(100).optional(),
});
export type InvoiceScanProposeRequest = z.infer<typeof InvoiceScanProposeRequest>;

export const InvoiceScanProposeResponse = z.object({
  invoiceId: z.string().uuid(),
  status: InvoiceStatus,
  vendorName: z.string(),
  invoiceNumber: z.string(),
  totalMinor: MoneyMinor,
  lineCount: z.number().int(),
  inventoryPosted: z.literal(false),
  moneyPosted: z.literal(false),
  requiresHumanReview: z.literal(true),
  aiMode: z.enum(["DEMO_PRINT", "DEMO_HANDWRITING"]),
  honesty: z.string(),
  proposedLines: z.array(
    z.object({
      skuCode: z.string(),
      description: z.string(),
      quantityEaches: z.number().int(),
      unitCostMinor: MoneyMinor,
      confidence: z.number().int().min(0).max(100),
    }),
  ),
});
export type InvoiceScanProposeResponse = z.infer<typeof InvoiceScanProposeResponse>;

/** MOCK stub only — never claim live Plaid/bank sync. */
export const BankSyncStubView = z.object({
  connected: z.literal(false),
  provider: z.literal("none"),
  mode: z.literal("MOCK"),
  honesty: z.string(),
});
export type BankSyncStubView = z.infer<typeof BankSyncStubView>;
