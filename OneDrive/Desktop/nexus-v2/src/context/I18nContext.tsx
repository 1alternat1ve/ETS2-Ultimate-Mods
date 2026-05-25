import { createContext, useContext, useState, useEffect } from "react";
import { translations, type Lang } from "../lib/i18n";
import { realTauri } from "../api/tauri";

const I18nContext = createContext<(key: string) => string>(() => "");

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    realTauri.get_settings().then((s) => {
      if (s.language === "en") setLang("en");
    });
  }, []);

  const t = (key: string) => translations[lang][key as keyof typeof translations.ru] || translations.ru[key as keyof typeof translations.ru] || key;
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
