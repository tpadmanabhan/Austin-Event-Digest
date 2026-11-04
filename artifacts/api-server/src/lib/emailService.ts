import nodemailer from "nodemailer";
import OpenAI from "openai";
import { logger } from "./logger";
import { isAdultContent } from "./contentFilter";
import { MAP_CENTERS, CITY_LABELS, haversineMiles } from "./cityBounds";
import { buildAustinAiEthicsSection } from "./austinAiEthics";
import { buildSanFranciscoAiEthicsSection } from "./sanFranciscoAiEthics";
import { buildSacramentoAiEthicsSection } from "./sacramentoAiEthics";
import { buildMiamiAiEthicsSection } from "./miamiAiEthics";
import { buildBostonAiEthicsSection } from "./bostonAiEthics";
import { buildLaAiEthicsSection } from "./laAiEthics";
import { buildCityAiEthicsSection } from "./cityAiEthics";
import { signManagedEventRsvpParams, signRsvpParams, signRsvpParamsByWeek } from "./rsvpToken";
import { publicTenantUrl } from "./publicUrls";

const FROM_NAME = process.env.FROM_NAME || "Raj's Austin Events";
const NEWSLETTER_FROM_EMAIL = "raj@eventcarpooling.com";
const TITAN_SMTP_HOST = process.env.TITAN_SMTP_HOST?.trim() || "smtp.titan.email";
const TITAN_SMTP_PORT = Number(process.env.TITAN_SMTP_PORT || "465");
const TITAN_SMTP_USER = process.env.TITAN_SMTP_USER?.trim();
const TITAN_SMTP_PASSWORD = process.env.TITAN_SMTP_PASSWORD;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
  fromEmail?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const MONTH_NAME_PATTERN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const NEWSLETTER_DATE_SUFFIX = new RegExp(
  `\\s*(?:[—–-]|:)\\s*(?:week\\s+of\\s*:?[ \\t]*)?(?:${MONTH_NAME_PATTERN}\\.?\\s+\\d{1,2}\\b|\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?\\b|\\d{4}-\\d{2}-\\d{2}\\b).*$`,
  "i",
);

export function formatCityNewsletterSubject(
  subject: string,
  tenantSlug?: string,
  weekOf?: Date | string | null,
): string {
  const label = tenantSlug === "austincares" ? "Upcoming Deals" : "Upcoming Events";
  const trimmed = subject.trim();

  const existingLabel = trimmed.match(/\s+[—–-]\s+Upcoming (?:Events|Deals)\s*$/i);
  const title = existingLabel
    ? trimmed.slice(0, existingLabel.index).trim()
    : trimmed.replace(NEWSLETTER_DATE_SUFFIX, "").trim();
  const alreadyIncludesLabel = tenantSlug === "austincares"
    ? /\bUpcoming Deals\b/i.test(title)
    : /\bUpcoming Events\b/i.test(title);
  const formattedSubject = !trimmed
    ? label
    : alreadyIncludesLabel
      ? title.toLowerCase() === label.toLowerCase() ? label : title
      : `${title || trimmed} — ${label}`;

  if (tenantSlug !== "austin" || !weekOf) return formattedSubject;

  const weekDateString = weekOf instanceof Date
    ? Number.isNaN(weekOf.getTime()) ? "" : weekOf.toISOString().slice(0, 10)
    : String(weekOf).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDateString)) return formattedSubject;

  const weekDate = new Date(`${weekDateString}T12:00:00.000Z`);
  if (
    Number.isNaN(weekDate.getTime()) ||
    weekDate.toISOString().slice(0, 10) !== weekDateString
  ) {
    return formattedSubject;
  }

  const weekLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(weekDate);
  return `${formattedSubject} — Week of ${weekLabel}`;
}

