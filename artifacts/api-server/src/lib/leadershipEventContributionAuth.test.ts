import { afterEach, describe, expect, it } from "vitest";
import {
  signLeadershipContributionToken,
  verifyLeadershipContributionToken,
} from "./leadershipEventContributionAuth";

const originalSessionSecret = process.env.SESSION_SECRET;
const originalRsvpSecret = process.env.RSVP_HMAC_SECRET;

afterEach(() => {
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
  if (originalRsvpSecret === undefined) delete process.env.RSVP_HMAC_SECRET;
  else process.env.RSVP_HMAC_SECRET = originalRsvpSecret;
});

describe("Leadership Austin contributor email tokens", () => {
  it("scopes a signed token to its purpose, tenant, and expiry", () => {
    process.env.SESSION_SECRET = "unit-test-only-secret";
    const now = Date.now();
    const token = signLeadershipContributionToken({
      email: "alum@example.com",
      tenantId: 42,
      purpose: "verify",
      expiresAt: now + 2_000,
    });

    expect(token).not.toBeNull();
    expect(verifyLeadershipContributionToken(token!, "verify", 42, now + 1_000)?.email).toBe("alum@example.com");
    expect(verifyLeadershipContributionToken(token!, "session", 42, now + 1_000)).toBeNull();
    expect(verifyLeadershipContributionToken(token!, "verify", 43, now + 1_000)).toBeNull();
    expect(verifyLeadershipContributionToken(token!, "verify", 42, now + 2_000)).toBeNull();
  });

  it("rejects tampered, malformed, oversized, and unsigned tokens", () => {
    process.env.SESSION_SECRET = "unit-test-only-secret";
    const expiresAt = Date.now() + 10_000;
    const token = signLeadershipContributionToken({
      email: "alum@example.com",
      tenantId: 42,
      purpose: "session",
      expiresAt,
    })!;
    const [payload = "", signature = ""] = token.split(".");
    const changedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}`;

    expect(verifyLeadershipContributionToken(`${changedPayload}.${signature}`, "session", 42, expiresAt - 1_000)).toBeNull();
    expect(verifyLeadershipContributionToken("not-a-token", "session", 42, expiresAt - 1_000)).toBeNull();
    expect(verifyLeadershipContributionToken("x".repeat(2049), "session", 42, expiresAt - 1_000)).toBeNull();
    delete process.env.SESSION_SECRET;
    delete process.env.RSVP_HMAC_SECRET;
    expect(verifyLeadershipContributionToken(token, "session", 42, expiresAt - 1_000)).toBeNull();
  });
});
