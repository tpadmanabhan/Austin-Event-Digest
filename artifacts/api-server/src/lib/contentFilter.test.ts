import { describe, expect, it } from "vitest";
import { isAdultContent } from "./contentFilter";

describe("adult-content event filter", () => {
  it("does not treat LGBTQ identity or a non-adult drag event as adult content", () => {
    expect(isAdultContent("Drag Queen Story Hour", "A family-friendly community reading")).toBe(false);
  });

  it("continues to block explicitly adult-themed events", () => {
    expect(isAdultContent("Adult cabaret", "An 18+ performance")).toBe(true);
    expect(isAdultContent("A burlesque show", "Late-night adult entertainment")).toBe(true);
  });
});
