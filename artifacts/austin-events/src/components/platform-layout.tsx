import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { LangProvider, useLang } from "@/contexts/lang-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PlatformLayoutInner({ children }: { children: ReactNode }) {
  const { t, toggleLang } = useLang();
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureEmail, setFeatureEmail] = useState("");
  const [featureStatus, setFeatureStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [featureError, setFeatureError] = useState("");

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
            <a href="/" className="flex items-center gap-2 group">
              <div className="relative shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                  alt="EventCarpooling logo"
                  className="h-12 sm:h-20 w-auto max-w-[55vw] sm:max-w-none object-contain transition-transform group-hover:-translate-y-0.5"
                />
                <span className="absolute -bottom-1 -right-1 rounded-full border border-amber-400/70 bg-amber-50 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-amber-700 leading-tight">
                  Beta
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
                aria-label="Toggle language"
              >
                {t.langToggle}
              </button>
              <a
                href="#how-it-works"
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.howItWorks}
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
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                alt="EventCarpooling logo"
                className="h-44 w-auto object-contain opacity-90"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} EventCarpooling. {t.footerTagline}
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
