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
 * Stable as long as RSVP_HMAC_SECRET doesn't change.
 */
export function adminTokenForEmail(adminEmail: string): string {
  const secret = process.env.RSVP_HMAC_SECRET || "email-admin-dev-fallback";
  return createHmac("sha256", secret).update(`admin-email:${adminEmail.toLowerCase()}`).digest("hex");
}

function verifyAdminToken(token: string | undefined, req: Request): boolean {
  if (!token) return false;

  // Password-based admin
  if (req.tenant?.passwordHash) {
    const expected = adminTokenForHash(req.tenant.passwordHash);
    if (token === expected) return true;
  }

  // Email-based admin
  if (req.tenant?.adminEmail) {
    const expected = adminTokenForEmail(req.tenant.adminEmail);
    if (token === expected) return true;
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
