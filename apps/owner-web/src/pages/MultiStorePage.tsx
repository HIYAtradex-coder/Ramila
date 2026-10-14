import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function MultiStorePage() {
  const { token, memberships, storeId, setStoreId } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  const codes = memberships.map((m) => m.storeCode).join(", ");

  return (
    <ModuleShell
      title="Multi-store"
      eyebrow="Portfolio"
      status="PARTIAL"
      note="Store list and scopes come from login memberships (server authz). Cross-store sales sync is not claimed — no fabricated “all stores synced” vendor status. Switch active store here or from Home."
    >
      <ModuleWorkspace
        fieldLabel="Portfolio notes"
        fieldPlaceholder="Paste store codes, compare notes, scan site labels…"
        scanLabel="Scan site"
      >
        <AiAssistPanel department="multi-store" label="Multi-store" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>All locations</h2>
        <p className="muted">
          Portfolio from session memberships ({memberships.length} store
          {memberships.length === 1 ? "" : "s"}): {codes || "none"}.
        </p>
        <div className="store-chip-row" role="list">
          <button
            type="button"
            className={
              !memberships.some((m) => m.storeId === storeId)
                ? "store-chip store-chip--on"
                : "store-chip"
            }
            onClick={() => {
              /* keep current; All is view mode only */
            }}
            disabled
            title="All-locations KPI rollup needs certified POS feeds"
          >
            All locations
            <span className="store-chip-meta">DEMO · rollup UNKNOWN</span>
          </button>
          {memberships.map((m) => (
            <button
              key={m.storeId}
              type="button"
              role="listitem"
              className={
                m.storeId === storeId
                  ? "store-chip store-chip--on"
                  : "store-chip"
              }
              onClick={() => setStoreId(m.storeId)}
            >
              <strong>{m.storeCode}</strong>
              <span>{m.storeName}</span>
              <span className="store-chip-meta">
                {m.role} · {m.storeId === storeId ? "active" : "switch"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="data-panel">
        <h2>Compare (structural)</h2>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Scope</th>
              <th>Net sales</th>
              <th>Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => (
              <tr key={m.storeId}>
                <td>
                  {m.storeCode}
                  {m.storeId === storeId ? " · active" : ""}
                </td>
                <td>{m.role}</td>
                <td>UNKNOWN</td>
                <td>UNKNOWN</td>
              </tr>
            ))}
            {memberships.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No store memberships on this session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="demo-tag">DEMO DATA · not vendor-synced</p>
        <p className="muted">
          Comparison KPIs stay UNKNOWN until POS/inventory rollups exist per
          store. Switching location updates the active store for other tiles.
        </p>
      </div>
    </ModuleShell>
  );
}
