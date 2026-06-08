import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscribe } from "@/hooks/use-newsletter";
import { useToast } from "@/hooks/use-toast";

const subscribeSchema = z.object({
  name: z.string().min(2, "Name is too short").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email address"),
});

export function SubscribeForm() {
  const { toast } = useToast();
  const { mutate: subscribe, isPending: isSubscribing } = useSubscribe();
  const [subscribed, setSubscribed] = useState(false);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = (values: z.infer<typeof subscribeSchema>) => {
    subscribe(
      { data: values },
      {
        onSuccess: () => {
          setSubscribed(true);
          form.reset();
          toast({
            title: "You're on the list! 🎉",
            description: "Keep an eye on your inbox this Sunday.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Uh oh!",
            description: err.message || "Failed to subscribe. Please try again.",
          });
        },
      }
    );
  };

  if (subscribed) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl font-bold mb-2">You're on the list!</h3>
        <p className="text-muted-foreground">Get ready for your first digest this Sunday.</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        Get the weekly newsletter
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Input
            placeholder="First Name (optional)"
            className="h-12 rounded-xl bg-background/50"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive px-1">{form.formState.errors.name.message}</p>
          )}
        </div>
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
      </div>
      <Button
        type="submit"
        disabled={isSubscribing}
        className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
      >
        {isSubscribing ? "Subscribing..." : "Subscribe for Free"}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-3">
        No spam. Unsubscribe anytime.
      </p>
    </form>
  );
}
