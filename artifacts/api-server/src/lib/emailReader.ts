import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { logger } from "./logger";
import { EventItem } from "@workspace/db";

const GMAIL_USER = process.env.GMAIL_USER;
// Strip spaces — Google displays app passwords with spaces but IMAP requires them without
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

export function isEmailReaderConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

interface FetchedEmail {
  subject: string;
  from: string;
  date: Date;
  text: string;
  html: string;
}

async function fetchRecentNewsletterEmails(since: Date, before?: Date): Promise<FetchedEmail[]> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
  });

  const emails: FetchedEmail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const criteria: Record<string, any> = { since };
      if (before) criteria.before = before;
      const messages = client.fetch(criteria, { source: true, envelope: true });

      for await (const msg of messages) {
        try {
          if (!msg.source) continue;
          const parsed: ParsedMail = await simpleParser(msg.source as Buffer);
          emails.push({
            subject: parsed.subject || "(no subject)",
            from: parsed.from?.text || "",
            date: parsed.date || new Date(),
            text: parsed.text || "",
            html: typeof parsed.html === "string" ? parsed.html : "",
          });
        } catch (err) {
          logger.warn({ err }, "Failed to parse email message");
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, num) => {
      try { return String.fromCodePoint(parseInt(num, 10)); } catch { return ""; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ""; }
    });
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/g, " ")
  )
    .replace(/\u200b|\u200c|\u200d|\uFEFF|\u00AD/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Strip all forwarded message headers to reach the innermost newsletter body.
// Handles multiple forwarding layers (e.g. Raj → aiimplementationclubaustin
// wrapping Ethan → Raj wrapping the original newsletter).
function stripForwardedHeaders(text: string): string {
  let result = text;
  // Loop: keep stripping "---------- Forwarded message" wrappers until none remain
  for (let depth = 0; depth < 5; depth++) {
    const forwardedIdx = result.indexOf("---------- Forwarded message");
    if (forwardedIdx === -1) break;
    // Skip past the header block (From/To/Date/Subject lines) — find the blank line after it
    const afterHeader = result.indexOf("\n\n", forwardedIdx + 50);
    if (afterHeader === -1) {
      result = result.slice(forwardedIdx);
      break;
    }
    result = result.slice(afterHeader).trim();
  }
  // Also strip Gmail "On <date> <name> wrote:" quote markers
  result = result.replace(/^On .{10,100} wrote:\s*/gm, "");
  return result;
}

const DAY_HEADER = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i;
const TIME_LINE = /^\d{1,2}:\d{2}\s*(am|pm)/i;
const DATE_LINE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[,.\s]+\d{1,2}/i;
const REGISTER_LINK = /register(?: here)?|rsvp(?: here)?|view details|get tickets|book now|お申し込み|申し込み|準備中|details coming soon|詳細/i;
const REGISTER_LINK_FULL = /^(register(?: here)?|rsvp(?: here)?|learn more|buy tickets?|sign up|↗|view details|rsvp here|get tickets?|click here|read more|join us|book now|reserve(?: your \w+)?|お申し込み|申し込み|準備中|details coming soon|GET [\w\s]+ TICKETS?|RSVP HERE)[^a-z0-9]*$/i;
const JUNK_LINE = /^(https?:\/\/|unsubscribe|view online|privacy|copyright|\(c\)|©|forward|manage|preferences|\d{4} .{1,30} all rights|download the|free$|ajc supported|community giving|business association|event details|ages? \d+\+|all ages|\d+\s+\w[\w\s]*\b(blvd|st|ave|rd|ln|dr|pkwy|hwy|way)[\s.]*$|- .+ -$|location:|time:|cost:|email:|meet & connect|.*\/ (upcoming|inside|information) |\w+ (park|beach|lake|creek|trail|center|centre|commons|garden|gardens|theatre|theater)$)/i;
// Lines that are section headers/decorative (start with emoji bullets or are all-caps short labels)
const SECTION_HEADER = /^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u{1F000}-\u{1FFFF}✨⚡️🎯🗓️📍📅🚗🎉🏆]+\s*\S/u;
// Sentence-starters that are clearly prose, not event titles
// Match prose sentence-openers — includes smart-quote apostrophes (U+2019)
const PROSE_OPENER = /^(it[\u2019']?s |see you |come (on |and |out )|join us|check (it |out|this)|we[\u2019']?re |you[\u2019']?re |don[\u2019']?t |there[\u2019']?s |they[\u2019']?re |we have |i[\u2019']?ll |as always|if you|this is a|this week|today |tonight:|tomorrow |a few |you can |the next |money is |want to |please |we are |while the|the party |our |their )/i;
const ZERO_WIDTH_HEAVY = /[\u{1F600}-\u{1FFFF}\u200b\u200c\u200d\uFEFF]{3,}/u;

// Returns exactly one of the 5 display categories: Tech, Arts, Sports, Civics, Wellness
function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/tech|startup|ai\b|code|developer|hackathon|entrepreneur|venture|founder|saas|software/.test(lower)) return "Tech";
  if (/yoga|meditation|mindfulness|pilates|wellness|health retreat/.test(lower)) return "Wellness";
  if (/run|hike|bike|fitness|gym|outdoor|trail|swim|sport|cycling|crossfit/.test(lower)) return "Sports";
  if (/community|volunteer|nonprofit|charity|civic|neighborhood|advocacy|social impact/.test(lower)) return "Civics";
  return "Arts";
}

