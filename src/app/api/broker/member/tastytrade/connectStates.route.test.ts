import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Connect card's states, measured at a fake tastytrade (brief 2026-10-20):
 * invalid credentials, expired authorization, missing permissions, a partial
 * set of capabilities, and every capability checked on its own. Nothing secret
 * or account-identifying in any answer; nothing stored unless tastytrade
 * accepted the pair.
 */
const h = vi.hoisted(() => {
  const raw = new Map<string, string>();
  return {
    raw,
    user: { sub: "member-S" },
    kv: {
      async get(k: string) { return raw.get(k) ?? null; },
      async put(k: string, v: string) { raw.set(k, v); },
      async delete(k: string) { raw.delete(k); },
    },
    /** What the fake tastytrade does. */
    mode: {
      mint: 200 as number,
      accounts: 200 as number,
      quotes: 200 as number,
      quoteToken: 200 as number,
      balances: 200 as number,
      positions: 200 as number,
      orders: 200 as number,
    },
    calls: [] as { method: string; url: string }[],
    workerEnv: { WEBULL_SESSION: null as unknown },
  };
});

vi.mock("@/lib/requireAuth", () => ({ requireAuth: vi.fn(async () => ({ ok: true, user: h.user })) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: h.workerEnv }) }));

import { GET, POST, PUT } from "./route";

const PAIR = { clientSecret: "member-client-secret-xx", refreshToken: "member-refresh-token-0123456789" };
const ACCOUNT = "5WT00042";

function fake(url: string, init?: RequestInit): Response {
  h.calls.push({ method: init?.method ?? "GET", url });
  const err = (status: number) => new Response(JSON.stringify({ error: { message: "nope", echo: PAIR.refreshToken } }), { status });
  if (url.endsWith("/oauth/token")) return h.mode.mint === 200 ? Response.json({ access_token: "access-member", expires_in: 900 }) : err(h.mode.mint);
  if (url.endsWith("/customers/me/accounts")) {
    return h.mode.accounts === 200
      ? Response.json({ data: { items: [{ account: { "account-number": ACCOUNT, "account-type-name": "Individual", "margin-or-cash": "Margin" } }] } })
      : err(h.mode.accounts);
  }
  if (url.includes("/market-data/by-type")) return h.mode.quotes === 200 ? Response.json({ data: { items: [{ symbol: "SPY", bid: 1 }] } }) : err(h.mode.quotes);
  if (url.endsWith("/api-quote-tokens")) return h.mode.quoteToken === 200 ? Response.json({ data: { token: "dx-member", "dxlink-url": "wss://x", level: "api" } }) : err(h.mode.quoteToken);
  if (url.endsWith(`/accounts/${ACCOUNT}/balances`)) return h.mode.balances === 200 ? Response.json({ data: { "cash-balance": "10.00" } }) : err(h.mode.balances);
  if (url.endsWith(`/accounts/${ACCOUNT}/positions`)) return h.mode.positions === 200 ? Response.json({ data: { items: [] } }) : err(h.mode.positions);
  if (url.endsWith(`/accounts/${ACCOUNT}/orders/live`)) return h.mode.orders === 200 ? Response.json({ data: { items: [] } }) : err(h.mode.orders);
  return err(404);
}

