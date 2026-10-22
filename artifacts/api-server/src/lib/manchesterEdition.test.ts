import { describe, expect, it } from "vitest";
import { EventItemSchema } from "@workspace/db";
import edition from "./editions/manchester-2026-10-22.json";

describe("Manchester first edition", () => {
  const events = EventItemSchema.array().parse(edition.events);

  it("covers the full inclusive date range and all five city categories", () => {
    expect(edition.weekOf).toBe("2026-10-22");
    expect(edition.subject).toContain("October 22–31, 2026");
    expect(new Set(events.map(event => event.category))).toEqual(
      new Set(["Tech", "Arts", "Sports", "Civics", "Wellness"]),
    );

    const datedEvents = events.filter(event => !event.isPost && !event.isBusinessSpotlight);
    expect(datedEvents.length).toBeGreaterThan(0);
    for (const event of datedEvents) {
      const day = event.startDate?.slice(0, 10);
      expect(day).toBeDefined();
      expect(day! >= "2026-10-22" && day! <= "2026-10-31").toBe(true);
      expect(event.timezone).toBe("Europe/London");
      expect(event.link).toMatch(/^https:\/\//);
    }
  });

  it("uses Manchester's correct local offset across the October clock change", () => {
    const beforeClockChange = events.find(event => event.title === "South Manchester parkrun" && event.startDate?.startsWith("2026-10-24"));
    const afterClockChange = events.find(event => event.title === "South Manchester parkrun" && event.startDate?.startsWith("2026-10-31"));
    const halloween = events.find(event => event.title === "Halloween in the City Weekender");
    expect(beforeClockChange?.startDate).toBe("2026-10-24T09:00:00+01:00");
    expect(afterClockChange?.startDate).toBe("2026-10-31T09:00:00Z");
    expect(halloween?.endDate).toBe("2026-10-25T17:00:00Z");
  });

  it("keeps the verified city-centre location on the MCR Monsters listing", () => {
    const monsters = events.find(event => event.title === "MCR Monsters");
    expect(monsters?.lat).toBe(53.48442);
    expect(monsters?.lng).toBe(-2.24273);
  });
});