// Parse Luma-style digest: Day header → time → event title → venue → Register
function parseLumaStyle(lines: string[]): EventItem[] {
  const events: EventItem[] = [];
  let currentDay = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (DAY_HEADER.test(line)) {
      currentDay = line;
      i++;
      continue;
    }

    if (TIME_LINE.test(line) && currentDay) {
      // Extract only the time portion — the full line may contain " @ Venue" or price info
      const rawTimeLine = line.trim();
      const timeMatch = rawTimeLine.match(/^\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)/i);
      const timeStr = timeMatch ? timeMatch[0].trim() : rawTimeLine;
      const titleLine = lines[i + 1]?.trim() || "";
      const venueLine = lines[i + 2]?.trim() || "";

      if (titleLine && titleLine.length > 3 && !REGISTER_LINK_FULL.test(titleLine) && !JUNK_LINE.test(titleLine)) {
        const hasVenue = (!REGISTER_LINK_FULL.test(venueLine) && !JUNK_LINE.test(venueLine) && !TIME_LINE.test(venueLine) && !DAY_HEADER.test(venueLine) && venueLine.length > 2 && !/to see \d+ more/i.test(venueLine));
        const venue = hasVenue ? venueLine : "Austin, TX";
        const nextIdx = i + (hasVenue ? 3 : 2);

        // Gather real description lines that follow venue
        const descLines: string[] = [];
        let k = nextIdx;
        while (k < lines.length && descLines.length < 4) {
          const dl = lines[k].trim();
          if (!dl || TIME_LINE.test(dl) || DAY_HEADER.test(dl)) break;
          if (REGISTER_LINK.test(dl) || JUNK_LINE.test(dl) || dl.length < 8) { k++; continue; }
          descLines.push(dl);
          k++;
        }
        // If titleLine is very long it's a description paragraph — extract a concise title
        let title = titleLine;
        let prefillDesc = "";
        if (titleLine.length > 80) {
          const phrase = titleLine.split(/[.!?—|]/)[0].trim();
          title = (phrase.length >= 10 && phrase.length <= 70)
            ? phrase
            : titleLine.substring(0, 60).replace(/\s+\S+$/, "").trim() + "…";
          prefillDesc = titleLine;
        }

        const description = prefillDesc || (descLines.length > 0
          ? descLines.join(" ")
          : `${title} at ${venue} on ${currentDay} at ${timeStr}.`);

        events.push({
          title,
          date: `${currentDay} at ${timeStr}`,
          venue,
          description,
          category: guessCategory(`${title} ${description}`),
          link: null,
          imageUrl: null,
        });

        i = nextIdx;
        continue;
      }
    }

    i++;
  }

  return events;
}

