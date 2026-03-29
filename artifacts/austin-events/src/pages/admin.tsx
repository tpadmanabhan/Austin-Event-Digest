import { useState } from "react";
import { Layout } from "@/components/layout";
import { useNewsletterSubscriptions } from "@/hooks/use-newsletter";
import { useAllDigests, useGenerateDigest, useSendDigest, useDeleteDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Settings2, Plus, Send, CheckCircle2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: subsData, isLoading: loadingSubs } = useNewsletterSubscriptions();
  const { data: digestsData, isLoading: loadingDigests } = useAllDigests();
  
  const { mutate: generate, isPending: isGenerating } = useGenerateDigest();
  const { mutate: send, isPending: isSending } = useSendDigest();
  const { mutate: deleteDigest, isPending: isDeleting } = useDeleteDigest();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [weekOfInput, setWeekOfInput] = useState("");

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-primary" /> 
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage your Austin events newsletter</p>
          </div>
          <Button 
            onClick={() => setIsGenerateOpen(true)}
            className="rounded-xl shadow-md gap-2"
          >
            <Plus className="w-4 h-4" /> Generate New Digest
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
      <Dialog open={isGenerateOpen} onOpenChange={(o) => { setIsGenerateOpen(o); if (!o) { setWeekOfInput(""); setCustomNotes(""); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Generate Digest</DialogTitle>
            <DialogDescription>
              Pull events from Gmail and create a digest. Leave the date blank to generate for this Sunday.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Week Of (Optional)</label>
              <Input
                type="date"
                value={weekOfInput}
                onChange={e => setWeekOfInput(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Set a past date to generate a back-issue (e.g. 2026-03-22).</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Custom Intro Notes (Optional)</label>
              <Textarea 
                placeholder="Add a personal touch to this week's intro..."
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                className="min-h-[100px] rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGenerateOpen(false); setWeekOfInput(""); setCustomNotes(""); }} className="rounded-xl">Cancel</Button>
            <Button onClick={onGenerate} disabled={isGenerating} className="rounded-xl bg-primary hover:bg-primary/90">
              {isGenerating ? "Generating..." : "Generate Draft"}
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
