import { describe, expect, it } from "vitest";
import { buildCityAiEthicsSection } from "./cityAiEthics";

const expectedCities = [
  ["houston", "Resilient Houston: Three-Year Report", "Atlas of AI"],
  ["tokyo", "Tokyo AI Adoption and Use Guidelines", "AI Ethics"],
  ["stlouis", "Artificial Intelligence Policy", "Race After Technology"],
  ["portland", "The City&#39;s approach to responsible use of AI", "Automating Inequality"],
  ["bulverde", "City of Bulverde Stormwater Management Program 2025–2029", "Data Feminism"],
  ["dc", "Handbook for AI Values Alignment", "Weapons of Math Destruction"],
] as const;

describe("city-specific AI Ethics email sections", () => {
  it.each(expectedCities)("renders verified local resources and a distinct book for %s", (slug, localTitle, bookTitle) => {
    const html = buildCityAiEthicsSection(slug);

    expect(html).toContain("AI Ethics");
    expect(html).toContain(localTitle);
    expect(html).toContain(bookTitle);
    expect(html).toContain("href=");
  });

  it("does not add a generic section for cities without curated content", () => {
    expect(buildCityAiEthicsSection("future-city")).toBe("");
  });
});
