import { MIAMI_AI_ETHICS_EYEBROW, MIAMI_AI_ETHICS_INTRO, MIAMI_AI_ETHICS_TITLE, READINGS } from "@/lib/miami-ai-ethics";

export function MiamiAiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="miami-ai-ethics-title"
      data-testid="section-miami-ai-ethics"
      className={`miami-ethics relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">{MIAMI_AI_ETHICS_EYEBROW}</p>
      <h2 id="miami-ai-ethics-title" className="mb-3 text-xl font-bold">{MIAMI_AI_ETHICS_TITLE}</h2>
      <p className="text-sm leading-7 text-muted-foreground">{MIAMI_AI_ETHICS_INTRO}</p>
      <ol className="mt-4 divide-y divide-border">
        {READINGS.map((reading, index) => (
          <li key={reading.href} className="flex gap-4 py-3">
            <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-secondary">0{index + 1}</span>
            <div className="text-sm leading-6">
              <a href={reading.href} target="_blank" rel="noopener noreferrer"
                data-testid={`link-miami-reading-${index}`}
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                {reading.title}
              </a>
              <span className="text-muted-foreground"> / {reading.source}</span>
              <p className="text-muted-foreground">{reading.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
