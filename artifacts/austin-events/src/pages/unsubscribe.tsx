import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { MapPin, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function useQueryParam(key: string): string {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search).get(key) ?? "";
}

type Stage = "confirm" | "success" | "error" | "already";

export default function UnsubscribePage() {
  const email = useQueryParam("email");
  const [stage, setStage] = useState<Stage>("confirm");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleUnsubscribe = async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStage("success");
      } else {
        setStage("error");
      }
    } catch {
      setStage("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl shadow-black/5">
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 px-8 py-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-4">
                <MapPin className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-amber-400 mb-1">
                Raj's Austin Events
              </h1>
              <p className="text-stone-400 text-sm">Your weekly guide to Austin</p>
            </div>

            <div className="px-8 py-10">
              {stage === "confirm" && (
                <>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-2 text-center">
                    Subscription Preferences
                  </h2>
                  <p className="text-muted-foreground text-sm text-center mb-8">
                    Managing preferences for:
                  </p>

                  {email ? (
                    <div className="bg-muted rounded-xl px-4 py-3 text-center mb-8">
                      <p className="text-sm font-medium text-foreground break-all">{email}</p>
                    </div>
                  ) : (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-center mb-8">
                      <p className="text-sm text-destructive">No email address found in this link.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate("/")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
                    >
                      ✓ Keep me subscribed
                    </button>
                    <button
                      onClick={handleUnsubscribe}
                      disabled={!email || isLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Unsubscribing…" : "Unsubscribe from all emails"}
                    </button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
                    You can re-subscribe at any time by visiting{" "}
                    <Link href="/" className="text-primary hover:underline">
                      eventcarpooling.com
                    </Link>
                  </p>
                </>
              )}

              {stage === "success" && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-3">
                    You're unsubscribed
                  </h2>
                  <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                    <span className="font-medium text-foreground break-all">{email}</span> has been
                    removed from Raj's Austin Events.
                  </p>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    Sorry to see you go! You won't receive any more emails from us.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Austin Events
                  </Link>
                  <p className="text-xs text-muted-foreground mt-6">
                    Changed your mind?{" "}
                    <Link href="/#subscribe" className="text-primary hover:underline">
                      Re-subscribe here
                    </Link>
                  </p>
                </div>
              )}

              {stage === "error" && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-3">
                    Something went wrong
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    We couldn't process your request. Please try again or{" "}
                    <a
                      href="mailto:raj@eventcarpooling.com"
                      className="text-primary hover:underline"
                    >
                      contact us directly
                    </a>
                    .
                  </p>
                  <button
                    onClick={() => setStage("confirm")}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" /> Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
