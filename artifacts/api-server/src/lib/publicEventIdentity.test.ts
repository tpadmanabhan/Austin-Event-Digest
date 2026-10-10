import { describe, it, expect } from "vitest";
import { withPublicEventIds } from "./publicEventIdentity";
import type { EventItem } from "@workspace/db";

const event: EventItem = { title: "Test community event", date: "2031-10-12", venue: "Test venue",
  description: "A fixture only.", category: "Community", link: "https://example.test/events/1" };

describe("public occurrence identity", () => {
  it("is deterministic across editions without changing source records", () => {
    const copy = structuredClone(event);
    const a = withPublicEventIds([event], 1)[0];
    expect(a.eventId).toMatch(/^ev-[a-f0-9]{24}$/);
    expect(withPublicEventIds([event], 1)[0].eventId).toBe(a.eventId);
    expect(event).toEqual(copy);
    expect(withPublicEventIds([event], 2)[0].eventId).not.toBe(a.eventId);
  });
  it("does not use array positions and survives titles and display-date edits", () => {
    const previous = withPublicEventIds([event], 1);
    const changed = { ...previous[0], title: "Corrected heading", date: "2031-10-13" };
    expect(withPublicEventIds([changed], 1, previous)[0].eventId).toBe(previous[0].eventId);
    expect(withPublicEventIds([{ ...event, title: "Corrected heading" }], 1, previous)[0].eventId).toBe(previous[0].eventId);
  });
  it("clears obsolete date/address metadata while preserving the public ID", () => {
    const previous = withPublicEventIds([{ ...event, startDate: "2031-10-12T12:00:00Z",
      endDate: "2031-10-12T13:00:00Z", venueAddress: "1 Test Street" }], 1);
    const [changed] = withPublicEventIds([{ ...previous[0], date: "2031-10-14", venue: "A different venue" }], 1, previous);
    expect(changed.eventId).toBe(previous[0].eventId);
    expect(changed.startDate).toBeUndefined();
    expect(changed.endDate).toBeUndefined();
    expect(changed.venueAddress).toBeUndefined();
  });
  it("retains verified metadata when an older client leaves the new fields out", () => {
    const previous = withPublicEventIds([{ ...event, startDate: "2031-10-12", venueAddress: "1 Test Street" }], 1);
    expect(withPublicEventIds([event], 1, previous)[0]).toMatchObject({
      eventId: previous[0].eventId, startDate: "2031-10-12", venueAddress: "1 Test Street",
    });
  });
});
