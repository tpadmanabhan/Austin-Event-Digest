/** Boston AI Ethics reading list. Exported so email templates can be checked for parity. */
export const BOSTON_AI_ETHICS_EYEBROW = "Reading list / Boston";
export const BOSTON_AI_ETHICS_TITLE = "AI Ethics";

export const BOSTON_AI_ETHICS_INTRO =
  "Boston and Cambridge put AI close to consequential decisions: hospital care, university access, research and city services. Who can challenge an automated result, whose data is used, and who remains accountable? Ethical training should pair clear instructions with realistic examples and repeated evaluations of privacy, fairness and consent. These readings educate people and guide how assistants are instructed and reviewed; publishing them does not automatically retrain a model.";

export type BostonReading = { href: string; title: string; source: string; note: string };

// Copied verbatim from api-server/src/lib/bostonAiEthics.ts for web/email parity.
export const BOSTON_READINGS: BostonReading[] = [
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
