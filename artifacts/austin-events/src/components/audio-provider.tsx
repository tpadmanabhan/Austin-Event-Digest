import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

interface AudioContextValue {
  muted: boolean;
  toggleMute: () => void;
}

const AudioCtx = createContext<AudioContextValue>({ muted: true, toggleMute: () => {} });

export function useAudio() {
  return useContext(AudioCtx);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}background-music.mp3`);
    audio.loop = true;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    audio.volume = isMobile ? 0.05 : 0.10;
    audio.muted = true;
    audioRef.current = audio;

    audio.play().catch(() => {});

    const onFirstInteraction = () => {
      audio.muted = false;
      setMuted(false);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
    window.addEventListener("click", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    window.addEventListener("touchstart", onFirstInteraction, { passive: true });

    return () => {
      audio.pause();
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
  }, []);

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    audioRef.current.muted = next;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
    setMuted(next);
  };

  return (
    <AudioCtx.Provider value={{ muted, toggleMute }}>
      {children}
    </AudioCtx.Provider>
  );
}
