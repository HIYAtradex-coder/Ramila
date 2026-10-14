import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api } from "../api";

const CATEGORIES = [
  "electricity",
  "gas_utility",
  "water_sewer",
  "internet_phone",
  "pos_processing_fees",
  "credit_card_fees",
  "rent_lease",
  "payroll_wages",
  "payroll_taxes",
  "insurance",
  "repairs_maintenance",
  "cleaning_pest_control",
  "security_monitoring",
  "licenses_permits",
  "accounting_legal",
  "bank_fees",
  "advertising_marketing",
  "delivery_freight",
  "store_supplies",
  "waste_shrink",
  "property_tax",
  "other_miscellaneous",
] as const;

type Expense = {
  id: string;
  storeId: string;
  category: string;
  amountMinor: number;
  incurredDate: string;
  description: string;
  status: string;
  sourceType: string;
  vendorName: string | null;
};

function money(minor: number): string {
  return `$${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ExpensesPage() {
  const { token, storeId, memberships } = useAuth();
  const role = memberships.find((m) => m.storeId === storeId)?.role ?? "";
  const canDraft = ["owner", "manager", "bookkeeper"].includes(role);
  const canPost = ["owner", "bookkeeper"].includes(role);
  const canVoid = role === "owner";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("store_supplies");
  const [amount, setAmount] = useState("25.00");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [incurredDate, setIncurredDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [voidReason, setVoidReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (accessToken: string, locationId: string) => {
      const res = await api<{ expenses: Expense[] }>(
        `/v1/expenses?locationId=${encodeURIComponent(locationId)}`,
        { token: accessToken },
      );
      setExpenses(res.expenses);
    },
    [],
  );

  useEffect(() => {
    if (!token || !storeId) return;
    refresh(token, storeId).catch((e) =>
      setError(e instanceof Error ? e.message : "Load failed"),
    );
  }, [token, storeId, refresh]);

  if (!token) return <Navigate to="/login" replace />;

  async function createDraft() {
    if (!token || !storeId) return;
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a positive amount");
      return;
    }
    if (!description.trim()) {
      setError("Description required");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await api<Expense>("/v1/expenses", {
        method: "POST",
        token,
        body: JSON.stringify({
          storeId,
          category,
          amountMinor: Math.round(dollars * 100),
          incurredDate,
          description: description.trim(),
          sourceType: "MANUAL",
          idempotencyKey: `web-${storeId}-${Date.now()}`,
          vendorName: vendorName.trim() || undefined,
        }),
      });
      setMessage(
        `Draft ${created.id.slice(0, 8)}… saved — does not change net profit until posted.`,
      );
      setDescription("");
      await refresh(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function postExpense(id: string) {
    if (!token || !storeId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/expenses/${id}/post`, {
        method: "POST",
        token,
        body: JSON.stringify({}),
      });
      setMessage("Expense posted into profitability.");
      await refresh(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setBusy(false);
    }
  }

  async function voidExpense(id: string) {
    if (!token || !storeId) return;
    if (voidReason.trim().length < 3) {
      setError("Owner void requires a written reason");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/expenses/${id}/void`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      setMessage("Expense voided (audit logged).");
      setVoidReason("");
      await refresh(token, storeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Void failed");
    } finally {
      setBusy(false);
    }
  }

  const drafts = expenses.filter((e) => e.status === "draft");
  const posted = expenses.filter((e) => e.status === "posted");

  return (
    <ModuleShell
      title="Expenses"
      eyebrow="Operating spend"
      status="PARTIAL"
      note="Owner/manager/bookkeeper can draft. Only owner or bookkeeper can post into profitability. Only owner can void with a written reason. AI may propose fields from capture — never posts money. No bank/card feed connected."
    >
      <ModuleWorkspace
        fieldLabel="Receipt / memo"
        fieldPlaceholder="Paste memo, scan/attach receipt photo (device-local)…"
        scanLabel="Scan receipt"
        showDocument
      >
        <AiAssistPanel department="expenses" label="Expense assist" />
      </ModuleWorkspace>

      <div className="row-links" style={{ marginBottom: "0.75rem" }}>
        <Link to="/profitability" className="text-link">
          Open Profitability →
        </Link>
      </div>

      {canDraft ? (
        <section className="plan-panel rise-block">
          <h2>Add expense (draft)</h2>
          <div className="add-store-form">
            <label>
              Category
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as (typeof CATEGORIES)[number])
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (USD)
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Incurred date
              <input
                type="date"
                value={incurredDate}
                onChange={(e) => setIncurredDate(e.target.value)}
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
              />
            </label>
            <label>
              Vendor (optional)
              <input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="primary-btn"
              disabled={busy}
              onClick={() => void createDraft()}
            >
              Save draft
            </button>
          </div>
          <p className="muted">
            Draft never changes net profit. Posting requires owner or
            bookkeeper.
          </p>
        </section>
      ) : (
        <p className="muted">Your role cannot draft expenses for this store.</p>
      )}

      {error && <p className="err">{error}</p>}
      {message && <p className="ok">{message}</p>}

      {drafts.length > 0 && (
        <div className="draft-warn" role="status">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"} waiting for
          owner/bookkeeper posting.
        </div>
      )}

      <section className="plan-panel">
        <h2>Drafts</h2>
        {drafts.length === 0 ? (
          <p className="muted">No drafts.</p>
        ) : (
          <ul className="truth-list">
            {drafts.map((e) => (
              <li key={e.id}>
                <strong>
                  {money(e.amountMinor)} · {e.category.replace(/_/g, " ")}
                </strong>
                <span>
                  {e.incurredDate} — {e.description}
                </span>
                {canPost && (
                  <button
                    type="button"
                    className="text-btn"
                    disabled={busy}
                    onClick={() => void postExpense(e.id)}
                  >
                    Post
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="plan-panel">
        <h2>Posted</h2>
        {posted.length === 0 ? (
          <p className="muted">No posted expenses yet.</p>
        ) : (
          <ul className="truth-list">
            {posted.map((e) => (
              <li key={e.id}>
                <strong>
                  {money(e.amountMinor)} · {e.category.replace(/_/g, " ")}
                </strong>
                <span>
                  {e.incurredDate} — {e.description}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canVoid && (
          <label className="add-store-form" style={{ marginTop: "0.75rem" }}>
            Void reason (owner only)
            <input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Required written reason"
            />
            {posted[0] && (
              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={() => void voidExpense(posted[0].id)}
              >
                Void latest posted
              </button>
            )}
          </label>
        )}
      </section>

      <p className="demo-tag">
        DEMO · no bank/card feed · AI never posts money
      </p>
    </ModuleShell>
  );
}
