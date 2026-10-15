import { useState, useId, useRef } from "react";
import type { CityRequestReceipt } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, MapPin } from "lucide-react";
import { SpockImage } from "@/components/spock-mascot";
import { useLang } from "@/contexts/lang-context";
import { CITY_REQUEST_MODAL_COPY } from "@/i18n/platform-home";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaunchCityModal({ open, onOpenChange }: Props) {
  const { lang } = useLang();
  const copy = CITY_REQUEST_MODAL_COPY[lang];
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
      const data = await response.json().catch(() => null) as
        | (Partial<CityRequestReceipt> & { message?: string; saved?: boolean })
        | null;
      if (!response.ok) {
        if (lang === "ja") {
          const message = response.status === 400
            ? copy.invalidRequest
            : response.status === 429
              ? copy.rateLimited
              : response.status === 503
                ? copy.requestNotConfirmed
                : copy.genericError;
          throw new Error(message);
        }
        throw new Error(typeof data?.message === "string" ? data.message : copy.genericError);
      }
      if (data?.saved !== true || !["sent", "failed", "unconfirmed"].includes(data.notificationStatus ?? "")) {
        throw new Error(lang === "ja" ? copy.requestNotConfirmed : "We could not confirm your request. You can safely retry the same city and email.");
      }
      if (openRef.current) setReceipt(data as CityRequestReceipt);
    } catch (error) {
      if (openRef.current) {
        setSubmitError(error instanceof TypeError
          ? copy.connectionError
          : error instanceof Error
            ? error.message
            : copy.genericError);
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
            {receipt ? copy.savedTitle : copy.title}
          </DialogTitle>
          <DialogDescription>
            {receipt
              ? copy.savedDescription
              : copy.description}
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4">
            <div role="status" aria-live="polite" className="space-y-2 text-sm leading-relaxed">
              <p>
                <strong>{cityName.trim()}</strong>{lang === "ja" ? "" : " "}
                {lang === "ja" ? copy.requested : `${copy.requested} `}
                <strong className="break-all">{email.trim()}</strong>
                {lang === "ja" ? "宛にお送りします。" : " for manual follow-up."}
              </p>
              {receipt.acknowledgementStatus === "sent" ? (
                <p className="text-muted-foreground">{lang === "ja" ? copy.acknowledgementSent : <>An acknowledgement email to {email.trim()} was accepted by our email service. Please check your inbox and spam folder; delivery can take a few minutes.</>}</p>
              ) : (
                <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                  {copy.acknowledgementFailed}
                </p>
              )}
              {receipt.notificationStatus === "sent" ? (
                <p className="text-muted-foreground">{copy.notificationSent}</p>
              ) : (
                <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                  {copy.notificationFailed}
                </p>
              )}
              {receipt.duplicate && <p className="text-muted-foreground">{copy.duplicate}</p>}
              <p className="text-muted-foreground">{copy.noAutomaticLaunch}</p>
            </div>
            <Button type="button" className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>{copy.close}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-city`} className="text-sm font-semibold">{copy.cityLabel}</label>
              <Input id={`${formId}-city`} name="cityName" placeholder={copy.cityPlaceholder}
                autoComplete="address-level2" required minLength={2} maxLength={100}
                value={cityName} onChange={event => setCityName(event.target.value)}
                disabled={isSubmitting} className="rounded-xl text-base" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-email`} className="text-sm font-semibold">{copy.emailLabel}</label>
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
              {isSubmitting ? copy.submitting : copy.submit}
            </Button>
            <p className="text-xs text-muted-foreground">{copy.noAccount}</p>
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-2 py-1.5">
              <SpockImage width={40} />
              <p className="text-xs text-muted-foreground">{copy.spockNote}</p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
