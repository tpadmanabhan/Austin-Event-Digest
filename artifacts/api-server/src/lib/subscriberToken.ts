import { createHmac, timingSafeEqual } from "crypto";

// Uses SESSION_SECRET (already in use for admin sessions) so no extra secret is needed.
const SECRET = process.env.SESSION_SECRET || process.env.RSVP_HMAC_SECRET || "";

function payload(email: string): string {
  return `subscriber-prefs:${email.toLowerCase()}`;
}

/**
 * Sign an email address to generate a one-click preferences link token.
 * Returns null when no secret is configured (the preferences link is simply
 * omitted from the email footer).
 */
export function signSubscriberToken(email: string): string | null {
  if (!SECRET) return null;
  return createHmac("sha256", SECRET)
    .update(payload(email))
    .digest("base64url");
}

/**
 * Verify a subscriber token for the preferences endpoint.
 */
export function verifySubscriberToken(email: string, token: string): boolean {
  if (!SECRET || !token) return false;
  const expected = createHmac("sha256", SECRET)
    .update(payload(email))
    .digest("base64url");
  try {
    return timingSafeEqual(
      Buffer.from(expected, "base64url"),
      Buffer.from(token, "base64url"),
    );
  } catch {
    return false;
  }
}
