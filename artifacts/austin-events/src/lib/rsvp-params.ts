/** Decode the UTF-8 base64url values used by newsletter RSVP links. */
export function decodeRsvpParam(value: string | null): string {
  if (!value) return "";
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    // Preserve every original character, including any leading BOM, because
    // the RSVP signature is checked against the exact event title.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    // Keep the existing fallback for missing/invalid encoded parameters.
    return value;
  }
}