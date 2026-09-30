import { describe, expect, it } from "vitest";
import { generateSampleDigest } from "./digestGenerator";

describe("generateSampleDigest — Atlanta onboarding", () => {
  it("starts with no Austin sample events and uses Atlanta newsletter copy", () => {
    const digest = generateSampleDigest(
      new Date("2026-10-11T00:00:00.000Z"),
      undefined,
      { slug: "atlanta", city: "Atlanta, GA", digestTitle: "Atlanta Events" },
    );

    expect(digest.subject).toContain("🍑 Atlanta Events");
    expect(digest.intro).toContain("Tech, Arts, Sports, Civics, and Wellness");
    expect(digest.events).toEqual([]);
    expect(JSON.stringify(digest)).not.toMatch(/Austin|Barton Springs|South Congress|Alamo Drafthouse/);
  });
});