import { api, type InventoryItem, type Invoice, type Membership } from "../api";

export type StoreRollup = {
  storeId: string;
  storeCode: string;
  storeName: string;
  role: string;
  skuCount: number | "UNKNOWN";
  eaches: number | "UNKNOWN";
  pendingApprovals: number | "UNKNOWN";
  postedInvoices: number | "UNKNOWN";
  netSales: "UNKNOWN";
  loadError?: string;
};

export type PortfolioSummary = {
  storeCount: number;
  rollups: StoreRollup[];
  totals: {
    skuCount: number | "UNKNOWN";
    eaches: number | "UNKNOWN";
    pendingApprovals: number | "UNKNOWN";
    postedInvoices: number | "UNKNOWN";
    netSales: "UNKNOWN";
    cashAtm: "UNKNOWN";
    lotterySettle: "UNKNOWN";
  };
  honesty: string;
};

function sumKnown(values: Array<number | "UNKNOWN">): number | "UNKNOWN" {
  if (values.some((v) => v === "UNKNOWN")) return "UNKNOWN";
  return (values as number[]).reduce((a, b) => a + b, 0);
}

async function rollupStore(
  token: string,
  m: Membership,
): Promise<StoreRollup> {
  try {
    const [inv, docs] = await Promise.all([
      api<{ items: InventoryItem[] }>(`/stores/${m.storeId}/inventory`, {
        token,
      }),
      api<{ invoices: Invoice[] }>(`/stores/${m.storeId}/invoices`, { token }),
    ]);
    const pending = docs.invoices.filter((i) =>
      ["proposed", "needs_review", "approved"].includes(i.status),
    ).length;
    const posted = docs.invoices.filter((i) => i.status === "posted").length;
    return {
      storeId: m.storeId,
      storeCode: m.storeCode,
      storeName: m.storeName,
      role: m.role,
      skuCount: inv.items.length,
      eaches: inv.items.reduce((s, i) => s + i.onHandEaches, 0),
      pendingApprovals: pending,
      postedInvoices: posted,
      netSales: "UNKNOWN",
    };
  } catch (e) {
    return {
      storeId: m.storeId,
      storeCode: m.storeCode,
      storeName: m.storeName,
      role: m.role,
      skuCount: "UNKNOWN",
      eaches: "UNKNOWN",
      pendingApprovals: "UNKNOWN",
      postedInvoices: "UNKNOWN",
      netSales: "UNKNOWN",
      loadError: e instanceof Error ? e.message : "Load failed",
    };
  }
}

export async function loadPortfolioSummary(
  token: string,
  memberships: Membership[],
): Promise<PortfolioSummary> {
  const rollups = await Promise.all(
    memberships.map((m) => rollupStore(token, m)),
  );
  return {
    storeCount: memberships.length,
    rollups,
    totals: {
      skuCount: sumKnown(rollups.map((r) => r.skuCount)),
      eaches: sumKnown(rollups.map((r) => r.eaches)),
      pendingApprovals: sumKnown(rollups.map((r) => r.pendingApprovals)),
      postedInvoices: sumKnown(rollups.map((r) => r.postedInvoices)),
      netSales: "UNKNOWN",
      cashAtm: "UNKNOWN",
      lotterySettle: "UNKNOWN",
    },
    honesty:
      "DEMO DATA honesty: inventory/invoice counts from pilot API when reachable. Net sales, cash/ATM, and lottery settle stay UNKNOWN — never shown as 0 — until certified POS/banking/lottery feeds exist.",
  };
}

export function formatMetric(v: number | "UNKNOWN"): string {
  return v === "UNKNOWN" ? "UNKNOWN" : String(v);
}