// Edition emails omit Reply-To so responses go to the visible From address.
// Transactional emails can specify their own reply targets.
export async function sendNewsletterEmail(
  options: Omit<SendEmailOptions, "replyTo"> & {
    tenantSlug?: string;
    weekOf?: Date | string | null;
  },
): Promise<SendEmailResult> {
  const { tenantSlug, weekOf, ...emailOptions } = options;
  return sendEmail({
    ...emailOptions,
    subject: formatCityNewsletterSubject(options.subject, tenantSlug, weekOf),
    fromName: `${options.fromName?.trim() || FROM_NAME} — No Reply`,
    fromEmail: NEWSLETTER_FROM_EMAIL,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!TITAN_SMTP_USER || !TITAN_SMTP_PASSWORD) {
    logger.warn("Titan SMTP is not configured (TITAN_SMTP_USER and TITAN_SMTP_PASSWORD are required)");
    return { success: false, error: "Titan SMTP is not configured" };
  }
  if (!Number.isInteger(TITAN_SMTP_PORT) || TITAN_SMTP_PORT < 1 || TITAN_SMTP_PORT > 65535) {
    logger.error({ port: TITAN_SMTP_PORT }, "Invalid Titan SMTP port");
    return { success: false, error: "Titan SMTP port is invalid" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: TITAN_SMTP_HOST,
      port: TITAN_SMTP_PORT,
      secure: TITAN_SMTP_PORT === 465,
      ...(TITAN_SMTP_PORT === 587 ? { requireTLS: true } : {}),
      auth: { user: TITAN_SMTP_USER, pass: TITAN_SMTP_PASSWORD },
    });

    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    await transporter.sendMail({
      from: `${options.fromName || FROM_NAME} <${options.fromEmail || TITAN_SMTP_USER}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      headers: options.headers,
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
    });

    logger.info({ to: options.to }, "Email sent via Titan SMTP");
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "Error sending email via Titan SMTP");
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
  const siteUrl = publicTenantUrl(tenant?.slug || "austin");
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
      <p style="margin:0;color:#a8a29e;font-size:12px;">${escapeHtml("tokyo.irl.group")} で登録しました — <a href="${escapeHtml(tokyoUnsubUrl)}" style="color:#a8a29e;">配信停止はこちら</a></p>
    </div>

  </div>
</body>
</html>`;
  }

  // Osaka follows Tokyo's Japanese-language subscriber welcome flow, with
  // Osaka's own teal branding and tenant-specific unsubscribe URL.
  if (tenant?.slug === "osaka") {
    const osakaDigestName = tenant.digestTitle || "大阪イベント週刊ガイド";
    const osakaUnsubUrl = subscriberEmail
      ? `${siteUrl}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}&lang=ja`
      : `${siteUrl}/unsubscribe?lang=ja`;
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登録完了！${escapeHtml(osakaDigestName)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f7f5;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic','Meiryo',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#10282a 0%,#0D5659 55%,#1B8A83 100%);border-radius:20px;padding:40px 32px 32px;margin-bottom:20px;text-align:center;">
      <div style="font-size:44px;margin-bottom:8px;line-height:1;">🏯</div>
      <h1 style="margin:0 0 6px;color:#eaf7f4;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${escapeHtml(osakaDigestName)}</h1>
      <p style="margin:0;color:#b7ddd6;font-size:14px;letter-spacing:0.5px;">週刊イベントガイド · 大阪</p>
    </div>
    <div style="background:#ffffff;border:1px solid #cce5df;border-radius:16px;padding:32px;margin-bottom:16px;">
      <p style="margin:0 0 16px;color:#10282a;font-size:16px;font-weight:700;">大阪のイベントガイドへようこそ！🎉</p>
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.8;">登録が完了しました。毎週、大阪の街で見つけたイベントを厳選してお届けします。</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8;">音楽やアート、地域の集まり、テックイベントなど、次のお出かけに役立つ情報をお楽しみください。</p>
      <div style="text-align:center;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#0D7377;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">今週のイベントを見る →</a>
      </div>
    </div>
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 6px;color:#78716c;font-size:13px;">大阪の街から、今週のいい予定を。 ❤️</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">osaka.irl.group で登録しました — <a href="${escapeHtml(osakaUnsubUrl)}" style="color:#a8a29e;">配信停止はこちら</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  if (tenant?.slug === "nyc") {
    const firstName = name?.trim() ? escapeHtml(name.trim()) : "there";
    const markUrl = `${siteUrl}/images/nyc-mark.svg`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're subscribed — ${escapeHtml(digestName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1e9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#102b3a 0%,#194b5b 62%,#D65B3B 100%);border-radius:20px;padding:32px 28px;margin-bottom:20px;text-align:center;">
      <img src="${escapeHtml(markUrl)}" alt="New York City mark" width="58" height="58" style="display:block;margin:0 auto 12px;width:58px;height:58px;" />
      <p style="margin:0 0 8px;color:#f4c45b;font-size:11px;font-weight:800;letter-spacing:2px;">IN REAL LIFE</p>
      <h1 style="margin:0;color:#fbf8f1;font-size:26px;font-weight:800;">${escapeHtml(digestName)}</h1>
      <p style="margin:8px 0 0;color:#d5e0df;font-size:14px;">New York City · IRL.group</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5ded1;border-radius:16px;padding:30px;margin-bottom:16px;">
      <p style="margin:0 0 14px;color:#102b3a;font-size:17px;font-weight:700;">You're subscribed, ${firstName}.</p>
      <p style="margin:0 0 14px;color:#44403c;font-size:15px;line-height:1.75;">Your New York City edition brings together worthwhile plans across Tech, Arts, Sports, Civics and Wellness, with events from all five boroughs and links back to organizers.</p>
      <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.75;">Pick a plan, meet people there, and enjoy the city in real life.</p>
      <div style="text-align:center;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#D65B3B;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:100px;">Explore New York City →</a>
      </div>
    </div>
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 8px;color:#78716c;font-size:13px;">Five boroughs. One good plan.</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">Subscribed via <a href="${escapeHtml(siteUrl)}" style="color:#78716c;">nyc.irl.group</a> — <a href="${escapeHtml(unsubUrl)}" style="color:#78716c;">unsubscribe anytime</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  if (tenant?.slug === "manchester") {
    const firstName = name?.trim() ? escapeHtml(name.trim()) : "there";
    const markUrl = `${siteUrl}/images/manchester-mark.svg`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're subscribed — ${escapeHtml(digestName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#17323f 0%,#285265 58%,#A64B32 100%);border-radius:20px;padding:32px 28px;margin-bottom:20px;text-align:center;">
      <img src="${escapeHtml(markUrl)}" alt="Manchester worker bee" width="54" height="54" style="display:block;margin:0 auto 12px;width:54px;height:54px;" />
      <p style="margin:0 0 8px;color:#f4c15d;font-size:11px;font-weight:800;letter-spacing:2px;">IN REAL LIFE</p>
      <h1 style="margin:0;color:#f8f3ea;font-size:26px;font-weight:800;">${escapeHtml(digestName)}</h1>
      <p style="margin:8px 0 0;color:#d8c9b8;font-size:14px;">Manchester, England · IRL.group</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e7ded2;border-radius:16px;padding:30px;margin-bottom:16px;">
      <p style="margin:0 0 14px;color:#17323f;font-size:17px;font-weight:700;">You're subscribed, ${firstName}.</p>
      <p style="margin:0 0 14px;color:#44403c;font-size:15px;line-height:1.75;">Your Manchester edition brings together worthwhile local plans across Tech, Arts, Sports, Civics and Wellness. Each listing links to its organizer so you can check current details before heading out.</p>
      <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.75;">Choose a plan, meet people there, and enjoy the city in real life.</p>
      <div style="text-align:center;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#A64B32;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:100px;">Explore Manchester →</a>
      </div>
    </div>
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 8px;color:#78716c;font-size:13px;">Local plans. Real people. In Real Life.</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">Subscribed via <a href="${escapeHtml(siteUrl)}" style="color:#78716c;">manchester.irl.group</a> — <a href="${escapeHtml(unsubUrl)}" style="color:#78716c;">unsubscribe anytime</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  if (tenant?.slug === "dallas") {
    const firstName = name?.trim() ? escapeHtml(name.trim()) : "there";
    const markUrl = `${siteUrl}/images/dallas-mark.svg`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're subscribed — ${escapeHtml(digestName)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f3e9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#123b43 0%,#174b54 58%,#a94f35 100%);border-radius:20px;padding:32px 28px;margin-bottom:20px;text-align:center;">
      <img src="${escapeHtml(markUrl)}" alt="Dallas skyline mark" width="58" height="58" style="display:block;margin:0 auto 12px;width:58px;height:58px;" />
      <p style="margin:0 0 8px;color:#e6b451;font-size:11px;font-weight:800;letter-spacing:2px;">IN REAL LIFE</p>
      <h1 style="margin:0;color:#f7f3e9;font-size:26px;font-weight:800;">${escapeHtml(digestName)}</h1>
      <p style="margin:8px 0 0;color:#e8d5bb;font-size:14px;">Dallas &amp; North Texas · IRL.group</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e6dfd0;border-radius:16px;padding:30px;margin-bottom:16px;">
      <p style="margin:0 0 14px;color:#123b43;font-size:17px;font-weight:700;">You're subscribed, ${firstName}.</p>
      <p style="margin:0 0 14px;color:#44403c;font-size:15px;line-height:1.75;">Your Dallas edition brings together local plans across Dallas and North Texas, with links to organizers so you can confirm current details.</p>
      <p style="margin:0 0 24px;color:#44403c;font-size:15px;line-height:1.75;">Find something worth showing up for, meet people there, and enjoy the city in real life.</p>
      <div style="text-align:center;">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#a94f35;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:100px;">Explore Dallas →</a>
      </div>
    </div>
    <div style="text-align:center;padding:4px 0 16px;">
      <p style="margin:0 0 8px;color:#78716c;font-size:13px;">Local plans. Real people. In Real Life.</p>
      <p style="margin:0;color:#a8a29e;font-size:12px;">Subscribed via <a href="${escapeHtml(siteUrl)}" style="color:#78716c;">dallas.irl.group</a> — <a href="${escapeHtml(unsubUrl)}" style="color:#78716c;">unsubscribe anytime</a></p>
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
      <p style="margin:0;color:#a8a29e;font-size:12px;">You subscribed at ${escapeHtml(`${tenant?.slug || "austin"}.irl.group`)} — <a href="${escapeHtml(unsubUrl)}" style="color:#a8a29e;">unsubscribe anytime</a></p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name?: string | null, tenant?: WelcomeEmailTenant | null): Promise<void> {
  const html = buildWelcomeEmailHtml(name, tenant, to);
  const digestName = tenant?.digestTitle || tenant?.name || "Raj's Austin Events";
  const isTokyoTenant = tenant?.slug === "tokyo";
  const isOsakaTenant = tenant?.slug === "osaka";
  const isAustinTenant = !tenant?.slug || tenant.slug === "austin";
  const japaneseDigestName = isTokyoTenant
    ? tenant?.digestTitle || "東京イベント週刊ダイジェスト"
    : isOsakaTenant
      ? tenant?.digestTitle || "大阪イベント週刊ガイド"
      : "";
  const subject = isTokyoTenant || isOsakaTenant
    ? `登録完了！${isTokyoTenant ? "🗼" : "🏯"} ${japaneseDigestName}`
    : isAustinTenant
      ? `You're in! 🤠 Welcome to ${digestName}`
      : `You're in! Welcome to ${digestName}`;
  // Use the tenant's digest name as the From display name so recipients see
  // "Portland Events" not "Raj's Austin Events" in their inbox.
  const fromName = isTokyoTenant || isOsakaTenant
    ? japaneseDigestName
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

function buildManagedEventRsvpUrl(
  siteUrl: string,
  tenantSlug: string,
  managedEventId: number,
  eventTitle: string,
  subscriberEmail: string,
  subscriberName?: string | null,
): string {
  const e = Buffer.from(eventTitle).toString("base64url");
  const em = Buffer.from(subscriberEmail).toString("base64url");
  const n = subscriberName ? `&n=${Buffer.from(subscriberName).toString("base64url")}` : "";
  const sig = signManagedEventRsvpParams(tenantSlug, managedEventId, eventTitle, subscriberEmail);
  const s = sig ? `&s=${sig}` : "";
  return `${siteUrl}/rsvp?m=${managedEventId}&e=${e}&em=${em}${n}${s}`;
}

type DigestEventItem = {
  title: string;
  date: string;
  venue: string;
  description: string;
  category: string;
  link?: string | null;
  linkText?: string | null;
  imageUrl?: string | null;
  source?: string | null;
  managedEventId?: number;
  sourceAlumni?: string;
  organizer?: string | null;
  featured?: boolean | null;
  isBusinessSpotlight?: boolean | null;
  isPost?: boolean | null;
  isAlumniHappening?: boolean | null;
  alumniHappeningType?: "event" | "news" | null;
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
  const baseUrl = siteUrl ?? publicTenantUrl("austin");
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
        <p style="margin:0; font-size:13px; font-weight:700; color:#1c1917;">${slug === "austincares" ? "🗺️ Deal locations in Austin" : slug === "leadershipaustin" ? "🗺️ Alumni and community event locations in Austin" : `🗺️ This week's event locations in ${cityLabel}`}</p>
      </div>
      ${linkUrl ? `<a href="${escapeHtml(linkUrl)}" style="display:block; line-height:0;">` : ""}
        <img src="${escapeHtml(mapUrl)}" alt="${slug === "austincares" ? "Map of deal locations in Austin" : slug === "leadershipaustin" ? "Map of alumni and community events in Austin" : `Map of this week's events in ${cityLabel}`}" width="580" height="260" style="display:block; width:100%; max-width:580px; height:auto; border:none;" />
      ${linkUrl ? `</a>` : ""}
      ${linkUrl ? `<div style="background:#f8fafc; padding:8px 16px; border-top:1px solid #e7e5e4; text-align:center;"><a href="${escapeHtml(linkUrl)}" style="color:#7c3aed; font-size:12px; font-weight:600; text-decoration:none;">${slug === "leadershipaustin" ? "Open Leadership Austin site →" : "Open interactive map &amp; sort by distance →"}</a>${slug === "leadershipaustin" ? `<p style="margin:6px 0 0; color:#78716c; font-size:11px;">Only verified venue locations are pinned; other events remain listed without a pin.</p>` : ""}</div>` : ""}
    </div>`;
}

/**
 * Translate event titles + descriptions to Japanese using OpenAI gpt-5-nano.
 * Falls back to originals on any error. Used for Japanese-city digest emails.
 */
const _emailOpenAI = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey:  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

/**
 * Translate event titles + descriptions to Japanese using OpenAI gpt-5-nano.
 * Falls back to originals on any error. Used for Japanese-city digest emails.
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
    const translations: string[] = [];
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^(\d+)\.\s*(.*)$/);
      if (!match) continue;
      const index = Number(match[1]) - 1;
      if (index >= 0 && index < all.length && !translations[index]) {
        translations[index] = match[2].trim();
      }
    }
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
  alumniSourcedEvents?: DigestEventItem[];
  preferencesUrl?: string | null;
}, subscriberName?: string | null, subscriberEmail?: string | null, tenant?: { slug?: string | null; name?: string | null; city?: string | null; digestTitle?: string | null; curatorName?: string | null }): string {
  const weekDate = new Date(digest.weekOf).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const slug = tenant?.slug;
  const editionRangeMatch = slug === "austin" || slug === "atlanta" || slug === "houston" || slug === "sanfrancisco" || slug === "sacramento" || slug === "miami" || slug === "boston" || slug === "la" || slug === "manchester" || slug === "nyc" || slug === "dallas"
    ? digest.subject.match(/\b([A-Za-z]+)\s+(\d{1,2})\s*(?:to|[-–—])\s*(?:([A-Za-z]+)\s+)?(\d{1,2}),\s*(\d{4})\s*$/i)
    : null;
  const editionRange = editionRangeMatch
    ? `${editionRangeMatch[1]} ${editionRangeMatch[2]} – ${editionRangeMatch[3] || editionRangeMatch[1]} ${editionRangeMatch[4]}, ${editionRangeMatch[5]}`
    : null;
  const cityName = tenant?.city?.split(",")[0] ?? "Austin";
  const greeting = slug === "leadershipaustin" ? "Hey alumni!" : `Hey ${cityName}!`;
  const theme = slug === "la" ? {
    headerGradient: "linear-gradient(135deg, #2d1457 0%, #552583 60%, #7541a8 100%)",
    primary: "#552583", primaryBtn: "#FDB927", primaryDark: "#2d1457",
    primaryLight: "#f7f1fc", primaryMuted: "#e6d7f4",
    textOnDark: "#ffffff", textMutedOnDark: "#efe2fb", textStrong: "#2d1457",
    linkColor: "#552583", curatorName: "", curatorUrl: null as string | null,
    cityGuideText: "Your October guide to Los Angeles, from Downtown to the Pacific Coast",
    digestDisplayName: tenant?.digestTitle || "Los Angeles Events", headerEmoji: "",
    eventBtnColor: "#552583", eventBtnBorder: "#552583",
    pillText: "#FDB927", pillBorder: "rgba(253,185,39,0.55)",
    rideBtnBg: "#FDB927", rideBtnColor: "#2d1457",
  } : slug === "boston" ? {
    headerGradient: "linear-gradient(135deg, #142638 0%, #263e50 65%, #3b5363 100%)",
    primary: "#BD3039", primaryBtn: "#BD3039", primaryDark: "#142638",
    primaryLight: "#f7f3ec", primaryMuted: "#e5c4bf",
    textOnDark: "#ffffff", textMutedOnDark: "#e9e1d4", textStrong: "#ffffff",
    linkColor: "#a32530", curatorName: "", curatorUrl: null as string | null,
    cityGuideText: "Your guide to Boston, Cambridge and the Charles River",
    digestDisplayName: tenant?.digestTitle || "Boston Events", headerEmoji: "",
    eventBtnColor: "#142638", eventBtnBorder: "#142638",
    pillText: "#f7f3ec", pillBorder: "rgba(229,196,191,0.45)",
    rideBtnBg: "#e5c4bf", rideBtnColor: "#142638",
  } : slug === "miami" ? {
    headerGradient: "linear-gradient(135deg, #12343a 0%, #0E5560 65%, #277d79 100%)",
    primary: "#E8664A", primaryBtn: "#E8664A", primaryDark: "#0E5560",
    primaryLight: "#edf7f3", primaryMuted: "#8FD3C4",
    textOnDark: "#ffffff", textMutedOnDark: "#d0eee5", textStrong: "#ffffff",
    linkColor: "#0E5560", curatorName: "", curatorUrl: null as string | null,
    cityGuideText: "Your October guide to Miami, Miami Beach and Coral Gables",
    digestDisplayName: tenant?.digestTitle || "Miami Events", headerEmoji: "",
    eventBtnColor: "#0E5560", eventBtnBorder: "#0E5560",
    pillText: "#edf7f3", pillBorder: "rgba(143,211,196,0.45)",
    rideBtnBg: "#8FD3C4", rideBtnColor: "#12343a",
  } : slug === "portland" ? {
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
  } : slug === "nyc" ? {
    headerGradient: "linear-gradient(135deg, #102b3a 0%, #194b5b 58%, #D65B3B 100%)",
    primary: "#D65B3B",
    primaryBtn: "#D65B3B",
    primaryDark: "#102b3a",
    primaryLight: "#f4eee5",
    primaryMuted: "#efc6b8",
    textOnDark: "#fbf8f1",
    textMutedOnDark: "#d5e0df",
    textStrong: "#ffffff",
    linkColor: "#b8472c",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your guide to New York City, across all five boroughs",
    digestDisplayName: tenant?.digestTitle || "New York City Events",
    headerEmoji: "",
    eventBtnColor: "#102b3a",
    eventBtnBorder: "#102b3a",
    pillText: "rgba(251,248,241,0.94)",
    pillBorder: "rgba(244,196,91,0.45)",
    rideBtnBg: "#f4c45b",
    rideBtnColor: "#102b3a",
  } : slug === "dallas" ? {
    headerGradient: "linear-gradient(135deg, #123b43 0%, #174b54 58%, #a94f35 100%)",
    primary: "#a94f35", primaryBtn: "#a94f35", primaryDark: "#123b43",
    primaryLight: "#f7f3e9", primaryMuted: "#e6b451",
    textOnDark: "#f7f3e9", textMutedOnDark: "#e8d5bb", textStrong: "#123b43",
    linkColor: "#174b54", curatorName: "", curatorUrl: null as string | null,
    cityGuideText: "Your October guide to Dallas and North Texas",
    digestDisplayName: tenant?.digestTitle || "Dallas Events", headerEmoji: "",
    eventBtnColor: "#a94f35", eventBtnBorder: "#a94f35",
    pillText: "#f7f3e9", pillBorder: "rgba(230,180,81,0.5)",
    rideBtnBg: "#e6b451", rideBtnColor: "#123b43",
  } : slug === "manchester" ? {
    headerGradient: "linear-gradient(135deg, #17323f 0%, #285265 55%, #A64B32 100%)",
    primary: "#A64B32",
    primaryBtn: "#A64B32",
    primaryDark: "#17323f",
    primaryLight: "#f5e9e1",
    primaryMuted: "#edc4ad",
    textOnDark: "#f8f3ea",
    textMutedOnDark: "#d8c9b8",
    textStrong: "#ffffff",
    linkColor: "#9A432D",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your Manchester guide to the people, ideas and events worth showing up for",
    digestDisplayName: tenant?.digestTitle || "Manchester Events",
    headerEmoji: "",
    eventBtnColor: "#A64B32",
    eventBtnBorder: "#A64B32",
    pillText: "rgba(248,243,234,0.92)",
    pillBorder: "rgba(244,193,93,0.4)",
    rideBtnBg: "#f4c15d",
    rideBtnColor: "#17323f",
  } : slug === "osaka" ? {
    headerGradient: "linear-gradient(135deg, #10282a 0%, #0D5659 55%, #1B8A83 100%)",
    primary: "#0D7377",
    primaryBtn: "#0D7377",
    primaryDark: "#10282a",
    primaryLight: "#e4f3f0",
    primaryMuted: "#b7ddd6",
    textOnDark: "#eaf7f4",
    textMutedOnDark: "#b7ddd6",
    textStrong: "#ffffff",
    linkColor: "#0D7377",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your guide to what's happening in Osaka",
    digestDisplayName: tenant?.digestTitle || "Osaka Events",
    headerEmoji: "",
    eventBtnColor: "#0D7377",
    eventBtnBorder: "#0D7377",
    pillText: "rgba(234,247,244,0.9)",
    pillBorder: "rgba(13,115,119,0.35)",
    rideBtnBg: "#b7ddd6",
    rideBtnColor: "#10282a",
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
  } : slug === "sanfrancisco" ? {
    headerGradient: "linear-gradient(135deg, #102B38 0%, #204658 60%, #326779 100%)",
    primary: "#F15A24",
    primaryBtn: "#F15A24",
    primaryDark: "#102B38",
    primaryLight: "#fff4eb",
    primaryMuted: "#fed7aa",
    textOnDark: "#ffffff",
    textMutedOnDark: "#e0f2f1",
    textStrong: "#ffffff",
    linkColor: "#b83b12",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your guide to upcoming events in San Francisco",
    digestDisplayName: tenant?.digestTitle || "San Francisco Events",
    headerEmoji: "",
    eventBtnColor: "#F15A24",
    eventBtnBorder: "#F15A24",
    pillText: "#fff4eb",
    pillBorder: "rgba(241,90,36,0.4)",
    rideBtnBg: "#fed7aa",
    rideBtnColor: "#102B38",
  } : slug === "houston" ? {
    headerGradient: "linear-gradient(135deg, #001b3d 0%, #002d62 58%, #124b7a 100%)",
    primary: "#EB6E1F",
    primaryBtn: "#EB6E1F",
    primaryDark: "#002d62",
    primaryLight: "#fff1e8",
    primaryMuted: "#ffd1b3",
    textOnDark: "#ffffff",
    textMutedOnDark: "#dbeafe",
    textStrong: "#ffffff",
    linkColor: "#EB6E1F",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Houston",
    digestDisplayName: tenant?.digestTitle || "Houston Events",
    headerEmoji: "⭐",
    eventBtnColor: "#EB6E1F",
    eventBtnBorder: "#EB6E1F",
    pillText: "rgba(255,241,232,0.95)",
    pillBorder: "rgba(235,110,31,0.4)",
    rideBtnBg: "#EB6E1F",
    rideBtnColor: "#002d62",
  } : slug === "atlanta" ? {
    headerGradient: "linear-gradient(135deg, #152238 0%, #253b5a 55%, #3a526f 100%)",
    primary: "#C8102E",
    primaryBtn: "#C8102E",
    primaryDark: "#152238",
    primaryLight: "#fff1f2",
    primaryMuted: "#fecdd3",
    textOnDark: "#fff1f2",
    textMutedOnDark: "#dbeafe",
    textStrong: "#ffffff",
    linkColor: "#C8102E",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Your weekly guide to what's happening in Atlanta",
    digestDisplayName: tenant?.digestTitle || "Atlanta Events",
    headerEmoji: "🍑",
    eventBtnColor: "#C8102E",
    eventBtnBorder: "#C8102E",
    pillText: "rgba(255,241,242,0.95)",
    pillBorder: "rgba(200,16,46,0.35)",
    rideBtnBg: "#fecdd3",
    rideBtnColor: "#152238",
  } : slug === "leadershipaustin" ? {
    headerGradient: "linear-gradient(135deg, #314363 0%, #243551 60%, #4EBEE7 100%)",
    primary: "#314363",
    primaryBtn: "#FFBA01",
    primaryDark: "#314363",
    primaryLight: "#F3F6FA",
    primaryMuted: "#B0DC5F",
    textOnDark: "#ffffff",
    textMutedOnDark: "#e5edf4",
    textStrong: "#314363",
    linkColor: "#314363",
    curatorName: "",
    curatorUrl: null as string | null,
    cityGuideText: "Lead with Purpose",
    digestDisplayName: tenant?.digestTitle || "Leadership Austin",
    headerEmoji: "",
    eventBtnColor: "#314363",
    eventBtnBorder: "#314363",
    pillText: "#ffffff",
    pillBorder: "rgba(78,190,231,0.6)",
    rideBtnBg: "#FFBA01",
    rideBtnColor: "#314363",
  } : slug === "austin" ? {
    headerGradient: "linear-gradient(135deg, #f1faf4 0%, #e4f3e9 58%, #d4eadb 100%)",
    primary: "#2f855a",
    primaryBtn: "#fbbf24",
    primaryDark: "#214e36",
    primaryLight: "#effaf2",
    primaryMuted: "#d6eddd",
    textOnDark: "#285c3f",
    textMutedOnDark: "#65766d",
    textStrong: "#173c2a",
    linkColor: "#2f855a",
    curatorName: "Raj",
    curatorUrl: "https://customersuccessforgood.com/",
    cityGuideText: "Upcoming events",
    digestDisplayName: tenant?.digestTitle || "Raj's Austin Events",
    headerEmoji: "🤠",
    eventBtnColor: "#2f855a",
    eventBtnBorder: "#2f855a",
    pillText: "#285c3f",
    pillBorder: "rgba(47,133,90,0.28)",
    rideBtnBg: "#2f855a",
    rideBtnColor: "#ffffff",
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
    "ATLTech.events": "https://www.atltech.events",
    "Eventbrite": "https://www.eventbrite.com",
    "EventbriteWeb": "https://www.eventbrite.com",
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

  const eventTimezone = slug === "manchester" ? "Europe/London" : slug === "la" || slug === "sanfrancisco" || slug === "sacramento" ? "America/Los_Angeles" : slug === "nyc" || slug === "atlanta" || slug === "miami" || slug === "boston" ? "America/New_York" : "America/Chicago";

  function parseSortKey(dateStr: string): number {
    const weekOfText = digest.weekOf instanceof Date
      ? digest.weekOf.toISOString().slice(0, 10)
      : String(digest.weekOf).slice(0, 10);
    const weekOfMatch = weekOfText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const weekOfDate = weekOfMatch
      ? new Date(Date.UTC(Number(weekOfMatch[1]), Number(weekOfMatch[2]) - 1, Number(weekOfMatch[3])))
      : null;

    const isoTime = Date.parse(dateStr);
    if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(dateStr) && Number.isFinite(isoTime)) return isoTime;

    const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    const recurringWeekday = dateStr.match(/\bEvery\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i);
    if (!m && !recurringWeekday) return Number.MAX_SAFE_INTEGER;

    const rangeTime = dateStr.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const timeM = rangeTime ? null : dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const hourText = rangeTime?.[1] ?? timeM?.[1];
    const minuteText = rangeTime?.[2] ?? timeM?.[2];
    const period = rangeTime?.[5] ?? timeM?.[3];
    let minutes = 0;
    if (hourText && minuteText && period) {
      let hour = parseInt(hourText, 10);
      const min = parseInt(minuteText, 10);
      const isPm = period.toUpperCase() === "PM";
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      minutes = hour * 60 + min;
    }

    if (m) {
      const month = MONTH_IDX[m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase().substring(0, 2)] ?? 0;
      const day = parseInt(m[2], 10);
      const year = weekOfDate?.getUTCFullYear() ?? new Date().getUTCFullYear();
      const eventDate = new Date(Date.UTC(year, month, day, Math.floor(minutes / 60), minutes % 60));
      if (weekOfDate && month < weekOfDate.getUTCMonth() && weekOfDate.getUTCMonth() - month > 6) {
        eventDate.setUTCFullYear(year + 1);
      }
      return eventDate.getTime();
    }

    const weekdayNumbers: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
    };
    if (!weekOfDate || !recurringWeekday) return Number.MAX_SAFE_INTEGER;
    const weekday = weekdayNumbers[recurringWeekday[1][0]!.toUpperCase() + recurringWeekday[1].slice(1).toLowerCase()];
    const dayOffset = (weekday - weekOfDate.getUTCDay() + 7) % 7;
    return Date.UTC(
      weekOfDate.getUTCFullYear(),
      weekOfDate.getUTCMonth(),
      weekOfDate.getUTCDate() + dayOffset,
      Math.floor(minutes / 60),
      minutes % 60,
    );
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
        timeZone: eventTimezone,
      });
      const [, timePart] = dateStr.split("T");
      const isMidnight = !timePart || timePart.startsWith("00:00");
      if (!isMidnight) {
        const t = d.toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
          timeZone: eventTimezone,
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
  const alumniHappenings = slug === "leadershipaustin"
    ? cleanDigestEvents.filter(e => e.isAlumniHappening && (e.alumniHappeningType === "event" || e.alumniHappeningType === "news"))
    : [];
  const alumniEvents = alumniHappenings.filter(e => e.alumniHappeningType === "event");
  const alumniNews = alumniHappenings.filter(e => e.alumniHappeningType === "news");
  const contentEvents = cleanDigestEvents.filter(e => !e.isAlumniHappening);
  const miamiAttendingEvents = slug === "miami"
    ? contentEvents.filter(e => e.featured && e.link === "https://www.miamiopen.com/")
    : [];
  const featuredEvents = contentEvents.filter(e => e.featured && !miamiAttendingEvents.includes(e));
  const bizSpotlights = contentEvents.filter(e => !e.featured && e.isBusinessSpotlight);
  const commSpotlights = contentEvents.filter(e => !e.featured && e.isPost);
  const regularEventsRaw = [...contentEvents.filter(e => !e.featured && !e.isBusinessSpotlight && !e.isPost)];
  // Subscriber location can determine which section an event belongs in, but
  // the newsletter sequence stays chronological for every recipient.
  const regularEvents = regularEventsRaw.sort((a, b) => parseSortKey(a.date) - parseSortKey(b.date));

  const alsoNearby = [...(digest.alsoNearby ?? [])]
    .sort((a, b) => parseSortKey(a.date) - parseSortKey(b.date));

  const featuredCards = featuredEvents.map(e => buildEventCard(e, true)).join("");
  const eventCards = regularEvents.map(e => buildEventCard(e, false)).join("");
  const alsoNearbyCards = alsoNearby.map(e => buildEventCard(e, false)).join("");
  const alumniWelcomeHtml = slug === "leadershipaustin" ? `
    <section style="border-left:4px solid #FFBA01; background:#F3F6FA; border-radius:4px; padding:20px 22px; margin:0 0 24px;">
      <p style="margin:0 0 6px; color:#314363; font-family:'Figtree',Arial,sans-serif; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">A welcome to all alumni</p>
      <h2 style="margin:0 0 10px; color:#314363; font-family:'Barlow Condensed',Arial,sans-serif; font-size:27px; line-height:1.05; text-transform:uppercase;">Stay connected. Share what’s next.</h2>
      <p style="margin:0; color:#475569; font-family:'Figtree',Arial,sans-serif; font-size:14px; line-height:1.7;">Hey, all alumni. We created this space to stay connected with our Emerge Class 18 community and share upcoming events.</p>
      <p style="margin:10px 0 0; color:#314363; font-family:'Figtree',Arial,sans-serif; font-size:13px; font-weight:700;">Alexandra Robertson</p>
     </section>` : "";
  const alumniSourcedEventsHtml = slug === "leadershipaustin" && (digest.alumniSourcedEvents ?? []).length > 0
    ? `<section style="margin:0 0 28px;border:1px solid #314363;border-radius:12px;overflow:hidden;background:#fff;">
        <div style="background:#314363;padding:16px 20px;">
          <p style="margin:0 0 4px;color:#4EBEE7;font-family:'Figtree',Arial,sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Leadership Austin alumni</p>
          <h2 style="margin:0;color:#fff;font-family:'Barlow Condensed',Arial,sans-serif;font-size:26px;line-height:1.05;text-transform:uppercase;">Upcoming community events</h2>
        </div>
        ${(digest.alumniSourcedEvents ?? []).map((event) => {
          const link = safeHref(event.link);
          const rsvpLink = event.managedEventId && digest.siteUrl && subscriberEmail && slug
            ? buildManagedEventRsvpUrl(digest.siteUrl, slug, event.managedEventId, event.title, subscriberEmail, subscriberName)
            : null;
          return `<article style="padding:18px 20px;border-top:1px solid #e2e8f0;background:#fff;">
            <p style="margin:0 0 5px;color:#64748b;font-family:'Figtree',Arial,sans-serif;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;">Shared by ${escapeHtml(event.sourceAlumni || "a Leadership Austin alum")}</p>
            <h3 style="margin:0 0 7px;color:#314363;font-family:'Barlow Condensed',Arial,sans-serif;font-size:21px;line-height:1.1;">${link ? `<a href="${link}" style="color:#314363;text-decoration:none;">${escapeHtml(event.title)}</a>` : escapeHtml(event.title)}</h3>
            ${event.date ? `<p style="margin:0 0 5px;color:#314363;font-family:'Figtree',Arial,sans-serif;font-size:13px;font-weight:700;">${escapeHtml(event.date)}</p>` : ""}
            ${event.venue ? `<p style="margin:0 0 8px;color:#64748b;font-family:'Figtree',Arial,sans-serif;font-size:13px;">${escapeHtml(event.venue)}</p>` : ""}
            ${event.description ? `<p style="margin:0 0 12px;color:#475569;font-family:'Figtree',Arial,sans-serif;font-size:14px;line-height:1.65;">${escapeHtml(event.description)}</p>` : ""}
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              ${link ? `<a href="${link}" style="display:inline-block;color:#314363;font-family:'Figtree',Arial,sans-serif;font-size:12px;font-weight:800;text-decoration:underline;">Event details</a>` : ""}
              ${rsvpLink ? `<a href="${escapeHtml(rsvpLink)}" style="display:inline-block;background:#fff;color:#314363;border:1.5px solid #314363;border-radius:8px;padding:7px 14px;text-decoration:none;font-family:'Figtree',Arial,sans-serif;font-size:12px;font-weight:800;">✨ Interested?</a>` : ""}
            </div>
          </article>`;
        }).join("")}
      </section>`
    : "";
  const alumniHappeningsHtml = alumniHappenings.length > 0 ? `
    <section style="margin:0 0 24px; border-radius:8px; overflow:hidden; border:1px solid #314363;">
      <div style="background:#314363; padding:16px 20px;">
        <p style="margin:0 0 4px; color:#4EBEE7; font-family:'Figtree',Arial,sans-serif; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">Leadership Austin</p>
        <h2 style="margin:0; color:#ffffff; font-family:'Barlow Condensed',Arial,sans-serif; font-size:26px; line-height:1.05; text-transform:uppercase;">Alumni Happenings</h2>
      </div>
      ${alumniEvents.map((event) => {
        const link = safeHref(event.link);
        return `<article style="padding:18px 20px; border-top:1px solid #e2e8f0; background:#ffffff;">
          <p style="margin:0 0 6px; color:#314363; font-family:'Figtree',Arial,sans-serif; font-size:10px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">Alumni event</p>
          <h3 style="margin:0 0 8px; color:#314363; font-family:'Barlow Condensed',Arial,sans-serif; font-size:21px; line-height:1.1;">${link ? `<a href="${link}" style="color:#314363; text-decoration:none;">${escapeHtml(event.title)}</a>` : escapeHtml(event.title)}</h3>
          ${event.date?.trim() ? `<p style="margin:0 0 6px; color:#314363; font-family:'Figtree',Arial,sans-serif; font-size:13px; font-weight:700;">${escapeHtml(event.date)}</p>` : ""}
          ${event.venue?.trim() ? `<p style="margin:0 0 8px; color:#64748b; font-family:'Figtree',Arial,sans-serif; font-size:13px;">${escapeHtml(event.venue)}</p>` : ""}
          ${event.description ? `<p style="margin:0 0 10px; color:#475569; font-family:'Figtree',Arial,sans-serif; font-size:14px; line-height:1.65;">${escapeHtml(event.description)}</p>` : ""}
          ${link ? `<a href="${link}" style="display:inline-block; color:#314363; font-family:'Figtree',Arial,sans-serif; font-size:12px; font-weight:800; text-decoration:underline;">${escapeHtml(event.linkText?.trim() || "Event details")}</a>` : ""}
        </article>`;
      }).join("")}
      ${alumniNews.length ? `<ul style="margin:0; padding:8px 24px 20px 42px; background:#ffffff; color:#475569; font-family:'Figtree',Arial,sans-serif; font-size:14px; line-height:1.65;">
        ${alumniNews.map((event) => {
          const link = safeHref(event.link);
          const action = link
            ? ` <a href="${link}" style="color:#314363; font-weight:800; text-decoration:underline;">${escapeHtml(event.linkText?.trim() || "Learn more")}</a>`
            : "";
          return `<li style="margin:0 0 14px; padding-left:4px;"><strong style="color:#314363;">${escapeHtml(event.title)}</strong>${event.description ? ` — ${escapeHtml(event.description)}` : ""}${action}</li>`;
        }).join("")}
      </ul>` : ""}
    </section>` : "";
   const miamiAttendingCards = miamiAttendingEvents.map(event => {
     const rsvpLink = digest.digestId && digest.siteUrl && subscriberEmail
       ? buildRsvpUrl(digest.siteUrl, digest.digestId, event.title, subscriberEmail, subscriberName, digest.weekOf)
       : null;
     return `
    <section style="border:2px solid #0E5560;border-radius:16px;background:#edf7f3;padding:24px;margin-bottom:24px;">
      <h2 style="color:#0E5560;font-size:20px;margin:0 0 12px;">Featured event</h2>
      <p style="color:#E8664A;font-size:12px;font-weight:800;text-transform:uppercase;margin:0 0 12px;">I’ll be attending</p>
      <h3 style="color:#12343a;font-size:22px;margin:0 0 12px;">${escapeHtml(event.title)}</h3>
      <p style="color:#12343a;font-weight:700;margin:0 0 10px;">${escapeHtml(event.date)}</p>
      <p style="color:#475569;margin:0 0 12px;">${escapeHtml(event.venue)}</p>
      <p style="color:#12343a;font-size:18px;font-weight:700;margin:0 0 12px;">${escapeHtml(event.description.split(". ")[0])}</p>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">${escapeHtml(event.description.split(". ").slice(1).join(". "))}</p>
      ${safeHref(event.link) ? `<a href="${safeHref(event.link)}" style="display:inline-block;background:#0E5560;color:#fff;border-radius:8px;padding:10px 20px;text-decoration:none;font-weight:700;">Official site &amp; tickets →</a>` : ""}
       ${rsvpLink ? `<a href="${escapeHtml(rsvpLink)}" style="display:inline-block;background:#fff;color:#0E5560;border:1.5px solid #0E5560;border-radius:8px;padding:10px 20px;margin-left:8px;text-decoration:none;font-weight:700;">✨ Interested?</a>` : ""}
     </section>`;
   }).join("");

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

  const bizSpotlightCards = bizSpotlights.map(e => buildSpotlightCard(
    e,
    slug === "leadershipaustin" ? "#314363" : "#0369a1",
    "Business Spotlight",
    slug === "leadershipaustin" ? "" : "💼",
  )).join("");
  const commSpotlightCards = commSpotlights.map(e => buildSpotlightCard(
    e,
    slug === "leadershipaustin" ? "#314363" : "#15803d",
    "Community Spotlight",
    slug === "leadershipaustin" ? "" : "🙌",
  )).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(digest.subject)}</title>
  ${slug === "leadershipaustin" ? `<style>@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Figtree:wght@400;500;600;700;800&display=swap');h1,h2,h3{font-family:'Barlow Condensed',Arial,sans-serif!important}body,p,a,div{font-family:'Figtree',Arial,sans-serif}</style>` : ""}
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:${slug === "leadershipaustin" ? "'Figtree',Arial,sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"};">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    
    <!-- Header -->
    <div style="background:${theme.headerGradient}; border-radius:16px; padding:32px; margin-bottom:24px; text-align:center;">
      ${slug === "houston" ? `<img src="${escapeHtml(digest.siteUrl ? new URL("/images/houston-astros.png", digest.siteUrl).toString() : "https://www.mlbstatic.com/team-logos/117.svg")}" alt="Houston Astros logo" width="58" height="58" style="display:block; margin:0 auto 12px; width:58px; height:58px;" />` : ""}
      ${slug === "la" ? `<table role="presentation" align="center" width="60" height="60" cellpadding="0" cellspacing="0" border="0" style="width:60px; height:60px; margin:0 auto 12px; border-collapse:collapse;"><tr><td align="center" valign="middle" width="54" height="54" style="width:54px; height:54px; border:3px solid #ffffff; border-radius:50%; background-color:#FDB927; color:#552583; text-align:center; vertical-align:middle; font-family:Arial,sans-serif; font-size:22px; font-weight:900; line-height:1;"><span role="img" aria-label="Los Angeles brand mark" style="display:inline-block; font-family:Arial,sans-serif; font-size:22px; font-weight:900; letter-spacing:-2px; line-height:1; vertical-align:middle;">LA</span></td></tr></table>` : ""}
      ${slug === "nyc" ? `<img src="${escapeHtml(digest.siteUrl ? new URL("/images/nyc-mark.svg", digest.siteUrl).toString() : "https://nyc.irl.group/images/nyc-mark.svg")}" alt="New York City mark" width="58" height="58" style="display:block; margin:0 auto 12px; width:58px; height:58px;" />` : ""}
      ${slug === "dallas" ? `<img src="${escapeHtml(digest.siteUrl ? new URL("/images/dallas-mark.svg", digest.siteUrl).toString() : "https://dallas.irl.group/images/dallas-mark.svg")}" alt="Dallas skyline mark" width="58" height="58" style="display:block; margin:0 auto 12px; width:58px; height:58px;" />` : ""}
      ${slug === "manchester" ? `<img src="${escapeHtml(digest.siteUrl ? new URL("/images/manchester-mark.svg", digest.siteUrl).toString() : "https://manchester.irl.group/images/manchester-mark.svg")}" alt="Manchester worker bee" width="58" height="58" style="display:block; margin:0 auto 12px; width:58px; height:58px;" />` : ""}
      ${slug === "leadershipaustin" ? `<div aria-hidden="true" style="display:inline-flex; align-items:center; justify-content:center; width:42px; height:42px; margin:0 auto 10px; border:1px solid #4EBEE7; color:#ffffff; font-family:'Barlow Condensed',Arial,sans-serif; font-size:20px; font-weight:800; letter-spacing:1px;">LA</div>` : ""}
      <h1 style="margin:0 0 6px; font-family:${slug === "leadershipaustin" ? "'Barlow Condensed',Arial,sans-serif" : "inherit"}; font-size:30px; font-weight:800; letter-spacing:-0.5px; text-transform:${slug === "leadershipaustin" ? "uppercase" : "none"};">${digest.siteUrl ? `<a href="${escapeHtml(digest.siteUrl)}" style="color:${theme.textOnDark}; text-decoration:none;">${theme.headerEmoji} ${escapeHtml(theme.digestDisplayName)}</a>` : `<span style="color:${theme.textOnDark};">${theme.headerEmoji} ${escapeHtml(theme.digestDisplayName)}</span>`}</h1>
      ${slug !== "leadershipaustin" ? `<div style="display:inline-flex; align-items:center; gap:6px; margin-bottom:6px;">
        <div style="display:inline-block; background:${theme.primaryBtn}; border-radius:6px; padding:2px 8px;">
          <span style="color:${theme.primaryDark}; font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">Beta</span>
        </div>
      </div>` : ""}
      <p style="margin:0; color:${theme.textOnDark}; font-size:14px;">${theme.cityGuideText}</p>
      ${editionRange ? `<p style="margin:8px 0 0; color:${theme.textMutedOnDark}; font-size:13px;">${escapeHtml(editionRange)}</p>` : ""}
      ${slug !== "austin" && slug !== "leadershipaustin" && !editionRange ? `<p style="margin:8px 0 0; color:${theme.textMutedOnDark}; font-size:13px;">Week of ${weekDate}</p>` : ""}
      ${theme.curatorName ? `<p style="margin:8px 0 0; color:${theme.textMutedOnDark}; font-size:12px; font-style:italic;">Curated by ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.textMutedOnDark}; text-decoration:underline;">${theme.curatorName}</a>` : theme.curatorName}</p>` : ""}
    </div>

    <!-- Intro -->
    <div style="background:#fff; border:1px solid #e7e5e4; border-radius:12px; padding:24px; margin-bottom:16px;">
      <p style="margin:0 0 12px; color:#44403c; font-size:15px; line-height:1.7;">${escapeHtml(digest.intro).replace(/\n/g, "<br>")}</p>
      ${theme.curatorName ? `<p style="margin:0; color:#78716c; font-size:14px; font-weight:600;">— ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.linkColor}; text-decoration:none;">${theme.curatorName}</a>` : theme.curatorName}</p>` : ""}
    </div>

    ${alumniWelcomeHtml}
    ${alumniHappeningsHtml}
    ${alumniSourcedEventsHtml}

    ${slug === "austin" ? buildAustinAiEthicsSection() : ""}
    ${slug === "sanfrancisco" ? buildSanFranciscoAiEthicsSection() : ""}
    ${slug === "sacramento" ? buildSacramentoAiEthicsSection() : ""}
    ${slug === "miami" ? buildMiamiAiEthicsSection() : ""}
    ${slug === "boston" ? buildBostonAiEthicsSection() : ""}
    ${slug === "la" ? buildLaAiEthicsSection() : ""}
    ${slug === "leadershipaustin" ? "" : buildCityAiEthicsSection(slug ?? "")}

    <!-- Location CTA -->
    ${digest.preferencesUrl ? `
    <div style="background:${theme.primaryLight}; border:1.5px solid ${theme.primaryBtn}; border-radius:14px; padding:18px 22px; margin-bottom:24px; text-align:center;">
      <a href="${escapeHtml(digest.preferencesUrl)}" style="color:${theme.primaryDark}; text-decoration:none; font-size:16px; font-weight:700; letter-spacing:-0.2px;">📍 See events near you →</a>
      <p style="margin:6px 0 0; color:#78716c; font-size:13px; line-height:1.5;">Set your neighborhood to see event distances and nearby listings.</p>
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
      <a href="https://austincares.irl.group/full" style="display:inline-block; background:#C4502B; color:#fff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 32px; border-radius:100px; letter-spacing:-0.1px;">See this week's deals →</a>
    </div>` : ""}

    <!-- AustinCares Launch Promo (other established city newsletters) -->
    ${slug !== "austincares" && slug !== "leadershipaustin" && slug !== "atlanta" && slug !== "houston" && slug !== "sanfrancisco" && slug !== "miami" && slug !== "boston" && slug !== "la" && slug !== "dallas" ? `
    <div style="background:${slug === "austin" ? "linear-gradient(135deg,#fff8ed 0%,#f8f2e8 54%,#edf7f0 100%)" : "linear-gradient(135deg,#1c0a05 0%,#3b0e07 55%,#5c1a0d 100%)"}; border:${slug === "austin" ? "1.5px solid #ead7ba" : "none"}; border-radius:16px; padding:26px 28px; margin-bottom:24px; text-align:center;">
      <p style="margin:0 0 6px; color:${slug === "austin" ? "#a45b22" : "#fbbf24"}; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">🏷️ New · Austin Cares</p>
      <p style="margin:0 0 10px; color:${slug === "austin" ? "#3f392f" : "#ffffff"}; font-size:19px; font-weight:800; letter-spacing:-0.3px;">The best local deals, curated every week.</p>
      <p style="margin:0 0 6px; color:${slug === "austin" ? "#746959" : "#fde68a"}; font-size:13px; line-height:1.6;">A weekly digest of real, time-boxed discounts — happy hours, Tuesday specials, weekday-only deals — filtered by day and distance. No hunting through Instagram. No expired coupons.</p>
      <p style="margin:0 0 18px; color:${slug === "austin" ? "#8b735d" : "#fca5a5"}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Coming to a city near you 🌍</p>
      <a href="https://austincares.irl.group" style="display:inline-block; background:${slug === "austin" ? "#2f855a" : "#C4502B"}; color:#fff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 32px; border-radius:100px; letter-spacing:-0.1px;">Get Weekly Deals →</a>
    </div>` : ""}

    <!-- Tokyo Launch Highlight (Tokyo only) -->
    ${slug === "tokyo" && digest.siteUrl && digest.digestId ? `
    <div style="background:#fff0f0; border:1.5px solid #dc2626; border-radius:14px; padding:20px 24px; margin-bottom:24px; text-align:center;">
      <p style="margin:0 0 4px; color:#dc2626; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">🗼 Now Live</p>
      <p style="margin:0 0 8px; color:#1c1917; font-size:17px; font-weight:800; letter-spacing:-0.3px;">Tokyo Events is here!</p>
      <p style="margin:0 0 14px; color:#78716c; font-size:13px; line-height:1.6;">Your weekly hand-picked guide to the best live music, food pop-ups, tech meetups, and hidden gems happening across Tokyo. Share with a friend who loves the city!</p>
      <a href="${escapeHtml(digest.siteUrl)}" style="display:inline-block; background:#dc2626; color:#fff; font-size:14px; font-weight:700; text-decoration:none; padding:11px 26px; border-radius:100px; letter-spacing:-0.1px;">View full edition →</a>
    </div>` : ""}

    ${buildStaticMapSection(
      slug === "leadershipaustin"
        ? [...contentEvents, ...(digest.alumniSourcedEvents ?? [])]
        : contentEvents,
      slug ?? undefined,
      digest.siteUrl ?? undefined,
      digest.digestId,
    )}

    <!-- Austin privacy-first Groups feature -->
    ${slug === "austin" ? `
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#0f3460 100%); border-radius:16px; padding:26px 24px; margin-bottom:24px;">
      <div style="display:inline-block; background:rgba(255,255,255,0.12); border:1px solid rgba(147,197,253,0.3); border-radius:100px; padding:5px 14px; margin-bottom:16px;">
        <span style="color:#bfdbfe; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px;">Coming soon · Austin pilot</span>
      </div>
      <p style="margin:0 0 10px; color:#ffffff; font-size:22px; font-weight:800; line-height:1.25;">Groups, designed privacy-first</p>
      <p style="margin:0 0 16px; color:#cbd5e1; font-size:14px; line-height:1.65;">Local hosts will bring small neighborhood groups together regularly. People can start with a username, without sharing an email address or phone number, and get to know the group at their own pace.</p>
      <span style="display:inline-block; background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.15); border-radius:100px; padding:6px 12px; margin:0 6px 4px 0; font-size:12px; font-weight:600;">Username first</span>
      <span style="display:inline-block; background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.15); border-radius:100px; padding:6px 12px; margin:0 6px 4px 0; font-size:12px; font-weight:600;">No email required</span>
      <span style="display:inline-block; background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.15); border-radius:100px; padding:6px 12px; margin:0 6px 4px 0; font-size:12px; font-weight:600;">No phone number required</span>
    </div>` : ""}

    <!-- Coming Soon: New Features -->
    ${slug !== "austin" && slug !== "leadershipaustin" && slug !== "atlanta" && slug !== "houston" && slug !== "sanfrancisco" && slug !== "miami" && slug !== "boston" && slug !== "la" && slug !== "dallas" ? `
    <div style="background:${theme.headerGradient}; border-radius:16px; padding:28px 24px; margin-bottom:24px;">
      <!-- Badge -->
      <div style="display:inline-block; background:${slug === "austin" ? "rgba(47,133,90,0.10)" : "rgba(255,255,255,0.12)"}; border:1px solid ${slug === "austin" ? "rgba(47,133,90,0.22)" : "rgba(255,255,255,0.2)"}; border-radius:100px; padding:5px 14px; margin-bottom:16px;">
        <span style="color:${slug === "austin" ? "#285c3f" : "#e2e8f0"}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">🚀 Coming Soon</span>
      </div>

      <!-- Heading -->
      <p style="margin:0 0 20px; color:${theme.textStrong}; font-size:22px; font-weight:800; letter-spacing:-0.4px; line-height:1.25;">Two new features <em style="color:#60a5fa; font-style:italic;">rolling out soon</em></p>

      <!-- Feature 1: Tell a Friend -->
      <div style="background:${slug === "austin" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.07)"}; border:1px solid ${slug === "austin" ? "rgba(47,133,90,0.16)" : "rgba(255,255,255,0.1)"}; border-radius:12px; padding:18px 20px; margin-bottom:12px;">
        <p style="margin:0 0 6px; font-size:22px; line-height:1;">📨</p>
        <p style="margin:0 0 6px; color:${theme.textStrong}; font-size:16px; font-weight:700;">Tell a Friend</p>
        <p style="margin:0; color:${theme.textOnDark}; font-size:13px; line-height:1.65;">Text any event directly to a friend's phone — one tap, no app download required. Just enter their number and they get the full event details instantly.</p>
      </div>

      <!-- Feature 2: SMS for Local Businesses -->
      <div style="background:${slug === "austin" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.07)"}; border:1px solid ${slug === "austin" ? "rgba(47,133,90,0.16)" : "rgba(255,255,255,0.1)"}; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
        <p style="margin:0 0 6px; font-size:22px; line-height:1;">💬</p>
        <p style="margin:0 0 6px; color:${theme.textStrong}; font-size:16px; font-weight:700;">SMS for Local Businesses</p>
        <p style="margin:0; color:${theme.textOnDark}; font-size:13px; line-height:1.65;">An SMS-powered tool built for ${escapeHtml(cityName)}'s local service businesses — connecting them with nearby customers in real time. No app download required.</p>
      </div>

      <!-- Pills -->
      <table style="border-collapse:collapse;">
        <tr>
          <td style="padding:4px 8px 4px 0;">
            <span style="display:inline-block; background:${slug === "austin" ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.08)"}; color:${theme.pillText}; border:1px solid ${theme.pillBorder}; border-radius:100px; padding:6px 14px; font-size:12px; font-weight:600; white-space:nowrap;">⚡ Real-Time Reach</span>
          </td>
          <td style="padding:4px 0 4px 0;">
            <span style="display:inline-block; background:${slug === "austin" ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.08)"}; color:${theme.pillText}; border:1px solid ${theme.pillBorder}; border-radius:100px; padding:6px 14px; font-size:12px; font-weight:600; white-space:nowrap;">💬 SMS-First</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0;">
            <span style="display:inline-block; background:${slug === "austin" ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.08)"}; color:${theme.pillText}; border:1px solid ${theme.pillBorder}; border-radius:100px; padding:6px 14px; font-size:12px; font-weight:600; white-space:nowrap;">📍 Hyper-Local</span>
          </td>
          <td style="padding:4px 0 4px 0;">
            <span style="display:inline-block; background:${slug === "austin" ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.08)"}; color:${theme.pillText}; border:1px solid ${theme.pillBorder}; border-radius:100px; padding:6px 14px; font-size:12px; font-weight:600; white-space:nowrap;">🚀 No App Needed</span>
          </td>
        </tr>
      </table>
    </div>` : ""}

    <!-- Business Spotlights -->
    ${bizSpotlightCards}

    <!-- Community Spotlights -->
    ${commSpotlightCards}

    <!-- Miami curator-attended feature -->
    ${miamiAttendingCards}

    <!-- Featured Events -->
    ${featuredCards}

    <!-- Events -->
    ${eventCards ? `<h2 style="margin:0 0 16px; color:#1c1917; font-size:20px; font-weight:700;">${slug === "austincares" ? "This Week's Deals 🏷️" : "Upcoming Events 🎯"}</h2>${eventCards}` : ""}

    <!-- Also Nearby -->
    ${alsoNearbyCards ? `
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:14px; padding:20px; margin-bottom:24px;">
      <h2 style="margin:0 0 4px; color:#1c1917; font-size:18px; font-weight:700;">📍 Also Nearby</h2>
      <p style="margin:0 0 16px; color:#78716c; font-size:13px;">${slug === "austincares" ? "These deals are a bit further out — but still worth the trip." : `These events are a bit further out — but still near ${escapeHtml(cityName)}.`}</p>
      ${alsoNearbyCards}
    </div>` : ""}

    <!-- Austin Event Discovery Positioning -->
    ${slug === "austin" ? `
    <div style="background:linear-gradient(135deg,#f0fdf4 0%,#ffffff 58%,#f6fbf7 100%); border:1.5px solid #cfe8d6; border-radius:16px; padding:24px 22px; margin:28px 0 24px;">
      <p style="margin:0; color:#17241d; font-family:Georgia,'Times New Roman',serif; font-size:24px; font-weight:800; line-height:1.08; letter-spacing:-0.7px;">
        Your Events.<br>
        <em style="color:#2fa85f; font-family:Georgia,'Times New Roman',serif; font-weight:800;">Their Interests.</em><br>
        One Personalized Channel.
      </p>
      <div style="width:48px; height:2px; background:#2fa85f; margin:16px 0;"></div>
      <p style="margin:0; color:#66766c; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7;">
        We build custom event discovery websites and newsletters that help your audience find the right events at the right time. Combine location-based discovery, interest-based curation, and an automated email digest to turn your event calendar into a personalized marketing channel.
      </p>
    </div>` : ""}

    <!-- Footer -->
    <div style="border-top:1px solid #e7e5e4; padding-top:20px; margin-top:24px; text-align:center;">
      <a href="https://irl.group" aria-label="IRL — In Real Life" style="display:inline-block; margin:0 auto 8px;">
        <img src="https://irl.group/images/irl-monogram.png" alt="IRL — In Real Life" width="88" height="88" style="display:block; width:88px; height:88px; margin:0 auto;" />
      </a>
      <p style="margin:0 0 6px; color:#78716c; font-size:13px;">${theme.curatorName ? `Curated with ❤️ by ${theme.curatorUrl ? `<a href="${theme.curatorUrl}" style="color:${theme.linkColor}; text-decoration:none;">${theme.curatorName}</a>` : theme.curatorName}${slug === "portland" ? " from Portland, OR" : slug === "sacramento" ? " from Sacramento, CA" : slug === "bulverde" ? " from Bulverde, TX" : slug === "stlouis" ? " from St. Louis, MO" : slug === "tokyo" ? " from Tokyo, Japan" : " from Austin, TX"}` : slug === "tokyo" ? "Curated with ❤️ from Tokyo, Japan" : `Curated with ❤️ for ${escapeHtml(cityName)}`}</p>
      <p style="margin:0 0 16px; color:#a8a29e; font-size:12px;">You're receiving this because you subscribed at ${escapeHtml(theme.digestDisplayName)}.</p>
      <p style="margin:0 0 8px; color:#a8a29e; font-size:12px;"><a href="https://irl.group" style="color:#78716c; text-decoration:underline;">IRL (In Real Life)</a></p>
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
      <p style="margin:0; color:#78716c; font-size:13px;">Subscribed via irl.group</p>
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

interface ManagedEventInterestDetails {
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  siteName?: string | null;
}

function managedEventInterestDetailsHtml(details: ManagedEventInterestDetails): string {
  return `
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:700;">${escapeHtml(details.eventTitle)}</p>
      <p style="margin:0 0 4px;color:#475569;font-size:14px;">Date: ${escapeHtml(details.eventDate)}</p>
      <p style="margin:0;color:#475569;font-size:14px;">Venue: ${escapeHtml(details.eventVenue)}</p>
    </div>`;
}

// Notify people who previously expressed interest in an alumni-sourced event.
export async function sendManagedEventInterestNotification(opts: ManagedEventInterestDetails & {
  to: string;
  totalInterested: number;
}): Promise<void> {
  const siteName = opts.siteName || "Leadership Austin alumni events";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
    <p style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Someone else is interested</p>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">Another person marked interest in this event. Your contact details are not shared with other participants.</p>
    ${managedEventInterestDetailsHtml(opts)}
    <p style="margin:0;color:#475569;font-size:14px;">${opts.totalInterested} ${opts.totalInterested === 1 ? "person is" : "people are"} interested.</p>
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;">${escapeHtml(siteName)}</p>
  </div>
</body></html>`;
  const result = await sendEmail({
    to: opts.to,
    subject: `New interest in: ${opts.eventTitle.slice(0, 60)}`,
    html,
  });
  if (!result.success) logger.warn({ to: opts.to, error: result.error }, "Failed to send managed-event interest notification");
}

// Tell a new participant how many people have expressed interest without sharing
// any other participant's identity or contact details.
export async function sendManagedEventInterestGroupNotification(opts: ManagedEventInterestDetails & {
  to: string;
  totalInterested: number;
}): Promise<void> {
  if (opts.totalInterested < 2) return;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
    <p style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Others are interested too</p>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">${opts.totalInterested} people have marked interest in this event. Participant contact details are not shared.</p>
    ${managedEventInterestDetailsHtml(opts)}
  </div>
</body></html>`;
  const result = await sendEmail({
    to: opts.to,
    subject: `Others interested in: ${opts.eventTitle.slice(0, 60)}`,
    html,
  });
  if (!result.success) logger.warn({ to: opts.to, error: result.error }, "Failed to send managed-event interest group notification");
}

export async function sendManagedEventInterestAdminNotification(opts: ManagedEventInterestDetails & {
  interestedEmail: string;
  interestedName?: string | null;
  totalInterested: number;
  adminEmail?: string | null;
}): Promise<void> {
  const name = opts.interestedName?.trim() || opts.interestedEmail.split("@")[0];
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
    <p style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">New event interest</p>
    <p style="margin:0;color:#475569;font-size:14px;">Name: ${escapeHtml(name)}</p>
    <p style="margin:6px 0;color:#475569;font-size:14px;">Email: ${escapeHtml(opts.interestedEmail)}</p>
    ${managedEventInterestDetailsHtml(opts)}
    <p style="margin:0;color:#475569;font-size:14px;">Total people interested: <strong>${opts.totalInterested}</strong></p>
  </div>
</body></html>`;
  const result = await sendEmail({
    to: opts.adminEmail || ADMIN_NOTIFY_EMAIL,
    subject: `New event interest: ${opts.eventTitle.slice(0, 60)}`,
    html,
  });
  if (!result.success) logger.warn({ error: result.error }, "Failed to send managed-event interest admin notification");
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
        In the meantime, check out <a href="https://austin.irl.group" style="color:#4f46e5; text-decoration:none; font-weight:600;">austin.irl.group</a> to see a live example of what we're building.
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
      <p style="margin:0; color:#78716c; font-size:13px;">Signed up via the feature interest form on austin.irl.group</p>
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
