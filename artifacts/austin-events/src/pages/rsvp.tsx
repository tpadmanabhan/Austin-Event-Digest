import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Car } from "lucide-react";
import { Layout } from "@/components/layout";

function decodeParam(val: string | null): string {
  if (!val) return "";
  try {
    return atob(val.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return val;
  }
}

export default function RsvpPage() {
  const params = new URLSearchParams(window.location.search);
  const digestId = parseInt(params.get("d") || "");
  const eventTitle = decodeParam(params.get("e"));
  const email = decodeParam(params.get("em"));
  const name = decodeParam(params.get("n"));
  const sig = params.get("s") || undefined;

  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [count, setCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!digestId || !eventTitle || !email || !sig) {
      setStatus("error");
      setErrorMsg("Invalid RSVP link.");
      return;
    }

    fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestId, eventTitle, email, name: name || undefined, sig }),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setStatus("error");
          setErrorMsg(data?.message || "This RSVP link is invalid or has expired.");
          return;
        }
        setCount(data.count || 1);
        setStatus(data.alreadyRsvpd ? "already" : "success");
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      });
  }, []);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-lg">Recording your RSVP…</p>
            </div>
          )}

          {(status === "success" || status === "already") && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Car className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {status === "already" ? "Already RSVPd!" : "You're in! 🚗"}
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {status === "already"
                    ? "You already marked yourself as interested in carpooling to this event."
                    : "We've let other subscribers know you're interested in carpooling!"}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Event</p>
                <p className="font-serif text-xl font-bold text-foreground">{eventTitle}</p>
                {count > 1 && (
                  <p className="text-sm text-primary font-medium mt-3">
                    🚗 {count} {count === 1 ? "person" : "people"} interested in carpooling
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Other subscribers have been notified
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Oops!</h1>
                <p className="text-muted-foreground text-lg">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Raj's Austin Events
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
