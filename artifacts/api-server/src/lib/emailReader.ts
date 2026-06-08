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

function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/music|concert|band|live|jazz|blues|country|rock|festival|open mic/.test(lower)) return "Music";
  if (/food|eat|restaurant|taco|bbq|market|farm|chef|dinner|brunch|culinary|happy hour/.test(lower)) return "Food & Drink";
  if (/art|gallery|exhibit|museum|film|movie|comedy|theater|theatre|performance|dance/.test(lower)) return "Arts & Culture";
  if (/tech|startup|ai|code|developer|hackathon|meetup|entrepreneur|venture|founder/.test(lower)) return "Tech & Business";
  if (/run|hike|bike|yoga|fitness|outdoor|park|trail|swim|sport|wellness/.test(lower)) return "Outdoors & Fitness";
  if (/family|kid|child|community|volunteer|nonprofit|charity/.test(lower)) return "Community";
  if (/class|learn|education|seminar|conference|summit|workshop/.test(lower)) return "Learning";
  if (/language|exchange|cultural|international/.test(lower)) return "Cultural";
  return "Events";
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
      const timeStr = line.trim();
      const titleLine = lines[i + 1]?.trim() || "";
      const venueLine = lines[i + 2]?.trim() || "";

      if (titleLine && titleLine.length > 3 && !REGISTER_LINK_FULL.test(titleLine) && !JUNK_LINE.test(titleLine)) {
        const hasVenue = (!REGISTER_LINK_FULL.test(venueLine) && !JUNK_LINE.test(venueLine) && !TIME_LINE.test(venueLine) && !DAY_HEADER.test(venueLine) && venueLine.length > 2);
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
        const description = descLines.length > 0
          ? descLines.join(" ")
          : `${titleLine} at ${venue} on ${currentDay} at ${timeStr}.`;

        events.push({
          title: titleLine,
          date: `${currentDay} at ${timeStr}`,
          venue,
          description,
          category: guessCategory(`${titleLine} ${description}`),
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
const DATE_COLON_LINE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2}):\s+(.+)/i;

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

function extractEventsFromEmail(email: FetchedEmail): EventItem[] {
  const raw = email.html ? stripHtml(email.html) : email.text;
  const cleaned = stripForwardedHeaders(raw);
  const lines = cleaned.split(/\n/).map(l => l.trim()).filter(l => l.length > 1);

  // Run all parsers and combine results
  const lumaEvents = parseLumaStyle(lines);
  const dateColonEvents = parseDateColonStyle(lines);
  // Only run generic if both structured parsers found nothing
  const genericEvents = (lumaEvents.length === 0 && dateColonEvents.length === 0)
    ? parseGenericEvents(lines)
    : [];

  // Combine with deduplication (luma first as highest quality)
  const combined = [...lumaEvents, ...dateColonEvents, ...genericEvents];
  const seen = new Set<string>();
  return combined.filter(e => {
    const key = e.title.toLowerCase().substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNewsletterEmail(email: FetchedEmail): boolean {
  const subjectLower = email.subject.toLowerCase();
  const fromLower = email.from.toLowerCase();

  // Hard exclusions: bounce messages, delivery failures
  if (/mailer-daemon|mail delivery subsystem/i.test(fromLower)) return false;
  if (/delivery status|mail delivery failed|undeliverable|bounce/i.test(subjectLower)) return false;

  // Hard exclusions: our own system emails (RSVP notifications, welcome emails)
  if (/wants to carpool|carpool interest|you're on the list|raj's austin events/i.test(subjectLower)) return false;

  // Hard exclusions: social/advertising noise
  if (/noreply@redditmail|reddit\.com/i.test(fromLower)) return false;
  if (/noreply@accounts\.google|google-account|googleads|ads-account-noreply/i.test(fromLower)) return false;

  // Accept known forwarded newsletter senders explicitly
  if (/rajpaj@gmail\.com|raj@customersuccessforgood\.com/i.test(fromLower)) return true;

  // Accept classic newsletter sender patterns
  if (/luma|beehiiv|mailchimp|substack|convertkit|constantcontact|sendgrid|klaviyo/i.test(fromLower)) return true;
  if (/noreply|no-reply|newsletter|digest|events|weekly/i.test(fromLower)) return true;

  // Accept if subject mentions events/newsletter keywords
  if (/newsletter|digest|weekly|events|happening|what's|upcoming|calendar|fwd:/i.test(subjectLower)) return true;

  return false;
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

export async function fetchEventsFromGmail(since?: Date, before?: Date, weekOf?: Date): Promise<EmailSourceResult> {
  const sinceDate = since || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  })();

  logger.info({ since: sinceDate, before, weekOf, user: GMAIL_USER }, "Fetching newsletter emails from Gmail");

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

  // Filter events to the target week if weekOf is provided
  let finalEvents = uniqueEvents;
  let weekFiltered = false;
  if (weekOf) {
    const inWeek = uniqueEvents.filter(e => eventFallsInWeek(e.date, weekOf));
    logger.info({ total: uniqueEvents.length, inWeek: inWeek.length, weekOf }, "Week-filtered events");
    if (inWeek.length >= 1) {
      // Sort events within the week by their date
      inWeek.sort((a, b) => {
        const da = parseEventDate(a.date, weekOf.getFullYear());
        const db2 = parseEventDate(b.date, weekOf.getFullYear());
        if (!da || !db2) return 0;
        return da.getTime() - db2.getTime();
      });
      finalEvents = inWeek;
      weekFiltered = true;
    }
  }

  const intro = newsletterEmails.length > 0
    ? `Happy Sunday, Austin! I went through ${newsletterEmails.length} newsletter${newsletterEmails.length === 1 ? "" : "s"} in my inbox this week and hand-picked the best events happening around the city. Here's your curated digest — get out there and enjoy Austin! 🤠`
    : "Happy Sunday, Austin! Here's your weekly curated guide to the best events in our city.";

  return {
    emails: newsletterEmails.length,
    events: finalEvents.slice(0, 8),
    intro,
    sources,
    weekFiltered,
  };
}
