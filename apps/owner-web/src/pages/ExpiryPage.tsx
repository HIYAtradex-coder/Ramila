import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function ExpiryPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Expiry / lots"
      eyebrow="Date code workpaper"
      status="MOCK"
      note="Lot, expiration, quarantine, and vendor-credit shells. No GS1 lot ledger or vendor return portal is live — counts stay UNKNOWN, never zeroed."
    >
      <ModuleWorkspace
        fieldLabel="Lot / expiry notes"
        fieldPlaceholder="Paste GS1 text, scan date-code barcode photo (device-local)…"
        scanLabel="Scan code"
        showDocument
      >
        <AiAssistPanel department="expiry" label="Expiry / lots" />
      </ModuleWorkspace>

      <div className="summary-grid">
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Expiring 7d</span>
          <span className="summary-src">no lot ledger</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Quarantined</span>
          <span className="summary-src">workflow MOCK</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Vendor credit $</span>
          <span className="summary-src">not a claim filing</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Disposal</span>
          <span className="summary-src">human log only</span>
        </div>
      </div>

      <div className="empty-panel">
        <h2>Structural only</h2>
        <p>
          Device scan/paste can capture GS1 strings for later matching. AI may
          propose quarantine or credit checklists — it never posts inventory
          adjustments or vendor claims.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Lot ledger:</strong> MISSING
          </li>
          <li>
            <strong>Third-party count import:</strong> MISSING
          </li>
          <li>
            <strong>Vendor credit portal:</strong> not connected
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · MOCK · UNKNOWN ≠ 0</p>
      </div>
    </ModuleShell>
  );
}
