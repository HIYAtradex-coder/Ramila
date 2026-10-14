import type { UploadBankStatementRequest } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import { decodeBase64Content, storeLocalUpload } from "../lib/storage.js";
import { appendAudit } from "./audit.js";
import { AuthzError } from "./authz.js";

const HONESTY =
  "Manual bank statement upload only. No Plaid / bank sync connected (MOCK stub). AI may propose matches later — never posts money.";

/**
 * Upload bank statement PDF/image metadata + local bytes.
 * Links to expenses/payments are references only — never auto-post.
 */
export async function uploadBankStatement(
  db: PrismaClient,
  actor: { userId: string; organizationId: string },
  input: UploadBankStatementRequest,
) {
  if (input.linkedVendorPaymentId) {
    const pay = await db.vendorPayment.findFirst({
      where: {
        id: input.linkedVendorPaymentId,
        organizationId: actor.organizationId,
        storeId: input.storeId,
      },
    });
    if (!pay) {
      throw new AuthzError(
        "Linked vendor payment not found for store",
        404,
        "not_found",
      );
    }
  }

  let bytes: Buffer;
  try {
    bytes = decodeBase64Content(input.contentBase64);
  } catch {
    throw new AuthzError("Invalid attachment content", 400, "validation_error");
  }

  const stored = await storeLocalUpload({
    organizationId: actor.organizationId,
    storeId: input.storeId,
    fileName: input.fileName,
    bytes,
  });

  return db.$transaction(async (tx) => {
    const created = await tx.bankStatementAttachment.create({
      data: {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        byteSize: stored.byteSize,
        contentHash: stored.contentHash,
        storageKey: stored.storageKey,
        periodLabel: input.periodLabel ?? null,
        note: input.note ?? null,
        linkedVendorPaymentId: input.linkedVendorPaymentId ?? null,
        linkedExpenseId: input.linkedExpenseId ?? null,
        uploadedById: actor.userId,
      },
    });

    await appendAudit(
      db,
      {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        actorUserId: actor.userId,
        action: "bank_statement.uploaded",
        entityType: "BankStatementAttachment",
        entityId: created.id,
        payloadJson: {
          fileName: created.fileName,
          mimeType: created.mimeType,
          byteSize: created.byteSize,
          contentHash: created.contentHash,
          linkedVendorPaymentId: created.linkedVendorPaymentId,
          linkedExpenseId: created.linkedExpenseId,
          bankSyncConnected: false,
          moneyPosted: false,
          honesty: HONESTY,
        },
      },
      tx,
    );

    return created;
  });
}

/**
 * DEMO-only proposal stub for statement line matching.
 * Does not create expenses or payments; does not move money.
 */
export function proposeBankStatementMatches(attachment: {
  id: string;
  fileName: string;
  periodLabel: string | null;
}) {
  return {
    attachmentId: attachment.id,
    proposals: [
      {
        description: `DEMO proposed match from ${attachment.fileName}`,
        amountMinor: null as number | null,
        suggestedVendor: null as string | null,
        periodLabel: attachment.periodLabel,
        confidence: 40,
      },
    ],
    moneyPosted: false as const,
    expensesPosted: false as const,
    requiresHumanReview: true as const,
    mode: "DEMO" as const,
    honesty:
      "DEMO AI proposal only — human must review. No expense or payment is posted from a bank statement scan.",
  };
}

export function toBankStatementView(row: {
  id: string;
  storeId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  contentHash: string;
  periodLabel: string | null;
  note: string | null;
  linkedVendorPaymentId: string | null;
  linkedExpenseId: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    storeId: row.storeId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    contentHash: row.contentHash,
    periodLabel: row.periodLabel,
    note: row.note,
    linkedVendorPaymentId: row.linkedVendorPaymentId,
    linkedExpenseId: row.linkedExpenseId,
    createdAt: row.createdAt.toISOString(),
    bankSyncConnected: false as const,
    honesty: HONESTY,
  };
}

export const BANK_SYNC_STUB = {
  connected: false as const,
  provider: "none" as const,
  mode: "MOCK" as const,
  honesty:
    "Bank sync is a MOCK stub only. Upload statements manually — Plaid/bank feed not connected.",
};
