import { useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  Mail,
  Users,
  Car,
  Trophy,
  Settings2,
  HelpCircle,
  CalendarPlus,
} from "lucide-react";

interface Section {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

function Accordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-primary">{section.icon}</span>
        <span className="font-serif font-bold text-base flex-1">{section.title}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 space-y-4 border-t border-border bg-card/50">
          {section.content}
        </div>
      )}
    </div>
  );
}

function GuideList({ items }: { items: { label: string; detail?: string }[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/60" />
          <span className="text-sm text-foreground/90">
            <span className="font-semibold">{item.label}</span>
            {item.detail && (
              <span className="text-muted-foreground"> — {item.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

const SECTIONS: Section[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Dashboard",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The first thing you see when you log in. Quick stats and your main action buttons.
        </p>
        <GuideList
          items={[
            { label: "Total Subscribers", detail: "How many people are signed up for your newsletter." },
            { label: "Editions Created", detail: "Total number of newsletter editions you've created." },
            { label: "Create a newsletter edition", detail: "Choose a date anchor, add optional notes, and create a draft from your tenant's event sources." },
            { label: "Quick Send Draft", detail: "Send the latest edition to your own email as a preview before sending it to subscribers." },
            { label: "First-run onboarding", detail: "A guided walkthrough to create, preview, and test your first newsletter edition." },
          ]}
        />
      </div>
    ),
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Newsletter Editions",
    content: (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Your main curation workspace. Pull events in from the web, add spotlights, and manage what gets sent.
        </p>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Generate from event sources</p>
          <GuideList
            items={[
              { label: "Source URLs", detail: "Paste up to 10 event listing URLs (Luma, Eventbrite, Meetup, etc.) and the system extracts events for the selected date window." },
              { label: "Target edition", detail: "Add extracted events to an existing edition or create a new one." },
              { label: "Save URLs", detail: "Your source URLs are remembered automatically and pre-filled next visit." },
            ]}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Add spotlights &amp; events manually</p>
          <GuideList
            items={[
              { label: "Business Spotlight", detail: "Paste a URL and write a title + blurb to highlight a local business." },
              { label: "Community Spotlight", detail: "Same as above, for community events or causes. You can add an optional deadline." },
              { label: "Single event from URL", detail: "Paste any event URL and hit Auto-fill to pre-populate title, date, venue, and description. Check ⭐ Special Event to feature it in the newsletter." },
            ]}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Managing events inside an edition</p>
          <GuideList
            items={[
              { label: "Expand an edition row", detail: "Click an edition to see all its events in a list." },
              { label: "Toggle Special Event (⭐)", detail: "Mark any event as featured — it appears at the top of the newsletter email." },
              { label: "Edit event details", detail: "Inline editing for title, description, date, venue, and category." },
              { label: "Remove past events", detail: "An amber warning appears if any events have already passed. One click removes all of them." },
              { label: "Send test email", detail: "Sends the edition to your own admin email so you can review it before sending." },
              { label: "Send to all subscribers", detail: "Sends the edition to your full subscriber list after a confirmation step." },
              { label: "Delete an edition", detail: "Permanently removes the edition and all its events." },
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Subscribers",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A read-only list of everyone subscribed to your newsletter.
        </p>
        <GuideList
          items={[
            { label: "Email", detail: "The subscriber's email address." },
            { label: "Name", detail: "Their display name if they provided one." },
            { label: "Subscribed date", detail: "When they signed up." },
            { label: "Status", detail: "Active or Unsubscribed — unsubscribed members won't receive future digests." },
          ]}
        />
      </div>
    ),
  },
  {
    icon: <Car className="w-5 h-5" />,
    title: "Carpoolers",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Track residents who requested carpools to events. The system handles matching and notification emails automatically.
        </p>
        <GuideList
          items={[
            { label: "Event", detail: "Which event the carpool request is for." },
            { label: "Requester", detail: "Name and email of the person who wants to carpool." },
            { label: "Request date", detail: "When they submitted the request." },
            { label: "Notification status", detail: "Whether the admin was notified and whether match emails were sent to both parties." },
          ]}
        />
      </div>
    ),
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "Superconnector",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A gamified view of your city's engagement. Earn XP by curating and sending digests, and see how your city stacks up against others.
        </p>
        <GuideList
          items={[
            { label: "XP &amp; City Rank", detail: "Total experience points earned, and your rank among all cities on the platform." },
            { label: "Current &amp; Longest Streak", detail: "How many consecutive weeks you've sent a digest, and your all-time best." },
            { label: "Weekly challenges", detail: "Progress bars for active challenges (e.g. 'Send 2 digests this week')." },
            { label: "Badges", detail: "Earned and locked achievement badges — hover to see how to unlock each one." },
            { label: "Leaderboard", detail: "Live ranking of all cities sorted by XP." },
          ]}
        />
      </div>
    ),
  },
  {
    icon: <Settings2 className="w-5 h-5" />,
    title: "Settings",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure your city's branding and account details. Changes take effect immediately.
        </p>
        <GuideList
          items={[
            { label: "Newsletter name", detail: "The display name shown in the nav, page title, and emails." },
            { label: "Admin email", detail: "Where login links and test digest sends go. Also used as the default when sending yourself a draft." },
            { label: "Accent color", detail: "The brand color used for buttons, links, and highlights. Updates the site theme live as you pick." },
            { label: "Event categories", detail: "Choose which categories (Tech, Music, Food, Wellness, Civics) are active. The AI will focus on events in these categories when generating digests." },
            { label: "Hero photo", detail: "A landscape banner image shown at the top of your city's public page. Max 3 MB." },
            { label: "Brand icon", detail: "A square logo shown in the nav bar and footer. Max 1 MB." },
          ]}
        />
      </div>
    ),
  },
];

export function AdminHelpTab({ isLeadershipAustin = false }: { isLeadershipAustin?: boolean }) {
  const leadershipSection: Section = {
    icon: <CalendarPlus className="w-5 h-5" />,
    title: "Subscriber event suggestions",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Active newsletter subscribers can suggest public events from the full edition page. Suggestions stay unpublished until an admin reviews them.
        </p>
        <GuideList
          items={[
            { label: "Review the queue", detail: "Open the subscriber event suggestions section at the top of Newsletter Editions. Check the date, venue, description, submitter, and public event link." },
            { label: "Approve or reject", detail: "Approval adds the event to the Leadership Austin site and future newsletter editions. It does not send an email. Rejected suggestions stay unpublished." },
            { label: "Add an event yourself", detail: "Enter the title, Central Time start, venue, category, source, and person or team to credit. The display date is created automatically; optional details are grouped separately." },
            { label: "Archive an event", detail: "Archiving removes it from the active public list without deleting its record." },
          ]}
        />
      </div>
    ),
  };

  const sections = isLeadershipAustin
    ? [...SECTIONS.slice(0, 2), leadershipSection, ...SECTIONS.slice(2).filter(section => section.title !== "Carpoolers")]
    : SECTIONS;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-xl text-foreground">Admin Guide</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything you can do as an admin — click any section to expand it.
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        {sections.map(section => (
          <Accordion key={section.title} section={section} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        This guide is only visible to admins. If something isn't working as expected, contact the platform team.
      </p>
    </div>
  );
}
