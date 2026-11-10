import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarPlus, Check, Loader2, Pencil, X } from "lucide-react";
import type { LeadershipManagedEvent } from "@/hooks/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { centralDateTimeIso, formatCentralDateLabel } from "@/lib/leadership-event-dates";

type AdminEvent = LeadershipManagedEvent & {
  isActive: boolean;
  createdAt: string;
};

type PendingSubmission = AdminEvent & {
  submitterName: string;
  submitterEmail: string;
};

type FormState = {
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueAddress: string;
  description: string;
  category: string;
  organizer: string;
  link: string;
  sourceName: string;
  sourceAlumni: string;
};

function initialForm(categories: string[], tenantName: string, defaultCategory: string): FormState {
  return {
    title: "",
    startDate: "",
    endDate: "",
    venue: "",
    venueAddress: "",
    description: "",
    category: categories.includes(defaultCategory) ? defaultCategory : categories[0] ?? "",
    organizer: "",
    link: "",
    sourceName: tenantName,
    sourceAlumni: "",
  };
}

function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadAdminEvents(): Promise<AdminEvent[]> {
  const response = await fetch("/api/events/leadership-managed/admin", { headers: adminHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load the event list.");
  return data.events as AdminEvent[];
}

async function loadPendingSubmissions(): Promise<PendingSubmission[]> {
  const response = await fetch("/api/events/leadership-event-contributions/pending", { headers: adminHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load pending submissions.");
  return data.contributions as PendingSubmission[];
}

export function LeadershipManagedEventsAdmin({
  categories,
  tenantName = "Leadership Austin",
  tenantSlug = "leadershipaustin",
  defaultCategory = "Community",
}: {
  categories: string[];
  tenantName?: string;
  tenantSlug?: string;
  defaultCategory?: string;
}) {
  const queryClient = useQueryClient();
  const accent = tenantSlug === "golf" ? "#286551" : "#314363";
  const accentHighlight = tenantSlug === "golf" ? "#efc478" : "#4EBEE7";
  const [form, setForm] = useState<FormState>(() => initialForm(categories, tenantName, defaultCategory));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const eventsQuery = useQuery({
    queryKey: ["admin-managed-community-events", tenantSlug],
    queryFn: loadAdminEvents,
    staleTime: 30_000,
  });
  const pendingQuery = useQuery({
    queryKey: ["admin-community-event-contributions", tenantSlug],
    queryFn: loadPendingSubmissions,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDate = centralDateTimeIso(form.startDate);
      const endDate = form.endDate ? centralDateTimeIso(form.endDate) : null;
      if (!startDate || (form.endDate && !endDate)) throw new Error("Enter a valid date and time in Austin’s Central Time zone.");
      if (endDate && Date.parse(endDate) < Date.parse(startDate)) throw new Error("The end time must be after the start time.");
      const response = await fetch("/api/events/leadership-managed", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({
          title: form.title,
          date: formatCentralDateLabel(startDate, endDate),
          startDate,
          ...(endDate ? { endDate } : {}),
          timezone: "America/Chicago",
          venue: form.venue,
          venueAddress: form.venueAddress || undefined,
          description: form.description,
          category: form.category,
          organizer: form.organizer || undefined,
          link: form.link || null,
          sourceName: form.sourceName,
          sourceAlumni: form.sourceAlumni,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not add the event.");
      return data;
    },
    onSuccess: () => {
      setMessage(`Event added to the ${tenantName} event list.`);
      setError("");
      setForm(initialForm(categories, tenantName, defaultCategory));
      queryClient.invalidateQueries({ queryKey: ["admin-managed-community-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["community-managed-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["leadership-managed-events"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Could not add the event.");
      setMessage("");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/events/leadership-managed/${eventId}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not archive the event.");
      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-managed-community-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["community-managed-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["leadership-managed-events"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not archive the event."),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ eventId, description }: { eventId: number; description: string }) => {
      const response = await fetch(`/api/events/leadership-managed/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update the event description.");
      return eventId;
    },
    onSuccess: () => {
      setEditingEventId(null);
      setEditDescription("");
      setMessage("Event description updated.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["admin-managed-community-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["community-managed-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["leadership-managed-events"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Could not update the event description.");
      setMessage("");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ eventId, decision }: { eventId: number; decision: "approve" | "reject" }) => {
      const response = await fetch(`/api/events/leadership-event-contributions/${eventId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not review the submission.");
      return { eventId, decision };
    },
    onSuccess: ({ decision }) => {
      setMessage(decision === "approve" ? "Event approved and added to the public list." : "Event submission rejected.");
      setError("");
       queryClient.invalidateQueries({ queryKey: ["admin-community-event-contributions", tenantSlug] });
       queryClient.invalidateQueries({ queryKey: ["admin-managed-community-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["community-managed-events", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["leadership-managed-events"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Could not review the submission.");
      setMessage("");
    },
  });

  const setField = (field: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#314363]/20 bg-card shadow-sm" style={{ borderColor: `${accent}33` }} aria-labelledby="admin-managed-events-title">
      <div className="border-b border-[#314363]/15 px-6 py-5 text-white" style={{ borderColor: `${accent}33`, backgroundColor: accent }}>
        <p className="text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: accentHighlight }}>{tenantName} event list</p>
        <h3 id="admin-managed-events-title" className="mt-1 text-2xl font-bold uppercase">Upcoming events</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/70">Approved subscriber suggestions and admin-added events appear on the {tenantName} site and in future newsletter editions.</p>
      </div>

      <div className="space-y-6 p-6">
        <section aria-labelledby="leadership-event-submissions-title" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 id="leadership-event-submissions-title" className="text-sm font-bold text-foreground">
                Subscriber event suggestions
              </h4>
              {!pendingQuery.isLoading && !pendingQuery.isError && (
                <span className="mt-1 inline-flex rounded-full bg-[#314363]/10 px-2 py-0.5 text-[10px] font-semibold text-[#314363]">
                  {pendingQuery.data?.length ?? 0} awaiting review
                </span>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Review the event and submitter, then approve or reject it. Approval adds the event to the site and future newsletter previews; it does not send an email.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
              Refresh
            </Button>
          </div>
          {pendingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading submissions…</p>
          ) : pendingQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">{pendingQuery.error.message}</p>
          ) : pendingQuery.data?.length ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {pendingQuery.data.map((event) => (
                <li key={event.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date} · {event.venue}</p>
                    {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                    {event.link && (
                      <a href={event.link} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-medium text-primary underline">
                        Open event page
                      </a>
                    )}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Submitted by {event.submitterName} · <a className="underline" href={`mailto:${event.submitterEmail}`}>{event.submitterEmail}</a>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ eventId: event.id, decision: "approve" })}
                    >
                      {reviewMutation.isPending && reviewMutation.variables?.eventId === event.id && reviewMutation.variables.decision === "approve"
                        ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        : <Check className="mr-1 h-4 w-4" />}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ eventId: event.id, decision: "reject" })}
                    >
                      {reviewMutation.isPending && reviewMutation.variables?.eventId === event.id && reviewMutation.variables.decision === "reject"
                        ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        : <X className="mr-1 h-4 w-4" />}
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No subscriber event suggestions are waiting for review.
            </p>
          )}
        </section>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <h4 className="text-sm font-bold text-foreground">Add an event to the public list</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Event title" placeholder="Event title" value={form.title} required onChange={e => setField("title", e.target.value)} />
            <div>
              <label htmlFor="managed-event-start-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">Start date and time (Austin, Central Time)</label>
              <Input id="managed-event-start-date" type="datetime-local" value={form.startDate} required onChange={e => setField("startDate", e.target.value)} />
            </div>
            <Input aria-label="Venue" placeholder="Venue" value={form.venue} required onChange={e => setField("venue", e.target.value)} />
            <select
              aria-label="Category"
              value={form.category}
              required
              onChange={e => setField("category", e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <Input aria-label="Source name" placeholder="Source publication" value={form.sourceName} required onChange={e => setField("sourceName", e.target.value)} />
            <Input aria-label="Person or team to credit" placeholder="Person or team to credit" value={form.sourceAlumni} required onChange={e => setField("sourceAlumni", e.target.value)} />
          </div>
          <Textarea aria-label="Event description" placeholder="Short event description" value={form.description} required onChange={e => setField("description", e.target.value)} className="min-h-24" />
          <details className="rounded-xl border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">More details (optional)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="managed-event-end-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">End date and time (Austin, Central Time)</label>
                <Input id="managed-event-end-date" type="datetime-local" value={form.endDate} onChange={e => setField("endDate", e.target.value)} />
              </div>
              <Input aria-label="Venue address" placeholder="Venue address" value={form.venueAddress} onChange={e => setField("venueAddress", e.target.value)} />
              <Input aria-label="Organizer" placeholder="Organizer" value={form.organizer} onChange={e => setField("organizer", e.target.value)} />
              <Input aria-label="Event link" type="url" placeholder="Event details URL" value={form.link} onChange={e => setField("link", e.target.value)} />
            </div>
          </details>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          <Button type="submit" disabled={createMutation.isPending} className="gap-2 bg-[#314363] text-white hover:bg-[#253550]">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Add event
          </Button>
        </form>

        <div>
          <h4 className="mb-3 text-sm font-bold text-foreground">Current and archived events</h4>
          {eventsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading saved events…</p>
          ) : eventsQuery.isError ? (
            <p className="text-sm text-destructive">{eventsQuery.error.message}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {eventsQuery.data?.map(event => (
                <li key={event.id} className="flex items-start justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.date} · {event.venue} · Shared by {event.sourceAlumni}</p>
                      {tenantSlug === "golf" && (
                        <div className="mt-2 space-y-2">
                          {editingEventId === event.id ? (
                            <>
                              <Textarea
                                aria-label={`Description for ${event.title}`}
                                value={editDescription}
                                onChange={e => setEditDescription(e.target.value)}
                                className="min-h-24"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={updateDescriptionMutation.isPending || !editDescription.trim()}
                                  onClick={() => updateDescriptionMutation.mutate({
                                    eventId: event.id,
                                    description: editDescription,
                                  })}
                                >
                                  {updateDescriptionMutation.isPending && updateDescriptionMutation.variables?.eventId === event.id
                                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    : <Check className="mr-1.5 h-3.5 w-3.5" />}
                                  Save description
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={updateDescriptionMutation.isPending}
                                  onClick={() => {
                                    setEditingEventId(null);
                                    setEditDescription("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                aria-label={`Edit description for ${event.title}`}
                                onClick={() => {
                                  setEditingEventId(event.id);
                                  setEditDescription(event.description);
                                  setError("");
                                  setMessage("");
                                }}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Edit description
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {event.isActive ? "Active" : "Archived"}
                    </span>
                  </div>
                  {event.isActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={archiveMutation.isPending}
                      aria-label={`Archive ${event.title}`}
                      onClick={() => {
                        if (window.confirm(`Archive “${event.title}” from the public event list?`)) {
                          archiveMutation.mutate(event.id);
                        }
                      }}
                    >
                      <Archive className="mr-1.5 h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </li>
              ))}
              {!eventsQuery.data?.length && <li className="p-4 text-sm text-muted-foreground">No saved events yet.</li>}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
