export const PUBLIC_DOMAIN = "irl.group";
export const PUBLIC_ORIGIN = `https://${PUBLIC_DOMAIN}`;

export function publicTenantUrl(slug: string): string {
  return `https://${slug}.${PUBLIC_DOMAIN}`;
}
