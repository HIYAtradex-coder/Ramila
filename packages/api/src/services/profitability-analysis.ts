import type { ProfitabilityReport } from "./profitability.js";

export type AnalysisSeverity = "info" | "attention" | "incomplete";

export type AnalysisInsight = {
  id: string;
  severity: AnalysisSeverity;
  title: string;
  detail: string;
  /** Neutral language only — never alleges fraud/guilt */
  tone: "possible" | "needs_review" | "data_quality";
};

export type ProfitabilityAnalysis = {
  period: ProfitabilityReport["period"];
  scope: ProfitabilityReport["scope"];
  generatedAt: string;
  /** Explicit: this payload never mutates expenses or net profit */
  proposalOnly: true;
  mutatesExpenses: false;
  mutatesNetProfit: false;
  honesty: string;
  insights: AnalysisInsight[];
  dataQualityFlags: string[];
  incompleteMarked: boolean;
  summaryEcho: {
    totalSalesMinor: number | null;
    grossProfitMinor: number | null;
    netProfitBeforeTaxMinor: number | null;
    salesDataComplete: boolean;
  };
};

function money(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  return `${sign}$${(Math.abs(minor) / 100).toFixed(2)}`;
}

function labelCategory(c: string): string {
  return c.replace(/_/g, " ");
}

/**
 * Deterministic, proposal-only analysis over an already-built profitability report.
 * Does not read/write OperatingExpense rows; never invents certified zeros.
 */
