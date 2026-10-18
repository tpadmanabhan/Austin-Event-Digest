/**
 * Email rendering tests — city branding isolation
 *
 * Verifies that:
 * - Austin digest emails contain Austin-specific branding (🤠, amber header, Raj)
 * - Unknown/new-city digest emails contain NO Austin branding
 * - Tokyo digest emails use the Tokyo-specific Japanese template
 * - Austin welcome emails use the 🤠 header and amber title
 * - Non-Austin welcome emails do NOT use 🤠 or the amber title color
 * - The welcome email subject only includes 🤠 for Austin
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildDigestEmailHtml,
  buildWelcomeEmailHtml,
  sendWelcomeEmail,
} from "./emailService";

// ---------------------------------------------------------------------------
// Environment + nodemailer setup (hoisted so they run before module imports).
// Sets GMAIL_USER so emailService.ts picks up the Gmail path at module-init
// time, then intercepts nodemailer so no real SMTP connection is made.
// ---------------------------------------------------------------------------
const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "test-msg" }));
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })));

// Set env before emailService.ts is imported so its module-level GMAIL_USER const is populated.
vi.hoisted(() => {
  process.env["GMAIL_USER"] = "test-user@gmail.com";
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));

// Minimal digest fixture shared across tests
const baseDigest = {
  subject: "Test Digest",
  intro: "Here are this week's events.",
  weekOf: new Date("2026-08-17"),
  events: [],
  digestId: 1,
  siteUrl: "https://test.eventcarpooling.com",
};

describe("AI Ethics reading section", () => {
  it("renders Sacramento's extended range and new readings in its local theme", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest, subject: "Sacramento Events — October 13 – October 31, 2026",
      weekOf: "2026-10-13", siteUrl: "https://sacramento.eventcarpooling.com",
    }, null, null, {
      slug: "sacramento", name: "Sacramento Events", city: "Sacramento, CA",
      digestTitle: "Sacramento Events",
    });
    expect(html).toContain("October 13 – October 31, 2026");
    expect(html).toContain("Reading list / Sacramento");
    expect(html).toContain("AI Risk Management Framework");
    expect(html).toContain("Principles for Trustworthy AI");
    expect(html).toContain("Atlas of AI");
    expect(html).toContain("Automating Inequality");
    expect(html).toContain("#5A2D81");
    expect(html).not.toContain("The AI Con");
    expect(html).not.toContain("AI Doesn’t Solve This");
    expect(html).not.toContain("Happy Sunday, Austin");
  });
  it("renders San Francisco's date range, local theme, and fresh readings without Austin copy", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest, subject: "San Francisco Events — October 12 – October 31, 2026",
      weekOf: "2026-10-12", siteUrl: "https://sanfrancisco.eventcarpooling.com",
    }, null, null, {
      slug: "sanfrancisco", name: "San Francisco Events", city: "San Francisco, CA", digestTitle: "San Francisco Events",
    });
    expect(html).toContain("October 12 – October 31, 2026");
    expect(html).toContain("AI Ethics");
    expect(html).toContain("AI Index Report 2026");
    expect(html).toContain("The AI Con");
    expect(html).toContain("The Worlds I See");
    expect(html).toContain("#F15A24");
    expect(html).not.toContain("theaicon.com");
    expect(html).not.toContain("Curated with ❤️ by Raj");
    expect(html).not.toContain("Happy Sunday, Austin");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("AI Doesn’t Solve This");
  });

  it("combines Austin's rebuild and city request, then renders the remaining AI Ethics items in order", () => {
    const html = buildDigestEmailHtml(baseDigest, null, null, {
      slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null,
    });
    expect(html).toContain("AI Ethics");
    const requestedItems = [
      "Rebuilding EventCarpooling.com for a better user experience",
      "Want an event page for your city?",
      "https://www.theatlantic.com/health/2026/10/community-builders/688947/",
      "https://luma.com/i1m74hz4",
      "Food for thought: Are destination websites okay with mass-scale data scraping by AI personal assistants?",
      "https://www.siliconvalley.com/2026/10/16/meta-updates-data-scraping-policy-following-criticism/",
    ];
    const requestedPositions = requestedItems.map(value => html.indexOf(value));
    expect(requestedPositions.every(position => position >= 0)).toBe(true);
    expect(requestedPositions).toEqual([...requestedPositions].sort((a, b) => a - b));
    expect(html).toMatch(/<a href="https:\/\/eventcarpooling\.com\/"[^>]*>Want an event page for your city\?<\/a> — Make a request; customization is also considered for each city\./);
    expect(html).toContain("customization is also considered for each city");
    expect(html).toContain("Meta updates data-scraping policy following criticism");
    expect(html).toContain("The revised terms leave questions about how business websites can control automated access to their content.");
    expect(html).not.toContain("AI Doesn’t Solve This");
    expect(html).not.toContain("10% Happier with Dan Harris");
    expect(html).not.toContain("Chasing Life with Dr. Sanjay Gupta");
    expect(html).not.toContain("The Wisdom of the Bullfrog");
    expect(html).not.toContain("Nick Bostrom");
    expect(html).not.toContain("404media.co");
    expect(html).not.toContain("are-we-trading-our-soul-for-convenience");
    expect(html.indexOf("AI Ethics")).toBeGreaterThan(html.indexOf("<!-- Intro -->"));
    expect(html.indexOf("AI Ethics")).toBeLessThan(html.indexOf("<!-- Location CTA -->"));
  });

  it.each(["tokyo", "austincares", "brushycreek", "portland", "bulverde", "stlouis", "dc", "atlanta", "houston"])(
    "does not leak Austin's editorial section into %s",
    slug => {
      const html = buildDigestEmailHtml(baseDigest, null, null, {
        slug, name: "City Events", city: "City", digestTitle: null,
      });
      const localEthicsSlugs = new Set(["tokyo", "portland", "bulverde", "stlouis", "dc", "houston"]);
      if (localEthicsSlugs.has(slug)) expect(html).toContain("AI Ethics");
      else expect(html).not.toContain("AI Ethics");
      expect(html).not.toContain("AI Doesn’t Solve This");
      expect(html).not.toContain("IRL Lifestyle Book of the Week");
      expect(html).not.toContain("Nick Bostrom");
    },
  );
});

// ── buildDigestEmailHtml ────────────────────────────────────────────────────

describe("buildDigestEmailHtml — city branding isolation", () => {
  it("Austin digest contains 🤠 emoji and amber header color", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      "Subscriber",
      "sub@example.com",
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null }
    );
    expect(html).toContain("🤠");
    expect(html).toContain("#fbbf24");       // amber — Austin brand color
    expect(html).toContain("Raj");           // Austin curator
  });

  it("Austin digest header says Upcoming events without a Week of date", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null }
    );
    expect(html).toContain(">Upcoming events</p>");
    expect(html).not.toContain("Your weekly guide");
    expect(html).not.toContain("Week of ");
  });

  it("Austin digest header gradient uses the light-green Austin palette", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null }
    );
    expect(html).toContain("#f1faf4");       // light-green gradient start
  });

  it("Unknown / new-city digest does NOT contain 🤠 or Austin curator text", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      "Subscriber",
      "sub@example.com",
      { slug: "newcity", name: "New City Events", city: "New City, XX", digestTitle: null }
    );
    expect(html).not.toContain("🤠");
    // #3b1f0a is Austin's uniquely rusty-brown gradient stop — absent from every other theme
    expect(html).not.toContain("#3b1f0a");
    // No Austin curator attribution
    expect(html).not.toContain(">Raj<");
    expect(html).not.toContain("customersuccessforgood");
    // Must not identify itself as Raj's Austin Events
    expect(html).not.toContain("Raj&#39;s Austin Events");
  });

  it("Unknown-city digest uses the generic neutral palette", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "brandnewplace", name: "Brand New Place", city: "Somewhere, ZZ", digestTitle: null }
    );
    expect(html).toContain("#3b82f6");       // generic blue primary
    expect(html).toContain("Brand New Place");
  });

  it("Tokyo digest contains 🗼 and uses the Tokyo blue palette", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "tokyo", name: "Tokyo Events", city: "Tokyo, Japan", digestTitle: null }
    );
    expect(html).toContain("🗼");
    expect(html).not.toContain("🤠");
    expect(html).toContain("#1B5EA8");       // Tokyo blue
  });

  it("Atlanta digest uses Atlanta branding and Eastern event times", () => {
    const html = buildDigestEmailHtml(
      {
        ...baseDigest,
        events: [{
          title: "Atlanta Tech Gathering",
          date: "2026-10-13T22:30:00.000Z",
          venue: "Atlanta Tech Village",
          description: "A local tech event",
          category: "Tech",
          link: "https://www.atltech.events/event/1",
          imageUrl: null,
          source: "ATLTech.events",
        }],
      },
      null,
      null,
      { slug: "atlanta", name: "Atlanta Events", city: "Atlanta, GA", digestTitle: "Atlanta Events" }
    );
    expect(html).toContain("🍑");
    expect(html).toContain("Atlanta Events");
    expect(html).toContain("#C8102E");
    expect(html).toContain("6:30 PM");
    expect(html).toContain("ATLTech.events");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("Raj");
  });

  it("shows Atlanta's extended October edition range instead of a seven-day week label", () => {
    const html = buildDigestEmailHtml(
      {
        ...baseDigest,
        subject: "🍑 Atlanta Events — October 1 to October 10, 2026",
        weekOf: "2026-10-01T00:00:00.000Z",
      },
      null,
      null,
      { slug: "atlanta", name: "Atlanta Events", city: "Atlanta, GA", digestTitle: "Atlanta Events" }
    );
    expect(html).toContain("October 1 – October 10, 2026");
    expect(html).not.toContain("Week of Thursday, October 1, 2026");
  });

  it("renders Houston's October 1–10 extended range with Houston branding and Central time", () => {
    const html = buildDigestEmailHtml(
      {
        ...baseDigest,
        subject: "⭐ Houston Events: October 1 to October 10, 2026",
        weekOf: "2026-10-01T00:00:00.000Z",
        events: [{
          title: "Houston Evening Event",
          date: "2026-10-13T22:30:00.000Z",
          venue: "Downtown Houston",
          description: "A local event.",
          category: "Arts",
          link: null,
          imageUrl: null,
          source: "Ticketmaster",
        }],
      },
      null,
      null,
      { slug: "houston", name: "Houston Events", city: "Houston, TX", digestTitle: "Houston Events" }
    );

    expect(html).toContain("⭐");
    expect(html).toContain("Houston Events");
    expect(html).toContain("Houston Astros logo");
    expect(html).toContain("/images/houston-astros.png");
    expect(html).toContain("#EB6E1F");
    expect(html).toContain("#002d62");
    expect(html).toContain("October 1 – October 10, 2026");
    expect(html).not.toContain("Week of Thursday, October 1, 2026");
    expect(html).toContain("5:30 PM");
    expect(html).not.toContain("6:30 PM");
    expect(html).not.toContain("Austin Cares");
    expect(html).not.toContain("Two new features");
    expect(html).not.toContain("🚀 Coming Soon");
  });

  it("Portland digest contains 🌲 and Portland red, not 🤠", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "portland", name: "Portland Events", city: "Portland, OR", digestTitle: null }
    );
    expect(html).toContain("🌲");
    expect(html).not.toContain("🤠");
    expect(html).toContain("#CE1141");
    expect(html).toContain("Week of ");
  });

  it("AustinCares digest uses the teal palette, not 🤠", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "austincares", name: "Austin Cares", city: "Austin, TX", digestTitle: null }
    );
    expect(html).not.toContain("🤠");
    expect(html).toContain("🏷️");
    expect(html).toContain("#1e6e6e");
  });

  it("Los Angeles digest uses its purple-and-gold brand throughout the email", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      subject: "Los Angeles Events — October 16 – October 31, 2026",
      weekOf: "2026-10-16",
      siteUrl: "https://la.eventcarpooling.com",
    }, null, null, {
      slug: "la", name: "Los Angeles Events", city: "Los Angeles, CA",
      digestTitle: "Los Angeles Events",
    });

    expect(html).toContain("aria-label=\"Los Angeles brand mark\"");
    expect(html).toContain('<table role="presentation" align="center"');
    expect(html).toContain('valign="middle"');
    expect(html).toContain("text-align:center; vertical-align:middle;");
    expect(html).not.toContain("display:inline-flex; align-items:center; justify-content:center;");
    expect(html).toContain("#552583");
    expect(html).toContain("#FDB927");
    expect(html).toContain("Reading list / Los Angeles");
    expect(html).toContain("October 16 – October 31, 2026");
    expect(html).not.toContain("#0E7490");
    expect(html).not.toContain("#12343a");
  });

  it("null tenant slug falls through to the generic theme, not Austin", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: null, name: "Some Digest", city: "Unknown", digestTitle: null }
    );
    // #3b1f0a is Austin's uniquely rusty-brown gradient stop — absent from every other theme
    expect(html).not.toContain("#3b1f0a");
    expect(html).not.toContain("🤠");
    // No Austin curator
    expect(html).not.toContain("customersuccessforgood");
    expect(html).not.toContain("Raj&#39;s Austin Events");
  });
});

// ── buildWelcomeEmailHtml ───────────────────────────────────────────────────

describe("buildWelcomeEmailHtml — city branding isolation", () => {
  it("Austin welcome email uses 🤠 and amber title color", () => {
    const html = buildWelcomeEmailHtml(
      "Test",
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null },
      "sub@example.com"
    );
    expect(html).toContain("🤠");
    expect(html).toContain("#fbbf24");
  });

  it("Non-Austin welcome email does NOT use 🤠 or amber", () => {
    const html = buildWelcomeEmailHtml(
      "Test",
      { slug: "portland", name: "Portland Events", city: "Portland, OR", digestTitle: null },
      "sub@example.com"
    );
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("#fbbf24");
  });

  it("New / unknown city welcome email does NOT use 🤠 or amber", () => {
    const html = buildWelcomeEmailHtml(
      "Test",
      { slug: "unknowncity", name: "Unknown City Events", city: "Unknown, XX", digestTitle: null },
      "sub@example.com"
    );
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("#fbbf24");
  });

  it("Tokyo welcome email uses Japanese language template with 🗼", () => {
    const html = buildWelcomeEmailHtml(
      null,
      { slug: "tokyo", name: "Tokyo Events", city: "Tokyo, Japan", digestTitle: null },
      "sub@example.com"
    );
    expect(html).toContain("🗼");
    expect(html).not.toContain("🤠");
    // Japanese text
    expect(html).toContain("登録完了");
  });

  it("sendWelcomeEmail uses the tenant display name as fromName, not Austin default", async () => {
    // mockSendMail is set up via vi.hoisted + vi.mock("nodemailer") above.
    // GMAIL_USER is also set via vi.hoisted so emailService.ts activates the Gmail path.
    mockSendMail.mockClear();

    const portlandTenant = { slug: "portland", name: "Portland Events", city: "Portland, OR", digestTitle: null };
    await sendWelcomeEmail("sub@example.com", "Test", portlandTenant);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArg = mockSendMail.mock.calls[0][0] as { from?: string };
    // The "from" field is formatted as "Display Name <addr>" — check display name
    expect(callArg.from).toContain("Portland Events");
    expect(callArg.from).not.toContain("Austin");
  });

  it("admin test-welcome for a non-Austin city (e.g. Portland) produces neutral branding, not 🤠", () => {
    // Simulates POST /admin/send-test-welcome for a Portland admin.
    // The route now passes req.tenant to sendWelcomeEmail, which calls
    // buildWelcomeEmailHtml — this test verifies the rendered output has
    // no Austin-specific branding so the fix is regression-tested.
    const portlandTenant = { slug: "portland", name: "Portland Events", city: "Portland, OR", digestTitle: null };
    const html = buildWelcomeEmailHtml("Admin", portlandTenant, "admin@example.com");
    expect(html).not.toContain("🤠");
    // Austin's uniquely rusty-brown gradient stop must not appear
    expect(html).not.toContain("#3b1f0a");
    // Portland city name should appear
    expect(html).toContain("Portland");
  });
});
