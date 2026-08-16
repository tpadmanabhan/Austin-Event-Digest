/**
 * Unit tests for weeklyRefresh.ts — buildCommunityEvents
 *
 * Verifies Austin event count, day-of-week mapping, featured tagging,
 * and past-event filtering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildCommunityEvents } from "./weeklyRefresh";

// Sunday 2025-08-17 00:00:00 UTC (a real calendar Sunday)
const WEEK_START   = new Date("2025-08-17T00:00:00.000Z");
const NEXT_WEEK    = new Date("2025-08-24T00:00:00.000Z");

describe("buildCommunityEvents — austin", () => {
  beforeEach(() => {
    // Pin "today" to the week start so no events are filtered as past
    vi.useFakeTimers();
    vi.setSystemTime(WEEK_START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 9 events for the austin slug", () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    expect(events.length).toBe(9);
  });

  it("returns 0 events for an unknown slug", () => {
    const events = buildCommunityEvents("unknown-city", WEEK_START, NEXT_WEEK);
    expect(events.length).toBe(0);
  });

  it("all events have required fields: title, date, venue, description, category", () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    for (const ev of events) {
      expect(ev.title).toBeTruthy();
      expect(ev.date).toBeTruthy();
      expect(ev.venue).toBeTruthy();
      expect(ev.description).toBeTruthy();
      expect(ev.category).toBeTruthy();
    }
  });

  it('tags events with dayOffset >= 7 as featured: true', () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    const featured    = events.filter(e => e.featured === true);
    const notFeatured = events.filter(e => !e.featured);
    // Events with dayOffset 7, 7, 9 => 3 featured
    expect(featured.length).toBe(3);
    expect(notFeatured.length).toBe(6);
  });

  it("all events carry source: Community", () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    for (const ev of events) {
      expect(ev.source).toBe("Community");
    }
  });

  it("date strings include the correct weekday for dayOffset 0 (Sunday)", () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    const sunday = events.find(e => e.title.includes("Barton Springs Pool"));
    expect(sunday).toBeDefined();
    expect(sunday!.date).toMatch(/^Sunday/);
  });

  it("date strings include the correct weekday for dayOffset 6 (Saturday)", () => {
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    const sat = events.find(e => e.title.includes("SFC Farmers Market"));
    expect(sat).toBeDefined();
    expect(sat!.date).toMatch(/^Saturday/);
  });

  it("filters out events whose date has already passed", () => {
    // Move clock to Friday of the same week — all Sun/Mon/Tue/Wed/Thu events are past
    vi.setSystemTime(new Date("2025-08-22T00:00:00.000Z")); // Friday
    const events = buildCommunityEvents("austin", WEEK_START, NEXT_WEEK);
    // Only Fri (dayOffset 5) + next-week events (7, 7, 9) should survive
    expect(events.length).toBeLessThan(9);
    expect(events.every(e => e.title !== "Barton Springs Pool — Morning Swim")).toBe(true);
  });
});
