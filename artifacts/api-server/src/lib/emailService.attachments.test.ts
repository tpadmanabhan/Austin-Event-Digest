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
  vi.stubEnv("GMAIL_USER", "sender@example.com");
  vi.stubEnv("GMAIL_APP_PASSWORD", "test-only-password");
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

  it("encodes attachments for Resend without adding recipients", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-resend-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "test-message" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await import("./emailService");
    expect(await sendEmail({ ...message, attachments: [attachment] }))
      .toEqual({ success: true, id: "test-message" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual([message.to]);
    expect(body.attachments).toEqual([{
      filename: attachment.filename,
      content: attachment.content.toString("base64"),
    }]);
    expect(body).not.toHaveProperty("cc");
    expect(body).not.toHaveProperty("bcc");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("leaves ordinary email requests unchanged", async () => {
    const { sendEmail } = await import("./emailService");
    expect((await sendEmail(message)).success).toBe(true);
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("attachments");
  });
});