// Generic parser: looks for event-like blocks with a date nearby
function parseGenericEvents(lines: string[]): EventItem[] {
  const events: EventItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (
      line.length < 10 ||
      line.length > 100 ||           // Titles shouldn't be long paragraphs
      JUNK_LINE.test(line) ||
      REGISTER_LINK_FULL.test(line) ||
      REGISTER_LINK.test(line) ||    // Also skip lines that contain registration keywords anywhere
      SECTION_HEADER.test(line) ||   // Skip emoji section headers
      PROSE_OPENER.test(line) ||     // Skip obvious prose sentences
      ZERO_WIDTH_HEAVY.test(line) ||
      /^[a-z]/.test(line) ||
      /[?!:]$/.test(line) ||         // Sentences ending in ? ! : are rarely event titles
      DATE_LINE.test(line)
    ) continue;

    // Look ahead for a date within next 5 lines
    let dateStr = "";
    let venue = "Austin, TX";
    const descLines: string[] = [];

    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (!dateStr && DATE_LINE.test(next) && next.length < 100) {
        dateStr = next;
      } else if (dateStr && !JUNK_LINE.test(next) && !REGISTER_LINK.test(next) && next.length > 5 && next.length < 80 && !DATE_LINE.test(next) && venue === "Austin, TX") {
        venue = next;
      } else if (dateStr && next.length > 20 && !JUNK_LINE.test(next) && !REGISTER_LINK.test(next)) {
        descLines.push(next);
        if (descLines.length >= 3) break;
      }
    }

    if (!dateStr) continue;

    const key = line.toLowerCase().substring(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);

    const desc = descLines.length > 0
      ? descLines.join(" ").substring(0, 400)
      : `${line} — ${dateStr} in Austin, TX.`;

    events.push({
      title: line,
      date: dateStr,
      venue,
      description: desc,
      category: guessCategory(`${line} ${desc}`),
      link: null,
      imageUrl: null,
    });
  }

  return events;
}

// Parse "Month. Day: Event Title" format used in newsletters like Austin Business Review
// e.g. "Apr. 20: Dazed & Confused - Live Where It Was Filmed"
// Matches both abbreviated ("Jun.") and full ("June") month names.
const DATE_COLON_LINE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}):\s+(.+)/i;

function parseDateColonStyle(lines: string[]): EventItem[] {
  const events: EventItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(DATE_COLON_LINE);
    if (!m) continue;

    const dateStr = `${m[1]} ${m[2]}`;
    const title = m[3].trim();
    if (title.length < 5 || JUNK_LINE.test(title) || REGISTER_LINK_FULL.test(title) || PROSE_OPENER.test(title)) continue;

    const key = title.toLowerCase().substring(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);

    // Look for a description in surrounding lines
    const descLines: string[] = [];
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j].trim();
      if (!next || DATE_COLON_LINE.test(next)) break;
      if (!JUNK_LINE.test(next) && !REGISTER_LINK.test(next) && next.length > 20) {
        descLines.push(next);
        if (descLines.length >= 2) break;
      }
    }

    events.push({
      title,
      date: dateStr,
      venue: "Austin, TX",
      description: descLines.length > 0 ? descLines.join(" ").substring(0, 400) : `${title} on ${dateStr} in Austin.`,
      category: guessCategory(title),
      link: null,
      imageUrl: null,
    });
  }

  return events;
}

// Parse ATX Today pipe-separated format: "Event Title | time | venue | price"
// The newsletter date appears as "MM.DD.YYYY" near the top of the email.
function parseAtxTodayStyle(lines: string[]): EventItem[] {
  const events: EventItem[] = [];
  const seen = new Set<string>();
  let newsletterDate = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect ATX Today date header like "06.11.2026"
    const dotDate = line.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dotDate) {
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const m = parseInt(dotDate[1], 10) - 1;
      const d = parseInt(dotDate[2], 10);
      if (m >= 0 && m < 12) newsletterDate = `${monthNames[m]} ${d}`;
      continue;
    }

    if (!line.includes(" | ") || !newsletterDate) continue;

    const parts = line.split(" | ").map(p => p.trim());
    if (parts.length < 2) continue;

    const title = parts[0];
    if (
      title.length < 5 || title.length > 80 ||
      JUNK_LINE.test(title) || REGISTER_LINK_FULL.test(title) ||
      PROSE_OPENER.test(title) || /^[a-z]/.test(title) ||
      /shop|browse|gift|editor|sponsor|presented by/i.test(title)
    ) continue;

    const key = title.toLowerCase().substring(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);

    let time = "";
    let venue = "Austin, TX";
    for (const part of parts.slice(1)) {
      if (/\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i.test(part) && !time) {
        time = part.replace(/\s*\$\d+.*/, "").trim();
      } else if (
        part.length > 5 && !/^\$\d+/.test(part) && venue === "Austin, TX" &&
        !JUNK_LINE.test(part) &&
        !/\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i.test(part) &&
        !DATE_LINE.test(part)   // exclude recurring date-range strings like "Thu, June 11-Aug. 13"
      ) {
        venue = part;
      }
    }

    // Require a time component — shopping/gift items in ATX Today lack times
    if (!time) continue;

    const date = `${newsletterDate} at ${time}`;

    const descLines: string[] = [];
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j].trim();
      if (!next || next.includes(" | ") || DATE_LINE.test(next) || DAY_HEADER.test(next)) break;
      if (!JUNK_LINE.test(next) && !REGISTER_LINK.test(next) && next.length > 20) {
        descLines.push(next);
        if (descLines.length >= 2) break;
      }
    }

    const description = descLines.length > 0
      ? descLines.join(" ").substring(0, 400)
      : `${title} at ${venue}.`;

    events.push({
      title,
      date,
      venue,
      description,
      category: guessCategory(`${title} ${description}`),
      link: null,
      imageUrl: null,
    });
  }

  return events;
}

