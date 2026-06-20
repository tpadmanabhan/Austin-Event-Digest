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
import { Users, Mail, Settings2, Plus, Send, CheckCircle2, Trash2, Sparkles, ExternalLink, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/tenant-context";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { toast } = useToast();
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const { data: subsData, isLoading: loadingSubs } = useNewsletterSubscriptions();
  const { data: digestsData, isLoading: loadingDigests } = useAllDigests();
  
  const { mutate: generate, isPending: isGenerating } = useGenerateDigest();
  const { mutate: send, isPending: isSending } = useSendDigest();
  const { mutate: deleteDigest, isPending: isDeleting } = useDeleteDigest();

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

  const [sendDialogTarget, setSendDialogTarget] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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
        onSuccess: () => {
          setIsGenerateOpen(false);
          setCustomNotes("");
          toast({ title: "Digest generated successfully!" });
          if (tenant.firstRun) dismissFirstRun();
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

        {/* FIRST-RUN BANNER */}
        {tenant.firstRun && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_50%)] opacity-10 pointer-events-none" />
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
          </TabsList>
          
          <TabsContent value="digests" className="space-y-6 mt-0">
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
                              variant="secondary" 
                              size="sm" 
                              className="rounded-lg shadow-none"
                              onClick={() => setSendDialogTarget(digest.id)}
                            >
                              <Send className="w-3.5 h-3.5 mr-2" /> Send...
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
