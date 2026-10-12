import { useState, useId, useRef } from "react";
import type { CityRequestReceipt } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, MapPin } from "lucide-react";
import { SpockImage } from "@/components/spock-mascot";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaunchCityModal({ open, onOpenChange }: Props) {
  const formId = useId();
  const [cityName, setCityName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<CityRequestReceipt | null>(null);
  const submittingRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  function reset() {
    setCityName("");
    setEmail("");
    setSubmitError("");
    setReceipt(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    openRef.current = nextOpen;
    // Closing is always allowed. Reopening during a send retains its loading state.
    if (!nextOpen && !submittingRef.current) reset();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/city-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: cityName.trim(), email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Your request could not be saved. Please try again.");
      }
      if (data.saved !== true || !["sent", "failed", "unconfirmed"].includes(data.notificationStatus)) {
        throw new Error("We could not confirm your request. You can safely retry the same city and email.");
      }
      if (openRef.current) setReceipt(data as CityRequestReceipt);
    } catch (error) {
      if (openRef.current) {
        setSubmitError(error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "Connection error. Please try again with the same city and email; this will not send duplicate notifications.");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      if (!openRef.current) reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto"
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus({ preventScroll: true });
        }}>
        <DialogHeader className="text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            {receipt ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <DialogTitle className="font-serif text-2xl">
            {receipt ? "Request saved" : "Launch your city"}
          </DialogTitle>
          <DialogDescription>
            {receipt
              ? "Thank you. Your city request is saved for the team to review."
              : "Tell us your city and email. Our team will review your request and follow up about next steps."}
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4">
            <div role="status" aria-live="polite" className="space-y-2 text-sm leading-relaxed">
              <p><strong>{cityName.trim()}</strong> has been requested. We’ll use <strong className="break-all">{email.trim()}</strong> for manual follow-up.</p>
              {receipt.notificationStatus === "sent" ? (
                <p className="text-muted-foreground">The admin notification was accepted by our email service.</p>
              ) : (
                <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                  Your request is saved, but the admin email notification could not be confirmed.
                  Please don’t resubmit; your request remains recorded for review.
                </p>
              )}
              {receipt.duplicate && <p className="text-muted-foreground">This request was already recorded. No duplicate notification was sent.</p>}
              <p className="text-muted-foreground">Submitting a request does not automatically launch a city or create an account.</p>
            </div>
            <Button type="button" className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-city`} className="text-sm font-semibold">City name</label>
              <Input id={`${formId}-city`} name="cityName" placeholder="San Antonio"
                autoComplete="address-level2" required minLength={2} maxLength={100}
                value={cityName} onChange={event => setCityName(event.target.value)}
                disabled={isSubmitting} className="rounded-xl text-base" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-email`} className="text-sm font-semibold">Email address</label>
              <Input id={`${formId}-email`} name="email" type="email" inputMode="email"
                placeholder="you@example.com" autoComplete="email" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)}
                disabled={isSubmitting} className="rounded-xl text-base" />
            </div>
            {submitError && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{submitError}</p>
            )}
            <Button type="submit" className="w-full rounded-xl h-11 gap-2"
              disabled={isSubmitting || cityName.trim().length < 2 || !email.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Submitting request…" : "Submit request"}
            </Button>
            <p className="text-xs text-muted-foreground">No password or account needed. Requests are reviewed manually.</p>
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-2 py-1.5">
              <SpockImage width={40} />
              <p className="text-xs text-muted-foreground">Spock helps our team research events and draft guides; a person reviews your request.</p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
