import { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Loader2, MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { centralDateTimeInput, centralDateTimeIso, formatCentralDateLabel } from "@/lib/leadership-event-dates";

type ContributorSession = {
  authenticated: boolean;
  name: string | null;
};

type ContributionForm = {
  name: string;
  url: string;
  title: string;
  startDate: string;
  venue: string;
  description: string;
};

const emptyForm: ContributionForm = {
  name: "",
  url: "",
  title: "",
  startDate: "",
  venue: "",
  description: "",
};

async function readJson(response: Response): Promise<Record<string, any>> {
  return response.json().catch(() => ({}));
}

export function LeadershipEventContribution() {
  const [session, setSession] = useState<ContributorSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [form, setForm] = useState<ContributionForm>(emptyForm);
  const [busy, setBusy] = useState<"access" | "parse" | "submit" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/events/leadership-event-contributions/session")
      .then(readJson)
      .then((data) => {
        if (active) {
          const contributor = {
            authenticated: data.authenticated === true,
            name: typeof data.name === "string" ? data.name : null,
          };
          setSession(contributor);
          if (contributor.authenticated && contributor.name) {
            setForm((current) => ({ ...current, name: current.name || contributor.name || "" }));
          }
        }
      })
      .catch(() => {
        if (active) setSession({ authenticated: false, name: null });
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#add-event") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("add-event")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setField = (field: keyof ContributionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  };

  const requestAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!captchaToken) return;
    setBusy("access");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/events/leadership-event-contributions/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), captchaToken }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || "Could not request a verification link.");
      setMessage(data.message || "Check your inbox for a verification link.");
      setCaptchaToken(null);
      setCaptchaKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a verification link.");
    } finally {
      setBusy(null);
    }
  };

  const parseLink = async () => {
    setBusy("parse");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/events/leadership-event-contributions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || "Could not read that event link.");
      const event = data.event ?? {};
      setForm((current) => ({
        ...current,
        title: event.title || current.title,
        startDate: event.startDate ? centralDateTimeInput(event.startDate) : current.startDate,
        venue: event.venue || current.venue,
        description: event.description || current.description,
      }));
      setMessage("Details filled in where available. Review or edit everything before submitting.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that event link.");
    } finally {
      setBusy(null);
    }
  };

  const submitEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startDate = centralDateTimeIso(form.startDate);
    if (!startDate) {
      setError("Enter a valid Austin date and time. Times are Central Time.");
      return;
    }
    setBusy("submit");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/events/leadership-event-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          title: form.title.trim(),
          date: formatCentralDateLabel(startDate),
          startDate,
          venue: form.venue.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || "Could not submit this event.");
      setMessage(data.message || "Your event was sent for review.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit this event.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      id="add-event"
      className="mt-12 scroll-mt-24 overflow-hidden rounded-3xl border border-[#314363]/20 bg-card shadow-sm"
      aria-labelledby="leadership-event-contribution-title"
      data-testid="leadership-event-contribution"
    >
      <div className="bg-[#314363] px-6 py-7 text-white sm:px-9">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#8bd8f0]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Keep the community connected
        </p>
        <h2 id="leadership-event-contribution-title" className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
          Suggest an event
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
          Active subscribers can suggest public events. Admins review each suggestion before it appears on the Leadership Austin site or in a future newsletter; approval does not send an email.
        </p>
      </div>

      <div className="p-6 sm:p-9">
        {checkingSession ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking subscriber access…
          </p>
        ) : session?.authenticated ? (
          <form className="space-y-4" onSubmit={submitEvent}>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Subscriber email verified
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                aria-label="Your name"
                placeholder="Your name"
                maxLength={120}
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
              <div className="flex gap-2 sm:col-span-1">
                <Input
                  aria-label="Public event link"
                  type="url"
                  placeholder="Public event page URL"
                  maxLength={2000}
                  required
                  value={form.url}
                  onChange={(e) => setField("url", e.target.value)}
                />
                <Button type="button" variant="outline" disabled={busy !== null || !form.url.trim()} onClick={parseLink}>
                  {busy === "parse" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fill"}
                  <span className="sr-only">event details from link</span>
                </Button>
              </div>
              <Input
                aria-label="Event title"
                placeholder="Event title"
                maxLength={180}
                required
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
              <div className="sm:col-span-2">
                <label htmlFor="leadership-event-start-date" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Start date and time (Austin, Central Time)
                </label>
                <Input
                  id="leadership-event-start-date"
                  aria-label="Event start date and time in Austin"
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The visitor-facing date label is created from this time.
                </p>
              </div>
              <Input
                aria-label="Event venue"
                placeholder="Venue or online"
                maxLength={200}
                required
                value={form.venue}
                onChange={(e) => setField("venue", e.target.value)}
              />
              <Textarea
                aria-label="Event description"
                placeholder="Short event description"
                maxLength={2000}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="min-h-24 sm:col-span-2"
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
            <Button type="submit" disabled={busy !== null} className="gap-2 bg-[#314363] text-white hover:bg-[#253550]">
              {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              Send for review
            </Button>
          </form>
        ) : (
          <form className="mx-auto max-w-xl space-y-4" onSubmit={requestAccess}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Verify the email address you use for the Leadership Austin newsletter. We’ll send a one-time link if it’s an active subscription.
            </p>
            <Input
              aria-label="Leadership Austin subscriber email"
              type="email"
              autoComplete="email"
              maxLength={320}
              placeholder="Subscriber email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TurnstileWidget
              key={captchaKey}
              onSuccess={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
            <Button type="submit" disabled={busy !== null || !captchaToken} className="gap-2 bg-[#314363] text-white hover:bg-[#253550]">
              {busy === "access" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Email me a verification link
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
