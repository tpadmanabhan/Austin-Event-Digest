import { type Request, type Response, type NextFunction } from "express";
import { db, tenantsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Extracts the tenant slug from the request.
 *
 * Priority:
 * 1. X-Tenant-Slug header  — dev/testing only (NODE_ENV !== 'production')
 * 2. Subdomain from Host header — e.g. "austin.eventcarpooling.com" → "austin"
 * 3. DEFAULT_TENANT_SLUG env var — fallback for Replit dev environments
 */
function extractSlug(req: Request): string | null {
  // 1. Dev header override — never allowed in production
  if (process.env.NODE_ENV !== "production") {
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.trim()) {
      return headerSlug.trim().toLowerCase();
    }
  }

  // 2. Subdomain extraction from hostname
  // Express sets req.hostname from the Host header (or X-Forwarded-Host when trust proxy is on).
  const host = req.hostname.split(":")[0]; // strip port if present
  const parts = host.split(".");
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "api") {
    return parts[0].toLowerCase();
  }

  // 3. Dev default slug (for Replit dev environment where there is no subdomain)
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG;
  if (defaultSlug?.trim()) return defaultSlug.trim().toLowerCase();

  return null;
}

/**
 * Resolves the tenant from the request subdomain and attaches it to req.tenant.
 *
 * - Known city slug → req.tenant is populated
 * - Unknown city slug → 404
 * - Root domain (no slug detected) → req.tenant is undefined; pass through for platform routes
 */
export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const slug = extractSlug(req);

  if (!slug) {
    // Root domain — no tenant context; platform-level endpoints handle this
    return next();
  }

  try {
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(and(eq(tenantsTable.slug, slug), eq(tenantsTable.isActive, true)))
      .limit(1);

    if (!tenant) {
      res.status(404).json({
        error: "not_found",
        message: `City "${slug}" is not yet available on this platform.`,
      });
      return;
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    logger.error({ err, slug }, "Error resolving tenant");
    res.status(500).json({ error: "server_error", message: "Failed to resolve city" });
  }
}

/**
 * Guards a route group to require a resolved tenant.
 * Apply after resolveTenant for all city-specific route groups.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenant) {
    res.status(404).json({
      error: "not_found",
      message:
        "This endpoint requires a city subdomain (e.g. austin.eventcarpooling.com/api/...).",
    });
    return;
  }
  next();
}
