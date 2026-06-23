import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, MapPin, Music, VolumeX } from "lucide-react";
import { useAudio } from "@/components/audio-provider";
import { useTenant } from "@/contexts/tenant-context";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { muted, toggleMute } = useAudio();
  const tenant = useTenant();

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.png`}
                alt="EventCarpooling logo"
                className="h-14 w-14 object-contain transition-transform group-hover:-translate-y-0.5"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-2xl font-bold leading-none tracking-tight text-foreground">
                    {tenant.name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-3 py-0.5 leading-none shadow-sm shadow-primary/10">
                    <span className="text-[13px] italic text-primary" style={{ fontFamily: '"DM Serif Display", serif', letterSpacing: '0.01em' }}>
                      In Real Life
                    </span>
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Weekly Digest
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              {location === "/" && (
                <Link
                  href="/"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary"
                >
                  Home
                </Link>
              )}

              <button
                onClick={toggleMute}
                title={muted ? "Unmute music" : "Mute music"}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
              </button>

              <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
                Beta Launch
              </span>

              <a
                href="#subscribe"
                className="hidden sm:inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Mail className="w-4 h-4" />
                Subscribe
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

      <footer className="mt-auto border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 opacity-80">
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.png`}
                alt="EventCarpooling logo"
                className="w-10 h-10 object-contain opacity-80"
              />
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {tenant.name}. Handcrafted in {tenant.city.split(",")[0]}.
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Powered by{" "}
              <a href="https://eventcarpooling.com" className="hover:text-muted-foreground transition-colors">
                EventCarpooling
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
