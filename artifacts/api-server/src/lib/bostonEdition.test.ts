import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EventItemSchema } from "@workspace/db";
import edition from "./editions/boston-2026-10-14.json";
import { buildDigestEmailHtml } from "./emailService";
import { BOSTON_AI_ETHICS_INTRO, BOSTON_AI_ETHICS_READINGS } from "./bostonAiEthics";
import { isWithinCityBounds, MAP_CENTERS } from "./cityBounds";
import { filterStaleEvents } from "../routes/events";
import { generateSampleDigest } from "./digestGenerator";

describe("Boston October 14–31 edition", () => {
  const events = EventItemSchema.array().parse(edition.events);
  const scheduled = events.filter(e => !e.isPost && !e.isBusinessSpotlight);
  it("has verified local AI events, all five categories and both boundary days", () => {
    expect(scheduled).toHaveLength(17);
    expect(scheduled.filter(e => e.category === "Tech")).toHaveLength(4);
    expect(new Set(scheduled.map(e => e.category)))
      .toEqual(new Set(["Tech", "Arts", "Sports", "Civics", "Wellness"]));
    expect(scheduled.some(e => e.startDate?.startsWith("2026-10-14"))).toBe(true);
    expect(scheduled.some(e => e.startDate?.startsWith("2026-10-31"))).toBe(true);
    for (const event of scheduled) {
      expect(event.timezone).toBe("America/New_York");
      expect(event.link).toMatch(/^https:\/\//);
      expect(event.source).toBeTruthy();
      expect(event.startDate!.slice(0, 10) >= "2026-10-14").toBe(true);
      expect(event.startDate!.slice(0, 10) <= "2026-10-31").toBe(true);
    }
  });
  it("keeps undated spotlights and verified dates without inventing race/session times", () => {
    const spotlights = events.filter(e => e.isPost || e.isBusinessSpotlight);
    expect(spotlights.map(e => e.title)).toEqual(["Brattle Book Shop", "Boston Cares"]);
    expect(spotlights.every(e => !e.startDate && !e.endDate)).toBe(true);
    expect(events.find(e => e.title === "Head of the Charles Regatta")?.startDate).toBe("2026-10-16");
    expect(events.find(e => e.title === "Boston Book Festival")?.startDate).toBe("2026-10-17");
    expect(events.find(e => e.title.startsWith("Fall-o-Ween"))?.startDate).toBe("2026-10-22T16:00:00-04:00");
    expect(events.find(e => e.title.startsWith("ICA Halloween"))?.endDate).toBe("2026-11-01T00:00:00-04:00");
    expect(events.find(e => e.title === "Agentic Builders Boston")?.description).toContain("photo ID");
  });
  it("bounds Boston map pins to the local metro", () => {
    expect(MAP_CENTERS.boston).toEqual({ lat: 42.3601, lng: -71.0589 });
    expect(isWithinCityBounds("boston", 42.3601, -71.0589)).toBe(true);
    expect(isWithinCityBounds("boston", 30.267, -97.743)).toBe(false);
  });
  it("keeps multi-day sports and undated spotlights through local final days", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-18T21:00:00Z"));
      const regatta = events.find(e => e.title === "Head of the Charles Regatta")!;
      expect(filterStaleEvents([regatta])).toEqual([regatta]);
      vi.setSystemTime(new Date("2026-10-19T14:00:00Z"));
      expect(filterStaleEvents([regatta])).toEqual([]);
      expect(filterStaleEvents(events.filter(e => e.isPost || e.isBusinessSpotlight))).toHaveLength(2);
    } finally { vi.useRealTimers(); }
  });
  it("keeps newsletter branding, readings and personalized RSVP links in parity", () => {
    const html = buildDigestEmailHtml({
      ...edition, events, siteUrl: "https://boston.eventcarpooling.com",
      digestId: 123, weekOf: edition.weekOf,
    }, "Reviewer", "reviewer@example.com", { slug: "boston", city: "Boston, MA", name: "Boston Events" });
    expect(html).toContain("Hey Boston!");
    expect(html).toContain("October 14 – October 31, 2026");
    expect(html).toContain("#BD3039");
    expect(html).toContain("Brattle Book Shop");
    expect(html).toContain("Boston Cares");
    expect(html).toContain("AI Ethics");
    expect(html).toContain(BOSTON_AI_ETHICS_INTRO);
    expect(html).toContain("/rsvp?w=");
    expect(html).toContain("https://boston.eventcarpooling.com");
    expect(html).not.toContain("Hey Austin");
    expect(html).not.toContain("Hey Miami");
    expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toContain("Coming Soon");
    const frontend = readFileSync(new URL("../../../austin-events/src/lib/boston-ai-ethics.ts", import.meta.url), "utf8");
    for (const reading of BOSTON_AI_ETHICS_READINGS) {
      expect(frontend).toContain(reading.href);
      expect(frontend).toContain(reading.title);
      expect(html).toContain(reading.href);
      expect(html).toContain(reading.note);
    }
  });
  it("does not fall back to invented Austin events when generating a Boston edition", () => {
    const sample = generateSampleDigest(new Date("2026-10-14T12:00:00Z"), undefined,
      { city: "Boston, MA", digestTitle: "Boston Events", slug: "boston" });
    expect(sample.events).toEqual([]);
    expect(sample.subject).not.toContain("🤠");
  });
});
