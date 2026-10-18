import { describe, expect, it } from "vitest";
import { SendDigestBody } from "@workspace/api-zod";
import { selectRecipientDigestEvents } from "./events";

const events = [
  { title: "Far event", lat: 30.5, lng: -97.743 },
  { title: "Spotlight", isBusinessSpotlight: true },
  { title: "Nearby event", lat: 30.2672, lng: -97.743 },
];

const recipient = {
  email: "subscriber@example.com",
  name: null,
  anchorLat: 30.267,
  anchorLng: -97.743,
  radiusMiles: 3,
  walkableOnly: false,
};

describe("digest send location personalization", () => {
  it("accepts an explicit request to preserve the edition order", () => {
    const parsed = SendDigestBody.parse({
      digestId: 148,
      confirm: true,
      personalizeByLocation: false,
    });

    expect(parsed.personalizeByLocation).toBe(false);
    expect(selectRecipientDigestEvents(events, recipient, true, parsed.personalizeByLocation)).toEqual({
      mainEvents: events,
      alsoNearby: [],
    });
  });

  it("keeps location personalization enabled by default", () => {
    const parsed = SendDigestBody.parse({ digestId: 148, confirm: true });

    expect(parsed.personalizeByLocation).toBeUndefined();
    expect(selectRecipientDigestEvents(events, recipient, true, parsed.personalizeByLocation)).toMatchObject({
      mainEvents: [{ title: "Spotlight" }, { title: "Nearby event" }],
      alsoNearby: [{ title: "Far event" }],
    });
  });
});
