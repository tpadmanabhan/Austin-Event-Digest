import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, MapPin, Music, VolumeX } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}spanish-guitar.mp3`);
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().then(() => setStarted(true)).catch(() => {});
    };

    tryPlay();

    const onInteraction = () => {
      if (!started) {
        tryPlay();
        window.removeEventListener("click", onInteraction);
        window.removeEventListener("keydown", onInteraction);
      }
    };
    window.addEventListener("click", onInteraction);
    window.addEventListener("keydown", onInteraction);

    return () => {
      audio.pause();
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const next = !muted;
    audioRef.current.muted = next;
    if (!started) {
      audioRef.current.play().then(() => setStarted(true)).catch(() => {});
    }
    setMuted(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:-translate-y-0.5">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold leading-none tracking-tight text-foreground">
                  Raj's Austin Events
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Weekly Digest
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === "/" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Home
              </Link>

              <button
                onClick={toggleMute}
                title={muted ? "Unmute music" : "Mute music"}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
              </button>

              <span className="hidden sm:inline-flex items-center rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
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
                src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
                alt="Logo" 
                className="w-8 h-8 opacity-80 grayscale"
              />
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Raj's Austin Events. Handcrafted in Texas.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Twitter</a>
              <a href="#" className="hover:text-primary transition-colors">Instagram</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
