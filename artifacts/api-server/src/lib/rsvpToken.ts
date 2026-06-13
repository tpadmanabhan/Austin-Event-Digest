import { createHmac, timingSafeEqual } from "crypto";

const RSVP_HMAC_SECRET = process.env.RSVP_HMAC_SECRET;

function payload(digestId: number, eventTitle: string, email: string, name: string | null | undefined): string {
  return `${digestId}:${eventTitle}:${email.toLowerCase()}:${name || ""}`;
}

export function signRsvpParams(
  digestId: number,
  eventTitle: string,
  email: string,
  name?: string | null,
): string | null {
  if (!RSVP_HMAC_SECRET) return null;
  return createHmac("sha256", RSVP_HMAC_SECRET)
    .update(payload(digestId, eventTitle, email, name))
    .digest("base64url");
}

export function verifyRsvpSignature(
  digestId: number,
  eventTitle: string,
  email: string,
  name: string | null | undefined,
  sig: string,
): boolean {
  if (!RSVP_HMAC_SECRET) return false;
  const expected = createHmac("sha256", RSVP_HMAC_SECRET)
    .update(payload(digestId, eventTitle, email, name))
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
