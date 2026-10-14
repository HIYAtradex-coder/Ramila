import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Membership } from "../api";
import {
  computePlan,
  formatUsdMinor,
  writeMockPlanNote,
  type OrgPlan,
} from "../lib/store-plan";

export function MultiStorePage() {
  const {
    token,
    memberships,
    storeId,
    setStoreId,
    organizationId,
    addMembership,
  } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<OrgPlan | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackOrg = organizationId ?? "00000000-0000-4000-8000-000000000001";

  const localPlan = useMemo(
    () => computePlan(fallbackOrg, memberships.length, "session-mock"),
    [fallbackOrg, memberships.length],
  );

  useEffect(() => {
    if (!token) return;
    api<OrgPlan>("/billing/plan", { token })
      .then((p) => setPlan({ ...p, billingMode: "MOCK", source: "api" }))
      .catch(() => setPlan(localPlan));
  }, [token, localPlan]);

  if (!token) return <Navigate to="/login" replace />;

  const view = plan ?? localPlan;
  const includedId = memberships[0]?.storeId;

  function openStoreSystem(id: string) {
    setStoreId(id);
    navigate("/");
  }

  async function onAddStore(e: FormEvent) {
    e.preventDefault();
    if (!accept) {
      setError("Confirm MOCK +$100/mo billing to add a store.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{
        membership: Membership;
        plan: OrgPlan;
        store: { code: string };
      }>("/stores", {
        method: "POST",
        token: token!,
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          storeType: "cstore",
          acceptMockBilling: true,
        }),
      });
      addMembership(res.membership);
      setPlan({ ...res.plan, billingMode: "MOCK", source: "api" });
      setStoreId(res.membership.storeId);
      setCode("");
      setName("");
      setAccept(false);
      setMessage(
        `Added ${res.store.code}. MOCK ledger now ${formatUsdMinor(res.plan.monthlyTotalMinor)}/mo — no real card charge.`,
      );
    } catch {
      // Session MOCK fallback when API/DB unavailable
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `mock-${Date.now()}`;
      const m: Membership = {
        storeId: newId,
        storeCode: code.trim().toUpperCase() || `SITE-${memberships.length + 1}`,
        storeName: name.trim() || `New store ${memberships.length + 1}`,
        role: "OWNER",
      };
      if (memberships.some((x) => x.storeCode === m.storeCode)) {
        setError("Store code already in this session portfolio.");
        setBusy(false);
        return;
      }
      addMembership(m);
      const next = computePlan(
        fallbackOrg,
        memberships.length + 1,
        "session-mock",
      );
      setPlan(next);
      writeMockPlanNote(
        `session-mock extras=${next.billableExtraStores} total=${next.monthlyTotalMinor}`,
      );
      setStoreId(m.storeId);
      setCode("");
      setName("");
      setAccept(false);
      setMessage(
        `Added ${m.storeCode} in session MOCK ledger (${formatUsdMinor(next.monthlyTotalMinor)}/mo). API unavailable — not a real Stripe charge; persist when DB is up.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleShell
      title="Multi-store"
      eyebrow="Store management"
      status="PARTIAL"
      note="Base plan includes 1 store with the full system. Each additional store is +$100/mo on a MOCK billing ledger — not a live Stripe charge. Every store gets the same module tiles, scoped to that location."
    >
      <div className="data-panel plan-panel">
        <h2>Subscription</h2>
        <p className="demo-tag">MOCK BILLING · no Stripe</p>
        <ul className="truth-list">
          <li>
            <strong>Included:</strong> {view.includedStoreSeats} store (full
            system)
          </li>
          <li>
            <strong>Active stores:</strong> {view.activeStoreCount}
          </li>
          <li>
            <strong>Extra seats:</strong> {view.billableExtraStores} ×{" "}
            {formatUsdMinor(view.additionalStorePriceMinor)}/mo
          </li>
          <li>
            <strong>Monthly total:</strong>{" "}
            {formatUsdMinor(view.monthlyTotalMinor)}
            {view.monthlyTotalMinor === 0 ? " (base only)" : ""}
          </li>
          <li>
            <strong>Ledger source:</strong>{" "}
            {view.source === "api" ? "API / org plan" : "session MOCK fallback"}
          </li>
        </ul>
        <p className="muted">{view.honesty}</p>
      </div>

      <div className="data-panel">
        <h2>Your stores</h2>
        <p className="muted">
          Tap a store to open its full system (all Home tiles, scoped).
        </p>
        <div className="store-tile-grid">
          {memberships.map((m, idx) => {
            const included = m.storeId === includedId || idx === 0;
            const active = m.storeId === storeId;
            return (
              <button
                key={m.storeId}
                type="button"
                className={
                  active ? "store-app-tile store-app-tile--on" : "store-app-tile"
                }
                onClick={() => openStoreSystem(m.storeId)}
              >
                <span className="store-app-tile-icon" aria-hidden>
                  {idx + 1}
                </span>
                <span className="store-app-tile-label">{m.storeCode}</span>
                <span className="store-app-tile-name">{m.storeName}</span>
                <span className="store-app-tile-meta">
                  {included ? "Included" : `+${formatUsdMinor(view.additionalStorePriceMinor)}/mo`}
                  {active ? " · open" : ""}
                </span>
              </button>
            );
          })}
          <Link to="#add-store" className="store-app-tile store-app-tile--add">
            <span className="store-app-tile-icon" aria-hidden>
              +
            </span>
            <span className="store-app-tile-label">Add store</span>
            <span className="store-app-tile-meta">
              +{formatUsdMinor(view.additionalStorePriceMinor)}/mo MOCK
            </span>
          </Link>
        </div>
      </div>

      <div className="data-panel" id="add-store">
        <h2>Add store — {formatUsdMinor(view.additionalStorePriceMinor)}/mo</h2>
        <p className="muted">
          Creates another location with the same full module set (POS, reports,
          lottery, tax, team, cameras, expenses, inventory, invoices), scoped to
          the new store. Charge is MOCK ledger only.
        </p>
        <form className="add-store-form" onSubmit={onAddStore}>
          <label>
            Store code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="DEMO-03"
              required
            />
          </label>
          <label>
            Store name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New c-store"
              required
            />
          </label>
          <label className="ai-ack">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
            />
            <span>
              I understand this adds +{formatUsdMinor(view.additionalStorePriceMinor)}
              /mo on the <strong>MOCK</strong> subscription ledger (not a real
              card charge).
            </span>
          </label>
          <button type="submit" disabled={busy || !accept}>
            {busy ? "Adding…" : "Add store (MOCK bill)"}
          </button>
        </form>
        {message && <p className="muted">{message}</p>}
        {error && <p className="err">{error}</p>}
      </div>

      <ModuleWorkspace
        fieldLabel="Portfolio notes"
        fieldPlaceholder="Paste store codes, compare notes, scan site labels…"
        scanLabel="Scan site"
      >
        <AiAssistPanel department="multi-store" label="Multi-store" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Compare (structural)</h2>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Seat</th>
              <th>Net sales</th>
              <th>Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m, idx) => (
              <tr key={m.storeId}>
                <td>
                  {m.storeCode}
                  {m.storeId === storeId ? " · active" : ""}
                </td>
                <td>
                  {idx === 0
                    ? "Included"
                    : `+${formatUsdMinor(view.additionalStorePriceMinor)}/mo MOCK`}
                </td>
                <td>UNKNOWN</td>
                <td>UNKNOWN</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="demo-tag">DEMO DATA · not vendor-synced</p>
      </div>
    </ModuleShell>
  );
}
