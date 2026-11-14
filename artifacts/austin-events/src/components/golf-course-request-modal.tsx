import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  submitGolfCourseRequest,
  type GolfCourseRequestInput,
  type GolfCourseRequestReceipt,
} from "@workspace/api-client-react";
import { Check, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import { GOLF_HOME_COPY } from "@/i18n/golf-home";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GolfCourseRequestModal({ open, onOpenChange }: Props) {
  const { lang } = useLanguage();
  const copy = GOLF_HOME_COPY[lang].courseRequest;
  const formId = useId();
  const [courseName, setCourseName] = useState("");
  const [address, setAddress] = useState("");
  const [courseWebsite, setCourseWebsite] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<GolfCourseRequestReceipt | null>(null);
  const submittingRef = useRef(false);
  const openRef = useRef(open);
  const openerRef = useRef<HTMLElement | null>(null);
  openRef.current = open;

  function reset() {
    setCourseName("");
    setAddress("");
    setCourseWebsite("");
    setBookingUrl("");
    setSubmitterName("");
    setEmail("");
    setNotes("");
    setSubmitError("");
    setReceipt(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    openRef.current = nextOpen;
    if (!nextOpen && !submittingRef.current) reset();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    const input: GolfCourseRequestInput = {
      courseName: courseName.trim(),
      address: address.trim(),
      email: email.trim(),
      ...(courseWebsite.trim() ? { courseWebsite: courseWebsite.trim() } : {}),
      ...(bookingUrl.trim() ? { bookingUrl: bookingUrl.trim() } : {}),
      ...(submitterName.trim() ? { submitterName: submitterName.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      const result = await submitGolfCourseRequest(input);
      if (result.saved !== true || !["sent", "failed", "unconfirmed"].includes(result.notificationStatus)) {
        throw new Error("The server response was incomplete.");
      }
      if (openRef.current) setReceipt(result);
    } catch (error) {
      if (openRef.current) {
        const status = error && typeof error === "object" && "status" in error
          ? Number((error as { status?: unknown }).status)
          : 0;
        setSubmitError(error instanceof TypeError
          ? copy.connectionError
          : status === 400
            ? copy.invalidRequest
            : status === 429
              ? copy.rateLimited
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
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl"
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {receipt ? <Check className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
          </div>
          <DialogTitle className="font-serif text-2xl">{receipt ? copy.savedTitle : copy.title}</DialogTitle>
          <DialogDescription>{receipt ? copy.savedDescription : copy.modalDescription}</DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4">
            <div role="status" aria-live="polite" className="space-y-3 text-sm leading-relaxed">
              {receipt.notificationStatus === "sent" ? (
                <p className="text-muted-foreground">{copy.notificationSent}</p>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  {copy.notificationWarning}
                </p>
              )}
              {receipt.duplicate && <p className="text-muted-foreground">{copy.duplicate}</p>}
              <p className="text-muted-foreground">{copy.reviewNote}</p>
            </div>
            <Button type="button" className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>
              {copy.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" aria-busy={isSubmitting}>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-course`} className="text-sm font-semibold">{copy.courseName}</label>
              <Input
                id={`${formId}-course`}
                name="courseName"
                autoComplete="off"
                required
                minLength={2}
                maxLength={120}
                value={courseName}
                onChange={event => setCourseName(event.target.value)}
                disabled={isSubmitting}
                placeholder={copy.courseNamePlaceholder}
                className="rounded-xl text-base"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-address`} className="text-sm font-semibold">{copy.address}</label>
              <Input
                id={`${formId}-address`}
                name="address"
                autoComplete="street-address"
                required
                minLength={5}
                maxLength={200}
                value={address}
                onChange={event => setAddress(event.target.value)}
                disabled={isSubmitting}
                placeholder={copy.addressPlaceholder}
                className="rounded-xl text-base"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`${formId}-website`} className="text-sm font-semibold">{copy.website}</label>
                <Input
                  id={`${formId}-website`}
                  name="courseWebsite"
                  type="url"
                  maxLength={500}
                  value={courseWebsite}
                  onChange={event => setCourseWebsite(event.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.websitePlaceholder}
                  className="rounded-xl text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${formId}-booking`} className="text-sm font-semibold">{copy.booking}</label>
                <Input
                  id={`${formId}-booking`}
                  name="bookingUrl"
                  type="url"
                  maxLength={500}
                  value={bookingUrl}
                  onChange={event => setBookingUrl(event.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.bookingPlaceholder}
                  className="rounded-xl text-base"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`${formId}-name`} className="text-sm font-semibold">{copy.submitterName}</label>
                <Input
                  id={`${formId}-name`}
                  name="submitterName"
                  autoComplete="name"
                  maxLength={100}
                  value={submitterName}
                  onChange={event => setSubmitterName(event.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.submitterNamePlaceholder}
                  className="rounded-xl text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${formId}-email`} className="text-sm font-semibold">{copy.email}</label>
                <Input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  placeholder={copy.emailPlaceholder}
                  className="rounded-xl text-base"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-notes`} className="text-sm font-semibold">{copy.notes}</label>
              <textarea
                id={`${formId}-notes`}
                name="notes"
                maxLength={1000}
                rows={3}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                disabled={isSubmitting}
                placeholder={copy.notesPlaceholder}
                className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {submitError && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>
            )}
            <Button
              type="submit"
              className="h-11 w-full gap-2 rounded-xl"
              disabled={isSubmitting || courseName.trim().length < 2 || address.trim().length < 5 || !email.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? copy.submitting : copy.submit}
            </Button>
            <p className="text-xs text-muted-foreground">{copy.reviewNote}</p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
