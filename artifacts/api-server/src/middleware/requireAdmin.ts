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

function verifyAdminToken(token: string | undefined, req: Request): boolean {
  if (!token) return false;

  // Require the tenant's passwordHash to be set — no global ADMIN_PASSWORD fallback.
  // If passwordHash is null the tenant hasn't finished setup; treat as unauthorized.
  if (!req.tenant?.passwordHash) return false;

  const expected = adminTokenForHash(req.tenant.passwordHash);
  return token === expected;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Accept token from the Authorization header (preferred) or request body (legacy)
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
