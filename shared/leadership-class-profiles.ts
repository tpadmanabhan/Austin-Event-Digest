export interface LeadershipClassProfile {
  id: string;
  className: string;
  classRepName: string;
  classRepLinkedInUrl: string;
  teamWhatsAppUrl: string;
  teamLinkedInUrl: string;
  classPhotoUrl: string | null;
  classRepPhotoUrl: string | null;
}

export const DEFAULT_LEADERSHIP_CLASS_PROFILES: LeadershipClassProfile[] = [
  {
    id: "emerge-18",
    className: "LA Emerge 18-2025",
    classRepName: "Alexandria Robertson",
    classRepLinkedInUrl: "",
    teamWhatsAppUrl: "https://chat.whatsapp.com/BTUYOWtvqElAqCxD8ZwWGE?s=cl&p=i&mlu=4&ilr=4&iam=2as",
    teamLinkedInUrl: "https://www.linkedin.com/groups/14537139/",
    classPhotoUrl: "/api/storage/objects/uploads/8eb6e43d-3c3d-4718-8dcf-c9f5266a7261",
    classRepPhotoUrl: "/api/storage/objects/uploads/35b333a0-54a1-4921-8ee9-d8e90c5fd25a",
  },
];

export function leadershipClassProfilesOrDefault(
  profiles?: LeadershipClassProfile[] | null,
): LeadershipClassProfile[] {
  return profiles?.length ? profiles : DEFAULT_LEADERSHIP_CLASS_PROFILES;
}
