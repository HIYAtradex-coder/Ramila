import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

/** Structural MOCK departments aligned to home tiles — not a live HRIS. */
const DEPARTMENTS = [
  { id: "pos", name: "POS / register", tile: "POS" },
  { id: "reports", name: "Daily reports", tile: "Daily reports" },
  { id: "lottery", name: "Lottery", tile: "Lottery" },
  { id: "sales-tax", name: "Sales tax", tile: "Sales tax" },
  { id: "cameras", name: "Cameras / VMS", tile: "Cameras" },
  { id: "expenses", name: "Expenses", tile: "Expenses" },
  { id: "inventory", name: "Inventory", tile: "Inventory" },
  { id: "invoices", name: "Invoices", tile: "Invoices" },
  { id: "multi-store", name: "Multi-store portfolio", tile: "Stores" },
] as const;

const ONBOARDING_STEPS = [
  "Collect legal name + contact (offline docs OK)",
  "Assign store-scoped role (never trust client role claims)",
  "Map departments to home-tile ops areas",
  "Issue step-up PIN policy (owner-managed)",
  "Schedule first shifts against store hours",
  "Payroll enrollment — MOCK until connector; no bank deposit claimed",
];

const PAY_PERIODS = [
  {
    id: "pp-2026-10-a",
    label: "Oct 1–15, 2026",
    status: "MOCK · not filed",
    grossMinor: null as number | null,
  },
  {
    id: "pp-2026-09-b",
    label: "Sep 16–30, 2026",
    status: "MOCK · stub structure only",
    grossMinor: null as number | null,
  },
];

export function EmployeesPage() {
  const { token, memberships, storeId } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  const active = memberships.filter((m) => m.storeId === storeId);
  const roster = memberships;

  return (
    <ModuleShell
      title="Employees"
      eyebrow="Team · payroll · schedule"
      status="PARTIAL"
      note="Memberships/roles come from auth login (store-scoped). Payroll, scheduling, and onboarding below are structured shells — no ADP/Gusto connected; no fabricated bank or tax filings."
    >
      <ModuleWorkspace
        fieldLabel="Staff notes / ID scratch"
        fieldPlaceholder="Paste employee ID, role notes, or camera badge photo stamp…"
        scanLabel="Scan ID"
        showDocument
      >
        <AiAssistPanel department="employees" label="Employees" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Users / staff IDs</h2>
        <p className="muted">
          Session memberships from server authz — not a full HR directory yet.
          Staff IDs here are store membership keys until a dedicated employee
          record exists.
        </p>
        <table>
          <thead>
            <tr>
              <th>Staff scope ID</th>
              <th>Store</th>
              <th>Code</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((m) => (
              <tr key={`${m.storeId}-${m.role}`}>
                <td>
                  <code className="mono">{m.storeId.slice(0, 8)}…</code>
                </td>
                <td>{m.storeName}</td>
                <td>{m.storeCode}</td>
                <td>{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="data-panel">
        <h2>Roles &amp; store scopes</h2>
        <p className="muted">
          Active store only. Capabilities are enforced server-side from DB
          memberships; the client cannot elevate itself.
        </p>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Role</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            {active.map((m) => (
              <tr key={m.storeId}>
                <td>
                  {m.storeName} ({m.storeCode})
                </td>
                <td>{m.role}</td>
                <td>This store only</td>
              </tr>
            ))}
            {active.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No membership for the selected store.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="data-panel">
        <h2>Payroll</h2>
        <p className="demo-tag">MOCK · no ADP/Gusto · no bank deposit</p>
        <table>
          <thead>
            <tr>
              <th>Pay period</th>
              <th>Gross</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PAY_PERIODS.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td>{p.grossMinor == null ? "UNKNOWN" : p.grossMinor}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Earnings stub structure only. Tax withholdings and direct deposit are
          not live and are not fabricated as filed.
        </p>
      </div>

      <div className="data-panel">
        <h2>Scheduling / departments</h2>
        <p className="muted">
          Departments map to owner home tiles for store ops coverage. Schedules
          are not persisted yet.
        </p>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Home tile</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.tile}</td>
                <td>UNKNOWN · assign in onboarding</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="data-panel">
        <h2>Onboarding basics</h2>
        <ol className="onboard-list">
          {ONBOARDING_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="muted">
          Append-only audit for membership changes remains an API concern —
          this UI does not invent hire/terminate events.
        </p>
      </div>
    </ModuleShell>
  );
}
