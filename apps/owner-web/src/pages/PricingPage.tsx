import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";

type PriceProposal = {
  id: string;
  kind: "item" | "fuel";
  skuOrGrade: string;
  label: string;
  currentMinor: number | null;
  proposedMinor: number | null;
  status: "draft" | "proposed" | "approved" | "published";
  honesty: string;
};

/** MOCK price-book proposals — publish writes stay OFF. */
const PROPOSALS: PriceProposal[] = [
  {
    id: "px-item-1",
    kind: "item",
    skuOrGrade: "SKU-WATER-24",
    label: "Bottled Water 24pk",
    currentMinor: null,
    proposedMinor: 599,
    status: "proposed",
    honesty: "UNKNOWN current · MOCK propose · not published to POS",
  },
  {
    id: "px-item-2",
    kind: "item",
    skuOrGrade: "SKU-CHIPS-01",
    label: "Potato Chips Original",
    currentMinor: null,
    proposedMinor: 249,
    status: "draft",
    honesty: "Draft only · human approve before publish",
  },
  {
    id: "px-fuel-1",
    kind: "fuel",
    skuOrGrade: "REGULAR",
    label: "Regular unleaded",
    currentMinor: null,
    proposedMinor: 3299,
    status: "proposed",
    honesty: "¢/gal MOCK · no Gilbarco/Verifone Fuel Price Change connected",
  },
  {
    id: "px-fuel-2",
    kind: "fuel",
    skuOrGrade: "DIESEL",
    label: "Diesel",
    currentMinor: null,
    proposedMinor: 3599,
    status: "draft",
    honesty: "Fuel write default OFF until certified adapter",
  },
];

function formatPrice(minor: number | null, kind: "item" | "fuel"): string {
  if (minor == null) return "UNKNOWN";
  if (kind === "fuel") {
    return `$${(minor / 1000).toFixed(3)}/gal`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

export function PricingPage() {
  const { token, storeId, memberships } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  const store = memberships.find((m) => m.storeId === storeId);
  const items = PROPOSALS.filter((p) => p.kind === "item");
  const fuel = PROPOSALS.filter((p) => p.kind === "fuel");

  return (
    <ModuleShell
      title="Pricing"
      eyebrow="Price books · proposals"
      status="MOCK"
      note="Price updates are proposals only. Human approve is required before any publish — POS/fuel writes default OFF. No Verifone, Gilbarco, or other Fuel Price Change “connected” claim."
    >
      <ModuleWorkspace
        fieldLabel="Price book notes"
        fieldPlaceholder="Paste price list lines, scan shelf tags (device-local)…"
        scanLabel="Scan tag"
        showDocument
      >
        <AiAssistPanel department="pricing" label="Pricing" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Publish gate</h2>
        <ul className="truth-list">
          <li>
            <strong>Active store:</strong> {store?.storeCode ?? "—"} (
            {memberships.length} location
            {memberships.length === 1 ? "" : "s"} in portfolio)
          </li>
          <li>
            <strong>POS price write:</strong> OFF (default)
          </li>
          <li>
            <strong>Fuel price write:</strong> OFF (default)
          </li>
          <li>
            <strong>Human approve before publish:</strong> required
          </li>
        </ul>
        <p className="demo-tag">MOCK · writes off · no vendor FPC</p>
        <button type="button" className="secondary" disabled>
          Publish approved prices (blocked)
        </button>
        <p className="muted">
          Publish stays disabled until a certified connector exists and an owner
          completes step-up approve. AI cannot publish.
        </p>
      </div>

      <div className="data-panel">
        <h2>Item price book</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <code className="mono">{p.skuOrGrade}</code>
                </td>
                <td>
                  {p.label}
                  <div className="muted">{p.honesty}</div>
                </td>
                <td>{formatPrice(p.currentMinor, "item")}</td>
                <td>{formatPrice(p.proposedMinor, "item")}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="data-panel">
        <h2>Fuel grades</h2>
        <p className="muted">
          Fuel grade proposals for stations with fuel enabled. Non-fuel stores
          should ignore this block in a later store-mode gate.
        </p>
        <table>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Label</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fuel.map((p) => (
              <tr key={p.id}>
                <td>
                  <code className="mono">{p.skuOrGrade}</code>
                </td>
                <td>
                  {p.label}
                  <div className="muted">{p.honesty}</div>
                </td>
                <td>{formatPrice(p.currentMinor, "fuel")}</td>
                <td>{formatPrice(p.proposedMinor, "fuel")}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="demo-tag">
          DEMO DATA · no Verifone / Gilbarco connected
        </p>
      </div>
    </ModuleShell>
  );
}
