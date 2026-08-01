import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "en" | "ja";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  translate: (texts: string[]) => Promise<string[]>;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  translate: async (texts) => texts,
});

const translationCache = new Map<string, string>();

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("ec-lang") as Lang) ?? "en"; } catch { return "en"; }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
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
          const { translations } = await res.json() as { translations: string[] };
          uncached.forEach((t, i) => {
            // Only cache if a real translation came back (don't cache if API returned originals)
            if (translations[i] && translations[i] !== t) translationCache.set(t, translations[i]);
          });
        }
      } catch { /* fall back to originals on error */ }
    }
    return texts.map(t => translationCache.get(t) ?? t);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
