import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAtlTechEvents } from "./atlTechEvents";
import { getAdaptersForCategories } from "./registry";

const ATL_EVENT = {
  id: 101,
  title: "Atlanta Product Meetup",
  description: "A local product and technology community meetup.",
  startDate: "2026-10-13T18:30:00",
  endDate: "2026-10-13T20:00:00",
  eventURL: "https://www.atltech.events/event/101",
  eventType: "In-person",
  organization: "Atlanta Product",
  location: "Atlanta Tech Village",
  lat: 33.8400,
  lon: -84.3790,
  tags: ["product", "technology"],
};

const RANGE = {
  city: "Atlanta, GA",
  category: "Tech",
  weekOf: new Date("2026-10-11T04:00:00.000Z"),
  weekEnd: new Date("2026-10-18T04:00:00.000Z"),
};

function response(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  } as Response;
}

describe("ATLTech.events adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps public in-person events using Atlanta local time and deduplicates by title, start, and venue", async () => {
    vi.mocked(fetch).mockResolvedValue(response([
      ATL_EVENT,
      { ...ATL_EVENT },
      { ...ATL_EVENT, startDate: "2026-10-13T19:30:00" },
      { ...ATL_EVENT, location: "Atlanta Startup Village" },
    ]));

    const events = await fetchAtlTechEvents(RANGE);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "https://www.atltech.events/api/Events/month/2026/10",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      title: "Atlanta Product Meetup",
      date: "Tuesday, Oct 13 at 6:30 PM",
      venue: "Atlanta Tech Village",
      category: "Tech",
      link: "https://www.atltech.events/event/101",
      source: "ATLTech.events",
      lat: 33.84,
      lng: -84.379,
    });
    expect(events.map(event => event.venue)).toEqual([
      "Atlanta Tech Village",
      "Atlanta Tech Village",
      "Atlanta Startup Village",
    ]);
  });

  it("fetches just the months intersecting the requested range and keeps distinct venues", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      const novemberEvent = { ...ATL_EVENT, startDate: "2026-11-02T18:30:00" };
      return response(url.endsWith("/2026/10")
        ? [novemberEvent]
        : [{ ...novemberEvent, location: "Atlanta Startup Village" }]);
    });

    const events = await fetchAtlTechEvents({
      ...RANGE,
      weekOf: new Date("2026-10-31T04:00:00.000Z"),
      weekEnd: new Date("2026-11-08T05:00:00.000Z"),
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(2);
    expect(events.map(event => event.venue)).toEqual(["Atlanta Tech Village", "Atlanta Startup Village"]);
  });

  it("rejects events without a public URL, with virtual/private status, outside Atlanta, or outside the requested dates", async () => {
    vi.mocked(fetch).mockResolvedValue(response([
      { ...ATL_EVENT, eventURL: null },
      { ...ATL_EVENT, eventType: "Virtual" },
      { ...ATL_EVENT, isPrivate: true },
      { ...ATL_EVENT, lat: 40.7128, lon: -74.0060 },
      { ...ATL_EVENT, startDate: "2026-10-20T18:30:00" },
      { ...ATL_EVENT, location: "Online webinar" },
      { ...ATL_EVENT, eventURL: "http://example.com/event" },
    ]));

    expect(await fetchAtlTechEvents(RANGE)).toEqual([]);
  });

  it("does not query ATLTech.events for another city or category", async () => {
    expect(await fetchAtlTechEvents({ ...RANGE, city: "Austin, TX" })).toEqual([]);
    expect(await fetchAtlTechEvents({ ...RANGE, category: "Arts" })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("registers ATLTech.events for Tech only", () => {
    expect(getAdaptersForCategories(["Tech"]).some(({ adapter }) => adapter.name === "ATLTech.events")).toBe(true);
    expect(getAdaptersForCategories(["Arts"]).some(({ adapter }) => adapter.name === "ATLTech.events")).toBe(false);
  });

  it("returns no events when the feed is unavailable or malformed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([], false)).mockResolvedValueOnce(response({ events: [] }));
    const events = await fetchAtlTechEvents({
      ...RANGE,
      weekEnd: new Date("2026-11-01T04:00:00.000Z"),
    });
    expect(events).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});