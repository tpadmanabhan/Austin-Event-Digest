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
  sendManagedEventInterestNotification,
  sendManagedEventInterestGroupNotification,
  sendManagedEventInterestAdminNotification,
  translateEventsForEmail,
  formatCityNewsletterSubject,
} from "./emailService";

// ---------------------------------------------------------------------------
// Environment + nodemailer setup (hoisted so they run before module imports).
// Sets Titan's outgoing mailbox so no real SMTP connection is made.
// ---------------------------------------------------------------------------
const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "test-msg" }));
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })));
const mockOpenAIComplete = vi.hoisted(() => vi.fn());

// Set env before emailService.ts is imported so its module-level Titan settings are populated.
vi.hoisted(() => {
  process.env["TITAN_SMTP_HOST"] = "smtp.titan.email";
  process.env["TITAN_SMTP_PORT"] = "465";
  process.env["TITAN_SMTP_USER"] = "raj@eventcarpooling.com";
  process.env["TITAN_SMTP_PASSWORD"] = "test-only-password";
  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] = "test-only-openai-key";
  process.env["RSVP_HMAC_SECRET"] = "test-only-managed-event-signing-key";
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockOpenAIComplete } };
  },
}));

// Minimal digest fixture shared across tests
const baseDigest = {
  subject: "Test Digest",
  intro: "Here are this week's events.",
  weekOf: new Date("2026-08-17"),
  events: [],
  digestId: 1,
  siteUrl: "https://test.irl.group",
};

