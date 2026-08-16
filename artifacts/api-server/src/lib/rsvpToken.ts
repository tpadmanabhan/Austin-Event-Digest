import { createHmac, timingSafeEqual } from "crypto";

const RSVP_HMAC_SECRET = process.env.RSVP_HMAC_SECRET;

function payload(digestId: number, eventTitle: string, email: string): string {
  return `${digestId}:${eventTitle}:${email.toLowerCase()}`;
}

function weekPayload(weekOf: string, eventTitle: string, email: string): string {
  return `w:${weekOf}:${eventTitle}:${email.toLowerCase()}`;
}

export function signRsvpParams(
  digestId: number,
  eventTitle: string,
  email: string,
  _name?: string | null,
): string | null {
  if (!RSVP_HMAC_SECRET) return null;
  return createHmac("sha256", RSVP_HMAC_SECRET)
    .update(payload(digestId, eventTitle, email))
    .digest("base64url");
}

export function verifyRsvpSignature(
  digestId: number,
  eventTitle: string,
  email: string,
  _name: string | null | undefined,
  sig: string,
): boolean {
  if (!RSVP_HMAC_SECRET) return false;
  const expected = createHmac("sha256", RSVP_HMAC_SECRET)
    .update(payload(digestId, eventTitle, email))
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

/**
 * Sign an RSVP link using weekOf (YYYY-MM-DD) instead of a numeric digest ID.
 * This is stable across dev/prod environments where digest IDs differ for the
 * same week's content.
 */
export function signRsvpParamsByWeek(
  weekOf: string,
  eventTitle: string,
  email: string,
): string | null {
  if (!RSVP_HMAC_SECRET) return null;
  return createHmac("sha256", RSVP_HMAC_SECRET)
    .update(weekPayload(weekOf, eventTitle, email))
    .digest("base64url");
}

export function verifyRsvpSignatureByWeek(
  weekOf: string,
  eventTitle: string,
  email: string,
  sig: string,
): boolean {
  if (!RSVP_HMAC_SECRET) return false;
  const expected = createHmac("sha256", RSVP_HMAC_SECRET)
    .update(weekPayload(weekOf, eventTitle, email))
    .digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
