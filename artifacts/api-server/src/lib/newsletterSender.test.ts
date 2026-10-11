import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "test-message" }));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));
vi.mock("openai", () => ({ default: class OpenAI {} }));
vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.resetModules();
  sendMail.mockClear();
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("GMAIL_USER", "aiimplementationclubaustin@gmail.com");
  vi.stubEnv("GMAIL_APP_PASSWORD", "test-only-password");
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
    "keeps the Gmail mailbox and labels %s as No Reply",
    async (fromName) => {
      const { sendNewsletterEmail } = await import("./emailService");
      expect(await sendNewsletterEmail({ ...edition, fromName })).toEqual({ success: true });
      expect(sendMail).toHaveBeenCalledOnce();
      expect(sendMail.mock.calls[0][0]).toMatchObject({
        from: `${fromName} — No Reply <aiimplementationclubaustin@gmail.com>`,
        replyTo: "raj@customersuccessforgood.com",
        to: edition.to,
        subject: edition.subject,
        html: edition.html,
      });
    },
  );

  it("applies the same policy to a single-recipient draft", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({
      ...edition, to: "draft@example.com", fromName: "Austin Cares",
    });
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe("draft@example.com");
    expect(sent.replyTo).toBe("raj@customersuccessforgood.com");
    expect(sent.from).toContain("Austin Cares — No Reply");
    expect(sent).not.toHaveProperty("cc");
    expect(sent).not.toHaveProperty("bcc");
  });

  it("uses the default newsletter name when no city name is supplied", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail(edition);
    expect(sendMail.mock.calls[0][0].from)
      .toBe("Raj's Austin Events — No Reply <aiimplementationclubaustin@gmail.com>");
  });

  it("preserves newsletter reply routing for the alternate email provider", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("FROM_EMAIL", "verified@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: "test-message" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendNewsletterEmail } = await import("./emailService");
    await sendNewsletterEmail({ ...edition, fromName: "Austin Cares" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Austin Cares — No Reply <verified@example.com>");
    expect(body.reply_to).toBe("raj@customersuccessforgood.com");
    expect(body.to).toEqual([edition.to]);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("leaves transactional email names and participant reply targets unchanged", async () => {
    const { sendEmail } = await import("./emailService");
    await sendEmail({
      ...edition, fromName: "Carpool Organizer", replyTo: "participant@example.com",
    });
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: "Carpool Organizer <aiimplementationclubaustin@gmail.com>",
      replyTo: "participant@example.com",
    });
  });
});
