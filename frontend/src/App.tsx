import { useEffect, useState } from "react";
import "./App.css";
import { api, type SessionUser } from "./lib/api";
import { format, useLocale } from "./hooks/useLocale";
import { LoginPage } from "./pages/LoginPage";

type AuthState = "checking" | "anonymous" | "authenticated";

function App() {
  const { language, setLanguage, t } = useLocale();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api
      .me()
      .then((me) => {
        setUser(me);
        setAuthState("authenticated");
      })
      .catch(() => setAuthState("anonymous"));
  }, []);

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setAuthState("anonymous");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-name">{t.appName}</span>
        <div className="language-switch">
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
            EN
          </button>
          <button className={language === "fr" ? "active" : ""} onClick={() => setLanguage("fr")}>
            FR
          </button>
        </div>
      </header>

      {authState === "checking" && null}

      {authState === "anonymous" && (
        <LoginPage
          t={t}
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setAuthState("authenticated");
          }}
        />
      )}

      {authState === "authenticated" && user && (
        <main className="dashboard">
          <div className="session-bar">
            <span>{format(t.session.signedInAs, { email: user.email, role: user.role })}</span>
            <button onClick={handleLogout}>{t.session.logout}</button>
          </div>
          <p>{t.dashboard.placeholder}</p>
        </main>
      )}
    </div>
  );
}

export default App;
