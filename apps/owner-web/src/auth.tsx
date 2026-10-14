import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Membership } from "./api";

type AuthState = {
  token: string | null;
  memberships: Membership[];
  storeId: string;
  setStoreId: (id: string) => void;
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

function readStored(): {
  token: string | null;
  memberships: Membership[];
  storeId: string;
} {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const memberships = JSON.parse(
      sessionStorage.getItem(MEMBERSHIPS_KEY) ?? "[]",
    ) as Membership[];
    const storeId =
      sessionStorage.getItem(STORE_KEY) ?? memberships[0]?.storeId ?? "";
    return { token, memberships, storeId };
  } catch {
    return { token: null, memberships: [], storeId: "" };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [token, setToken] = useState<string | null>(stored.token);
  const [memberships, setMemberships] = useState<Membership[]>(
    stored.memberships,
  );
  const [storeId, setStoreIdState] = useState(stored.storeId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStoreId = useCallback((id: string) => {
    setStoreIdState(id);
    sessionStorage.setItem(STORE_KEY, id);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
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
      const first = res.memberships[0]?.storeId ?? "";
      setStoreIdState(first);
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
      sessionStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(res.memberships));
      sessionStorage.setItem(STORE_KEY, first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMemberships([]);
    setStoreIdState("");
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(MEMBERSHIPS_KEY);
    sessionStorage.removeItem(STORE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      token,
      memberships,
      storeId,
      setStoreId,
      login,
      logout,
      busy,
      error,
      clearError: () => setError(null),
    }),
    [token, memberships, storeId, setStoreId, login, logout, busy, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
