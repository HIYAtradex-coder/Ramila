import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function PriceCheckPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [lookedUp, setLookedUp] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Price check"
      eyebrow="Read-only"
      status="MOCK"
      note="Price Check never creates a basket, sale, void, or inventory movement. No live POS price book — results stay UNKNOWN until a certified item-read connector exists."
    >
      <ModuleWorkspace
        fieldLabel="Lookup notes"
        fieldPlaceholder="Paste UPC / SKU, scan shelf tag (device-local)…"
        scanLabel="Scan UPC"
      >
        <AiAssistPanel department="price-check" label="Price check" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Lookup</h2>
        <label className="workspace-field">
          UPC / SKU
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLookedUp(false);
            }}
            placeholder="e.g. 012345678905"
            inputMode="numeric"
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={!query.trim()}
          onClick={() => setLookedUp(true)}
        >
          Check price (read-only)
        </button>
        {lookedUp && (
          <div className="tools-result">
            <p className="demo-tag">READ-ONLY · no basket created</p>
            <p>
              <strong>Query:</strong>{" "}
              <span className="mono">{query.trim()}</span>
            </p>
            <p>
              <strong>Shelf / POS price:</strong> UNKNOWN
            </p>
            <p>
              <strong>Cost:</strong> UNKNOWN
            </p>
            <p className="muted">
              Connector itemRead not confirmed — do not invent a price. Use
              Pricing tile for MOCK proposals (human approve; writes OFF).
            </p>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