function deriveSourceName(email: FetchedEmail): string {
  // Strip "Fwd: " / "Fwd: Fwd: " chains to get the original newsletter subject
  const innerSubj = email.subject.replace(/^(fwd?:\s*)+/i, "").trim();
  const from = email.from.toLowerCase();
  const bodySnippet = ((email.html ? email.html : email.text) || "").substring(0, 2000).toLowerCase();

  if (/austin business review/i.test(innerSubj)) return "The Austin Business Review";
  if (/capital factory/i.test(innerSubj) || /station austin/i.test(innerSubj) || /capital factory/i.test(from)) return "Capital Factory";
  if (/asian chamber|gacc|aanhpi|access vietnam|greater asian/i.test(innerSubj) || /asian chamber/i.test(from)) return "Greater Asian Chamber of Commerce";
  if (/what'?s weird atx|whatsweirdatx/i.test(innerSubj) || /whatsweirdatx/i.test(from)) return "What's Weird ATX";
  if (/weekly common|parks.*books|books.*beer/i.test(innerSubj)) return "The Weekly Common";
  if (/what'?s happening in austin|happening in austin/i.test(innerSubj)) return "Luma";
  if (/lu\.ma|noreply@lu\.ma|hello@lu\.ma/i.test(from) || /\bluma\b/i.test(from)) return "Luma";
  // Detect ATX Today by body signature (date format MM.DD.YYYY + 6AM City branding)
  if (/6am city|6am austin|atxtoday\.6amcity/i.test(bodySnippet) || /\d{2}\.\d{2}\.\d{4}/.test(bodySnippet.substring(0, 200))) return "ATX Today";
  // Extract display name from "Name <email>" format
  const nameMatch = email.from.match(/^([^<]+)</);
  if (nameMatch) return nameMatch[1].trim();
  return innerSubj || email.subject;
}

// Extract <a href="...">text</a> pairs from raw HTML so links survive stripHtml().
// Returns a map of normalised title text (first 50 chars) → URL.
function extractHtmlEventLinks(html: string): Map<string, string> {
  const links = new Map<string, string>();
  const anchorRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const url = m[1].trim();
    if (!url.startsWith("http")) continue;
    // Skip tracking / unsubscribe / image beacon links
    if (/unsubscribe|track|pixel|open\.php|click\.php|manage|preferences|mailto:|cgi-bin/i.test(url)) continue;
    // Skip 6amcity individual event slug URLs — those pages return a browser 404 even with HTTP 200
    if (/6amcity\.com\/[a-z]{2}\/[a-z-]+\/events\//i.test(url)) continue;
    const text = stripHtml(m[2]).replace(/\s+/g, " ").trim();
    if (text.length < 5 || text.length > 150) continue;
    // Skip generic CTA text — these point to the event page but don't carry the title
    if (/^(register(?: here)?|rsvp(?: here)?|learn more|buy tickets?|sign up|↗|view details?|get tickets?|click here|read more|join us|book now|reserve.*|更多|詳細)$/i.test(text)) continue;
    const key = text.toLowerCase().replace(/\s+/g, " ").substring(0, 50);
    if (!links.has(key)) links.set(key, url);
  }
  return links;
}

function extractEventsFromEmail(email: FetchedEmail): EventItem[] {
  const raw = email.html ? stripHtml(email.html) : email.text;
  const cleaned = stripForwardedHeaders(raw);
  const lines = cleaned.split(/\n/).map(l => l.trim()).filter(l => l.length > 1);

  // Extract event-page links from the raw HTML *before* it is stripped to plain text.
  const htmlLinks = email.html ? extractHtmlEventLinks(email.html) : new Map<string, string>();

  // Run all parsers and combine results
  const lumaEvents = parseLumaStyle(lines);
  const dateColonEvents = parseDateColonStyle(lines);
  const atxTodayEvents = parseAtxTodayStyle(lines);
  // Only run generic if all structured parsers found nothing
  const genericEvents = (lumaEvents.length === 0 && dateColonEvents.length === 0 && atxTodayEvents.length === 0)
    ? parseGenericEvents(lines)
    : [];

  // Combine with deduplication (structured parsers first as highest quality)
  const combined = [...lumaEvents, ...dateColonEvents, ...atxTodayEvents, ...genericEvents];
  const seen = new Set<string>();
  const source = deriveSourceName(email);
  return combined
    .filter(e => {
      const key = e.title.toLowerCase().substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(e => {
      if (e.link) return { ...e, source };
      // Try to match the event title against links extracted from the HTML
      const titleKey = e.title.toLowerCase().replace(/\s+/g, " ").substring(0, 50);
      // Exact prefix match first (up to 30 chars)
      const prefix = titleKey.substring(0, 30);
      for (const [linkText, url] of htmlLinks) {
        if (linkText.startsWith(prefix) || prefix.startsWith(linkText.substring(0, 30))) {
          return { ...e, source, link: url };
        }
      }
      return { ...e, source };
    });
}

// Exact email addresses whose forwards are trusted regardless of domain.
const TRUSTED_SENDER_EMAILS = new Set([
  "rajpaj@gmail.com",
  "raj@customersuccessforgood.com",
]);

// Domains (and their subdomains) whose mail is accepted as newsletter input.
// Attacker-controlled content must never satisfy this check: do NOT add
// keyword-only patterns such as "newsletter" or "events" here.
const TRUSTED_SENDER_DOMAINS = [
  "lu.ma",
  "beehiiv.com",
  "mailchimp.com",
  "substack.com",
  "convertkit.com",
  "constantcontact.com",
  "sendgrid.net",
  "klaviyo.com",
  "atxdaily.com",
  "austinchamber.com",
  "do512.com",
  "culturemap.com",
  "austinot.com",
  "austinmonitor.com",
];

function extractSenderEmail(from: string): string | null {
  // Prefer the bracketed form "Display Name <user@domain>" first
  const bracketed = from.match(/<([^>@\s]+@[^>@\s]+)>/);
  if (bracketed) return bracketed[1].toLowerCase().trim();
  // Fall back to a bare address
  const bare = from.match(/([^\s<>@,]+@[^\s<>@,]+)/);
  return bare ? bare[1].toLowerCase().trim() : null;
}

function isTrustedSenderDomain(domain: string): boolean {
  return TRUSTED_SENDER_DOMAINS.some(
    d => domain === d || domain.endsWith("." + d)
  );
}

function isNewsletterEmail(email: FetchedEmail): boolean {
  const subjectLower = email.subject.toLowerCase();
  const fromLower = email.from.toLowerCase();

  // Hard exclusions: bounce messages, delivery failures
  if (/mailer-daemon|mail delivery subsystem/i.test(fromLower)) return false;
  if (/delivery status|mail delivery failed|undeliverable|bounce/i.test(subjectLower)) return false;

  // Hard exclusions: our own system emails (RSVP notifications, welcome emails)
  if (/wants to carpool|carpool interest|you're on the list|raj's austin events/i.test(subjectLower)) return false;

  const senderEmail = extractSenderEmail(email.from);
  if (!senderEmail) return false;

  // Exact trusted address check (e.g. personal forwards)
  if (TRUSTED_SENDER_EMAILS.has(senderEmail)) return true;

  // Domain-based allowlist — only accept senders from known newsletter providers
  const atIdx = senderEmail.lastIndexOf("@");
  if (atIdx === -1) return false;
  const domain = senderEmail.substring(atIdx + 1);
  return isTrustedSenderDomain(domain);
}

// Parse natural-language event dates like "Saturday, Apr 12 at 10:00 AM" → Date
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseEventDate(dateStr: string, year: number): Date | null {
  const m = dateStr.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i);
  if (!m) return null;
  const monthKey = m[1].substring(0, 3).toLowerCase();
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  const day = parseInt(m[2], 10);
  if (isNaN(day) || day < 1 || day > 31) return null;
  return new Date(year, month, day);
}

function eventFallsInWeek(dateStr: string, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const year = weekStart.getFullYear();
  for (const y of [year, year + 1]) {
    const d = parseEventDate(dateStr, y);
    if (d && d >= weekStart && d < weekEnd) return true;
  }
  return false;
}

function eventFallsInRange(dateStr: string, start: Date, end: Date): boolean {
  const year = start.getFullYear();
  for (const y of [year, year + 1]) {
    const d = parseEventDate(dateStr, y);
    if (d && d >= start && d < end) return true;
  }
  return false;
}

export interface EmailSourceResult {
  emails: number;
  events: EventItem[];
  intro: string;
  sources: string[];
  weekFiltered: boolean;
}

export interface RawEmailSummary {
  subject: string;
  from: string;
  date: string;
  eventsFound: number;
  eventTitles: string[];
  bodyPreview: string;
}

export async function debugFetchEmails(since: Date, before?: Date): Promise<RawEmailSummary[]> {
  const allEmails = await fetchRecentNewsletterEmails(since, before);
  return allEmails.map(email => {
    const events = extractEventsFromEmail(email);
    const raw = email.html ? stripHtml(email.html) : email.text;
    const cleaned = stripForwardedHeaders(raw);
    return {
      subject: email.subject,
      from: email.from,
      date: email.date.toISOString(),
      eventsFound: events.length,
      eventTitles: events.map(e => e.title),
      bodyPreview: cleaned.substring(0, 600),
    };
  });
}

export async function fetchEventsFromGmail(since?: Date, before?: Date, weekOf?: Date, weekEnd?: Date): Promise<EmailSourceResult> {
  const sinceDate = since || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  })();

  logger.info({ since: sinceDate, before, weekOf, weekEnd, user: GMAIL_USER }, "Fetching newsletter emails from Gmail");

  const allEmails = await fetchRecentNewsletterEmails(sinceDate, before);
  logger.info({ total: allEmails.length }, "Total emails fetched");

  const newsletterEmails = allEmails.filter(isNewsletterEmail);
  logger.info({ newsletters: newsletterEmails.length }, "Newsletter emails identified");

  const allEvents: EventItem[] = [];
  const sources: string[] = [];

  for (const email of newsletterEmails) {
    const events = extractEventsFromEmail(email);
    if (events.length > 0) {
      allEvents.push(...events);
      sources.push(email.subject);
      logger.info({ subject: email.subject, eventsFound: events.length }, "Extracted events from email");
    }
  }

  const uniqueEvents = allEvents.filter(
    (e, idx, arr) => arr.findIndex(x => x.title.toLowerCase() === e.title.toLowerCase()) === idx
  );

  // Filter events to the target date range if provided
  let finalEvents = uniqueEvents;
  let weekFiltered = false;

  if (weekOf && weekEnd) {
    // Custom date range filter
    const inRange = uniqueEvents.filter(e => eventFallsInRange(e.date, weekOf, weekEnd));
    logger.info({ total: uniqueEvents.length, inRange: inRange.length, weekOf, weekEnd }, "Range-filtered events");
    if (inRange.length >= 1) {
      inRange.sort((a, b) => {
        const da = parseEventDate(a.date, weekOf.getFullYear());
        const db = parseEventDate(b.date, weekOf.getFullYear());
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
      });
      finalEvents = inRange;
      weekFiltered = true;
    }
  } else if (weekOf) {
    // 7-day week filter (existing behaviour)
    const inWeek = uniqueEvents.filter(e => eventFallsInWeek(e.date, weekOf));
    logger.info({ total: uniqueEvents.length, inWeek: inWeek.length, weekOf }, "Week-filtered events");
    if (inWeek.length >= 1) {
      inWeek.sort((a, b) => {
        const da = parseEventDate(a.date, weekOf.getFullYear());
        const db = parseEventDate(b.date, weekOf.getFullYear());
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
      });
      finalEvents = inWeek;
      weekFiltered = true;
    }
  }

  const intro = newsletterEmails.length > 0
    ? `I combed through ${newsletterEmails.length} newsletter${newsletterEmails.length === 1 ? "" : "s"} in my inbox and hand-picked the best events happening around the city. Here's your curated digest — get out there and enjoy Austin! 🤠`
    : "Here's your curated guide to the best events in the city this week.";
  // Note: this intro is Austin-specific. The generate endpoint should only use it for Austin (slug === "austin").

  return {
    emails: newsletterEmails.length,
    events: finalEvents.slice(0, 25),
    intro,
    sources,
    weekFiltered,
  };
}
