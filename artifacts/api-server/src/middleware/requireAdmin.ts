import { type Request, type Response, type NextFunction } from "express";
import { createHmac } from "crypto";

/**
 * Derives the admin session token from a stored passwordHash.
 * The token is deterministic for a given hash, so changing the password
 * (which regenerates the hash) automatically invalidates all prior tokens.
 */
export function adminTokenForHash(passwordHash: string): string {
  return createHmac("sha256", passwordHash).update("admin-session").digest("hex");
}

/**
 * Derives the admin session token for an email-based admin.
 * Includes tenantId in the signing input so tokens are tenant-scoped:
 * the same adminEmail address on two different tenants yields different tokens.
 * Requires RSVP_HMAC_SECRET to be set — fails closed (returns null) when missing.
 */
export function adminTokenForEmail(adminEmail: string, tenantId: number): string | null {
  const secret = process.env.RSVP_HMAC_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`admin-email:${tenantId}:${adminEmail.toLowerCase()}`)
    .digest("hex");
}

export function parseAdminEmails(value: string | null | undefined): string[] {
  return [...new Set((value ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean))];
}

function verifyAdminToken(token: string | undefined, req: Request): boolean {
  if (!token) return false;

  // Password-based admin
  if (req.tenant?.passwordHash) {
    const expected = adminTokenForHash(req.tenant.passwordHash);
    if (token === expected) return true;
  }

  // Email-based admin (requires RSVP_HMAC_SECRET to be configured)
  const adminEmails = req.tenant?.adminEmails?.length
    ? req.tenant.adminEmails
    : parseAdminEmails(req.tenant?.adminEmail);
  if (req.tenant?.id) {
    for (const email of adminEmails) {
      const expected = adminTokenForEmail(email, req.tenant.id);
      if (expected && token === expected) return true;
    }
  }

  return false;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const bodyToken = typeof req.body?.token === "string" ? (req.body.token as string) : undefined;
  const token = headerToken ?? bodyToken;

  if (!verifyAdminToken(token, req)) {
    res.status(401).json({ error: "unauthorized", message: "Admin authentication required" });
    return;
  }

  next();
}
