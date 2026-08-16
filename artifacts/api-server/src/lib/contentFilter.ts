/**
 * Adult-content / off-brand event blocklist.
 * Matched case-insensitively against event title and description at ingest time
 * and again at display time as a safety net.
 *
 * Extend without code changes by setting the ADULT_CONTENT_BLOCKLIST_EXTRA
 * environment variable to a comma-separated list of additional phrases:
 *   ADULT_CONTENT_BLOCKLIST_EXTRA="speakeasy,foam party,latex party"
 */
export const ADULT_CONTENT_BASE_PHRASES: string[] = [
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

function getExtraPhrases(): string[] {
  const raw = process.env["ADULT_CONTENT_BLOCKLIST_EXTRA"] ?? "";
  return raw
    .split(",")
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * The full active blocklist: base phrases + any env-var additions.
 * Called at filter time so env var changes take effect on the next request
 * without restarting the server.
 */
export function getBlocklist(): string[] {
  return [...ADULT_CONTENT_BASE_PHRASES, ...getExtraPhrases()];
}

// Keep backward-compatible export used by existing code
export const ADULT_CONTENT_BLOCKED_PHRASES = ADULT_CONTENT_BASE_PHRASES;

/**
 * Returns true when the event should be blocked.
 * Checks title + description against the full blocklist (base + env extras).
 */
export function isAdultContent(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return getBlocklist().some(phrase => text.includes(phrase.toLowerCase()));
}
