---
name: Tenant-specific dev previews
description: Visually checking city-specific routes in the shared development environment
---

The normal app-preview screenshot host resolves to the default Austin tenant. A route reserved for another tenant, such as AustinCares `/full`, therefore shows a 404 even when that route works on the intended hostname.

**Why:** A screenshot of the ordinary development preview gave a misleading 404 while the same development server rendered AustinCares correctly with a tenant hostname.

**How to apply:** For visual testing of a non-default tenant, use a local headless browser with a host-resolver rule mapping the tenant's domain to `127.0.0.1`, disable the browser proxy, and browse through the shared local proxy on port 80. Do not treat the default-host 404 as an application failure.