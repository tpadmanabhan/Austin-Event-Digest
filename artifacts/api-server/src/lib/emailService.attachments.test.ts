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
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const attachment = {
  filename: "summary.html",
  content: Buffer.from("<h1>Summary</h1>"),
  contentType: "text/html",
};
const message = {
  to: "recipient@example.com",
  subject: "Project summary",
  html: "<p>Attached is the summary.</p>",
};

describe("sendEmail attachments", () => {
  it("passes attachment bytes to SMTP with only the requested recipient", async () => {
    const { sendEmail } = await import("./emailService");
    expect(await sendEmail({ ...message, attachments: [attachment] })).toEqual({ success: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe(message.to);
    expect(sent.attachments).toEqual([attachment]);
    expect(sent).not.toHaveProperty("cc");
    expect(sent).not.toHaveProperty("bcc");
  });

  it("preserves a one-off newsletter subject suffix and PDF attachment", async () => {
    const { sendNewsletterEmail } = await import("./emailService");
    const subject = "Leadership Austin — Upcoming Events — Draft with Admin Guide";
    const pdf = {
      filename: "Leadership Austin Admin Guide.pdf",
      content: Buffer.from("%PDF-1.4\n%%EOF\n"),
      contentType: "application/pdf",
    };

    await sendNewsletterEmail({
      to: "recipient@example.com",
      subject,
      html: "<p>Leadership Austin newsletter</p>",
      fromName: "Leadership Austin",
      tenantSlug: "leadershipaustin",
      attachments: [pdf],
    });

    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe("recipient@example.com");
    expect(sent.subject).toBe(subject);
    expect(sent.attachments).toEqual([pdf]);
    expect(sent.from).toBe("Leadership Austin — No Reply <raj@eventcarpooling.com>");
  });

  it("uses the configured Titan SMTP mailbox for outbound sender identity", async () => {
    const { sendEmail } = await import("./emailService");
    await sendEmail(message);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.titan.email",
      port: 465,
      secure: true,
      auth: { user: "raj@eventcarpooling.com", pass: "test-only-password" },
    });
    expect(sendMail.mock.calls[0][0].from).toBe("Raj's Austin Events <raj@eventcarpooling.com>");
  });

  it("leaves ordinary email requests unchanged", async () => {
    const { sendEmail } = await import("./emailService");
    expect((await sendEmail(message)).success).toBe(true);
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("attachments");
  });
});