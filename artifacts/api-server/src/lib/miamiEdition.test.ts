import { describe, expect, it, vi } from "vitest";
import { filterStaleEvents } from "../routes/events";
import { readFileSync } from "node:fs";
import edition from "./editions/miami-2026-10-14.json";
import { buildDigestEmailHtml } from "./emailService";
import { isWithinCityBounds } from "./cityBounds";
import { geocodeVenue } from "./geocodeVenue";
import { EventItemSchema } from "@workspace/db";

describe("Miami October 14–31 edition", () => {
  const events = EventItemSchema.array().parse(edition.events);
  it("retains all five categories, seven AI events, two undated spotlights and both boundary days", () => {
    const scheduled = events.filter(e => !e.isPost && !e.isBusinessSpotlight && e.title !== "Miami Open 2027");
    expect(scheduled).toHaveLength(28);
    expect(scheduled.filter(e => e.category === "Tech")).toHaveLength(7);
    expect(new Set(scheduled.map(e => e.category))).toEqual(new Set(["Tech", "Arts", "Sports", "Civics", "Wellness"]));
    expect(events.filter(e => e.isPost || e.isBusinessSpotlight)).toHaveLength(2);
    expect(scheduled.some(e => e.startDate?.startsWith("2026-10-14"))).toBe(true);
    expect(scheduled.some(e => e.startDate?.startsWith("2026-10-31"))).toBe(true);
    for (const event of scheduled) {
      expect(event.timezone).toBe("America/New_York");
      expect(Date.parse(event.startDate!)).toBeGreaterThanOrEqual(Date.parse("2026-10-14T00:00:00-04:00"));
      expect(Date.parse(event.startDate!)).toBeLessThan(Date.parse("2026-11-01T00:00:00-04:00"));
      expect(event.link).toMatch(/^https:\/\//);
      if (event.lat != null && event.lng != null) expect(isWithinCityBounds("miami", event.lat, event.lng)).toBe(true);
    }
    expect(scheduled.find(e => e.title.includes("Block Party"))?.endDate).toBe("2026-11-01T02:00:00-04:00");
  });
  it("never geocodes registration-only addresses or unspecified meeting points", async () => {
    for (const event of events.filter(e => /exact address after registration|exact meeting point/.test(e.venue))) {
      expect(event.lat).toBeNull();
      expect(event.lng).toBeNull();
      expect(event.venueAddress).toBeUndefined();
      expect(await geocodeVenue(event.venue, "miami")).toEqual({ lat: null, lng: null });
    }
  });
  it("keeps the next-year feature in page/email filtering through the tournament's final day", () => {
    vi.useFakeTimers();
    try {
      const open = events.find(e => e.title === "Miami Open 2027")!;
      vi.setSystemTime(new Date("2026-10-13T18:00:00Z"));
      expect(filterStaleEvents([open])).toEqual([open]);
      expect(filterStaleEvents([{ title: "Past feature", featured: true, date: "March 14, 2026" }])).toEqual([]);
      vi.setSystemTime(new Date("2027-03-28T18:00:00Z"));
      expect(filterStaleEvents([open])).toEqual([open]);
      vi.setSystemTime(new Date("2027-03-29T18:00:00Z"));
      expect(filterStaleEvents([open])).toEqual([]);
    } finally { vi.useRealTimers(); }
  });
  it("brands the newsletter for Miami and keeps the verified readings in sync", () => {
    const html = buildDigestEmailHtml({
      ...edition, events, siteUrl: "https://miami.eventcarpooling.com",
      digestId: 123, weekOf: edition.weekOf,
    }, null, null, { slug: "miami", city: "Miami, FL", name: "Miami Events", digestTitle: "Miami Events" });
    expect(html).toContain("October 14 – October 31, 2026");
    expect(html).toContain("Hey Miami!");
    expect(html).toContain("AI Ethics");
    expect(html).toContain("Books &amp; Books");
    expect(html).toContain("Catalyst Miami");
    expect(html).toContain("#0E5560");
    expect(html).not.toContain("Hey Austin");
    expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toContain("Coming Soon");
    expect(html).not.toContain("Austin Cares");
    const frontend = readFileSync(new URL("../../../austin-events/src/lib/miami-ai-ethics.ts", import.meta.url), "utf8");
    const readingLinks = [...frontend.matchAll(/href: "([^"]+)"/g)].map(m => m[1]);
    expect(readingLinks).toHaveLength(4);
    for (const url of readingLinks) expect(html).toContain(url);
  });
  it("places the curator-attended Miami Open immediately after the community spotlight without duplicating it", () => {
    const open = events.filter(e => e.link === "https://www.miamiopen.com/");
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({
      title: "Miami Open 2027", featured: true, category: "Sports",
      startDate: "2027-03-14", endDate: "2027-03-28", timezone: "America/New_York",
    });
    const html = buildDigestEmailHtml({
      ...edition, events, siteUrl: "https://miami.eventcarpooling.com", digestId: 123,
    }, null, null, { slug: "miami", city: "Miami, FL", name: "Miami Events" });
    expect(html).toContain("Join Novak, Coco, and me in Miami");
    expect(html).toContain("I’ll be attending");
    expect(html).toContain("March 14 – 28, 2027 (subject to change)");
    expect(html).toContain('href="https://www.miamiopen.com/"');
    expect(html.indexOf("Catalyst Miami")).toBeLessThan(html.indexOf("<h2 style=\"color:#0E5560"));
    expect(html.indexOf("<!-- Community Spotlights -->")).toBeLessThan(html.indexOf("<!-- Miami curator-attended feature -->"));
    expect(html.indexOf("<!-- Miami curator-attended feature -->")).toBeLessThan(html.indexOf("<!-- Featured Events -->"));
    expect(html.match(/<h3[^>]*>Miami Open 2027<\/h3>/g)).toHaveLength(1);
  });
});
