import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "@hiya/db";
import { buildApp } from "../src/app.js";
import { periodWindow } from "../src/services/period.js";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hiya:hiya_dev@localhost:5432/hiya_smartpos_test?schema=public";

const prisma = createPrismaClient(databaseUrl);

async function resetDb() {
  await prisma.operatingExpense.deleteMany();
  await prisma.salesDaily.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoiceDocument.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.storeMembership.deleteMany();
  await prisma.organizationPlan.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

describe("profitability + expenses", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let managerToken: string;
  let bookkeeperToken: string;
  let receiverToken: string;
  let storeAId: string;
  let storeBId: string;
  let orgId: string;
  let ownerId: string;

  before(async () => {
    await resetDb();
    const passwordHash = await bcrypt.hash("test-password-ok", 10);
    const approvalPinHash = await bcrypt.hash("654321", 10);

    const org = await prisma.organization.create({ data: { name: "P&L Org" } });
    orgId = org.id;

    const storeA = await prisma.store.create({
      data: {
        organizationId: org.id,
        code: "P-A",
        name: "Profit A",
        storeType: "fuel_cstore",
      },
    });
    const storeB = await prisma.store.create({
      data: {
        organizationId: org.id,
        code: "P-B",
        name: "Profit B",
        storeType: "cstore",
      },
    });
    storeAId = storeA.id;
    storeBId = storeB.id;

    const owner = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "owner-pl@test.local",
        displayName: "Owner",
        passwordHash,
        approvalPinHash,
      },
    });
    ownerId = owner.id;
    const manager = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "manager-pl@test.local",
        displayName: "Manager",
        passwordHash,
        approvalPinHash,
      },
    });
    const bookkeeper = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "books-pl@test.local",
        displayName: "Books",
        passwordHash,
        approvalPinHash,
      },
    });
    const receiver = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: "recv-pl@test.local",
        displayName: "Receiver",
        passwordHash,
        approvalPinHash,
      },
    });

    await prisma.storeMembership.createMany({
      data: [
        { userId: owner.id, storeId: storeA.id, role: "owner" },
        { userId: owner.id, storeId: storeB.id, role: "owner" },
        { userId: manager.id, storeId: storeA.id, role: "manager" },
        { userId: bookkeeper.id, storeId: storeA.id, role: "bookkeeper" },
        { userId: bookkeeper.id, storeId: storeB.id, role: "bookkeeper" },
        { userId: receiver.id, storeId: storeA.id, role: "receiver" },
      ],
    });

    app = await buildApp({ prisma, jwtSecret: "test-secret", logger: false });
    await app.ready();

    async function login(email: string) {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: "test-password-ok" },
      });
      assert.equal(res.statusCode, 200);
      return res.json().accessToken as string;
    }

    ownerToken = await login("owner-pl@test.local");
    managerToken = await login("manager-pl@test.local");
    bookkeeperToken = await login("books-pl@test.local");
    receiverToken = await login("recv-pl@test.local");
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("BIWEEKLY window is rolling 14 days ending on anchor day", () => {
    const anchor = new Date("2026-10-14T15:00:00.000Z");
    const w = periodWindow("BIWEEKLY", anchor);
    assert.equal(w.start.toISOString().slice(0, 10), "2026-10-01");
    assert.equal(w.end.toISOString().slice(0, 10), "2026-10-15");
    const days = (w.end.getTime() - w.start.getTime()) / 86_400_000;
    assert.equal(days, 14);
  });

  it("WEEKLY window is 7 days", () => {
    const w = periodWindow("WEEKLY", new Date("2026-10-14T00:00:00.000Z"));
    assert.equal((w.end.getTime() - w.start.getTime()) / 86_400_000, 7);
  });

  it("owner/manager/bookkeeper can draft; receiver cannot", async () => {
    const payload = {
      storeId: storeAId,
      category: "electricity",
      amountMinor: 12_500,
      incurredDate: "2026-10-10",
      description: "October electric",
      sourceType: "MANUAL",
      idempotencyKey: `draft-mgr-${Date.now()}`,
    };

    const mgr = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${managerToken}` },
      payload,
    });
    assert.equal(mgr.statusCode, 201);
    assert.equal(mgr.json().status, "draft");

    const recv = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${receiverToken}` },
      payload: { ...payload, idempotencyKey: `draft-recv-${Date.now()}` },
    });
    assert.equal(recv.statusCode, 403);
    assert.equal(recv.json().code, "capability_denied");
  });

  it("only owner or bookkeeper can post; manager cannot", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        storeId: storeAId,
        category: "rent_lease",
        amountMinor: 200_000,
        incurredDate: "2026-10-01",
        description: "October rent",
        sourceType: "MANUAL",
        idempotencyKey: `post-authz-${Date.now()}`,
      },
    });
    assert.equal(created.statusCode, 201);
    const id = created.json().id as string;

    const mgrPost = await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/post`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {},
    });
    assert.equal(mgrPost.statusCode, 403);

    const booksPost = await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/post`,
      headers: { authorization: `Bearer ${bookkeeperToken}` },
      payload: {},
    });
    assert.equal(booksPost.statusCode, 200);
    assert.equal(booksPost.json().status, "posted");
  });

  it("only owner can void with written reason", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        category: "bank_fees",
        amountMinor: 1500,
        incurredDate: "2026-10-05",
        description: "NSF fee",
        sourceType: "MANUAL",
        idempotencyKey: `void-authz-${Date.now()}`,
      },
    });
    const id = created.json().id as string;
    await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/post`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {},
    });

    const booksVoid = await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/void`,
      headers: { authorization: `Bearer ${bookkeeperToken}` },
      payload: { reason: "Duplicate entry" },
    });
    assert.equal(booksVoid.statusCode, 403);

    const noReason = await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/void`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {},
    });
    assert.equal(noReason.statusCode, 400);

    const ownerVoid = await app.inject({
      method: "POST",
      url: `/v1/expenses/${id}/void`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { reason: "Entered twice by mistake" },
    });
    assert.equal(ownerVoid.statusCode, 200);
    assert.equal(ownerVoid.json().status, "voided");
  });

  it("draft expenses never affect net profit; purchases not double-counted", async () => {
    await prisma.operatingExpense.deleteMany();
    await prisma.salesDaily.deleteMany();
    await prisma.invoiceDocument.deleteMany();

    const anchor = "2026-10-14";
    await prisma.salesDaily.create({
      data: {
        storeId: storeAId,
        businessDate: new Date("2026-10-12T00:00:00.000Z"),
        insideSalesMinor: 1_000_000,
        fuelSalesMinor: 500_000,
        grossProfitMinor: 300_000, // already includes COGS
        source: "DEMO_SEED",
        certified: false,
      },
    });

    // Posted inventory purchase — cash-flow only; must NOT reduce GP again
    await prisma.invoiceDocument.create({
      data: {
        organizationId: orgId,
        storeId: storeAId,
        vendorName: "Vendor X",
        invoiceNumber: "INV-PL-1",
        invoiceDate: new Date("2026-10-11T00:00:00.000Z"),
        status: "posted",
        totalMinor: 250_000,
        contentHash: `hash-pl-${Date.now()}`,
        postedAt: new Date("2026-10-11T12:00:00.000Z"),
        approvedById: ownerId,
      },
    });

    const draft = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        category: "store_supplies",
        amountMinor: 50_000,
        incurredDate: "2026-10-13",
        description: "Draft bags",
        sourceType: "MANUAL",
        idempotencyKey: `draft-net-${Date.now()}`,
      },
    });
    assert.equal(draft.statusCode, 201);

    const posted = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        storeId: storeAId,
        category: "internet_phone",
        amountMinor: 20_000,
        incurredDate: "2026-10-10",
        description: "Fiber",
        sourceType: "MANUAL",
        idempotencyKey: `posted-net-${Date.now()}`,
      },
    });
    const expenseId = posted.json().id as string;
    await app.inject({
      method: "POST",
      url: `/v1/expenses/${expenseId}/post`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {},
    });

    const report = await app.inject({
      method: "GET",
      url: `/v1/reports/profitability?period=BIWEEKLY&locationId=${storeAId}&anchor=${anchor}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(report.statusCode, 200);
    const body = report.json();

    assert.equal(body.summary.totalSalesMinor, 1_500_000);
    assert.equal(body.summary.grossProfitMinor, 300_000);
    assert.equal(body.summary.postedPurchasesMinor, 250_000);
    assert.equal(body.summary.postedPurchaseInvoiceCount, 1);
    // Net = GP − posted opex only (20_000). Draft 50_000 excluded. Purchases NOT subtracted.
    assert.equal(body.summary.totalOperatingExpensesMinor, 20_000);
    assert.equal(body.summary.netProfitBeforeTaxMinor, 280_000);
    assert.equal(body.counts.draftExpenses, 1);
    assert.equal(body.counts.postedExpenses, 1);
    assert.equal(body.summary.grossMarginPct, 20);
    // net margin = 280000/1500000 * 100 ≈ 18.67
    assert.equal(body.summary.netMarginPct, 18.67);
    assert.ok(
      body.dataQuality.honestyTags.includes("PURCHASES_CASHFLOW_ONLY_NOT_COGS"),
    );
    assert.match(body.accountingNotice, /never subtracted again/i);
  });

  it("marks incomplete when sales feed is missing (not verified zero)", async () => {
    await prisma.salesDaily.deleteMany({ where: { storeId: storeBId } });
    const report = await app.inject({
      method: "GET",
      url: `/v1/reports/profitability?period=MONTHLY&locationId=${storeBId}&anchor=2026-10-14`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(report.statusCode, 200);
    const body = report.json();
    assert.equal(body.summary.totalSalesMinor, null);
    assert.equal(body.summary.grossProfitMinor, null);
    assert.equal(body.summary.netProfitBeforeTaxMinor, null);
    assert.equal(body.dataQuality.salesDataComplete, false);
    assert.ok(body.dataQuality.incompleteReasons.length > 0);
  });

  it("all-stores comparison includes accessible stores", async () => {
    await prisma.salesDaily.create({
      data: {
        storeId: storeBId,
        businessDate: new Date("2026-10-13T00:00:00.000Z"),
        insideSalesMinor: 200_000,
        fuelSalesMinor: 0,
        grossProfitMinor: 40_000,
        source: "DEMO_SEED",
        certified: false,
      },
    });

    const report = await app.inject({
      method: "GET",
      url: `/v1/reports/profitability?period=WEEKLY&anchor=2026-10-14`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(report.statusCode, 200);
    const body = report.json();
    assert.equal(body.scope.mode, "all_stores");
    assert.ok(body.stores.length >= 2);
    assert.ok(body.stores.every((s: { locationId: string }) => s.locationId));
  });

  it("receiver cannot read profitability", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/reports/profitability?period=WEEKLY&locationId=${storeAId}`,
      headers: { authorization: `Bearer ${receiverToken}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it("expense create is idempotent on idempotencyKey", async () => {
    const key = `idem-exp-${Date.now()}`;
    const payload = {
      storeId: storeAId,
      category: "cleaning_pest_control",
      amountMinor: 7500,
      incurredDate: "2026-10-08",
      description: "Pest visit",
      sourceType: "MANUAL",
      idempotencyKey: key,
    };
    const a = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload,
    });
    const b = await app.inject({
      method: "POST",
      url: "/v1/expenses",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload,
    });
    assert.equal(a.statusCode, 201);
    assert.equal(b.statusCode, 201);
    assert.equal(a.json().id, b.json().id);
  });
});
