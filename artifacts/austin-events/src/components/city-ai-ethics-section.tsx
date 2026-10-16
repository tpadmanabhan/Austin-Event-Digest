import { CITY_AI_ETHICS } from "@/lib/city-ai-ethics";

export function CityAiEthicsSection({
  slug,
  className = "",
  lang = "en",
}: {
  slug: string;
  className?: string;
  lang?: "en" | "ja";
}) {
  const content = CITY_AI_ETHICS[slug];
  if (!content) return null;

  const translation = lang === "ja" ? content.translations?.ja : undefined;
  const eyebrow = translation?.eyebrow ?? content.eyebrow;
  const intro = translation?.intro ?? content.intro;
  const readings = translation?.readings ?? content.readings;
  const titleId = `${slug}-ai-ethics-title`;

  return (
    <section
      id="city-ai-ethics"
      aria-labelledby={titleId}
      data-testid={`section-${slug}-ai-ethics`}
      className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
      <h2 id={titleId} className="mb-3 text-xl font-bold">AI Ethics</h2>
      <p className="text-sm leading-7 text-muted-foreground">{intro}</p>
      <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
        {readings.map((reading) => (
          <li key={`${reading.href}-${reading.title}`}>
            <a
              href={reading.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {reading.title}
            </a>
            <span> / {reading.source}</span>
            <p>{reading.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
