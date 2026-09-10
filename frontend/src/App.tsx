import { useEffect, useState } from "react";
import "./App.css";
import { api, type SessionUser } from "./lib/api";
import { format, useLocale } from "./hooks/useLocale";
import { LoginPage } from "./pages/LoginPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LivePage } from "./pages/LivePage";
import { GraphsPage } from "./pages/GraphsPage";
import { SynthesisPage } from "./pages/SynthesisPage";
import { SensorsPage } from "./pages/SensorsPage";

type AuthState = "checking" | "anonymous" | "authenticated";
type Tab = "history" | "live" | "graphs" | "synthesis" | "sensors";

function App() {
  const { language, setLanguage, t } = useLocale();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("history");

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
        <>
          <div className="session-bar">
            <nav className="tab-nav">
              <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
                {t.nav.history}
              </button>
              <button className={tab === "live" ? "active" : ""} onClick={() => setTab("live")}>
                {t.nav.live}
              </button>
              <button className={tab === "graphs" ? "active" : ""} onClick={() => setTab("graphs")}>
                {t.nav.graphs}
              </button>
              <button className={tab === "synthesis" ? "active" : ""} onClick={() => setTab("synthesis")}>
                {t.nav.synthesis}
              </button>
              {user.role === "ADMIN" && (
                <button className={tab === "sensors" ? "active" : ""} onClick={() => setTab("sensors")}>
                  {t.nav.sensors}
                </button>
              )}
            </nav>
            <span>{format(t.session.signedInAs, { email: user.email, role: user.role })}</span>
            <button onClick={handleLogout}>{t.session.logout}</button>
          </div>
          <main className="dashboard">
            {tab === "history" && <HistoryPage t={t} />}
            {tab === "live" && <LivePage t={t} isAdmin={user.role === "ADMIN"} />}
            {tab === "graphs" && <GraphsPage t={t} isAdmin={user.role === "ADMIN"} />}
            {tab === "synthesis" && <SynthesisPage t={t} isAdmin={user.role === "ADMIN"} />}
            {tab === "sensors" && user.role === "ADMIN" && <SensorsPage t={t} />}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
