import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MEMBER-BROKER-CONNECT.md — negative-first. A member's own tastytrade grant
 * serves that member only; the Founder's credentials never serve a member; no
 * secret is stored in plaintext or returned to the browser.
 */
const h = vi.hoisted(() => {
  const raw = new Map<string, string>();
  return {
    raw,
    user: { sub: "member-A" },
    kv: {
      async get(k: string) { return raw.get(k) ?? null; },
      async put(k: string, v: string) { raw.set(k, v); },
      async delete(k: string) { raw.delete(k); },
    },
    oauthBodies: [] as Record<string, string>[],
    workerEnv: { WEBULL_SESSION: null as unknown },
  };
});

vi.mock("@/lib/requireAuth", () => ({ requireAuth: vi.fn(async () => ({ ok: true, user: h.user })) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: h.workerEnv }) }));

import { DELETE, GET, POST } from "./route";
import { GET as QUOTE_TOKEN } from "../../tastytrade/quote-token/route";
import { GET as CHAIN } from "../../tastytrade/chain/route";

const FOUNDER = { secret: "FOUNDER-CLIENT-SECRET-xx", refresh: "FOUNDER-REFRESH-TOKEN-xxxxxxxx" };
const memberPair = (who: string) => ({ clientSecret: `${who}-client-secret`, refreshToken: `${who}-refresh-token-0123456789` });

function fakeTastytrade(url: string, init?: RequestInit): Response {
  const auth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
  if (url.endsWith("/oauth/token")) {
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    h.oauthBodies.push(body);
    const valid = body.refresh_token === FOUNDER.refresh
      ? body.client_secret === FOUNDER.secret
      : /-refresh-token-/.test(body.refresh_token) && body.client_secret === body.refresh_token.replace("-refresh-token-0123456789", "-client-secret");
    if (!valid) return new Response(JSON.stringify({ error: "invalid_grant", echo: body.refresh_token }), { status: 401 });
    const who = body.refresh_token === FOUNDER.refresh ? "owner" : body.refresh_token.split("-refresh")[0];
    return Response.json({ access_token: `access-${who}`, expires_in: 900 });
  }
  const who = auth.replace("Bearer access-", "");
  if (url.endsWith("/customers/me/accounts")) return Response.json({ data: { items: [{ account: { "account-number": `ACCT-${who}` } }] } });
  if (url.endsWith("/api-quote-tokens")) return Response.json({ data: { token: `dx-${who}`, "dxlink-url": "wss://tasty-openapi-ws.dxfeed.com/realtime", level: "api" } });
  if (url.includes("/option-chains/")) return Response.json({ data: { for: who } });
  return new Response("{}", { status: 404 });
}

