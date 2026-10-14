import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Invoice } from "../api";

export function InvoicesPage() {
  const { token, storeId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvalPin, setApprovalPin] = useState("123456");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(accessToken: string, activeStoreId: string) {
    const docs = await api<{ invoices: Invoice[] }>(
      `/stores/${activeStoreId}/invoices`,
      { token: accessToken },
    );
    setInvoices(docs.invoices);
  }

  useEffect(() => {
    if (!token || !storeId) return;
    refresh(token, storeId).catch((e) =>
      setError(e instanceof Error ? e.message : "Load failed"),
    );
  }, [token, storeId]);

  if (!token) return <Navigate to="/login" replace />;

  async function createProposal() {
    if (!token || !storeId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<{
        id: string;
        status: string;
        inventoryPosted: boolean;
      }>("/invoices/proposals", {
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
      });
      setMessage(
        `Proposal ${created.id.slice(0, 8)}… status=${created.status}. Inventory posted: ${created.inventoryPosted} (must stay false until human approve).`,
      );
      await refresh(token, storeId);
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
      await refresh(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleShell
      title="Invoices"
      eyebrow="Propose → human post"
      status="WORKING"
      note="Pilot invoice path: create proposal, then approve with PIN. AI never posts inventory. Document capture is device-local only — not OCR vendor ingest yet."
    >
      <ModuleWorkspace
        fieldLabel="Invoice notes / OCR scratch"
        fieldPlaceholder="Paste vendor text, attach doc photo, or scan…"
        scanLabel="Scan doc"
        showDocument
      >
        <AiAssistPanel department="invoices" label="Invoices" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Actions</h2>
        <div className="row">
          <button type="button" disabled={busy} onClick={createProposal}>
            Create invoice proposal
          </button>
          <label style={{ margin: 0, flex: "1 1 140px" }}>
            Approval PIN
            <input
              value={approvalPin}
              onChange={(e) => setApprovalPin(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={approveLatest}
          >
            Approve &amp; post stock
          </button>
        </div>
        <p className="muted">
          Step-up PIN required. Synthetic seed PIN: 123456. AI has no approve
          button.
        </p>
      </div>

      {message && <p className="muted">{message}</p>}
      {error && <p className="err">{error}</p>}

      <div className="data-panel">
        <h2>Invoices (live)</h2>
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
            {invoices.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No invoices yet — create a proposal above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
