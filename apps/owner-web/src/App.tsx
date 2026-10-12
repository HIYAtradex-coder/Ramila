import { useEffect, useState } from "react";

type Membership = {
  storeId: string;
  storeName: string;
  storeCode: string;
  role: string;
};

type InventoryItem = {
  id: string;
  skuCode: string;
  name: string;
  onHandEaches: number;
};

type Invoice = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  status: string;
  totalMinor: number;
  lineCount: number;
};

const API = import.meta.env.VITE_API_URL ?? "/api";

async function api<T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("content-type", "application/json");
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function App() {
  const [email, setEmail] = useState("owner@demo.hiya.local");
  const [password, setPassword] = useState("demo-pass-change-me");
  const [token, setToken] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvalPin, setApprovalPin] = useState("123456");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{
        accessToken: string;
        memberships: Membership[];
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      setMemberships(res.memberships);
      setStoreId(res.memberships[0]?.storeId ?? "");
      setMessage("Signed in. Store scopes loaded from server memberships.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshStoreData(activeStoreId: string, accessToken: string) {
    const [inv, docs] = await Promise.all([
      api<{ items: InventoryItem[] }>(`/stores/${activeStoreId}/inventory`, {
        token: accessToken,
      }),
      api<{ invoices: Invoice[] }>(`/stores/${activeStoreId}/invoices`, {
        token: accessToken,
      }),
    ]);
    setItems(inv.items);
    setInvoices(docs.invoices);
  }

  useEffect(() => {
    if (!token || !storeId) return;
    refreshStoreData(storeId, token).catch((e) =>
      setError(e instanceof Error ? e.message : "Load failed"),
    );
  }, [token, storeId]);

  async function createProposal() {
    if (!token || !storeId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string; status: string; inventoryPosted: boolean }>(
        "/invoices/proposals",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            storeId,
            vendorName: "Demo Vendor Co",
            invoiceNumber: `WEB-${Date.now()}`,
            invoiceDate: new Date().toISOString().slice(0, 10),
            lines: [
              {
                skuCode: "SKU-WATER-24",
                description: "Bottled Water 24pk",
                quantityEaches: 3,
                unitCostMinor: 499,
                confidence: 62,
              },
            ],
            sourceNote: "owner_web_manual_entry",
          }),
        },
      );
      setMessage(
        `Proposal ${created.id.slice(0, 8)}… status=${created.status}. Inventory posted: ${created.inventoryPosted}`,
      );
      await refreshStoreData(storeId, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proposal failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveLatest() {
    if (!token || !storeId) return;
    const pending = invoices.find((i) =>
      ["proposed", "needs_review", "approved"].includes(i.status),
    );
    if (!pending) {
      setError("No approvable invoice in this store");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ status: string; inventoryPosted: boolean }>(
        `/invoices/${pending.id}/approve`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            approvalPin,
            idempotencyKey: `web-${pending.id}`,
          }),
        },
      );
      setMessage(
        `Invoice ${pending.invoiceNumber} → ${res.status}. Human-approved post: ${res.inventoryPosted}`,
      );
      await refreshStoreData(storeId, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <p className="status">Pilot console</p>
      <h1 className="brand">HIYA SmartPOS</h1>
      <p className="tagline">
        Owner web starter — multi-store scopes, invoice proposals, and
        human-approve-before-post. AI never posts inventory.
      </p>

      {!token ? (
        <section className="panel">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy} onClick={login}>
            Sign in
          </button>
          <p className="muted">
            Synthetic seed: owner@demo.hiya.local / demo-pass-change-me
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <label>
              Active store
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.storeId} value={m.storeId}>
                    {m.storeCode} — {m.storeName} ({m.role})
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button disabled={busy} onClick={createProposal}>
                Create invoice proposal
              </button>
              <label style={{ margin: 0, flex: "1 1 140px" }}>
                Approval PIN
                <input
                  value={approvalPin}
                  onChange={(e) => setApprovalPin(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy} onClick={approveLatest}>
                Approve &amp; post stock
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>On-hand inventory</h2>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Eaches</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.skuCode}</td>
                    <td>{i.name}</td>
                    <td>{i.onHandEaches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h2>Invoices</h2>
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Total (¢)</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.vendorName}</td>
                    <td>{inv.status}</td>
                    <td>{inv.totalMinor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {message && <p className="muted">{message}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
