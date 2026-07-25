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
  const isAustinCares = tenant.slug === "austincares";
  const isPortland = tenant.slug === "portland";

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between ${isAustinCares ? "h-20" : "h-14"}`}>
            <Link href="/" className="flex items-center gap-2 group">
              <div
                className={`shrink-0 rounded-xl flex items-center justify-center text-lg overflow-hidden transition-transform group-hover:-translate-y-0.5 ${isAustinCares ? "h-14 w-36" : "h-8 w-8"}`}
                style={isAustinCares ? undefined : { background: "linear-gradient(135deg, #1e1b4b, #312e81)", boxShadow: "0 4px 12px rgba(49,46,129,0.4)" }}
              >
                {isAustinCares ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/austin-cares-brand-icon.jpg`}
                    alt={tenant.name}
                    className="h-full w-full object-cover object-center"
                  />
                ) : isPortland ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/portland-logo.jpg`}
                    alt="Portland"
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  "🎸"
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-sm font-bold leading-none tracking-tight text-foreground">
                    {tenant.name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 leading-none">
                    <span className="text-[10px] italic text-primary" style={{ fontFamily: '"DM Serif Display", serif', letterSpacing: '0.01em' }}>
                      In Real Life
                    </span>
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-400 px-2 py-0.5 leading-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-900">Beta</span>
                  </span>
                </div>
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                  {isAustinCares ? "BCRR Weekly Digest" : isPortland ? "Keep Portland Weird" : "Make Austin Weird Again"}
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                title={muted ? "Unmute music" : "Mute music"}
                className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                {muted ? <VolumeX className="w-3 h-3" /> : <Music className="w-3 h-3" />}
              </button>

              <a
                href="https://eventcarpooling.com"
                className="shrink-0 transition-opacity hover:opacity-80"
              >
                <img
                  src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                  alt="EventCarpooling"
                  className="h-8 w-auto object-contain"
                />
              </a>

              <a
                href="#subscribe"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Mail className="w-3 h-3" />
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
              <div
                className={`shrink-0 rounded-xl flex items-center justify-center text-2xl overflow-hidden ${isAustinCares ? "w-40 h-20" : "w-10 h-10"}`}
                style={isAustinCares || isPortland ? undefined : { background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}
              >
                {isAustinCares ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/austin-cares-brand-icon.jpg`}
                    alt={tenant.name}
                    className="h-full w-full object-cover"
                  />
                ) : isPortland ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/portland-logo.jpg`}
                    alt="Portland"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "🎸"
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {tenant.name}. Handcrafted in {tenant.city.split(",")[0]}.
              </p>
            </div>
            <a href="https://eventcarpooling.com" className="opacity-60 hover:opacity-90 transition-opacity">
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                alt="Powered by EventCarpooling"
                className="h-8 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
