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

  it("Austin digest header gradient uses the dark-stone Austin palette", () => {
    const html = buildDigestEmailHtml(
      baseDigest,
      null,
      null,
      { slug: "austin", name: "Raj's Austin Events", city: "Austin, TX", digestTitle: null }
    );
    expect(html).toContain("#1c1917");       // dark-stone gradient start
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
