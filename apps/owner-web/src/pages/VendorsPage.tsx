import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Invoice } from "../api";

type VendorCategory =
  | "fuel"
  | "grocery"
  | "lottery"
  | "services"
  | "beverage"
  | "tobacco"
  | "other";

type VendorRow = {
  id: string;
  name: string;
  category: VendorCategory;
  contactName: string;
  phone: string;
  email: string;
  storeCodes: string[];
  notes: string;
  source: "directory-mock" | "invoice-derived";
};

type VendorPayment = {
  id: string;
  vendorName: string;
  method: string;
  amountMinor: number;
  currency: string;
  status: string;
  checkNumber?: string | null;
  checkDate?: string | null;
  memo?: string | null;
  moneyPostedByAi: false;
  honesty: string;
};

const DIRECTORY_SEED: VendorRow[] = [
  {
    id: "vnd-fuel-1",
    name: "Regional Fuel Supply Co",
    category: "fuel",
    contactName: "Dispatch desk",
    phone: "UNKNOWN",
    email: "UNKNOWN",
    storeCodes: ["*"],
    notes: "Fuel loads — no EDI portal claimed",
    source: "directory-mock",
  },
  {
    id: "vnd-groc-1",
    name: "Demo Vendor Co",
    category: "grocery",
    contactName: "Accounts receivable",
    phone: "UNKNOWN",
    email: "UNKNOWN",
    storeCodes: ["*"],
    notes: "Matches pilot invoice proposal vendor name (manual)",
    source: "directory-mock",
  },
  {
    id: "vnd-lotto-1",
    name: "State Lottery Distributor",
    category: "lottery",
    contactName: "Pack courier",
    phone: "UNKNOWN",
    email: "UNKNOWN",
    storeCodes: ["*"],
    notes: "Pack delivery only — not a lottery terminal feed",
    source: "directory-mock",
  },
  {
    id: "vnd-svc-1",
    name: "Store Maintenance Services",
    category: "services",
    contactName: "On-call tech",
    phone: "UNKNOWN",
    email: "UNKNOWN",
    storeCodes: ["*"],
    notes: "HVAC / cooler service — no supplier portal",
    source: "directory-mock",
  },
];

const CATEGORY_LABEL: Record<VendorCategory, string> = {
  fuel: "Fuel",
  grocery: "Grocery",
  lottery: "Lottery",
  services: "Services",
  beverage: "Beverage",
  tobacco: "Tobacco",
  other: "Other",
};