export function analyzeProfitabilityReport(
  report: ProfitabilityReport,
): ProfitabilityAnalysis {
  const insights: AnalysisInsight[] = [];
  const flags = [...report.dataQuality.honestyTags];
  const incompleteMarked = !report.dataQuality.salesDataComplete;

  if (incompleteMarked) {
    insights.push({
      id: "incomplete-sales",
      severity: "incomplete",
      title: "Incomplete sales / COGS feed",
      detail:
        report.dataQuality.incompleteReasons[0] ??
        "One or more stores lack SalesDaily rows in this period — sales, gross profit, and net stay INCOMPLETE (not verified zeros). Needs review before treating as a close.",
      tone: "data_quality",
    });
    if (!flags.includes("INCOMPLETE_SALES_FEED")) {
      flags.push("INCOMPLETE_SALES_FEED");
    }
  }

  if (report.counts.draftExpenses > 0) {
    insights.push({
      id: "draft-expenses",
      severity: "attention",
      title: "Draft expenses excluded from net",
      detail: `${report.counts.draftExpenses} draft expense${report.counts.draftExpenses === 1 ? "" : "s"} waiting for owner/bookkeeper post. Possible delayed opex recognition until posted — drafts never change net profit.`,
      tone: "needs_review",
    });
  }

  const { summary } = report;
  if (
    summary.grossMarginPct !== null &&
    summary.netMarginPct !== null &&
    summary.totalSalesMinor !== null &&
    summary.totalSalesMinor > 0
  ) {
    const opexDrag = summary.grossMarginPct - summary.netMarginPct;
    insights.push({
      id: "margin-drivers",
      severity: "info",
      title: "Margin drivers (proposal)",
      detail: `Gross margin ${summary.grossMarginPct.toFixed(2)}% → net margin ${summary.netMarginPct.toFixed(2)}% (opex drag ~${opexDrag.toFixed(2)} pts). Gross profit uses SalesDaily (COGS included); posted purchases ${money(summary.postedPurchasesMinor)} are cash-flow only and were not subtracted again.`,
      tone: "possible",
    });
  } else if (!incompleteMarked) {
    insights.push({
      id: "margin-unavailable",
      severity: "info",
      title: "Margin % unavailable",
      detail:
        "Possible zero sales denominator or missing margin inputs — needs review. Not treated as a verified zero close.",
      tone: "needs_review",
    });
  }

  if (report.expenseBreakdown.length > 0) {
    const totalOpex = summary.totalOperatingExpensesMinor;
    const top = report.expenseBreakdown[0]!;
    const share =
      totalOpex > 0 ? Math.round((top.amountMinor / totalOpex) * 10_000) / 100 : 0;
    insights.push({
      id: "expense-spike-top",
      severity: share >= 40 ? "attention" : "info",
      title: "Largest expense category",
      detail: `${labelCategory(top.category)} is ${money(top.amountMinor)} (${share}% of posted opex, ${top.count} entr${top.count === 1 ? "y" : "ies"}). Possible concentration — needs review if unexpected for this period.`,
      tone: share >= 40 ? "needs_review" : "possible",
    });

    for (const row of report.expenseBreakdown.slice(1, 4)) {
      if (totalOpex > 0 && row.amountMinor / totalOpex >= 0.25) {
        insights.push({
          id: `expense-spike-${row.category}`,
          severity: "attention",
          title: `Elevated ${labelCategory(row.category)}`,
          detail: `${labelCategory(row.category)} at ${money(row.amountMinor)} is ≥25% of posted operating expenses. Possible spike — owner should confirm categorization and timing.`,
          tone: "possible",
        });
      }
    }
  } else if (report.dataQuality.salesDataComplete) {
    insights.push({
      id: "no-posted-opex",
      severity: "info",
      title: "No posted operating expenses",
      detail:
        "Posted opex is empty for this window. That may be correct, or expenses may still be in draft / not entered — needs review. Blank is not claimed as certified zero spend (bank/card feed off).",
      tone: "needs_review",
    });
    flags.push("NO_POSTED_OPEX_IN_WINDOW");
  }

  if (report.stores.length > 1) {
    const complete = report.stores.filter((s) => s.salesDataComplete);
    const incompleteStores = report.stores.filter((s) => !s.salesDataComplete);
    for (const s of incompleteStores) {
      insights.push({
        id: `store-incomplete-${s.storeCode}`,
        severity: "incomplete",
        title: `${s.storeCode} sales incomplete`,
        detail: `${s.storeName} has no complete SalesDaily feed in this period — store net marked INCOMPLETE, not $0.`,
        tone: "data_quality",
      });
    }

    const withNet = complete.filter((s) => s.netProfitBeforeTaxMinor !== null);
    if (withNet.length >= 2) {
      const sorted = [...withNet].sort(
        (a, b) =>
          (a.netProfitBeforeTaxMinor ?? 0) - (b.netProfitBeforeTaxMinor ?? 0),
      );
      const low = sorted[0]!;
      const high = sorted[sorted.length - 1]!;
      const spread =
        (high.netProfitBeforeTaxMinor ?? 0) - (low.netProfitBeforeTaxMinor ?? 0);
      insights.push({
        id: "store-outlier-spread",
        severity: spread > 50_000 ? "attention" : "info",
        title: "Store comparison spread",
        detail: `Possible outlier: ${low.storeCode} net ${money(low.netProfitBeforeTaxMinor ?? 0)} vs ${high.storeCode} net ${money(high.netProfitBeforeTaxMinor ?? 0)} (spread ${money(spread)}). Needs review — differences may reflect mix, opex timing, or DEMO/uncertified sales.`,
        tone: "possible",
      });
    }
  }

  if (!report.dataQuality.expenseFeedConnected) {
    insights.push({
      id: "no-bank-feed",
      severity: "info",
      title: "Bank / card expense feed off",
      detail:
        "No linked bank or card feed is claimed. Manual/scan/bank-statement proposals stay draft until human post — AI never posts money.",
      tone: "data_quality",
    });
  }

  return {
    period: report.period,
    scope: report.scope,
    generatedAt: new Date().toISOString(),
    proposalOnly: true,
    mutatesExpenses: false,
    mutatesNetProfit: false,
    honesty:
      "DEMO/proposal auto analysis · insight only · never posts expenses · never changes net · never invents certified zeros",
    insights,
    dataQualityFlags: flags,
    incompleteMarked,
    summaryEcho: {
      totalSalesMinor: summary.totalSalesMinor,
      grossProfitMinor: summary.grossProfitMinor,
      netProfitBeforeTaxMinor: summary.netProfitBeforeTaxMinor,
      salesDataComplete: report.dataQuality.salesDataComplete,
    },
  };
}
