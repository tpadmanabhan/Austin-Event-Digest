import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarPlus, Loader2 } from "lucide-react";
import type { LeadershipManagedEvent } from "@/hooks/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminEvent = LeadershipManagedEvent & {
  isActive: boolean;
  createdAt: string;
};

type FormState = {
  title: string;
  date: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueAddress: string;
  description: string;
  category: string;
  organizer: string;
  link: string;
  sourceName: string;
  sourceUrl: string;
  sourceAlumni: string;
};

const initialForm: FormState = {
  title: "",
  date: "",
  startDate: "",
  endDate: "",
  venue: "",
  venueAddress: "",
  description: "",
  category: "Community",
  organizer: "",
  link: "",
  sourceName: "The Austin Common",
  sourceUrl: "https://theaustincommon.com/events/",
  sourceAlumni: "Amy Stansbury",
};

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

export function LeadershipManagedEventsAdmin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const eventsQuery = useQuery({
    queryKey: ["admin-leadership-managed-events"],
    queryFn: loadAdminEvents,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(form.startDate);
      const end = form.endDate ? new Date(form.endDate) : null;
      if (!Number.isFinite(start.getTime()) || (end && !Number.isFinite(end.getTime()))) {
        throw new Error("Enter a valid start and end time.");
      }
      const response = await fetch("/api/events/leadership-managed", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({
          ...form,
          startDate: start.toISOString(),
          ...(end ? { endDate: end.toISOString() } : {}),
          timezone: "America/Chicago",
          link: form.link || null,
          sourceUrl: form.sourceUrl || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not add the event.");
      return data;
    },
    onSuccess: () => {
      setMessage("Event added to the persistent alumni list.");
      setError("");
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["admin-leadership-managed-events"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-leadership-managed-events"] });
      queryClient.invalidateQueries({ queryKey: ["leadership-managed-events"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not archive the event."),
  });

  const setField = (field: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#314363]/20 bg-card shadow-sm" aria-labelledby="admin-managed-events-title">
      <div className="border-b border-[#314363]/15 bg-[#314363] px-6 py-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#4EBEE7]">Persistent event list</p>
        <h3 id="admin-managed-events-title" className="mt-1 text-2xl font-bold uppercase">Alumni-sourced upcoming events</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/70">These events stay separate from Leadership Austin programs and appear on Austin’s community feed.</p>
      </div>

      <div className="space-y-6 p-6">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Event title" placeholder="Event title" value={form.title} required onChange={e => setField("title", e.target.value)} />
            <Input aria-label="Event date label" placeholder="Date and time shown to visitors" value={form.date} required onChange={e => setField("date", e.target.value)} />
            <Input aria-label="Event start time" type="datetime-local" value={form.startDate} required onChange={e => setField("startDate", e.target.value)} />
            <Input aria-label="Event end time" type="datetime-local" value={form.endDate} onChange={e => setField("endDate", e.target.value)} />
            <Input aria-label="Venue" placeholder="Venue" value={form.venue} required onChange={e => setField("venue", e.target.value)} />
            <Input aria-label="Venue address" placeholder="Venue address (optional)" value={form.venueAddress} onChange={e => setField("venueAddress", e.target.value)} />
            <Input aria-label="Category" placeholder="Category" value={form.category} required onChange={e => setField("category", e.target.value)} />
            <Input aria-label="Organizer" placeholder="Organizer (optional)" value={form.organizer} onChange={e => setField("organizer", e.target.value)} />
            <Input aria-label="Event link" type="url" placeholder="Event details URL (optional)" value={form.link} onChange={e => setField("link", e.target.value)} />
            <Input aria-label="Source name" placeholder="Source publication" value={form.sourceName} required onChange={e => setField("sourceName", e.target.value)} />
            <Input aria-label="Source URL" type="url" placeholder="Source list URL (optional)" value={form.sourceUrl} onChange={e => setField("sourceUrl", e.target.value)} />
            <Input aria-label="Alumni source" placeholder="Alumni source person" value={form.sourceAlumni} required onChange={e => setField("sourceAlumni", e.target.value)} />
          </div>
          <Textarea aria-label="Event description" placeholder="Short event description" value={form.description} required onChange={e => setField("description", e.target.value)} className="min-h-24" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          <Button type="submit" disabled={createMutation.isPending} className="gap-2 bg-[#314363] text-white hover:bg-[#253550]">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Add persistent event
          </Button>
        </form>

        <div>
          <h4 className="mb-3 text-sm font-bold text-foreground">Saved events</h4>
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
