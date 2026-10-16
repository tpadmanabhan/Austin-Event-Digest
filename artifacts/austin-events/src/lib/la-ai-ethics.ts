export const LA_AI_ETHICS_EYEBROW = "LOS ANGELES / RESPONSIBLE AI";
export const LA_AI_ETHICS_TITLE = "AI Ethics";

export const LA_AI_ETHICS_INTRO =
  "Los Angeles has a city-published AI Roadmap and Safety Checklist. They give local teams a place to start with safeguards, transparency, human-centered design and public trust. As AI reaches public services and creative work, ask who benefits, who could be harmed, how a person can challenge an outcome, and who remains accountable.";

export type LAReading = { href: string; title: string; source: string; note: string };

export const LA_AI_ETHICS_READINGS: LAReading[] = [
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
