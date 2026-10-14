import type { RecordVendorPaymentRequest } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import { appendAudit } from "./audit.js";
import { AuthzError } from "./authz.js";

const HONESTY =
  "Recorded vendor payout — cash/check tracked in-app. ach_stub/card_stub are honesty stubs only; no bank rail connected.";

/**
 * Record a vendor payment (cash / check / stub methods). Append-only + audit.
 * Never claims bank sync; AI cannot call this path.
 */
export async function recordVendorPayment(
  db: PrismaClient,
  actor: { userId: string; organizationId: string },
  input: RecordVendorPaymentRequest,
) {
  const existing = await db.vendorPayment.findFirst({
    where: {
      organizationId: actor.organizationId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (existing) {
    return existing;
  }

  if (input.bankStatementAttachmentId) {
    const att = await db.bankStatementAttachment.findFirst({
      where: {
        id: input.bankStatementAttachmentId,
        organizationId: actor.organizationId,
        storeId: input.storeId,
      },
    });
    if (!att) {
      throw new AuthzError(
        "Bank statement attachment not found for store",
        404,
        "not_found",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const created = await tx.vendorPayment.create({
      data: {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        vendorName: input.vendorName.trim(),
        method: input.method,
        amountMinor: input.amountMinor,
        currency: input.currency ?? "USD",
        status: "recorded",
        checkNumber: input.checkNumber ?? null,
        checkDate: input.checkDate ? new Date(input.checkDate) : null,
        memo: input.memo ?? null,
        bankStatementAttachmentId: input.bankStatementAttachmentId ?? null,
        linkedExpenseId: input.linkedExpenseId ?? null,
        idempotencyKey: input.idempotencyKey,
        recordedById: actor.userId,
      },
    });

    await appendAudit(
      db,
      {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        actorUserId: actor.userId,
        action: "vendor_payment.recorded",
        entityType: "VendorPayment",
        entityId: created.id,
        payloadJson: {
          method: created.method,
          amountMinor: created.amountMinor,
          vendorName: created.vendorName,
          checkNumber: created.checkNumber,
          checkDate: created.checkDate?.toISOString().slice(0, 10) ?? null,
          cashPayout: created.method === "cash",
          bankRailConnected: false,
          moneyPostedByAi: false,
          honesty: HONESTY,
        },
      },
      tx,
    );

    return created;
  });
}

export function toVendorPaymentView(row: {
  id: string;
  storeId: string;
  vendorName: string;
  method: string;
  amountMinor: number;
  currency: string;
  status: string;
  checkNumber: string | null;
  checkDate: Date | null;
  memo: string | null;
  bankStatementAttachmentId: string | null;
  linkedExpenseId: string | null;
}) {
  return {
    id: row.id,
    storeId: row.storeId,
    vendorName: row.vendorName,
    method: row.method,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    checkNumber: row.checkNumber,
    checkDate: row.checkDate ? row.checkDate.toISOString().slice(0, 10) : null,
    memo: row.memo,
    bankStatementAttachmentId: row.bankStatementAttachmentId,
    linkedExpenseId: row.linkedExpenseId,
    moneyPostedByAi: false as const,
    honesty: HONESTY,
  };
}
