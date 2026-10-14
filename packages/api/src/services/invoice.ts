import type { CreateInvoiceProposalRequest } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import bcrypt from "bcryptjs";
import { sha256Hex } from "../lib/hash.js";
import { appendAudit } from "./audit.js";
import { AuthzError } from "./authz.js";

const LOW_CONFIDENCE = 70;

function lineTotal(qty: number, unitCostMinor: number): number {
  return qty * unitCostMinor;
}

function contentHash(input: CreateInvoiceProposalRequest): string {
  const canonical = JSON.stringify({
    storeId: input.storeId,
    vendorName: input.vendorName,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    currency: input.currency ?? "USD",
    lines: input.lines.map((l) => ({
      skuCode: l.skuCode,
      quantityEaches: l.quantityEaches,
      unitCostMinor: l.unitCostMinor,
    })),
  });
  return sha256Hex(canonical);
}

/**
 * Create an invoice proposal. OCR/AI may feed this path later; posting is never automatic.
 */
export async function createInvoiceProposal(
  db: PrismaClient,
  actor: { userId: string; organizationId: string },
  input: CreateInvoiceProposalRequest,
) {
  const hash = contentHash(input);
  const totalMinor = input.lines.reduce(
    (sum, l) => sum + lineTotal(l.quantityEaches, l.unitCostMinor),
    0,
  );
  // Missing OCR confidence must not skip review for non-manual sources.
  const isManual = (input.sourceNote ?? "manual_entry") === "manual_entry";
  const needsReview = input.lines.some((l) => {
    if (l.confidence === undefined) return !isManual;
    return l.confidence < LOW_CONFIDENCE;
  });
  const status = needsReview ? "needs_review" : "proposed";

  const duplicate = await db.invoiceDocument.findFirst({
    where: {
      organizationId: actor.organizationId,
      contentHash: hash,
      status: { in: ["proposed", "needs_review", "approved", "posted"] },
    },
  });
  if (duplicate) {
    throw new AuthzError("Duplicate invoice content hash", 409, "duplicate_invoice");
  }

  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.invoiceDocument.create({
      data: {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        vendorName: input.vendorName,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: new Date(input.invoiceDate),
        currency: input.currency ?? "USD",
        status,
        totalMinor,
        sourceNote: input.sourceNote ?? "manual_entry",
        contentHash: hash,
        lines: {
          create: input.lines.map((l, idx) => ({
            lineNumber: idx + 1,
            skuCode: l.skuCode,
            description: l.description,
            quantityEaches: l.quantityEaches,
            unitCostMinor: l.unitCostMinor,
            lineTotalMinor: lineTotal(l.quantityEaches, l.unitCostMinor),
            confidence: l.confidence ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    await appendAudit(
      db,
      {
        organizationId: actor.organizationId,
        storeId: input.storeId,
        actorUserId: actor.userId,
        action: "invoice.proposed",
        entityType: "InvoiceDocument",
        entityId: created.id,
        payloadJson: {
          status,
          vendorName: input.vendorName,
          invoiceNumber: input.invoiceNumber,
          totalMinor,
          // Explicit: proposal path never posts inventory
          inventoryPosted: false,
        },
      },
      tx,
    );

    return created;
  });

  return invoice;
}

/**
 * Human approve + post inventory exactly once.
 * AI/OCR confidence never authorizes this path.
 */
export async function approveAndPostInvoice(
  db: PrismaClient,
  actor: { userId: string; organizationId: string },
  invoiceId: string,
  approvalPin: string,
  idempotencyKey: string,
) {
  const user = await db.user.findFirst({
    where: { id: actor.userId, organizationId: actor.organizationId, active: true },
  });
  if (!user) {
    throw new AuthzError("User not found", 401, "unauthorized");
  }

  const pinOk = await bcrypt.compare(approvalPin, user.approvalPinHash);
  if (!pinOk) {
    await appendAudit(db, {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "invoice.approve_pin_failed",
      entityType: "InvoiceDocument",
      entityId: invoiceId,
      payloadJson: { reason: "invalid_approval_pin" },
    });
    throw new AuthzError("Invalid approval PIN", 401, "step_up_failed");
  }

  return db.$transaction(async (tx) => {
    // Row lock so concurrent approves serialize on this invoice.
    await tx.$executeRaw`
      SELECT id FROM "InvoiceDocument"
      WHERE id = ${invoiceId}::uuid
        AND "organizationId" = ${actor.organizationId}::uuid
      FOR UPDATE
    `;

    const existingByKey = await tx.invoiceDocument.findFirst({
      where: {
        organizationId: actor.organizationId,
        idempotencyKey,
      },
    });
    if (existingByKey && existingByKey.id !== invoiceId) {
      throw new AuthzError("Idempotency key already used", 409, "idempotency_conflict");
    }
    if (existingByKey?.status === "posted" && existingByKey.id === invoiceId) {
      return existingByKey;
    }

    const invoice = await tx.invoiceDocument.findFirst({
      where: {
        id: invoiceId,
        organizationId: actor.organizationId,
      },
      include: { lines: true },
    });

    if (!invoice) {
      throw new AuthzError("Invoice not found", 404, "not_found");
    }
    if (invoice.status === "posted") {
      return invoice;
    }
    if (invoice.status === "rejected") {
      throw new AuthzError("Rejected invoice cannot be posted", 409, "invalid_status");
    }
    if (!["proposed", "needs_review", "approved"].includes(invoice.status)) {
      throw new AuthzError("Invoice not approvable", 409, "invalid_status");
    }

    // Claim the post with a compare-and-swap before mutating stock.
    const claimed = await tx.invoiceDocument.updateMany({
      where: {
        id: invoice.id,
        status: { in: ["proposed", "needs_review", "approved"] },
      },
      data: {
        status: "posted",
        approvedAt: new Date(),
        approvedById: actor.userId,
        postedAt: new Date(),
        idempotencyKey,
      },
    });
    if (claimed.count !== 1) {
      const again = await tx.invoiceDocument.findFirst({
        where: { id: invoice.id },
        include: { lines: true },
      });
      if (again?.status === "posted") return again;
      throw new AuthzError("Invoice not approvable", 409, "invalid_status");
    }

    for (const line of invoice.lines) {
      const item = await tx.inventoryItem.upsert({
        where: {
          storeId_skuCode: {
            storeId: invoice.storeId,
            skuCode: line.skuCode,
          },
        },
        update: {
          onHandEaches: { increment: line.quantityEaches },
          name: line.description,
        },
        create: {
          storeId: invoice.storeId,
          skuCode: line.skuCode,
          name: line.description,
          onHandEaches: line.quantityEaches,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          storeId: invoice.storeId,
          itemId: item.id,
          quantityDelta: line.quantityEaches,
          reason: "invoice_receipt",
          sourceType: "InvoiceDocument",
          sourceId: invoice.id,
          actorUserId: actor.userId,
        },
      });
    }

    const posted = await tx.invoiceDocument.findFirstOrThrow({
      where: { id: invoice.id },
      include: { lines: true },
    });

    await appendAudit(
      db,
      {
        organizationId: actor.organizationId,
        storeId: invoice.storeId,
        actorUserId: actor.userId,
        action: "invoice.posted",
        entityType: "InvoiceDocument",
        entityId: invoice.id,
        payloadJson: {
          inventoryPosted: true,
          lineCount: invoice.lines.length,
          totalMinor: invoice.totalMinor,
          humanApproved: true,
        },
      },
      tx,
    );

    return posted;
  });
}
