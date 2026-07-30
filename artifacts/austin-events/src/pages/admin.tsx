import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useNewsletterSubscriptions } from "@/hooks/use-newsletter";
import { useAllDigests, useGenerateDigest, useSendDigest, useDeleteDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Settings2, Plus, Send, CheckCircle2, Trash2, Sparkles, ExternalLink, Tag, Rocket, Eye, Loader2, Car, Trophy, Link, Globe, BookmarkCheck, MapPin, RefreshCw, Pencil, Check, X, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/tenant-context";
import { useQueryClient } from "@tanstack/react-query";
import { AdminSettingsTab } from "@/components/admin-settings-tab";
import { useAdminRsvps } from "@/hooks/use-rsvps";
import { SuperconnectorTab } from "@/components/superconnector-tab";
import { AdminHelpTab } from "@/components/admin-help-tab";

type FirstRunStep = "generate" | "preview" | "ready";

// ---------------------------------------------------------------------------
// Geocode coverage badge — Austin only
// ---------------------------------------------------------------------------
interface GeocovData { total: number; geocoded: number; missing: number }

function GeocovBadge({ digestId }: { digestId: number }) {
  const [data, setData] = useState<GeocovData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeocoding, setRegeocoding] = useState(false);

  const fetchCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}/geocode-coverage`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json() as GeocovData;
        setData(json);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [digestId]);

  useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

  const onReGeocode = async () => {
    setRegeocoding(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`/api/events/digest/${digestId}/regeocoded`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Poll for updated coverage — geocoding is async so wait a few seconds
      setTimeout(() => fetchCoverage().then(() => setRegeocoding(false)), 8000);
    } catch {
      setRegeocoding(false);
    }
  };

  if (loading) return <span className="text-[10px] text-muted-foreground/60">…</span>;
  if (!data || data.total === 0) return null;

  const allGeocoded = data.missing === 0;
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${allGeocoded ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
        <MapPin className="w-2.5 h-2.5" />
        {data.geocoded}/{data.total} geocoded {allGeocoded ? "✓" : "⚠️"}
      </span>
      {!allGeocoded && (
        <button
          onClick={onReGeocode}
          disabled={regeocoding}
          title="Re-geocode missing events"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${regeocoding ? "animate-spin" : ""}`} />
          {regeocoding ? "Geocoding…" : "Re-geocode"}
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const { data: subsData, isLoading: loadingSubs } = useNewsletterSubscriptions();
  const { data: digestsData, isLoading: loadingDigests } = useAllDigests();
  
  const { data: rsvpsData, isLoading: loadingRsvps } = useAdminRsvps();
  const { mutate: generate, isPending: isGenerating } = useGenerateDigest();
  const { mutate: send, isPending: isSending } = useSendDigest();
  const { mutate: deleteDigest, isPending: isDeleting } = useDeleteDigest();

  const [firstRunStep, setFirstRunStep] = useState<FirstRunStep>("generate");
  const [firstRunDigestId, setFirstRunDigestId] = useState<number | null>(null);
  const [firstRunPreviewHtml, setFirstRunPreviewHtml] = useState<string | null>(null);
  const [firstRunPreviewLoading, setFirstRunPreviewLoading] = useState(false);
  const [firstRunTestEmail, setFirstRunTestEmail] = useState("");

  async function fetchPreviewHtml(digestId: number) {
    setFirstRunPreviewLoading(true);
    setFirstRunPreviewHtml(null);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/digest/${digestId}/preview-html`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as { html: string };
        setFirstRunPreviewHtml(data.html);
      }
    } catch {
      // preview unavailable — operator can still proceed
    } finally {
      setFirstRunPreviewLoading(false);
    }
  }

  async function dismissFirstRun() {
    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch("/api/admin/dismiss-first-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-config", tenant.slug] });
    } catch {
      // non-critical — banner just stays visible
    }
  }

  const currentSunday = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    // Sacramento weeks start Saturday; all others start Sunday
    const diff = tenant.slug === "sacramento"
      ? (day === 6 ? 0 : 6 - day)   // next/current Saturday
      : (day === 0 ? 0 : 7 - day);  // next/current Sunday
    d.setDate(d.getDate() + diff);
    return d.toISOString().substring(0, 10);
  }, [tenant.slug]);

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [weekOfInput, setWeekOfInput] = useState(currentSunday);

  const [sourceUrls, setSourceUrls] = useState<string[]>(new Array(10).fill(""));
  const [sourceWeekOf, setSourceWeekOf] = useState(currentSunday);
  const [sourceTargetDigestId, setSourceTargetDigestId] = useState<number | null>(null);
  const [isGeneratingFromSources, setIsGeneratingFromSources] = useState(false);
  const [sourceResults, setSourceResults] = useState<Array<{ url: string; eventCount: number; error?: string }> | null>(null);
  const [lastGeneratedDigest, setLastGeneratedDigest] = useState<{ eventCount: number; digestId: number } | null>(null);

  const [expandedDigestId, setExpandedDigestId] = useState<number | null>(null);
  const [spotlightDigestId, setSpotlightDigestId] = useState<number | null>(null);
  const [bizUrl, setBizUrl] = useState("");
  const [bizTitle, setBizTitle] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [isAddingBiz, setIsAddingBiz] = useState(false);
  const [commUrl, setCommUrl] = useState("");
  const [commTitle, setCommTitle] = useState("");
  const [commDesc, setCommDesc] = useState("");
  const [commDeadline, setCommDeadline] = useState("");
  const [isAddingComm, setIsAddingComm] = useState(false);
  const [eventUrl, setEventUrl] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const [draftDigestId, setDraftDigestId] = useState<number | null>(null);
  const [sendDialogTarget, setSendDialogTarget] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const [editingVenue, setEditingVenue] = useState<{ digestId: number; eventIdx: number } | null>(null);
  const [venueEditValue, setVenueEditValue] = useState("");
  const [isSavingVenue, setIsSavingVenue] = useState(false);

  const [togglingFeatured, setTogglingFeatured] = useState<{ digestId: number; eventIdx: number } | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ digestId: number; eventIdx: number } | null>(null);
  const [eventEditFields, setEventEditFields] = useState({ title: "", date: "", venue: "", category: "", description: "" });
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isFetchingEventUrl, setIsFetchingEventUrl] = useState(false);
  const [eventFeatured, setEventFeatured] = useState(false);
  const [removingStale, setRemovingStale] = useState<number | null>(null);

  // Geocode coverage for the Send dialog (Austin only)
  const [sendDialogGeocov, setSendDialogGeocov] = useState<GeocovData | null>(null);
  const [sendDialogGeocovLoading, setSendDialogGeocovLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAdminEmail() {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch("/api/admin/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as { tenant?: { adminEmail?: string | null } };
        if (!cancelled && data.tenant?.adminEmail) {
          setTestEmail(data.tenant.adminEmail);
        }
      } catch {
        // non-critical — admin can type their email manually
      }
    }
    loadAdminEmail();
    return () => { cancelled = true; };
  }, []);

  // Load saved admin inputs from localStorage on mount
  useEffect(() => {
    const slug = tenant.slug;
    try {
      const savedUrls = localStorage.getItem(`admin_source_urls_${slug}`);
      if (savedUrls) {
        const parsed = JSON.parse(savedUrls) as string[];
        if (Array.isArray(parsed)) setSourceUrls([...parsed.slice(0, 10), ...Array(10).fill("")].slice(0, 10));
      }
      const savedBiz = localStorage.getItem(`admin_biz_${slug}`);
      if (savedBiz) {
        const p = JSON.parse(savedBiz) as { url?: string; title?: string; desc?: string };
        if (p.url) setBizUrl(p.url);
        if (p.title) setBizTitle(p.title);
        if (p.desc) setBizDesc(p.desc);
      }
      const savedComm = localStorage.getItem(`admin_comm_${slug}`);
      if (savedComm) {
        const p = JSON.parse(savedComm) as { url?: string; title?: string; desc?: string; deadline?: string };
        if (p.url) setCommUrl(p.url);
        if (p.title) setCommTitle(p.title);
        if (p.desc) setCommDesc(p.desc);
        if (p.deadline) setCommDeadline(p.deadline);
      }
    } catch {
      // non-critical — localStorage may be unavailable or corrupt
    }
  }, [tenant.slug]);

  // Keep draftDigestId pointed at the most recent digest when digests load/change,
  // unless the user has already made a manual selection.
  useEffect(() => {
    if (digestsData?.digests && digestsData.digests.length > 0 && draftDigestId === null) {
      setDraftDigestId(digestsData.digests[0].id);
    }
  }, [digestsData, draftDigestId]);

  // Auto-select the latest unsent digest for spotlight pickers so events
  // land in the right place without requiring a manual selection.
  useEffect(() => {
    if (digestsData?.digests && digestsData.digests.length > 0 && spotlightDigestId === null) {
      const latestDraft = digestsData.digests.find(d => !d.sentAt) ?? digestsData.digests[0];
      setSpotlightDigestId(latestDraft.id);
    }
  }, [digestsData]); // intentionally omit spotlightDigestId so manual overrides stick

  // Auto-save sourceUrls to localStorage 600ms after any change
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`admin_source_urls_${tenant.slug}`, JSON.stringify(sourceUrls));
    }, 600);
    return () => clearTimeout(timer);
  }, [sourceUrls, tenant.slug]);

  const handleSaveUrls = () => {
    localStorage.setItem(`admin_source_urls_${tenant.slug}`, JSON.stringify(sourceUrls));
    toast({ title: "Source URLs saved", description: "They'll be pre-filled next time you visit." });
  };

  const handleSaveBiz = () => {
    localStorage.setItem(`admin_biz_${tenant.slug}`, JSON.stringify({ url: bizUrl, title: bizTitle, desc: bizDesc }));
    toast({ title: "Business spotlight saved", description: "URL, title & description will be pre-filled next visit." });
  };

  const handleSaveComm = () => {
    localStorage.setItem(`admin_comm_${tenant.slug}`, JSON.stringify({ url: commUrl, title: commTitle, desc: commDesc, deadline: commDeadline }));
    toast({ title: "Community spotlight saved", description: "URL, title & description will be pre-filled next visit." });
  };

  const onGenerateFromSources = async () => {
    const urls = sourceUrls.filter(u => u.trim().startsWith("http"));
    if (urls.length === 0) {
      toast({ variant: "destructive", title: "No valid URLs", description: "Enter at least one URL starting with http." });
      return;
    }
    setIsGeneratingFromSources(true);
    setSourceResults(null);
    try {
      const token = sessionStorage.getItem("admin_token");
      const body: Record<string, unknown> = { urls, weekOf: sourceWeekOf };
      if (sourceTargetDigestId !== null) body.digestId = sourceTargetDigestId;
      const res = await fetch("/api/events/digest/generate-from-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { digest?: { id: number; events?: unknown[] } | null; eventsFound?: number; sourceResults?: Array<{ url: string; eventCount: number; error?: string }>; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to generate");
      setSourceResults(data.sourceResults ?? []);
      const eventsFound = data.eventsFound ?? (Array.isArray(data.digest?.events) ? data.digest.events.length : 0);
      if (eventsFound === 0) {
        toast({ variant: "destructive", title: "No events extracted", description: "These URLs couldn't be scraped (likely JavaScript-rendered pages). Try a direct event listing URL or Eventbrite/Meetup." });
      } else {
        const digestId = data.digest?.id ?? null;
        if (digestId !== null) setLastGeneratedDigest({ eventCount: eventsFound, digestId });
        queryClient.invalidateQueries({ queryKey: ["digests"] });
        const action = sourceTargetDigestId !== null ? "merged into digest" : "new digest created";
        toast({ title: `${eventsFound} event${eventsFound !== 1 ? "s" : ""} extracted — ${action}!` });
      }
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to generate", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsGeneratingFromSources(false);
    }
  };

  const onAddSpotlight = async (type: "business" | "community") => {
    const url = type === "business" ? bizUrl : commUrl;
    const title = type === "business" ? bizTitle : commTitle;
    const desc = type === "business" ? bizDesc : commDesc;
    if (!url.trim().startsWith("http")) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Enter a URL starting with http." });
      return;
    }
    type === "business" ? setIsAddingBiz(true) : setIsAddingComm(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      let targetDigestId = spotlightDigestId;

      // No digest selected — create a new empty one for the upcoming week
      if (targetDigestId === null) {
        const createRes = await fetch("/api/events/digest/create-empty", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ weekOf: currentSunday }),
        });
        const createData = await createRes.json() as { digest?: { id: number }; message?: string };
        if (!createRes.ok) throw new Error(createData.message || "Failed to create digest");
        targetDigestId = createData.digest!.id;
        setSpotlightDigestId(targetDigestId);
        queryClient.invalidateQueries({ queryKey: ["digests"] });
      }

      const body: Record<string, string> = { url: url.trim(), type };
      if (title.trim()) body.title = title.trim();
      if (desc.trim()) body.description = desc.trim();
      if (type === "community" && commDeadline.trim()) body.deadline = commDeadline.trim();
      const res = await fetch(`/api/events/digest/${targetDigestId}/spotlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to add spotlight");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      toast({ title: `${type === "business" ? "Business" : "Community"} spotlight added to digest #${targetDigestId}!` });
      if (type === "business") { setBizUrl(""); setBizTitle(""); setBizDesc(""); }
      else { setCommUrl(""); setCommTitle(""); setCommDesc(""); setCommDeadline(""); }
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to add spotlight", description: err instanceof Error ? err.message : String(err) });
    } finally {
      type === "business" ? setIsAddingBiz(false) : setIsAddingComm(false);
    }
  };

  const onAddEvent = async () => {
    if (!eventUrl.trim().startsWith("http")) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Enter a URL starting with http." });
      return;
    }
    setIsAddingEvent(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      let targetDigestId = spotlightDigestId;
      if (targetDigestId === null) {
        const createRes = await fetch("/api/events/digest/create-empty", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ weekOf: currentSunday }),
        });
        const createData = await createRes.json() as { digest?: { id: number }; message?: string };
        if (!createRes.ok) throw new Error(createData.message || "Failed to create digest");
        targetDigestId = createData.digest!.id;
        setSpotlightDigestId(targetDigestId);
        queryClient.invalidateQueries({ queryKey: ["digests"] });
      }
      const body: Record<string, unknown> = { url: eventUrl.trim(), type: "event", featured: eventFeatured };
      if (eventTitle.trim()) body.title = eventTitle.trim();
      if (eventDesc.trim()) body.description = eventDesc.trim();
      if (eventDate.trim()) body.date = eventDate.trim();
      if (eventVenue.trim()) body.venue = eventVenue.trim();
      if (eventCategory.trim()) body.category = eventCategory.trim();
      const res = await fetch(`/api/events/digest/${targetDigestId}/spotlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to add event");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      toast({ title: `Event added to digest #${targetDigestId}!` });
      setEventUrl(""); setEventTitle(""); setEventDesc(""); setEventDate(""); setEventVenue(""); setEventCategory(""); setEventFeatured(false);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to add event", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsAddingEvent(false);
    }
  };

  const onFetchEventUrl = async () => {
    if (!eventUrl.trim().startsWith("http")) {
      toast({ variant: "destructive", title: "Enter a URL first" });
      return;
    }
    let targetId = spotlightDigestId;
    if (targetId === null && digestsData?.digests?.length) targetId = digestsData.digests[0].id;
    if (targetId === null) { toast({ variant: "destructive", title: "Select a digest first" }); return; }
    setIsFetchingEventUrl(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${targetId}/parse-event-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: eventUrl.trim() }),
      });
      const data = await res.json() as { success?: boolean; event?: { title?: string; date?: string; venue?: string; description?: string }; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to parse URL");
      const ev = data.event || {};
      if (ev.title) setEventTitle(ev.title);
      if (ev.date) setEventDate(ev.date);
      if (ev.venue) setEventVenue(ev.venue);
      if (ev.description) setEventDesc(ev.description);
      toast({ title: "Fields auto-filled from URL — review before adding" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Couldn't auto-fill", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsFetchingEventUrl(false);
    }
  };

  const onRemoveStaleEvents = async (digestId: number, events: any[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const MONTH_MAP: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const isStale = (ev: any): boolean => {
      if (!ev.date || ev.isPost || ev.isBusinessSpotlight || ev.featured) return false;
      const m = String(ev.date).match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
      if (!m) return false;
      const key = m[1].substring(0,3);
      const month = MONTH_MAP[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
      if (month === undefined) return false;
      return new Date(today.getFullYear(), month, parseInt(m[2], 10)) < today;
    };
    const fresh = events.filter((ev: any) => !isStale(ev));
    const staleCount = events.length - fresh.length;
    if (staleCount === 0) { toast({ title: "No past events found" }); return; }
    setRemovingStale(digestId);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ events: fresh }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to update");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      toast({ title: `Removed ${staleCount} past event${staleCount > 1 ? "s" : ""}` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRemovingStale(null);
    }
  };

  const onSaveVenue = async (digestId: number, eventIdx: number) => {
    const venue = venueEditValue.trim();
    if (!venue) return;
    setIsSavingVenue(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}/events/${eventIdx}/venue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ venue }),
      });
      const data = await res.json() as { success?: boolean; event?: { lat?: number | null; lng?: number | null }; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to update venue");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      setEditingVenue(null);
      const geocodeMsg = data.event?.lat != null ? "Venue updated and geocoded ✓" : "Venue updated — geocoding not found";
      toast({ title: geocodeMsg });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to update venue", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSavingVenue(false);
    }
  };

  const onToggleFeatured = async (digestId: number, eventIdx: number) => {
    const digest = (digestsData as any)?.digests?.find((d: any) => d.id === digestId);
    if (!digest) return;
    const events = (digest.events as any[]).map((ev: any, idx: number) =>
      idx === eventIdx ? { ...ev, featured: !ev.featured } : ev
    );
    setTogglingFeatured({ digestId, eventIdx });
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      const nowFeatured = events[eventIdx].featured;
      toast({ title: nowFeatured ? "⭐ Marked as Special Event" : "Removed Special Event tag" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update event" });
    } finally {
      setTogglingFeatured(null);
    }
  };

  const onSaveEventFields = async (digestId: number, eventIdx: number) => {
    const digest = (digestsData as any)?.digests?.find((d: any) => d.id === digestId);
    if (!digest) return;
    setIsSavingEvent(true);
    try {
      const events = (digest.events as any[]).map((ev: any, idx: number) =>
        idx === eventIdx
          ? {
              ...ev,
              title: eventEditFields.title.trim() || ev.title,
              date: eventEditFields.date.trim() || ev.date,
              venue: eventEditFields.venue.trim() !== "" ? eventEditFields.venue.trim() : ev.venue,
              category: eventEditFields.category || ev.category,
              description: eventEditFields.description.trim() !== "" ? eventEditFields.description.trim() : ev.description,
            }
          : ev
      );
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`/api/events/digest/${digestId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      setEditingEvent(null);
      toast({ title: "Event updated" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update event" });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const onDelete = (digestId: number) => {
    deleteDigest(digestId, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Digest deleted." });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to delete", description: err.message });
      },
    });
  };

  const onGenerate = () => {
    generate(
      { data: { customNotes, ...(weekOfInput ? { weekOf: weekOfInput } : {}) } },
      {
        onSuccess: (data: any) => {
          setIsGenerateOpen(false);
          setCustomNotes("");
          const eventCount = Array.isArray(data?.digest?.events) ? (data.digest.events as unknown[]).length : 0;
          const digestId = typeof data?.digest?.id === "number" ? data.digest.id : null;
          if (digestId !== null) setLastGeneratedDigest({ eventCount, digestId });
          toast({ title: "Digest generated successfully!" });
          if (tenant.firstRun) {
            const newDigestId = data.digest.id;
            setFirstRunDigestId(newDigestId);
            setFirstRunStep("preview");
            fetchPreviewHtml(newDigestId);
          }
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Failed to generate", description: err.message });
        }
      }
    );
  };

  // Fetch geocode coverage when the Send dialog opens (Austin only)
  useEffect(() => {
    if (sendDialogTarget === null || tenant.slug !== "austin") {
      setSendDialogGeocov(null);
      return;
    }
    let cancelled = false;
    setSendDialogGeocovLoading(true);
    setSendDialogGeocov(null);
    const token = sessionStorage.getItem("admin_token");
    fetch(`/api/events/digest/${sendDialogTarget}/geocode-coverage`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() as Promise<GeocovData> : null)
      .then(data => { if (!cancelled && data) setSendDialogGeocov(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSendDialogGeocovLoading(false); });
    return () => { cancelled = true; };
  }, [sendDialogTarget, tenant.slug]);

  const onSend = (digestId: number, isTest: boolean) => {
    send(
      { data: { digestId, testEmail: isTest ? testEmail : undefined } },
      {
        onSuccess: () => {
          setSendDialogTarget(null);
          toast({ title: isTest ? "Test email sent!" : "Digest sent to all subscribers!" });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Failed to send", description: err.message });
        }
      }
    );
  };

  const stats = [
    { label: "Total Subscribers", value: subsData?.total || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Digests Created", value: digestsData?.digests?.length || 0, icon: Mail, color: "text-primary", bg: "bg-primary/10" },
  ];

  const MANAGED_CITIES = [
    { slug: "austin",      label: "Austin" },
    { slug: "portland",    label: "Portland" },
    { slug: "sacramento",  label: "Sacramento" },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* City switcher — quick nav between managed subdomains */}
        <div className="flex items-center gap-1 mb-8 p-1 bg-muted/50 border border-border rounded-xl w-fit">
          {MANAGED_CITIES.map(city => {
            const isActive = tenant.slug === city.slug;
            return isActive ? (
              <span
                key={city.slug}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-card shadow-sm text-foreground border border-border/60"
              >
                {city.label}
              </span>
            ) : (
              <a
                key={city.slug}
                href={`https://${city.slug}.eventcarpooling.com/admin`}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
              >
                {city.label}
              </a>
            );
          })}
        </div>

        {/* FIRST-RUN BANNER — prompt state */}
        {tenant.firstRun && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_50%)] opacity-10 pointer-events-none" />

            {/* Step 1: Generate */}
            {firstRunStep === "generate" && (
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-foreground">Welcome to {tenant.name}! 🎉</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Generate your first digest to start discovering events in {tenant.city.split(",")[0]}. It only takes a minute.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => setIsGenerateOpen(true)}
                    className="rounded-xl shadow-md gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" /> Generate first digest
                  </Button>
                  <a
                    href={`https://${tenant.slug}.eventcarpooling.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" /> Live site
                  </a>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {firstRunStep === "preview" && (
              <div className="relative space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                    <Eye className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-serif font-bold text-foreground">Preview your newsletter</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      This is exactly what your subscribers will receive. Send a test to yourself before going live.
                    </p>
                  </div>
                </div>

                {/* Email preview iframe */}
                <div className="rounded-xl overflow-hidden border border-border bg-white shadow-sm" style={{ height: 460 }}>
                  {firstRunPreviewLoading ? (
                    <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Building preview…
                    </div>
                  ) : firstRunPreviewHtml ? (
                    <iframe
                      srcDoc={firstRunPreviewHtml}
                      className="w-full h-full"
                      sandbox="allow-same-origin"
                      title="Email newsletter preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-sm px-6 text-center">
                      <Eye className="w-8 h-8 opacity-30" />
                      <p>Preview unavailable — you can still send a test email below.</p>
                    </div>
                  )}
                </div>

                {/* Test email CTA */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-card rounded-xl border border-border p-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-primary" /> Send a test email
                    </p>
                    <p className="text-xs text-muted-foreground">Verify delivery and formatting in your inbox before going live.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      value={firstRunTestEmail}
                      onChange={(e) => setFirstRunTestEmail(e.target.value)}
                      className="rounded-lg sm:w-56"
                    />
                    <Button
                      disabled={isSending || !firstRunTestEmail || firstRunDigestId === null}
                      onClick={() => {
                        if (firstRunDigestId === null) return;
                        send(
                          { data: { digestId: firstRunDigestId, testEmail: firstRunTestEmail } },
                          {
                            onSuccess: () => {
                              toast({ title: "Test email sent! Check your inbox." });
                              setFirstRunStep("ready");
                            },
                            onError: (err) => {
                              toast({ variant: "destructive", title: "Failed to send test", description: err.message });
                            },
                          }
                        );
                      }}
                      className="rounded-lg gap-1.5 shrink-0"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send test
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground rounded-lg shrink-0"
                    onClick={() => setFirstRunStep("ready")}
                  >
                    Skip →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Ready */}
            {firstRunStep === "ready" && (
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-600/25">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-serif font-bold text-foreground">You're all set! 🚀</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your newsletter looks great. Use the <strong>Send…</strong> button on any digest to broadcast to your subscribers whenever you're ready.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={dismissFirstRun}
                  className="rounded-xl shrink-0 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS BANNER — shown after digest generates (non-first-run) */}
        {lastGeneratedDigest && !tenant.firstRun && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border-2 border-green-500/30 bg-green-500/5 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#22c55e_0%,transparent_50%)] opacity-10 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/25">
                <Rocket className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-serif font-bold text-foreground">
                  First digest created — {lastGeneratedDigest.eventCount} event{lastGeneratedDigest.eventCount !== 1 ? "s" : ""} found!
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Send a test email to yourself before blasting to subscribers, or view the live site.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="rounded-xl gap-2 border-green-500/40 hover:border-green-500/70 hover:bg-green-500/5"
                  onClick={() => setSendDialogTarget(lastGeneratedDigest.digestId)}
                >
                  <Send className="w-4 h-4" /> Send test email
                </Button>
                <a
                  href={`https://${tenant.slug}.eventcarpooling.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-green-500/40 transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> View live site
                </a>
                <button
                  onClick={() => setLastGeneratedDigest(null)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 transition-colors"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-primary" /> 
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage your {tenant.name} newsletter</p>
          </div>
          <Button 
            onClick={() => setIsGenerateOpen(true)}
            className="rounded-xl shadow-md gap-2"
          >
            <Plus className="w-4 h-4" /> Generate New Digest
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}

          {/* Quick-action: draft selected digest to admin */}
          {digestsData?.digests && digestsData.digests.length > 0 && (() => {
            const selected = digestsData.digests.find(d => d.id === draftDigestId) ?? digestsData.digests[0];
            return (
              <div className="bg-primary/5 border-2 border-primary/20 p-6 rounded-2xl shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Send Draft</p>
                    <p className="text-xs text-muted-foreground truncate">{selected.subject}</p>
                  </div>
                </div>
                <select
                  value={draftDigestId ?? ""}
                  onChange={e => setDraftDigestId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {digestsData.digests.map(d => (
                    <option key={d.id} value={d.id}>
                      #{d.id} · {format(parseISO(new Date(d.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")} · {Array.isArray(d.events) ? d.events.length : 0} events
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full rounded-xl"
                  disabled={isSending || !testEmail || !selected}
                  onClick={() => {
                    send(
                      { data: { digestId: selected.id, testEmail } },
                      {
                        onSuccess: () => toast({ title: `Draft sent to ${testEmail}` }),
                        onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
                      }
                    );
                  }}
                >
                  {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                  Send Draft to My Email
                </Button>
                <p className="text-xs text-center text-muted-foreground truncate">{testEmail}</p>
              </div>
            );
          })()}
          {/* Active Categories card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/10 text-secondary shrink-0">
                <Tag className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Active Categories</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tenant.categories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="digests" className="w-full">
          <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="digests" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Weekly Digests</TabsTrigger>
            <TabsTrigger value="subscribers" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Subscribers List</TabsTrigger>
            <TabsTrigger value="carpoolers" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Car className="w-3.5 h-3.5 mr-1.5" />
              Carpoolers
              {rsvpsData && rsvpsData.total > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-xs font-bold">{rsvpsData.total}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="superconnector" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Superconnector
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Settings</TabsTrigger>
            <TabsTrigger value="help" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Help</TabsTrigger>
          </TabsList>
          
          <TabsContent value="digests" className="space-y-6 mt-0">
            {/* SOURCE URL FORM */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Generate from Event Sources</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Paste up to 10 event page URLs (Luma, Eventbrite, Meetup, org sites, etc.) and AI will extract this week's events</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {sourceUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
                      <Input
                        type="url"
                        placeholder={(() => {
                          const city = tenant.city.split(",")[0].trim();
                          const citySlug = city.toLowerCase().replace(/\s+/g, "-");
                          if (i === 0) return `https://lu.ma/${citySlug}`;
                          if (i === 1) return `https://eventbrite.com/d/events/?location=${encodeURIComponent(city)}`;
                          if (i === 2) return `https://meetup.com/find/?location=${encodeURIComponent(city)}`;
                          return "https://example.com/events";
                        })()}
                        value={url}
                        onChange={e => setSourceUrls(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        className="rounded-xl text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleSaveUrls} className="rounded-xl gap-2 text-xs">
                    <BookmarkCheck className="w-3.5 h-3.5" /> Save URLs
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end pt-2 border-t border-border">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Week (Sunday)</label>
                    <Input
                      type="date"
                      value={sourceWeekOf}
                      onChange={e => setSourceWeekOf(e.target.value)}
                      className="rounded-xl w-44"
                    />
                    {sourceWeekOf && (
                      <p className="text-xs text-muted-foreground">
                        Events from <strong>{format(new Date(sourceWeekOf + "T12:00:00"), "MMM d")}</strong> – <strong>{format(new Date(new Date(sourceWeekOf + "T12:00:00").getTime() + 6 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}</strong>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add to existing digest (optional)</label>
                    <select
                      value={sourceTargetDigestId ?? ""}
                      onChange={e => setSourceTargetDigestId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Create new digest —</option>
                      {digestsData?.digests?.map(d => (
                        <option key={d.id} value={d.id}>
                          #{d.id} · {format(parseISO(new Date(d.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")} · {Array.isArray(d.events) ? d.events.length : 0} events
                        </option>
                      ))}
                    </select>
                    {sourceTargetDigestId !== null && (
                      <p className="text-xs text-muted-foreground">Extracted events will be merged into digest #{sourceTargetDigestId}</p>
                    )}
                  </div>
                  <Button
                    onClick={onGenerateFromSources}
                    disabled={isGeneratingFromSources || sourceUrls.every(u => !u.trim())}
                    className="rounded-xl gap-2 shrink-0"
                  >
                    {isGeneratingFromSources ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Extracting events…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> {sourceTargetDigestId !== null ? "Extract & Merge" : "Generate from Sources"}</>
                    )}
                  </Button>
                </div>

                {sourceResults && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source Results</p>
                    <div className="grid gap-1.5">
                      {sourceResults.map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${r.error ? "bg-destructive/5 border border-destructive/20" : r.eventCount > 0 ? "bg-green-50 border border-green-200" : "bg-muted/50 border border-border"}`}>
                          <Link className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1 font-mono text-muted-foreground">{r.url}</span>
                          {r.error ? (
                            <span className="text-destructive font-medium shrink-0">Failed</span>
                          ) : (
                            <span className={`font-semibold shrink-0 ${r.eventCount > 0 ? "text-green-700" : "text-muted-foreground"}`}>{r.eventCount} event{r.eventCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BUSINESS SPOTLIGHT CARD */}
            <div className="bg-card rounded-2xl border border-sky-200 dark:border-sky-900 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-sky-800 dark:text-sky-200">Business Spotlight</h3>
                  <p className="text-xs text-sky-600/80 dark:text-sky-400/80 mt-0.5">Feature a local business — title &amp; description auto-filled from the URL</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add to Digest</label>
                  <select
                    value={spotlightDigestId ?? ""}
                    onChange={e => setSpotlightDigestId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Create new digest —</option>
                    {digestsData?.digests?.map(d => (
                      <option key={d.id} value={d.id}>
                        #{d.id} · {format(parseISO(new Date(d.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")} · {Array.isArray(d.events) ? d.events.length : 0} events
                      </option>
                    ))}
                  </select>
                  {spotlightDigestId === null && (
                    <p className="text-xs text-muted-foreground">A new digest for the week of {currentSunday} will be created automatically.</p>
                  )}
                </div>
                <Input
                  type="url"
                  placeholder="https://example.com/business-story"
                  value={bizUrl}
                  onChange={e => setBizUrl(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <Input
                  type="text"
                  placeholder="Title (auto-filled from URL)"
                  value={bizTitle}
                  onChange={e => setBizTitle(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <Textarea
                  placeholder="Description (auto-filled from URL)"
                  value={bizDesc}
                  onChange={e => setBizDesc(e.target.value)}
                  className="rounded-xl text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => onAddSpotlight("business")}
                    disabled={isAddingBiz || !bizUrl.trim()}
                    className="rounded-xl gap-2 bg-sky-500 hover:bg-sky-600 text-white flex-1"
                  >
                    {isAddingBiz ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Trophy className="w-4 h-4" /> Add Business Spotlight</>}
                  </Button>
                  <Button variant="outline" onClick={handleSaveBiz} title="Save for next visit" className="rounded-xl shrink-0 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950 gap-1.5">
                    <BookmarkCheck className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              </div>
            </div>

            {/* COMMUNITY SPOTLIGHT CARD */}
            <div className="bg-card rounded-2xl border border-green-200 dark:border-green-900 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 text-lg">
                  🌿
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-green-800 dark:text-green-200">Community Spotlight</h3>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">Feature a grant, program, or community initiative — title &amp; description auto-filled from the URL</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add to Digest</label>
                  <select
                    value={spotlightDigestId ?? ""}
                    onChange={e => setSpotlightDigestId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Create new digest —</option>
                    {digestsData?.digests?.map(d => (
                      <option key={d.id} value={d.id}>
                        #{d.id} · {format(parseISO(new Date(d.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")} · {Array.isArray(d.events) ? d.events.length : 0} events
                      </option>
                    ))}
                  </select>
                  {spotlightDigestId === null && (
                    <p className="text-xs text-muted-foreground">A new digest for the week of {currentSunday} will be created automatically.</p>
                  )}
                </div>
                <Input
                  type="url"
                  placeholder="https://example.com/community-grant"
                  value={commUrl}
                  onChange={e => setCommUrl(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <Input
                  type="text"
                  placeholder="Title (auto-filled from URL)"
                  value={commTitle}
                  onChange={e => setCommTitle(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <Textarea
                  placeholder="Description (auto-filled from URL)"
                  value={commDesc}
                  onChange={e => setCommDesc(e.target.value)}
                  className="rounded-xl text-sm resize-none"
                  rows={3}
                />
                <Input
                  type="text"
                  placeholder="Application deadline (e.g. August 18, 2026)"
                  value={commDeadline}
                  onChange={e => setCommDeadline(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => onAddSpotlight("community")}
                    disabled={isAddingComm || !commUrl.trim()}
                    className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    {isAddingComm ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <>🌿 Add Community Spotlight</>}
                  </Button>
                  <Button variant="outline" onClick={handleSaveComm} title="Save for next visit" className="rounded-xl shrink-0 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 gap-1.5">
                    <BookmarkCheck className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              </div>
            </div>

            {/* ADD EVENT FROM URL CARD */}
            <div className="bg-card rounded-2xl border border-orange-200 dark:border-orange-900 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-orange-200 dark:border-orange-900 bg-orange-50/60 dark:bg-orange-950/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 text-lg">🔗</div>
                <div>
                  <h3 className="font-semibold text-sm text-orange-800 dark:text-orange-200">Add Event from URL</h3>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-0.5">Add any event (Eventbrite, UTR, Luma, etc.) — appends to existing digest without overwriting</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add to Digest</label>
                  <select
                    value={spotlightDigestId ?? ""}
                    onChange={e => setSpotlightDigestId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Create new digest —</option>
                    {digestsData?.digests?.map(d => (
                      <option key={d.id} value={d.id}>
                        #{d.id} · {format(parseISO(new Date(d.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")} · {Array.isArray(d.events) ? d.events.length : 0} events
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input type="url" placeholder="https://eventbrite.com/e/... or any event URL" value={eventUrl} onChange={e => setEventUrl(e.target.value)} className="rounded-xl text-sm flex-1" />
                  <Button
                    variant="outline"
                    onClick={onFetchEventUrl}
                    disabled={isFetchingEventUrl || !eventUrl.trim().startsWith("http")}
                    title="Auto-fill fields from URL"
                    className="rounded-xl shrink-0 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 gap-1.5 text-xs"
                  >
                    {isFetchingEventUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Auto-fill
                  </Button>
                </div>
                <Input type="text" placeholder="Title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="rounded-xl text-sm" />
                <Textarea placeholder="Description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="rounded-xl text-sm resize-none" rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="text" placeholder="Date (e.g. Sunday, Aug 3 at 2:00 PM)" value={eventDate} onChange={e => setEventDate(e.target.value)} className="rounded-xl text-sm" />
                  <Input type="text" placeholder="Venue / address" value={eventVenue} onChange={e => setEventVenue(e.target.value)} className="rounded-xl text-sm" />
                </div>
                <div className="flex gap-3 items-center">
                  <select
                    value={eventCategory}
                    onChange={e => setEventCategory(e.target.value)}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Category (auto-detect)</option>
                    {tenant.categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-amber-600 cursor-pointer shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={eventFeatured}
                      onChange={e => setEventFeatured(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <Star className={`w-3.5 h-3.5 ${eventFeatured ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                    Special Event
                  </label>
                </div>
                <Button onClick={onAddEvent} disabled={isAddingEvent || !eventUrl.trim()} className="rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 text-white w-full">
                  {isAddingEvent ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <>🔗 Add Event</>}
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">Week Of</th>
                      <th className="px-6 py-4 font-medium">Subject</th>
                      <th className="px-6 py-4 font-medium">Events</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingDigests ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                    ) : digestsData?.digests?.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No digests created yet.</td></tr>
                    ) : digestsData?.digests?.map((digest) => (
                      <>
                        <tr key={digest.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {format(parseISO(new Date(digest.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")}
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate">{digest.subject}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setExpandedDigestId(expandedDigestId === digest.id ? null : digest.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium text-xs hover:bg-secondary/20 transition-colors"
                            >
                              {digest.events?.length || 0} events
                              <span className="text-[10px]">{expandedDigestId === digest.id ? "▲" : "▼"}</span>
                            </button>
                            {tenant.slug === "austin" && <GeocovBadge digestId={digest.id} />}
                          </td>
                          <td className="px-6 py-4">
                            {digest.sentAt ? (
                              <span className="inline-flex items-center gap-1.5 text-green-600 font-medium text-xs">
                                <CheckCircle2 className="w-4 h-4" /> Sent to {digest.sentCount}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                                <div className="w-2 h-2 rounded-full bg-amber-500" /> Draft
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg shadow-none"
                                disabled={isSending || !testEmail}
                                title={testEmail ? `Send draft to ${testEmail}` : "Set a test email in Settings"}
                                onClick={() => {
                                  send(
                                    { data: { digestId: digest.id, testEmail } },
                                    { onSuccess: () => toast({ title: `Draft sent to ${testEmail}` }),
                                      onError: (err) => toast({ variant: "destructive", title: "Failed to send draft", description: err.message }) }
                                  );
                                }}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" /> Draft to me
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="rounded-lg shadow-none"
                                onClick={() => setSendDialogTarget(digest.id)}
                              >
                                <Send className="w-3.5 h-3.5 mr-2" /> Send to all…
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg shadow-none text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(digest.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedDigestId === digest.id && (
                          <tr key={`${digest.id}-events`} className="bg-muted/30">
                            <td colSpan={5} className="px-6 py-4">
                              {(!digest.events || digest.events.length === 0) ? (
                                <p className="text-xs text-muted-foreground italic">No events in this digest yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {/* #83 — stale events indicator + remove button */}
                                  {(() => {
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const MONTH_MAP: Record<string,number> = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
                                    const staleCount = (digest.events as any[]).filter((ev: any) => {
                                      if (!ev.date || ev.isPost || ev.isBusinessSpotlight || ev.featured) return false;
                                      const m = String(ev.date).match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
                                      if (!m) return false;
                                      const key = m[1].substring(0,3);
                                      const month = MONTH_MAP[key.charAt(0).toUpperCase()+key.slice(1).toLowerCase()];
                                      if (month === undefined) return false;
                                      return new Date(today.getFullYear(), month, parseInt(m[2],10)) < today;
                                    }).length;
                                    if (staleCount === 0) return null;
                                    return (
                                      <div className="flex items-center justify-between py-1.5 px-3 mb-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                        <span className="text-xs text-amber-700 dark:text-amber-400">
                                          ⚠️ {staleCount} past event{staleCount > 1 ? "s" : ""} in this digest
                                        </span>
                                        <button
                                          onClick={() => onRemoveStaleEvents(digest.id, digest.events as any[])}
                                          disabled={removingStale === digest.id}
                                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
                                        >
                                          {removingStale === digest.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                          Remove past
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  {(digest.events as any[]).map((ev: any, i: number) => (
                                    <div key={i} className="py-2 border-b border-border/40 last:border-0">
                                      {editingEvent?.digestId === digest.id && editingEvent?.eventIdx === i ? (
                                        /* ── Inline edit form (Task #77) ── */
                                        <div className="space-y-2">
                                          <div className="flex gap-2">
                                            <div className="flex-1">
                                              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Title</label>
                                              <Input value={eventEditFields.title} onChange={e => setEventEditFields(f => ({ ...f, title: e.target.value }))} className="h-7 text-xs" placeholder={ev.title} />
                                            </div>
                                            <div className="w-36">
                                              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Category</label>
                                              <select
                                                value={eventEditFields.category || ev.category || ""}
                                                onChange={e => setEventEditFields(f => ({ ...f, category: e.target.value }))}
                                                className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                                              >
                                                <option value="">— keep current —</option>
                                                <option value="Arts">Arts</option>
                                                <option value="Sports">Sports</option>
                                                <option value="Tech">Tech</option>
                                                <option value="Tech & Business">Tech & Business</option>
                                                <option value="Wellness">Wellness</option>
                                                <option value="Civics">Civics</option>
                                                <option value="Community">Community</option>
                                                <option value="Entertainment">Entertainment</option>
                                                <option value="Food & Drink">Food & Drink</option>
                                              </select>
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <div className="flex-1">
                                              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Date</label>
                                              <Input value={eventEditFields.date} onChange={e => setEventEditFields(f => ({ ...f, date: e.target.value }))} className="h-7 text-xs" placeholder={ev.date || "e.g. Saturday, Aug 10 at 2:00 PM"} />
                                            </div>
                                            <div className="flex-1">
                                              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Venue</label>
                                              <Input value={eventEditFields.venue} onChange={e => setEventEditFields(f => ({ ...f, venue: e.target.value }))} className="h-7 text-xs" placeholder={ev.venue || "Venue / address"} />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Description</label>
                                            <Textarea value={eventEditFields.description} onChange={e => setEventEditFields(f => ({ ...f, description: e.target.value }))} className="text-xs min-h-[56px] resize-none" placeholder={ev.description || "Short description…"} />
                                          </div>
                                          <div className="flex gap-2 justify-end">
                                            <button onClick={() => setEditingEvent(null)} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80">
                                              <X className="w-3 h-3" />Cancel
                                            </button>
                                            <button onClick={() => onSaveEventFields(digest.id, i)} disabled={isSavingEvent} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                              {isSavingEvent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        /* ── Normal row view ── */
                                        <div className="flex items-start gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-sm font-semibold text-foreground truncate">{ev.title}</span>
                                              {ev.isBusinessSpotlight && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wide">🏆 Business</span>
                                              )}
                                              {ev.isPost && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide">🌿 Community</span>
                                              )}
                                              {ev.featured && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">⭐ Special</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                              {ev.date && <span className="text-xs text-muted-foreground">{ev.date}</span>}
                                              {ev.venue && (
                                                tenant.slug === "austin" ? (
                                                  editingVenue?.digestId === digest.id && editingVenue?.eventIdx === i ? (
                                                    <span className="inline-flex items-center gap-1">
                                                      <Input
                                                        value={venueEditValue}
                                                        onChange={(e) => setVenueEditValue(e.target.value)}
                                                        className="h-6 text-xs py-0 px-2 w-56"
                                                        placeholder="Venue name or address"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter") onSaveVenue(digest.id, i);
                                                          if (e.key === "Escape") setEditingVenue(null);
                                                        }}
                                                      />
                                                      <button onClick={() => onSaveVenue(digest.id, i)} disabled={isSavingVenue} title="Save venue" className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                                                        {isSavingVenue ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                      </button>
                                                      <button onClick={() => setEditingVenue(null)} title="Cancel" className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted text-muted-foreground hover:bg-muted/80">
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 group">
                                                      <span title={ev.lat != null ? "Geocoded ✓" : "Not geocoded — click Fix to correct venue"} className="text-xs">
                                                        {ev.lat != null ? "📍" : "❌"}
                                                      </span>
                                                      <span className="text-xs text-muted-foreground">{ev.venue}</span>
                                                      <button onClick={() => { setEditingVenue({ digestId: digest.id, eventIdx: i }); setVenueEditValue(ev.venue); }} title="Fix venue" className={`inline-flex items-center gap-0.5 text-[10px] font-medium transition-opacity ${ev.lat != null ? "opacity-0 group-hover:opacity-100" : "opacity-100"} text-primary hover:underline`}>
                                                        <Pencil className="w-2.5 h-2.5" />Fix
                                                      </button>
                                                    </span>
                                                  )
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">📍 {ev.venue}</span>
                                                )
                                              )}
                                              {ev.category && (
                                                <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{ev.category}</span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Action buttons */}
                                          <div className="shrink-0 flex items-center gap-1">
                                            {!ev.isBusinessSpotlight && !ev.isPost && (
                                              <button
                                                onClick={() => onToggleFeatured(digest.id, i)}
                                                disabled={togglingFeatured?.digestId === digest.id && togglingFeatured?.eventIdx === i}
                                                title={ev.featured ? "Remove Special Event tag" : "Mark as Special Event"}
                                                className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${ev.featured ? "text-amber-500 hover:text-amber-300" : "text-muted-foreground/40 hover:text-amber-500"}`}
                                              >
                                                {togglingFeatured?.digestId === digest.id && togglingFeatured?.eventIdx === i
                                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                  : <Star className={`w-3.5 h-3.5 ${ev.featured ? "fill-amber-500" : ""}`} />}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => { setEditingEvent({ digestId: digest.id, eventIdx: i }); setEventEditFields({ title: ev.title || "", date: ev.date || "", venue: ev.venue || "", category: ev.category || "", description: ev.description || "" }); }}
                                              title="Edit event fields"
                                              className="inline-flex items-center justify-center w-6 h-6 rounded text-muted-foreground/40 hover:text-primary transition-colors"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            {ev.link && (
                                              <a href={ev.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline underline-offset-2 hover:opacity-70">
                                                Link ↗
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="subscribers" className="space-y-6 mt-0">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Subscribed Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingSubs ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                    ) : subsData?.subscribers?.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No subscribers yet.</td></tr>
                    ) : subsData?.subscribers?.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium">{sub.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">{sub.name || "—"}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(parseISO(sub.subscribedAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          {sub.isActive ? (
                            <span className="inline-flex px-2 py-1 rounded-md bg-green-100 text-green-700 font-medium text-xs">Active</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-md bg-zinc-100 text-zinc-600 font-medium text-xs">Unsubscribed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="carpoolers" className="space-y-6 mt-0">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Carpool Sign-ups</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Everyone who clicked "I want to carpool" since Jun 25, 2026</p>
                </div>
                {rsvpsData && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                    <Car className="w-3.5 h-3.5" /> {rsvpsData.total} total
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">Event</th>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Emails Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingRsvps ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                    ) : !rsvpsData?.rsvps?.length ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Car className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                          <p className="text-muted-foreground text-sm">No carpool sign-ups yet since Jun 25.</p>
                          <p className="text-muted-foreground/60 text-xs mt-1">They'll appear here as soon as someone clicks "I want to carpool".</p>
                        </td>
                      </tr>
                    ) : rsvpsData.rsvps.map((rsvp) => (
                      <tr key={rsvp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 max-w-[220px]">
                          <span className="block truncate font-medium text-foreground" title={rsvp.eventTitle}>{rsvp.eventTitle}</span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{rsvp.name || "—"}</td>
                        <td className="px-6 py-4 text-muted-foreground">{rsvp.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(rsvp.createdAt), "MMM d, h:mm a")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Admin notified
                            </span>
                            {rsvp.emailsSent.carpoolMatchCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                <Mail className="w-3.5 h-3.5" /> {rsvp.emailsSent.carpoolMatchCount} carpool match{rsvp.emailsSent.carpoolMatchCount > 1 ? "es" : ""} sent
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="superconnector" className="mt-0">
            <SuperconnectorTab />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <AdminSettingsTab />
          </TabsContent>

          <TabsContent value="help" className="mt-0">
            <AdminHelpTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* GENERATE DIALOG */}
      <Dialog open={isGenerateOpen} onOpenChange={(o) => { setIsGenerateOpen(o); if (!o) { setWeekOfInput(currentSunday); setCustomNotes(""); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Generate Digest</DialogTitle>
            <DialogDescription>
              Pulls the latest event newsletters from Gmail and creates a curated digest for the selected week.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Week Starting (Sunday)</label>
              <Input
                type="date"
                value={weekOfInput}
                onChange={e => setWeekOfInput(e.target.value)}
                className="rounded-xl"
              />
              {weekOfInput && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                  <p>📬 Searches newsletters received from <strong>{format(new Date(new Date(weekOfInput).getTime() - 14 * 24 * 60 * 60 * 1000 + 86400000), "MMM d")}</strong> onwards</p>
                  <p>📅 Shows only events happening <strong>{format(new Date(weekOfInput + "T12:00:00"), "MMM d")}–{format(new Date(new Date(weekOfInput + "T12:00:00").getTime() + 6 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}</strong></p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Custom Intro Notes (Optional)</label>
              <Textarea 
                placeholder="Add a personal note to this week's intro..."
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                className="min-h-[100px] rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGenerateOpen(false); setWeekOfInput(currentSunday); setCustomNotes(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={onGenerate} disabled={isGenerating} className="rounded-xl bg-primary hover:bg-primary/90">
              {isGenerating ? "Generating from Gmail…" : "Generate Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Delete Digest?</DialogTitle>
            <DialogDescription>
              This will permanently remove the digest. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={isDeleting}
              onClick={() => deleteTarget !== null && onDelete(deleteTarget)}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEND DIALOG */}
      <Dialog open={sendDialogTarget !== null} onOpenChange={(o) => !o && setSendDialogTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Send Digest</DialogTitle>
            <DialogDescription>
              Send this digest to your subscribers or send a test email first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {/* Geocode coverage warning — Austin only */}
            {tenant.slug === "austin" && !sendDialogGeocovLoading && sendDialogGeocov && sendDialogGeocov.missing > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <div className="text-sm leading-snug">
                  <span className="font-semibold">{sendDialogGeocov.missing} event{sendDialogGeocov.missing !== 1 ? "s" : ""} missing coordinates</span>
                  {" "}({sendDialogGeocov.geocoded}/{sendDialogGeocov.total} geocoded).{" "}
                  Subscribers with a saved location won't get distance-sorted results for these events.
                  You can re-geocode from the digest list before sending.
                </div>
              </div>
            )}

            <div className="space-y-3 bg-muted/50 p-4 rounded-xl border border-border">
              <h4 className="text-sm font-bold flex items-center gap-2"><Mail className="w-4 h-4"/> Test Email</h4>
              <div className="flex gap-2">
                <Input 
                  placeholder="test@example.com" 
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="rounded-lg bg-background"
                />
                <Button 
                  variant="secondary" 
                  onClick={() => sendDialogTarget && onSend(sendDialogTarget, true)}
                  disabled={isSending || !testEmail}
                  className="rounded-lg"
                >
                  Send Test
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <h4 className="text-sm font-bold text-destructive">Production Send</h4>
              <p className="text-sm text-muted-foreground">This will blast the email to all {subsData?.total || 0} active subscribers. This cannot be undone.</p>
              <Button 
                variant="destructive" 
                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-destructive/20"
                onClick={() => sendDialogTarget && onSend(sendDialogTarget, false)}
                disabled={isSending}
              >
                {isSending ? "Sending..." : `Send to all ${subsData?.total || 0} subscribers`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
