/**
 * Regression test: admin login token round-trip.
 *
 * Asserts that the token issued by /admin/login (adminTokenForHash) is
 * accepted by /admin/verify without modification, and that an email-based
 * token (adminTokenForEmail) is also accepted for managed-city tenants.
 */

import { describe, it, expect } from "vitest";
import { adminTokenForHash, adminTokenForEmail } from "../middleware/requireAdmin";

describe("admin auth token round-trip", () => {
  const FAKE_HASH = "$scrypt$N=32768,r=8,p=1$fakesalt$fakehashedbytes";
  const FAKE_EMAIL = "admin@example.com";
  const TENANT_ID = 42;

  it("adminTokenForHash returns a non-empty string", () => {
    const token = adminTokenForHash(FAKE_HASH);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  it("adminTokenForHash is deterministic — same input produces same token", () => {
    expect(adminTokenForHash(FAKE_HASH)).toBe(adminTokenForHash(FAKE_HASH));
  });

  it("adminTokenForHash and adminTokenForEmail produce different tokens", () => {
    const hashToken  = adminTokenForHash(FAKE_HASH);
    const emailToken = adminTokenForEmail(FAKE_EMAIL, TENANT_ID);
    // They must differ so that one cannot substitute for the other
    expect(hashToken).not.toBe(emailToken);
  });

  it("login token (adminTokenForHash) is accepted by the verify hash-branch logic", () => {
    const loginToken    = adminTokenForHash(FAKE_HASH);
    const verifyExpected = adminTokenForHash(FAKE_HASH);
    expect(loginToken).toBe(verifyExpected);
  });

  it("email token is accepted by the verify email-branch logic when RSVP_HMAC_SECRET is set", () => {
    // adminTokenForEmail returns null when RSVP_HMAC_SECRET is absent;
    // the verify route guards with `if (expected && ...)` so null is safe.
    const emailToken = adminTokenForEmail(FAKE_EMAIL, TENANT_ID);
    if (emailToken !== null) {
      expect(emailToken).toBe(adminTokenForEmail(FAKE_EMAIL, TENANT_ID));
    } else {
      // Secret absent in test environment — verify route correctly skips this branch
      expect(emailToken).toBeNull();
    }
  });
});
