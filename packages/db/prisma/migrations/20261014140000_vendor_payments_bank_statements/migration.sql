-- Vendor payments (cash/check + stubs) and bank statement attachments
CREATE TABLE "BankStatementAttachment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "periodLabel" TEXT,
    "note" TEXT,
    "linkedVendorPaymentId" UUID,
    "linkedExpenseId" UUID,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorPayment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "vendorName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "checkNumber" TEXT,
    "checkDate" DATE,
    "memo" TEXT,
    "bankStatementAttachmentId" UUID,
    "linkedExpenseId" UUID,
    "idempotencyKey" TEXT,
    "recordedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankStatementAttachment_storeId_createdAt_idx" ON "BankStatementAttachment"("storeId", "createdAt");
CREATE INDEX "BankStatementAttachment_organizationId_contentHash_idx" ON "BankStatementAttachment"("organizationId", "contentHash");

CREATE UNIQUE INDEX "VendorPayment_organizationId_idempotencyKey_key" ON "VendorPayment"("organizationId", "idempotencyKey");
CREATE INDEX "VendorPayment_storeId_createdAt_idx" ON "VendorPayment"("storeId", "createdAt");
CREATE INDEX "VendorPayment_organizationId_vendorName_idx" ON "VendorPayment"("organizationId", "vendorName");
CREATE INDEX "VendorPayment_status_idx" ON "VendorPayment"("status");

ALTER TABLE "BankStatementAttachment" ADD CONSTRAINT "BankStatementAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatementAttachment" ADD CONSTRAINT "BankStatementAttachment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_bankStatementAttachmentId_fkey" FOREIGN KEY ("bankStatementAttachmentId") REFERENCES "BankStatementAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
