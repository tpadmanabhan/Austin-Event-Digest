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
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}background-music.mp3`);
    audio.loop = true;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    audio.volume = isMobile ? 0.05 : 0.10;
    audio.muted = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
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
