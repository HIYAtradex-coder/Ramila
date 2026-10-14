import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type InventoryItem } from "../api";

export function InventoryPage() {
  const { token, storeId } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !storeId) return;
    setLoading(true);
    setError(null);
    api<{ items: InventoryItem[] }>(`/stores/${storeId}/inventory`, { token })
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [token, storeId]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Inventory"
      eyebrow="Stock on hand"
      status="WORKING"
      note="On-hand eaches from the pilot inventory API (store-scoped). Counts, barcode decode, and AI stock posts are not automatic — AI never posts inventory."
    >
      <ModuleWorkspace
        fieldLabel="Count / SKU notes"
        fieldPlaceholder="Paste SKU codes, scan notes, or camera stamps…"
        scanLabel="Scan SKU"
      >
        <AiAssistPanel department="inventory" label="Inventory" />
      </ModuleWorkspace>

      {error && <p className="err">{error}</p>}
      <div className="data-panel">
        <h2>On-hand (live)</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Eaches</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.skuCode}</td>
                  <td>{i.name}</td>
                  <td>{i.onHandEaches}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No stock rows for this store yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </ModuleShell>
  );
}
