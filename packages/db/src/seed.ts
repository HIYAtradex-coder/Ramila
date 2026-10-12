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

  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      actorUserId: owner.id,
      action: "seed.completed",
      entityType: "Organization",
      entityId: org.id,
      payloadJson: { label: "SYNTHETIC", stores: [storeA.code, storeB.code] },
    },
  });

  console.log("Seed complete (SYNTHETIC fixtures).");
  console.log("  owner@demo.hiya.local /", password);
  console.log("  receiver@demo.hiya.local /", password);
  console.log("  approval PIN: 123456");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
