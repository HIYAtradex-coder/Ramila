import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function SalesTaxPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <ModuleShell
      title="Sales tax"
      eyebrow="Monthly workpaper"
      status="MOCK"
      note="Monthly sales-tax workpapers are structural only. HIYA does not claim a filing was prepared or submitted to any tax authority."
    >
      <ModuleWorkspace
        fieldLabel="Workpaper notes"
        fieldPlaceholder="Paste jurisdiction notes, scan rate-sheet photo…"
        scanLabel="Scan sheet"
        showDocument
      >
        <AiAssistPanel department="sales-tax" label="Sales tax" />
      </ModuleWorkspace>

      <div className="empty-panel">
        <h2>{month}</h2>
        <p>
          Taxable / exempt / fuel / lottery carve-outs need posted sales facts
          from a certified POS. Until then amounts stay UNKNOWN — not $0.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Taxable sales:</strong> UNKNOWN
          </li>
          <li>
            <strong>Tax collected:</strong> UNKNOWN
          </li>
          <li>
            <strong>Filing status:</strong> not filed via HIYA
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · not a tax filing</p>
      </div>
    </ModuleShell>
  );
}
