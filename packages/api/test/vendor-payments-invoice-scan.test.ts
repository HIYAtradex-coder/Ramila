import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "@hiya/db";
import { buildApp } from "../src/app.js";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hiya:hiya_dev@localhost:5432/hiya_smartpos_test?schema=public";

const prisma = createPrismaClient(databaseUrl);

/** Tiny 1x1 PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function resetDb() {
  await prisma.vendorPayment.deleteMany();
  await prisma.bankStatementAttachment.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoiceDocument.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.storeMembership.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organizationPlan.deleteMany().catch(() => undefined);
  await prisma.organization.deleteMany();
}

describe("Vendor payments + invoice scan + bank statements", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let receiverToken: string;
  let storeAId: string;
  let orgId: string;

  before(async () => {
    await resetDb();
    const passwordHash = await bcrypt.hash("test-password-ok", 10);
    const approvalPinHash = await bcrypt.hash("654321", 10);

    const org = await prisma.organization.create({ data: { name: "Pay Scan Org" } });
    orgId = org.id;
    const storeA = await prisma.store.create({
      data: {
        organizationId: org.id,
        code: "P-A",
        name: "Pay Store A",
        storeType: "fuel_cstore",
      },
    });
    storeAId = storeA.id;

    const owner = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "owner-pay@test.local",
        displayName: "Owner",
        passwordHash,
        approvalPinHash,
      },
    });
    const receiver = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "receiver-pay@test.local",
        displayName: "Receiver",
        passwordHash,
        approvalPinHash,
      },
    });

    await prisma.storeMembership.createMany({
      data: [
        { userId: owner.id, storeId: storeA.id, role: "owner" },
        { userId: receiver.id, storeId: storeA.id, role: "receiver" },
      ],
    });

    await prisma.inventoryItem.create({
      data: {
        storeId: storeA.id,
        skuCode: "SKU-BASE",
        name: "Base",
        onHandEaches: 4,
      },
    });

    app = await buildApp({ prisma, jwtSecret: "test-secret", logger: false });
    await app.ready();

    ownerToken = (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "owner-pay@test.local", password: "test-password-ok" },
      })
    ).json().accessToken;

    receiverToken = (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "receiver-pay@test.local",
          password: "test-password-ok",
        },
      })
    ).json().accessToken;
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("AI invoice scan proposes but does not post inventory", async () => {
    const before = await prisma.inventoryItem.findFirst({
      where: { storeId: storeAId, skuCode: "SKU-BASE" },
    });
    assert.equal(before?.onHandEaches, 4);

    const scan = await app.inject({
      method: "POST",
      url: "/invoices/scan/propose",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        fileName: "handwritten-invoice.jpg",
        mimeType: "image/jpeg",
        contentBase64: TINY_PNG_B64,
        handwriting: true,
        captureSource: "camera",
        vendorHint: "Corner Market Supply",
      },
    });
    assert.equal(scan.statusCode, 201, scan.body);
    const body = scan.json();
    assert.equal(body.inventoryPosted, false);
    assert.equal(body.moneyPosted, false);
    assert.equal(body.requiresHumanReview, true);
    assert.equal(body.aiMode, "DEMO_HANDWRITING");
    assert.ok(["proposed", "needs_review"].includes(body.status));

    const afterScan = await prisma.inventoryItem.findFirst({
      where: { storeId: storeAId, skuCode: "SKU-BASE" },
    });
    assert.equal(afterScan?.onHandEaches, 4, "scan must not change stock");

    const movements = await prisma.inventoryMovement.count({
      where: { sourceId: body.invoiceId },
    });
    assert.equal(movements, 0);

    const approve = await app.inject({
      method: "POST",
      url: `/invoices/${body.invoiceId}/approve`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        approvalPin: "654321",
        idempotencyKey: `scan-approve-${body.invoiceId}`,
      },
    });
    assert.equal(approve.statusCode, 200);
    assert.equal(approve.json().inventoryPosted, true);
    assert.equal(approve.json().humanApproved, true);

    const posted = await prisma.invoiceDocument.findFirst({
      where: { id: body.invoiceId },
    });
    assert.equal(posted?.status, "posted");
  });

  it("receiver can scan-propose but cannot approve", async () => {
    const scan = await app.inject({
      method: "POST",
      url: "/invoices/scan/propose",
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: {
        storeId: storeAId,
        fileName: "print-invoice.png",
        mimeType: "image/png",
        contentBase64: TINY_PNG_B64,
        handwriting: false,
        captureSource: "mobile",
      },
    });
    assert.equal(scan.statusCode, 201);
    assert.equal(scan.json().inventoryPosted, false);

    const approve = await app.inject({
      method: "POST",
      url: `/invoices/${scan.json().invoiceId}/approve`,
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: {
        approvalPin: "654321",
        idempotencyKey: "rcv-scan-approve",
      },
    });
    assert.equal(approve.statusCode, 403);
    assert.equal(approve.json().code, "capability_denied");
  });

  it("records cash and check vendor payments with append-only audit", async () => {
    const cash = await app.inject({
      method: "POST",
      url: "/vendor-payments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "Demo Vendor Co",
        method: "cash",
        amountMinor: 2500,
        memo: "COD delivery",
        idempotencyKey: "pay-cash-1",
      },
    });
    assert.equal(cash.statusCode, 201, cash.body);
    assert.equal(cash.json().method, "cash");
    assert.equal(cash.json().moneyPostedByAi, false);
    assert.match(cash.json().honesty, /no bank rail/i);

    const check = await app.inject({
      method: "POST",
      url: "/vendor-payments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "Demo Vendor Co",
        method: "check",
        amountMinor: 10999,
        checkNumber: "10042",
        checkDate: "2026-10-14",
        idempotencyKey: "pay-check-1",
      },
    });
    assert.equal(check.statusCode, 201, check.body);
    assert.equal(check.json().checkNumber, "10042");

    const missingCheckFields = await app.inject({
      method: "POST",
      url: "/vendor-payments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "Demo Vendor Co",
        method: "check",
        amountMinor: 100,
        idempotencyKey: "pay-check-bad",
      },
    });
    assert.equal(missingCheckFields.statusCode, 400);

    const list = await app.inject({
      method: "GET",
      url: `/stores/${storeAId}/vendor-payments`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(list.statusCode, 200);
    assert.ok(list.json().payments.length >= 2);

    const audits = await prisma.auditEvent.findMany({
      where: {
        organizationId: orgId,
        action: "vendor_payment.recorded",
        storeId: storeAId,
      },
    });
    assert.ok(audits.length >= 2);
    const cashAudit = audits.find((a) => {
      const p = a.payloadJson as { cashPayout?: boolean; method?: string };
      return p.cashPayout === true || p.method === "cash";
    });
    assert.ok(cashAudit, "cash payout must be audited");

    const denied = await app.inject({
      method: "POST",
      url: "/vendor-payments",
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: {
        storeId: storeAId,
        vendorName: "X",
        method: "cash",
        amountMinor: 1,
        idempotencyKey: "pay-denied",
      },
    });
    assert.equal(denied.statusCode, 403);
  });

  it("uploads bank statement with audit; AI propose does not post money", async () => {
    const sync = await app.inject({
      method: "GET",
      url: "/bank-sync/status",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(sync.statusCode, 200);
    assert.equal(sync.json().connected, false);
    assert.equal(sync.json().mode, "MOCK");

    const payments = await app.inject({
      method: "GET",
      url: `/stores/${storeAId}/vendor-payments`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const paymentId = payments.json().payments[0]?.id as string;

    const upload = await app.inject({
      method: "POST",
      url: "/bank-statements",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        fileName: "sept-statement.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4 demo statement").toString("base64"),
        periodLabel: "2026-09",
        note: "Manual upload",
        linkedVendorPaymentId: paymentId,
      },
    });
    assert.equal(upload.statusCode, 201, upload.body);
    assert.equal(upload.json().bankSyncConnected, false);
    assert.equal(upload.json().linkedVendorPaymentId, paymentId);

    const uploadAudits = await prisma.auditEvent.findMany({
      where: {
        organizationId: orgId,
        action: "bank_statement.uploaded",
        entityId: upload.json().id,
      },
    });
    assert.equal(uploadAudits.length, 1);

    const propose = await app.inject({
      method: "POST",
      url: `/bank-statements/${upload.json().id}/propose-matches`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(propose.statusCode, 200);
    assert.equal(propose.json().moneyPosted, false);
    assert.equal(propose.json().expensesPosted, false);
    assert.equal(propose.json().requiresHumanReview, true);

    const list = await app.inject({
      method: "GET",
      url: `/stores/${storeAId}/bank-statements`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().bankSync.connected, false);
    assert.ok(list.json().attachments.length >= 1);

    const receiverDenied = await app.inject({
      method: "POST",
      url: "/bank-statements",
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: {
        storeId: storeAId,
        fileName: "nope.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4 denied").toString("base64"),
      },
    });
    assert.equal(receiverDenied.statusCode, 403);
    assert.equal(receiverDenied.json().code, "capability_denied");
  });
});
