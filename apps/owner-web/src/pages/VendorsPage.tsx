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
  /** Which stores this vendor typically serves — conceptual scopes */
  storeCodes: string[];
  notes: string;
  source: "directory-mock" | "invoice-derived";
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
  const [filter, setFilter] = useState<VendorCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const store = memberships.find((m) => m.storeId === storeId);

  useEffect(() => {
    if (!token || !storeId) return;
    api<{ invoices: Invoice[] }>(`/stores/${storeId}/invoices`, { token })
      .then((res) => setInvoices(res.invoices))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Invoice link unavailable"),
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

  return (
    <ModuleShell
      title="Vendors"
      eyebrow="Supplier directory"
      status="MOCK"
      note="Vendor directory is a local/workpaper shell. Invoice vendor names from the pilot API are listed when available for this store. No EDI, supplier portal, or “vendor connected” claim."
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
        <h2>Invoices &amp; purchasing</h2>
        <p className="muted">
          Conceptual link only: invoice proposals carry a vendor name. Purchasing
          / rebates / EDI remain MISSING. AI never posts stock from a vendor
          catalog.
        </p>
        {error && <p className="err">{error}</p>}
        <ul className="truth-list">
          <li>
            <strong>Invoice vendors (this store):</strong>{" "}
            {invoiceVendors.length
              ? invoiceVendors.map((v) => v.name).join(", ")
              : "none loaded"}
          </li>
          <li>
            <strong>EDI / supplier portal:</strong> not connected
          </li>
          <li>
            <strong>PO / rebate claims:</strong> MISSING
          </li>
        </ul>
        <div className="row-links">
          <Link to="/invoices" className="text-link">
            Open invoices →
          </Link>
          <Link to="/stores" className="text-link">
            Multi-store seats →
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
