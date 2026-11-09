export const COMMUNITY_TENANTS = {
  leadershipaustin: {
    name: "Leadership Austin",
    eventCategory: "Community",
    eventSourceName: "Leadership Austin community",
    timezone: "America/Chicago",
  },
  golf: {
    name: "Golf IRL",
    eventCategory: "Sports",
    eventSourceName: "Golf IRL community",
    timezone: "America/Chicago",
  },
} as const;

export type CommunityTenantSlug = keyof typeof COMMUNITY_TENANTS;

export function getCommunityTenantSettings(slug: string | null | undefined) {
  if (!slug || !(slug in COMMUNITY_TENANTS)) return null;
  return COMMUNITY_TENANTS[slug as CommunityTenantSlug];
}
