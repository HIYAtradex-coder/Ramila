import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api } from "../api";
import { fileToBase64, mimeAllowedForBank } from "../lib/file-to-base64";

type BankAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  contentHash: string;
  periodLabel?: string | null;
  note?: string | null;
  linkedVendorPaymentId?: string | null;
  linkedExpenseId?: string | null;
  createdAt: string;
  bankSyncConnected: false;
  honesty: string;
};

type VendorPayment = {
  id: string;
  vendorName: string;
  method: string;
  amountMinor: number;
};

export function ExpensesPage() {
  const { token, storeId } = useAuth();
  const [attachments, setAttachments] = useState<BankAttachment[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [periodLabel, setPeriodLabel] = useState(
    () => new Date().toISOString().slice(0, 7),
  );
  const [linkPaymentId, setLinkPaymentId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bankSyncHonesty, setBankSyncHonesty] = useState(
    "Bank sync MOCK — not connected",
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function refresh(accessToken: string, activeStoreId: string) {
    const [atts, pays, sync] = await Promise.all([
      api<{
        attachments: BankAttachment[];
        bankSync: { connected: boolean; honesty: string };
      }>(`/stores/${activeStoreId}/bank-statements`, { token: accessToken }),
      api<{ payments: VendorPayment[] }>(
        `/stores/${activeStoreId}/vendor-payments`,
        { token: accessToken },
      ).catch(() => ({ payments: [] as VendorPayment[] })),
      api<{ connected: boolean; honesty: string }>("/bank-sync/status", {
        token: accessToken,
      }),
    ]);
    setAttachments(atts.attachments);
    setPayments(pays.payments);
    setBankSyncHonesty(sync.honesty);
  }

  useEffect(() => {
    if (!token || !storeId) return;
    refresh(token, storeId).catch((e) =>
      setError(e instanceof Error ? e.message : "Load failed"),
    );
  }, [token, storeId]);

  if (!token) return <Navigate to="/login" replace />;

  async function uploadFile(file: File) {
    if (!token || !storeId) return;
    if (!mimeAllowedForBank(file.type)) {
      setError(`Unsupported type: ${file.type || "unknown"}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const created = await api<BankAttachment>("/bank-statements", {
        method: "POST",
        token,
        body: JSON.stringify({
          storeId,
          fileName: file.name || "statement.jpg",
          mimeType: file.type,
          contentBase64,
          periodLabel: periodLabel || undefined,
          note: note || undefined,
          linkedVendorPaymentId: linkPaymentId || undefined,
        }),
      });
      setMessage(
        `Uploaded ${created.fileName} (${created.byteSize} bytes). bankSyncConnected=${created.bankSyncConnected}. Reference link only — no money posted.`,
      );
      await refresh(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function proposeMatches(id: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{
        moneyPosted: boolean;
        expensesPosted: boolean;
        requiresHumanReview: boolean;
        honesty: string;
      }>(`/bank-statements/${id}/propose-matches`, {
        method: "POST",
        token,
      });
      setMessage(
        `AI propose: moneyPosted=${res.moneyPosted} expensesPosted=${res.expensesPosted}. ${res.honesty}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Propose failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleShell
      title="Expenses"
      eyebrow="Spend + bank statements"
      status="PARTIAL"
      note="Bank statement PDF/image upload is WORKING (store-scoped + audit). No Plaid/bank feed. Expense draft/post may land with profitability (OperatingExpense) — soft links only here. AI propose never posts money."
    >
      <ModuleWorkspace
        fieldLabel="Expense notes"
        fieldPlaceholder="Paste memo, scan/attach receipt photo (device-local)…"
        scanLabel="Scan receipt"
        showDocument
      >
        <AiAssistPanel department="expenses" label="Expenses" />
      </ModuleWorkspace>

      <div className="data-panel">
        <h2>Bank statement attachments</h2>
        <p className="muted">{bankSyncHonesty}</p>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <label style={{ margin: 0, flex: "0 1 140px" }}>
            Period
            <input
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="YYYY-MM"
            />
          </label>
          <label style={{ margin: 0, flex: "1 1 180px" }}>
            Link vendor payment (optional)
            <select
              value={linkPaymentId}
              onChange={(e) => setLinkPaymentId(e.target.value)}
            >
              <option value="">None</option>
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.vendorName} · {p.method} · {p.amountMinor}¢
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="row">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Upload PDF / image
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            Photo statement
          </button>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void uploadFile(f);
          }}
        />
        <input
          ref={cameraRef}
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void uploadFile(f);
          }}
        />
        {message && <p className="muted">{message}</p>}
        {error && <p className="err">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Bytes</th>
              <th>Period</th>
              <th>Linked payment</th>
              <th>AI</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.fileName}</strong>
                  <div className="muted">{a.contentHash.slice(0, 12)}…</div>
                </td>
                <td>{a.mimeType}</td>
                <td>{a.byteSize}</td>
                <td>{a.periodLabel ?? "—"}</td>
                <td>{a.linkedVendorPaymentId ? "yes" : "—"}</td>
                <td>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void proposeMatches(a.id)}
                  >
                    Propose matches
                  </button>
                </td>
              </tr>
            ))}
            {attachments.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No statements uploaded for this store.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="demo-tag">
          WORKING upload · MOCK bank sync · AI propose never posts
        </p>
      </div>

      <div className="empty-panel">
        <h2>Operating expenses</h2>
        <p>
          Draft/post/void expense ledger is owned by the profitability slice (
          <code>OperatingExpense</code>). This page soft-links{" "}
          <code>linkedExpenseId</code> only — no fabricated bank card feed.
        </p>
        <ul className="truth-list">
          <li>
            <strong>Bank feed:</strong> not connected
          </li>
          <li>
            <strong>Card feed:</strong> not connected
          </li>
          <li>
            <strong>Vendor cash/check:</strong> record on{" "}
            <Link to="/vendors" className="text-link">
              Vendors
            </Link>
          </li>
        </ul>
        <p className="demo-tag">DEMO DATA · no fabricated feeds</p>
      </div>
    </ModuleShell>
  );
}
