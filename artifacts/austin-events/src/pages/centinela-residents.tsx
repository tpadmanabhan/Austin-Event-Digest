import { useState } from "react";
import { useClerk } from "@clerk/react";
import { useGetCentinelaResidentPortal, getGetCentinelaResidentPortalQueryKey, useSetCentinelaActivityInterest, useSetCentinelaNewsletterSubscription } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Heart, Pin, Send } from "lucide-react";
import { Link } from "wouter";
import "./centinela.css";
import type { CentinelaOfficialLinks } from "./centinela-types";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export default function CentinelaResidents({ links = {} }: { links?: CentinelaOfficialLinks }) {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const portal = useGetCentinelaResidentPortal({ query: { queryKey: getGetCentinelaResidentPortalQueryKey() } });
  const interest = useSetCentinelaActivityInterest();
  const newsletter = useSetCentinelaNewsletterSubscription();
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const response = portal.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetCentinelaResidentPortalQueryKey() });

  const setInterest = (activityId: number, interested: boolean) => {
    setActionError(""); setSuccess("");
    interest.mutate({ activityId, data: { interested } }, {
      onSuccess: () => { setSuccess(interested ? "You’re on the interested list for this idea." : "Your interest has been removed."); refresh(); },
      onError: () => setActionError("We couldn’t save that just now. Please try again."),
    });
  };
  const setSubscribed = (subscribed: boolean) => {
    setActionError(""); setSuccess("");
    newsletter.mutate({ data: { subscribed } }, {
      onSuccess: () => { setSuccess(subscribed ? "You’re subscribed to community notes." : "You’ve been unsubscribed."); refresh(); },
      onError: () => setActionError("We couldn’t update your newsletter preference. Please try again."),
    });
  };

  return <main className="centinela"><div className="cv-container cv-portal">
    <header className="cv-header">
      <Link href="/" className="cv-brand" data-testid="link-resident-home"><span className="cv-mark" aria-hidden="true">C</span><span className="cv-brand-name">Centinela Ocean View</span><span className="cv-pilot-badge">Pilot</span></Link>
      <nav className="cv-nav" aria-label="Resident navigation"><Link href="/" data-testid="link-portal-public-home"><ArrowLeft size={14} /> Community home</Link><button type="button" onClick={() => { const path = import.meta.env.BASE_URL.replace(/\/$/, "") || "/"; void signOut({ redirectUrl: path }); }} data-testid="button-resident-sign-out">Sign out</button></nav>
    </header>
    {portal.isLoading ? <><div className="cv-skeleton" /><div className="cv-skeleton" /><div className="cv-skeleton" /></> :
      portal.isError ? <div className="cv-error" role="alert" data-testid="error-resident-portal"><strong>We couldn’t open the resident space.</strong><p>If you signed in with an email that hasn’t been approved, please contact your community administrator. Otherwise, try again in a moment.</p><button className="cv-button" onClick={() => portal.refetch()} data-testid="button-retry-resident-portal">Retry</button></div> :
      !response ? <div className="cv-empty" data-testid="empty-resident-portal">Resident information is not available yet.</div> : <>
        <section className="cv-portal-head">
          <div><div className="cv-eyebrow">Your community, together</div><h1>Good to see you.</h1><p>Welcome to the shared space for neighbors at Centinela Ocean View. Find the latest building notes and see what residents are hoping to do together.</p></div>
          <div className="cv-visually-muted" data-testid="text-resident-account">Signed in as {response.residentEmail}</div>
        </section>
        {success && <div className="cv-success" role="status" data-testid="status-resident-success">{success}</div>}
        {actionError && <div className="cv-error" role="alert" data-testid="error-resident-action">{actionError}</div>}
        <div className="cv-portal-grid">
          <section aria-labelledby="updates-heading">
            <h2 className="cv-column-title" id="updates-heading">Community notes <span className="cv-visually-muted">{response.updates.length} updates</span></h2>
            {response.updates.length === 0 ? <div className="cv-empty" data-testid="empty-resident-updates">There are no community notes yet. When there’s something to share, you’ll find it here.</div> :
              response.updates.map(update => <article className="cv-feed-card" key={update.id} data-testid={`card-resident-update-${update.id}`}>
                <div className="cv-event-meta">{update.category} · {dateLabel(update.createdAt)} {update.pinned && <span className="cv-tag"><Pin size={11} /> Pinned</span>}</div>
                <h3>{update.title}</h3><p>{update.body}</p>
              </article>)}
          </section>
          <aside>
            <section aria-labelledby="ideas-heading"><h2 className="cv-column-title" id="ideas-heading">Neighbor ideas</h2>
              <p className="cv-visually-muted">A show of interest helps neighbors see what might bring people together. These are proposals, not HOA-approved or scheduled events.</p>
              {response.activities.length === 0 ? <div className="cv-empty" data-testid="empty-resident-activities">No activities have been proposed yet. A good idea can start with one neighbor.</div> :
                response.activities.map(activity => <article className="cv-activity-card" key={activity.id} data-testid={`card-resident-activity-${activity.id}`}>
                  <div>{activity.isSample ? <span className="cv-tag cv-tag--sample">Sample proposal</span> : <span className="cv-tag">{activity.status === "archived" ? "Archived" : "Proposal"}</span>}</div>
                  <h3>{activity.title}</h3><p>{activity.description}</p>
                  {activity.isSample && <p><strong>Timing and location are TBD.</strong> This sample is for discussion only; it does not imply HOA approval.</p>}
                  {!activity.isSample && <div className="cv-event-meta">{activity.timingLabel} · {activity.location}</div>}
                  <div className="cv-interest"><small>{activity.interestCount} neighbor{activity.interestCount === 1 ? "" : "s"} interested. Names are never shown.</small>
                    <button type="button" className={`cv-button ${activity.interested ? "cv-button--quiet" : ""}`} disabled={interest.isPending || activity.status === "archived"} onClick={() => setInterest(activity.id, !activity.interested)} data-testid={`button-interest-activity-${activity.id}`} aria-pressed={activity.interested}><Heart size={14} />{activity.interested ? "Interested" : "I’m interested"}</button>
                  </div>
                </article>)}
            </section>
            <section className="cv-newsletter" aria-labelledby="newsletter-heading">
              <h3 id="newsletter-heading">A note from home</h3><p>Receive occasional community updates and neighbor-led ideas. Just the useful things, from this community.</p>
              <button className="cv-button cv-button--quiet" disabled={newsletter.isPending} onClick={() => setSubscribed(!response.newsletterSubscribed)} data-testid="button-newsletter-subscription" aria-pressed={response.newsletterSubscribed}><Send size={14} />{response.newsletterSubscribed ? "Subscribed — unsubscribe" : "Subscribe to community notes"}</button>
            </section>
            <section aria-label="Resident resources" className="cv-inline-links">
              {links.hoa && <a href={links.hoa} target="_blank" rel="noreferrer" data-testid="link-resident-hoa">Resident account <CalendarDays size={13} /></a>}
              {links.services && <a href={links.services} target="_blank" rel="noreferrer" data-testid="link-resident-services">Resident services <CalendarDays size={13} /></a>}
              {links.vendors && <a href={links.vendors} target="_blank" rel="noreferrer" data-testid="link-resident-vendors">Community vendors <CalendarDays size={13} /></a>}
            </section>
          </aside>
        </div>
      </>}
  </div></main>;
}
