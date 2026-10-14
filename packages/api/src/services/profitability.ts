import { ACCOUNTING_NOTICE, type ProfitabilityPeriod } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import { capabilitiesForRole, hasCapability } from "../lib/capabilities.js";
import { AuthzError, type ActorContext, requireStoreCapability } from "./authz.js";
import { parseAnchor, periodWindow } from "./period.js";

export type ProfitabilityReport = {
  period: {
    kind: ProfitabilityPeriod;
    start: string;
    endExclusive: string;
    anchor: string;
  };
  scope: {
    mode: "single_store" | "all_stores";
    locationId: string | null;
    storeIds: string[];
  };
  summary: {
    totalSalesMinor: number | null;
    postedPurchasesMinor: number;
    postedPurchaseInvoiceCount: number;
    grossProfitMinor: number | null;
    grossMarginPct: number | null;
    totalOperatingExpensesMinor: number;
    netProfitBeforeTaxMinor: number | null;
    netMarginPct: number | null;
  };
  expenseBreakdown: Array<{
    category: string;
    amountMinor: number;
    count: number;
  }>;
  counts: {
    postedExpenses: number;
    draftExpenses: number;
    voidedExpenses: number;
  };
  stores: Array<{
    locationId: string;
    storeCode: string;
    storeName: string;
    totalSalesMinor: number | null;
    grossProfitMinor: number | null;
    postedPurchasesMinor: number;
    operatingExpensesMinor: number;
    netProfitBeforeTaxMinor: number | null;
    salesDataComplete: boolean;
  }>;
  dataQuality: {
    salesDataComplete: boolean;
    expenseFeedConnected: false;
    incompleteReasons: string[];
    honestyTags: string[];
  };
  accountingNotice: string;
};

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function dateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build owner profitability report.
 *
 * Accounting rules (strict):
 * - Gross profit = sum(SalesDaily.grossProfitMinor) — already includes COGS
 * - Posted purchases shown separately; NEVER subtracted again for GP/net
 * - Operating expenses = sum of POSTED expenses only
 * - Net = gross − operating expenses
 * - Draft expenses never affect net
 * - Missing sales rows ⇒ incomplete (null sales/GP/net), not verified zeros
 */
