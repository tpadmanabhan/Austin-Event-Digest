import { describe, expect, it } from "vitest";
import { cityLabelFromVenue } from "./cityLabelFromVenue";

describe("cityLabelFromVenue", () => {
  it("uses the explicit venue city instead of the edition city", () => {
    expect(cityLabelFromVenue("San Jose Convention Center, San Jose, CA")).toBe("San Jose");
  });

  it("handles a street-address suffix with a ZIP code", () => {
    expect(cityLabelFromVenue("Convention Center, 150 W San Carlos St, San Jose, CA 95113")).toBe("San Jose");
  });

  it("leaves ordinary venue names to the tenant-city fallback", () => {
    expect(cityLabelFromVenue("Moody Center ATX")).toBeUndefined();
    expect(cityLabelFromVenue("San Jose Convention Center, San Jose, California")).toBeUndefined();
  });
});
