/** Miami AI Ethics reading list. Exported so email templates can be checked for parity. */
export const MIAMI_AI_ETHICS_EYEBROW = "Reading list / Miami";
export const MIAMI_AI_ETHICS_TITLE = "AI Ethics";

export const MIAMI_AI_ETHICS_INTRO =
  "Miami lives at the edge of the water and runs on many languages. As AI shows up in flood response, public services, housing searches and hospitality work, this edition asks who gets heard, who can appeal a decision, and who keeps their judgment on the job. These books are not about Miami, but their questions belong in every room where local builders meet.";

export type MiamiReading = { href: string; title: string; source: string; note: string };

// URLs verified by main agent.
export const READINGS: MiamiReading[] = [
  {
    href: "https://brianchristian.org/the-alignment-problem/",
    title: "The Alignment Problem",
    source: "Book by Brian Christian",
    note: "How systems learn goals different from the ones we meant, a useful lens for anyone automating flood or public-service decisions that need to stay accountable.",
  },
  {
    href: "https://algorithmsofoppression.com/about/",
    title: "Algorithms of Oppression",
    source: "Book by Safiya Umoja Noble",
    note: "How search engines can reinforce racial and gender bias, worth reading before trusting ranked results in housing searches or any service people find through a search box.",
  },
  {
    href: "https://www.katedarling.org/",
    title: "The New Breed",
    source: "Book by Kate Darling",
    note: "Argues we should treat robots more like animals we work alongside than human replacements, a frame for hospitality workers keeping agency as new tools arrive.",
  },
  {
    href: "https://www.unesco.org/en/artificial-intelligence/recommendation-ethics",
    title: "Recommendation on the Ethics of Artificial Intelligence",
    source: "UNESCO",
    note: "Global principles on human rights, fairness and cultural and linguistic diversity, a baseline for AI that serves English, Spanish and Haitian Creole speakers alike.",
  },
];