export async function buildProfitabilityReport(
  db: PrismaClient,
  actor: ActorContext,
  opts: {
    period: ProfitabilityPeriod;
    locationId?: string;
    anchor?: string;
  },
): Promise<ProfitabilityReport> {
  const memberships = await db.storeMembership.findMany({
    where: {
      userId: actor.userId,
      active: true,
      store: { organizationId: actor.organizationId, active: true },
      user: { active: true, organizationId: actor.organizationId },
    },
    include: { store: true },
  });

  // Prefer explicit capability gate via requireStoreCapability for single-store
  let storeIds: string[];
  if (opts.locationId) {
    await requireStoreCapability(
      db,
      actor,
      opts.locationId,
      "report:profitability",
    );
    storeIds = [opts.locationId];
  } else {
    storeIds = memberships
      .filter((m) =>
        hasCapability(capabilitiesForRole(m.role), "report:profitability"),
      )
      .map((m) => m.storeId);
    if (storeIds.length === 0) {
      throw new AuthzError(
        "No stores with profitability report access",
        403,
        "capability_denied",
      );
    }
  }

  let anchorDate: Date;
  try {
    anchorDate = parseAnchor(opts.anchor);
  } catch {
    throw new AuthzError("Invalid anchor date", 400, "validation_error");
  }
  const window = periodWindow(opts.period, anchorDate);

  const stores = await db.store.findMany({
    where: {
      id: { in: storeIds },
      organizationId: actor.organizationId,
    },
    orderBy: { code: "asc" },
  });

  const [salesRows, postedInvoices, expenses] = await Promise.all([
    db.salesDaily.findMany({
      where: {
        storeId: { in: storeIds },
        businessDate: { gte: window.start, lt: window.end },
      },
    }),
    db.invoiceDocument.findMany({
      where: {
        organizationId: actor.organizationId,
        storeId: { in: storeIds },
        status: "posted",
        OR: [
          { postedAt: { gte: window.start, lt: window.end } },
          {
            postedAt: null,
            invoiceDate: { gte: window.start, lt: window.end },
          },
        ],
      },
    }),
    db.operatingExpense.findMany({
      where: {
        organizationId: actor.organizationId,
        storeId: { in: storeIds },
        incurredDate: { gte: window.start, lt: window.end },
      },
    }),
  ]);

  const incompleteReasons: string[] = [];
  const honestyTags: string[] = [];

  const salesByStore = new Map<string, { sales: number; gp: number; rows: number; certified: number; demo: number }>();
  for (const id of storeIds) {
    salesByStore.set(id, { sales: 0, gp: 0, rows: 0, certified: 0, demo: 0 });
  }
  for (const row of salesRows) {
    const bucket = salesByStore.get(row.storeId)!;
    bucket.sales += row.insideSalesMinor + row.fuelSalesMinor;
    bucket.gp += row.grossProfitMinor;
    bucket.rows += 1;
    if (row.certified) bucket.certified += 1;
    if (row.source.startsWith("DEMO") || !row.certified) bucket.demo += 1;
  }

  const purchasesByStore = new Map<string, { minor: number; count: number }>();
  for (const id of storeIds) purchasesByStore.set(id, { minor: 0, count: 0 });
  for (const inv of postedInvoices) {
    const bucket = purchasesByStore.get(inv.storeId)!;
    bucket.minor += inv.totalMinor;
    bucket.count += 1;
  }

  const postedExpByStore = new Map<string, number>();
  const categoryTotals = new Map<string, { amountMinor: number; count: number }>();
  let postedExpenseCount = 0;
  let draftExpenseCount = 0;
  let voidedExpenseCount = 0;
  for (const id of storeIds) postedExpByStore.set(id, 0);

  for (const exp of expenses) {
    if (exp.status === "draft") {
      draftExpenseCount += 1;
      continue;
    }
    if (exp.status === "voided") {
      voidedExpenseCount += 1;
      continue;
    }
    if (exp.status !== "posted") continue;
    postedExpenseCount += 1;
    postedExpByStore.set(
      exp.storeId,
      (postedExpByStore.get(exp.storeId) ?? 0) + exp.amountMinor,
    );
    const cat = categoryTotals.get(exp.category) ?? { amountMinor: 0, count: 0 };
    cat.amountMinor += exp.amountMinor;
    cat.count += 1;
    categoryTotals.set(exp.category, cat);
  }

  let anySalesMissing = false;
  let anyDemoSales = false;
  let anyCertified = false;
  for (const id of storeIds) {
    const s = salesByStore.get(id)!;
    if (s.rows === 0) anySalesMissing = true;
    if (s.demo > 0) anyDemoSales = true;
    if (s.certified > 0) anyCertified = true;
  }

  if (anySalesMissing) {
    incompleteReasons.push(
      "One or more stores have no SalesDaily rows in this period — sales/GP/net marked incomplete, not zero",
    );
  }
  if (anyDemoSales) {
    honestyTags.push("DEMO_OR_UNCERTIFIED_SALES");
  }
  if (!anyCertified && salesRows.length > 0) {
    honestyTags.push("SALES_NOT_POS_CERTIFIED");
  }
  honestyTags.push("NO_BANK_CARD_EXPENSE_FEED");
  honestyTags.push("PURCHASES_CASHFLOW_ONLY_NOT_COGS");

  const storeReports = stores.map((store) => {
    const sales = salesByStore.get(store.id)!;
    const purchases = purchasesByStore.get(store.id)!;
    const opex = postedExpByStore.get(store.id) ?? 0;
    const salesComplete = sales.rows > 0;
    const totalSalesMinor = salesComplete ? sales.sales : null;
    const grossProfitMinor = salesComplete ? sales.gp : null;
    const netProfitBeforeTaxMinor =
      grossProfitMinor === null ? null : grossProfitMinor - opex;
    return {
      locationId: store.id,
      storeCode: store.code,
      storeName: store.name,
      totalSalesMinor,
      grossProfitMinor,
      postedPurchasesMinor: purchases.minor,
      operatingExpensesMinor: opex,
      netProfitBeforeTaxMinor,
      salesDataComplete: salesComplete,
    };
  });

  const salesDataComplete = storeReports.every((s) => s.salesDataComplete);
  const totalSalesMinor = salesDataComplete
    ? storeReports.reduce((sum, s) => sum + (s.totalSalesMinor ?? 0), 0)
    : null;
  const grossProfitMinor = salesDataComplete
    ? storeReports.reduce((sum, s) => sum + (s.grossProfitMinor ?? 0), 0)
    : null;
  const totalOperatingExpensesMinor = storeReports.reduce(
    (sum, s) => sum + s.operatingExpensesMinor,
    0,
  );
  const postedPurchasesMinor = storeReports.reduce(
    (sum, s) => sum + s.postedPurchasesMinor,
    0,
  );
  const postedPurchaseInvoiceCount = postedInvoices.length;
  const netProfitBeforeTaxMinor =
    grossProfitMinor === null
      ? null
      : grossProfitMinor - totalOperatingExpensesMinor;

  if (draftExpenseCount > 0) {
    honestyTags.push(`DRAFT_EXPENSES_EXCLUDED:${draftExpenseCount}`);
  }

  return {
    period: {
      kind: window.period,
      start: dateIso(window.start),
      endExclusive: dateIso(window.end),
      anchor: dateIso(window.anchor),
    },
    scope: {
      mode: opts.locationId ? "single_store" : "all_stores",
      locationId: opts.locationId ?? null,
      storeIds,
    },
    summary: {
      totalSalesMinor,
      postedPurchasesMinor,
      postedPurchaseInvoiceCount,
      grossProfitMinor,
      grossMarginPct:
        totalSalesMinor === null || grossProfitMinor === null
          ? null
          : pct(grossProfitMinor, totalSalesMinor),
      totalOperatingExpensesMinor,
      netProfitBeforeTaxMinor,
      netMarginPct:
        totalSalesMinor === null || netProfitBeforeTaxMinor === null
          ? null
          : pct(netProfitBeforeTaxMinor, totalSalesMinor),
    },
    expenseBreakdown: [...categoryTotals.entries()]
      .map(([category, v]) => ({
        category,
        amountMinor: v.amountMinor,
        count: v.count,
      }))
      .sort((a, b) => b.amountMinor - a.amountMinor),
    counts: {
      postedExpenses: postedExpenseCount,
      draftExpenses: draftExpenseCount,
      voidedExpenses: voidedExpenseCount,
    },
    stores: storeReports,
    dataQuality: {
      salesDataComplete,
      expenseFeedConnected: false,
      incompleteReasons,
      honestyTags,
    },
    accountingNotice: ACCOUNTING_NOTICE,
  };
}
