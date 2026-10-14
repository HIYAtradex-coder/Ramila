import type { InvoiceScanProposeRequest } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import { decodeBase64Content, sha256Bytes, storeLocalUpload } from "../lib/storage.js";
import { createInvoiceProposal } from "./invoice.js";
import { AuthzError } from "./authz.js";
import { appendAudit } from "./audit.js";

/**
 * DEMO AI invoice scan: camera/file (print or handwriting) → proposed fields.
 * Creates an invoice proposal via the existing pipeline. Never posts inventory or money.
 */
export async function proposeInvoiceFromScan(
  db: PrismaClient,
  actor: { userId: string; organizationId: string },
  input: InvoiceScanProposeRequest,
) {
  let bytes: Buffer;
  try {
    bytes = decodeBase64Content(input.contentBase64);
  } catch {
    throw new AuthzError("Invalid scan content", 400, "validation_error");
  }

  const contentHash = sha256Bytes(bytes);
  await storeLocalUpload({
    organizationId: actor.organizationId,
    storeId: input.storeId,
    fileName: input.fileName,
    bytes,
  });

  const aiMode = input.handwriting ? "DEMO_HANDWRITING" : "DEMO_PRINT";
  /** Deterministic DEMO extraction from hash + hints — not a real OCR vendor claim */
  const hashNibble = Number.parseInt(contentHash.slice(0, 4), 16);
  const qty = (hashNibble % 5) + 1;
  const unitCost = 100 + (hashNibble % 400);
  const confidence = input.handwriting ? 42 : 68;

  const vendorName =
    input.vendorHint?.trim() ||
    (input.handwriting ? "Handwritten Vendor (DEMO AI)" : "Scanned Vendor (DEMO AI)");
  const invoiceNumber =
    input.invoiceNumberHint?.trim() ||
    `SCAN-${contentHash.slice(0, 8).toUpperCase()}`;

  const proposalInput = {
    storeId: input.storeId,
    vendorName,
    invoiceNumber,
    invoiceDate: new Date().toISOString().slice(0, 10),
    currency: "USD",
    lines: [
      {
        skuCode: `SKU-SCAN-${contentHash.slice(8, 14).toUpperCase()}`,
        description: input.handwriting
          ? "Handwritten line (DEMO AI propose — review required)"
          : "Printed invoice line (DEMO AI propose — review required)",
        quantityEaches: qty,
        unitCostMinor: unitCost,
        confidence,
      },
    ],
    sourceNote: `ai_scan_${aiMode.toLowerCase()}_${input.captureSource};hash=${contentHash.slice(0, 16)};file=${input.fileName}`,
  };

  const invoice = await createInvoiceProposal(db, actor, proposalInput);

  await appendAudit(db, {
    organizationId: actor.organizationId,
    storeId: input.storeId,
    actorUserId: actor.userId,
    action: "invoice.scan_proposed",
    entityType: "InvoiceDocument",
    entityId: invoice.id,
    payloadJson: {
      aiMode,
      captureSource: input.captureSource,
      handwriting: input.handwriting,
      contentHash,
      inventoryPosted: false,
      moneyPosted: false,
      honesty:
        "DEMO AI scan propose only. Human PIN approve still required before stock posts. AI never posts inventory or money.",
    },
  });

  return {
    invoiceId: invoice.id,
    status: invoice.status,
    vendorName: invoice.vendorName,
    invoiceNumber: invoice.invoiceNumber,
    totalMinor: invoice.totalMinor,
    lineCount: invoice.lines.length,
    inventoryPosted: false as const,
    moneyPosted: false as const,
    requiresHumanReview: true as const,
    aiMode: aiMode as "DEMO_PRINT" | "DEMO_HANDWRITING",
    honesty:
      "DEMO AI field proposals from device capture. Human must review; approve-with-PIN posts stock. AI never posts.",
    proposedLines: invoice.lines.map((l) => ({
      skuCode: l.skuCode,
      description: l.description,
      quantityEaches: l.quantityEaches,
      unitCostMinor: l.unitCostMinor,
      confidence: l.confidence ?? confidence,
    })),
  };
}
