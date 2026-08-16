import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "en" | "ja";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  translate: (texts: string[]) => Promise<string[]>;
  translationFailed: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  translate: async (texts) => texts,
  translationFailed: false,
});

const translationCache = new Map<string, string>();

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("ec-lang") as Lang) ?? "en"; } catch { return "en"; }
  });
  const [translationFailed, setTranslationFailed] = useState(false);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setTranslationFailed(false); // reset on language switch
    try { localStorage.setItem("ec-lang", l); } catch {}
  }, []);

  const translate = useCallback(async (texts: string[]): Promise<string[]> => {
    if (!texts.length) return [];
    const uncached = texts.filter(t => t && !translationCache.has(t));
    if (uncached.length > 0) {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: uncached, targetLang: "ja" }),
        });
        if (res.ok) {
          const data = await res.json() as { translations: string[]; translated: boolean };
          const { translations, translated } = data;
          if (!translated) {
            // API returned originals — signal failure so UI can show a fallback indicator
            setTranslationFailed(true);
          } else {
            setTranslationFailed(false);
            uncached.forEach((t, i) => {
              // Only cache genuine translations (not pass-throughs)
              if (translations[i] && translations[i] !== t) translationCache.set(t, translations[i]);
            });
          }
        } else {
          setTranslationFailed(true);
        }
      } catch {
        setTranslationFailed(true);
      }
    }
    return texts.map(t => translationCache.get(t) ?? t);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, translate, translationFailed }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
