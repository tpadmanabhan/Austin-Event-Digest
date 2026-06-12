const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  if (!TURNSTILE_SECRET) {
    return true;
  }
  if (!token) return false;

  try {
    const params = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (ip) params.set("remoteip", ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: params,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
