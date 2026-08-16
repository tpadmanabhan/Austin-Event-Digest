import { describe, it, expect } from "vitest";
import { buildWelcomeEmailHtml, buildDigestEmailHtml } from "./emailService";

// ── Welcome email curator attribution ─────────────────────────────────────

describe("buildWelcomeEmailHtml — curator attribution", () => {
  const baseTenant = {
    slug: "testcity",
    name: "Test City Events",
    city: "Test City, TX",
  };

  it("shows curator name when set in DB", () => {
    const html = buildWelcomeEmailHtml("Alice", { ...baseTenant, curatorName: "Phil" });
    expect(html).toContain("Curated with ❤️ by Phil");
  });

  it("shows no attribution line when curatorName is null in DB", () => {
    const html = buildWelcomeEmailHtml("Alice", { ...baseTenant, curatorName: null });
    expect(html).not.toContain("Curated with");
  });

  it("shows no attribution line when curatorName is empty string in DB", () => {
    const html = buildWelcomeEmailHtml("Alice", { ...baseTenant, curatorName: "" });
    expect(html).not.toContain("Curated with");
  });

  it("falls back to Raj attribution when no tenant supplied", () => {
    const html = buildWelcomeEmailHtml("Alice", null);
    expect(html).toContain("Curated with ❤️ by Raj from Austin, TX");
  });

  it("falls back to Raj attribution when tenant is undefined", () => {
    const html = buildWelcomeEmailHtml("Alice", undefined);
    expect(html).toContain("Curated with ❤️ by Raj from Austin, TX");
  });
});

// ── Digest email curator attribution ───────────────────────────────────────

const sampleDigest = {
  subject: "🌆 Test City Events: Aug 18–24",
  intro: "Great stuff this week!",
  weekOf: new Date("2026-08-18T00:00:00Z"),
  events: [],
};

describe("buildDigestEmailHtml — curator attribution", () => {
  it("shows curator name from DB in header and intro", () => {
    const html = buildDigestEmailHtml(sampleDigest, null, null, {
      slug: "testcity",
      name: "Test City Events",
      city: "Test City, TX",
      curatorName: "Bob",
    });
    expect(html).toContain("Curated by Bob");
    expect(html).toContain("— Bob");
  });

  it("shows no curator byline when DB value is null", () => {
    const html = buildDigestEmailHtml(sampleDigest, null, null, {
      slug: "testcity",
      name: "Test City Events",
      city: "Test City, TX",
      curatorName: null,
    });
    expect(html).not.toContain("Curated by");
    // footer falls back to city-level attribution, not a personal name
    expect(html).not.toContain("— Bob");
    expect(html).not.toContain("— Raj");
  });

  it("uses DB value even when slug matches a hardcoded city (sacramento → DB wins)", () => {
    const html = buildDigestEmailHtml(sampleDigest, null, null, {
      slug: "sacramento",
      name: "Sacramento Events",
      city: "Sacramento, CA",
      curatorName: "Alice",   // DB override trumps hardcoded "Bob"
    });
    expect(html).toContain("Alice");
    expect(html).not.toContain("Curated by Bob");
  });

  it("clears hardcoded curator when admin explicitly sets null via admin panel", () => {
    const html = buildDigestEmailHtml(sampleDigest, null, null, {
      slug: "brushycreek",
      name: "Brushy Creek Events",
      city: "Brushy Creek, TX",
      curatorName: null,   // admin cleared it
    });
    expect(html).not.toContain("Rohan");
    expect(html).not.toContain("Curated by");
  });
});
