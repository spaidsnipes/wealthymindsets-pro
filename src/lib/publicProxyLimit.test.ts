/**
 * API audit P1-6 (2026-10-09) — the ceiling on the six public upstream proxies.
 * A member is counted by user id, a guest by address; the numbers are sized from
 * serving measurements and never bite the Founder's own pages.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const req = (headers: Record<string, string> = {}) => new Request("https://wm.test/api/yahoo?sym=SPY&type=quote", { headers });

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T17:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("who is counted", () => {
  it("a guest is keyed by the address Cloudflare saw; a signed-in member by user id, read from the cookie's signature alone", async () => {
    const { publicProxyCaller } = await import("./publicProxyLimit");
    const { signJWT } = await import("@/lib/auth");
    expect(publicProxyCaller(req({ "cf-connecting-ip": "203.0.113.9" }))).toEqual({ key: "ip:203.0.113.9", signedIn: false });
    const jwt = signJWT({ sub: "member-7", email: "m@wm.test" } as never);
    expect(publicProxyCaller(req({ "cf-connecting-ip": "203.0.113.9", cookie: `wm_auth=${jwt}` }))).toEqual({ key: "user:member-7", signedIn: true });
    // A forged or garbled cookie is a guest, never an error.
    expect(publicProxyCaller(req({ "cf-connecting-ip": "203.0.113.9", cookie: "wm_auth=not.a.token" })).signedIn).toBe(false);
    // No network on a quote path: the caller is read without requireAuth.
    expect(read("src/lib/publicProxyLimit.ts")).not.toMatch(/requireAuth|supabase/i);
  });
});

describe("the numbers", () => {
  it("market is 1,800 a minute and feed 120 — and wrangler's bindings carry exactly those numbers", async () => {
    const { PUBLIC_PROXY_LIMIT } = await import("./publicProxyLimit");
    expect(PUBLIC_PROXY_LIMIT.market).toEqual({ perMinute: 1_800, binding: "PUBLIC_MARKET_PROXY_LIMITER" });
    expect(PUBLIC_PROXY_LIMIT.feed).toEqual({ perMinute: 120, binding: "PUBLIC_FEED_PROXY_LIMITER" });
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).toContain('{ "name": "PUBLIC_MARKET_PROXY_LIMITER", "namespace_id": "1008", "simple": { "limit": 1800, "period": 60 } }');
    expect(wrangler).toContain('{ "name": "PUBLIC_FEED_PROXY_LIMITER", "namespace_id": "1009", "simple": { "limit": 120, "period": 60 } }');
    expect(wrangler.match(/"namespace_id": "100[4-9]"/g)).toHaveLength(6);          // no namespace reused
  });

  it("sized so the Founder's own pages never reach it: fifteen of the heaviest measured page inside one minute still pass", async () => {
    // Measured on serving e05c774 (first 60 s): /scanner 90 + its FVG read 30, /desk 80 + 16, /charts 5 + 1.
    const heaviestPage = 90 + 30;
    const { PUBLIC_PROXY_LIMIT, publicProxyLimit } = await import("./publicProxyLimit");
    expect(PUBLIC_PROXY_LIMIT.market.perMinute).toBeGreaterThanOrEqual(15 * heaviestPage);
    const founder = req({ "cf-connecting-ip": "198.51.100.1" });
    for (let i = 0; i < 15 * heaviestPage; i++) expect(await publicProxyLimit(founder, "market"), `request ${i + 1}`).toBeNull();
  });
});

describe("the ceiling", () => {
  it("request 1,801 inside a minute is 429 in plain words with Retry-After; a minute later the caller is served again", async () => {
    const { publicProxyLimit } = await import("./publicProxyLimit");
    const loop = req({ "cf-connecting-ip": "203.0.113.50" });
    for (let i = 0; i < 1_800; i++) expect(await publicProxyLimit(loop, "market")).toBeNull();
    const stopped = await publicProxyLimit(loop, "market");
    expect(stopped?.status).toBe(429);
    expect(stopped?.headers.get("retry-after")).toBe("60");
    expect(await stopped!.json()).toEqual({ error: "Too many requests in a short time. Wait a minute and try again.", code: "RATE_LIMITED" });
    vi.advanceTimersByTime(61_000);
    expect(await publicProxyLimit(loop, "market")).toBeNull();
  });

  it("one caller's loop never stops another caller, and the feed lane has its own count", async () => {
    const { publicProxyLimit } = await import("./publicProxyLimit");
    const loop = req({ "cf-connecting-ip": "203.0.113.51" });
    for (let i = 0; i < 121; i++) await publicProxyLimit(loop, "feed");
    expect((await publicProxyLimit(loop, "feed"))?.status).toBe(429);
    expect(await publicProxyLimit(loop, "market")).toBeNull();                               // another lane
    expect(await publicProxyLimit(req({ "cf-connecting-ip": "203.0.113.52" }), "feed")).toBeNull(); // another caller
  });

  it("the edge binding is asked with the caller's key, and its refusal is honoured; a limiter outage never blocks a quote", async () => {
    const { publicProxyLimit } = await import("./publicProxyLimit");
    const asked: string[] = [];
    const env = { PUBLIC_MARKET_PROXY_LIMITER: { limit: async ({ key }: { key: string }) => { asked.push(key); return { success: false }; } } };
    expect((await publicProxyLimit(req({ "cf-connecting-ip": "203.0.113.60" }), "market", env))?.status).toBe(429);
    expect(asked).toEqual(["market:ip:203.0.113.60"]);
    const broken = { PUBLIC_MARKET_PROXY_LIMITER: { limit: async () => { throw new Error("limiter down"); } } };
    expect(await publicProxyLimit(req({ "cf-connecting-ip": "203.0.113.61" }), "market", broken)).toBeNull();
  });
});

describe("every public proxy asks it first", () => {
  it("the six routes call the limiter before anything else in GET, each on its lane", () => {
    const routes: [string, string][] = [["yahoo", "market"], ["exchange", "market"], ["memecoin", "feed"], ["polymarket", "feed"], ["sentiment", "feed"], ["news-rss", "feed"]];
    expect(routes.length).toBeGreaterThan(5);
    for (const [r, lane] of routes) {
      const src = read(`src/app/api/${r}/route.ts`);
      expect(src.length, r).toBeGreaterThan(500);
      const get = src.slice(src.indexOf("export async function GET("));
      const call = get.indexOf(`"${lane}"); if (limited) return limited; }`);
      expect(call, r).toBeGreaterThan(0);
      expect(get.slice(0, call), r).not.toMatch(/fetch\(|searchParams|await (?!publicProxyLimit)/);
    }
  });
});

describe("housekeeping never shortens a longer limiter", () => {
  it("a ten-minute limiter still counts its early hits after a one-minute caller's sweep", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    const TEN = { max: 2, windowMs: 600_000 };
    expect(checkRateLimit("ten:a", TEN).ok).toBe(true);
    expect(checkRateLimit("ten:a", TEN).ok).toBe(true);
    vi.advanceTimersByTime(120_000);                                     // two minutes later
    expect(checkRateLimit("one:b", { max: 5, windowMs: 60_000 }).ok).toBe(true);   // a 60 s caller triggers the sweep
    expect(checkRateLimit("ten:a", TEN).ok).toBe(false);                 // the ten-minute count survived
    vi.advanceTimersByTime(600_000);
    expect(checkRateLimit("ten:a", TEN).ok).toBe(true);
  });
});
