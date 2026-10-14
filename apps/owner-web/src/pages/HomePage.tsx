import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Camera,
  CheckSquare,
  ClipboardList,
  FileText,
  Home,
  LayoutGrid,
  Package,
  Receipt,
  ScanBarcode,
  ShoppingCart,
  Store,
  Tag,
  Ticket,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  EXTRA_STORE_PRICE_MINOR,
  formatUsdMinor,
} from "../lib/store-plan";
import {
  formatMetric,
  loadPortfolioSummary,
  type PortfolioSummary,
} from "../lib/portfolio-summary";

type Tone = "gold" | "green" | "blue" | "purple" | "teal" | "slate";
type HomeTab = "portfolio" | "modules";

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
  {
    to: "/cash",
    label: "Cash",
    tone: "gold",
    icon: Banknote,
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
  {
    to: "/attention",
    label: "Attention",
    tone: "slate",
    icon: AlertTriangle,
    status: "MOCK",
  },
  {
    to: "/expiry",
    label: "Expiry",
    tone: "teal",
    icon: Timer,
    status: "MOCK",
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
    to: "/approvals",
    label: "Approvals",
    tone: "green",
    icon: CheckSquare,
    status: "PARTIAL",
  },
  {
    to: "/vendors",
    label: "Vendors",
    tone: "teal",
    icon: Building2,
    status: "MOCK",
  },
  {
    to: "/orders",
    label: "Orders",
    tone: "gold",
    icon: ShoppingCart,
    status: "MOCK",
  },
  {
    to: "/pricing",
    label: "Pricing",
    tone: "blue",
    icon: Tag,
    status: "MOCK",
  },
  {
    to: "/price-check",
    label: "Pricecheck",
    tone: "blue",
    icon: ScanBarcode,
    status: "MOCK",
  },
];