const req = (path: string, init?: { method?: string; body?: unknown; origin?: string }) =>
  new NextRequest(`https://wealthymindsetspro.com${path}`, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", ...(init?.origin ? { origin: init.origin } : {}) },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

const as = (sub: string) => { h.user = { sub }; };

describe("member-owned tastytrade connections", () => {
  beforeEach(() => {
    h.raw.clear();
    h.oauthBodies.length = 0;
    h.workerEnv = { WEBULL_SESSION: h.kv };
    vi.stubEnv("WEBULL_OWNER_USER_ID", "owner-1");
    vi.stubEnv("WM_BROKER_GRANT_KEY", "unit-test-grant-key-0123456789abcdef");
    vi.stubEnv("TASTYTRADE_CLIENT_SECRET", FOUNDER.secret);
    vi.stubEnv("TASTYTRADE_REFRESH_TOKEN", FOUNDER.refresh);
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL, i?: RequestInit) => fakeTastytrade(String(u), i)));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("connects a member after a READ-scope validation with THEIR secret; nothing secret at rest or in the answer", async () => {
    as("member-A");
    const pair = memberPair("memberA");
    const res = await POST(req("/api/broker/member/tastytrade", { method: "POST", body: pair, origin: "https://wealthymindsetspro.com" }));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ state: "CONNECTED", connected: true, accounts: 1, quotes: true, level: "api" });
    for (const s of [pair.clientSecret, pair.refreshToken, "access-memberA", "dx-memberA", "ACCT-memberA"]) expect(text).not.toContain(s);
    // validated with the member's own pair, read scope, never the Founder's secret
    expect(h.oauthBodies).toHaveLength(1);
    expect(h.oauthBodies[0]).toMatchObject({ refresh_token: pair.refreshToken, client_secret: pair.clientSecret, scope: "read" });
    // no plaintext at rest, and the KV key does not carry the user id
    expect(h.raw.size).toBe(1);
    const atRest = [...h.raw.values()].join("\n") + [...h.raw.keys()].join();
    for (const s of [pair.clientSecret, pair.refreshToken, "member-A"]) expect(atRest).not.toContain(s);
    // status read is secret-free
    const status = await (await GET(req("/api/broker/member/tastytrade"))).text();
    expect(JSON.parse(status)).toMatchObject({ state: "CONNECTED" });
    expect(status).not.toContain(pair.refreshToken);
  });

  it("refuses bad credentials without storing anything or echoing the input", async () => {
    as("member-bad");
    const res = await POST(req("/api/broker/member/tastytrade", { method: "POST", body: { clientSecret: "wrong-secret-xx", refreshToken: "memberZ-refresh-token-0123456789" } }));
    const text = await res.text();
    expect(res.status).toBe(400);
    expect(text).toContain("HTTP 401");
    expect(text).not.toContain("memberZ-refresh-token");
    expect(h.raw.size).toBe(0);
  });

  it("member A's grant serves A only: B is refused, the owner keeps the Founder's wire", async () => {
    as("member-A2");
    await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("memberA2") }));

    const a = await (await QUOTE_TOKEN(req("/api/broker/tastytrade/quote-token"))).json();
    expect(a).toMatchObject({ state: "OK", token: "dx-memberA2", lane: "MEMBER" });

    as("member-B");
    const b = await QUOTE_TOKEN(req("/api/broker/tastytrade/quote-token"));
    expect(b.status).toBe(403);
    expect(await b.text()).not.toContain("dx-");
    expect((await CHAIN(req("/api/broker/tastytrade/chain?symbol=TSLA"))).status).toBe(403);

    as("owner-1");
    const o = await (await QUOTE_TOKEN(req("/api/broker/tastytrade/quote-token"))).json();
    expect(o).toMatchObject({ state: "OK", token: "dx-owner", lane: "OWNER" });
  });

  it("a member's chain read rides their own access token — the Founder's credentials never serve a member", async () => {
    as("member-C");
    await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("memberC") }));
    h.oauthBodies.length = 0;
    const chain = await (await CHAIN(req("/api/broker/tastytrade/chain?symbol=TSLA"))).json();
    expect(chain).toMatchObject({ state: "OK", data: { for: "memberC" } });
    expect(h.oauthBodies.some(b => b.client_secret === FOUNDER.secret)).toBe(false);
  });

  it("disconnect deletes the grant and the member falls back to the refusal", async () => {
    as("member-D");
    await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("memberD") }));
    expect(h.raw.size).toBe(1);
    const res = await DELETE(req("/api/broker/member/tastytrade", { method: "DELETE" }));
    expect(await res.json()).toMatchObject({ state: "NOT_CONNECTED" });
    expect(h.raw.size).toBe(0);
    expect((await QUOTE_TOKEN(req("/api/broker/tastytrade/quote-token"))).status).toBe(403);
  });

  it("the owner cannot overwrite the deployment wire with a member grant", async () => {
    as("owner-1");
    const res = await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("owner") }));
    expect(res.status).toBe(409);
    expect(h.raw.size).toBe(0);
  });

  it("without WM_BROKER_GRANT_KEY the feature reports 'not enabled' and stores nothing", async () => {
    vi.stubEnv("WM_BROKER_GRANT_KEY", "");
    as("member-E");
    expect(await (await GET(req("/api/broker/member/tastytrade"))).json()).toMatchObject({ state: "MEMBER_CONNECTIONS_NOT_ENABLED", connected: false });
    const res = await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("memberE") }));
    expect(res.status).toBe(503);
    expect(h.raw.size).toBe(0);
    expect(h.oauthBodies).toHaveLength(0);
  });

  it("without the KV binding the feature reports 'not enabled'", async () => {
    h.workerEnv = { WEBULL_SESSION: null };
    as("member-F");
    expect(await (await GET(req("/api/broker/member/tastytrade"))).json()).toMatchObject({ state: "MEMBER_CONNECTIONS_NOT_ENABLED" });
  });

  it("refuses a cross-site connect, and a malformed body never reaches tastytrade", async () => {
    as("member-G");
    expect((await POST(req("/api/broker/member/tastytrade", { method: "POST", body: memberPair("memberG"), origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(req("/api/broker/member/tastytrade", { method: "POST", body: { clientSecret: "x", refreshToken: "y" } }))).status).toBe(400);
    expect(h.oauthBodies).toHaveLength(0);
  });

  it("rate-limits connect/disconnect per member", async () => {
    as("member-H");
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await DELETE(req("/api/broker/member/tastytrade", { method: "DELETE" }))).status);
    expect(codes.slice(0, 5).every(c => c === 200)).toBe(true);
    expect(codes[5]).toBe(429);
  });
});
