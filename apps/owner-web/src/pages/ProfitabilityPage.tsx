import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api } from "../api";

type Period = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

type ProfitabilityReport = {
  period: { kind: Period; start: string; endExclusive: string; anchor: string };
  scope: { mode: string; locationId: string | null; storeIds: string[] };
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
    expenseFeedConnected: boolean;
    incompleteReasons: string[];
    honestyTags: string[];
  };
  accountingNotice: string;
};

type ProfitabilityAnalysis = {
  proposalOnly: true;
  mutatesExpenses: false;
  mutatesNetProfit: false;
  honesty: string;
  insights: Array<{
    id: string;
    severity: "info" | "attention" | "incomplete";
    title: string;
    detail: string;
    tone: string;
  }>;
  dataQualityFlags: string[];
  incompleteMarked: boolean;
};

const PERIODS: Period[] = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];

function money(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "INCOMPLETE";
  const sign = minor < 0 ? "-" : "";
  return `${sign}$${(Math.abs(minor) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}%`;
}

function labelCategory(c: string): string {
  return c.replace(/_/g, " ");
}

export function ProfitabilityPage() {
  const { token, storeId, memberships } = useAuth();
  const [period, setPeriod] = useState<Period>("WEEKLY");
  const [scopeAll, setScopeAll] = useState(false);
  const [report, setReport] = useState<ProfitabilityReport | null>(null);
  const [analysis, setAnalysis] = useState<ProfitabilityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    if (!scopeAll && !storeId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ period });
      if (!scopeAll && storeId) qs.set("locationId", storeId);
      const q = qs.toString();
      const [data, insight] = await Promise.all([
        api<ProfitabilityReport>(`/v1/reports/profitability?${q}`, { token }),
        api<ProfitabilityAnalysis>(
          `/v1/reports/profitability/analysis?${q}`,
          { token },
        ),
      ]);
      setReport(data);
      setAnalysis(insight);
    } catch (e) {
      setReport(null);
      setAnalysis(null);
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [token, storeId, period, scopeAll]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return <Navigate to="/login" replace />;

  const s = report?.summary;
  const incomplete = report && !report.dataQuality.salesDataComplete;

  return (
    <ModuleShell
      title="Profitability"
      eyebrow="Owner P&amp;L"
      status="PARTIAL"
      note="Gross profit uses certified SalesDaily.grossProfit (COGS included). Posted purchases are cash-flow only — never subtracted again. Draft expenses never change net. Missing sales feeds show INCOMPLETE, not $0."
    >
      <ModuleWorkspace
        fieldLabel="Owner notes"
        fieldPlaceholder="Paste memo or scan/attach receipt for later review…"
        scanLabel="Scan receipt"
        showDocument
      >
        <AiAssistPanel department="expenses" label="Profitability assist" />
      </ModuleWorkspace>

      <div className="period-row" role="group" aria-label="Report period">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`period-btn${period === p ? " period-btn--on" : ""}`}
            onClick={() => setPeriod(p)}
          >
            {p === "BIWEEKLY" ? "14-day" : p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="scope-toggle">
        <button
          type="button"
          className={`chip-btn${!scopeAll ? " chip-btn--on" : ""}`}
          onClick={() => setScopeAll(false)}
        >
          This store
        </button>
        <button
          type="button"
          className={`chip-btn${scopeAll ? " chip-btn--on" : ""}`}
          onClick={() => setScopeAll(true)}
        >
          All stores ({memberships.length})
        </button>
        <Link to="/expenses" className="text-link">
          Add / Scan Expense →
        </Link>
      </div>

      {error && <p className="err">{error}</p>}
      {loading && <p className="muted">Loading profitability…</p>}

      {report && s && (
        <>
          <div
            className={`net-tile${(s.netProfitBeforeTaxMinor ?? 0) < 0 ? " net-tile--neg" : ""}`}
          >
            <p className="net-tile-label">Net profit before tax</p>
            <p className="net-tile-value">
              {money(s.netProfitBeforeTaxMinor)}
            </p>
            <p className="net-tile-meta">
              Net margin {pct(s.netMarginPct)} · {report.period.start} →{" "}
              {report.period.endExclusive} ({report.period.kind})
            </p>
          </div>

          {incomplete && (
            <div className="draft-warn draft-warn--incomplete" role="status">
              Incomplete sales/COGS data — totals are not verified zeros.
              {report.dataQuality.incompleteReasons[0]
                ? ` ${report.dataQuality.incompleteReasons[0]}`
                : ""}
            </div>
          )}

          {report.counts.draftExpenses > 0 && (
            <div className="draft-warn" role="status">
              {report.counts.draftExpenses} draft expense
              {report.counts.draftExpenses === 1 ? "" : "s"} waiting for
              owner/bookkeeper post — excluded from net profit.
            </div>
          )}

          {analysis && (
            <section
              className="plan-panel rise-block auto-analysis"
              aria-label="Auto analysis"
            >
              <div className="auto-analysis-head">
                <h2>Auto analysis</h2>
                <span className="demo-tag">PROPOSAL ONLY</span>
              </div>
              <p className="muted">{analysis.honesty}</p>
              <ul className="truth-list auto-analysis-list">
                {analysis.insights.map((ins) => (
                  <li
                    key={ins.id}
                    className={`analysis-item analysis-item--${ins.severity}`}
                  >
                    <strong>{ins.title}</strong>
                    <span>{ins.detail}</span>
                  </li>
                ))}
              </ul>
              {analysis.dataQualityFlags.length > 0 && (
                <p className="demo-tag">
                  Flags: {analysis.dataQualityFlags.join(" · ")}
                </p>
              )}
            </section>
          )}

          <div className="summary-grid profit-cards">
            <div className="summary-cell">
              <span className="summary-value">{money(s.totalSalesMinor)}</span>
              <span className="summary-label">Total sales</span>
              <span className="summary-src">SalesDaily</span>
            </div>
            <div className="summary-cell">
              <span className="summary-value">
                {money(s.postedPurchasesMinor)}
              </span>
              <span className="summary-label">Posted purchases</span>
              <span className="summary-src">
                {s.postedPurchaseInvoiceCount} invoice
                {s.postedPurchaseInvoiceCount === 1 ? "" : "s"} · cash-flow only
              </span>
            </div>
            <div className="summary-cell">
              <span className="summary-value">
                {money(s.grossProfitMinor)}
              </span>
              <span className="summary-label">
                Gross profit · {pct(s.grossMarginPct)}
              </span>
              <span className="summary-src">COGS already in GP</span>
            </div>
            <div className="summary-cell">
              <span className="summary-value">
                {money(s.totalOperatingExpensesMinor)}
              </span>
              <span className="summary-label">Operating expenses</span>
              <span className="summary-src">
                {report.counts.postedExpenses} posted
              </span>
            </div>
          </div>

          <section className="plan-panel rise-block">
            <h2>Expense breakdown</h2>
            {report.expenseBreakdown.length === 0 ? (
              <p className="muted">No posted expenses in this window.</p>
            ) : (
              <ul className="truth-list expense-break">
                {report.expenseBreakdown.map((row) => (
                  <li key={row.category}>
                    <strong>{labelCategory(row.category)}</strong>
                    <span>
                      {money(row.amountMinor)} · {row.count}{" "}
                      {row.count === 1 ? "entry" : "entries"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {report.stores.length > 1 && (
            <section className="plan-panel rise-block">
              <h2>Store comparison</h2>
              <div className="store-chip-row">
                {report.stores.map((st) => (
                  <div key={st.locationId} className="store-chip">
                    <strong>
                      {st.storeCode} · {st.storeName}
                    </strong>
                    <span className="store-chip-meta">
                      Sales {money(st.totalSalesMinor)} · GP{" "}
                      {money(st.grossProfitMinor)} · Opex{" "}
                      {money(st.operatingExpensesMinor)} · Net{" "}
                      {money(st.netProfitBeforeTaxMinor)}
                      {!st.salesDataComplete ? " · INCOMPLETE sales" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="module-note">{report.accountingNotice}</p>
          <p className="demo-tag">
            {report.dataQuality.honestyTags.join(" · ")} · bank/card feed: off
          </p>
        </>
      )}
    </ModuleShell>
  );
}
