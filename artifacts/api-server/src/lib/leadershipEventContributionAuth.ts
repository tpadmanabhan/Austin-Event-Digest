import { createHmac, timingSafeEqual } from "node:crypto";

export const LEADERSHIP_CONTRIBUTOR_COOKIE = "la_event_contributor";

export type LeadershipContributionTokenPurpose = "verify" | "session";

export interface LeadershipContributionClaims {
  email: string;
  tenantId: number;
  purpose: LeadershipContributionTokenPurpose;
  expiresAt: number;
}

function signingSecret(): string {
  return process.env.SESSION_SECRET || process.env.RSVP_HMAC_SECRET || "";
}

export function signLeadershipContributionToken(
  claims: LeadershipContributionClaims,
): string | null {
  const secret = signingSecret();
  if (!secret || !claims.email || !Number.isInteger(claims.tenantId) || claims.expiresAt <= Date.now()) {
    return null;
  }
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyLeadershipContributionToken(
  token: string,
  purpose: LeadershipContributionTokenPurpose,
  tenantId: number,
  now = Date.now(),
): LeadershipContributionClaims | null {
  const secret = signingSecret();
  if (!secret || !token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(parts[1], "base64url");
  } catch {
    return null;
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as LeadershipContributionClaims;
    if (
      typeof claims.email !== "string"
      || claims.email.length > 320
      || claims.purpose !== purpose
      || claims.tenantId !== tenantId
      || !Number.isFinite(claims.expiresAt)
      || claims.expiresAt <= now
    ) return null;
    return claims;
  } catch {
    return null;
  }
}
