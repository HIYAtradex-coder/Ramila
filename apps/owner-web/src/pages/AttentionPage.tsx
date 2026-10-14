import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ModuleShell } from "../components/ModuleShell";
import { ModuleWorkspace } from "../components/ModuleWorkspace";
import { AiAssistPanel } from "../components/AiAssistPanel";
import { useAuth } from "../auth";
import { api, type Invoice } from "../api";

type AttentionItem = {
  id: string;
  tone: "live" | "demo";
  title: string;
  detail: string;
  href?: string;
};

export function AttentionPage() {
  const { token, storeId, memberships } = useAuth();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const store = memberships.find((m) => m.storeId === storeId);

  useEffect(() => {
    if (!token || !storeId) return;
    setLoading(true);
    api<{ invoices: Invoice[] }>(`/stores/${storeId}/invoices`, { token })
      .then((docs) => {
        const pending = docs.invoices.filter((i) =>
          ["proposed", "needs_review", "approved"].includes(i.status),
        );
        const live: AttentionItem[] = pending.map((inv) => ({
          id: `inv-${inv.id}`,
          tone: "live",
          title: `Invoice ready for human review · ${inv.vendorName}`,
          detail: `${store?.storeCode ?? "store"} · #${inv.invoiceNumber} · ${inv.status} · AI never posts`,
          href: "/invoices",
        }));
        const demo: AttentionItem[] = [
          {
            id: "demo-sales",
            tone: "demo",
            title: "Possible missed scan — needs review",
            detail:
              "DEMO · POS event correlation UNKNOWN until register + camera feeds exist. Neutral language only — not guilt.",
            href: "/cameras",
          },
          {
            id: "demo-expiry",
            tone: "demo",
            title: "Expiring lots this week",
            detail:
              "DEMO · lot/expiry ledger MISSING — open Expiry tile for workpaper shell.",
            href: "/expiry",
          },
          {
            id: "demo-cash",
            tone: "demo",
            title: "Cash / ATM workpaper incomplete",
            detail:
              "DEMO · safe/deposit/ATM amounts UNKNOWN — not shown as $0.",
            href: "/cash",
          },
        ];
        setItems([...live, ...demo]);
      })
      .catch(() => {
        setItems([
          {
            id: "err-queue",
            tone: "demo",
            title: "Invoice queue unreachable",
            detail:
              "Could not load pilot invoices for this store — treat pending count as UNKNOWN.",
            href: "/approvals",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [token, storeId, store?.storeCode]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <ModuleShell
      title="Attention"
      eyebrow="Needs review"
      status="MOCK"
      note="Smart Queue style surface: live invoice proposals plus DEMO possible-issue rows. An anomaly is not proof of fraud — human review required. No fabricated green dashboard."
    >
      <ModuleWorkspace
        fieldLabel="Review notes"
        fieldPlaceholder="Paste context, scan exception photo (device-local)…"
        scanLabel="Scan evidence"
        showDocument
      >
        <AiAssistPanel department="attention" label="Attention" />
      </ModuleWorkspace>

      {loading ? (
        <p className="muted">Loading attention items…</p>
      ) : (
        <div className="attention-list">
          {items.map((item) => (
            <div
              key={item.id}
              className={
                item.tone === "live"
                  ? "attention-item attention-item--live"
                  : "attention-item"
              }
            >
              <div>
                <strong>{item.title}</strong>
                <p className="muted">{item.detail}</p>
                <span className="demo-tag">
                  {item.tone === "live" ? "LIVE · invoice API" : "DEMO · proposal"}
                </span>
              </div>
              {item.href && (
                <Link to={item.href} className="text-link">
                  Open →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
