/**
 * Edge rate limit — the ceiling an in-memory limiter cannot hold (2026-10-04).
 *
 * `checkRateLimit` counts inside one Worker isolate. Measured in production
 * the night it shipped: seven rapid calls to resend-confirmation from one
 * machine all answered 200, because Cloudflare spread them over isolates.
 *
 * The Workers Rate Limiting binding counts per Cloudflare location, across
 * isolates. Declared in wrangler.jsonc (`ratelimits`). Absent the binding —
 * vitest, `next dev`, or an unprovisioned deploy — this answers "allowed" so
 * the in-memory limiter still stands guard: a missing binding must cost a
 * ceiling, never a working route.
 */
export const AUTH_MAIL_LIMITER_BINDING = "AUTH_MAIL_LIMITER";

interface RateLimitBinding { limit(opts: { key: string }): Promise<{ success: boolean }> }

function bindingFrom(env: unknown, name: string): RateLimitBinding | null {
  const candidate = env && typeof env === "object" ? (env as Record<string, unknown>)[name] : null;
  return candidate && typeof (candidate as RateLimitBinding).limit === "function" ? candidate as RateLimitBinding : null;
}

async function workerEnv(): Promise<unknown> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return getCloudflareContext().env;
  } catch {
    return undefined;
  }
}

/** True when every key is under the edge ceiling (or no binding exists). */
export async function edgeAllows(keys: readonly string[], binding = AUTH_MAIL_LIMITER_BINDING, env?: unknown): Promise<boolean> {
  const limiter = bindingFrom(env ?? await workerEnv(), binding);
  if (!limiter) return true;
  for (const key of keys) {
    try {
      if (!(await limiter.limit({ key })).success) return false;
    } catch {
      // A limiter outage must not lock people out of their own accounts.
    }
  }
  return true;
}

export function tooManyMailRequests(): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Wait a minute and try again." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}
