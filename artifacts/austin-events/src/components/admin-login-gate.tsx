import { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWithRef } from "@/components/turnstile-widget";
import type { TurnstileInstance } from "@/components/turnstile-widget";

const TOKEN_KEY = "admin_token";

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

async function login(password: string, captchaToken: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, captchaToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export function AdminLoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "unauthenticated" | "authenticated">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) { setStatus("unauthenticated"); return; }
    verifyToken(stored).then(valid => {
      setStatus(valid ? "authenticated" : "unauthenticated");
      if (!valid) sessionStorage.removeItem(TOKEN_KEY);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaToken && !captchaUnavailable) return;
    setError("");
    setLoading(true);
    const token = await login(password, captchaToken ?? "");
    setLoading(false);
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      setStatus("authenticated");
    } else {
      setError("Incorrect password");
      setPassword("");
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  }

  if (status === "checking") return null;

  if (status === "authenticated") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Lock className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your password to continue</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="h-11"
          />
          {!captchaUnavailable && (
            <TurnstileWithRef
              turnstileRef={turnstileRef}
              onSuccess={setCaptchaToken}
              onError={() => { setCaptchaToken(null); setCaptchaUnavailable(true); }}
              onExpire={() => setCaptchaToken(null)}
            />
          )}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={loading || !password || (!captchaToken && !captchaUnavailable)} className="h-11">
            {loading ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
