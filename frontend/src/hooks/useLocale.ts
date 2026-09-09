import { useCallback, useState } from "react";
import { en } from "../locales/en";
import { fr } from "../locales/fr";

export type Language = "en" | "fr";

const dictionaries = { en, fr };

function detectDefaultLanguage(): Language {
  const stored = localStorage.getItem("okovision.language");
  if (stored === "en" || stored === "fr") return stored;
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function useLocale() {
  const [language, setLanguageState] = useState<Language>(detectDefaultLanguage);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem("okovision.language", lang);
    setLanguageState(lang);
  }, []);

  return { language, setLanguage, t: dictionaries[language] };
}

export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
