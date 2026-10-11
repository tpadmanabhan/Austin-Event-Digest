import { describe, expect, it } from "vitest";
import { parseEventLink } from "./eventLink";

describe("event link edits", () => {
  it("accepts the corrected First Light event URL without rewriting it", () => {
    const link = "https://www.firstlightaustin.com/events/william-magnuson-the-just-and-the-good";
    expect(parseEventLink(`  ${link}  `)).toEqual({ ok: true, link });
  });
  it("preserves query strings and fragments", () => {
    const link = "https://example.com/event?id=123#rsvp";
    expect(parseEventLink(link)).toEqual({ ok: true, link });
  });
  it.each([null, "", "  "])("clears an explicitly empty link: %s", (value) => {
    expect(parseEventLink(value)).toEqual({ ok: true, link: null });
  });
  it.each([
    undefined, 123, {}, "/events/123", "not a URL",
    "javascript:alert(1)", "data:text/html,test", "ftp://example.com/event",
    "https://user:password@example.com/event",
  ])("rejects unsafe or malformed links: %s", (value) => {
    expect(parseEventLink(value)).toEqual({ ok: false });
  });
});