export function VendorsPage() {
  const { token, storeId, memberships } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [filter, setFilter] = useState<VendorCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [vendorName, setVendorName] = useState("Demo Vendor Co");
  const [method, setMethod] = useState<"cash" | "check" | "ach_stub" | "card_stub">(
    "cash",
  );
  const [amountDollars, setAmountDollars] = useState("25.00");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [memo, setMemo] = useState("");

  const store = memberships.find((m) => m.storeId === storeId);

  async function refreshPayments(accessToken: string, activeStoreId: string) {
    const res = await api<{ payments: VendorPayment[] }>(
      `/stores/${activeStoreId}/vendor-payments`,
      { token: accessToken },
    );
    setPayments(res.payments);
  }

  useEffect(() => {
    if (!token || !storeId) return;
    api<{ invoices: Invoice[] }>(`/stores/${storeId}/invoices`, { token })
      .then((res) => setInvoices(res.invoices))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Invoice link unavailable"),
      );
    refreshPayments(token, storeId).catch((e) =>
      setError(e instanceof Error ? e.message : "Payments unavailable"),
    );
  }, [token, storeId]);

  const invoiceVendors = useMemo(() => {
    const map = new Map<string, VendorRow>();
    for (const inv of invoices) {
      const key = inv.vendorName.trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          id: `inv-${key}`,
          name: inv.vendorName,
          category: "grocery",
          contactName: "UNKNOWN",
          phone: "UNKNOWN",
          email: "UNKNOWN",
          storeCodes: store ? [store.storeCode] : [],
          notes: `Seen on invoice proposals for ${store?.storeCode ?? "store"} — not a portal sync`,
          source: "invoice-derived",
        });
      }
    }
    return [...map.values()];
  }, [invoices, store]);

  const rows = useMemo(() => {
    const byName = new Map<string, VendorRow>();
    for (const v of DIRECTORY_SEED) {
      byName.set(v.name.toLowerCase(), v);
    }
    for (const v of invoiceVendors) {
      const k = v.name.toLowerCase();
      if (!byName.has(k)) byName.set(k, v);
    }
    let list = [...byName.values()];
    if (filter !== "all") {
      list = list.filter((v) => v.category === filter);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [invoiceVendors, filter]);

  if (!token) return <Navigate to="/login" replace />;

  async function recordPayment() {
    if (!token || !storeId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const dollars = Number.parseFloat(amountDollars);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        throw new Error("Enter a positive amount");
      }
      const amountMinor = Math.round(dollars * 100);
      const payload: Record<string, unknown> = {
        storeId,
        vendorName,
        method,
        amountMinor,
        memo: memo || undefined,
        idempotencyKey: `web-pay-${Date.now()}`,
      };
      if (method === "check") {
        payload.checkNumber = checkNumber;
        payload.checkDate = checkDate;
      }
      const created = await api<VendorPayment>("/vendor-payments", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      setMessage(
        `Recorded ${created.method} $${(created.amountMinor / 100).toFixed(2)} → ${created.vendorName}. AI did not post money. Audit appended.`,
      );
      await refreshPayments(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleShell
      title="Vendors"
      eyebrow="Supplier directory + payouts"
      status="PARTIAL"
      note="Directory remains MOCK (no EDI/portal). Cash/check vendor payments are WORKING with store-scoped authz and append-only audit. ach_stub/card_stub are honesty stubs — no bank rail connected."
    >
      <ModuleWorkspace
        fieldLabel="Vendor notes / contacts"
        fieldPlaceholder="Paste vendor contact, scan business card (device-local)…"
        scanLabel="Scan card"
        showDocument
      >
        <AiAssistPanel department="vendors" label="Vendors" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Vendor payments</h2>
        <p className="muted">
          Record cash payouts and checks for the active store. Append-only audit
          on every record. No Plaid / ACH / card processor connected.
        </p>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <label style={{ margin: 0, flex: "1 1 160px" }}>
            Vendor
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
          </label>
          <label style={{ margin: 0, flex: "0 1 120px" }}>
            Method
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as typeof method)
              }
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="ach_stub">ACH (stub)</option>
              <option value="card_stub">Card (stub)</option>
            </select>
          </label>
          <label style={{ margin: 0, flex: "0 1 110px" }}>
            Amount ($)
            <input
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        {method === "check" && (
          <div className="row" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <label style={{ margin: 0, flex: "1 1 120px" }}>
              Check #
              <input
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
              />
            </label>
            <label style={{ margin: 0, flex: "1 1 140px" }}>
              Check date
              <input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </label>
          </div>
        )}
        <label>
          Memo
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <button type="button" disabled={busy} onClick={() => void recordPayment()}>
          Record payment
        </button>
        {message && <p className="muted">{message}</p>}
        {error && <p className="err">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Method</th>
              <th>Check #</th>
              <th>Date</th>
              <th>Amount (¢)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.vendorName}</td>
                <td>{p.method}</td>
                <td>{p.checkNumber ?? "—"}</td>
                <td>{p.checkDate ?? "—"}</td>
                <td>{p.amountMinor}</td>
                <td>{p.status}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No payments recorded for this store yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="demo-tag">
          WORKING cash/check · MOCK ach/card stubs · AI never posts money
        </p>
      </div>

      <div className="data-panel">
        <h2>Directory</h2>
        <p className="muted">
          Categories for c-store / fuel ops. Multi-store aware: active store{" "}
          {store?.storeCode ?? "—"}; org portfolio has {memberships.length}{" "}
          location
          {memberships.length === 1 ? "" : "s"}.
        </p>
        <label className="filter-row">
          <span className="section-label">Category</span>
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as VendorCategory | "all")
            }
          >
            <option value="all">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as VendorCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Category</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Scope</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.name}</strong>
                  <div className="muted">{v.notes}</div>
                </td>
                <td>{CATEGORY_LABEL[v.category]}</td>
                <td>{v.contactName}</td>
                <td>{v.phone}</td>
                <td>
                  {v.storeCodes.includes("*")
                    ? "All locations (conceptual)"
                    : v.storeCodes.join(", ") || "UNKNOWN"}
                </td>
                <td>
                  {v.source === "invoice-derived" ? "Invoice name" : "MOCK dir"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="demo-tag">DEMO / MOCK · no vendor portal</p>
      </div>

      <div className="data-panel">
        <h2>Invoices &amp; bank statements</h2>
        <ul className="truth-list">
          <li>
            <strong>Invoice vendors (this store):</strong>{" "}
            {invoiceVendors.length
              ? invoiceVendors.map((v) => v.name).join(", ")
              : "none loaded"}
          </li>
          <li>
            <strong>Bank / Plaid sync:</strong> not connected (upload on Expenses)
          </li>
          <li>
            <strong>EDI / supplier portal:</strong> not connected
          </li>
        </ul>
        <div className="row-links">
          <Link to="/invoices" className="text-link">
            Scan invoices →
          </Link>
          <Link to="/expenses" className="text-link">
            Bank statement attach →
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
