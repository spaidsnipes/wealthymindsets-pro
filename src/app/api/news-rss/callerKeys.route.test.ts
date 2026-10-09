/**
 * API audit P1-2 (2026-10-09) — /api/news-rss no longer relays a caller's
 * NewsAPI key or X bearer for anyone. The two keyed lanes need a signed-in
 * session, this site's own origin and a small limiter; everyone else gets the
 * public feeds only and the keys are never used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let who: string | null = null;
vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (who
    ? { ok: true, user: { sub: who, email: "x@wm.test", iat: 0 } }
    : { ok: false, response: new Response("{}", { status: 401 }) }),
}));

let hosts: string[] = [];
const keyed = () => hosts.filter(h => h === "newsapi.org" || h === "api.twitter.com");
const KEYS = { "x-newsapi-key": "caller-news-key", "x-x-bearer": "caller-x-bearer" };

async function get(headers: Record<string, string> = {}) {
  const { GET } = await import("./route");
  return GET(new Request("https://wm.test/api/news-rss", { headers: { "cf-connecting-ip": "203.0.113.7", ...headers } }));
}

beforeEach(() => {
  who = null; hosts = [];
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
    hosts.push(new URL(String(url)).host);
    return new Response("<rss><channel></channel></rss>", { status: 200, headers: { "content-type": "application/xml" } });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("/api/news-rss caller-key lanes", () => {
  it("a guest who sends keys gets the public feeds (200) and ZERO calls to NewsAPI or X", async () => {
    const res = await get(KEYS);
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json() as { items: unknown[] }).items)).toBe(true);
    expect(hosts.length).toBeGreaterThan(0);          // the public feeds were asked
    expect(keyed()).toEqual([]);
  });

  it("a guest with no keys is unchanged: public feeds, 200", async () => {
    expect((await get()).status).toBe(200);
    expect(keyed()).toEqual([]);
  });

  it("a signed-in member on this site's origin may use their own keys", async () => {
    who = "member-7";
    expect((await get({ ...KEYS, origin: "https://wm.test" })).status).toBe(200);
    expect(keyed().sort()).toEqual(["api.twitter.com", "newsapi.org"]);
  });

  it("a signed-in member's keys are NOT used from another site's origin", async () => {
    who = "member-7";
    expect((await get({ ...KEYS, origin: "https://evil.example" })).status).toBe(200);
    expect(keyed()).toEqual([]);
  });

  it("the keyed lane is limited to ten a minute per member; past it the request is still answered from public feeds", async () => {
    who = "member-8";
    for (let i = 0; i < 10; i++) await get(KEYS);
    const before = keyed().length;
    expect(before).toBe(20);
    expect((await get(KEYS)).status).toBe(200);
    expect(keyed().length).toBe(before);
  });
});
