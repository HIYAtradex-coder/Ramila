import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { token, login, busy, error } = useAuth();
  const [email, setEmail] = useState("owner@demo.hiya.local");
  const [password, setPassword] = useState("demo-pass-change-me");

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      /* error surfaced via auth context */
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden>
            H
          </div>
          <div>
            <p className="eyebrow">HIYA · Smart Commerce</p>
            <h1 className="brand">Daily Station</h1>
          </div>
        </div>
        <p className="login-lead">
          Owner home for multi-store ops. Sign in with your store memberships —
          not a shared store password.
        </p>
        <form onSubmit={onSubmit} className="login-form">
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {error && <p className="err">{error}</p>}
        <p className="muted">
          Synthetic seed: owner@demo.hiya.local / demo-pass-change-me
        </p>
      </div>
    </div>
  );
}
