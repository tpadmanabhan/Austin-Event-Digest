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

export function buildWelcomeEmailHtml(name?: string | null): string {
  const greeting = name ? `Hey ${name}! 👋` : "Hey there! 👋";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in! Raj's Austin Events</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1c1917 0%,#292524 60%,#3b1f0a 100%);border-radius:20px;padding:40px 32px 32px;margin-bottom:20px;text-align:center;position:relative;overflow:hidden;">
      <div style="font-size:44px;margin-bottom:8px;line-height:1;">🤠</div>
      <h1 style="margin:0 0 6px;color:#fbbf24;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Raj's Austin Events</h1>
      <p style="margin:0;color:#a8a29e;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;">Weekly Digest · Austin, TX</p>
    </div>

    <!-- Main card -->
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;margin-bottom:16px;">
      <p style="margin:0 0 16px;color:#1c1917;font-size:18px;font-weight:700;">${greeting}</p>
      <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.75;">
        You're officially on the list for Austin's most interesting week-ahead digest. 🎉
      </p>
      <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.75;">
        <strong>Every Monday morning</strong> you'll get a hand-picked roundup of the best things happening in Austin <strong>Monday through Friday</strong> — so you can plan your week before it starts.
      </p>

      <!-- What to expect -->
      <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#1c1917;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What's inside every edition</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#44403c;font-size:14px;">🎸</td>
            <td style="padding:5px 8px;color:#44403c;font-size:14px;">Live music &amp; concerts</td>
            <td style="padding:5px 0;color:#44403c;font-size:14px;">🍽️</td>
            <td style="padding:5px 8px;color:#44403c;font-size:14px;">Food pop-ups &amp; markets</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#44403c;font-size:14px;">💻</td>
            <td style="padding:5px 8px;color:#44403c;font-size:14px;">Tech &amp; startup meetups</td>
            <td style="padding:5px 0;color:#44403c;font-size:14px;">🌱</td>
            <td style="padding:5px 8px;color:#44403c;font-size:14px;">Arts, wellness &amp; community</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="https://austin.eventcarpooling.com" style="display:inline-block;background:#fbbf24;color:#1c1917;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:-0.2px;">Browse this week's events →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 6px;color:#78716c;font-size:13px;">Curated with ❤️ by Raj from Austin, TX</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">You subscribed at austin.eventcarpooling.com — <a href="https://austin.eventcarpooling.com" style="color:#a8a29e;">unsubscribe anytime</a></p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<void> {
  const html = buildWelcomeEmailHtml(name);
  const result = await sendEmail({
    to,
    subject: "You're in! 🤠 Welcome to Raj's Austin Events",
    html,
  });
  if (result.success) {
    logger.info({ to }, "Welcome email sent");
  } else {
    logger.error({ to, error: result.error }, "Failed to send welcome email");
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return escapeHtml(url);
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function buildRsvpUrl(siteUrl: string, digestId: number, eventTitle: string, subscriberEmail: string, subscriberName?: string | null): string {
  const { signRsvpParams } = require("./rsvpToken") as typeof import("./rsvpToken");
  const e = Buffer.from(eventTitle).toString("base64url");
  const em = Buffer.from(subscriberEmail).toString("base64url");
  const n = subscriberName ? `&n=${Buffer.from(subscriberName).toString("base64url")}` : "";
  const sig = signRsvpParams(digestId, eventTitle, subscriberEmail, subscriberName);
  const s = sig ? `&s=${sig}` : "";
  return `${siteUrl}/rsvp?d=${digestId}&e=${e}&em=${em}${n}${s}`;
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
    source?: string | null;
    featured?: boolean | null;
  }>;
  digestId?: number;
  siteUrl?: string;
}, subscriberName?: string | null, subscriberEmail?: string | null): string {
  const weekDate = new Date(digest.weekOf).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const greeting = subscriberName ? `Hey ${escapeHtml(subscriberName)},` : "Hey there,";

  const unsubscribeUrl = digest.siteUrl && subscriberEmail
    ? `${digest.siteUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`
    : null;

  const SOURCE_URLS: Record<string, string> = {
    "Luma": "https://lu.ma",
    "The Austin Business Review": "https://austinbusinessreview.com",
    "Salesforce Trailblazer Community": "https://trailblazercommunitygroups.com",
    "What's Weird ATX": "https://whatsweirdatx.substack.com",
    "Greater Asian Chamber": "https://greaterasianchamber.org",
    "ATX Today": "https://atxtoday.6am.city",
    "Station Austin": "https://stationaustin.org/in-person/",
    "Austin Forum": "https://www.austinforum.org/events",
  };

  const MONTH_IDX: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  function parseSortKey(dateStr: string): number {
    const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (!m) return 9999;
    const month = MONTH_IDX[m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase().substring(0, 2)] ?? 0;
    return month * 100 + parseInt(m[2], 10);
  }

  const buildEventCard = (event: (typeof digest.events)[number], featured = false) => {
    const rsvpLink = digest.digestId && digest.siteUrl && subscriberEmail
      ? buildRsvpUrl(digest.siteUrl, digest.digestId, event.title, subscriberEmail, subscriberName)
      : null;

    const safeLink = safeHref(event.link);

    if (featured) {
      return `
    <div style="border:2px solid #fbbf24; border-radius:16px; overflow:hidden; margin-bottom:28px; background:#fffbeb;">
      <div style="height:4px; background:linear-gradient(90deg,#fbbf24,#fde68a,#fbbf24);"></div>
      <div style="padding:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <div style="display:inline-block; background:#22c55e; color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(event.category)}</div>
          <div style="display:inline-flex; align-items:center; gap:5px; background:#fbbf24; color:#451a03; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">⭐ Special Event</div>
        </div>
        <h3 style="margin:0 0 8px; font-size:19px; font-weight:700;">${safeLink ? `<a href="${safeLink}" style="color:#1c1917; text-decoration:none;">${escapeHtml(event.title)}</a>` : `<span style="color:#1c1917;">${escapeHtml(event.title)}</span>`}</h3>
        <p style="margin:0 0 6px; color:#57534e; font-size:14px;">📅 ${escapeHtml(event.date)}</p>
        <p style="margin:0 0 12px; color:#57534e; font-size:14px;">📍 ${escapeHtml(event.venue)}</p>
        <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.6;">${escapeHtml(event.description)}</p>
        ${event.source ? `<p style="margin:0 0 14px; color:#9ca3af; font-size:12px; font-style:italic;">via ${SOURCE_URLS[event.source] ? `<a href="${escapeHtml(SOURCE_URLS[event.source])}" style="color:#9ca3af; text-decoration:underline;">${escapeHtml(event.source)}</a>` : escapeHtml(event.source)}</p>` : ""}
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          ${safeLink ? `<a href="${safeLink}" style="display:inline-block; background:#d97706; color:#fff; padding:9px 20px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Learn More →</a>` : ""}
          ${rsvpLink ? `<a href="${escapeHtml(rsvpLink)}" style="display:inline-flex; align-items:center; gap:6px; background:#15803d; color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:600;">🚗 I want to carpool!</a>` : ""}
        </div>
      </div>
    </div>
  `;
    }

    return `
    <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:20px;">
      <div style="display:inline-block; background:#22c55e; color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(event.category)}</div>
      <h3 style="margin:0 0 8px; font-size:18px; font-weight:700;">${safeLink ? `<a href="${safeLink}" style="color:#1c1917; text-decoration:none;">${escapeHtml(event.title)}</a>` : `<span style="color:#1c1917;">${escapeHtml(event.title)}</span>`}</h3>
      <p style="margin:0 0 6px; color:#57534e; font-size:14px;">📅 ${escapeHtml(event.date)}</p>
      <p style="margin:0 0 12px; color:#57534e; font-size:14px;">📍 ${escapeHtml(event.venue)}</p>
      <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.6;">${escapeHtml(event.description)}</p>
      ${event.source ? `<p style="margin:0 0 14px; color:#9ca3af; font-size:12px; font-style:italic;">via ${SOURCE_URLS[event.source] ? `<a href="${escapeHtml(SOURCE_URLS[event.source])}" style="color:#9ca3af; text-decoration:underline;">${escapeHtml(event.source)}</a>` : escapeHtml(event.source)}</p>` : ""}
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        ${safeLink ? `<a href="${safeLink}" style="display:inline-block; background:#22c55e; color:#fff; padding:8px 18px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Learn More →</a>` : ""}
        ${rsvpLink ? `<a href="${escapeHtml(rsvpLink)}" style="display:inline-flex; align-items:center; gap:6px; background:#15803d; color:#fff; padding:8px 16px; border-radius:8px; font-size:13px; text-decoration:none; font-weight:600;">🚗 I want to carpool!</a>` : ""}
      </div>
    </div>
  `;
  };

  const featuredEvents = digest.events.filter(e => e.featured);
  const regularEvents = [...digest.events.filter(e => !e.featured)]
    .sort((a, b) => parseSortKey(a.date) - parseSortKey(b.date));

  const featuredCards = featuredEvents.map(e => buildEventCard(e, true)).join("");
  const eventCards = regularEvents.map(e => buildEventCard(e, false)).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(digest.subject)}</title>
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #292524 0%, #1c1917 100%); border-radius:16px; padding:32px; margin-bottom:24px; text-align:center;">
      <h1 style="margin:0 0 6px; font-size:26px; font-weight:800; letter-spacing:-0.5px;">${digest.siteUrl && digest.digestId ? `<a href="${escapeHtml(digest.siteUrl)}/digest/${digest.digestId}" style="color:#fbbf24; text-decoration:none;">🤠 Raj's Austin Events</a>` : `<span style="color:#fbbf24;">🤠 Raj's Austin Events</span>`}</h1>
      <div style="display:inline-flex; align-items:center; gap:6px; margin-bottom:6px;">
        <div style="display:inline-block; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); border-radius:6px; padding:2px 8px;">
          <span style="color:#fff; font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">IRL — In Real Life</span>
        </div>
        <div style="display:inline-block; background:#fbbf24; border-radius:6px; padding:2px 8px;">
          <span style="color:#1c1917; font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">Beta</span>
        </div>
      </div>
      <p style="margin:0; color:#d6d3d1; font-size:14px;">Your weekly guide to what's happening in Austin</p>
      <p style="margin:8px 0 0; color:#a8a29e; font-size:13px;">Week of ${weekDate}</p>
    </div>

    <!-- Intro -->
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px; margin-bottom:16px;">
      <p style="margin:0 0 12px; color:#1c1917; font-size:16px; font-weight:600;">${greeting}</p>
      <p style="margin:0; color:#44403c; font-size:15px; line-height:1.7;">${escapeHtml(digest.intro).replace(/\n/g, "<br>")}</p>
    </div>

    <!-- Coming Soon Teaser -->
    <div style="background:#fef9c3; border:1px solid #fde68a; border-radius:12px; padding:18px 20px; margin-bottom:24px; text-align:center;">
      <p style="margin:0; color:#92400e; font-size:14px; line-height:1.6;">
        <strong>Coming Soon:</strong> Become the events and carpooling person for your city or neighborhood —
        <a href="https://eventcarpooling.com" style="color:#b45309; font-weight:700; text-decoration:underline;">eventcarpooling.com</a>
      </p>
    </div>

    <!-- Featured Event -->
    ${featuredCards ? `<h2 style="margin:0 0 16px; color:#1c1917; font-size:20px; font-weight:700;">⭐ Special Event</h2>${featuredCards}` : ""}

    <!-- Events -->
    <h2 style="margin:0 0 16px; color:#1c1917; font-size:20px; font-weight:700;">This Week's Picks 🎯</h2>
    ${eventCards}

    <!-- Footer -->
    <div style="border-top:1px solid #e7e5e4; padding-top:20px; margin-top:24px; text-align:center;">
      <p style="margin:0 0 6px; color:#78716c; font-size:13px;">Curated with ❤️ by Raj from Austin, TX</p>
      <p style="margin:0 0 16px; color:#a8a29e; font-size:12px;">You're receiving this because you subscribed at Raj's Austin Events.</p>
      ${unsubscribeUrl ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a8a29e; font-size:11px; text-decoration:underline;">Unsubscribe</a></p>` : ""}
    </div>

  </div>
</body>
</html>
  `;
}

const ADMIN_NOTIFY_EMAIL = "AIimplementationclubaustin@gmail.com";

export async function sendNewSubscriberAdminNotification(opts: {
  subscriberEmail: string;
  subscriberName?: string | null;
  isResubscribe?: boolean;
}): Promise<void> {
  const label = opts.isResubscribe ? "Re-subscribed" : "New Subscriber";
  const nameLine = opts.subscriberName ? `<p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Name:</strong> ${opts.subscriberName}</p>` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #292524 0%, #1c1917 100%); border-radius:14px; padding:24px; margin-bottom:20px; text-align:center;">
      <h1 style="margin:0 0 4px; color:#fbbf24; font-size:22px; font-weight:800;">🤠 Raj's Austin Events</h1>
      <p style="margin:0; color:#d6d3d1; font-size:13px;">${label} Alert</p>
    </div>
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px;">
      <p style="margin:0 0 14px; color:#1c1917; font-size:17px; font-weight:700;">📬 ${label}</p>
      ${nameLine}
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Email:</strong> ${opts.subscriberEmail}</p>
      <p style="margin:0; color:#78716c; font-size:13px;">Subscribed via eventcarpooling.com</p>
    </div>
  </div>
</body>
</html>
  `;

  const result = await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `📬 ${label}: ${opts.subscriberEmail}`,
    html,
  });

  if (!result.success) {
    logger.warn({ error: result.error }, "Failed to send new-subscriber admin notification");
  } else {
    logger.info({ subscriberEmail: opts.subscriberEmail }, "Admin notified of new subscriber");
  }
}

