/**
 * Only web URLs belong in public event links. An explicit blank/null clears the
 * link; omission is handled by the caller and leaves the saved URL unchanged.
 */
export function parseEventLink(value: unknown):
  { ok: true; link: string | null } | { ok: false } {
  if (value === null) return { ok: true, link: null };
  if (typeof value !== "string") return { ok: false };
  const link = value.trim();
  if (!link) return { ok: true, link: null };
  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return { ok: false };
    }
    return { ok: true, link };
  } catch {
    return { ok: false };
  }
}
