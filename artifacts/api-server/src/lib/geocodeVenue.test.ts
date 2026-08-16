/**
 * Unit tests for geocodeVenue.ts
 *
 * Verifies:
 *  - isInTokyoRegion rejects Seoul, Taiwan, China and accepts Tokyo coords
 *  - geocodeJapanese rejects foreign first results and falls through to next provider
 *  - geocodeVenue invalidates stale foreign cache entries and re-geocodes
 *  - geocodeVenue invalidates stale null cache entries (pre-Photon) and re-geocodes
 *  - geocodeEvents skips valid coords; invalidates null/foreign CJK cache entries
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";

// ── Mocks must be hoisted before the module under test is imported ──────────

vi.mock("@workspace/db", () => {
  const mockExecute = vi.fn();
  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });
  return {
    db: { execute: mockExecute, update: mockUpdate },
    digestsTable: {},
    sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
      ({ strings: strings.raw, values }),
  };
});

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    ({ strings: strings.raw, values }),
  eq: (a: unknown, b: unknown) => ({ a, b }),
}));

vi.mock("./logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Import after mocks are set up ───────────────────────────────────────────
import { isInTokyoRegion, containsCJK, geocodeJapanese, geocodeVenue, geocodeEvents } from "./geocodeVenue";
import { db } from "@workspace/db";

// Convenience: typed reference to the db.execute mock
const mockExecute = db.execute as unknown as MockInstance;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that fetch would return */
function nominatimResponse(results: Array<{ lat: string; lon: string }>) {
  return {
    ok: true,
    json: async () => results,
  } as unknown as Response;
}

function photonResponse(coords: [number, number] | null) {
  return {
    ok: true,
    json: async () =>
      coords
        ? { features: [{ geometry: { coordinates: coords } }] }
        : { features: [] },
  } as unknown as Response;
}

/** Tokyo coords (Shibuya) */
const TOKYO = { lat: 35.6598, lng: 139.7004 };
/** Seoul coords — must be rejected */
const SEOUL_LAT = "37.5665", SEOUL_LNG = "126.9780";
/** Empty Nominatim response */
const NOMINATIM_EMPTY: Response = { ok: true, json: async () => [] } as unknown as Response;

// ── Test suites ─────────────────────────────────────────────────────────────

describe("isInTokyoRegion", () => {
  it("accepts central Tokyo coordinates", () => {
    expect(isInTokyoRegion(35.6762, 139.6503)).toBe(true); // Shinjuku
    expect(isInTokyoRegion(35.6598, 139.7004)).toBe(true); // Shibuya
    expect(isInTokyoRegion(35.4437, 139.6380)).toBe(true); // Yokohama
    expect(isInTokyoRegion(35.8617, 139.6455)).toBe(true); // Saitama-ish
  });

  it("rejects Seoul (South Korea)", () => {
    expect(isInTokyoRegion(37.5665, 126.9780)).toBe(false);
  });

  it("rejects Taipei (Taiwan)", () => {
    expect(isInTokyoRegion(25.0330, 121.5654)).toBe(false);
  });

  it("rejects Beijing (China)", () => {
    expect(isInTokyoRegion(39.9042, 116.4074)).toBe(false);
  });

  it("rejects Vladivostok (Russia)", () => {
    expect(isInTokyoRegion(43.1155, 131.8855)).toBe(false);
  });
});

describe("containsCJK", () => {
  it("detects Japanese hiragana/katakana/kanji", () => {
    expect(containsCJK("渋谷")).toBe(true);
    expect(containsCJK("六本木ヒルズアリーナ")).toBe(true);
    expect(containsCJK("Zepp Tokyo")).toBe(false);
    expect(containsCJK("Shibuya O-EAST")).toBe(false);
  });
});

