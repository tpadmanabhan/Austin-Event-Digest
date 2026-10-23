import { describe, expect, it } from "vitest";
import { EventItemSchema } from "@workspace/db";
import edition from "./editions/nyc-2026-10-23.json";
import { isWithinCityBounds, MAP_CENTERS } from "./cityBounds";

describe("New York City first edition", () => {
  const events = EventItemSchema.array().parse(edition.events);

  it("covers the five standard categories and the full Oct 23–31 range", () => {
    expect(edition.subject).toContain("October 23–31, 2026");
    expect(new Set(events.map(event => event.category))).toEqual(
      new Set(["Arts", "Sports", "Tech", "Civics", "Wellness"]),
    );
    expect(events.filter(event => !event.isBusinessSpotlight && !event.isPost)
      .every(event => event.startDate?.startsWith("2026-10-"))).toBe(true);
    expect(events.some(event => event.startDate?.startsWith("2026-10-31"))).toBe(true);
  });

  it("includes the requested AI events and both local spotlights", () => {
    expect(events.filter(event => event.category === "Tech").length).toBeGreaterThanOrEqual(4);
    expect(events.some(event => event.isBusinessSpotlight && event.title === "The Strand Book Store")).toBe(true);
    expect(events.some(event => event.isPost && event.title === "New York Cares")).toBe(true);
  });

  it("uses New York City geography for maps and venue validation", () => {
    expect(MAP_CENTERS.nyc).toEqual({ lat: 40.7128, lng: -74.006 });
    expect(isWithinCityBounds("nyc", 40.5795, -73.9707)).toBe(true);
    expect(isWithinCityBounds("nyc", 34.0522, -118.2437)).toBe(false);
  });
});
