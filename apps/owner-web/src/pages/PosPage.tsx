import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function PosPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="POS"
      eyebrow="Point of sale"
      status="MISSING"
      note="No POS vendor connector is certified. This screen does not claim Verifone, Gilbarco, NCR, Clover, or any other register is connected."
    >
      <ModuleWorkspace
        fieldLabel="Shift / tender notes"
        fieldPlaceholder="Paste tender notes, scan lane barcodes (device-local)…"
        scanLabel="Scan"
      >
        <AiAssistPanel department="pos" label="POS" />
      </ModuleWorkspace>

      <div className="empty-panel">
        <h2>Connector registry — writes off</h2>
        <p>
          Retail baskets, tenders, age checks, and fuel grade sale posting stay
          off until an approved adapter and owner credentials exist.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Status:</strong> MISSING
          </li>
          <li>
            <strong>Claimed connected:</strong> none
          </li>
          <li>
            <strong>Next:</strong> vendor choice + capability-reporting stub with
            writes default off
          </li>
        </ul>
      </div>
    </ModuleShell>
  );
}
