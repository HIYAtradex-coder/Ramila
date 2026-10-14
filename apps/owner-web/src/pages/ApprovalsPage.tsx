import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Invoice, type Membership } from "../api";

type PendingRow = {
  store: Membership;
  invoice: Invoice;
};

export function ApprovalsPage() {
  const { token, memberships, storeId, setStoreId } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "active">("all");

  useEffect(() => {
    if (!token) return;
    const targets =
      scope === "active"
        ? memberships.filter((m) => m.storeId === storeId)
        : memberships;
    if (targets.length === 0) return;
    setLoading(true);
    setError(null);
    Promise.all(
      targets.map(async (store) => {
        try {
          const docs = await api<{ invoices: Invoice[] }>(
            `/stores/${store.storeId}/invoices`,
            { token },
          );
          return docs.invoices
            .filter((i) =>
              ["proposed", "needs_review", "approved"].includes(i.status),
            )
            .map((invoice) => ({ store, invoice }));
        } catch {
          return [] as PendingRow[];
        }
      }),
    )
      .then((lists) => setRows(lists.flat()))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [token, memberships, storeId, scope]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Approvals"
      eyebrow="Human gate"
      status="PARTIAL"
      note="Queue of invoice proposals awaiting human PIN approve-before-post. AI never posts. Cross-store view aggregates pilot invoice APIs — not a fake green clearance board."
    >
      <ModuleWorkspace
        fieldLabel="Approval notes"
        fieldPlaceholder="Paste exception notes, scan invoice photo (device-local)…"
        scanLabel="Scan doc"
        showDocument
      >
        <AiAssistPanel department="approvals" label="Approvals" />
      </ModuleWorkspace>

      <div className="filter-row">
        <label>
          Scope
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "all" | "active")}
            aria-label="Approval scope"
          >
            <option value="all">All stores</option>
            <option value="active">Active store only</option>
          </select>
        </label>
      </div>

      {error && <p className="err">{error}</p>}
      {loading ? (
        <p className="muted">Loading approval queues…</p>
      ) : rows.length === 0 ? (
        <div className="empty-panel">
          <h2>No pending posts in scope</h2>
          <p>
            Empty queue means no proposed/needs_review/approved invoices from
            the pilot API — not “everything green.” Sales, cash, and lottery
            approvals remain UNKNOWN without those connectors.
          </p>
          <p className="demo-tag">DEMO DATA · invoice queue only</p>
          <div className="row-links">
            <Link to="/invoices" className="text-link">
              Open invoices →
            </Link>
          </div>
        </div>
      ) : (
        <div className="data-panel">
          <h2>
            Awaiting post · {rows.length}{" "}
            {rows.length === 1 ? "item" : "items"}
          </h2>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Vendor</th>
                <th>Invoice #</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ store, invoice }) => (
                <tr key={`${store.storeId}-${invoice.id}`}>
                  <td>{store.storeCode}</td>
                  <td>{invoice.vendorName}</td>
                  <td className="mono">{invoice.invoiceNumber}</td>
                  <td>{invoice.status}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setStoreId(store.storeId);
                      }}
                    >
                      Focus
                    </button>{" "}
                    <Link to="/invoices" className="text-link">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Human PIN on Invoices posts stock. Focus switches active store
            before review.
          </p>
          <p className="demo-tag">LIVE queue · AI never posts</p>
        </div>
      )}
    </ModuleShell>
  );
}
