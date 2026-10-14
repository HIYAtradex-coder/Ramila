-- Organization store-seat plan (base 1 included; +$100/mo per extra — MOCK billing)
CREATE TABLE "OrganizationPlan" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "includedStoreSeats" INTEGER NOT NULL DEFAULT 1,
    "additionalStorePriceMinor" INTEGER NOT NULL DEFAULT 10000,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingMode" TEXT NOT NULL DEFAULT 'MOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationPlan_organizationId_key" ON "OrganizationPlan"("organizationId");

ALTER TABLE "OrganizationPlan" ADD CONSTRAINT "OrganizationPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