const PORTFOLIO: TileDef[] = [
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

function PortfolioHome({
  summary,
  loading,
  error,
  onOpenStore,
}: {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  onOpenStore: (storeId: string) => void;
}) {
  const t = summary?.totals;
  return (
    <div className="portfolio-home">
      <section className="tile-section">
        <p className="section-label">All stores · today</p>
        <p className="home-greeting">
          {summary
            ? `${summary.storeCount} subscriber ${summary.storeCount === 1 ? "store" : "stores"}`
            : "Portfolio summary"}
        </p>
        <p className="muted" style={{ margin: "0 0 0.75rem" }}>
          Cross-store rollup. Live inventory/invoice counts when the API is up;
          sales and cash stay UNKNOWN — never fake zeros.
        </p>

        {error && <p className="err">{error}</p>}
        {loading && !summary ? (
          <p className="muted">Loading portfolio facts…</p>
        ) : (
          <div className="summary-grid">
            <div className="summary-cell">
              <span
                className={
                  t?.netSales === "UNKNOWN"
                    ? "summary-value summary-value--unknown"
                    : "summary-value"
                }
              >
                {formatMetric(t?.netSales ?? "UNKNOWN")}
              </span>
              <span className="summary-label">Net sales</span>
              <span className="summary-src">POS not connected</span>
            </div>
            <div className="summary-cell">
              <span
                className={
                  typeof t?.skuCount === "number"
                    ? "summary-value"
                    : "summary-value summary-value--unknown"
                }
              >
                {formatMetric(t?.skuCount ?? "UNKNOWN")}
              </span>
              <span className="summary-label">SKUs on hand</span>
              <span className="summary-src">inventory API rollup</span>
            </div>
            <div className="summary-cell">
              <span
                className={
                  typeof t?.pendingApprovals === "number"
                    ? "summary-value"
                    : "summary-value summary-value--unknown"
                }
              >
                {formatMetric(t?.pendingApprovals ?? "UNKNOWN")}
              </span>
              <span className="summary-label">Awaiting post</span>
              <span className="summary-src">invoice API rollup</span>
            </div>
            <div className="summary-cell">
              <span
                className={
                  typeof t?.postedInvoices === "number"
                    ? "summary-value"
                    : "summary-value summary-value--unknown"
                }
              >
                {formatMetric(t?.postedInvoices ?? "UNKNOWN")}
              </span>
              <span className="summary-label">Posted invoices</span>
              <span className="summary-src">invoice API rollup</span>
            </div>
            <div className="summary-cell">
              <span className="summary-value summary-value--unknown">
                {formatMetric(t?.cashAtm ?? "UNKNOWN")}
              </span>
              <span className="summary-label">Cash / ATM</span>
              <span className="summary-src">no bank feed</span>
            </div>
            <div className="summary-cell">
              <span className="summary-value summary-value--unknown">
                {formatMetric(t?.lotterySettle ?? "UNKNOWN")}
              </span>
              <span className="summary-label">Lottery settle</span>
              <span className="summary-src">not a filing</span>
            </div>
          </div>
        )}
        <p className="demo-tag">DEMO DATA · UNKNOWN ≠ 0</p>
      </section>

      <section className="tile-section">
        <p className="section-label">Needs attention</p>
        <div className="attention-list">
          {typeof t?.pendingApprovals === "number" && t.pendingApprovals > 0 ? (
            <Link to="/approvals" className="attention-item attention-item--live">
              <div>
                <strong>
                  {t.pendingApprovals} invoice
                  {t.pendingApprovals === 1 ? "" : "s"} awaiting human post
                </strong>
                <p className="muted">
                  Across all stores · PIN approve on Invoices · AI never posts
                </p>
              </div>
              <span className="text-link">Queue →</span>
            </Link>
          ) : (
            <div className="attention-item">
              <div>
                <strong>No pending invoice posts in rollup</strong>
                <p className="muted">
                  Empty queue ≠ “all clear.” Sales exceptions stay UNKNOWN
                  without POS.
                </p>
              </div>
            </div>
          )}
          <Link to="/attention" className="attention-item">
            <div>
              <strong>Open Attention tile</strong>
              <p className="muted">
                LIVE invoice rows + DEMO possible-issue proposals (neutral
                language)
              </p>
            </div>
            <span className="text-link">Open →</span>
          </Link>
        </div>
      </section>

      <section className="tile-section">
        <p className="section-label">Per store</p>
        <div className="data-panel" style={{ padding: "0.5rem 0.75rem" }}>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Sales</th>
                <th>SKUs</th>
                <th>Pending</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(summary?.rollups ?? []).map((r) => (
                <tr key={r.storeId}>
                  <td>
                    <strong>{r.storeCode}</strong>
                    <div className="muted" style={{ fontSize: "0.72rem" }}>
                      {r.storeName}
                      {r.loadError ? ` · ${r.loadError}` : ""}
                    </div>
                  </td>
                  <td>{formatMetric(r.netSales)}</td>
                  <td>{formatMetric(r.skuCount)}</td>
                  <td>{formatMetric(r.pendingApprovals)}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onOpenStore(r.storeId)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
          {summary?.honesty}
        </p>
      </section>

      <div className="row-links">
        <Link to="/approvals" className="text-link">
          Approvals →
        </Link>
        <Link to="/stores" className="text-link">
          Store seats →
        </Link>
        <Link to="/reports" className="text-link">
          Daily (active) →
        </Link>
      </div>
    </div>
  );
}

export function HomePage() {
  const { token, memberships, storeId, setStoreId, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<HomeTab>("portfolio");
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || memberships.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPortfolioSummary(token, memberships)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Portfolio load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, memberships]);

  if (!token) return <Navigate to="/login" replace />;

  const store = memberships.find((m) => m.storeId === storeId);
  const extras = Math.max(0, memberships.length - 1);

  function openStoreModules(id: string) {
    setStoreId(id);
    setTab("modules");
  }

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
        <div className="home-tabs" role="tablist" aria-label="Home views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "portfolio"}
            className={
              tab === "portfolio" ? "home-tab home-tab--on" : "home-tab"
            }
            onClick={() => setTab("portfolio")}
          >
            All stores
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "modules"}
            className={tab === "modules" ? "home-tab home-tab--on" : "home-tab"}
            onClick={() => setTab("modules")}
          >
            Modules
          </button>
        </div>

        {tab === "portfolio" ? (
          <PortfolioHome
            summary={summary}
            loading={loading}
            error={error}
            onOpenStore={openStoreModules}
          />
        ) : (
          <>
            <p className="home-greeting">
              {store
                ? `${store.storeCode} · ${store.storeName}`
                : "Select a store"}
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

            <section className="tile-section">
              <p className="section-label">Portfolio</p>
              <div className="tile-grid">
                {PORTFOLIO.map((t) => (
                  <Tile key={t.to} tile={t} />
                ))}
              </div>
            </section>

            <p className="home-honesty">
              Tile status badges are honesty labels. Billing for extra stores is
              MOCK — no POS, lottery filing, tax filing, VMS, bank feed, Stripe,
              or fuel price publish is claimed live.
            </p>
          </>
        )}
      </div>

      <nav className="home-dock" aria-label="Primary">
        <div className="home-dock-inner">
          <Link to="/" className="dock-item dock-item--on">
            <Home size={20} strokeWidth={2} />
            <span>Home</span>
          </Link>
          <Link to="/approvals" className="dock-item">
            <CheckSquare size={20} strokeWidth={2} />
            <span>Approve</span>
          </Link>
          <Link to="/pos" className="dock-item">
            <Wallet size={20} strokeWidth={2} />
            <span>POS</span>
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
