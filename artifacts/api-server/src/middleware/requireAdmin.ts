import { type Request, type Response, type NextFunction } from "express";
import { createHmac } from "crypto";

function verifyAdminToken(token: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !token) return false;
  const expected = createHmac("sha256", adminPassword).update("admin-session").digest("hex");
  return token === expected;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "unauthorized", message: "Admin authentication required" });
    return;
  }

  next();
}
