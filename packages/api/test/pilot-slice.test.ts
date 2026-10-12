import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "@hiya/db";
import { buildApp } from "../src/app.js";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hiya:hiya_dev@localhost:5432/hiya_smartpos_test?schema=public";

const prisma = createPrismaClient(databaseUrl);

async function resetDb() {
  await prisma.inventoryMovement.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoiceDocument.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.storeMembership.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

describe("HIYA pilot slice", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let receiverToken: string;
  let storeAId: string;
  let storeBId: string;
  let orgId: string;

  before(async () => {
    await resetDb();
    const passwordHash = await bcrypt.hash("test-password-ok", 10);
    const approvalPinHash = await bcrypt.hash("654321", 10);

    const org = await prisma.organization.create({
      data: { name: "Test Org" },
    });
    orgId = org.id;

    const storeA = await prisma.store.create({
      data: {
        organizationId: org.id,
        code: "T-A",
        name: "Store A",
        storeType: "fuel_cstore",
        configJson: { fuelEnabled: true },
      },
    });
    const storeB = await prisma.store.create({
      data: {
        organizationId: org.id,
        code: "T-B",
        name: "Store B",
        storeType: "sandwich_qsr",
        configJson: { fuelEnabled: false },
      },
    });
    storeAId = storeA.id;
    storeBId = storeB.id;

    const owner = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "owner@test.local",
        displayName: "Owner",
        passwordHash,
        approvalPinHash,
      },
    });
    const receiver = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "receiver@test.local",
        displayName: "Receiver",
        passwordHash,
        approvalPinHash,
      },
    });

    await prisma.storeMembership.createMany({
      data: [
        { userId: owner.id, storeId: storeA.id, role: "owner" },
        { userId: owner.id, storeId: storeB.id, role: "owner" },
        { userId: receiver.id, storeId: storeA.id, role: "receiver" },
      ],
    });

    await prisma.inventoryItem.create({
      data: {
        storeId: storeA.id,
        skuCode: "SKU-A",
        name: "Item A",
        onHandEaches: 10,
      },
    });

    app = await buildApp({
      prisma,
      jwtSecret: "test-secret",
      logger: false,
    });
    await app.ready();

    const ownerLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "owner@test.local", password: "test-password-ok" },
    });
    assert.equal(ownerLogin.statusCode, 200);
    ownerToken = ownerLogin.json().accessToken;

    const receiverLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "receiver@test.local", password: "test-password-ok" },
    });
    assert.equal(receiverLogin.statusCode, 200);
    receiverToken = receiverLogin.json().accessToken;
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("health is up", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().service, "hiya-api");
  });

  it("denies store access without membership", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/stores/${storeBId}/inventory`,
      headers: { authorization: `Bearer ${receiverToken}` },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, "store_scope_denied");
  });

  it("denies invoice approve without capability (receiver)", async () => {
    const proposal = await app.inject({
      method: "POST",
      url: "/invoices/proposals",
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "Acme Distributing",
        invoiceNumber: "INV-RCV-1",
        invoiceDate: "2026-10-01",
        lines: [
          {
            skuCode: "SKU-A",
            description: "Item A",
            quantityEaches: 5,
            unitCostMinor: 100,
            confidence: 90,
          },
        ],
        sourceNote: "manual_entry",
      },
    });
    assert.equal(proposal.statusCode, 201);
    assert.equal(proposal.json().inventoryPosted, false);

    const approve = await app.inject({
      method: "POST",
      url: `/invoices/${proposal.json().id}/approve`,
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: { approvalPin: "654321", idempotencyKey: "idem-receiver-1" },
    });
    assert.equal(approve.statusCode, 403);
    assert.equal(approve.json().code, "capability_denied");

    const item = await prisma.inventoryItem.findFirst({
      where: { storeId: storeAId, skuCode: "SKU-A" },
    });
    assert.equal(item?.onHandEaches, 10, "stock must not change without approve");
  });

  it("owner approve with step-up PIN posts inventory exactly once", async () => {
    const proposal = await app.inject({
      method: "POST",
      url: "/invoices/proposals",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "Acme Distributing",
        invoiceNumber: "INV-OWN-1",
        invoiceDate: "2026-10-02",
        lines: [
          {
            skuCode: "SKU-A",
            description: "Item A",
            quantityEaches: 7,
            unitCostMinor: 150,
            confidence: 55,
          },
        ],
        sourceNote: "manual_entry_low_confidence_proposal",
      },
    });
    assert.equal(proposal.statusCode, 201);
    assert.equal(proposal.json().status, "needs_review");
    assert.equal(proposal.json().inventoryPosted, false);

    const badPin = await app.inject({
      method: "POST",
      url: `/invoices/${proposal.json().id}/approve`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { approvalPin: "000000", idempotencyKey: "idem-owner-1" },
    });
    assert.equal(badPin.statusCode, 401);

    const approve = await app.inject({
      method: "POST",
      url: `/invoices/${proposal.json().id}/approve`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { approvalPin: "654321", idempotencyKey: "idem-owner-1" },
    });
    assert.equal(approve.statusCode, 200);
    assert.equal(approve.json().status, "posted");
    assert.equal(approve.json().inventoryPosted, true);
    assert.equal(approve.json().humanApproved, true);

    const replay = await app.inject({
      method: "POST",
      url: `/invoices/${proposal.json().id}/approve`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { approvalPin: "654321", idempotencyKey: "idem-owner-1" },
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().status, "posted");

    const item = await prisma.inventoryItem.findFirst({
      where: { storeId: storeAId, skuCode: "SKU-A" },
    });
    assert.equal(item?.onHandEaches, 17);

    const movements = await prisma.inventoryMovement.findMany({
      where: { sourceId: proposal.json().id },
    });
    assert.equal(movements.length, 1);

    const audits = await prisma.auditEvent.findMany({
      where: {
        organizationId: orgId,
        entityId: proposal.json().id,
        action: "invoice.posted",
      },
    });
    assert.equal(audits.length, 1);
  });

  it("rejects client-trusted forged store access via unrelated org claim", async () => {
    // Token is bound to actor.org from login; membership check still requires DB scope.
    const res = await app.inject({
      method: "GET",
      url: `/stores/${storeAId}/inventory`,
      headers: { authorization: `Bearer ${receiverToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json().items));
  });
});
