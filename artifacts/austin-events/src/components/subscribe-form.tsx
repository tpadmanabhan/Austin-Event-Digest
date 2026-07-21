import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TurnstileWidget } from "@/components/turnstile-widget";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ZodiacSign = {
  name: string;
  symbol: string;
  emoji: string;
  dates: string;
};

function getZodiacSign(month: number, day: number): ZodiacSign {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
    return { name: "Aries", symbol: "♈", emoji: "🐏", dates: "Mar 21 – Apr 19" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
    return { name: "Taurus", symbol: "♉", emoji: "🐂", dates: "Apr 20 – May 20" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
    return { name: "Gemini", symbol: "♊", emoji: "👯", dates: "May 21 – Jun 20" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
    return { name: "Cancer", symbol: "♋", emoji: "🦀", dates: "Jun 21 – Jul 22" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
    return { name: "Leo", symbol: "♌", emoji: "🦁", dates: "Jul 23 – Aug 22" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
    return { name: "Virgo", symbol: "♍", emoji: "🌾", dates: "Aug 23 – Sep 22" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
    return { name: "Libra", symbol: "♎", emoji: "⚖️", dates: "Sep 23 – Oct 22" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return { name: "Scorpio", symbol: "♏", emoji: "🦂", dates: "Oct 23 – Nov 21" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return { name: "Sagittarius", symbol: "♐", emoji: "🏹", dates: "Nov 22 – Dec 21" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return { name: "Capricorn", symbol: "♑", emoji: "🐐", dates: "Dec 22 – Jan 19" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return { name: "Aquarius", symbol: "♒", emoji: "🏺", dates: "Jan 20 – Feb 18" };
  return { name: "Pisces", symbol: "♓", emoji: "🐟", dates: "Feb 19 – Mar 20" };
}

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  birthMonth: z.coerce.number().min(1).max(12).optional(),
  birthDay: z.coerce.number().min(1).max(31).optional(),
});

export function SubscribeForm() {
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [zodiacResult, setZodiacResult] = useState<ZodiacSign | null>(null);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { email: "", birthMonth: undefined, birthDay: undefined },
  });

  const watchMonth = form.watch("birthMonth");
  const watchDay = form.watch("birthDay");

  const previewSign =
    watchMonth && watchDay ? getZodiacSign(Number(watchMonth), Number(watchDay)) : null;

  const onSubmit = async (values: z.infer<typeof subscribeSchema>) => {
    if (!captchaToken) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { email: values.email, captchaToken };
      if (values.birthMonth) body.birthMonth = values.birthMonth;
      if (values.birthDay) body.birthDay = values.birthDay;

      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (values.birthMonth && values.birthDay) {
          setZodiacResult(getZodiacSign(values.birthMonth, values.birthDay));
        }
        setSubscribed(true);
        form.reset();
        toast({
          title: "You're on the list! 🎉",
          description: "Keep an eye on your inbox this Sunday.",
        });
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
        {zodiacResult && (
          <div className="mt-2 bg-violet-50 border border-violet-200 rounded-2xl px-6 py-4 max-w-xs w-full">
            <p className="text-violet-500 text-xs font-semibold uppercase tracking-widest mb-1">Your Zodiac Sign</p>
            <p className="text-4xl mb-1">{zodiacResult.symbol}</p>
            <p className="text-lg font-bold text-violet-700">{zodiacResult.name}</p>
            <p className="text-xs text-violet-500 mt-0.5">{zodiacResult.dates}</p>
            <p className="text-xs text-muted-foreground mt-2">
              We'll highlight events that match your {zodiacResult.name} energy ✨
            </p>
          </div>
        )}
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
        <p className="text-sm text-muted-foreground">
          Birthday <span className="text-xs">(optional — we'll personalise events for your sign)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <select
              className="w-full h-12 rounded-xl bg-background/50 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...form.register("birthMonth")}
              defaultValue=""
            >
              <option value="" disabled>Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              placeholder="Day (1–31)"
              min={1}
              max={31}
              className="h-12 rounded-xl bg-background/50"
              {...form.register("birthDay")}
            />
          </div>
        </div>
        {previewSign && (
          <p className="text-xs text-violet-600 px-1 flex items-center gap-1">
            <span>{previewSign.symbol}</span>
            <span>You're a <strong>{previewSign.name}</strong> — we'll highlight your events!</span>
          </p>
        )}
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
