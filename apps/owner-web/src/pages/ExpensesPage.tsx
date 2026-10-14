import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

export function ExpensesPage() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Expenses"
      eyebrow="Store spend"
      status="MOCK"
      note="Expense capture is a shell only. No bank, card, or Plaid-style feed is connected — do not treat blank totals as zero spend."
    >
      <ModuleWorkspace
        fieldLabel="Expense notes"
        fieldPlaceholder="Paste memo, scan/attach receipt photo (device-local)…"
        scanLabel="Scan receipt"
        showDocument
      >
        <AiAssistPanel department="expenses" label="Expenses" />
      </ModuleWorkspace>

      <div className="empty-panel">
        <h2>Manual log later</h2>
        <p>
          Category workpapers and receipt photo attach use device tools above
          without inventing card transactions. Linked bank/card import stays
          off until an approved processor path exists.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Bank feed:</strong> not connected
          </li>
          <li>
            <strong>Card feed:</strong> not connected
          </li>
          <li>
            <strong>Period total:</strong> UNKNOWN
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · no fabricated feeds</p>
      </div>
    </ModuleShell>
  );
}
