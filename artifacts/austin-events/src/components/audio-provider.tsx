import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

interface AudioContextValue {
  muted: boolean;
  toggleMute: () => void;
}

const AudioCtx = createContext<AudioContextValue>({ muted: false, toggleMute: () => {} });

export function useAudio() {
  return useContext(AudioCtx);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}spanish-guitar.mp3`);
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {});
    };

    tryPlay();

    const onInteraction = () => {
      tryPlay();
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("touchstart", onInteraction);
    };
    window.addEventListener("click", onInteraction);
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("touchstart", onInteraction, { passive: true });

    return () => {
      audio.pause();
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("touchstart", onInteraction);
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
