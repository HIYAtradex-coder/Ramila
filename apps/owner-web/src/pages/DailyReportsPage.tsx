import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type InventoryItem, type Invoice } from "../api";

export function DailyReportsPage() {
  const { token, storeId } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !storeId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api<{ items: InventoryItem[] }>(`/stores/${storeId}/inventory`, {
        token,
      }),
      api<{ invoices: Invoice[] }>(`/stores/${storeId}/invoices`, { token }),
    ])
      .then(([inv, docs]) => {
        setItems(inv.items);
        setInvoices(docs.invoices);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [token, storeId]);

  if (!token) return <Navigate to="/login" replace />;

  const pending = invoices.filter((i) =>
    ["proposed", "needs_review", "approved"].includes(i.status),
  ).length;
  const posted = invoices.filter((i) => i.status === "posted").length;
  const skuCount = items.length;
  const eaches = items.reduce((sum, i) => sum + i.onHandEaches, 0);

  return (
    <ModuleShell
      title="Daily reports"
      eyebrow="Command summary"
      status="PARTIAL"
      note="Summary counts come from pilot inventory + invoices for the active store. Sales / cash / lottery KPIs remain DEMO DATA until POS and banking connectors exist."
    >
      <ModuleWorkspace
        fieldLabel="Close notes"
        fieldPlaceholder="Paste shift notes, scan Z-tape photo (device-local)…"
        scanLabel="Scan tape"
        showDocument
      >
        <AiAssistPanel department="reports" label="Daily reports" />
      </ModuleWorkspace>

      {error && <p className="err">{error}</p>}
      {loading ? (
        <p className="muted">Loading store facts…</p>
      ) : (
        <div className="summary-grid">
          <div className="summary-cell">
            <span className="summary-value">{skuCount}</span>
            <span className="summary-label">SKUs on hand</span>
            <span className="summary-src">from inventory API</span>
          </div>
          <div className="summary-cell">
            <span className="summary-value">{eaches}</span>
            <span className="summary-label">Total eaches</span>
            <span className="summary-src">from inventory API</span>
          </div>
          <div className="summary-cell">
            <span className="summary-value">{pending}</span>
            <span className="summary-label">Awaiting post</span>
            <span className="summary-src">from invoices API</span>
          </div>
          <div className="summary-cell">
            <span className="summary-value">{posted}</span>
            <span className="summary-label">Posted invoices</span>
            <span className="summary-src">from invoices API</span>
          </div>
        </div>
      )}

      <div className="empty-panel">
        <h2>Not yet from live sales</h2>
        <p>
          Net sales, GP$, transactions, cash/ATM, and lottery settlement stay
          unlabeled as real until register and lottery feeds are certified.
        </p>
        <div className="row-links">
          <Link to="/inventory" className="text-link">
            Open inventory →
          </Link>
          <Link to="/invoices" className="text-link">
            Open invoices →
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
