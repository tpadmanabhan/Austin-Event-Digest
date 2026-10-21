import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { LangProvider, useLang } from "@/contexts/lang-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function IrlWordmark({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`irl-wordmark${footer ? " irl-wordmark-footer" : ""}`} aria-label="In Real Life, IRL">
      <svg className="irl-wordmark-mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 3.5a20.5 20.5 0 1 0 20.5 20.5A20.5 20.5 0 0 0 24 3.5Z" fill="currentColor" />
        <path d="M14 31V17h3.2l6.8 8.4V17h3.1v14h-3l-7-8.7V31H14Zm16.4 0V17h3.3v11.1H40V31h-9.6Z" fill="var(--irl-paper)" />
        <circle cx="37" cy="13" r="3" fill="var(--irl-accent)" />
      </svg>
      <span className="irl-wordmark-type">
        <span className="irl-wordmark-name">In Real Life</span>
        <span className="irl-wordmark-initials">IRL <i aria-hidden="true">/</i> CITY NOTES &amp; GATHERINGS</span>
      </span>
    </span>
  );
}

function PlatformLayoutInner({ children }: { children: ReactNode }) {
  const { lang, t, toggleLang } = useLang();
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureEmail, setFeatureEmail] = useState("");
  const [featureStatus, setFeatureStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [featureError, setFeatureError] = useState("");

  useEffect(() => {
    document.documentElement.lang = lang;
    const metadata = lang === "ja"
      ? {
          title: "In Real Life（IRL）— 街のイベントとローカルニュースレター",
          description: "街で見つけた、実際に出かけたくなるイベントや読みものを。In Real Life は、都市ごとのイベントガイドとニュースレターを届けます。",
        }
      : {
          title: "In Real Life (IRL) — Worthwhile things, close by",
          description: "A locally grounded guide to worthwhile city events and newsletters. Find something good nearby, then meet your city in person.",
        };
    document.title = metadata.title;
    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, selector.includes("property=") ? selector.match(/property="([^"]+)"/)?.[1] ?? "" : selector.match(/name="([^"]+)"/)?.[1] ?? "");
        document.head.appendChild(element);
      }
      element.content = value;
    };
    setMeta('meta[name="description"]', "name", metadata.description);
    setMeta('meta[property="og:title"]', "property", metadata.title);
    setMeta('meta[property="og:description"]', "property", metadata.description);
    setMeta('meta[name="twitter:title"]', "name", metadata.title);
    setMeta('meta[name="twitter:description"]', "name", metadata.description);
    for (const existing of document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
      if (existing.dataset.irlWebsiteSchema === "true") continue;
      try {
        const parsed = JSON.parse(existing.textContent || "{}") as { "@type"?: string };
        if (parsed["@type"] === "WebSite") existing.remove();
      } catch {
        // Leave unrelated structured data untouched.
      }
    }
    let schema = document.head.querySelector<HTMLScriptElement>('script[data-irl-website-schema="true"]');
    if (!schema) {
      schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.dataset.irlWebsiteSchema = "true";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "In Real Life",
      alternateName: "IRL",
      url: "https://irl.group",
      description: metadata.description,
    });
  }, [lang]);

  async function handleFeatureInterestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!featureEmail.trim()) return;
    setFeatureStatus("submitting");
    setFeatureError("");
    try {
      const res = await fetch("/api/newsletter/feature-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: featureEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setFeatureError(data.message || t.modalErrGeneric);
        setFeatureStatus("error");
      } else {
        setFeatureStatus("done");
      }
    } catch {
      setFeatureError(t.modalErrNetwork);
      setFeatureStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* FEATURE INTEREST MODAL */}
      <Dialog open={featureModalOpen} onOpenChange={(open) => {
        setFeatureModalOpen(open);
        if (!open) { setFeatureStatus("idle"); setFeatureEmail(""); setFeatureError(""); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-5 h-5 text-green-500" />
              {t.modalTitle}
            </DialogTitle>
            <DialogDescription>
              {t.modalDesc}
            </DialogDescription>
          </DialogHeader>
          {featureStatus === "done" ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">{t.modalDone}</p>
              <p className="text-muted-foreground text-sm">{t.modalDoneDesc1} <strong>{featureEmail}</strong>. {t.modalDoneDesc2}</p>
              <Button variant="outline" className="mt-2" onClick={() => setFeatureModalOpen(false)}>{t.modalClose}</Button>
            </div>
          ) : (
            <form onSubmit={handleFeatureInterestSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="layout-feature-email" className="text-sm font-medium">{t.modalEmailLabel}</label>
                <Input
                  id="layout-feature-email"
                  type="email"
                  placeholder="you@example.com"
                  value={featureEmail}
                  onChange={(e) => setFeatureEmail(e.target.value)}
                  required
                  disabled={featureStatus === "submitting"}
                  autoComplete="email"
                />
                {featureError && <p className="text-xs text-destructive">{featureError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={featureStatus === "submitting" || !featureEmail.trim()}>
                {featureStatus === "submitting" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.modalSending}</>
                ) : (
                  t.modalSubmit
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">{t.modalNoSpam}</p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-28 items-center justify-between">
            <a href="/" className="irl-brand-link group" aria-label="In Real Life, IRL — home">
              <div className="relative shrink-0">
                <IrlWordmark />
                <span className="absolute -bottom-1 -right-1 rounded-full border border-amber-400/70 bg-amber-50 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-amber-700 leading-tight">
                  {lang === "ja" ? "ベータ版" : "Beta"}
                </span>
              </div>
            </a>

            <nav className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setFeatureModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.30)",
                  color: "#16a34a",
                }}
              >
                <Bell className="w-3 h-3" />
                {t.heroNotify}
              </button>
              <button
                onClick={toggleLang}
                className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                aria-label={lang === "ja" ? "言語を切り替え" : "Toggle language"}
              >
                {t.langToggle}
              </button>
              <a
                href="#city-directory"
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.liveH2}
              </a>
              <a
                href="#launch"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
              >
                <span className="sm:hidden">{t.launchShort}</span>
                <span className="hidden sm:inline">{t.launchFull}</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <IrlWordmark footer />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} In Real Life. {t.footerTagline}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </LangProvider>
  );
}