export async function sendCarpoolAdminNotification(opts: {
  rsvperEmail: string;
  rsvperName?: string | null;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  totalRsvps: number;
}): Promise<void> {
  const name = opts.rsvperName || opts.rsvperEmail.split("@")[0];
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #166534 0%, #14532d 100%); border-radius:14px; padding:24px; margin-bottom:20px; text-align:center;">
      <h1 style="margin:0 0 4px; color:#bbf7d0; font-size:22px; font-weight:800;">🚗 Carpool RSVP</h1>
      <p style="margin:0; color:#86efac; font-size:13px;">Raj's Austin Events</p>
    </div>
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px;">
      <p style="margin:0 0 14px; color:#1c1917; font-size:17px; font-weight:700;">New Carpool Signup</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Name:</strong> ${name}</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Email:</strong> ${opts.rsvperEmail}</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Event:</strong> ${opts.eventTitle}</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Date:</strong> ${opts.eventDate}</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Venue:</strong> ${opts.eventVenue}</p>
      <p style="margin:0; color:#78716c; font-size:13px;">Total carpool RSVPs for this event: <strong>${opts.totalRsvps}</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const result = await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `🚗 Carpool RSVP: ${name} → ${opts.eventTitle.substring(0, 50)}`,
    html,
  });

  if (!result.success) {
    logger.warn({ error: result.error }, "Failed to send carpool admin notification");
  } else {
    logger.info({ rsvperEmail: opts.rsvperEmail }, "Admin notified of carpool RSVP");
  }
}

