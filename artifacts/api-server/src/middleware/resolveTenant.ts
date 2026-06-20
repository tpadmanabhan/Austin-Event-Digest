import { type Request, type Response, type NextFunction } from "express";
import { db, tenantsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Returns true for known development/preview hosts where subdomain-based tenant routing
 * does not apply.  On these hosts the DEFAULT_TENANT_SLUG env var is used instead
 * so a single-host dev workflow routes to the right city without needing a real subdomain.
 *
 * Crucially, the production root domain (eventcarpooling.com) is NOT matched here, so
 * DEFAULT_TENANT_SLUG is never active in production.
 */
function isDevHost(hostname: string): boolean {
  const host = hostname.split(":")[0].toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  // Replit workspace preview domains — UUID/slug format, never real city subdomains
  if (host.endsWith(".replit.dev") || host.endsWith(".repl.co")) return true;
  return false;
}

/**
 * Extracts the tenant slug from the request.
 *
 * Priority / routing rules:
 * 1. X-Tenant-Slug request header  — dev/testing override (NODE_ENV !== 'production' only)
 * 2. Dev hosts (localhost, *.replit.dev, *.repl.co) — use DEFAULT_TENANT_SLUG env var.
 *    Subdomain extraction is intentionally skipped on these hosts because Replit preview
 *    domains contain long UUID-like slugs that are not real city identifiers.
 * 3. Production hosts — extract the leading subdomain from the Host header.
 *    "austin.eventcarpooling.com" → "austin".
 *    Root domain "eventcarpooling.com" (no subdomain) returns null — platform-only.
 */
function extractSlug(req: Request): string | null {
  // 1. Dev header override — never allowed in production
  if (process.env.NODE_ENV !== "production") {
    const headerSlug = req.headers["x-tenant-slug"];
    if (typeof headerSlug === "string" && headerSlug.trim()) {
      return headerSlug.trim().toLowerCase();
    }
  }

  // 2. Dev host — DEFAULT_TENANT_SLUG only; skip subdomain parsing entirely.
  //    This avoids misidentifying Replit preview UUIDs as city slugs.
  if (isDevHost(req.hostname)) {
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG;
    return defaultSlug?.trim() ? defaultSlug.trim().toLowerCase() : null;
  }

  // 3. Production: extract subdomain.
  //    "eventcarpooling.com"        → 2 parts → null (root domain, no tenant)
  //    "austin.eventcarpooling.com" → 3 parts → "austin"
  const host = req.hostname.split(":")[0];
  const parts = host.split(".");
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "api") {
    return parts[0].toLowerCase();
  }

  return null;
}

/**
 * Resolves the tenant from the request and attaches it to req.tenant.
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

/**
 * Guards a route to the platform root domain only.
 * Rejects requests that arrive via a city subdomain (i.e. req.tenant is set).
 *
 * In dev, DEFAULT_TENANT_SLUG routes a single host to a specific city, so requests
 * that reach here with req.tenant set are simulating a subdomain call.
 * In production, any resolved tenant means the caller is on a city subdomain.
 *
 * Apply to self-serve tenant creation routes so operators on one city's subdomain
 * cannot hit the onboarding API.
 */
export function requirePlatformRoot(req: Request, res: Response, next: NextFunction): void {
  if (req.tenant) {
    res.status(403).json({
      error: "forbidden",
      message: "This endpoint is only available on the platform root domain (eventcarpooling.com).",
    });
    return;
  }
  next();
}
