/**
 * THE GATE IN FRONT OF THE FIVE CREDENTIAL-PROBE ROUTES (API audit P1-1, 2026-10-09).
 *
 * /api/broker/{alpaca,binance,coinbase,kraken,oanda} take an API key + secret
 * from the request, sign one read-only balance call with them and answer with
 * the balance. Before this gate ANY signed-in member could do that, unlimited:
 * a validity oracle for stolen exchange keys from WM's address, and a member's
 * live exchange secret crossing WM's server for a feature the public pages say
 * is "not enabled for members yet" (sellingStory.WHAT_IS_LIVE).
 *
 * TIGHTENING ONLY. In order:
 *   1. same-origin — a cross-site page never reaches the probe;
 *   2. operator only — the owner keeps the probe exactly as it was; a member is
 *      told, in the selling page's own words, that it is not enabled yet;
 *   3. a small limiter — five probes per ten minutes.
 * The caller has already required a signed-in session (a guest stays 401).
 */
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { checkRateLimit } from "@/lib/rateLimit";

export const CREDENTIAL_PROBE_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;

export const CREDENTIAL_PROBE_MEMBER_REFUSAL = {
  error: "Connecting your own broker account is not enabled for members yet.",
  code: "MEMBER_CONNECTIONS_NOT_ENABLED",
} as const;

export const CROSS_SITE_REFUSAL = { error: "Cross-site request refused.", code: "CROSS_SITE_REFUSED" } as const;

/** What a probe says when the provider did not accept the credentials — never the provider's own text. */
export const CREDENTIAL_PROBE_INVALID = "Invalid credentials" as const;

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" } as const;
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: NO_STORE });

/**
 * Same-origin when the browser named an origin and it is this host. No Origin
 * header (a same-site navigation or a non-browser caller): the SameSite=Lax
 * session cookie already keeps a cross-site POST from being signed in.
 */
export function requestIsSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === new URL(req.url).host || host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Null when the probe may run; otherwise the refusal to return. */
export function credentialProbeGate(req: Request, userId: string, env: Readonly<Record<string, string | undefined>> = process.env): Response | null {
  if (!requestIsSameOrigin(req)) return json(CROSS_SITE_REFUSAL, 403);
  if (!tastytradeOwnerGate(userId, env).allowed) return json(CREDENTIAL_PROBE_MEMBER_REFUSAL, 403);
  const rl = checkRateLimit(`credential-probe:${userId}`, CREDENTIAL_PROBE_LIMIT);
  if (!rl.ok) return rl.response;
  return null;
}
