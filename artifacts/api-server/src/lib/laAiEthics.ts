/** Los Angeles AI ethics content kept in parity with the web and email surfaces. */
export const LA_AI_ETHICS_INTRO =
  "Los Angeles has a city-published AI Roadmap and Safety Checklist. They give local teams a place to start with safeguards, transparency, human-centered design and public trust. As AI reaches public services and creative work, ask who benefits, who could be harmed, how a person can challenge an outcome, and who remains accountable.";

export const LA_AI_ETHICS_READINGS = [
  {
    href: "https://ita.lacity.gov/news/ita-publishes-ai-safety-checklist",
    title: "A.I. Safety Checklist",
    source: "City of Los Angeles Information Technology Agency",
    note: "The City’s checklist calls for due diligence before, during and after an AI implementation, with attention to ethical, transparent, human-centered and secure use.",
  },
  {
    href: "https://ita.lacity.gov/news/ita-publishes-los-angeles-ai-roadmap",
    title: "Los Angeles A.I. Roadmap",
    source: "City of Los Angeles Information Technology Agency",
    note: "A city-specific overview of AI use and responsible-practice recommendations developed with City departments.",
  },
  {
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    title: "AI Risk Management Framework",
    source: "National Institute of Standards and Technology",
    note: "A practical framework for governing, mapping, measuring and managing AI risks throughout a system’s life cycle.",
  },
  {
    href: "https://mitpress.mit.edu/9780262548328/more-than-a-glitch/",
    title: "More than a Glitch",
    source: "Book by Meredith Broussard / MIT Press",
    note: "An accessible account of how bias and exclusion can become embedded in automated systems, and why human review matters.",
  },
];

export function buildLaAiEthicsSection(): string {
  return `<section style="background:#f7f1fc;border:1px solid #e6d7f4;border-top:4px solid #FDB927;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#552583;font-size:12px;">Reading list / Los Angeles</p>
    <h2 style="color:#2d1457;margin:0 0 12px;">AI Ethics</h2>
    <p style="color:#475569;line-height:1.7;">${LA_AI_ETHICS_INTRO}</p>
    <ol style="color:#475569;line-height:1.7;">${LA_AI_ETHICS_READINGS.map(reading =>
      `<li style="margin-bottom:12px;"><a href="${reading.href}" style="color:#552583;font-weight:bold;">${reading.title}</a> / ${reading.source}<br />${reading.note}</li>`).join("")}</ol>
  </section>`;
}
