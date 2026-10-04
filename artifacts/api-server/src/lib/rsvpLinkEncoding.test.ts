import { describe, expect, it, vi } from "vitest";
import { decodeRsvpParam } from "../../../austin-events/src/lib/rsvp-params";

vi.hoisted(() => {
  process.env.RSVP_HMAC_SECRET = "test-only-rsvp-encoding-key";
});

import {
  signRsvpParams,
  signRsvpParamsByWeek,
  verifyRsvpSignature,
  verifyRsvpSignatureByWeek,
} from "./rsvpToken";

// Mirrors buildRsvpUrl's UTF-8 Buffer -> base64url serialization.
const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const title = "Williamson County Symphony Orchestra — October 10";
const email = "subscriber@example.com";
const week = "2026-10-04";

describe("newsletter RSVP parameter decoding", () => {
  it.each([
    title,
    "Austin’s fall concerts – free admission",
    "Renée García",
    "秋のAI Meetup",
    "🚗 Music & carpooling 🎶",
    "Plain ASCII title",
    "\uFEFFKeep every character",
  ])("round-trips UTF-8 text: %s", value => {
    expect(decodeRsvpParam(encode(value))).toBe(value);
  });

  it("accepts both padded standard base64 and unpadded base64url", () => {
    const value = "🚗";
    const standard = Buffer.from(value, "utf8").toString("base64");
    const urlSafe = encode(value);
    expect(urlSafe).toMatch(/[-_]/);
    expect(decodeRsvpParam(standard)).toBe(value);
    expect(decodeRsvpParam(urlSafe)).toBe(value);
  });

  it("retains existing empty and invalid-parameter behavior", () => {
    expect(decodeRsvpParam(null)).toBe("");
    expect(decodeRsvpParam("")).toBe("");
    expect(decodeRsvpParam("not-valid-base64!")).toBe("not-valid-base64!");
    expect(decodeRsvpParam("_w")).toBe("_w"); // Invalid UTF-8 byte.
  });

  it("preserves the title and email required to validate week-based links", () => {
    const params = new URLSearchParams({
      w: week, e: encode(title), em: encode(email), n: encode("Renée García"),
      s: signRsvpParamsByWeek(week, title, email)!,
    });
    expect(decodeRsvpParam(params.get("e"))).toBe(title);
    expect(decodeRsvpParam(params.get("n"))).toBe("Renée García");
    expect(verifyRsvpSignatureByWeek(
      params.get("w")!,
      decodeRsvpParam(params.get("e")),
      decodeRsvpParam(params.get("em")),
      params.get("s")!,
    )).toBe(true);
  });

  it("keeps already-sent legacy digest-ID links compatible", () => {
    const sig = signRsvpParams(134, title, email);
    expect(verifyRsvpSignature(
      134, decodeRsvpParam(encode(title)), decodeRsvpParam(encode(email)),
      undefined, sig!,
    )).toBe(true);
  });
});