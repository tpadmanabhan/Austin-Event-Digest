import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { MapPin, CheckCircle, AlertCircle, Navigation, ArrowLeft } from "lucide-react";

function useQueryParam(key: string): string {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search).get(key) ?? "";
}

interface Preferences {
  anchorLat: number | null;
  anchorLng: number | null;
  radiusMiles: number;
  walkableOnly: boolean;
  displayAddress: string | null;
}

type Stage = "loading" | "form" | "success" | "error" | "unauthorized";

export default function PreferencesPage() {
  const email = useQueryParam("email");
  const token = useQueryParam("token");

  const [stage, setStage] = useState<Stage>("loading");
  const [prefs, setPrefs] = useState<Preferences>({
    anchorLat: null,
    anchorLng: null,
    radiusMiles: 3,
    walkableOnly: false,
    displayAddress: null,
  });
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState<1 | 3 | 5>(3);
  const [walkableOnly, setWalkableOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!email || !token) {
      setStage("unauthorized");
      return;
    }

    fetch(`${apiBase}/api/newsletter/preferences?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 401) {
          setStage("unauthorized");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (data.preferences) {
          setPrefs(data.preferences);
          setRadius(([1, 3, 5].includes(data.preferences.radiusMiles) ? data.preferences.radiusMiles : 3) as 1 | 3 | 5);
          setWalkableOnly(data.preferences.walkableOnly ?? false);
          // Pre-fill address input with the saved display address
          if (data.preferences.displayAddress) {
            setAddress(data.preferences.displayAddress);
          }
        }
        setStage("form");
      })
      .catch(() => setStage("error"));
  }, [email, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${apiBase}/api/newsletter/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          address: address.trim() || undefined,
          radiusMiles: radius,
          walkableOnly,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setStage("unauthorized");
          return;
        }
        setErrorMessage(data.message || "Something went wrong. Please try again.");
        return;
      }

      setSuccessMessage(data.message || "Preferences saved!");
      setStage("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl shadow-black/5">
            {/* Header */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 px-8 py-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-4">
                <Navigation className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-amber-400 mb-1">
                Nearby Events
              </h1>
              <p className="text-stone-400 text-sm">Set your location to see what's close</p>
            </div>

            <div className="px-8 py-10">
              {/* Loading */}
              {stage === "loading" && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Loading your preferences…</p>
                </div>
              )}

              {/* Unauthorized */}
              {stage === "unauthorized" && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">
                    Link expired or invalid
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    This preferences link is no longer valid. Links are sent with each weekly digest — check your latest email for a fresh link.
                  </p>
                  <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Austin Events
                  </Link>
                </div>
              )}

              {/* Generic error */}
              {stage === "error" && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">
                    Something went wrong
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    We couldn't load your preferences. Please try again or{" "}
                    <a href="mailto:raj@eventcarpooling.com" className="text-primary hover:underline">
                      contact us
                    </a>.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" /> Try again
                  </button>
                </div>
              )}

              {/* Success */}
              {stage === "success" && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="font-serif text-xl font-bold text-foreground mb-3">
                    Preferences saved!
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    {successMessage}
                  </p>
                  <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Browse this week's events
                  </Link>
                </div>
              )}

              {/* Preferences form */}
              {stage === "form" && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-foreground mb-1">
                      Your location
                    </h2>
                    <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                      Enter a neighborhood, address, or landmark in Austin. Your weekly digest will show events sorted by distance from this spot.
                    </p>

                    {/* Current location indicator */}
                    {prefs.anchorLat != null && (
                      <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-primary font-medium">
                            {prefs.displayAddress
                              ? `Currently: ${prefs.displayAddress}`
                              : "Location already saved"}
                          </p>
                          <p className="text-xs text-primary/70 mt-0.5">
                            Edit the field below to update
                          </p>
                        </div>
                      </div>
                    )}

                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Address or neighborhood
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={prefs.anchorLat != null ? "e.g. South Congress, Austin TX" : "e.g. East Austin, TX"}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      autoComplete="street-address"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Add "Austin, TX" for best results (e.g. "Rainey Street, Austin TX")
                    </p>
                  </div>

                  {/* Radius selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Show events within…
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([1, 3, 5] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setRadius(r);
                            if (r === 1) setWalkableOnly(true);
                            else setWalkableOnly(false);
                          }}
                          className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                            radius === r
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {r} mi
                          {r === 1 && <span className="block text-xs font-normal opacity-75">walkable</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Walkable toggle — only for 1 mi, but let it be overridable for other radii */}
                  <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Walkable only (≤ 1 mi)</p>
                      <p className="text-xs text-muted-foreground">Override radius — only show events within walking distance</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={walkableOnly}
                      onClick={() => setWalkableOnly((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        walkableOnly ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          walkableOnly ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Save my location
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground leading-relaxed">
                    Your location is only used to sort events in your digest — it's never shared or displayed publicly.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
