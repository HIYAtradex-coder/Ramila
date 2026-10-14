import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { useAuth } from "../auth";
import type { ReactNode } from "react";

type Status = "WORKING" | "PARTIAL" | "MOCK" | "MISSING" | "BLOCKED";

export function ModuleShell({
  title,
  eyebrow,
  status,
  children,
  note,
}: {
  title: string;
  eyebrow: string;
  status: Status;
  children: ReactNode;
  note?: string;
}) {
  const { memberships, storeId, setStoreId, logout } = useAuth();
  const store = memberships.find((m) => m.storeId === storeId);

  return (
    <div className="module-shell">
      <header className="module-top">
        <Link to="/" className="back-link" aria-label="Back to Home">
          <ChevronLeft size={22} strokeWidth={2.25} />
          <span>Home</span>
        </Link>
        <div className="module-top-actions">
          <label className="store-pill">
            <span className="sr-only">Store</span>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              aria-label="Active store"
            >
              {memberships.map((m) => (
                <option key={m.storeId} value={m.storeId}>
                  {m.storeCode}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="text-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="module-hero">
        <p className="eyebrow">{eyebrow}</p>
        <div className="module-title-row">
          <h1>{title}</h1>
          <StatusBadge status={status} />
        </div>
        {store && (
          <p className="module-store">
            {store.storeName} · {store.storeCode}
          </p>
        )}
        {note && <p className="module-note">{note}</p>}
      </div>

      <div className="module-body">{children}</div>
    </div>
  );
}
