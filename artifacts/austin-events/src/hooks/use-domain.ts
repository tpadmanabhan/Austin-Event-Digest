const PLATFORM_DOMAIN = "eventcarpooling.com";
const DEV_DEFAULT_SLUG = (import.meta.env.VITE_TENANT_SLUG as string | undefined) ?? "austin";

export interface DomainInfo {
  isPlatformRoot: boolean;
  citySlug: string | null;
}

export function useDomain(): DomainInfo {
  const hostname = window.location.hostname;

  if (hostname === PLATFORM_DOMAIN) {
    return { isPlatformRoot: true, citySlug: null };
  }

  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const subdomain = hostname.slice(0, hostname.length - PLATFORM_DOMAIN.length - 1);
    const slug = subdomain.split(".").pop() ?? subdomain;
    return { isPlatformRoot: false, citySlug: slug };
  }

  return { isPlatformRoot: false, citySlug: DEV_DEFAULT_SLUG };
}