export interface RsvpPerson {
  name: string;
  email: string;
}

function buildPersonCards(people: RsvpPerson[]): string {
  return people.map(p => {
    const first = p.name.split(" ")[0];
    return `
      <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:14px; margin-bottom:12px;">
        <p style="margin:0 0 4px; color:#92400e; font-size:14px; font-weight:700;">🚗 ${first}</p>
        <p style="margin:0 0 2px; font-size:15px; font-weight:700; color:#166534;">${p.email}</p>
        <p style="margin:0; font-size:13px; color:#6b7280;"><a href="mailto:${p.email}" style="color:#166534;">${p.email}</a></p>
      </div>`;
  }).join("");
}

// Notify one person about ONE new person joining (used for existing RSVPers when someone new joins)
export async function sendRsvpNotification(opts: {
  to: string;
  rsvperName: string;
  rsvperEmail: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  digestSubject: string;
}): Promise<void> {
  const firstName = opts.rsvperName.split(" ")[0];
  const shortTitle = opts.eventTitle.length > 60 ? opts.eventTitle.substring(0, 60).trimEnd() + "…" : opts.eventTitle;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f0fdf4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #166534 0%, #14532d 100%); border-radius:16px; padding:28px; margin-bottom:20px; text-align:center;">
      <div style="font-size:36px; margin-bottom:8px;">🚗</div>
      <h1 style="margin:0 0 4px; color:#bbf7d0; font-size:20px; font-weight:800;">Carpool Match!</h1>
      <p style="margin:0; color:#86efac; font-size:13px;">Raj's Austin Events</p>
    </div>
    <div style="background:#fff; border:1px solid #bbf7d0; border-radius:12px; padding:24px; margin-bottom:20px;">
      <p style="margin:0 0 16px; color:#14532d; font-size:20px; font-weight:700;">${firstName} also wants to carpool! 🚗</p>
      <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.7;">
        You've got a carpool match! <strong>${firstName}</strong> is also interested in carpooling to:
      </p>
      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:16px; margin-bottom:16px;">
        <p style="margin:0 0 8px; color:#15803d; font-size:16px; font-weight:700;">${opts.eventTitle}</p>
        <p style="margin:0 0 4px; color:#4b5563; font-size:14px;">📅 ${opts.eventDate}</p>
        <p style="margin:0; color:#4b5563; font-size:14px;">📍 ${opts.eventVenue}</p>
      </div>
      ${buildPersonCards([{ name: opts.rsvperName, email: opts.rsvperEmail }])}
      <p style="margin:8px 0 0; color:#374151; font-size:14px; line-height:1.6;">
        Email ${firstName} directly — or just hit <strong>Reply</strong> to this email — to coordinate pickup, timing, or meeting spot. Have fun! 🎉
      </p>
    </div>
    <div style="text-align:center; padding-top:8px;">
      <p style="margin:0; color:#6b7280; font-size:12px;">Raj's Austin Events · Austin, TX</p>
    </div>
  </div>
</body>
</html>
  `;

  const result = await sendEmail({
    to: opts.to,
    subject: `🚗 ${firstName} wants to carpool to: ${shortTitle}`,
    html,
    replyTo: opts.rsvperEmail,
  });

  if (!result.success) {
    logger.warn({ to: opts.to, error: result.error }, "Failed to send RSVP notification");
  }
}

// Notify a new RSVPer about ALL existing carpool matches in one consolidated email
export async function sendRsvpGroupNotification(opts: {
  to: string;
  matches: RsvpPerson[];
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
}): Promise<void> {
  if (opts.matches.length === 0) return;

  const shortTitle = opts.eventTitle.length > 60 ? opts.eventTitle.substring(0, 60).trimEnd() + "…" : opts.eventTitle;
  const count = opts.matches.length;
  const headline = count === 1
    ? `${opts.matches[0].name.split(" ")[0]} wants to carpool! 🚗`
    : `${count} people want to carpool with you! 🚗`;
  const subline = count === 1
    ? `You've got a carpool match for:`
    : `You've got ${count} carpool matches for:`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f0fdf4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #166534 0%, #14532d 100%); border-radius:16px; padding:28px; margin-bottom:20px; text-align:center;">
      <div style="font-size:36px; margin-bottom:8px;">🚗</div>
      <h1 style="margin:0 0 4px; color:#bbf7d0; font-size:20px; font-weight:800;">Carpool Match${count > 1 ? "es" : ""}!</h1>
      <p style="margin:0; color:#86efac; font-size:13px;">Raj's Austin Events</p>
    </div>
    <div style="background:#fff; border:1px solid #bbf7d0; border-radius:12px; padding:24px; margin-bottom:20px;">
      <p style="margin:0 0 16px; color:#14532d; font-size:20px; font-weight:700;">${headline}</p>
      <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.7;">${subline}</p>
      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:16px; margin-bottom:16px;">
        <p style="margin:0 0 8px; color:#15803d; font-size:16px; font-weight:700;">${opts.eventTitle}</p>
        <p style="margin:0 0 4px; color:#4b5563; font-size:14px;">📅 ${opts.eventDate}</p>
        <p style="margin:0; color:#4b5563; font-size:14px;">📍 ${opts.eventVenue}</p>
      </div>
      <p style="margin:0 0 12px; color:#92400e; font-size:13px; font-weight:700;">📬 Reach out to coordinate:</p>
      ${buildPersonCards(opts.matches)}
      <p style="margin:8px 0 0; color:#374151; font-size:14px; line-height:1.6;">
        Email anyone on the list directly to coordinate pickup, timing, or meeting spot. Have fun! 🎉
      </p>
    </div>
    <div style="text-align:center; padding-top:8px;">
      <p style="margin:0; color:#6b7280; font-size:12px;">Raj's Austin Events · Austin, TX</p>
    </div>
  </div>
</body>
</html>
  `;

  const firstReplyTo = opts.matches[0]?.email;
  const result = await sendEmail({
    to: opts.to,
    subject: count === 1
      ? `🚗 ${opts.matches[0].name.split(" ")[0]} wants to carpool to: ${shortTitle}`
      : `🚗 ${count} carpool matches for: ${shortTitle}`,
    html,
    replyTo: firstReplyTo,
  });

  if (!result.success) {
    logger.warn({ to: opts.to, error: result.error }, "Failed to send RSVP group notification");
    throw new Error(result.error || "Failed to send RSVP group notification");
  }
}
