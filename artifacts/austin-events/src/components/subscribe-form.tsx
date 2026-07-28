import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TurnstileWidget } from "@/components/turnstile-widget";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  address: z.string().optional(),
});

export function SubscribeForm() {
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [radius, setRadius] = useState<1 | 3 | 5>(3);
  const [walkableOnly, setWalkableOnly] = useState(false);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { email: "", address: "" },
  });

  const onSubmit = async (values: z.infer<typeof subscribeSchema>) => {
    if (!captchaToken) return;
    setIsSubmitting(true);
    try {
      const hasAddress = !!values.address?.trim();
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          captchaToken,
          ...(hasAddress ? {
            address: values.address!.trim(),
            radiusMiles: radius,
            walkableOnly,
          } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const alreadySubscribed = data.message?.toLowerCase().includes("already subscribed");
        if (alreadySubscribed) {
          toast({
            title: "Already subscribed!",
            description: "That email is already on the list.",
          });
        } else {
          setSubscribed(true);
          form.reset();
          toast({
            title: "You're on the list! 🎉",
            description: "Keep an eye on your inbox this Sunday.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Uh oh!",
          description: data.message || "Failed to subscribe. Please try again.",
        });
        setCaptchaToken(null);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Uh oh!",
        description: "Failed to subscribe. Please try again.",
      });
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl font-bold mb-2">You're on the list!</h3>
        <p className="text-muted-foreground mb-4">Get ready for your first digest this Sunday.</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        Get the weekly newsletter
      </h3>

      {/* Email */}
      <div className="space-y-1.5">
        <Input
          placeholder="Email Address"
          type="email"
          className="h-12 rounded-xl bg-background/50"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive px-1">{form.formState.errors.email.message}</p>
        )}
      </div>

      {/* Location section */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1">
            <MapPin className="w-4 h-4 text-primary" />
            Your location <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Enter a neighborhood, address, or landmark in Austin. Your weekly digest will show events sorted by distance from this spot.
          </p>

          <label className="block text-xs font-medium text-foreground mb-1.5">
            Address or neighborhood
          </label>
          <Input
            placeholder="e.g. East Austin, TX"
            type="text"
            className="h-11 rounded-xl bg-background"
            autoComplete="street-address"
            {...form.register("address")}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Add "Austin, TX" for best results (e.g. "Rainey Street, Austin TX")
          </p>
        </div>

        {/* Radius picker */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-2">
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
                className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                  radius === r
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {r} mi
                {r === 1 && <span className="block text-xs font-normal opacity-75">walkable</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Walkable toggle */}
        <div className="flex items-center justify-between bg-background rounded-xl px-3 py-2.5 border border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Walkable only (≤ 1 mi)</p>
            <p className="text-xs text-muted-foreground">Override radius — only show events within walking distance</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={walkableOnly}
            onClick={() => setWalkableOnly((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
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
      </div>

      <TurnstileWidget
        onSuccess={setCaptchaToken}
        onError={() => setCaptchaToken(null)}
        onExpire={() => setCaptchaToken(null)}
      />
      <Button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {isSubmitting ? "Subscribing..." : "Subscribe for Free"}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-3">
        No spam. Unsubscribe anytime.
      </p>
    </form>
  );
}
