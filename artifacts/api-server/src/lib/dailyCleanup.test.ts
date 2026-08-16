import { describe, it, expect } from "vitest";
import { isStaleEvent } from "./dailyCleanup";

/** Build a midnight Date from year/month(0-based)/day */
function d(year: number, month: number, day: number): Date {
  const dt = new Date(year, month, day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Minimal event record */
function ev(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { date: "Aug 20", category: "Arts", ...overrides };
}

describe("isStaleEvent", () => {
  // ── Basic past / future ────────────────────────────────────────────────────

  it("marks a regular past event as stale", () => {
    // weekOf Aug 1, event Aug 3 (within week), today Aug 14 → Aug 3 >= weekOf, Aug 3 < today → stale
    expect(isStaleEvent(ev({ date: "Aug 3" }), d(2026, 7, 14), d(2026, 7, 1))).toBe(true);
  });

  it("keeps an event that falls on today as NOT stale", () => {
    expect(isStaleEvent(ev({ date: "Aug 14" }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  it("keeps a future event as NOT stale", () => {
    expect(isStaleEvent(ev({ date: "Aug 20" }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  // ── Protected entries — never stale ───────────────────────────────────────

  it("never removes featured (Special Event) entries", () => {
    expect(isStaleEvent(ev({ date: "Jan 1", featured: true }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  it("never removes community posts (isPost)", () => {
    expect(isStaleEvent(ev({ date: "Jan 1", isPost: true }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  it("never removes business spotlights", () => {
    expect(isStaleEvent(ev({ date: "Jan 1", isBusinessSpotlight: true }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  it("keeps events with no date field", () => {
    expect(isStaleEvent({ category: "Arts" }, d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  it("keeps events with unparseable date strings", () => {
    expect(isStaleEvent(ev({ date: "TBD" }), d(2026, 7, 14), d(2026, 7, 10))).toBe(false);
  });

  // ── Old unsent drafts (6+ months old) — must be cleaned up ───────────────

  it("removes a January event from an old January draft when today is August", () => {
    // weekOf = Jan 12 2026, event "Jan 15", today = Aug 14 2026
    // Jan 15 >= weekOf Jan 12 → stays Jan 15 2026 → Jan 15 2026 < Aug 14 2026 → stale
    expect(isStaleEvent(ev({ date: "Jan 15" }), d(2026, 7, 14), d(2026, 0, 12))).toBe(true);
  });

  it("removes a March event from an old March draft when today is September", () => {
    // weekOf = Mar 3 2026, event "Mar 10", today = Sep 1 2026
    // Mar 10 >= weekOf → stays Mar 10 2026 → past → stale
    expect(isStaleEvent(ev({ date: "Mar 10" }), d(2026, 8, 1), d(2026, 2, 3))).toBe(true);
  });

  it("removes a June event from an old June draft when today is December", () => {
    // weekOf = Jun 1 2026, event "Jun 5", today = Dec 1 2026
    // Jun 5 >= weekOf → stays Jun 5 2026 → past → stale
    expect(isStaleEvent(ev({ date: "Jun 5" }), d(2026, 11, 1), d(2026, 5, 1))).toBe(true);
  });

  // ── December digest → upcoming January/March events (next-year rollover) ──

  it("does NOT remove a January event from a December digest (next-year rollover)", () => {
    // weekOf = Dec 14 2026, event "Jan 10" → Jan 10 2026 < weekOf → bump to Jan 10 2027
    // Jan 10 2027 > today Dec 20 2026 → NOT stale
    expect(isStaleEvent(ev({ date: "Jan 10" }), d(2026, 11, 20), d(2026, 11, 14))).toBe(false);
  });

  it("does NOT remove a March event from a December digest", () => {
    // weekOf = Dec 14 2026, event "Mar 1" → Mar 1 2026 < weekOf → bump to Mar 1 2027 → NOT stale
    expect(isStaleEvent(ev({ date: "Mar 1" }), d(2026, 11, 15), d(2026, 11, 14))).toBe(false);
  });

  it("does NOT remove a February event from a December digest", () => {
    expect(isStaleEvent(ev({ date: "Feb 5" }), d(2026, 11, 20), d(2026, 11, 14))).toBe(false);
  });

  // ── Cross-year edges within December digest ───────────────────────────────

  it("marks a past December event as stale within a December digest", () => {
    // weekOf = Dec 14 2026, event "Dec 15" → Dec 15 2026 >= weekOf → stays → Dec 15 < today Dec 20 → stale
    expect(isStaleEvent(ev({ date: "Dec 15" }), d(2026, 11, 20), d(2026, 11, 14))).toBe(true);
  });

  it("keeps an upcoming December event as NOT stale", () => {
    // weekOf = Dec 14, today = Dec 20, event = Dec 25 → Dec 25 >= weekOf → stays → Dec 25 > today → NOT stale
    expect(isStaleEvent(ev({ date: "Dec 25" }), d(2026, 11, 20), d(2026, 11, 14))).toBe(false);
  });

  // ── January digest events ─────────────────────────────────────────────────

  it("marks a past event on Jan 4 as stale when the digest is Jan 4 and today is Jan 5", () => {
    // weekOf = Jan 4 2027, event "Jan 4" → Jan 4 2027 >= weekOf → stays → Jan 4 2027 < today Jan 5 2027 → stale
    expect(isStaleEvent(ev({ date: "Jan 4" }), d(2027, 0, 5), d(2027, 0, 4))).toBe(true);
  });

  it("keeps a future September event from a January digest as NOT stale", () => {
    // weekOf = Jan 4 2027, event "Sep 1" → Sep 1 2027 >= weekOf → stays → Sep 1 2027 > today Jan 5 2027 → NOT stale
    expect(isStaleEvent(ev({ date: "Sep 1" }), d(2027, 0, 5), d(2027, 0, 4))).toBe(false);
  });

  // ── Date format variants ───────────────────────────────────────────────────

  it("handles full month names like 'August 3'", () => {
    // weekOf Aug 1, today Aug 14, event "August 3" → stale
    expect(isStaleEvent(ev({ date: "August 3" }), d(2026, 7, 14), d(2026, 7, 1))).toBe(true);
  });

  it("handles abbreviated months with period like 'Aug. 20'", () => {
    // weekOf Aug 14, today Aug 14, event "Aug. 20" → NOT stale
    expect(isStaleEvent(ev({ date: "Aug. 20" }), d(2026, 7, 14), d(2026, 7, 14))).toBe(false);
  });

  it("handles 'Jul 4' format correctly", () => {
    // weekOf Jul 1 2026, today Aug 14 2026 → Jul 4 >= weekOf → stays → Jul 4 < today → stale
    expect(isStaleEvent(ev({ date: "Jul 4" }), d(2026, 7, 14), d(2026, 6, 1))).toBe(true);
  });
});
