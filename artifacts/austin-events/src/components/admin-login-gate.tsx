import { useState, useEffect, useRef } from "react";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWithRef } from "@/components/turnstile-widget";
import type { TurnstileInstance } from "@/components/turnstile-widget";
import { useTenant } from "@/contexts/tenant-context";

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

async function loginWithPassword(password: string, captchaToken: string): Promise<string | null> {
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

async function requestOtp(email: string, captchaToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captchaToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function verifyOtp(email: string, otp: string): Promise<{ token: string } | { error: string }> {
  try {
    const res = await fetch("/api/admin/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.message ?? "Invalid code" };
    return { token: data.token };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

function PasswordLoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaToken && !captchaUnavailable) return;
    setError("");
    setLoading(true);
    const token = await loginWithPassword(password, captchaToken ?? "");
    setLoading(false);
    if (token) {
      onSuccess(token);
    } else {
      setError("Incorrect password");
      setPassword("");
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  }

  return (
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
  );
}

function EmailOtpLoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaToken && !captchaUnavailable) return;
    setError("");
    setLoading(true);
    const ok = await requestOtp(email, captchaToken ?? "");
    setLoading(false);
    if (ok) {
      setStep("otp");
    } else {
      setError("Failed to send code. Please try again.");
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await verifyOtp(email, otp);
    setLoading(false);
    if ("token" in result) {
      onSuccess(result.token);
    } else {
      setError(result.error);
      setOtp("");
    }
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground text-center">
          We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Enter it below.
        </p>
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus
            className="h-11 text-center text-lg tracking-widest font-mono"
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={loading || otp.length !== 6} className="h-11">
            {loading ? "Verifying…" : "Sign in"}
          </Button>
        </form>
        <button
          onClick={() => { setStep("email"); setOtp(""); setError(""); }}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
      <Input
        type="email"
        placeholder="Admin email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
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
      <Button type="submit" disabled={loading || !email || (!captchaToken && !captchaUnavailable)} className="h-11">
        {loading ? "Sending code…" : "Send login code"}
      </Button>
    </form>
  );
}

export function AdminLoginGate({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const [status, setStatus] = useState<"checking" | "unauthenticated" | "authenticated">("checking");

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) { setStatus("unauthenticated"); return; }
    verifyToken(stored).then(valid => {
      setStatus(valid ? "authenticated" : "unauthenticated");
      if (!valid) sessionStorage.removeItem(TOKEN_KEY);
    });
  }, []);

  function handleSuccess(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
    setStatus("authenticated");
  }

  if (status === "checking") return null;
  if (status === "authenticated") return <>{children}</>;

  const subtitle = tenant.hasEmailAdmin
    ? "Enter your email to receive a login code"
    : "Enter your password to continue";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            {tenant.hasEmailAdmin ? <Mail className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>

        {tenant.hasEmailAdmin
          ? <EmailOtpLoginForm onSuccess={handleSuccess} />
          : <PasswordLoginForm onSuccess={handleSuccess} />
        }
      </div>
    </div>
  );
}
