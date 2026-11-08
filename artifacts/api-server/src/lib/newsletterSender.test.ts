import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "test-message" }));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({
  default: { createTransport },
}));
vi.mock("openai", () => ({ default: class OpenAI {} }));
vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.resetModules();
  sendMail.mockClear();
  createTransport.mockClear();
  vi.stubEnv("TITAN_SMTP_HOST", "smtp.titan.email");
  vi.stubEnv("TITAN_SMTP_PORT", "465");
  vi.stubEnv("TITAN_SMTP_USER", "raj@eventcarpooling.com");
  vi.stubEnv("TITAN_SMTP_PASSWORD", "test-only-password");
  vi.stubEnv("GMAIL_USER", "aiimplementationclubaustin@gmail.com");
  vi.stubEnv("FROM_NAME", "Raj's Austin Events");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const edition = {
  to: "subscriber@example.com",
  subject: "This week's edition",
  html: "<p>Newsletter edition</p>",
};

describe("newsletter sender identity", () => {
  it.each(["Raj's Austin Events", "Austin Cares", "Portland Events", "東京イベント"])(
    "uses the newsletter sender and labels %s as No Reply",
    async (fromName) => {
      const { sendNewsletterEmail } = await import("./emailService");
      expect(await sendNewsletterEmail({ ...edition, fromName })).toEqual({ success: true });
      expect(sendMail).toHaveBeenCalledOnce();
      expect(sendMail.mock.calls[0][0]).toMatchObject({
        from: `${fromName} — No Reply <raj@eventcarpooling.com>`,
        to: edition.to,
        subject: `${edition.subject} — Upcoming Events`,
        html: edition.html,
      });
      expect(sendMail.mock.calls[0][0]).not.toHaveProperty("replyTo");
    },
  );

  it("applies the same policy to a single-recipient draft", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({
      ...edition, to: "draft@example.com", fromName: "Austin Cares", tenantSlug: "austincares",
    });
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe("draft@example.com");
    expect(sent.subject).toBe(`${edition.subject} — Upcoming Deals`);
    expect(sent.from).toBe("Austin Cares — No Reply <raj@eventcarpooling.com>");
    expect(sent).not.toHaveProperty("replyTo");
    expect(sent).not.toHaveProperty("cc");
    expect(sent).not.toHaveProperty("bcc");
  });

  it("keeps Austin newsletter subjects date-free when an issue week is supplied", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({
      ...edition,
      subject: "🤠 Austin Upcoming Events",
      tenantSlug: "austin",
      weekOf: "2026-11-01T00:00:00.000Z",
    });
    expect(sendMail.mock.calls[0][0].subject)
      .toBe("🤠 Austin Upcoming Events");
  });

  it("uses the default newsletter name when no city name is supplied", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail(edition);
    expect(sendMail.mock.calls[0][0].from)
      .toBe("Raj's Austin Events — No Reply <raj@eventcarpooling.com>");
    expect(sendMail.mock.calls[0][0].subject).toBe(`${edition.subject} — Upcoming Events`);
  });

  it("does not duplicate an existing generic event label in the subject", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({ ...edition, subject: "upcoming events", tenantSlug: "austin" });
    expect(sendMail.mock.calls[0][0].subject).toBe("Upcoming Events");
  });

  it("uses Titan SMTP and leaves newsletter replies addressed to the From mailbox", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({ ...edition, fromName: "Austin Cares" });
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.titan.email",
      port: 465,
      secure: true,
      auth: { user: "raj@eventcarpooling.com", pass: "test-only-password" },
    });
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: "Austin Cares — No Reply <raj@eventcarpooling.com>",
      to: edition.to,
    });
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it.each([
    ["San Francisco Events — October 12 – October 31, 2026", "sanfrancisco", "San Francisco Events — Upcoming Events"],
    ["🌲 Portland Events — Week of October 12–18, 2026", "portland", "🌲 Portland Events — Upcoming Events"],
    ["🍑 Atlanta Events: October 1 to October 10, 2026", "atlanta", "🍑 Atlanta Events — Upcoming Events"],
    ["Austin Events — Week of 10/12/2026 – 10/18/2026", "austin", "Austin Events — Upcoming Events"],
    ["San Francisco Events — Upcoming Events", "sanfrancisco", "San Francisco Events — Upcoming Events"],
    ["🏷️ Austin Cares Weekly Deals — Week of October 12–18, 2026", "austincares", "🏷️ Austin Cares Weekly Deals — Upcoming Deals"],
    ["upcoming events", "austin", "Upcoming Events"],
    ["Austin Upcoming Events: October 25–31, 2026", "austin", "Austin Upcoming Events"],
    ["upcoming deals", "austincares", "Upcoming Deals"],
  ])("removes the date range from city newsletter subjects", async (subject, tenantSlug, expected) => {
    const { formatCityNewsletterSubject } = await import("./emailService");
    expect(formatCityNewsletterSubject(subject, tenantSlug)).toBe(expected);
  });

  it("leaves transactional email sender names and participant reply targets unchanged", async () => {
    const { sendEmail } = await import("./emailService");
    await sendEmail({
      ...edition, fromName: "Carpool Organizer", replyTo: "participant@example.com",
    });
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: "Carpool Organizer <raj@eventcarpooling.com>",
      replyTo: "participant@example.com",
    });
  });

  it("fails closed instead of falling back to the Gmail sender when Titan is unconfigured", async () => {
    vi.stubEnv("TITAN_SMTP_PASSWORD", "");
    const { sendEmail } = await import("./emailService");
    await expect(sendEmail(edition)).resolves.toMatchObject({
      success: false,
      error: "Titan SMTP is not configured",
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
