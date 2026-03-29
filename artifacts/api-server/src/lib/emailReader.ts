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
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  const emails: FetchedEmail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const messages = client.fetch(
        { since },
        { source: true, envelope: true }
      );

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
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractEventsFromEmail(email: FetchedEmail): EventItem[] {
  const events: EventItem[] = [];
  const content = email.html ? stripHtml(email.html) : email.text;

  const lines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);

  const datePatterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i,
    /\d{1,2}\/\d{1,2}(\/\d{2,4})?/,
    /\b\d{1,2}:\d{2}\s*(am|pm)\b/i,
  ];

  const timePattern = /\b\d{1,2}:\d{2}\s*(am|pm)\b/i;
  const venueKeywords = /\b(at|venue|location|place|address|theater|theatre|hall|park|center|centre|club|bar|restaurant|café|cafe|museum|gallery|stage)\b/i;

  let currentTitle = "";
  let currentDate = "";
  let currentVenue = "";
  let currentDesc: string[] = [];

  const flushEvent = () => {
    if (currentTitle && currentDate) {
      events.push({
        title: currentTitle,
        date: currentDate,
        venue: currentVenue || email.from,
        description: currentDesc.join(" ").substring(0, 300) || currentTitle,
        category: guessCategory(currentTitle + " " + currentDesc.join(" ")),
        link: null,
        imageUrl: null,
      });
    }
    currentTitle = "";
    currentDate = "";
    currentVenue = "";
    currentDesc = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const hasDate = datePatterns.some(p => p.test(line));
    const hasTime = timePattern.test(line);
    const hasVenue = venueKeywords.test(line);

    if ((hasDate || hasTime) && line.length < 120) {
      if (!currentDate) {
        currentDate = line;
      } else if (!currentVenue && hasVenue) {
        currentVenue = line;
      } else {
        flushEvent();
        currentDate = line;
      }
    } else if (line.length > 10 && line.length < 80 && !hasDate && !currentTitle) {
      currentTitle = line;
    } else if (hasVenue && !currentVenue && line.length < 150) {
      currentVenue = line;
    } else if (currentTitle && line.length > 20) {
      currentDesc.push(line);
    }
  }
  flushEvent();

  if (events.length === 0 && email.subject) {
    events.push({
      title: email.subject,
      date: email.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      venue: "Austin, TX",
      description: (email.text || content).substring(0, 300),
      category: guessCategory(email.subject),
      link: null,
      imageUrl: null,
    });
  }

  return events.slice(0, 10);
}

function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/music|concert|band|live|jazz|blues|country|rock/.test(lower)) return "Music";
  if (/food|eat|restaurant|taco|bbq|market|farm|chef|dinner|brunch/.test(lower)) return "Food & Markets";
  if (/art|gallery|exhibit|museum|show|theater|theatre|film|movie|comedy/.test(lower)) return "Arts & Culture";
  if (/tech|startup|ai|code|developer|hackathon|meetup|workshop/.test(lower)) return "Tech & Business";
  if (/run|hike|bike|yoga|fitness|outdoor|park|trail|swim/.test(lower)) return "Outdoors & Fitness";
  if (/family|kid|child|community|volunteer|nonprofit/.test(lower)) return "Community";
  return "Events";
}

export interface EmailSourceResult {
  emails: number;
  events: EventItem[];
  intro: string;
}

export async function fetchEventsFromGmail(since?: Date): Promise<EmailSourceResult> {
  const sinceDate = since || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  })();

  logger.info({ since: sinceDate, user: GMAIL_USER }, "Fetching newsletter emails from Gmail");

  const emails = await fetchRecentNewsletterEmails(sinceDate);
  logger.info({ count: emails.length }, "Fetched emails from Gmail");

  const allEvents: EventItem[] = [];
  for (const email of emails) {
    const events = extractEventsFromEmail(email);
    allEvents.push(...events);
  }

  const uniqueEvents = allEvents.filter(
    (e, idx, arr) => arr.findIndex(x => x.title === e.title) === idx
  );

  const intro = emails.length > 0
    ? `Happy Sunday, Austin! Here's your curated weekly digest, pulled fresh from my inbox this week. I've gone through ${emails.length} newsletter${emails.length === 1 ? "" : "s"} to find the best events happening around the city. Get out there and enjoy Austin!`
    : "Happy Sunday, Austin! Here's your weekly events guide. Enjoy the city!";

  return {
    emails: emails.length,
    events: uniqueEvents.slice(0, 8),
    intro,
  };
}
