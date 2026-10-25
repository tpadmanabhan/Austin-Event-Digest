import austinAiEthics from "../../../../shared/austin-ai-ethics.json";

export function AiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="ai-ethics-title"
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 ${className}`}
    >
      <figure className="mb-5 border-l-4 border-emerald-700 bg-emerald-50 px-4 py-3">
        <blockquote className="text-sm italic leading-6 text-slate-700">
          “{austinAiEthics.testimonial}”
        </blockquote>
        <figcaption className="mt-2 text-xs font-semibold text-slate-600">— {austinAiEthics.attribution}</figcaption>
      </figure>
      <h2 id="ai-ethics-title" className="mb-3 text-xl font-bold text-slate-900">{austinAiEthics.title}</h2>
      <p className="text-sm leading-7 text-slate-600">{austinAiEthics.intro}</p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
        {austinAiEthics.items.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong> — {item.description}
            {item.links?.length ? (
              <>{" "}{item.links.map((link, index) => (
                <span key={link.url}>
                  {index > 0 ? " · " : ""}
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
                    {link.label}
                  </a>
                </span>
              ))}</>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}