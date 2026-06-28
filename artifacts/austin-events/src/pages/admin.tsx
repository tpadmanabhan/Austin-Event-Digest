import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useNewsletterSubscriptions } from "@/hooks/use-newsletter";
import { useAllDigests, useGenerateDigest, useSendDigest, useDeleteDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Settings2, Plus, Send, CheckCircle2, Trash2, Sparkles, ExternalLink, Tag, Rocket, Eye, Loader2, Car, Trophy, Link, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/tenant-context";
import { useQueryClient } from "@tanstack/react-query";
import { AdminSettingsTab } from "@/components/admin-settings-tab";
import { useAdminRsvps } from "@/hooks/use-rsvps";
import { SuperconnectorTab } from "@/components/superconnector-tab";

type FirstRunStep = "generate" | "preview" | "ready";

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
  const [firstRunTestEmail, setFirstRunTestEmail] = useState("aiimplementationclubaustin@gmail.com");

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
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().substring(0, 10);
  }, []);

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [weekOfInput, setWeekOfInput] = useState(currentSunday);

  const [sourceUrls, setSourceUrls] = useState<string[]>(["", "", "", "", ""]);
  const [sourceWeekOf, setSourceWeekOf] = useState(currentSunday);
  const [isGeneratingFromSources, setIsGeneratingFromSources] = useState(false);
  const [sourceResults, setSourceResults] = useState<Array<{ url: string; eventCount: number; error?: string }> | null>(null);
  const [lastGeneratedDigest, setLastGeneratedDigest] = useState<{ eventCount: number; digestId: number } | null>(null);

  const [sendDialogTarget, setSendDialogTarget] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("aiimplementationclubaustin@gmail.com");

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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
      const res = await fetch("/api/events/digest/generate-from-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ urls, weekOf: sourceWeekOf }),
      });
      const data = await res.json() as { digest?: { id: number; events?: unknown[] }; sourceResults?: Array<{ url: string; eventCount: number; error?: string }>; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to generate");
      const eventCount = Array.isArray(data.digest?.events) ? data.digest.events.length : 0;
      const digestId = data.digest?.id ?? null;
      if (digestId !== null) setLastGeneratedDigest({ eventCount, digestId });
      setSourceResults(data.sourceResults ?? []);
      queryClient.invalidateQueries({ queryKey: ["digests"] });
      toast({ title: `Digest generated — ${eventCount} events found!` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to generate", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsGeneratingFromSources(false);
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

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
                  <p className="text-xs text-muted-foreground mt-0.5">Paste up to 5 event page URLs (Luma, Eventbrite, Meetup, org sites, etc.) and AI will extract this week's events</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {sourceUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
                      <Input
                        type="url"
                        placeholder={i === 0 ? "https://lu.ma/austin" : i === 1 ? "https://eventbrite.com/d/tx--austin/events/" : i === 2 ? "https://meetup.com/find/?location=Austin" : `https://example.com/events`}
                        value={url}
                        onChange={e => setSourceUrls(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        className="rounded-xl text-sm"
                      />
                    </div>
                  ))}
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
                  <Button
                    onClick={onGenerateFromSources}
                    disabled={isGeneratingFromSources || sourceUrls.every(u => !u.trim())}
                    className="rounded-xl gap-2 shrink-0"
                  >
                    {isGeneratingFromSources ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Extracting events…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate from Sources</>
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
                      <tr key={digest.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium">
                          {format(parseISO(new Date(digest.weekOf).toISOString().substring(0, 10)), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">{digest.subject}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium text-xs">
                            {digest.events?.length || 0} events
                          </span>
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
                              disabled={isSending}
                              title={`Send draft to ${testEmail}`}
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