describe("geocodeJapanese — foreign result rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a Seoul result from Nominatim and tries the next provider", async () => {
    // Call 1: Nominatim exact — returns Seoul (foreign, should be rejected)
    // Call 2: sleep then Nominatim + "Tokyo, Japan" suffix — returns empty
    // Call 3: sleep then Photon exact — returns valid Tokyo coords
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nominatimResponse([{ lat: SEOUL_LAT, lon: SEOUL_LNG }]))  // 1. foreign
      .mockResolvedValueOnce(NOMINATIM_EMPTY)                                          // 2. Nom+suffix empty
      .mockResolvedValueOnce(photonResponse([TOKYO.lng, TOKYO.lat]));                  // 3. Photon ✓

    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeJapanese("渋谷");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(TOKYO.lat, 2);
    expect(result!.lng).toBeCloseTo(TOKYO.lng, 2);

    // Nominatim was tried at least once and Photon was the winner
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null when all four strategies fail to find a Tokyo-region result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(nominatimResponse([{ lat: SEOUL_LAT, lon: SEOUL_LNG }])); // always Seoul

    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeJapanese("渋谷");
    expect(result).toBeNull();
  });

  it("accepts a direct Nominatim hit that is inside the Tokyo bbox", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nominatimResponse([{ lat: String(TOKYO.lat), lon: String(TOKYO.lng) }]));

    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeJapanese("六本木ヒルズ");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(TOKYO.lat, 2);
    // Only one fetch call needed
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("geocodeVenue — stale cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates a stale foreign (Seoul) cache entry and re-geocodes via Photon", async () => {
    // cacheGet returns Seoul coords (stale bad Nominatim match)
    mockExecute
      .mockResolvedValueOnce({ rows: [{ lat: 37.5665, lng: 126.9780 }] }) // cacheGet: Seoul ← stale
      .mockResolvedValueOnce({})                                            // cacheDelete
      .mockResolvedValueOnce({});                                           // cacheSet

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(NOMINATIM_EMPTY)                              // Nom exact
      .mockResolvedValueOnce(NOMINATIM_EMPTY)                              // Nom+suffix
      .mockResolvedValueOnce(photonResponse([TOKYO.lng, TOKYO.lat]));      // Photon ✓

    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeVenue("渋谷");
    expect(result.lat).toBeCloseTo(TOKYO.lat, 2);
    expect(result.lng).toBeCloseTo(TOKYO.lng, 2);

    // cacheDelete must have been called to evict the stale Seoul entry
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("invalidates a null cache entry (pre-Photon failure) and re-geocodes", async () => {
    // cacheGet returns null (Nominatim previously found nothing; Photon wasn't tried)
    mockExecute
      .mockResolvedValueOnce({ rows: [{ lat: null, lng: null }] }) // cacheGet: null ← stale
      .mockResolvedValueOnce({})                                    // cacheDelete
      .mockResolvedValueOnce({});                                   // cacheSet

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(NOMINATIM_EMPTY)
      .mockResolvedValueOnce(NOMINATIM_EMPTY)
      .mockResolvedValueOnce(photonResponse([TOKYO.lng, TOKYO.lat])); // Photon ✓

    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeVenue("新宿");
    expect(result.lat).toBeCloseTo(TOKYO.lat, 2);
    expect(result.lng).toBeCloseTo(TOKYO.lng, 2);
  });

  it("returns valid cached Tokyo coords without any HTTP call", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ lat: TOKYO.lat, lng: TOKYO.lng }] });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeVenue("渋谷");
    expect(result.lat).toBeCloseTo(TOKYO.lat, 2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns cached coords for non-CJK venues without geographic validation", async () => {
    // Non-CJK venues bypass the Tokyo bbox check entirely
    mockExecute.mockResolvedValueOnce({ rows: [{ lat: 30.2672, lng: -97.7431 }] }); // Austin

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeVenue("Austin Convention Center");
    expect(result.lat).toBeCloseTo(30.2672, 2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("geocodeEvents — CJK cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates null CJK cache for an event with lat=null and resolves via Photon", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ lat: null, lng: null }] }) // cacheGet: null
      .mockResolvedValueOnce({})                                    // cacheDelete
      .mockResolvedValueOnce({});                                   // cacheSet

    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(NOMINATIM_EMPTY)
      .mockResolvedValueOnce(NOMINATIM_EMPTY)
      .mockResolvedValueOnce(photonResponse([TOKYO.lng, TOKYO.lat]))); // Photon ✓

    const events = [{ title: "Tokyo Show", venue: "渋谷", lat: null, lng: null }];
    const result = await geocodeEvents(events);
    expect(result[0]?.lat).toBeCloseTo(TOKYO.lat, 2);
    expect(result[0]?.lng).toBeCloseTo(TOKYO.lng, 2);
  });

  it("skips geocoding for an event that already has valid coords", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const events = [{ title: "Austin Show", venue: "Austin Venue", lat: 30.2672, lng: -97.7431 }];
    const result = await geocodeEvents(events);
    expect(result[0]?.lat).toBe(30.2672);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("passes through events with no venue unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const events = [{ title: "Unknown Venue Event", lat: null, lng: null }];
    const result = await geocodeEvents(events);
    expect(result[0]?.lat).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
