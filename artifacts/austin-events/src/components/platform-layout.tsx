import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-52 items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <div className="relative shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                  alt="EventCarpooling logo"
                  className="h-40 sm:h-44 w-auto object-contain transition-transform group-hover:-translate-y-0.5"
                />
                <span className="absolute -bottom-1 -right-1 rounded-full border border-amber-400/70 bg-amber-50 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-amber-700 leading-tight">
                  Beta
                </span>
              </div>
            </a>

            <nav className="flex items-center gap-2 sm:gap-3">
              <a
                href="#how-it-works"
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How it works
              </a>
              <a
                href="#launch"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
              >
                <span className="sm:hidden">Launch</span>
                <span className="hidden sm:inline">Launch your city</span>
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
              © {new Date().getFullYear()} EventCarpooling. Helping cities connect in real life.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
