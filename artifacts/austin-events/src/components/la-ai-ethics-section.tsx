import { LA_AI_ETHICS_EYEBROW, LA_AI_ETHICS_INTRO, LA_AI_ETHICS_READINGS, LA_AI_ETHICS_TITLE } from "@/lib/la-ai-ethics";

const THEMES = ["Public services", "Creative work", "Transparency", "Human review", "Fairness", "Accountability"];

export function LaAiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="la-ai-ethics-title" data-testid="section-la-ai-ethics"
      className={`la-ethics relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">{LA_AI_ETHICS_EYEBROW}</p>
      <h2 id="la-ai-ethics-title" className="mb-3 text-xl font-bold">{LA_AI_ETHICS_TITLE}</h2>
      <p className="text-sm leading-7 text-muted-foreground">{LA_AI_ETHICS_INTRO}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {THEMES.map(theme => (
          <li key={theme} className="rounded-full border border-secondary/25 bg-secondary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-secondary">{theme}</li>
        ))}
      </ul>
      <ol className="mt-4 divide-y divide-border">
        {LA_AI_ETHICS_READINGS.map((reading, index) => (
          <li key={reading.href} className="flex gap-4 py-3">
            <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-secondary">0{index + 1}</span>
            <div className="text-sm leading-6">
              <a href={reading.href} target="_blank" rel="noopener noreferrer" data-testid={`link-la-reading-${index}`}
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{reading.title}</a>
              <span className="text-muted-foreground"> / {reading.source}</span>
              <p className="text-muted-foreground">{reading.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
