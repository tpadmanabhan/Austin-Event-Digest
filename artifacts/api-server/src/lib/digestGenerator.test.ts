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

describe("generateSampleDigest — Houston onboarding", () => {
  it("uses Houston-specific subject and intro with no Austin sample events", () => {
    const digest = generateSampleDigest(
      new Date("2026-10-01T00:00:00.000Z"),
      undefined,
      { slug: "houston", city: "Houston, TX", digestTitle: "Houston Events" },
    );

    expect(digest.subject).toContain("⭐ Houston Events");
    expect(digest.subject).not.toContain("Houston Events Events");
    expect(digest.intro).toContain("Houston events across Tech, Arts, Sports, Civics, and Wellness");
    expect(digest.events).toEqual([]);
    expect(JSON.stringify(digest)).not.toMatch(/Austin|Barton Springs|South Congress|Alamo Drafthouse|Austin City Limits/);
  });
});

describe("generateSampleDigest — Leadership Austin", () => {
  it("starts with no imported events and uses date-free alumni copy", () => {
    const digest = generateSampleDigest(
      new Date("2026-11-08T12:00:00.000Z"),
      undefined,
      { slug: "leadershipaustin", city: "Austin, TX", digestTitle: "Leadership Austin" },
    );

    expect(digest.subject).toBe("Leadership Austin — Upcoming Events");
    expect(digest.intro).toContain("Alumni Happenings");
    expect(digest.events).toEqual([]);
    expect(digest.subject).not.toMatch(/\b(?:week of|nov(?:ember)?\s+\d)/i);
    expect(JSON.stringify(digest)).not.toMatch(/Barton Springs|South Congress|Alamo Drafthouse/);
  });
});