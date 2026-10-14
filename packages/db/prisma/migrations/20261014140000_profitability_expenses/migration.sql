-- SalesDaily: certified daily sales facts (gross profit already includes COGS)
CREATE TABLE "SalesDaily" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "insideSalesMinor" INTEGER NOT NULL,
    "fuelSalesMinor" INTEGER NOT NULL DEFAULT 0,
    "grossProfitMinor" INTEGER NOT NULL,
    "cashVarianceMinor" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDaily_pkey" PRIMARY KEY ("id")
);

-- OperatingExpense: draft never affects net profit; only posted rolls in
CREATE TABLE "OperatingExpense" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "incurredDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "vendorName" TEXT,
    "paymentMethod" TEXT,
    "receiptUrl" TEXT,
    "sourceReference" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "postedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingExpense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesDaily_storeId_businessDate_source_key" ON "SalesDaily"("storeId", "businessDate", "source");
CREATE INDEX "SalesDaily_storeId_businessDate_idx" ON "SalesDaily"("storeId", "businessDate");

CREATE UNIQUE INDEX "OperatingExpense_organizationId_idempotencyKey_key" ON "OperatingExpense"("organizationId", "idempotencyKey");
CREATE INDEX "OperatingExpense_storeId_status_incurredDate_idx" ON "OperatingExpense"("storeId", "status", "incurredDate");
CREATE INDEX "OperatingExpense_organizationId_incurredDate_idx" ON "OperatingExpense"("organizationId", "incurredDate");

ALTER TABLE "SalesDaily" ADD CONSTRAINT "SalesDaily_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperatingExpense" ADD CONSTRAINT "OperatingExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperatingExpense" ADD CONSTRAINT "OperatingExpense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
