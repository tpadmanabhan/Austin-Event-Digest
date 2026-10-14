import { BOSTON_AI_ETHICS_EYEBROW, BOSTON_AI_ETHICS_INTRO, BOSTON_AI_ETHICS_TITLE, BOSTON_READINGS } from "@/lib/boston-ai-ethics";

const THEMES = ["Healthcare & research", "Student access", "City services", "Fairness", "Privacy", "Ethical agent instruction"];

export function BostonAiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="boston-ai-ethics-title" data-testid="section-boston-ai-ethics"
      className={`boston-ethics relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">{BOSTON_AI_ETHICS_EYEBROW}</p>
      <h2 id="boston-ai-ethics-title" className="mb-3 text-xl font-bold">{BOSTON_AI_ETHICS_TITLE}</h2>
      <p className="text-sm leading-7 text-muted-foreground">{BOSTON_AI_ETHICS_INTRO}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {THEMES.map(t => (
          <li key={t} className="rounded-full border border-secondary/25 bg-secondary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-secondary">{t}</li>
        ))}
      </ul>
      {BOSTON_READINGS.length > 0 && (
        <ol className="mt-4 divide-y divide-border">
          {BOSTON_READINGS.map((reading, index) => (
            <li key={reading.href} className="flex gap-4 py-3">
              <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-secondary">0{index + 1}</span>
              <div className="text-sm leading-6">
                <a href={reading.href} target="_blank" rel="noopener noreferrer" data-testid={`link-boston-reading-${index}`}
                  className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{reading.title}</a>
                <span className="text-muted-foreground"> / {reading.source}</span>
                <p className="text-muted-foreground">{reading.note}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
