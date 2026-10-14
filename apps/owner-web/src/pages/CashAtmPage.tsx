import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function CashAtmPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Cash / ATM"
      eyebrow="Custody workpaper"
      status="MOCK"
      note="Cash drop, safe count, deposit bag, and ATM load shells only. No bank confirmation feed or ATM vendor is connected — UNKNOWN ≠ 0."
    >
      <ModuleWorkspace
        fieldLabel="Cash / ATM notes"
        fieldPlaceholder="Paste bag #, scan deposit slip or ATM photo (device-local)…"
        scanLabel="Scan slip"
        showDocument
      >
        <AiAssistPanel department="cash-atm" label="Cash / ATM" />
      </ModuleWorkspace>

      <div className="summary-grid">
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Safe expected</span>
          <span className="summary-src">no register till feed</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Deposit bag</span>
          <span className="summary-src">manual until bank match</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">ATM cassette</span>
          <span className="summary-src">no ATM vendor</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value summary-value--unknown">UNKNOWN</span>
          <span className="summary-label">Bank confirmed</span>
          <span className="summary-src">not connected</span>
        </div>
      </div>

      <div className="empty-panel">
        <h2>Custody checklist (structural)</h2>
        <ul className="truth-list">
          <li>
            <strong>Dual-control ATM load:</strong> required in production —
            not automated here
          </li>
          <li>
            <strong>Deposit bag photo:</strong> device camera only (tools above)
          </li>
          <li>
            <strong>Bank match:</strong> MISSING until approved banking path
          </li>
          <li>
            <strong>Camera bookmark for drops:</strong> BLOCKED without VMS
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · MOCK workpaper · no fabricated totals</p>
      </div>
    </ModuleShell>
  );
}
