import { useEffect, useState } from "react";
import "./App.css";
import "./styles/living.css";
import { api, type SessionUser } from "./lib/api";
import { useLocale } from "./hooks/useLocale";
import { LoginPage } from "./pages/LoginPage";
import { NowPage } from "./pages/NowPage";
import { TrendsPage } from "./pages/TrendsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { IdleOverlay } from "./components/IdleOverlay";

type AuthState = "checking" | "anonymous" | "authenticated";
type Tab = "now" | "trends" | "history" | "settings";

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return <span className="ls-topbar-clock">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
}

function App() {
  const { language, setLanguage, t } = useLocale();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("now");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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

  if (authState === "checking") {
    return <div className="ls-shell" />;
  }

  if (authState === "anonymous") {
    return (
      <div className="ls-shell">
        <LoginPage
          t={t}
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setAuthState("authenticated");
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const pageTitle = tab === "now" ? t.nav.now : tab === "trends" ? t.nav.trends : tab === "history" ? t.nav.history : t.nav.settings;

  return (
    <div className="ls-shell">
      <IdleOverlay t={t} />

      <div className="ls-topbar">
        <div className="ls-wordmark">
          <span className="ls-live-dot" />
          <span className="ls-wordmark-text">{t.appName}</span>
        </div>
        <Clock />
      </div>

      <main className="ls-content">
        <h1 className="ls-page-title">{pageTitle}</h1>
        {tab === "now" && <NowPage t={t} isAdmin={isAdmin} />}
        {tab === "trends" && <TrendsPage t={t} />}
        {tab === "history" && <HistoryPage t={t} />}
        {tab === "settings" && (
          <SettingsPage t={t} language={language} setLanguage={setLanguage} isAdmin={isAdmin} user={user} onLogout={handleLogout} />
        )}
      </main>

      <nav className="ls-bottomnav">
        <button type="button" className={`ls-navitem${tab === "now" ? " ls-navitem--active" : ""}`} onClick={() => setTab("now")}>
          {t.nav.now}
        </button>
        <button
          type="button"
          className={`ls-navitem${tab === "trends" ? " ls-navitem--active" : ""}`}
          onClick={() => setTab("trends")}
        >
          {t.nav.trends}
        </button>
        <button
          type="button"
          className={`ls-navitem${tab === "history" ? " ls-navitem--active" : ""}`}
          onClick={() => setTab("history")}
        >
          {t.nav.history}
        </button>
        <button
          type="button"
          className={`ls-navitem${tab === "settings" ? " ls-navitem--active" : ""}`}
          onClick={() => setTab("settings")}
        >
          {t.nav.settings}
        </button>
      </nav>
    </div>
  );
}

export default App;