const req = (method: string, body?: unknown) =>
  new NextRequest("https://wealthymindsetspro.com/api/broker/member/tastytrade", {
    method,
    headers: { "content-type": "application/json", origin: "https://wealthymindsetspro.com" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let n = 0;
const fresh = () => { h.user = { sub: `member-S${++n}` }; };

function expectNothingSecret(text: string) {
  for (const s of [PAIR.clientSecret, PAIR.refreshToken, "access-member", "dx-member", ACCOUNT]) expect(text).not.toContain(s);
}

describe("member tastytrade Connect — states and per-capability checks", () => {
  beforeEach(() => {
    h.raw.clear();
    h.calls.length = 0;
    h.mode = { mint: 200, accounts: 200, quotes: 200, quoteToken: 200, balances: 200, positions: 200, orders: 200 };
    h.workerEnv = { WEBULL_SESSION: h.kv };
    vi.stubEnv("WEBULL_OWNER_USER_ID", "owner-1");
    vi.stubEnv("WM_BROKER_GRANT_KEY", "unit-test-grant-key-0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL, i?: RequestInit) => fake(String(u), i)));
    fresh();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("all five capabilities pass → Connected, with environment and account kind but no account number", async () => {
    const res = await POST(req("POST", PAIR));
    const text = await res.text();
    expect(res.status).toBe(200);
    const j = JSON.parse(text);
    expect(j).toMatchObject({ state: "CONNECTED", connection: "CONNECTED", environment: "LIVE", accounts: 1, accountKinds: ["Individual · Margin"] });
    expect(j.checks.map((c: { key: string; result: string }) => `${c.key}:${c.result}`)).toEqual([
      "quotes:PASS", "history:PASS", "balances:PASS", "positions:PASS", "orders:PASS",
    ]);
    expect(j.lastCheckAt).toBe(j.validatedAt);
    expectNothingSecret(text);
  });

  it("each capability is checked on its own: one refusal never hides the others", async () => {
    h.mode.balances = 500;
    const j = await (await POST(req("POST", PAIR))).json();
    expect(j.connection).toBe("PARTIAL");
    const by = Object.fromEntries(j.checks.map((c: { key: string; result: string; httpStatus: number | null }) => [c.key, `${c.result}/${c.httpStatus}`]));
    expect(by).toEqual({ quotes: "PASS/null", history: "PASS/null", balances: "FAILED/500", positions: "PASS/null", orders: "PASS/null" });
  });

  it("checking orders only READS them — no order is ever sent with a member grant", async () => {
    await POST(req("POST", PAIR));
    await PUT(req("PUT"));
    const writes = h.calls.filter(c => c.method !== "GET" && !c.url.endsWith("/oauth/token"));
    expect(writes).toEqual([]);
    expect(h.calls.some(c => /\/orders(\/dry-run)?$/.test(c.url))).toBe(false);
  });

  it("INVALID CREDENTIALS: tastytrade refuses the pair → 400 in plain words, nothing stored, nothing echoed", async () => {
    h.mode.mint = 401;
    const res = await POST(req("POST", PAIR));
    const text = await res.text();
    expect(res.status).toBe(400);
    const j = JSON.parse(text);
    expect(j.code).toBe("INVALID_CREDENTIALS");
    expect(j.error).toMatch(/did not accept these credentials \(HTTP 401\)\. Nothing was saved\./);
    expect(j.error).toMatch(/read scope/);
    expect(h.raw.size).toBe(0);
    expectNothingSecret(text);
    // the card then still reads Not connected
    expect(await (await GET(req("GET"))).json()).toMatchObject({ state: "NOT_CONNECTED" });
  });

  it("INVALID SHAPE never reaches tastytrade, and says which field is wrong", async () => {
    const res = await POST(req("POST", { clientSecret: "has space in it", refreshToken: "short" }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.fields.clientSecret).toMatch(/space or line break/);
    expect(j.fields.refreshToken).toMatch(/too short/);
    expect(h.calls).toHaveLength(0);
  });

  it("MISSING PERMISSIONS at connect: token minted but accounts forbidden → 403 MISSING_PERMISSION, nothing stored", async () => {
    h.mode.accounts = 403;
    const res = await POST(req("POST", PAIR));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.code).toBe("MISSING_PERMISSION");
    expect(j.error).toMatch(/tick the read scope/);
    expect(h.raw.size).toBe(0);
  });

  it("MISSING PERMISSIONS for market data → Partially available; quotes and history say 'Not permitted', account reads still pass", async () => {
    h.mode.quotes = 403;
    h.mode.quoteToken = 403;
    const j = await (await POST(req("POST", PAIR))).json();
    expect(j).toMatchObject({ state: "CONNECTED", connection: "PARTIAL", quotes: false });
    const by = Object.fromEntries(j.checks.map((c: { key: string; result: string }) => [c.key, c.result]));
    expect(by).toEqual({ quotes: "NO_PERMISSION", history: "NO_PERMISSION", balances: "PASS", positions: "PASS", orders: "PASS" });
  });

  it("EXPIRED AUTH: the saved grant is later refused → Test connection reads AUTH_EXPIRED and keeps the last good check time", async () => {
    const first = await (await POST(req("POST", PAIR))).json();
    expect(first.connection).toBe("CONNECTED");
    await new Promise(r => setTimeout(r, 5));
    h.mode.mint = 401; // the member deleted the grant at tastytrade
    const res = await PUT(req("PUT"));
    const text = await res.text();
    expect(res.status).toBe(200);
    const j = JSON.parse(text);
    expect(j).toMatchObject({ state: "CONNECTED", connection: "AUTH_EXPIRED", validatedAt: first.validatedAt });
    expect(j.lastCheckAt).not.toBe(first.validatedAt);
    expectNothingSecret(text);
    // a later status read remembers it
    expect(await (await GET(req("GET"))).json()).toMatchObject({ connection: "AUTH_EXPIRED" });
    // and when tastytrade accepts it again, the next test recovers
    h.mode.mint = 200;
    expect(await (await PUT(req("PUT"))).json()).toMatchObject({ connection: "CONNECTED" });
  });

  it("tastytrade down during a test → Error, the saved connection is unchanged", async () => {
    await POST(req("POST", PAIR));
    h.mode.mint = 503;
    expect(await (await PUT(req("PUT"))).json()).toMatchObject({ connection: "ERROR" });
    expect(h.raw.size).toBe(1);
  });

  it("Test connection without a saved grant is Not connected, and is rate-limited per member", async () => {
    expect(await (await PUT(req("PUT"))).json()).toMatchObject({ state: "NOT_CONNECTED" });
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push((await PUT(req("PUT"))).status);
    expect(codes.at(-1)).toBe(429);
  });

  it("a grant saved before per-capability checks still reads honestly (no invented checks)", async () => {
    const { memberTastyStatus } = await import("@/lib/broker/tastyMemberConnect");
    const { writeMemberGrant, grantStoreAvailability } = await import("@/lib/broker/memberGrants");
    const store = grantStoreAvailability({ WM_BROKER_GRANT_KEY: "unit-test-grant-key-0123456789abcdef" }, h.kv);
    if (!store.enabled) throw new Error("store");
    await writeMemberGrant(store, "tastytrade", "legacy-user", PAIR, { accounts: 1, quotes: false, level: null, validatedAt: "2026-10-07T00:00:00.000Z" });
    const s = await memberTastyStatus(store, "legacy-user", false);
    expect(s).toMatchObject({ state: "CONNECTED", connection: "PARTIAL" });
    expect((s as { checks?: unknown }).checks).toBeUndefined();
  });
});
