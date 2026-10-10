import { describe, expect, it } from "vitest";
import { metadataFromTicketmaster } from "./verifiedEventMetadata";
const event = { title: "Test Team vs. Visiting Team", date: "Saturday, Oct 12 at 3:00 PM",
  venue: "Test Stadium", description: "Fixture only.", category: "Sports" };
const source = { name: event.title, dates: { start: { localDate: "2031-10-12", dateTime: "2031-10-12T19:30:00Z" } },
  _embedded: { venues: [{ name: "Test Stadium", timezone: "America/New_York", address: { line1: "1 Test Street" } }] } };
describe("organizer-verified metadata", () => {
  it("uses an explicit source year/time and verified matching venue", () => {
    expect(metadataFromTicketmaster(event, source)).toEqual({
      startDate: "2031-10-12T19:30:00Z", timezone: "America/New_York", venueAddress: "1 Test Street",
    });
    expect(event.date).toBe("Saturday, Oct 12 at 3:00 PM");
  });
  it("rejects different occurrences, venues and cancelled/postponed events", () => {
    expect(metadataFromTicketmaster({ ...event, date: "Sunday, Oct 13" }, source)).toEqual({});
    expect(metadataFromTicketmaster({ ...event, venue: "Different stadium" }, source)).toEqual({});
    expect(metadataFromTicketmaster(event, { ...source, dates: { ...source.dates, status: { code: "cancelled" } } })).toEqual({});
    expect(metadataFromTicketmaster(event, { ...source, dates: { ...source.dates, status: { code: "postponed" } } })).toEqual({});
  });
  it("does not publish a placeholder time for TBA starts or TBA dates", () => {
    expect(metadataFromTicketmaster(event, { ...source, dates: { start: { ...source.dates.start, timeTBA: true } } }).startDate).toBe("2031-10-12");
    expect(metadataFromTicketmaster(event, { ...source, dates: { start: { ...source.dates.start, dateTBD: true } } })).toEqual({});
  });
});
