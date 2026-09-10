import { useState } from "react";
import { format, type Language } from "../hooks/useLocale";
import type { Dictionary } from "../locales/en";
import type { SessionUser } from "../lib/api";
import { GraphsPage } from "./GraphsPage";
import { SensorsPage } from "./SensorsPage";
import { SynthesisPage } from "./SynthesisPage";

type Section = "hub" | "graphs" | "sensors" | "synthesis";

function BackChevron() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10">
      <path d="M5 1 L1 5 L5 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForwardChevron() {
  return (
    <svg width="7" height="11" viewBox="0 0 7 11" className="ls-chevron">
      <path
        d="M1 1 L6 5.5 L1 10"
        fill="none"
        stroke="rgba(237,238,233,.3)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsPage({
  t,
  language,
  setLanguage,
  isAdmin,
  user,
  onLogout,
}: {
  t: Dictionary;
  language: Language;
  setLanguage: (language: Language) => void;
  isAdmin: boolean;
  user: SessionUser;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<Section>("hub");

  if (section !== "hub") {
    return (
      <div>
        <button type="button" className="ls-legacy-back" onClick={() => setSection("hub")}>
          <BackChevron />
          {t.settingsHub.back}
        </button>
        <div className="ls-legacy-frame">
          {section === "graphs" && <GraphsPage t={t} isAdmin={isAdmin} />}
          {section === "sensors" && isAdmin && <SensorsPage t={t} language={language} />}
          {section === "synthesis" && isAdmin && <SynthesisPage t={t} isAdmin={isAdmin} />}
        </div>
      </div>
    );
  }

  return (
    <div className="ls-page-wide" style={{ width: "100%", maxWidth: 640 }}>
      <div className="ls-settings-list" style={{ marginBottom: 36 }}>
        <button type="button" className="ls-srow" onClick={() => setSection("graphs")}>
          <span className="ls-srow-dot" />
          <span className="ls-srow-body">
            <span className="ls-srow-title">{t.settingsHub.graphsRow}</span>
            <span className="ls-srow-subtitle">{t.settingsHub.graphsSubtitle}</span>
          </span>
          <ForwardChevron />
        </button>

        {isAdmin && (
          <>
            <button type="button" className="ls-srow" onClick={() => setSection("sensors")}>
              <span className="ls-srow-dot ls-srow-dot--ember" />
              <span className="ls-srow-body">
                <span className="ls-srow-title">{t.settingsHub.sensorsRow}</span>
                <span className="ls-srow-subtitle">{t.settingsHub.sensorsSubtitle}</span>
              </span>
              <ForwardChevron />
            </button>

            <button type="button" className="ls-srow" onClick={() => setSection("synthesis")}>
              <span className="ls-srow-dot" />
              <span className="ls-srow-body">
                <span className="ls-srow-title">{t.settingsHub.synthesisRow}</span>
                <span className="ls-srow-subtitle">{t.settingsHub.synthesisSubtitle}</span>
              </span>
              <ForwardChevron />
            </button>
          </>
        )}
      </div>

      <div className="ls-list-label">{t.settingsHub.account}</div>
      <div className="ls-row">
        <span className="ls-row-label">{format(t.session.signedInAs, { email: user.email, role: user.role })}</span>
      </div>
      <div className="ls-row">
        <span className="ls-row-label">{t.settingsHub.language}</span>
        <span className="ls-stepper" style={{ gap: 8 }}>
          <button
            type="button"
            className="ls-navitem"
            style={language === "en" ? undefined : { opacity: 0.5 }}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
          <button
            type="button"
            className="ls-navitem"
            style={language === "fr" ? undefined : { opacity: 0.5 }}
            onClick={() => setLanguage("fr")}
          >
            FR
          </button>
        </span>
      </div>
      <div className="ls-row" style={{ borderBottom: "1px solid rgba(237,238,233,.08)" }}>
        <button type="button" className="ls-navitem" style={{ color: "var(--ls-ember)" }} onClick={onLogout}>
          {t.session.logout}
        </button>
      </div>
    </div>
  );
}
