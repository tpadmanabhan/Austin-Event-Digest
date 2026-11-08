import { describe, expect, it } from "vitest";
import { AddAlumniHappeningBody, ListDigestsResponse, SendDigestBody } from "@workspace/api-zod";
import { selectRecipientDigestEvents } from "./events";
import { decodeDigestTestAttachment } from "../lib/digestTestAttachment";

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

describe("one-off digest send options", () => {
  it("accepts a single test recipient, subject suffix, and PDF attachment", () => {
    const contentBase64 = Buffer.from("%PDF-1.4\n%%EOF\n").toString("base64");
    const parsed = SendDigestBody.parse({
      digestId: 155,
      testEmail: "robertsonalex40@gmail.com",
      testSubjectSuffix: "Draft with Admin Guide",
      testAttachment: {
        filename: "Leadership Austin Admin Guide.pdf",
        contentBase64,
      },
    });

    expect(parsed.testEmail).toBe("robertsonalex40@gmail.com");
    expect(parsed.testSubjectSuffix).toBe("Draft with Admin Guide");
    expect(decodeDigestTestAttachment(parsed.testAttachment!.contentBase64)?.toString("ascii"))
      .toContain("%PDF-1.4");
  });

  it("rejects unsafe attachment filenames and invalid base64", () => {
    const invalidFilename = SendDigestBody.safeParse({
      digestId: 155,
      testEmail: "recipient@example.com",
      testAttachment: { filename: "../guide.pdf", contentBase64: "JVBERi0=" },
    });
    const invalidBase64 = SendDigestBody.safeParse({
      digestId: 155,
      testEmail: "recipient@example.com",
      testAttachment: { filename: "guide.pdf", contentBase64: "%%%=" },
    });

    expect(invalidFilename.success).toBe(false);
    expect(invalidBase64.success).toBe(false);
  });
});

describe("digest response contract", () => {
  it("accepts a custom label for an Alumni Happenings link", () => {
    const body = AddAlumniHappeningBody.parse({
      type: "news",
      title: "Annual Giving Campaign",
      description: "Support connected, engaged leaders.",
      link: "https://example.com/campaign",
      linkText: "Give to the Annual Campaign",
    });

    expect(body.linkText).toBe("Give to the Annual Campaign");
  });

  it("preserves Alumni Happenings classification fields", () => {
    const response = ListDigestsResponse.parse({
      digests: [{
        id: 80,
        weekOf: "2026-11-08T12:00:00.000Z",
        subject: "Leadership Austin — Upcoming Events",
        intro: "",
        events: [{
          title: "Alumni gathering",
          date: "Monday, November 16, 2026",
          venue: "",
          description: "A manually managed alumni event.",
          category: "Programs",
          isAlumniHappening: true,
          alumniHappeningType: "event",
          linkText: "View event",
        }],
        sentAt: null,
        sentCount: 0,
        createdAt: "2026-11-04T12:00:00.000Z",
      }],
    });

    expect(response.digests[0]?.events[0]).toMatchObject({
      isAlumniHappening: true,
      alumniHappeningType: "event",
      linkText: "View event",
    });
  });
});
