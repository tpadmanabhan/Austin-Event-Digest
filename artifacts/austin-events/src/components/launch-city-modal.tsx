import { useState, useEffect, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2, MapPin, ArrowLeft, Zap } from "lucide-react";

const CATEGORIES = [
  { name: "Tech",     emoji: "💻", description: "Startup meetups, AI demos, developer nights, and founder events." },
  { name: "Music",    emoji: "🎵", description: "Live concerts, open mics, album releases, and music festivals." },
  { name: "Food",     emoji: "🍔", description: "Food pop-ups, restaurant openings, farmers markets, and tastings." },
  { name: "Wellness", emoji: "🧘", description: "Yoga classes, meditation circles, hiking groups, and outdoor fitness." },
  { name: "Civics",   emoji: "🏛️", description: "City council meetings, neighborhood events, volunteer drives." },
];

const RESERVED_SLUGS = new Set([
  "www", "api", "app", "admin", "platform", "mail", "help", "support",
  "status", "blog", "about", "terms", "privacy", "auth", "login", "signup",
]);

function cityToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2 && slug.length <= 30;
}

function useSlugAvailability(slug: string) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    if (!slug || slug.length < 2) { setStatus("idle"); return; }
    if (!isValidSlug(slug) || RESERVED_SLUGS.has(slug)) { setStatus("invalid"); return; }

    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tenants/check-slug?slug=${encodeURIComponent(slug)}`);
        const d = await r.json();
        setStatus(d.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  return status;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaunchCityModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();

  const [step, setStep] = useState<1 | 2>(1);
  const [cityName, setCityName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [accentColor, setAccentColor] = useState("#7c3aed");
  const [categories, setCategories] = useState<string[]>(["Tech"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  const slugStatus = useSlugAvailability(slug);

  useEffect(() => {
    if (!slugEdited && cityName) {
      setSlug(cityToSlug(cityName));
    }
  }, [cityName, slugEdited]);

  function reset() {
    setStep(1);
    setCityName("");
    setSlug("");
    setSlugEdited(false);
    setAdminEmail("");
    setAdminPassword("");
    setAccentColor("#7c3aed");
    setCategories(["Tech"]);
    setIsSubmitting(false);
    setSubmitError("");
    setVerifyEmailSent(false);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  const step1Valid = cityName.trim().length >= 2;

  async function handleSubmit() {
    if (categories.length === 0) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: cityName.trim(), slug, adminEmail, adminPassword, categories, accentColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["tenants-list"] });
      if (data.requiresVerification) {
        setVerifyEmailSent(true);
        setIsSubmitting(false);
      } else {
        window.location.href = data.adminUrl;
      }
    } catch {
      setSubmitError("Network error — please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden gap-0">
        {/* Progress header */}
        <div className="bg-primary/5 border-b border-border px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-serif font-bold text-lg text-foreground">Launch your city</span>
          </div>
          <div className="flex gap-2">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full flex-1 transition-all ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step} of 2 — {step === 1 ? "City details" : "Choose categories"}
          </p>
        </div>

        <div className="px-6 py-6">
          {/* Coming soon banner */}
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <span className="text-base">🔒</span>
            <span>City sign-ups are coming soon — stay tuned!</span>
          </div>

          {verifyEmailSent && (
            <div className="space-y-4 text-center py-4">
              <div className="text-5xl">📬</div>
              <div>
                <h3 className="font-serif font-bold text-xl text-foreground">Check your inbox</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  We sent a verification link to <strong className="text-foreground">{adminEmail || "your email"}</strong>.
                  Click it to activate <strong className="text-foreground">{cityName} Events</strong> and access your admin panel.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-left text-xs text-muted-foreground space-y-1">
                <p>• Check spam/promotions if it doesn't arrive within a minute</p>
                <p>• The link expires in 48 hours</p>
                <p>• Your subdomain: <strong className="font-mono text-foreground">{slug}.eventcarpooling.com</strong></p>
              </div>
              <Button variant="outline" className="rounded-xl w-full" onClick={() => onOpenChange(false)}>
                Got it — close
              </Button>
            </div>
          )}

          {!verifyEmailSent && step === 1 && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1 pb-2">
                <DialogTitle className="font-serif text-xl">About your city</DialogTitle>
                <DialogDescription>
                  Your newsletter will live at{" "}
                  <span className="font-medium text-foreground">
                    {slug || "yourcity"}.eventcarpooling.com
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <label htmlFor={`${formId}-city`} className="text-sm font-semibold">City name</label>
                <Input
                  id={`${formId}-city`}
                  placeholder="San Antonio"
                  value={cityName}
                  onChange={e => setCityName(e.target.value)}
                  className="rounded-xl"
                  disabled
                />
              </div>

              <div className="hidden">
                <div className="space-y-1.5">
                  <label htmlFor={`${formId}-slug`} className="text-sm font-semibold">Subdomain</label>
                  <div className="relative">
                    <Input
                      id={`${formId}-slug`}
                      placeholder="sanantonio"
                      value={slug}
                      onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
                      className="rounded-xl pr-8"
                      disabled
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {slugStatus === "available" && <Check className="w-4 h-4 text-green-600" />}
                      {(slugStatus === "taken" || slugStatus === "invalid") && <X className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{slug || "yourcity"}.eventcarpooling.com</span>
                    {slugStatus === "taken" && <span className="text-destructive">Already taken</span>}
                    {slugStatus === "invalid" && <span className="text-destructive">Invalid format</span>}
                    {slugStatus === "available" && <span className="text-green-600">Available!</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${formId}-color`} className="text-sm font-semibold">Accent color</label>
                  <div className="flex items-center gap-3">
                    <input
                      id={`${formId}-color`}
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-not-allowed p-1 bg-card opacity-50"
                      disabled
                    />
                    <span className="text-sm text-muted-foreground font-mono">{accentColor}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${formId}-email`} className="text-sm font-semibold">Admin email</label>
                  <Input
                    id={`${formId}-email`}
                    type="email"
                    placeholder="you@example.com"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="rounded-xl"
                    disabled
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${formId}-password`} className="text-sm font-semibold">Admin password</label>
                  <Input
                    id={`${formId}-password`}
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="rounded-xl"
                    disabled
                  />
                  {adminPassword.length > 0 && adminPassword.length < 8 && (
                    <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                  )}
                </div>
              </div>

              <Button
                className="w-full rounded-xl h-11 mt-2"
                disabled
              >
                Next: Choose categories →
              </Button>
            </div>
          )}

          {!verifyEmailSent && step === 2 && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1 pb-2">
                <DialogTitle className="font-serif text-xl">What events matter?</DialogTitle>
                <DialogDescription>
                  Pick at least one category. We'll automatically discover events from top sources.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const checked = categories.includes(cat.name);
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      disabled
                      className="w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left border-border opacity-60 cursor-not-allowed"
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{cat.emoji}</span>
                          <span className="font-semibold text-foreground text-sm">{cat.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cat.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {submitError && (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-xl px-4 py-2">
                  {submitError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="rounded-xl flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  className="rounded-xl flex-[2] gap-2"
                  disabled
                >
                  <MapPin className="w-4 h-4" /> Launch city 🚀
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You'll be redirected to your admin panel to generate your first digest.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