describe("AI Ethics reading section", () => {
  it("renders Sacramento's extended range and new readings in its local theme", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest, subject: "Sacramento Events — October 13 – October 31, 2026",
      weekOf: "2026-10-13", siteUrl: "https://sacramento.irl.group",
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
      weekOf: "2026-10-12", siteUrl: "https://sanfrancisco.irl.group",
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

  it("renders Dallas dates, branding and locally grounded AI Ethics without Austin copy", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      subject: "Dallas Events: October 23–31, 2026",
      weekOf: "2026-10-23",
      siteUrl: "https://dallas.irl.group",
      events: [{
        title: "Dallas community evening",
        date: "2026-10-29T00:30:00Z",
        venue: "Dallas",
        description: "A local community event.",
        category: "Community",
      }],
    }, null, null, {
      slug: "dallas", name: "Dallas Events", city: "Dallas, TX",
      digestTitle: "Dallas Events",
    });

    expect(html).toContain("October 23 – October 31, 2026");
    expect(html).toContain("dallas.irl.group/images/dallas-mark.svg");
    expect(html).toContain("#a94f35");
    expect(html).toContain("READING LIST / DALLAS");
    expect(html).toContain("Update on Artificial Intelligence: City AI Plan, Governance and Best Practices");
    expect(html).toContain("Technology Accountability Report — August 2026");
    expect(html).toContain("Race After Technology");
    expect(html).toContain("Wed, Oct 28, 2026 · 7:30 PM");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("Happy Sunday, Austin");
    expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toContain("Austin");

    const welcome = buildWelcomeEmailHtml("Taylor", {
      slug: "dallas", name: "Dallas Events", city: "Dallas, TX",
      digestTitle: "Dallas Events",
    }, "taylor@example.com");
    expect(welcome).toContain("dallas.irl.group/images/dallas-mark.svg");
    expect(welcome).toContain("Dallas &amp; North Texas");
    expect(welcome).toContain("Explore Dallas");
    expect(welcome).toContain("unsubscribe?email=taylor%40example.com");
    expect(welcome).not.toContain("🤠");
    expect(welcome).not.toMatch(/eventcarpooling|carpool/i);
  });

  it("renders NYC's local date range, branding, reading list, time zone and welcome email", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      subject: "New York City Events — October 23–31, 2026",
      weekOf: "2026-10-23",
      siteUrl: "https://nyc.irl.group",
      events: [{
        title: "New York community evening",
        date: "2026-10-29T00:30:00Z",
        venue: "New York City",
        description: "A local community event.",
        category: "Community",
      }],
    }, null, null, {
      slug: "nyc", name: "New York City Events", city: "New York City, NY",
      digestTitle: "New York City Events",
    });

    expect(html).toContain("October 23 – October 31, 2026");
    expect(html).toContain("nyc.irl.group/images/nyc-mark.svg");
    expect(html).toContain("#D65B3B");
    expect(html).toContain("Automated Employment Decision Tools (Local Law 144)");
    expect(html).toContain("Wed, Oct 28, 2026 · 8:30 PM");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("Happy Sunday, Austin");

    const welcome = buildWelcomeEmailHtml("Jordan", {
      slug: "nyc", name: "New York City Events", city: "New York City, NY",
      digestTitle: "New York City Events",
    }, "jordan@example.com");
    expect(welcome).toContain("nyc.irl.group/images/nyc-mark.svg");
    expect(welcome).toContain("Five boroughs. One good plan.");
    expect(welcome).toContain("unsubscribe?email=jordan%40example.com");
    expect(welcome).not.toContain("🤠");
    expect(welcome).not.toMatch(/eventcarpooling|carpool/i);
  });

  it("keeps Austin's current updates in one shared AI Ethics section", () => {
    const html = buildDigestEmailHtml(baseDigest, null, null, {
      slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null,
    });
    const privacyFeatureReference = "IRL’s upcoming Groups feature applies privacy-first thinking to local community";
    expect(html).not.toContain(privacyFeatureReference);
    expect(html).not.toContain("meditation, an hour of sharing, and a meal");
    expect(html).toContain("Groups, designed privacy-first");
    expect(html).toContain("No phone number required");
    expect(html).not.toContain("Two new features");
    expect(html).not.toContain("SMS for Local Businesses");
    expect(html).not.toContain("Tell a Friend");
    expect(html).toContain("AI Ethics");
    const ethicsHeading = '<h2 style="margin:0 0 12px; color:#1f2937; font-size:20px; font-weight:700;">AI Ethics</h2>';
    expect(html.split(ethicsHeading).length - 1).toBe(1);
    const requestedItems = [
      "Texas data-center governance, permits, and air quality",
      "https://www.texastribune.org/2026/10/30/rick-perry-texas-data-center-fermi-project-matador/",
      "https://www.texastribune.org/2026/10/21/data-center-permits-tceq-texas/",
      "https://www.texastribune.org/2026/10/20/data-centers-texas-air-quality-report-pollution-health-risks/",
      "We are telling AI chatbots our biggest secrets, but Proton warns our privacy is at huge risk",
      "https://tech.yahoo.com/cybersecurity/articles/telling-ai-chatbots-biggest-secrets-144603184.html",
      "AI shopping agent threatens Amazon",
      "https://seekingalpha.com/news/4661876-metas-ai-shopping-agent-threatens-amazons-lucrative-advertising-business",
      "manifesto for the AI coding age",
      "https://www.aol.com/articles/protons-cto-wrote-manifesto-ai-083701000.html",
      "Spurs² Hackathon at UT Austin",
      "https://customersuccessforgood.com/2026/10/26/spurs-hackathon-git/",
      "IRL.group: a home for local creators",
      "https://irl.group/",
      "Why Every Election Matters to Democracy with Stacey Abrams",
      "https://podcasts.apple.com/us/podcast/guy-kawasakis-remarkable-people/id1483081827?i=1000797951025",
    ];
    const requestedPositions = requestedItems.map(value => html.indexOf(value));
    expect(requestedPositions.every(position => position >= 0)).toBe(true);
    expect(requestedPositions).toEqual([...requestedPositions].sort((a, b) => a - b));
    const removedItems = [
      "ServiceSpace and Awakin Circles",
      "https://nipun.servicespace.org/",
      "https://www.awakin.org/",
      "The IRL economy is taking off",
      "https://fortune.com/2026/10/25/irl-economy-live-events-experience-economy-ai/?rand=8593",
      "Golfer Scottie Scheffler on choosing the right partnerships",
      "https://www.nytimes.com/athletic/7708954/2026/10/21/scottie-scheffler-golf-commercial-impact/",
      "It’s not necessarily not wanting to do things. It’s just wanting to do things with the right people.",
      "What you’ll find here",
      "I’ll favor recurring, mindful gatherings over transactional one-offs",
      "Faith leaders and AI guardrails",
      "https://religionnews.com/2026/09/15/at-ai-conference-religious-leaders-confront-what-technology-could-cost-humanity/",
    ];
    expect(removedItems.every((value) => !html.includes(value))).toBe(true);
    expect(html).not.toContain("The Rise of the IRL Influencer");
    expect(html).not.toContain("Meta updates data-scraping policy following criticism");
    expect(html.indexOf("AI Ethics")).toBeGreaterThan(html.indexOf("<!-- Intro -->"));
    expect(html.indexOf("AI Ethics")).toBeLessThan(html.indexOf("<!-- Location CTA -->"));
  });

  it("keeps Austin men's basketball and the cycling event heading visible and chronological", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      weekOf: "2026-11-01",
      events: [
        {
          title: "Texas Longhorns Mens Basketball vs. Chicago State Cougars Mens Basketball",
          date: "Monday, Nov 2 at 1:00 PM",
          venue: "Moody Center ATX",
          description: "Men's basketball at Moody Center.",
          category: "Sports",
        },
        {
          title: "Thursday Blursday — Advanced/Rolling Ride (Cycling)",
          date: "Recurring Thursday ride; Nov 5 at 6:30 PM",
          venue: "Austin, TX",
          description: "Weekly cycling ride.",
          category: "Sports",
        },
      ],
    }, null, null, {
      slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null,
    });

    const basketballPosition = html.indexOf("Texas Longhorns Mens Basketball vs. Chicago State Cougars Mens Basketball");
    const cyclingPosition = html.indexOf("Thursday Blursday — Advanced/Rolling Ride (Cycling)");
    expect(basketballPosition).toBeGreaterThan(-1);
    expect(cyclingPosition).toBeGreaterThan(basketballPosition);
    expect(html).toContain("Weekly cycling ride.");
  });

  it.each(["tokyo", "austincares", "brushycreek", "portland", "bulverde", "stlouis", "dc", "atlanta", "houston", "dallas"])(
    "does not leak Austin's editorial section into %s",
    slug => {
      const html = buildDigestEmailHtml(baseDigest, null, null, {
        slug, name: "City Events", city: "City", digestTitle: null,
      });
      const localEthicsSlugs = new Set(["tokyo", "portland", "bulverde", "stlouis", "dc", "houston", "dallas"]);
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
  it.each([
    "austin",
    "austincares",
    "atlanta",
    "boston",
    "brushycreek",
    "bulverde",
    "dallas",
    "dc",
    "houston",
    "la",
    "manchester",
    "miami",
    "nyc",
    "osaka",
    "portland",
    "sacramento",
    "sanfrancisco",
    "stlouis",
    "tokyo",
  ])("keeps legacy EventCarpooling and carpooling branding out of %s digest HTML", slug => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      siteUrl: `https://${slug}.irl.group`,
    }, null, null, {
      slug,
      name: slug === "austincares" ? "Austin Cares" : `${slug} Events`,
      city: slug === "austin" || slug === "austincares" ? "Austin, TX" : `${slug}, XX`,
      digestTitle: null,
    });

    expect(html).toContain('<img src="https://irl.group/images/irl-monogram.png" alt="IRL — In Real Life" width="88" height="88"');
    expect(html).toContain('href="https://irl.group" style="color:#78716c; text-decoration:underline;">IRL (In Real Life)</a>');
    expect(html).not.toMatch(/eventcarpooling|carpool/i);
    expect(html).not.toMatch(/eventcarpooling-logo\.(?:svg|png)/i);
  });

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

  it("orders Austin newsletter events chronologically, not by subscriber distance", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      weekOf: "2026-11-01",
      events: [
        {
          title: "Later but closer",
          date: "Wednesday, Nov 4 at 7:00 PM",
          venue: "Near venue",
          description: "Later event.",
          category: "Community",
          distanceMi: 0.2,
        },
        {
          title: "Earlier but farther",
          date: "Monday, Nov 2 at 1:00 PM",
          venue: "Far venue",
          description: "Earlier event.",
          category: "Community",
          distanceMi: 12,
        },
        {
          title: "Sunday reading service",
          date: "Every Sunday, 11:00 AM–12:00 PM",
          venue: "Austin",
          description: "Weekly service.",
          category: "Community",
          distanceMi: 3,
        },
        {
          title: "Sunday volleyball",
          date: "Sunday, Nov 1 at 12:00 PM",
          venue: "Austin",
          description: "Sunday event.",
          category: "Sports",
          distanceMi: 25,
        },
        {
          title: "Sunday AI build",
          date: "Every Sunday, 1:00–4:00 PM",
          venue: "Austin",
          description: "Weekly build session.",
          category: "Tech",
          distanceMi: 5,
        },
      ],
      alsoNearby: [
        {
          title: "Later nearby event",
          date: "Saturday, Nov 7 at 7:00 PM",
          venue: "Far venue",
          description: "Later nearby event.",
          category: "Community",
          distanceMi: 30,
        },
        {
          title: "Earlier nearby event",
          date: "Thursday, Nov 5 at 6:30 PM",
          venue: "Far venue",
          description: "Earlier nearby event.",
          category: "Community",
          distanceMi: 20,
        },
      ],
    }, null, null, {
      slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null,
    });

    expect(html.indexOf("Sunday reading service")).toBeLessThan(html.indexOf("Sunday volleyball"));
    expect(html.indexOf("Sunday volleyball")).toBeLessThan(html.indexOf("Sunday AI build"));
    expect(html.indexOf("Sunday AI build")).toBeLessThan(html.indexOf("Earlier but farther"));
    expect(html.indexOf("Earlier but farther")).toBeLessThan(html.indexOf("Later but closer"));
    expect(html.indexOf("Earlier nearby event")).toBeLessThan(html.indexOf("Later nearby event"));
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

  it("Osaka digest keeps its teal branding and local AI Ethics reading list", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      siteUrl: "https://osaka.irl.group",
      events: [{
        title: "大阪のイベント",
        date: "Friday, October 30, 2026",
        venue: "Osaka",
        description: "大阪で開催されるイベントです。",
        category: "Tech",
      }],
    }, null, null, {
      slug: "osaka", name: "Osaka Events", city: "Osaka, Japan",
      digestTitle: "Osaka Events",
    });

    expect(html).toContain("#0D7377");
    expect(html).toContain("大阪のイベント");
    expect(html).toContain("Osaka City AI Utilization Basic Policy");
    expect(html).toContain("Osaka City");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("Happy Sunday, Austin");
  });

  it("Manchester digest and welcome emails use Manchester and IRL.group branding", () => {
    const html = buildDigestEmailHtml({
      ...baseDigest,
      subject: "Manchester Events — October 22–31, 2026",
      weekOf: "2026-10-22",
      siteUrl: "https://manchester.irl.group",
      events: [{
        title: "Manchester AI community evening",
        date: "2026-10-29T00:30:00Z",
        venue: "Manchester",
        description: "A local technology meetup.",
        category: "Tech",
      }],
    }, null, null, {
      slug: "manchester", name: "Manchester Events", city: "Manchester, England",
      digestTitle: "Manchester Events",
    });

    expect(html).toContain("October 22 – October 31, 2026");
    expect(html).toContain("#A64B32");
    expect(html).toContain("manchester.irl.group/images/manchester-mark.svg");
    expect(html).toContain("Greater Manchester People’s Panel for AI");
    expect(html).toContain("https://irl.group");
    expect(html).toContain("Thu, Oct 29, 2026 · 12:30 AM");
    expect(html).not.toContain("🤠");
    expect(html).not.toContain("Happy Sunday, Austin");

    const welcome = buildWelcomeEmailHtml("Sam", {
      slug: "manchester", name: "Manchester Events", city: "Manchester, England",
      digestTitle: "Manchester Events",
    }, "sam@example.com");
    expect(welcome).toContain("manchester.irl.group");
    expect(welcome).toContain("Manchester worker bee");
    expect(welcome).toContain("unsubscribe?email=sam%40example.com");
    expect(welcome).toContain("In Real Life");
    expect(welcome).not.toContain("🤠");
  });

  it("translates Japanese-city email events without shifting missing translations", async () => {
    mockOpenAIComplete.mockResolvedValueOnce({
      choices: [{
        message: {
          content: "1. 大阪のイベント\n3. 大阪で開催されます。\n4. 参加方法をご確認ください。",
        },
      }],
    });
    const events = [
      {
        title: "Osaka Event",
        date: "October 30, 2026",
        venue: "Osaka",
        description: "An event in Osaka.",
        category: "Arts",
        link: "https://example.org/event",
      },
      {
        title: "Local Workshop",
        date: "October 31, 2026",
        venue: "Osaka",
        description: "Check registration details.",
        category: "Tech",
      },
    ];

    const translated = await translateEventsForEmail(events);

    expect(mockOpenAIComplete).toHaveBeenCalledOnce();
    expect(translated.map(event => event.title)).toEqual(["大阪のイベント", "Local Workshop"]);
    expect(translated.map(event => event.description)).toEqual([
      "大阪で開催されます。",
      "参加方法をご確認ください。",
    ]);
    expect(translated[0]?.link).toBe("https://example.org/event");
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
      siteUrl: "https://la.irl.group",
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
    expect(html).toContain("tokyo.irl.group");
  });

  it("Osaka welcome email uses Japanese copy, Osaka branding, and Japanese unsubscribe link", () => {
    const html = buildWelcomeEmailHtml(
      null,
      { slug: "osaka", name: "Osaka Events", city: "Osaka, Japan", digestTitle: null },
      "sub@example.com"
    );

    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("🏯");
    expect(html).toContain("大阪のイベントガイドへようこそ");
    expect(html).toContain("#0D7377");
    expect(html).toContain("unsubscribe?email=sub%40example.com&amp;lang=ja");
    expect(html).toContain("osaka.irl.group");
    expect(html).not.toContain("You're officially on the list");
    expect(html).not.toContain("🤠");
  });

  it("sendWelcomeEmail uses the tenant display name as fromName, not Austin default", async () => {
    // mockSendMail is set up via vi.hoisted + vi.mock("nodemailer") above.
    // Titan SMTP settings are set via vi.hoisted so no real SMTP connection is made.
    mockSendMail.mockClear();

    const portlandTenant = { slug: "portland", name: "Portland Events", city: "Portland, OR", digestTitle: null };
    await sendWelcomeEmail("sub@example.com", "Test", portlandTenant);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArg = mockSendMail.mock.calls[0][0] as { from?: string };
    // The "from" field is formatted as "Display Name <addr>" — check display name
    expect(callArg.from).toContain("Portland Events");
    expect(callArg.from).not.toContain("Austin");
    expect(callArg.from).toBe("Portland Events <raj@eventcarpooling.com>");
  });

  it("sendWelcomeEmail uses Osaka's Japanese subject and display name", async () => {
    mockSendMail.mockClear();
    await sendWelcomeEmail("sub@example.com", null, {
      slug: "osaka", name: "Osaka Events", city: "Osaka, Japan", digestTitle: null,
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArg = mockSendMail.mock.calls[0][0] as { subject?: string; from?: string };
    expect(callArg.subject).toContain("登録完了");
    expect(callArg.subject).toContain("🏯");
    expect(callArg.from).toContain("大阪イベント週刊ガイド");
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

describe("Leadership Austin newsletter", () => {
  it("keeps alumni-sourced events on Leadership Austin newsletters only", () => {
    const event = {
      title: "Leadership Austin alumni gathering",
      date: "November 7, 2026",
      venue: "Austin, TX",
      description: "A get-together shared by alumni.",
      link: "https://example.com/alumni-gathering",
      category: "Community",
      sourceAlumni: "Amy Stansbury",
      managedEventId: 42,
      lat: 30.311664,
      lng: -97.6902159,
    };
    const digest = {
      ...baseDigest,
      subject: "Upcoming Events",
      alumniSourcedEvents: [event],
    };

    const austinHtml = buildDigestEmailHtml(
      { ...digest, siteUrl: "https://austin.irl.group" },
      "Preview Reader",
      "reader@example.com",
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX" },
    );
    const leadershipAustinHtml = buildDigestEmailHtml(
      { ...digest, siteUrl: "https://leadershipaustin.irl.group" },
      "Preview Reader",
      "reader@example.com",
      { slug: "leadershipaustin", name: "Leadership Austin", city: "Austin, TX" },
    );

    expect(austinHtml).not.toContain(event.title);
    expect(austinHtml).not.toContain("Upcoming community events");
    expect(austinHtml).toContain("Austin Cares");
    expect(leadershipAustinHtml).toContain(event.title);
    expect(leadershipAustinHtml).toContain("Upcoming community events");
    expect(leadershipAustinHtml).toContain("✨ Interested?");
    expect(leadershipAustinHtml).toContain("https://leadershipaustin.irl.group/rsvp?m=42");
    expect(leadershipAustinHtml).toContain("Alumni and community event locations in Austin");
    expect(leadershipAustinHtml).toContain("30.311664%2C-97.6902159%2Cblue");
    expect(leadershipAustinHtml).toContain("Only verified venue locations are pinned");
    expect(leadershipAustinHtml).toContain("Open Leadership Austin site");
    expect(austinHtml).not.toContain("Alumni and community event locations in Austin");
    expect(leadershipAustinHtml).not.toContain("Austin Cares");
    expect(leadershipAustinHtml).not.toContain("Two new features");
  });

  it("uses alumni branding, keeps event dates, and hides the edition date", () => {
    const html = buildDigestEmailHtml(
      {
        subject: "Leadership Austin — Upcoming Events",
        intro: "Alumni Happenings, local stories, and community partners.",
        weekOf: "2026-11-08",
        siteUrl: "https://leadershipaustin.irl.group",
        events: [
          {
            title: "Difficult Talks: Foundation for Courageous Communication",
            date: "Monday, November 16, 9:00–11:00 AM CT",
            venue: "",
            description: "An expert-led workshop. Open to the community; tuition is $295.",
            link: "https://leadershipaustin.org/event/difficult-talks-foundation-for-courageous-communication-2/",
            category: "Programs",
            isAlumniHappening: true,
            alumniHappeningType: "event",
          },
          {
            title: "Alumni Holiday Party: Wrapped in Community",
            date: "Thursday, December 3, 6:00–9:00 PM CT",
            venue: "KMFA Studio, 41 Navasota Street, Austin, TX 78702",
            description: "A holiday gathering for Leadership Austin alumni and their guests. Plus-ones are welcome.",
            link: "https://leadershipaustin.org/event/alumni-holiday-party/",
            category: "Programs",
            isAlumniHappening: true,
            alumniHappeningType: "event",
          },
        {
          title: "Annual Giving Campaign",
          date: "",
          venue: "",
          description: "Leadership Austin’s annual campaign supports connected, engaged leaders who strengthen our community.",
          link: "https://us.list-manage.com/15OL0q6eXwH?e=9e59768ab0&c2id=b7fc352d4fc12ee0142dd47245ce6312",
          linkText: "Give to the Annual Campaign",
          category: "Alumni News",
          isAlumniHappening: true,
          alumniHappeningType: "news",
        },
        {
          title: "Two New LeaderLab Cohorts!",
          date: "",
          venue: "",
          description: "HR and Social Impact leaders launched new executive peer circles at their Opening Retreat.",
          link: "https://us.list-manage.com/ug9pZDQC7Zl?e=9e59768ab0&c2id=b7fc352d4fc12ee0142dd47245ce6312",
          linkText: "Learn more",
          category: "Alumni News",
          isAlumniHappening: true,
          alumniHappeningType: "news",
        },
        {
          title: "Join Vision Council",
          date: "",
          venue: "",
          description: "Engaged alumni can help shape Leadership Austin’s future.",
          link: "https://us.list-manage.com/18mu6xbCKzw?e=9e59768ab0&c2id=b7fc352d4fc12ee0142dd47245ce6312",
          linkText: "Learn More",
          category: "Alumni News",
          isAlumniHappening: true,
          alumniHappeningType: "news",
        },
          {
            title: "Ascension Seton",
            date: "",
            venue: "",
            description: "Proud sponsor of Leadership Austin.",
            link: "https://healthcare.ascension.org/",
            category: "Business Spotlight",
            isBusinessSpotlight: true,
          },
          {
            title: "The Austin Common",
            date: "",
            venue: "",
            description: "Amy Stansbury is a Leadership Austin alum.",
            link: "https://theaustincommon.com/",
            category: "Community",
            isPost: true,
          },
        ],
      },
      null,
      null,
      { slug: "leadershipaustin", name: "Leadership Austin", city: "Austin, TX", digestTitle: "Leadership Austin" },
    );

    expect(html).toContain("#314363");
    expect(html).toContain("#4EBEE7");
    expect(html).toContain("Barlow Condensed");
    expect(html).toContain("Figtree");
    expect(html).toContain("Lead with Purpose");
    expect(html).toContain("Alumni Happenings");
    expect(html).toContain("<ul style=");
    expect(html).toContain("Give to the Annual Campaign");
    expect(html).toContain("Two New LeaderLab Cohorts!");
    expect(html).toContain("Join Vision Council");
    expect(html).toContain("Difficult Talks: Foundation for Courageous Communication");
    expect(html).toContain("Monday, November 16, 9:00–11:00 AM CT");
    expect(html).toContain("Thursday, December 3, 6:00–9:00 PM CT");
    expect(html).toContain("KMFA Studio, 41 Navasota Street, Austin, TX 78702");
    expect(html).toContain("Hey, all alumni. We created this space to stay connected with our Emerge Class 18 community and share upcoming events.");
    expect(html).toContain('<strong style="font-weight:800;">Alexandria</strong> Robertson');
    expect(html).toContain("Class Rep");
    expect(html).toContain("LA Emerge 18-2025");
    expect(html).not.toContain("Alexandra Robertson");
    expect(html).toContain("Ascension Seton");
    expect(html).toContain("The Austin Common");
    expect(html).not.toContain("Week of November 8");
    expect(html).not.toContain(">Beta<");
    expect(html).not.toContain("AI Ethics");
    expect(html.match(/Difficult Talks: Foundation for Courageous Communication/g)).toHaveLength(1);
  });

  it("formats the subject as upcoming events without an edition date", () => {
    expect(formatCityNewsletterSubject(
      "Leadership Austin — Week of November 8, 2026",
      "leadershipaustin",
      "2026-11-08",
    )).toBe("Leadership Austin — Upcoming Events");
  });
});

describe("managed event interest notifications", () => {
  it("sends interest-only updates with escaped event and participant details", async () => {
    mockSendMail.mockClear();
    await sendManagedEventInterestNotification({
      to: "prior@example.com",
      eventTitle: "Community <Meetup>",
      eventDate: "November 7, 2026",
      eventVenue: "Austin, TX",
      siteName: "Austin Events",
      totalInterested: 2,
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const email = mockSendMail.mock.calls[0][0] as { subject: string; html: string };
    expect(email.subject).toContain("New interest in:");
    expect(email.html).toContain("Someone else is interested");
    expect(email.html).toContain("Community &lt;Meetup&gt;");
    expect(email.html).toContain("2 people are interested");
    expect(email.html).not.toContain("taylor@example.com");
    expect(email.html).not.toContain("carpool");
    expect(email.html).not.toContain("RSVP");
  });

  it("sends group and admin notices using interest language", async () => {
    mockSendMail.mockClear();
    const event = {
      eventTitle: "Alumni gathering",
      eventDate: "November 7, 2026",
      eventVenue: "Austin, TX",
      siteName: "Austin Events",
    };
    await sendManagedEventInterestGroupNotification({
      ...event,
      to: "new@example.com",
      totalInterested: 2,
    });
    await sendManagedEventInterestAdminNotification({
      ...event,
      interestedEmail: "new@example.com",
      interestedName: "New Person",
      totalInterested: 2,
      adminEmail: "admin@example.com",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    const groupEmail = mockSendMail.mock.calls[0][0] as { subject: string; html: string };
    const adminEmail = mockSendMail.mock.calls[1][0] as { subject: string; html: string };
    expect(groupEmail.subject).toContain("Others interested in:");
    expect(groupEmail.html).toContain("Others are interested too");
    expect(groupEmail.html).toContain("2 people have marked interest");
    expect(groupEmail.html).not.toContain("jordan@example.com");
    expect(adminEmail.subject).toContain("New event interest:");
    expect(adminEmail.html).toContain("Total people interested: <strong>2</strong>");
    expect(groupEmail.html + adminEmail.html).not.toContain("carpool");
  });
});
