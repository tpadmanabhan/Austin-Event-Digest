/** Boston editorial content kept in parity with web and public-document surfaces. */
export const BOSTON_AI_ETHICS_INTRO =
  "Boston and Cambridge put AI close to consequential decisions: hospital care, university access, research and city services. Who can challenge an automated result, whose data is used, and who remains accountable? Ethical training should pair clear instructions with realistic examples and repeated evaluations of privacy, fairness and consent. These readings educate people and guide how assistants are instructed and reviewed; publishing them does not automatically retrain a model.";

export const BOSTON_AI_ETHICS_READINGS = [
  {
    href: "https://www.unmasking.ai/",
    title: "Unmasking AI",
    source: "Book by Joy Buolamwini",
    note: "A researcher’s account of discriminatory AI and algorithmic justice. Start here when asking whether a system used in healthcare, education or civic life works for the people it claims to serve.",
  },
  {
    href: "https://mitpress.mit.edu/9780262548328/more-than-a-glitch/",
    title: "More than a Glitch",
    source: "Book by Meredith Broussard / MIT Press",
    note: "Why race, gender and ability bias are not merely technical errors. A useful starting point for Boston’s builders testing accessibility, admissions tools and clinical technologies.",
  },
  {
    href: "https://www.boston.gov/government/cabinets/innovation-and-technology/city-boston-generative-artificial-intelligence-gen-ai",
    title: "Boston’s Generative AI Policy",
    source: "City of Boston",
    note: "The City’s policy requires basic training and keeps employees responsible for the accuracy, ethics and impacts of their work. Read the current policy before applying AI to public-service decisions.",
  },
  {
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    title: "AI Risk Management Framework",
    source: "NIST",
    note: "A voluntary framework for governing, mapping, measuring and managing AI risk. Turn ethical principles into documented tests, human oversight and limits on what an agent may do.",
  },
];

export function buildBostonAiEthicsSection(): string {
  return `<section style="background:#f7f3ec;border:1px solid #d7ccc0;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#BD3039;font-size:12px;">Reading list / Boston</p>
    <h2 style="color:#142638;margin:0 0 12px;">AI Ethics</h2>
    <p style="color:#475569;line-height:1.7;">${BOSTON_AI_ETHICS_INTRO}</p>
    <ol style="color:#475569;line-height:1.7;">${BOSTON_AI_ETHICS_READINGS.map(reading =>
      `<li style="margin-bottom:12px;"><a href="${reading.href}" style="color:#BD3039;font-weight:bold;">${reading.title}</a> / ${reading.source}<br />${reading.note}</li>`).join("")}</ol>
  </section>`;
}
