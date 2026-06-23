import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.png`}
                alt="EventCarpooling logo"
                className="h-20 w-20 object-contain transition-transform group-hover:-translate-y-0.5"
              />
              <span className="font-serif text-xl font-bold leading-none tracking-tight text-foreground">
                EventCarpooling
              </span>
            </a>

            <nav className="flex items-center gap-3">
              <a
                href="#how-it-works"
                className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How it works
              </a>
              <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
                Beta
              </span>
              <a
                href="#launch"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
              >
                Launch your city
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
            <div className="flex items-center gap-2.5">
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.png`}
                alt="EventCarpooling logo"
                className="h-16 w-16 object-contain opacity-80"
              />
              <span className="font-serif font-bold text-foreground">EventCarpooling</span>
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
