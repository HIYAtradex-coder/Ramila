import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function LotteryPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Lottery"
      eyebrow="Scratch & draw"
      status="MOCK"
      note="No lottery terminal or state filing connector is wired. Figures below are layout placeholders only — not activation, settlement, or pack counts."
    >
      <ModuleWorkspace
        fieldLabel="Pack / settle notes"
        fieldPlaceholder="Paste pack IDs, scan pack barcodes (device-local)…"
        scanLabel="Scan pack"
      >
        <AiAssistPanel department="lottery" label="Lottery" />
      </ModuleWorkspace>

      <div className="empty-panel">
        <h2>Workpaper shell</h2>
        <p>
          Daily pack activate / settle / return UI will land here after a
          certified lottery path. Do not treat empty totals as zero sales.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Packs activated:</strong> UNKNOWN
          </li>
          <li>
            <strong>Settled today:</strong> UNKNOWN
          </li>
          <li>
            <strong>State filing:</strong> not submitted from HIYA
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · not a filing</p>
      </div>
    </ModuleShell>
  );
}
