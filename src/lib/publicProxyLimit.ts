/**
 * THE LIMITER ON THE PUBLIC UPSTREAM PROXIES (API audit P1-6, 2026-10-09).
 *
 * /api/yahoo, /api/exchange, /api/memecoin, /api/polymarket, /api/sentiment and
 * /api/news-rss answer anyone and each fans out to a vendor from WM's address.
 * None was limited, so a stranger's loop could get WM's egress throttled by
 * Yahoo or Coinbase while the Founder trades (the Finnhub 429 self-storm, from
 * outside). The public pages need quotes, so the fix is a ceiling, not a login.
 *
 * WHO IS COUNTED. A signed-in member is keyed by user id (read from the session
 * cookie's signature only — no network call on a quote path), so a shared office
 * address never punishes a member. A guest is keyed by the address Cloudflare saw.
 *
 * THE NUMBERS, AND HOW THEY WERE SIZED. Measured on serving e05c774, 12:14 CDT
 * Oct 9, first 60 s of one page load, requests to /api/yahoo + /api/exchange:
 *     /scanner           90 + 0   (60 of them inside the first 10 s)
 *     /desk (4-up)       80 + 16
 *     /charts NQ1! 5m     5 + 1
 *   + the scanner's FVG read: 30 more, on request.
 * So the heaviest single page costs about 120 a minute. MARKET is set at 1,800 a
 * minute per caller — fifteen of the heaviest page opened inside the same minute
 * by one person (the Founder's own tabs plus every verification frame share his
 * key) — which is still a hard stop for a loop: 30 requests a second, no more.
 * FEED (news, sentiment, prediction markets, memecoins) measured 0 on those
 * pages; its own rooms poll a handful of times a minute: 120 a minute.
 *
 * TWO LAYERS. The Cloudflare binding counts across isolates in a location; the
 * in-isolate counter is the floor when no binding is bound (local, tests). A
 * limiter outage never blocks a quote (edgeAllows fails open by design).
 */
import { getAuthToken, verifyJWT } from "@/lib/auth";
import { clientIp, edgeAllows } from "@/lib/edgeRateLimit";
import { checkRateLimit } from "@/lib/rateLimit";

export type PublicProxyLane = "market" | "feed" | "data";

export const PUBLIC_PROXY_LIMIT: Readonly<Record<PublicProxyLane, { readonly perMinute: number; readonly binding: string }>> = {
  market: { perMinute: 1_800, binding: "PUBLIC_MARKET_PROXY_LIMITER" },
  feed: { perMinute: 120, binding: "PUBLIC_FEED_PROXY_LIMITER" },
  // API audit P2-9 (2026-10-09): the signed-in data routes that spend the operator's provider keys
  // (options chains, fundamentals, symbol search, discovery, video lookups) — per member, per minute.
  // Sized from the same serving read: one /scanner load asks fundamentals for its 30 symbols (about
  // 31–35 requests); a chart asks one chain. 600 is seventeen scanner loads inside one minute.
  data: { perMinute: 600, binding: "MEMBER_DATA_PROXY_LIMITER" },
};

export const PUBLIC_PROXY_LIMITED = {
  error: "Too many requests in a short time. Wait a minute and try again.",
  code: "RATE_LIMITED",
} as const;

/** Who is asking: the member (from the cookie's signature) or the guest's address. */
export function publicProxyCaller(req: Request): { readonly key: string; readonly signedIn: boolean } {
  let sub: string | null = null;
  try {
    const token = getAuthToken(req);
    sub = token ? verifyJWT(token)?.sub ?? null : null;
  } catch {
    sub = null;
  }
  return sub ? { key: `user:${sub}`, signedIn: true } : { key: `ip:${clientIp(req)}`, signedIn: false };
}

/** Null when the request may go on; otherwise the 429 to return. */
export async function publicProxyLimit(req: Request, lane: PublicProxyLane, env?: unknown): Promise<Response | null> {
  const { perMinute, binding } = PUBLIC_PROXY_LIMIT[lane];
  const { key } = publicProxyCaller(req);
  const local = checkRateLimit(`public-proxy:${lane}:${key}`, { max: perMinute, windowMs: 60_000 });
  const allowed = local.ok && (await edgeAllows([`${lane}:${key}`], binding, env));
  if (allowed) return null;
  return new Response(JSON.stringify(PUBLIC_PROXY_LIMITED), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60", "Cache-Control": "no-store" },
  });
}
