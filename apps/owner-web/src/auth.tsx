import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Membership } from "./api";

type AuthState = {
  token: string | null;
  memberships: Membership[];
  storeId: string;
  organizationId: string | null;
  setStoreId: (id: string) => void;
  setMemberships: (next: Membership[]) => void;
  addMembership: (m: Membership) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  busy: boolean;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "hiya.owner.token";
const MEMBERSHIPS_KEY = "hiya.owner.memberships";
const STORE_KEY = "hiya.owner.storeId";
const ORG_KEY = "hiya.owner.orgId";

function readStored(): {
  token: string | null;
  memberships: Membership[];
  storeId: string;
  organizationId: string | null;
} {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const memberships = JSON.parse(
      sessionStorage.getItem(MEMBERSHIPS_KEY) ?? "[]",
    ) as Membership[];
    const storeId =
      sessionStorage.getItem(STORE_KEY) ?? memberships[0]?.storeId ?? "";
    const organizationId = sessionStorage.getItem(ORG_KEY);
    return { token, memberships, storeId, organizationId };
  } catch {
    return {
      token: null,
      memberships: [],
      storeId: "",
      organizationId: null,
    };
  }
}

function persistMemberships(memberships: Membership[]) {
  sessionStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
}

function pickStoreId(memberships: Membership[], preferred?: string | null) {
  if (preferred && memberships.some((m) => m.storeId === preferred)) {
    return preferred;
  }
  return memberships[0]?.storeId ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [token, setToken] = useState<string | null>(stored.token);
  const [memberships, setMembershipsState] = useState<Membership[]>(
    stored.memberships,
  );
  const [storeId, setStoreIdState] = useState(stored.storeId);
  const [organizationId, setOrganizationId] = useState<string | null>(
    stored.organizationId,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStoreId = useCallback(
    (id: string) => {
      setMembershipsState((current) => {
        const nextId = pickStoreId(current, id);
        setStoreIdState(nextId);
        if (nextId) sessionStorage.setItem(STORE_KEY, nextId);
        else sessionStorage.removeItem(STORE_KEY);
        return current;
      });
    },
    [],
  );

  const setMemberships = useCallback((next: Membership[]) => {
    setMembershipsState(next);
    persistMemberships(next);
    setStoreIdState((prev) => {
      const nextId = pickStoreId(next, prev);
      if (nextId) sessionStorage.setItem(STORE_KEY, nextId);
      else sessionStorage.removeItem(STORE_KEY);
      return nextId;
    });
  }, []);

  const addMembership = useCallback((m: Membership) => {
    setMembershipsState((prev) => {
      if (prev.some((x) => x.storeId === m.storeId)) return prev;
      const next = [...prev, m];
      persistMemberships(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMembershipsState([]);
    setStoreIdState("");
    setOrganizationId(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(MEMBERSHIPS_KEY);
    sessionStorage.removeItem(STORE_KEY);
    sessionStorage.removeItem(ORG_KEY);
  }, []);

  // Revalidate session memberships from the server; clear on 401.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{
      user: { organizationId: string };
      memberships: Membership[];
    }>("/auth/me", { token })
      .then((res) => {
        if (cancelled) return;
        setMembershipsState(res.memberships);
        persistMemberships(res.memberships);
        setOrganizationId(res.user.organizationId);
        sessionStorage.setItem(ORG_KEY, res.user.organizationId);
        setStoreIdState((prev) => {
          const nextId = pickStoreId(res.memberships, prev);
          if (nextId) sessionStorage.setItem(STORE_KEY, nextId);
          else sessionStorage.removeItem(STORE_KEY);
          return nextId;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "";
        if (/unauthorized|401/i.test(msg) || msg === "Unauthorized") {
          logout();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{
        accessToken: string;
        memberships: Membership[];
        user?: { organizationId: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      setMembershipsState(res.memberships);
      const first = pickStoreId(res.memberships);
      setStoreIdState(first);
      const orgId = res.user?.organizationId ?? null;
      setOrganizationId(orgId);
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
      persistMemberships(res.memberships);
      if (first) sessionStorage.setItem(STORE_KEY, first);
      else sessionStorage.removeItem(STORE_KEY);
      if (orgId) sessionStorage.setItem(ORG_KEY, orgId);
      else sessionStorage.removeItem(ORG_KEY);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      memberships,
      storeId,
      organizationId,
      setStoreId,
      setMemberships,
      addMembership,
      login,
      logout,
      busy,
      error,
      clearError: () => setError(null),
    }),
    [
      token,
      memberships,
      storeId,
      organizationId,
      setStoreId,
      setMemberships,
      addMembership,
      login,
      logout,
      busy,
      error,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
