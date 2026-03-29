import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { logger } from "./logger";
import { EventItem } from "@workspace/db";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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

async function fetchRecentNewsletterEmails(since: Date): Promise<FetchedEmail[]> {
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
      const messages = client.fetch({ since }, { source: true, envelope: true });

      for await (const msg of messages) {
        try {
          const parsed: ParsedMail = await simpleParser(msg.source);
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

function stripHtml(html: string): string {
  return html
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
    .replace(/&#[0-9]+;/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\u200b|\u200c|\u200d|\uFEFF|\u00AD/g, "")
    .replace(/[\u{1F600}-\u{1FFFF}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Strip forwarded message headers to get the actual newsletter body
function stripForwardedHeaders(text: string): string {
  const forwardedIdx = text.indexOf("---------- Forwarded message");
  if (forwardedIdx === -1) return text;

  // Find where the actual body starts (after "To: ..." line)
  const afterHeader = text.indexOf("\n\n", forwardedIdx + 50);
  if (afterHeader === -1) return text.slice(forwardedIdx);

  return text.slice(afterHeader).trim();
}

const DAY_HEADER = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i;
const TIME_LINE = /^\d{1,2}:\d{2}\s*(am|pm)/i;
const DATE_LINE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[,.\s]+\d{1,2}/i;
const REGISTER_LINK = /^(register|rsvp|learn more|buy tickets?|sign up|details|↗)\s*$/i;
const JUNK_LINE = /^(https?:\/\/|unsubscribe|view online|privacy|copyright|\(c\)|©|forward|manage|preferences|\d{4} .{1,30} all rights|download the)/i;
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

      if (titleLine && titleLine.length > 3 && !REGISTER_LINK.test(titleLine) && !JUNK_LINE.test(titleLine)) {
        const venue = (!REGISTER_LINK.test(venueLine) && !JUNK_LINE.test(venueLine) && !TIME_LINE.test(venueLine) && venueLine.length > 2)
          ? venueLine
          : "Austin, TX";

        events.push({
          title: titleLine,
          date: `${currentDay} at ${timeStr}`,
          venue,
          description: `${titleLine} at ${venue} — ${currentDay} at ${timeStr}. Part of your Austin weekly events digest.`,
          category: guessCategory(titleLine),
          link: null,
          imageUrl: null,
        });

        i += (venue !== "Austin, TX") ? 3 : 2;
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
      line.length > 120 ||
      JUNK_LINE.test(line) ||
      REGISTER_LINK.test(line) ||
      ZERO_WIDTH_HEAVY.test(line) ||
      /^[a-z]/.test(line) ||
      DATE_LINE.test(line)
    ) continue;

    // Look ahead for a date within next 3 lines
    let dateStr = "";
    let venue = "Austin, TX";
    let desc = "";

    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j].trim();
      if (!dateStr && DATE_LINE.test(next) && next.length < 100) {
        dateStr = next;
      } else if (dateStr && !venue && next.length > 5 && next.length < 100 && !JUNK_LINE.test(next)) {
        venue = next;
      } else if (dateStr && next.length > 20 && !JUNK_LINE.test(next)) {
        desc = next.substring(0, 200);
        break;
      }
    }

    if (!dateStr) continue;

    const key = line.toLowerCase().substring(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      title: line,
      date: dateStr,
      venue,
      description: desc || `${line} — ${dateStr} in Austin, TX.`,
      category: guessCategory(line),
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

  // Try Luma-style parsing first (time-based listings)
  const lumaEvents = parseLumaStyle(lines);
  if (lumaEvents.length > 0) return lumaEvents;

  // Fall back to generic
  const genericEvents = parseGenericEvents(lines);
  if (genericEvents.length > 0) return genericEvents;

  return [];
}

function isNewsletterEmail(email: FetchedEmail): boolean {
  const subjectLower = email.subject.toLowerCase();
  const fromLower = email.from.toLowerCase();
  if (/unsubscribe|newsletter|digest|weekly|events|happening|what's|upcoming|calendar/i.test(subjectLower)) return true;
  if (/luma|beehiiv|mailchimp|substack|convertkit|constantcontact|sendgrid|klaviyo/i.test(fromLower)) return true;
  if (/noreply|no-reply|newsletter|digest|events/i.test(fromLower)) return true;
  return false;
}

export interface EmailSourceResult {
  emails: number;
  events: EventItem[];
  intro: string;
  sources: string[];
}

export async function fetchEventsFromGmail(since?: Date): Promise<EmailSourceResult> {
  const sinceDate = since || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  })();

  logger.info({ since: sinceDate, user: GMAIL_USER }, "Fetching newsletter emails from Gmail");

  const allEmails = await fetchRecentNewsletterEmails(sinceDate);
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

  const intro = newsletterEmails.length > 0
    ? `Happy Sunday, Austin! I went through ${newsletterEmails.length} newsletter${newsletterEmails.length === 1 ? "" : "s"} in my inbox this week and hand-picked the best events happening around the city. Here's your curated digest — get out there and enjoy Austin! 🤠`
    : "Happy Sunday, Austin! Here's your weekly curated guide to the best events in our city.";

  return {
    emails: newsletterEmails.length,
    events: uniqueEvents.slice(0, 8),
    intro,
    sources,
  };
}
