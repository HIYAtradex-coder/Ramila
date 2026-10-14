/**
 * Synthetic demo fixtures for local development only.
 * Labels: SYNTHETIC — not real store/vendor data.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_PASSWORD ?? "demo-pass-change-me";
  const passwordHash = await bcrypt.hash(password, 10);
  const approvalPinHash = await bcrypt.hash("123456", 10);

  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "HIYA Demo Portfolio (SYNTHETIC)",
    },
  });

  const storeA = await prisma.store.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEMO-01" },
    },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000011",
      organizationId: org.id,
      code: "DEMO-01",
      name: "Demo Fuel C-Store #1",
      storeType: "fuel_cstore",
      timezone: "America/New_York",
      configJson: { fuelEnabled: true, ageRestrictedSales: true },
    },
  });

  const storeB = await prisma.store.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "DEMO-02" },
    },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000012",
      organizationId: org.id,
      code: "DEMO-02",
      name: "Demo Sandwich QSR #2",
      storeType: "sandwich_qsr",
      timezone: "America/Chicago",
      configJson: { fuelEnabled: false, recipesEnabled: true },
    },
  });

  const owner = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: org.id,
        email: "owner@demo.hiya.local",
      },
    },
    update: { passwordHash, approvalPinHash },
    create: {
      id: "00000000-0000-4000-8000-000000000021",
      organizationId: org.id,
      email: "owner@demo.hiya.local",
      displayName: "Demo Owner",
      passwordHash,
      approvalPinHash,
    },
  });

  const receiver = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: org.id,
        email: "receiver@demo.hiya.local",
      },
    },
    update: { passwordHash, approvalPinHash },
    create: {
      id: "00000000-0000-4000-8000-000000000022",
      organizationId: org.id,
      email: "receiver@demo.hiya.local",
      displayName: "Demo Receiver",
      passwordHash,
      approvalPinHash,
    },
  });

  for (const [userId, storeId, role] of [
    [owner.id, storeA.id, "owner"],
    [owner.id, storeB.id, "owner"],
    [receiver.id, storeA.id, "receiver"],
  ] as const) {
    await prisma.storeMembership.upsert({
      where: { userId_storeId: { userId, storeId } },
      update: { role, active: true },
      create: { userId, storeId, role, active: true },
    });
  }

  for (const [sku, name, qty] of [
    ["SKU-WATER-24", "Bottled Water 24pk", 40],
    ["SKU-CHIPS-01", "Potato Chips Original", 25],
    ["SKU-SODA-12", "Cola 12oz Can", 120],
  ] as const) {
    await prisma.inventoryItem.upsert({
      where: { storeId_skuCode: { storeId: storeA.id, skuCode: sku } },
      update: { name, onHandEaches: qty },
      create: {
        storeId: storeA.id,
        skuCode: sku,
        name,
        onHandEaches: qty,
      },
    });
  }

  await prisma.organizationPlan.upsert({
    where: { organizationId: org.id },
    update: {
      includedStoreSeats: 1,
      additionalStorePriceMinor: 10_000,
      billingMode: "MOCK",
    },
    create: {
      organizationId: org.id,
      includedStoreSeats: 1,
      additionalStorePriceMinor: 10_000,
      currency: "USD",
      billingMode: "MOCK",
    },
  });

  // DEMO SalesDaily — labeled uncertified; never claim POS-certified without a real feed
  const today = new Date();
  const day = (offset: number) => {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset),
    );
    return d;
  };

  for (const [store, inside, fuel, gp, offset] of [
    [storeA.id, 420_000, 880_000, 210_000, 1],
    [storeA.id, 390_000, 810_000, 195_000, 2],
    [storeB.id, 260_000, 0, 78_000, 1],
  ] as const) {
    await prisma.salesDaily.upsert({
      where: {
        storeId_businessDate_source: {
          storeId: store,
          businessDate: day(offset),
          source: "DEMO_SEED",
        },
      },
      update: {
        insideSalesMinor: inside,
        fuelSalesMinor: fuel,
        grossProfitMinor: gp,
        certified: false,
      },
      create: {
        storeId: store,
        businessDate: day(offset),
        insideSalesMinor: inside,
        fuelSalesMinor: fuel,
        grossProfitMinor: gp,
        source: "DEMO_SEED",
        certified: false,
      },
    });
  }

  await prisma.operatingExpense.upsert({
    where: {
      organizationId_idempotencyKey: {
        organizationId: org.id,
        idempotencyKey: "seed-expense-rent-demo01",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      storeId: storeA.id,
      category: "rent_lease",
      amountMinor: 350_000,
      incurredDate: day(3),
      description: "SYNTHETIC demo rent (posted)",
      sourceType: "MANUAL",
      idempotencyKey: "seed-expense-rent-demo01",
      createdById: owner.id,
      status: "posted",
      postedAt: new Date(),
      postedById: owner.id,
      vendorName: "Demo Landlord LLC",
    },
  });

  await prisma.operatingExpense.upsert({
    where: {
      organizationId_idempotencyKey: {
        organizationId: org.id,
        idempotencyKey: "seed-expense-draft-supplies",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      storeId: storeA.id,
      category: "store_supplies",
      amountMinor: 4_500,
      incurredDate: day(0),
      description: "SYNTHETIC draft bags — waiting for post",
      sourceType: "MANUAL",
      idempotencyKey: "seed-expense-draft-supplies",
      createdById: owner.id,
      status: "draft",
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      actorUserId: owner.id,
      action: "seed.completed",
      entityType: "Organization",
      entityId: org.id,
      payloadJson: {
        label: "SYNTHETIC",
        stores: [storeA.code, storeB.code],
        plan: "1 included + 1 extra MOCK billed ($100/mo)",
        profitability: "DEMO_SEED SalesDaily + sample expenses (uncertified)",
      },
    },
  });

  console.log("Seed complete (SYNTHETIC fixtures).");
  console.log("  owner@demo.hiya.local /", password);
  console.log("  receiver@demo.hiya.local /", password);
  console.log("  approval PIN: 123456");
  console.log("  plan: 1 store included; DEMO-02 is +$100/mo MOCK billing");
  console.log("  profitability: DEMO_SEED sales + sample expenses (not POS-certified)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
