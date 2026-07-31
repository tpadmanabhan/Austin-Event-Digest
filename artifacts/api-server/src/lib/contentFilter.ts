/**
 * Adult-content / off-brand event blocklist.
 * Matched case-insensitively against event title and description at ingest time
 * and again at display time as a safety net.
 *
 * Easy to extend — add phrases here and they take effect on the next ingest run.
 */
export const ADULT_CONTENT_BLOCKED_PHRASES: string[] = [
  "drag queen",
  "burlesque",
  "strip club",
  "stripclub",
  "gentlemen's club",
  "gentlemens club",
  "adult comedy",
  "adult entertainment",
  "adult show",
  "adult cabaret",
  "lingerie party",
  "erotic",
  "nude",
  "naked",
  "naughty",
  "XXX",
];

/**
 * Returns true when the event should be blocked.
 * Checks title + description against the blocklist.
 */
export function isAdultContent(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return ADULT_CONTENT_BLOCKED_PHRASES.some(phrase => text.includes(phrase.toLowerCase()));
}
