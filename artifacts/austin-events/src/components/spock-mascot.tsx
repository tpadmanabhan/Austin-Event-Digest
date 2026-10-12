const SPOCK_SRC = `${import.meta.env.BASE_URL}images/spock-mascot.png`;

export const SPOCK_ALT = "Spock, the small robot helper for the EventCarpooling team";

interface SpockImageProps {
  width?: number;
  lazy?: boolean;
  className?: string;
}

/** Spock robot image. Source is 320x219; height is derived to keep the ratio. */
export function SpockImage({ width = 64, lazy = true, className = "" }: SpockImageProps) {
  const height = Math.round((width * 219) / 320);
  return (
    <img
      src={SPOCK_SRC}
      alt={SPOCK_ALT}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width, height }}
      data-testid="img-spock-mascot"
    />
  );
}

interface SpockNoteProps {
  text: string;
  tone?: "dark" | "light";
  lazy?: boolean;
  width?: number;
  className?: string;
}

/** Compact inline note: small Spock beside one line of helper copy. */
export function SpockNote({ text, tone = "dark", lazy = true, width = 56, className = "" }: SpockNoteProps) {
  const dark = tone === "dark";
  return (
    <div
      className={`inline-flex max-w-md items-center gap-3 rounded-2xl px-3 py-2 text-left ${className}`}
      style={{
        background: dark ? "rgba(255,255,255,0.05)" : "rgba(22,101,52,0.06)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(22,101,52,0.15)"}`,
      }}
      data-testid="note-spock"
    >
      <SpockImage width={width} lazy={lazy} />
      <p className="text-sm leading-snug" style={{ color: dark ? "#cbd5e1" : "#14532d" }}>{text}</p>
    </div>
  );
}

/** English About mention, shared by the interactive About section and SSR platform/about view. */
export function SpockAboutMention({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-labelledby="spock-about-heading"
      className={`flex flex-col items-start gap-4 rounded-2xl border border-green-200 bg-green-50/70 p-5 sm:flex-row sm:items-center ${className}`}
      data-testid="section-spock-about"
    >
      <SpockImage width={88} lazy />
      <div>
        <h3 id="spock-about-heading" className="mb-1 font-serif text-lg font-bold text-slate-900">Meet Spock, our team helper</h3>
        <p className="text-sm leading-relaxed text-slate-700">
          Spock is the small robot assistant behind the scenes. It helps our team research local events, organize city guides, and draft weekly newsletters. People on our team review every city request and approve what gets published, and no guide claims to list every event.
        </p>
      </div>
    </aside>
  );
}
