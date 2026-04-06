import nodemailer from "nodemailer";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "newsletter@rajsaustinevents.com";
const FROM_NAME = process.env.FROM_NAME || "Raj's Austin Events";
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Prefer Resend if configured; otherwise fall back to Gmail SMTP
  if (RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          reply_to: options.replyTo,
        }),
      });

      const data = await response.json() as { id?: string; message?: string };

      if (!response.ok) {
        logger.error({ status: response.status, data }, "Resend API error");
        return { success: false, error: data.message || "Failed to send email" };
      }

      return { success: true, id: data.id };
    } catch (err) {
      logger.error({ err }, "Error sending email via Resend");
      return { success: false, error: "Network error sending email" };
    }
  }

  // Fall back to Gmail SMTP
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    logger.warn("No email provider configured (RESEND_API_KEY or GMAIL_USER/GMAIL_APP_PASSWORD required)");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    await transporter.sendMail({
      from: `${FROM_NAME} <${GMAIL_USER}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    logger.info({ to: options.to }, "Email sent via Gmail SMTP");
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "Error sending email via Gmail SMTP");
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<void> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    logger.warn("Gmail not configured — skipping welcome email");
    return;
  }

  const greeting = name ? `Hey ${name},` : "Hey there,";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Raj's Austin Events!</title>
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:linear-gradient(135deg, #292524 0%, #1c1917 100%); border-radius:16px; padding:32px; margin-bottom:24px; text-align:center;">
      <h1 style="margin:0 0 6px; color:#fbbf24; font-size:26px; font-weight:800; letter-spacing:-0.5px;">🤠 Raj's Austin Events</h1>
      <p style="margin:0; color:#d6d3d1; font-size:14px;">Your weekly guide to what's happening in Austin</p>
    </div>
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:28px; margin-bottom:24px;">
      <p style="margin:0 0 12px; color:#1c1917; font-size:16px; font-weight:600;">${greeting}</p>
      <p style="margin:0 0 16px; color:#44403c; font-size:15px; line-height:1.7;">
        You're officially on the list! Every Sunday you'll get a hand-curated roundup of the best live music, 
        food pop-ups, tech meetups, and hidden gems happening around Austin that week.
      </p>
      <p style="margin:0; color:#44403c; font-size:15px; line-height:1.7;">
        Keep an eye on your inbox — your first digest is on its way this Sunday. 🎉
      </p>
    </div>
    <div style="border-top:1px solid #e7e5e4; padding-top:20px; margin-top:4px; text-align:center;">
      <p style="margin:0; color:#78716c; font-size:13px;">Curated with ❤️ by Raj from Austin, TX</p>
    </div>
  </div>
</body>
</html>
  `;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `${FROM_NAME} <${GMAIL_USER}>`,
      to,
      subject: "You're on the list! 🤠 Raj's Austin Events",
      html,
    });
    logger.info({ to }, "Welcome email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send welcome email");
  }
}

export function buildDigestEmailHtml(digest: {
  subject: string;
  intro: string;
  weekOf: Date | string;
  events: Array<{
    title: string;
    date: string;
    venue: string;
    description: string;
    category: string;
    link?: string | null;
    imageUrl?: string | null;
  }>;
}, subscriberName?: string | null): string {
  const weekDate = new Date(digest.weekOf).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const greeting = subscriberName ? `Hey ${subscriberName},` : "Hey there,";

  const eventCards = digest.events.map(event => `
    <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:20px;">
      <div style="display:inline-block; background:#d97706; color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">${event.category}</div>
      <h3 style="margin:0 0 8px; color:#1c1917; font-size:18px; font-weight:700;">${event.title}</h3>
      <p style="margin:0 0 6px; color:#57534e; font-size:14px;">📅 ${event.date}</p>
      <p style="margin:0 0 12px; color:#57534e; font-size:14px;">📍 ${event.venue}</p>
      <p style="margin:0 0 16px; color:#44403c; font-size:15px; line-height:1.6;">${event.description}</p>
      ${event.link ? `<a href="${event.link}" style="display:inline-block; background:#d97706; color:#fff; padding:8px 18px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Learn More →</a>` : ""}
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${digest.subject}</title>
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #292524 0%, #1c1917 100%); border-radius:16px; padding:32px; margin-bottom:24px; text-align:center;">
      <h1 style="margin:0 0 6px; color:#fbbf24; font-size:26px; font-weight:800; letter-spacing:-0.5px;">🤠 Raj's Austin Events</h1>
      <p style="margin:0; color:#d6d3d1; font-size:14px;">Your weekly guide to what's happening in Austin</p>
      <p style="margin:8px 0 0; color:#a8a29e; font-size:13px;">Week of ${weekDate}</p>
    </div>

    <!-- Intro -->
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px; margin-bottom:24px;">
      <p style="margin:0 0 12px; color:#1c1917; font-size:16px; font-weight:600;">${greeting}</p>
      <p style="margin:0; color:#44403c; font-size:15px; line-height:1.7;">${digest.intro.replace(/\n/g, "<br>")}</p>
    </div>

    <!-- Events -->
    <h2 style="margin:0 0 16px; color:#1c1917; font-size:20px; font-weight:700;">This Week's Picks 🎯</h2>
    ${eventCards}

    <!-- Footer -->
    <div style="border-top:1px solid #e7e5e4; padding-top:20px; margin-top:24px; text-align:center;">
      <p style="margin:0 0 8px; color:#78716c; font-size:13px;">Curated with ❤️ by Raj from Austin, TX</p>
      <p style="margin:0; color:#a8a29e; font-size:12px;">
        You're receiving this because you subscribed at Raj's Austin Events.<br>
        <a href="{{unsubscribe_url}}" style="color:#d97706; text-decoration:none;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>
  `;
}
