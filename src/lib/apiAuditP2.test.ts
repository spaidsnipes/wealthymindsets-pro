/**
 * API audit P2 (2026-10-09), tightening only: a ceiling on the WOW door and on
 * decision-position writes, a named host list for radio links, and a per-member
 * ceiling on the signed-in data routes that spend the operator's provider keys.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RADIO_LINK_HOSTS, RADIO_LINK_REFUSAL, radioLinkAllowed } from "@/lib/radio/radioLinkHosts";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const STORE = "https://abcd1234.supabase.co";

describe("P2-8 radio links — a short named list", () => {
  it.each([
    "https://abcd1234.supabase.co/storage/v1/object/public/radio/1791000000000-abc123.mp3",
    "https://archive.org/download/some-set/track.mp3",
    "https://ia800100.us.archive.org/1/items/some-set/track.mp3",
    "https://dl.dropboxusercontent.com/s/xyz/track.mp3",
  ])("accepts %s", link => { expect(radioLinkAllowed(link, STORE)).toBe(true); });

  it.each([
    "https://evil.example/track.mp3",
    "https://archive.org.evil.example/track.mp3",          // a look-alike suffix
    "https://evilarchive.org/track.mp3",                   // not a subdomain
    "https://user:pw@archive.org/track.mp3",               // credentials in the link
    "https://archive.org:8443/track.mp3",                  // an odd port
    "http://archive.org/track.mp3",                        // not https
    "https://other-project.supabase.co/storage/v1/object/public/radio/x.mp3",   // someone else's store
    "not a url",
  ])("refuses %s", link => { expect(radioLinkAllowed(link, STORE)).toBe(false); });

  it("the list is short, named and has no wildcard; the route asks it before a link is stored and refuses in plain words", () => {
    expect(RADIO_LINK_HOSTS).toEqual(["archive.org", "dl.dropboxusercontent.com"]);
    expect(RADIO_LINK_REFUSAL).toMatch(/Upload the audio file instead/);
    const route = read("src/app/api/radio/route.ts");
    expect(route.length).toBeGreaterThan(1000);
    const ask = route.indexOf("if (!radioLinkAllowed(u, c.url)) return NextResponse.json({ error: RADIO_LINK_REFUSAL, code: \"LINK_HOST_NOT_ALLOWED\" }, { status: 400 });");
    expect(ask).toBeGreaterThan(0);
    expect(ask).toBeLessThan(route.indexOf("public_url = u;"));
    // A route file exports handlers only (a named constant there fails the build).
    expect(route).not.toMatch(/^export const (?!dynamic\b|runtime\b|revalidate\b)/m);
  });
});

describe("P2-5 / P2-7 ceilings on two write doors", () => {
  it("passport/from-wow counts per address before it reads the form or asks the identity provider", () => {
    const src = read("src/app/api/passport/from-wow/route.ts");
    const post = src.slice(src.indexOf("export async function POST("));
    const limit = post.indexOf("if (!checkRateLimit(`from-wow:${clientIp(request)}`, { max: 20, windowMs: 600_000 }).ok) return tooManyRequests();");
    expect(limit).toBeGreaterThan(0);
    expect(post).toContain("if (!(await edgeAllows([`from-wow:${clientIp(request)}`], AUTH_LOGIN_LIMITER_BINDING))) return tooManyRequests();");
    expect(limit).toBeLessThan(post.indexOf("request.formData()"));
    expect(limit).toBeLessThan(post.indexOf("/auth/v1/user"));
  });

  it("decision-position POST counts per member after the session and owner checks, before the body is read", () => {
    const src = read("src/app/api/decision-position/route.ts");
    const post = src.slice(src.indexOf("export async function POST("));
    const limit = post.indexOf("checkRateLimit(`decision-position:${auth.user.sub}`, { max: 60, windowMs: 60_000 })");
    expect(limit).toBeGreaterThan(post.indexOf("if (mismatch) return mismatch;"));
    expect(limit).toBeLessThan(post.indexOf("await request.json()"));
  });
});

describe("P2-9 the signed-in data routes that spend the operator's keys", () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T18:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("the data lane is 600 a minute per caller, with its own binding in wrangler at the same number", async () => {
    const { PUBLIC_PROXY_LIMIT } = await import("@/lib/publicProxyLimit");
    expect(PUBLIC_PROXY_LIMIT.data).toEqual({ perMinute: 600, binding: "MEMBER_DATA_PROXY_LIMITER" });
    expect(read("wrangler.jsonc")).toContain('{ "name": "MEMBER_DATA_PROXY_LIMITER", "namespace_id": "1010", "simple": { "limit": 600, "period": 60 } }');
    // Seventeen scanner loads' worth of fundamentals inside one minute still pass (one load ≈ 35 requests).
    expect(PUBLIC_PROXY_LIMIT.data.perMinute).toBeGreaterThanOrEqual(17 * 35);
  });

  it("request 601 inside a minute is 429 in plain words; the market and feed lanes are not touched by it", async () => {
    const { publicProxyLimit } = await import("@/lib/publicProxyLimit");
    const req = new Request("https://wm.test/api/fmp?path=/v3/profile/AAPL", { headers: { "cf-connecting-ip": "203.0.113.70" } });
    for (let i = 0; i < 600; i++) expect(await publicProxyLimit(req, "data")).toBeNull();
    const stopped = await publicProxyLimit(req, "data");
    expect(stopped?.status).toBe(429);
    expect((await stopped!.json() as { code: string }).code).toBe("RATE_LIMITED");
    expect(await publicProxyLimit(req, "market")).toBeNull();
    expect(await publicProxyLimit(req, "feed")).toBeNull();
  });

  it("each route asks the ceiling straight after the session check (symbol search, which also answers guests, asks it first)", () => {
    const lanes: [string, string][] = [
      ["market-data/alpaca/options", "data"], ["market-data/cboe/options", "data"], ["market-data/deribit/options", "data"], ["fmp", "data"],
      ["fundamentals/sec", "data"], ["discovery", "data"], ["youtube-live", "data"], ["youtube-recent", "data"], ["heatmap", "data"],
      ["finnhub", "market"], ["alpaca", "market"], ["market", "market"],
    ];
    expect(lanes.length).toBeGreaterThan(11);
    for (const [r, lane] of lanes) {
      const src = read(`src/app/api/${r}/route.ts`);
      expect(src.length, r).toBeGreaterThan(300);
      expect(src, r).toMatch(new RegExp(`if \\(!auth\\.ok\\) return auth\\.response;\\n  // API audit P2-9[^\\n]*\\n  \\{ const limited = await publicProxyLimit\\((?:request|req), "${lane}"\\); if \\(limited\\) return limited; \\}`));
    }
    const search = read("src/app/api/symbol-search/route.ts");
    const get = search.slice(search.indexOf("export async function GET("));
    expect(get.indexOf('publicProxyLimit(request, "data")')).toBeGreaterThan(0);
    expect(get.indexOf('publicProxyLimit(request, "data")')).toBeLessThan(get.indexOf("searchParams"));
  });
});
