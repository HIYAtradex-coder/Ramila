import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Invoice } from "../api";

type OrderKind = "vendor_po" | "customer_pickup" | "internal_transfer";

type OrderRow = {
  id: string;
  kind: OrderKind;
  title: string;
  counterparty: string;
  status: string;
  storeCode: string;
  honesty: string;
};

const KIND_LABEL: Record<OrderKind, string> = {
  vendor_po: "Vendor PO",
  customer_pickup: "Customer pickup",
  internal_transfer: "Internal transfer",
};

/** Structural MOCK shells — not a live marketplace or delivery network. */
const MOCK_ORDERS: OrderRow[] = [
  {
    id: "ord-po-1",
    kind: "vendor_po",
    title: "Weekly grocery restock",
    counterparty: "Demo Vendor Co",
    status: "DRAFT · MOCK",
    storeCode: "*",
    honesty: "Not sent to supplier · no EDI",
  },
  {
    id: "ord-pu-1",
    kind: "customer_pickup",
    title: "Pickup hold — age-check items",
    counterparty: "Walk-in customer",
    status: "SHELL · MOCK",
    storeCode: "*",
    honesty: "No DoorDash/Wawa/marketplace connected",
  },
  {
    id: "ord-xf-1",
    kind: "internal_transfer",
    title: "Transfer request between stores",
    counterparty: "Sister store",
    status: "SHELL · MOCK",
    storeCode: "*",
    honesty: "Needs multi-store human approve · not auto-posted",
  },
];

export function OrdersPage() {
  const { token, storeId, memberships } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const store = memberships.find((m) => m.storeId === storeId);

  useEffect(() => {
    if (!token || !storeId) return;
    let cancelled = false;
    api<{ invoices: Invoice[] }>(`/stores/${storeId}/invoices`, { token })
      .then((res) => {
        if (!cancelled) setInvoices(res.invoices);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Invoice link unavailable",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  if (!token) return <Navigate to="/login" replace />;

  const pendingInv = invoices.filter((i) =>
    ["proposed", "needs_review", "approved"].includes(i.status),
  ).length;

  const rows = MOCK_ORDERS.map((o) => ({
    ...o,
    storeCode: o.storeCode === "*" ? (store?.storeCode ?? "—") : o.storeCode,
  }));

  return (
    <ModuleShell
      title="Orders"
      eyebrow="Purchasing · pickup · POs"
      status="MOCK"
      note="Order shells for c-store ops only. Not a live customer marketplace or delivery network. Human approve before any inventory or money post. No DoorDash / Wawa / franchise order “connected” claim."
    >
      <ModuleWorkspace
        fieldLabel="Order notes / PO scratch"
        fieldPlaceholder="Paste PO lines, scan packing slip (device-local)…"
        scanLabel="Scan slip"
        showDocument
      >
        <AiAssistPanel department="orders" label="Orders" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Vendor POs</h2>
        <p className="muted">
          Purchasing workpapers for the active store ({store?.storeCode ?? "—"}).
          Portfolio has {memberships.length} location
          {memberships.length === 1 ? "" : "s"}. POs do not auto-create invoice
          posts.
        </p>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Vendor</th>
              <th>Store</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.kind === "vendor_po")
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.title}</strong>
                    <div className="muted">{r.honesty}</div>
                  </td>
                  <td>{r.counterparty}</td>
                  <td>{r.storeCode}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="demo-tag">MOCK · no EDI / supplier send</p>
      </div>

      <div className="data-panel">
        <h2>Customer pickup</h2>
        <p className="muted">
          Configurable pickup holds for age-restricted or special orders. Not a
          third-party delivery marketplace.
        </p>
        <table>
          <thead>
            <tr>
              <th>Hold</th>
              <th>Party</th>
              <th>Store</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.kind === "customer_pickup")
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.title}</strong>
                    <div className="muted">{r.honesty}</div>
                  </td>
                  <td>{r.counterparty}</td>
                  <td>{r.storeCode}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="demo-tag">MOCK · no DoorDash / Wawa connected</p>
      </div>

      <div className="data-panel">
        <h2>Internal / multi-store</h2>
        <table>
          <thead>
            <tr>
              <th>Transfer</th>
              <th>Counterparty</th>
              <th>Store</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.kind === "internal_transfer")
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.title}</strong>
                    <div className="muted">{r.honesty}</div>
                  </td>
                  <td>{r.counterparty}</td>
                  <td>{r.storeCode}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="data-panel">
        <h2>Vendors · invoices</h2>
        <p className="muted">
          Conceptual links: POs name a vendor; receiving often becomes an invoice
          proposal. Stock posts only after human PIN approve on Invoices — AI
          never posts.
        </p>
        {error && <p className="err">{error}</p>}
        <ul className="truth-list">
          <li>
            <strong>Kind:</strong> {KIND_LABEL.vendor_po} /{" "}
            {KIND_LABEL.customer_pickup} / {KIND_LABEL.internal_transfer}
          </li>
          <li>
            <strong>Invoices awaiting post (this store):</strong>{" "}
            {error ? "UNKNOWN" : pendingInv}
          </li>
          <li>
            <strong>Marketplace / delivery network:</strong> not connected
          </li>
        </ul>
        <div className="row-links">
          <Link to="/vendors" className="text-link">
            Open vendors →
          </Link>
          <Link to="/invoices" className="text-link">
            Open invoices →
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
