import { RiLinkedinBoxFill, RiWhatsappFill } from "react-icons/ri";
import {
  leadershipClassProfilesOrDefault,
  type LeadershipClassProfile,
} from "../../../../shared/leadership-class-profiles";

type Variant = "light" | "dark";

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function LeadershipClassProfiles({
  profiles,
  variant = "light",
}: {
  profiles?: LeadershipClassProfile[] | null;
  variant?: Variant;
}) {
  const classes = leadershipClassProfilesOrDefault(profiles);
  const linkColor = variant === "dark" ? "text-[#FFBA01]" : "text-[#314363]";
  const nameColor = variant === "dark" ? "text-white" : "text-[#314363]";
  const metaColor = variant === "dark" ? "text-white/70" : "text-slate-600";
  const socialLinks = (profile: LeadershipClassProfile) => [
    profile.classRepLinkedInUrl
      ? { href: safeExternalUrl(profile.classRepLinkedInUrl), label: "Class rep LinkedIn profile", icon: "linkedin" as const }
      : null,
    profile.teamWhatsAppUrl
      ? { href: safeExternalUrl(profile.teamWhatsAppUrl), label: "Team WhatsApp group", icon: "whatsapp" as const }
      : null,
    profile.teamLinkedInUrl
      ? { href: safeExternalUrl(profile.teamLinkedInUrl), label: "Team LinkedIn group", icon: "linkedin" as const }
      : null,
  ].filter((link): link is NonNullable<typeof link> => !!link?.href);

  return (
    <div className="mt-4 space-y-5">
      {classes.map((profile) => (
        <article key={profile.id} className="border-t border-current/15 pt-3">
          {profile.classPhotoUrl && (
            <img
              src={profile.classPhotoUrl}
              alt={`${profile.className} class photo`}
              className="mb-3 max-h-32 w-full rounded-md border border-current/10 object-contain object-center"
            />
          )}
          <h3 className={`text-sm font-bold ${nameColor}`}>{profile.className}</h3>
          <div className="mt-2 flex items-center gap-3">
            {profile.classRepPhotoUrl && (
              <img
                src={profile.classRepPhotoUrl}
                alt={profile.classRepName}
                className="h-14 w-14 shrink-0 rounded-full border-2 border-[#FFBA01] object-cover"
              />
            )}
            <div>
              <p className={`text-sm font-semibold ${nameColor}`}>{profile.classRepName}</p>
              <p className={`text-xs font-medium tracking-wide ${metaColor}`}>Class Rep</p>
            </div>
          </div>
          {socialLinks(profile).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {socialLinks(profile).map((link) => (
                <a
                  key={`${profile.id}-${link.label}`}
                  href={link.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className={`inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline underline-offset-2 hover:opacity-80 ${linkColor}`}
                >
                  {link.icon === "whatsapp"
                    ? <RiWhatsappFill aria-hidden="true" className="h-4 w-4 text-[#25D366]" />
                    : <RiLinkedinBoxFill aria-hidden="true" className="h-4 w-4 text-[#0A66C2]" />}
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
