import { Link, Navigate, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ClipboardList,
  FileText,
  LayoutGrid,
  Package,
  Receipt,
  Store,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  EXTRA_STORE_PRICE_MINOR,
  formatUsdMinor,
} from "../lib/store-plan";

type Tone = "gold" | "green" | "blue" | "purple" | "teal" | "slate";

type TileDef = {
  to: string;
  label: string;
  tone: Tone;
  icon: LucideIcon;
  status: string;
};

/** Full system modules — same set for every store (store-scoped). */
const DAILY: TileDef[] = [
  { to: "/pos", label: "POS", tone: "gold", icon: Store, status: "MISSING" },
  {
    to: "/reports",
    label: "Daily",
    tone: "green",
    icon: ClipboardList,
    status: "PARTIAL",
  },
  { to: "/lottery", label: "Lotto", tone: "teal", icon: Ticket, status: "MOCK" },
  {
    to: "/sales-tax",
    label: "Tax",
    tone: "blue",
    icon: Receipt,
    status: "MOCK",
  },
];

const MANAGE: TileDef[] = [
  {
    to: "/employees",
    label: "Team",
    tone: "purple",
    icon: Users,
    status: "PARTIAL",
  },
  {
    to: "/cameras",
    label: "Cameras",
    tone: "slate",
    icon: Camera,
    status: "BLOCKED",
  },
  {
    to: "/expenses",
    label: "Expenses",
    tone: "gold",
    icon: Wallet,
    status: "MOCK",
  },
  {
    to: "/inventory",
    label: "Inventory",
    tone: "purple",
    icon: Package,
    status: "WORKING",
  },
];

const BOOKS: TileDef[] = [
  {
    to: "/invoices",
    label: "Invoices",
    tone: "green",
    icon: FileText,
    status: "WORKING",
  },
  {
    to: "/stores",
    label: "Stores",
    tone: "blue",
    icon: LayoutGrid,
    status: "PARTIAL",
  },
];

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function Tile({ tile }: { tile: TileDef }) {
  const Icon = tile.icon;
  return (
    <Link to={tile.to} className={`app-tile app-tile--${tile.tone}`}>
      <span className="app-tile-icon" aria-hidden>
        <Icon size={28} strokeWidth={1.85} />
      </span>
      <span className="app-tile-label">{tile.label}</span>
      <span className="app-tile-status">{tile.status}</span>
    </Link>
  );
}

export function HomePage() {
  const { token, memberships, storeId, setStoreId, logout } = useAuth();
  const navigate = useNavigate();
  if (!token) return <Navigate to="/login" replace />;

  const store = memberships.find((m) => m.storeId === storeId);
  const extras = Math.max(0, memberships.length - 1);

  return (
    <div className="home-shell">
      <header className="home-top">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden>
            H
          </div>
          <div>
            <p className="eyebrow">HIYA · Smart Commerce</p>
            <h1 className="brand brand--home">Daily Station</h1>
            <p className="home-date">{todayLabel()}</p>
          </div>
        </div>
        <button type="button" className="text-btn" onClick={logout}>
          Sign out
        </button>
      </header>

      <div className="home-screen">
        <p className="home-greeting">
          {store ? `${store.storeCode} · ${store.storeName}` : "Select a store"}
        </p>

        <section className="tile-section">
          <p className="section-label">Store management</p>
          <p className="home-plan-line">
            Base = 1 store included · Extra ={" "}
            {formatUsdMinor(EXTRA_STORE_PRICE_MINOR)}/mo MOCK
            {extras > 0
              ? ` · ${extras} extra · ${formatUsdMinor(extras * EXTRA_STORE_PRICE_MINOR)}/mo`
              : ""}
          </p>
          <div className="store-tile-grid">
            {memberships.map((m, idx) => (
              <button
                key={m.storeId}
                type="button"
                className={
                  m.storeId === storeId
                    ? "store-app-tile store-app-tile--on"
                    : "store-app-tile"
                }
                onClick={() => setStoreId(m.storeId)}
              >
                <span className="store-app-tile-icon" aria-hidden>
                  {idx + 1}
                </span>
                <span className="store-app-tile-label">{m.storeCode}</span>
                <span className="store-app-tile-meta">
                  {idx === 0
                    ? "Included"
                    : `+${formatUsdMinor(EXTRA_STORE_PRICE_MINOR)}/mo`}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="store-app-tile store-app-tile--add"
              onClick={() => navigate("/stores#add-store")}
            >
              <span className="store-app-tile-icon" aria-hidden>
                +
              </span>
              <span className="store-app-tile-label">Add store</span>
              <span className="store-app-tile-meta">
                +{formatUsdMinor(EXTRA_STORE_PRICE_MINOR)}/mo MOCK
              </span>
            </button>
          </div>
        </section>

        <p className="section-label" style={{ marginBottom: 0 }}>
          Full system · {store?.storeCode ?? "store"}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Same modules for every store — data stays store-scoped.
        </p>

        <section className="tile-section">
          <p className="section-label">Daily</p>
          <div className="tile-grid">
            {DAILY.map((t) => (
              <Tile key={t.to} tile={t} />
            ))}
          </div>
        </section>

        <section className="tile-section">
          <p className="section-label">Manage</p>
          <div className="tile-grid">
            {MANAGE.map((t) => (
              <Tile key={t.to} tile={t} />
            ))}
          </div>
        </section>

        <section className="tile-section">
          <p className="section-label">Books</p>
          <div className="tile-grid">
            {BOOKS.map((t) => (
              <Tile key={t.to} tile={t} />
            ))}
          </div>
        </section>

        <p className="home-honesty">
          Tile status badges are honesty labels. Billing for extra stores is
          MOCK — no POS, lottery filing, tax filing, VMS, bank feed, or Stripe
          charge is claimed live.
        </p>
      </div>

      <nav className="home-dock" aria-label="Primary">
        <div className="home-dock-inner">
          <Link to="/" className="dock-item dock-item--on">
            <Store size={20} strokeWidth={2} />
            <span>Home</span>
          </Link>
          <Link to="/pos" className="dock-item">
            <Wallet size={20} strokeWidth={2} />
            <span>POS</span>
          </Link>
          <Link to="/lottery" className="dock-item">
            <Ticket size={20} strokeWidth={2} />
            <span>Lotto</span>
          </Link>
          <Link to="/reports" className="dock-item">
            <ClipboardList size={20} strokeWidth={2} />
            <span>Daily</span>
          </Link>
          <Link to="/stores" className="dock-item">
            <LayoutGrid size={20} strokeWidth={2} />
            <span>Stores</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
