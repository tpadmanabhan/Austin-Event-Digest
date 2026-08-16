import nodemailer from "nodemailer";
import OpenAI from "openai";
import { logger } from "./logger";
import { isAdultContent } from "./contentFilter";
import { MAP_CENTERS, CITY_LABELS, haversineMiles } from "./cityBounds";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "newsletter@rajsaustinevents.com";
const FROM_NAME = process.env.FROM_NAME || "Raj's Austin Events";
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
  headers?: Record<string, string>;
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
          from: `${options.fromName || FROM_NAME} <${FROM_EMAIL}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          headers: options.headers,
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
      from: `${options.fromName || FROM_NAME} <${GMAIL_USER}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      headers: options.headers,
    });

    logger.info({ to: options.to }, "Email sent via Gmail SMTP");
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "Error sending email via Gmail SMTP");
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

export interface WelcomeEmailTenant {
  slug: string;
  name: string;
  city: string;
  digestTitle?: string | null;
  curatorName?: string | null;
}

export function buildWelcomeEmailHtml(name?: string | null, tenant?: WelcomeEmailTenant | null, subscriberEmail?: string | null): string {
  const digestName = tenant?.digestTitle || tenant?.name || "Raj's Austin Events";
  const cityLabel = tenant?.city || "Austin, TX";
  const siteUrl = tenant?.slug ? `https://${tenant.slug}.eventcarpooling.com` : "https://austin.eventcarpooling.com";
  // When a tenant is provided, the DB value is authoritative.
  // null/blank = no attribution line. Only fall back to hardcoded text when
  // no tenant is supplied at all (e.g. internal previews).
  const curatorLine = tenant != null
    ? (tenant.curatorName ? `Curated with ❤️ by ${escapeHtml(tenant.curatorName)}` : "")
    : "Curated with ❤️ by Raj from Austin, TX";
  const unsubUrl = subscriberEmail
    ? `${siteUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`
    : siteUrl;

  // Tokyo: Japanese welcome email
  if (tenant?.slug === "tokyo") {
    const tokyoDigestName = tenant.digestTitle || "東京イベント週刊ダイジェスト";
    const tokyoUnsubUrl = subscriberEmail
      ? `${siteUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}&lang=ja`
      : `${siteUrl}/unsubscribe?lang=ja`;
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登録完了！${escapeHtml(tokyoDigestName)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic','Meiryo',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#030C18 0%,#0A2548 55%,#1B5EA8 100%);border-radius:20px;padding:40px 32px 32px;margin-bottom:20px;text-align:center;position:relative;overflow:hidden;">
      <div style="font-size:44px;margin-bottom:8px;line-height:1;">🗼</div>
      <h1 style="margin:0 0 6px;color:#EBF3FC;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${escapeHtml(tokyoDigestName)}</h1>
      <p style="margin:0;color:#B8D4EF;font-size:14px;letter-spacing:0.5px;">週刊ダイジェスト · 東京</p>
    </div>

    <!-- Main card -->
    <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:16px;padding:32px;margin-bottom:16px;">
      <p style="margin:0 0 16px;color:#1e3a5f;font-size:16px;font-weight:700;">
        東京のイベントダイジェストへようこそ！🎉
      </p>
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.8;">
        メーリングリストへの登録が完了しました。毎週日曜日、AIが東京中のイベント情報をリサーチし、今週の厳選イベントをお届けします。
      </p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8;">
        <strong>毎週日曜日</strong>に、日曜日から土曜日までの一週間分のイベントをまとめてお届けします。週のはじまりに、今週の予定をチェックしましょう。
      </p>

      <!-- What to expect -->
      <div style="background:#EBF3FC;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#0A2548;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">毎号の内容</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;font-size:14px;">🎸</td>
            <td style="padding:5px 8px;color:#374151;font-size:14px;">ライブ・コンサート</td>
            <td style="padding:5px 0;font-size:14px;">🍽️</td>
            <td style="padding:5px 8px;color:#374151;font-size:14px;">グルメ・マーケット</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:14px;">💻</td>
            <td style="padding:5px 8px;color:#374151;font-size:14px;">テック・スタートアップ</td>
            <td style="padding:5px 0;font-size:14px;">🌱</td>
            <td style="padding:5px 8px;color:#374151;font-size:14px;">アート・ウェルネス・地域活動</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#1B5EA8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:-0.2px;">今週のイベントを見る →</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 6px;color:#78716c;font-size:13px;">東京のイベント情報をAIでキュレーション ❤️</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">${escapeHtml("tokyo.eventcarpooling.com")} で登録しました — <a href="${escapeHtml(tokyoUnsubUrl)}" style="color:#a8a29e;">配信停止はこちら</a></p>
    </div>

  </div>
</body>
</html>`;
  }

  // Per-city header theme for the welcome email
  const isAustin = !tenant?.slug || tenant.slug === "austin";
  const welcomeHeaderGradient = isAustin
    ? "linear-gradient(135deg,#1c1917 0%,#292524 60%,#3b1f0a 100%)"
    : "linear-gradient(135deg,#1e293b 0%,#334155 55%,#475569 100%)";
  const welcomeHeaderTitleColor = isAustin ? "#fbbf24" : "#f1f5f9";
  const welcomeHeaderEmoji = isAustin ? "🤠" : "📅";
  const welcomeCtaBg = isAustin ? "#fbbf24" : "#3b82f6";
  const welcomeCtaColor = isAustin ? "#1c1917" : "#ffffff";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in! ${escapeHtml(digestName)}</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:${welcomeHeaderGradient};border-radius:20px;padding:40px 32px 32px;margin-bottom:20px;text-align:center;position:relative;overflow:hidden;">
      <div style="font-size:44px;margin-bottom:8px;line-height:1;">${welcomeHeaderEmoji}</div>
      <h1 style="margin:0 0 6px;color:${welcomeHeaderTitleColor};font-size:28px;font-weight:800;letter-spacing:-0.5px;">${escapeHtml(digestName)}</h1>
      <p style="margin:0;color:#a8a29e;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;">Weekly Digest · ${escapeHtml(cityLabel)}</p>
    </div>

    <!-- Main card -->
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;margin-bottom:16px;">
      <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.75;">
        You're officially on the list for ${escapeHtml(cityLabel)}'s most interesting week-ahead digest. 🎉
      </p>
      <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.75;">
        <strong>Every Sunday</strong> you'll get a hand-picked roundup of the best things happening <strong>Sunday through Saturday</strong> — so you can plan your whole week before it starts.
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
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:${welcomeCtaBg};color:${welcomeCtaColor};font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:-0.2px;">${tenant?.slug === "austincares" ? "Browse this week's deals →" : "Browse this week's events →"}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:4px 0 16px;">
      ${curatorLine ? `<p style="margin:0 0 6px;color:#78716c;font-size:13px;">${curatorLine}</p>` : ""}
      <p style="margin:0;color:#a8a29e;font-size:12px;">You subscribed at ${escapeHtml(tenant?.slug ? `${tenant.slug}.eventcarpooling.com` : "austin.eventcarpooling.com")} — <a href="${escapeHtml(unsubUrl)}" style="color:#a8a29e;">unsubscribe anytime</a></p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name?: string | null, tenant?: WelcomeEmailTenant | null): Promise<void> {
  const html = buildWelcomeEmailHtml(name, tenant, to);
  const digestName = tenant?.digestTitle || tenant?.name || "Raj's Austin Events";
  const isTokyoTenant = tenant?.slug === "tokyo";
  const isAustinTenant = !tenant?.slug || tenant.slug === "austin";
  const subject = isTokyoTenant
    ? `登録完了！🗼 ${tenant?.digestTitle || "東京イベント週刊ダイジェスト"}`
    : isAustinTenant
      ? `You're in! 🤠 Welcome to ${digestName}`
      : `You're in! Welcome to ${digestName}`;
  // Use the tenant's digest name as the From display name so recipients see
  // "Portland Events" not "Raj's Austin Events" in their inbox.
  const fromName = isTokyoTenant
    ? (tenant?.digestTitle || "東京イベント週刊ダイジェスト")
    : digestName;
  const result = await sendEmail({
    to,
    subject,
    html,
    fromName,
  });
  if (result.success) {
    logger.info({ to }, "Welcome email sent");
  } else {
    logger.error({ to, error: result.error }, "Failed to send welcome email");
  }
}

// Maps any stored category value to one of the 5 display labels
function normalizeCategory(raw: string): string {
  const c = (raw || "").toLowerCase();
  if (c.includes("tech") || c.includes("business") || c.includes("startup")) return "Tech";
  if (c.includes("wellness") || c.includes("meditation") || c.includes("yoga") || c.includes("mindfulness") || c.includes("pilates")) return "Wellness";
  if (c.includes("sport") || c.includes("fitness") || c.includes("outdoor")) return "Sports";
  if (c.includes("civic") || c.includes("community") || c.includes("volunteer") || c.includes("nonprofit")) return "Civics";
  return "Arts";
}

// Category badge colors for email
function categoryBadgeStyle(raw: string): string {
  const cat = normalizeCategory(raw);
  const styles: Record<string, string> = {
    Tech:    "background:#6366f1; color:#fff;",
    Arts:    "background:#9c7c4a; color:#fff;",
    Sports:  "background:#f97316; color:#fff;",
    Civics:  "background:#0ea5e9; color:#fff;",
    Wellness:"background:#22c55e; color:#fff;",
  };
  return styles[cat] ?? "background:#6b7280; color:#fff;";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Decode HTML entities in a URL before re-escaping, so stored &amp; doesn't double-encode. */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const clean = decodeHtmlEntities(url);
    const parsed = new URL(clean);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return escapeHtml(clean);
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function buildRsvpUrl(siteUrl: string, digestId: number, eventTitle: string, subscriberEmail: string, subscriberName?: string | null, weekOf?: Date | string | null): string {
  const { signRsvpParams, signRsvpParamsByWeek } = require("./rsvpToken") as typeof import("./rsvpToken");
  const e = Buffer.from(eventTitle).toString("base64url");
  const em = Buffer.from(subscriberEmail).toString("base64url");
  const n = subscriberName ? `&n=${Buffer.from(subscriberName).toString("base64url")}` : "";

  // When weekOf is available, use it as the stable digest identifier so that
  // RSVP links work regardless of which environment (dev vs prod) sent the email.
  // Dev and prod have different numeric digest IDs for the same week, but share
  // the same weekOf date. The production RSVP route resolves the week to its own ID.
  if (weekOf) {
    const weekStr = weekOf instanceof Date
      ? weekOf.toISOString().substring(0, 10)
      : String(weekOf).substring(0, 10);
    const sig = signRsvpParamsByWeek(weekStr, eventTitle, subscriberEmail);
    const s = sig ? `&s=${sig}` : "";
    return `${siteUrl}/rsvp?w=${encodeURIComponent(weekStr)}&e=${e}&em=${em}${n}${s}`;
  }

  // Legacy: numeric digest ID (used when weekOf is unavailable)
  const sig = signRsvpParams(digestId, eventTitle, subscriberEmail, subscriberName);
  const s = sig ? `&s=${sig}` : "";
  return `${siteUrl}/rsvp?d=${digestId}&e=${e}&em=${em}${n}${s}`;
}

type DigestEventItem = {
  title: string;
  date: string;
  venue: string;
  description: string;
  category: string;
  link?: string | null;
  imageUrl?: string | null;
  source?: string | null;
  featured?: boolean | null;
  isBusinessSpotlight?: boolean | null;
  isPost?: boolean | null;
  deadline?: string | null;
  distanceMi?: number | null;
  lat?: number | null;
  lng?: number | null;
};

function buildStaticMapSection(
  events: DigestEventItem[],
  slug: string | undefined,
  siteUrl: string | undefined,
  digestId: number | undefined
): string {
  if (!slug || !(slug in MAP_CENTERS)) return "";

  const center = MAP_CENTERS[slug];
  const MAX_MAP_RADIUS_MILES = 150;

  const geocoded = events.filter(
    (e) =>
      e.lat != null && e.lng != null &&
      !e.isPost && !e.isBusinessSpotlight &&
      haversineMiles(center.lat, center.lng, e.lat!, e.lng!) <= MAX_MAP_RADIUS_MILES
  );
  if (geocoded.length === 0) return "";

  // Self-hosted tile-stitcher — served from our own domain so email clients never block it
  const baseUrl = siteUrl ?? "https://austin.eventcarpooling.com";
  const markers = geocoded.slice(0, 12);
  const markerParam = markers
    .map((e) => `${e.lat},${e.lng},${e.featured ? "yellow" : "blue"}`)
    .join("|");
  const mapUrl = `${baseUrl}/api/map-image?center=${center.lat},${center.lng}&zoom=10&size=580x260&markers=${encodeURIComponent(markerParam)}`;

  const cityLabel = CITY_LABELS[slug] ?? slug;
  const linkUrl = siteUrl ? siteUrl : null;

  return `
    <!-- Event Map Preview -->
    <div style="margin-bottom:24px; border-radius:14px; overflow:hidden; border:1px solid #e7e5e4;">
      <div style="background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e7e5e4;">
        <p style="margin:0; font-size:13px; font-weight:700; color:#1c1917;">${slug === "austincares" ? "🗺️ Deal locations in Austin" : `🗺️ This week's event locations in ${cityLabel}`}</p>
      </div>
      ${linkUrl ? `<a href="${escapeHtml(linkUrl)}" style="display:block; line-height:0;">` : ""}
        <img src="${escapeHtml(mapUrl)}" alt="${slug === "austincares" ? "Map of deal locations in Austin" : `Map of this week's events in ${cityLabel}`}" width="580" height="260" style="display:block; width:100%; max-width:580px; height:auto; border:none;" />
      ${linkUrl ? `</a>` : ""}
      ${linkUrl ? `<div style="background:#f8fafc; padding:8px 16px; border-top:1px solid #e7e5e4; text-align:center;"><a href="${escapeHtml(linkUrl)}" style="color:#7c3aed; font-size:12px; font-weight:600; text-decoration:none;">Open interactive map &amp; sort by distance →</a></div>` : ""}
    </div>`;
}

/**
 * Translate event titles + descriptions to Japanese using OpenAI gpt-5-nano.
 * Falls back to originals on any error. Used for Tokyo digest emails.
 */
const _emailOpenAI = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey:  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

/**
 * Translate event titles + descriptions to Japanese using OpenAI gpt-5-nano.
 * Falls back to originals on any error. Used for Tokyo digest emails.
 */
export async function translateEventsForEmail(events: DigestEventItem[]): Promise<DigestEventItem[]> {
  if (!events.length) return events;
  if (!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]) return events;
  try {
    const titles = events.map(e => e.title || "");
    const descs  = events.map(e => e.description || "");
    const all    = [...titles, ...descs];
    const numbered = all.map((t, i) => `${i + 1}. ${t}`).join("\n");

    const completion = await _emailOpenAI.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: "You are a translator. Translate these event titles and descriptions to Japanese. Return ONLY the numbered translations in the same format. Preserve event names, venue names, and proper nouns." },
        { role: "user", content: numbered },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const lines = content.split("\n").filter((l: string) => /^\d+\./.test(l.trim()));
    const translations = lines.map((l: string) => l.replace(/^\d+\.\s*/, "").trim());
    const mid = titles.length;
    return events.map((e, i) => ({
      ...e,
      title:       translations[i]       || e.title,
      description: translations[mid + i] || e.description,
    }));
  } catch {
    return events;
  }
}

export function buildDigestEmailHtml(digest: {
  subject: string;
  intro: string;
  weekOf: Date | string;
  events: DigestEventItem[];
  digestId?: number;
  siteUrl?: string;
  alsoNearby?: DigestEventItem[];
  preferencesUrl?: string | null;
}, subscriberName?: string | null, subscriberEmail?: string | null, tenant?: { slug?: string | null; name?: string | null; city?: string | null; digestTitle?: string | null; curatorName?: string | null }): string {
  const weekDate = new Date(digest.weekOf).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const slug = tenant?.slug;
  const cityName = tenant?.city?.split(",")[0] ?? "Austin";
  const greeting = `Hey ${cityName}!`;
  const theme = slug === "portland" ? {
    headerGradient: "linear-gradient(135deg, #3d0010 0%, #5a0018 55%, #780020 100%)",
    primary: "#CE1141",
    primaryBtn: "#CE1141",
    primaryDark: "#8b0d2a",
    primaryLight: "#fde8ec",
    primaryMuted: "#f9d0d9",
    textOnDark: "#fde8ec",
    textMutedOnDark: "#f5b8c4",
    textStrong: "#ffffff",
    linkColor: "#CE1141",
    cityGuideText: "Your weekly guide to what's happening in Portland",
    digestDisplayName: tenant?.digestTitle || "Portland Events",
    headerEmoji: "🌲",
    eventBtnColor: "#CE1141",
    eventBtnBorder: "#CE1141",
    pillText: "rgba(253,216,224,0.9)",
    pillBorder: "rgba(206,17,65,0.35)",
    rideBtnBg: "#CE1141",
    rideBtnColor: "#fff",
  } : slug === "sacramento" ? {
    headerGradient: "linear-gradient(135deg, #1a0a30 0%, #2d1260 55%, #3d1a80 100%)",
    primary: "#5A2D81",
    primaryBtn: "#5A2D81",
    primaryDark: "#1a0a30",
    primaryLight: "#ede8f5",
    primaryMuted: "#d4c8ea",
    textOnDark: "#ede8f5",
    textMutedOnDark: "#c5b8e0",
    textStrong: "#ffffff",
    linkColor: "#9b72c8",
    curatorName: "Bob",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Sacramento",
    digestDisplayName: tenant?.digestTitle || "Sacramento Events",
    headerEmoji: "👑",
    eventBtnColor: "#5A2D81",
    eventBtnBorder: "#5A2D81",
    pillText: "rgba(237,232,245,0.9)",
    pillBorder: "rgba(90,45,129,0.35)",
    rideBtnBg: "#5A2D81",
    rideBtnColor: "#fff",
  } : slug === "bulverde" ? {
    headerGradient: "linear-gradient(135deg, #1e2d14 0%, #2d4520 55%, #3a5828 100%)",
    primary: "#5c7a3e",
    primaryBtn: "#5c7a3e",
    primaryDark: "#1e2d14",
    primaryLight: "#e8f0dc",
    primaryMuted: "#c8d9b0",
    textOnDark: "#f5f0e8",
    textMutedOnDark: "#c8d9b0",
    textStrong: "#ffffff",
    linkColor: "#5c7a3e",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Bulverde",
    digestDisplayName: tenant?.digestTitle || "Bulverde, TX Events",
    headerEmoji: "🌿",
    eventBtnColor: "#5c7a3e",
    eventBtnBorder: "#5c7a3e",
    pillText: "rgba(245,240,232,0.9)",
    pillBorder: "rgba(92,122,62,0.35)",
    rideBtnBg: "#c8d9b0",
    rideBtnColor: "#1e2d14",
  } : slug === "stlouis" ? {
    headerGradient: "linear-gradient(135deg, #3d000d 0%, #7a0e1a 55%, #C41E3A 100%)",
    primary: "#C41E3A",
    primaryBtn: "#C41E3A",
    primaryDark: "#7a0e1a",
    primaryLight: "#fde8ec",
    primaryMuted: "#f9b8c4",
    textOnDark: "#fde8ec",
    textMutedOnDark: "#f5b8c4",
    textStrong: "#ffffff",
    linkColor: "#C41E3A",
    curatorName: "Phil",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in St. Louis",
    digestDisplayName: tenant?.digestTitle || "Phil's St. Louis Events",
    headerEmoji: "⚾",
    eventBtnColor: "#C41E3A",
    eventBtnBorder: "#C41E3A",
    pillText: "rgba(253,216,224,0.9)",
    pillBorder: "rgba(196,30,58,0.35)",
    rideBtnBg: "#C41E3A",
    rideBtnColor: "#fff",
  } : slug === "tokyo" ? {
    headerGradient: "linear-gradient(135deg, #030C18 0%, #0A2548 55%, #1B5EA8 100%)",
    primary: "#1B5EA8",
    primaryBtn: "#1B5EA8",
    primaryDark: "#0A2548",
    primaryLight: "#EBF3FC",
    primaryMuted: "#B8D4EF",
    textOnDark: "#EBF3FC",
    textMutedOnDark: "#B8D4EF",
    textStrong: "#ffffff",
    linkColor: "#4A90D9",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Tokyo",
    digestDisplayName: tenant?.digestTitle || "Tokyo Events",
    headerEmoji: "🗼",
    eventBtnColor: "#1B5EA8",
    eventBtnBorder: "#1B5EA8",
    pillText: "rgba(235,243,252,0.9)",
    pillBorder: "rgba(27,94,168,0.35)",
    rideBtnBg: "#1B5EA8",
    rideBtnColor: "#fff",
  } : slug === "austincares" ? {
    headerGradient: "linear-gradient(135deg, #0a2e2e 0%, #134040 55%, #1e6e6e 100%)",
    primary: "#1e6e6e",
    primaryBtn: "#1e6e6e",
    primaryDark: "#0a2e2e",
    primaryLight: "#e0f4f4",
    primaryMuted: "#b2e0e0",
    textOnDark: "#e0f4f4",
    textMutedOnDark: "#a0d4d4",
    textStrong: "#ffffff",
    linkColor: "#1e6e6e",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to the best local deals in Austin",
    digestDisplayName: tenant?.digestTitle || "Austin Cares Weekly Deals",
    headerEmoji: "🏷️",
    eventBtnColor: "#1e6e6e",
    eventBtnBorder: "#1e6e6e",
    pillText: "rgba(224,244,244,0.9)",
    pillBorder: "rgba(30,110,110,0.35)",
    rideBtnBg: "#b2e0e0",
    rideBtnColor: "#0a2e2e",
  } : slug === "dc" ? {
    headerGradient: "linear-gradient(135deg, #0a1f4e 0%, #0f2d6b 55%, #1a4a8a 100%)",
    primary: "#1d4ed8",
    primaryBtn: "#1d4ed8",
    primaryDark: "#0a1f4e",
    primaryLight: "#dbeafe",
    primaryMuted: "#bfdbfe",
    textOnDark: "#eff6ff",
    textMutedOnDark: "#bfdbfe",
    textStrong: "#eff6ff",
    linkColor: "#60a5fa",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Washington, DC",
    digestDisplayName: tenant?.digestTitle || "DC Events",
    headerEmoji: "🏛️",
    eventBtnColor: "#3b82f6",
    eventBtnBorder: "#3b82f6",
    pillText: "rgba(219,234,254,0.9)",
    pillBorder: "rgba(59,130,246,0.2)",
    rideBtnBg: "#93c5fd",
    rideBtnColor: "#0a1f4e",
  } : slug === "brushycreek" ? {
    headerGradient: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)",
    primary: "#15803d",
    primaryBtn: "#15803d",
    primaryDark: "#064e3b",
    primaryLight: "#d1fae5",
    primaryMuted: "#a7f3d0",
    textOnDark: "#ecfdf5",
    textMutedOnDark: "#a7f3d0",
    textStrong: "#ecfdf5",
    linkColor: "#15803d",
    curatorName: "Rohan Vivier",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Brushy Creek",
    digestDisplayName: tenant?.digestTitle || "Brushy Creek Events",
    headerEmoji: "🌿",
    eventBtnColor: "#22c55e",
    eventBtnBorder: "#22c55e",
    pillText: "rgba(167,243,208,0.9)",
    pillBorder: "rgba(52,211,153,0.2)",
    rideBtnBg: "#6ee7b7",
    rideBtnColor: "#064e3b",
  } : slug === "austin" ? {
    headerGradient: "linear-gradient(135deg, #1c1917 0%, #292524 60%, #3b1f0a 100%)",
    primary: "#d97706",
    primaryBtn: "#fbbf24",
    primaryDark: "#1c1917",
    primaryLight: "#fef9c3",
    primaryMuted: "#fde68a",
    textOnDark: "#fbbf24",
    textMutedOnDark: "#a8a29e",
    textStrong: "#fbbf24",
    linkColor: "#d97706",
    curatorName: "Raj",
    curatorUrl: "https://customersuccessforgood.com/",
    cityGuideText: "Your weekly guide to what's happening in Austin",
    digestDisplayName: tenant?.digestTitle || "Raj's Austin Events",
    headerEmoji: "🤠",
    eventBtnColor: "#fbbf24",
    eventBtnBorder: "#d97706",
    pillText: "rgba(254,249,195,0.9)",
    pillBorder: "rgba(251,191,36,0.35)",
    rideBtnBg: "#fbbf24",
    rideBtnColor: "#1c1917",
  } : {
    // Generic fallback — no city-specific branding
    headerGradient: "linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)",
    primary: "#3b82f6",
    primaryBtn: "#3b82f6",
    primaryDark: "#1e293b",
    primaryLight: "#eff6ff",
    primaryMuted: "#bfdbfe",
    textOnDark: "#f1f5f9",
    textMutedOnDark: "#cbd5e1",
    textStrong: "#ffffff",
    linkColor: "#60a5fa",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: `Your weekly guide to what's happening in ${tenant?.city?.split(",")[0] || tenant?.name || "your city"}`,
    digestDisplayName: tenant?.digestTitle || tenant?.name || "Weekly Events Digest",
    headerEmoji: "📅",
    eventBtnColor: "#3b82f6",
    eventBtnBorder: "#3b82f6",
    pillText: "rgba(239,246,255,0.9)",
    pillBorder: "rgba(59,130,246,0.35)",
    rideBtnBg: "#93c5fd",
    rideBtnColor: "#1e293b",
  };

  // When a tenant is provided, the DB value is authoritative — always override the
  // hardcoded slug defaults so admins can change or clear the curator without a deploy.
  if (tenant !== undefined) {
    theme.curatorName = tenant.curatorName ?? "";
    theme.curatorUrl = tenant.curatorName === "Raj"
      ? "https://customersuccessforgood.com/"
      : null;
  }

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
    if (!m) return 9999 * 10000;
    const month = MONTH_IDX[m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase().substring(0, 2)] ?? 0;
    const day = parseInt(m[2], 10);
    const timeM = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    let minutes = 0;
    if (timeM) {
      let hour = parseInt(timeM[1], 10);
      const min = parseInt(timeM[2], 10);
      const isPm = timeM[3].toUpperCase() === "PM";
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      minutes = hour * 60 + min;
    }
    return (month * 31 + day) * 1440 + minutes;
  }

  function formatEventDate(dateStr: string): string {
    if (!dateStr) return "Date TBD";
    // Already human-readable — doesn't start with ISO YYYY-MM-DDT
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = d.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
        timeZone: "America/Chicago",
      });
      const [, timePart] = dateStr.split("T");
      const isMidnight = !timePart || timePart.startsWith("00:00");
      if (!isMidnight) {
        const t = d.toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
          timeZone: "America/Chicago",
        });
        return `${datePart} · ${t}`;
      }
      return datePart;
    } catch {
      return dateStr;
    }
  }

  const buildEventCard = (event: (typeof digest.events)[number], featured = false) => {
    const rsvpLink = digest.digestId && digest.siteUrl && subscriberEmail
      ? buildRsvpUrl(digest.siteUrl, digest.digestId, event.title, subscriberEmail, subscriberName, digest.weekOf)
      : null;

    const safeLink = safeHref(event.link);

    if (featured) {
      return `
    <div style="border:2px solid #fbbf24; border-radius:16px; overflow:hidden; margin-bottom:28px; background:#fffbeb;">
      <div style="height:4px; background:linear-gradient(90deg,#fbbf24,#fde68a,#fbbf24);"></div>
      <div style="padding:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <div style="display:inline-block; ${categoryBadgeStyle(event.category)} font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(normalizeCategory(event.category))}</div>
          <div style="display:inline-flex; align-items:center; gap:5px; background:#fbbf24; color:#451a03; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">⭐ Special Event</div>
        </div>
        <h3 style="margin:0 0 8px; font-size:19px; font-weight:700;">${safeLink ? `<a href="${safeLink}" style="color:#1c1917; text-decoration:none;">${escapeHtml(event.title)}</a>` : `<span style="color:#1c1917;">${escapeHtml(event.title)}</span>`}</h3>
        ${formatEventDate(event.date) !== "Date TBD" ? `<p style="margin:0 0 6px; color:#57534e; font-size:14px;">📅 ${formatEventDate(event.date)}</p>` : ""}
        <p style="margin:0 0 12px; color:#57534e; font-size:14px;">📍 ${escapeHtml(event.venue)}${event.distanceMi != null ? ` <span style="color:#9ca3af; font-size:13px;">· ${event.distanceMi} mi</span>` : ""}</p>
        <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.6;">${escapeHtml(event.description)}</p>
        ${event.source ? `<p style="margin:0 0 14px; color:#9ca3af; font-size:12px; font-style:italic;">via ${SOURCE_URLS[event.source] ? `<a href="${escapeHtml(SOURCE_URLS[event.source])}" style="color:#9ca3af; text-decoration:underline;">${escapeHtml(event.source)}</a>` : escapeHtml(event.source)}</p>` : ""}
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          ${safeLink ? `<a href="${safeLink}" style="display:inline-block; background:#d97706; color:#fff; padding:9px 20px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Learn More →</a>` : ""}
          ${rsvpLink ? `<a href="${rsvpLink}" style="display:inline-block; background:#fff; color:#d97706; border:1.5px solid #d97706; padding:9px 20px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">✨ Interested?</a>` : ""}
        </div>
      </div>
    </div>
  `;
    }

    // Resolve imageUrl to absolute — relative paths (e.g. /api/storage/...) don't load in email clients
    const cardRawImg = event.imageUrl ? decodeHtmlEntities(event.imageUrl).trim() : null;
    const cardAbsImg = cardRawImg
      ? ((cardRawImg.startsWith("http://") || cardRawImg.startsWith("https://"))
          ? cardRawImg
          : (cardRawImg.startsWith("/") && digest.siteUrl ? `${digest.siteUrl}${cardRawImg}` : null))
      : null;

    return `
    <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; margin-bottom:20px;">
      ${cardAbsImg ? `<img src="${escapeHtml(cardAbsImg)}" alt="${escapeHtml(event.title)}" style="width:100%; max-height:220px; object-fit:cover; display:block;" />` : ""}
      <div style="padding:20px;">
      <div style="display:inline-block; ${categoryBadgeStyle(event.category)} font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(normalizeCategory(event.category))}</div>
      <h3 style="margin:0 0 8px; font-size:18px; font-weight:700;">${safeLink ? `<a href="${safeLink}" style="color:#1c1917; text-decoration:none;">${escapeHtml(event.title)}</a>` : `<span style="color:#1c1917;">${escapeHtml(event.title)}</span>`}</h3>
      ${formatEventDate(event.date) !== "Date TBD" ? `<p style="margin:0 0 6px; color:#57534e; font-size:14px;">📅 ${formatEventDate(event.date)}</p>` : ""}
      <p style="margin:0 0 12px; color:#57534e; font-size:14px;">📍 ${escapeHtml(event.venue)}${event.distanceMi != null ? ` <span style="color:#9ca3af; font-size:13px;">· ${event.distanceMi} mi</span>` : ""}</p>
      <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.6;">${escapeHtml(event.description)}</p>
      ${event.source ? `<p style="margin:0 0 14px; color:#9ca3af; font-size:12px; font-style:italic;">via ${SOURCE_URLS[event.source] ? `<a href="${escapeHtml(SOURCE_URLS[event.source])}" style="color:#9ca3af; text-decoration:underline;">${escapeHtml(event.source)}</a>` : escapeHtml(event.source)}</p>` : ""}
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        ${safeLink ? `<a href="${safeLink}" style="display:inline-block; background:${theme.eventBtnColor}; color:#fff; padding:8px 18px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">Learn More →</a>` : ""}
        ${rsvpLink ? `<a href="${rsvpLink}" style="display:inline-block; background:#fff; color:${theme.eventBtnBorder}; border:1.5px solid ${theme.eventBtnBorder}; padding:8px 18px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">✨ Interested?</a>` : ""}
      </div>
      </div>
    </div>
  `;
  };

  // Strip adult-content events before building any section of the email
  const cleanDigestEvents = digest.events.filter(
    e => !isAdultContent(e.title ?? "", e.description ?? ""),
  );
  const featuredEvents = cleanDigestEvents.filter(e => e.featured);
  const bizSpotlights = cleanDigestEvents.filter(e => !e.featured && e.isBusinessSpotlight);
  const commSpotlights = cleanDigestEvents.filter(e => !e.featured && e.isPost);
  const regularEventsRaw = [...cleanDigestEvents.filter(e => !e.featured && !e.isBusinessSpotlight && !e.isPost)];
  const hasDistance = regularEventsRaw.some(e => e.distanceMi != null);
  const regularEvents = hasDistance
    ? regularEventsRaw.sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity))
    : regularEventsRaw.sort((a, b) => parseSortKey(a.date) - parseSortKey(b.date));

  const alsoNearby = digest.alsoNearby ?? [];

  const featuredCards = featuredEvents.map(e => buildEventCard(e, true)).join("");
  const eventCards = regularEvents.map(e => buildEventCard(e, false)).join("");
  const alsoNearbyCards = alsoNearby.map(e => buildEventCard(e, false)).join("");

  const buildSpotlightCard = (event: (typeof digest.events)[number], accentColor: string, labelText: string, labelEmoji: string) => {
    const safeLink = safeHref(event.link);
    // Decode then escape directly — same pattern as regular event cards
    const rawImageUrl = event.imageUrl ? decodeHtmlEntities(event.imageUrl).trim() : null;
    const resolvedImageUrl = rawImageUrl
      ? ((rawImageUrl.startsWith("http://") || rawImageUrl.startsWith("https://"))
          ? rawImageUrl
          : (rawImageUrl.startsWith("/") && digest.siteUrl ? `${digest.siteUrl}${rawImageUrl}` : null))
      : null;
    const safeImageUrl = resolvedImageUrl ? escapeHtml(resolvedImageUrl) : null;
    return `
    <div style="border-radius:16px; overflow:hidden; margin-bottom:20px; border:1px solid ${accentColor}33; box-shadow:0 2px 12px rgba(0,0,0,0.07);">
      ${safeImageUrl
        ? `<a href="${safeLink || "#"}" style="display:block; line-height:0;"><img src="${safeImageUrl}" alt="${escapeHtml(event.title)}" width="580" style="width:100%; height:220px; max-height:220px; object-fit:cover; display:block; border:none;" /></a>`
        : `<div style="height:8px; background:${accentColor};"></div>`
      }
      <div style="background:${accentColor}; padding:7px 20px;">
        <span style="color:#fff; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">${labelEmoji} ${labelText}</span>
      </div>
      <div style="padding:20px; background:#fff;">
        <h3 style="margin:0 0 8px; font-size:18px; font-weight:700;">${safeLink ? `<a href="${safeLink}" style="color:#1c1917; text-decoration:none;">${escapeHtml(event.title)}</a>` : `<span style="color:#1c1917;">${escapeHtml(event.title)}</span>`}</h3>
        ${event.description ? `<p style="margin:0 0 14px; color:#44403c; font-size:14px; line-height:1.7;">${escapeHtml(event.description)}</p>` : ""}
        ${event.deadline ? `<p style="margin:0 0 12px; color:#b45309; font-size:13px; font-weight:600;">⏰ Deadline: ${escapeHtml(event.deadline)}</p>` : ""}
        ${safeLink ? `<a href="${safeLink}" style="display:inline-block; background:${accentColor}; color:#fff; padding:9px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:700;">Learn More →</a>` : ""}
      </div>
    </div>
  `;
  };

  const bizSpotlightCards = bizSpotlights.map(e => buildSpotlightCard(e, "#0369a1", "Business Spotlight", "💼")).join("");
  const commSpotlightCards = commSpotlights.map(e => buildSpotlightCard(e, "#15803d", "Community Spotlight", "🙌")).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(digest.subject)}</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    
    <!-- Header -->
    <div style="background:${theme.headerGradient}; border-radius:16px; padding:32px; margin-bottom:24px; text-align:center;">
      <h1 style="margin:0 0 6px; font-size:26px; font-weight:800; letter-spacing:-0.5px;">${digest.siteUrl ? `<a href="${escapeHtml(digest.siteUrl)}" style="color:${theme.textOnDark}; text-decoration:none;">${theme.headerEmoji} ${escapeHtml(theme.digestDisplayName)}</a>` : `<span style="color:${theme.textOnDark};">${theme.headerEmoji} ${escapeHtml(theme.digestDisplayName)}</span>`}</h1>
      <div style="display:inline-flex; align-items:center; gap:6px; margin-bottom:6px;">
        <div style="display:inline-block; background:${theme.primaryBtn}; border-radius:6px; padding:2px 8px;">
          <span style="color:${theme.primaryDark}; font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">Beta</span>
        </div>
      </div>
      <p style="margin:0; color:${theme.textOnDark}; font-size:14px;">${theme.cityGuideText}</p>
      <p style="margin:8px 0 0; color:${theme.textMutedOnDark}; font-size:13px;">Week of ${weekDate}</p>
      ${theme.curatorName ? `<p style="margin:8px 0 0; color:${theme.textMutedOnDark}; font-size:12px; font-style:italic;">Curated by ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.textMutedOnDark}; text-decoration:underline;">${theme.curatorName}</a>` : theme.curatorName}</p>` : ""}
    </div>

    <!-- Intro -->
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px; margin-bottom:16px;">
      <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.7;">${escapeHtml(digest.intro).replace(/\n/g, "<br>")}</p>
      ${theme.curatorName ? `<p style="margin:0; color:#78716c; font-size:14px; font-weight:600;">— ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.linkColor}; text-decoration:none;">${theme.curatorName}</a>` : theme.curatorName}</p>` : ""}
    </div>

    <!-- Location CTA -->
    ${digest.preferencesUrl ? `
    <div style="background:${theme.primaryLight}; border:1.5px solid ${theme.primaryBtn}; border-radius:14px; padding:18px 22px; margin-bottom:24px; text-align:center;">
      <a href="${escapeHtml(digest.preferencesUrl)}" style="color:${theme.primaryDark}; text-decoration:none; font-size:16px; font-weight:700; letter-spacing:-0.2px;">📍 See events near you →</a>
      <p style="margin:6px 0 0; color:#78716c; font-size:13px; line-height:1.5;">Set your neighborhood once — get distance-sorted events every week.</p>
    </div>` : ""}

    <!-- Sort by Distance CTA (Austin + Brushy Creek only) -->
    ${(slug === "austin" || slug === "brushycreek") && digest.siteUrl ? `
    <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:14px; padding:18px 22px; margin-bottom:24px; text-align:center;">
      <a href="${escapeHtml(digest.siteUrl)}" style="display:inline-block; background:#15803d; color:#fff; font-size:15px; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:100px; letter-spacing:-0.2px;">📍 Sort events by distance →</a>
      <p style="margin:10px 0 0; color:#78716c; font-size:13px; line-height:1.5;">Open the full edition and tap <strong>Nearest first</strong> to sort by your location.</p>
    </div>` : ""}

    <!-- AustinCares Deals CTA (AustinCares only) -->
    ${slug === "austincares" ? `
    <div style="background:linear-gradient(135deg,#0a2e2e 0%,#134040 55%,#1e6e6e 100%); border-radius:16px; padding:24px 28px; margin-bottom:24px; text-align:center;">
      <p style="margin:0 0 6px; color:#a0d4d4; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">🏷️ This Week's Deals</p>
      <p style="margin:0 0 10px; color:#ffffff; font-size:19px; font-weight:800; letter-spacing:-0.3px;">Browse the full deals directory</p>
      <p style="margin:0 0 18px; color:#e0f4f4; font-size:13px; line-height:1.6;">See every deal sorted by day — Monday specials, Tuesday discounts, weekend offers — and filter by distance from your spot.</p>
      <a href="https://austincares.eventcarpooling.com/full" style="display:inline-block; background:#C4502B; color:#fff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 32px; border-radius:100px; letter-spacing:-0.1px;">See this week's deals →</a>
    </div>` : ""}

    <!-- AustinCares Launch Promo (all cities except austincares) -->
    ${slug !== "austincares" ? `
    <div style="background:linear-gradient(135deg,#1c0a05 0%,#3b0e07 55%,#5c1a0d 100%); border-radius:16px; padding:26px 28px; margin-bottom:24px; text-align:center;">
      <p style="margin:0 0 6px; color:#fbbf24; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">🏷️ New · Austin Cares</p>
      <p style="margin:0 0 10px; color:#ffffff; font-size:19px; font-weight:800; letter-spacing:-0.3px;">The best local deals, curated every week.</p>
      <p style="margin:0 0 6px; color:#fde68a; font-size:13px; line-height:1.6;">A weekly digest of real, time-boxed discounts — happy hours, Tuesday specials, weekday-only deals — filtered by day and distance. No hunting through Instagram. No expired coupons.</p>
      <p style="margin:0 0 18px; color:#fca5a5; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Coming to a city near you 🌍</p>
      <a href="https://austincares.eventcarpooling.com" style="display:inline-block; background:#C4502B; color:#fff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 32px; border-radius:100px; letter-spacing:-0.1px;">Get Weekly Deals →</a>
    </div>` : ""}

    <!-- Tokyo Launch Highlight (Tokyo only) -->
    ${slug === "tokyo" && digest.siteUrl && digest.digestId ? `
    <div style="background:#fff0f0; border:1.5px solid #dc2626; border-radius:14px; padding:20px 24px; margin-bottom:24px; text-align:center;">
      <p style="margin:0 0 4px; color:#dc2626; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">🗼 Now Live</p>
      <p style="margin:0 0 8px; color:#1c1917; font-size:17px; font-weight:800; letter-spacing:-0.3px;">Tokyo Events is here!</p>
      <p style="margin:0 0 14px; color:#78716c; font-size:13px; line-height:1.6;">Your weekly hand-picked guide to the best live music, food pop-ups, tech meetups, and hidden gems happening across Tokyo. Share with a friend who loves the city!</p>
      <a href="${escapeHtml(digest.siteUrl)}" style="display:inline-block; background:#dc2626; color:#fff; font-size:14px; font-weight:700; text-decoration:none; padding:11px 26px; border-radius:100px; letter-spacing:-0.1px;">View full edition →</a>
    </div>` : ""}

    ${buildStaticMapSection(cleanDigestEvents, slug ?? undefined, digest.siteUrl ?? undefined, digest.digestId)}

    <!-- Business Spotlights -->
    ${bizSpotlightCards}

    <!-- Community Spotlights -->
    ${commSpotlightCards}

    <!-- Featured Events -->
    ${featuredCards}

    <!-- Events -->
    ${eventCards ? `<h2 style="margin:0 0 16px; color:#1c1917; font-size:20px; font-weight:700;">${slug === "austincares" ? "This Week's Deals 🏷️" : "This Week's Picks 🎯"}</h2>${eventCards}` : ""}

    <!-- Also Nearby -->
    ${alsoNearbyCards ? `
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:14px; padding:20px; margin-bottom:24px;">
      <h2 style="margin:0 0 4px; color:#1c1917; font-size:18px; font-weight:700;">📍 Also Nearby</h2>
      <p style="margin:0 0 16px; color:#78716c; font-size:13px;">${slug === "austincares" ? "These deals are a bit further out — but still worth the trip." : "These events are a bit further out — but still in Austin."}</p>
      ${alsoNearbyCards}
    </div>` : ""}

    <!-- Footer -->
    <div style="border-top:1px solid #e7e5e4; padding-top:20px; margin-top:24px; text-align:center;">
      <p style="margin:0 0 6px; color:#78716c; font-size:13px;">${theme.curatorName ? `Curated with ❤️ by ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.linkColor}; text-decoration:none;">${theme.curatorName}</a>` : theme.curatorName}${slug === "portland" ? " from Portland, OR" : slug === "sacramento" ? " from Sacramento, CA" : slug === "bulverde" ? " from Bulverde, TX" : slug === "stlouis" ? " from St. Louis, MO" : slug === "tokyo" ? " from Tokyo, Japan" : " from Austin, TX"}` : slug === "tokyo" ? "Curated with ❤️ from Tokyo, Japan" : `Curated with ❤️ for ${escapeHtml(cityName)}`}</p>
      <p style="margin:0 0 16px; color:#a8a29e; font-size:12px;">You're receiving this because you subscribed at ${escapeHtml(theme.digestDisplayName)}.</p>
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
  adminEmail?: string | null;
  tenantName?: string | null;
}): Promise<void> {
  const label = opts.isResubscribe ? "Re-subscribed" : "New Subscriber";
  const displayName = opts.tenantName || "Raj's Austin Events";
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
      <h1 style="margin:0 0 4px; color:#fbbf24; font-size:22px; font-weight:800;">🤠 ${displayName}</h1>
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
    to: opts.adminEmail || ADMIN_NOTIFY_EMAIL,
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
  adminEmail?: string | null;
  newsletterName?: string | null;
}): Promise<void> {
  const name = opts.rsvperName || opts.rsvperEmail.split("@")[0];
  const newsletterName = opts.newsletterName || "Raj's Austin Events";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #166534 0%, #14532d 100%); border-radius:14px; padding:24px; margin-bottom:20px; text-align:center;">
      <h1 style="margin:0 0 4px; color:#bbf7d0; font-size:22px; font-weight:800;">🚗 Carpool RSVP</h1>
      <p style="margin:0; color:#86efac; font-size:13px;">${newsletterName}</p>
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
    to: opts.adminEmail || ADMIN_NOTIFY_EMAIL,
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
  newsletterName?: string | null;
}): Promise<void> {
  const firstName = opts.rsvperName.split(" ")[0];
  const shortTitle = opts.eventTitle.length > 60 ? opts.eventTitle.substring(0, 60).trimEnd() + "…" : opts.eventTitle;
  const newsletterName = opts.newsletterName || "Raj's Austin Events";

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
      <p style="margin:0; color:#86efac; font-size:13px;">${newsletterName}</p>
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
      <p style="margin:0; color:#6b7280; font-size:12px;">${newsletterName}</p>
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
  newsletterName?: string | null;
}): Promise<void> {
  if (opts.matches.length === 0) return;

  const shortTitle = opts.eventTitle.length > 60 ? opts.eventTitle.substring(0, 60).trimEnd() + "…" : opts.eventTitle;
  const newsletterName = opts.newsletterName || "Raj's Austin Events";
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
      <p style="margin:0; color:#86efac; font-size:13px;">${newsletterName}</p>
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
      <p style="margin:0; color:#6b7280; font-size:12px;">${newsletterName}</p>
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

export async function sendFeatureInterestEmails(email: string): Promise<void> {
  const thankYouHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius:14px; padding:28px; margin-bottom:20px; text-align:center;">
      <p style="margin:0 0 8px; font-size:36px;">🚗</p>
      <h1 style="margin:0 0 4px; color:#e0e7ff; font-size:22px; font-weight:800;">Thanks for your interest!</h1>
      <p style="margin:0; color:#c7d2fe; font-size:13px;">EventCarpooling.com</p>
    </div>
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:28px; margin-bottom:16px;">
      <p style="margin:0 0 16px; color:#1c1917; font-size:17px; font-weight:700;">You're on the list! 🎉</p>
      <p style="margin:0 0 14px; color:#44403c; font-size:15px; line-height:1.6;">
        Thank you for your interest in <strong>EventCarpooling.com</strong> — we're building the easiest way to become the events and carpooling person for your city or neighborhood.
      </p>
      <p style="margin:0 0 14px; color:#44403c; font-size:15px; line-height:1.6;">
        We'll reach out as soon as new features are ready for early access. You'll be among the first to know!
      </p>
      <p style="margin:0; color:#78716c; font-size:13px; line-height:1.5;">
        In the meantime, check out <a href="https://austin.eventcarpooling.com" style="color:#4f46e5; text-decoration:none; font-weight:600;">austin.eventcarpooling.com</a> to see a live example of what we're building.
      </p>
    </div>
    <p style="text-align:center; color:#a8a29e; font-size:12px; margin:0;">EventCarpooling.com</p>
  </div>
</body>
</html>`;

  const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px; margin:0 auto; padding:24px;">
    <div style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius:14px; padding:24px; margin-bottom:20px; text-align:center;">
      <h1 style="margin:0 0 4px; color:#e0e7ff; font-size:22px; font-weight:800;">🔔 New Feature Interest</h1>
      <p style="margin:0; color:#c7d2fe; font-size:13px;">EventCarpooling.com</p>
    </div>
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px;">
      <p style="margin:0 0 14px; color:#1c1917; font-size:17px; font-weight:700;">Someone wants feature updates!</p>
      <p style="margin:0 0 6px; color:#44403c; font-size:15px;"><strong>Email:</strong> ${email}</p>
      <p style="margin:0; color:#78716c; font-size:13px;">Signed up via the feature interest form on austin.eventcarpooling.com</p>
    </div>
  </div>
</body>
</html>`;

  const [thankYouResult, adminResult] = await Promise.all([
    sendEmail({ to: email, subject: "Thanks for your interest in EventCarpooling.com! 🚗", html: thankYouHtml }),
    sendEmail({ to: ADMIN_NOTIFY_EMAIL, subject: `🔔 Feature interest signup: ${email}`, html: adminHtml }),
  ]);

  if (!thankYouResult.success) {
    logger.warn({ email, error: thankYouResult.error }, "Failed to send feature interest thank-you email");
  }
  if (!adminResult.success) {
    logger.warn({ email, error: adminResult.error }, "Failed to send feature interest admin notification");
  }
}
