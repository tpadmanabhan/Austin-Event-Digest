import { describe, expect, it } from "vitest";
import { isAdultContent } from "./contentFilter";

describe("adult-content event filter", () => {
  it("does not treat LGBTQ identity or a non-adult drag event as adult content", () => {
    expect(isAdultContent("Drag Queen Story Hour", "A family-friendly community reading")).toBe(false);
  });

  it("continues to block explicitly adult-themed events", () => {
    expect(isAdultContent("Adult cabaret", "An 18+ performance")).toBe(true);
    expect(isAdultContent("A burlesque show", "Late-night adult entertainment")).toBe(true);
  });

  it("blocks age-restricted listings even when their titles are neutral", () => {
    expect(isAdultContent("A concert", "Live music", { legalAgeEnforced: true })).toBe(true);
    expect(isAdultContent("A concert", "Live music", { text: "18+" })).toBe(true);
    expect(isAdultContent("A concert", "Live music", { text: "All ages" })).toBe(false);
    expect(isAdultContent("Crystal Castles Night - Ages 18+")).toBe(true);
    expect(isAdultContent("Emo Nite - 21+")).toBe(true);
    expect(isAdultContent("Digable Planets", "21 and Over")).toBe(true);
    expect(isAdultContent("A concert", "For guests 18 years and older")).toBe(true);
    expect(isAdultContent("Ish Ensemble", "Suggested21+ after 9PM")).toBe(true);
  });
});
