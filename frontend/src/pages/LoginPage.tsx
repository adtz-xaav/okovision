import { useState, type FormEvent } from "react";
import { api, ApiError, type SessionUser } from "../lib/api";
import type { Dictionary } from "../locales/en";

export function LoginPage({ t, onAuthenticated }: { t: Dictionary; onAuthenticated: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = mode === "login" ? await api.login(email, password) : await api.register(email, password);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof ApiError ? (mode === "login" ? t.login.error : t.login.registerError) : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ls-signin">
      <form className="ls-signin-card" onSubmit={handleSubmit}>
        <div className="ls-wordmark" style={{ marginBottom: 64 }}>
          <span className="ls-live-dot" />
          <span className="ls-wordmark-text">{t.appName}</span>
        </div>

        <h1 className="ls-signin-heading">{mode === "login" ? t.login.title : t.login.submitRegister}</h1>

        <label className="ls-field">
          <span className="ls-field-label">{t.login.email}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>

        <label className="ls-field">
          <span className="ls-field-label">{t.login.password}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && (
          <p className="ls-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="ls-button" disabled={submitting}>
          {mode === "login" ? t.login.submit : t.login.submitRegister}
        </button>

        <button type="button" className="ls-signin-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? t.login.registerInstead : t.login.backToLogin}
        </button>
      </form>
    </div>
  );
}
