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

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { email: "", address: "" },
  });

  const onSubmit = async (values: z.infer<typeof subscribeSchema>) => {
    if (!captchaToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          captchaToken,
          ...(values.address?.trim() ? { address: values.address.trim() } : {}),
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

      <div className="space-y-1.5">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Your neighborhood (optional) — e.g. East Austin"
            type="text"
            className="h-12 rounded-xl bg-background/50 pl-9"
            autoComplete="street-address"
            {...form.register("address")}
          />
        </div>
        <p className="text-xs text-muted-foreground px-1">Get events sorted by distance in every digest</p>
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
