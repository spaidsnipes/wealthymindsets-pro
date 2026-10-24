/**
 * WORLD PASS → WM PRO TIER (Founder canon 2026-10-24). WOW OS owns the one World Pass; WM Pro reads
 * it signed and grants Premium when WM Pro is the chosen app, Basic otherwise. Never stacked, never
 * from a test-mode pass on a live server, never from a stale read.
 */
import { describe, expect, it, vi } from "vitest";

import { memberTier } from "./billingStore";
import { buyButtonState } from "./buyButtonState";
import { combinedTier, parseWorldPassRead, readWorldPassAnswer, signRealm, verifyRealm, worldPassCovers, worldPassTier, WORLD_PASS_FRESH_MS, type WorldPassRead } from "./worldPass";
import { currentWorldPass, fetchWorldPass, worldPassKey, WOW_WORLD_PASS_URL } from "./worldPassRead";

const USER = "0d77521c-d5fe-41c3-ab24-a9c86221933d";
const KEY = "r".repeat(40);
const NOW = Date.parse("2026-10-24T12:00:00Z");
const HOUR = 3_600_000;
const read = (over: Partial<WorldPassRead> = {}): WorldPassRead => ({ v: 1, userId: USER, status: "ACTIVE", chosenApp: "wm_pro", livemode: true, currentPeriodEnd: "2026-11-20T00:00:00.000Z", fetchedAt: new Date(NOW - HOUR).toISOString(), ...over });
const LIVE_ENV = { STRIPE_SECRET_KEY: "sk_live_" + "y".repeat(24), WM_BILLING_LIVE: "ARMED", WM_STRIPE_WEBHOOK_SECRET: "whsec_" + "z".repeat(24), WOW_REALM_KEY: KEY };
const newKv = () => { const store = new Map<string, string>(); return { store, get: async (k: string) => store.get(k) ?? null, put: vi.fn(async (k: string, v: string) => { store.set(k, v); }) }; };

/** WOW's side of the wire: answer signed with the realm key, as worker/world-pass.js does. */
function wow(answer: (body: Record<string, unknown>) => Record<string, unknown>, opts: { key?: string; status?: number } = {}) {
  return vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(WOW_WORLD_PASS_URL);
    const h = init.headers as Record<string, string>;
    expect(h["X-Realm"]).toBe("wm_pro");
    expect(await verifyRealm(KEY, String(init.body), h["X-Realm-Signature"], Math.floor(NOW / 1000))).toBe(true);
    const text = JSON.stringify(answer(JSON.parse(String(init.body))));
    return new Response(text, { status: opts.status ?? 200, headers: { "X-Realm-Signature": await signRealm(opts.key ?? KEY, text, Math.floor(NOW / 1000)) } });
  });
}
const answerFor = (over: Record<string, unknown> = {}) => (b: Record<string, unknown>) => ({ passport_number: "WOW-AB12-CD34", passport_id_ref: b.passport_id_ref, status: "ACTIVE", chosen_app: "wm_pro", current_period_end: "2026-11-20T00:00:00.000Z", cancel_at_period_end: false, livemode: true, fetched_at: new Date(NOW).toISOString(), ...over });

describe("what an ACTIVE World Pass grants here", () => {
  it("WM Pro chosen → Premium (PASSPORT); another app or none chosen → Basic (APP)", () => {
    expect(worldPassTier(read(), true, NOW)).toBe("PASSPORT");
    expect(worldPassTier(read({ chosenApp: "wavemotion" }), true, NOW)).toBe("APP");
    expect(worldPassTier(read({ chosenApp: null }), true, NOW)).toBe("APP");
  });
  it("CANCELED / PAST_DUE / NONE → nothing", () => {
    for (const status of ["CANCELED", "PAST_DUE", "NONE"] as const) expect(worldPassTier(read({ status }), true, NOW), status).toBeNull();
  });
  it("a stale read (over 24h) or one from the future → nothing", () => {
    expect(worldPassTier(read({ fetchedAt: new Date(NOW - WORLD_PASS_FRESH_MS + 1000).toISOString() }), true, NOW)).toBe("PASSPORT");
    expect(worldPassTier(read({ fetchedAt: new Date(NOW - WORLD_PASS_FRESH_MS - 1).toISOString() }), true, NOW)).toBeNull();
    expect(worldPassTier(read({ fetchedAt: new Date(NOW + HOUR).toISOString() }), true, NOW)).toBeNull();
  });
  it("a test-mode pass never grants on a live server (and a live pass never on a test server)", () => {
    expect(worldPassTier(read({ livemode: false }), true, NOW)).toBeNull();
    expect(worldPassTier(read({ livemode: true }), false, NOW)).toBeNull();
    expect(worldPassTier(read(), null, NOW)).toBeNull();
  });
  it("a changed chosen app changes the tier", () => {
    expect(worldPassTier(read({ chosenApp: "wm_pro" }), true, NOW)).toBe("PASSPORT");
    expect(worldPassTier(read({ chosenApp: "wavemotion" }), true, NOW)).toBe("APP");
  });
});

describe("never stacked with a WM Pro subscription", () => {
  it("the member has the HIGHER of their own tier and the pass, never a sum", () => {
    expect(combinedTier("FREE", "PASSPORT")).toBe("PASSPORT");
    expect(combinedTier("APP", "PASSPORT")).toBe("PASSPORT");
    expect(combinedTier("OS", "PASSPORT")).toBe("OS");
    expect(combinedTier("PASSPORT", "APP")).toBe("PASSPORT");
    expect(combinedTier("APP", null)).toBe("APP");
  });
  it("a covered tier is not sold again: the button says it is included; a paid copy says cancel it; OS stays buyable", () => {
    const base = { onSale: { APP: true, PASSPORT: true, OS: true }, mode: "LIVE" as const, signedIn: true };
    expect(worldPassCovers("PASSPORT", "APP")).toBe(true);
    expect(worldPassCovers("PASSPORT", "OS")).toBe(false);
    expect(buyButtonState({ ...base, tier: "PASSPORT", memberTier: "FREE", worldPassTier: "PASSPORT" })).toEqual({ kind: "COVERED", label: "Included in your World Pass", note: null });
    expect(buyButtonState({ ...base, tier: "APP", memberTier: "FREE", worldPassTier: "PASSPORT" }).kind).toBe("COVERED");
    expect(buyButtonState({ ...base, tier: "OS", memberTier: "FREE", worldPassTier: "PASSPORT" }).kind).toBe("BUY");
    const paid = buyButtonState({ ...base, tier: "PASSPORT", memberTier: "PASSPORT", worldPassTier: "PASSPORT" });
    expect(paid.kind).toBe("CURRENT"); expect(paid.note).toMatch(/don't pay twice/);
    expect(buyButtonState({ ...base, tier: "PASSPORT", memberTier: "FREE" }).kind).toBe("BUY"); // no pass: unchanged
  });
});

describe("the signed read from WOW OS", () => {
  it("fetches with X-Realm wm_pro, verifies WOW's signature, and caches it", async () => {
    const kv = newKv();
    const fetcher = wow(answerFor());
    const r = await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher, nowMs: NOW });
    expect(r).toMatchObject({ userId: USER, status: "ACTIVE", chosenApp: "wm_pro", livemode: true });
    expect(parseWorldPassRead(kv.store.get(worldPassKey(USER)), USER)).toMatchObject({ status: "ACTIVE" });
    // Within the hour the cache answers; WOW is not asked again.
    await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher, nowMs: NOW + 10 * 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses an answer WOW did not sign, one for another member, or a stale one", async () => {
    await expect(fetchWorldPass(USER, LIVE_ENV, wow(answerFor(), { key: "x".repeat(40) }), NOW)).rejects.toThrow(/not signed/);
    await expect(fetchWorldPass(USER, LIVE_ENV, wow(answerFor({ passport_id_ref: "11111111-2222-3333-4444-555555555555" })), NOW)).rejects.toThrow(/different member/);
    await expect(fetchWorldPass(USER, LIVE_ENV, wow(answerFor({ fetched_at: new Date(NOW - 60_000).toISOString() })), NOW)).rejects.toThrow(/stale/);
    await expect(fetchWorldPass("not-a-uuid", LIVE_ENV, wow(answerFor()), NOW)).rejects.toThrow(/Passport identity/);
    await expect(fetchWorldPass(USER, { ...LIVE_ENV, WOW_REALM_KEY: "" }, wow(answerFor()), NOW)).rejects.toThrow(/not configured/);
    expect(() => readWorldPassAnswer({ ...answerFor()({ passport_id_ref: USER }), status: "MAYBE" }, USER, NOW)).toThrow(/incomplete/);
  });
  it("a failed re-read keeps the old read, which stops granting once it is 24h old", async () => {
    const kv = newKv();
    await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher: wow(answerFor()), nowMs: NOW });
    const down = vi.fn(async () => new Response("no", { status: 503 }));
    const later = await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher: down, nowMs: NOW + 2 * HOUR });
    expect(down).toHaveBeenCalled();
    expect(worldPassTier(later, true, NOW + 2 * HOUR)).toBe("PASSPORT");
    expect(worldPassTier(later, true, NOW + 25 * HOUR)).toBeNull();
  });
  it("CANCELED on WOW ends the grant at the next read", async () => {
    const kv = newKv();
    await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher: wow(answerFor()), nowMs: NOW });
    const r = await currentWorldPass(USER, kv, { env: LIVE_ENV, fetcher: wow(answerFor({ status: "CANCELED" })), nowMs: NOW, force: true });
    expect(worldPassTier(r, true, NOW)).toBeNull();
  });
});

describe("memberTier — the one server-side reading", () => {
  it("combines the member's own record with the World Pass, in the server's mode", async () => {
    const kv = newKv();
    const pass = (r: WorldPassRead | null) => async () => r;
    // Fresh, live, WM Pro chosen → PASSPORT with no WM Pro subscription at all.
    expect(await memberTier(USER, LIVE_ENV, async () => kv, pass(read({ fetchedAt: new Date().toISOString() })))).toBe("PASSPORT");
    expect(await memberTier(USER, LIVE_ENV, async () => kv, pass(read({ chosenApp: "wavemotion", fetchedAt: new Date().toISOString() })))).toBe("APP");
    expect(await memberTier(USER, LIVE_ENV, async () => kv, pass(read({ livemode: false, fetchedAt: new Date().toISOString() })))).toBe("FREE");
    expect(await memberTier(USER, LIVE_ENV, async () => kv, pass(null))).toBe("FREE");
    // A paid OS record stays OS: the pass never lowers or adds.
    kv.store.set(`billing:v1:user:${USER}`, JSON.stringify({ v: 1, userId: USER, customerId: "cus_1", subscriptionId: "sub_1", tier: "OS", status: "active", currentPeriodEnd: null, livemode: true, lastEventId: "evt_1", lastEventAt: 1, seenEventIds: ["evt_1"], customerMatch: "STORED", legalShown: null }));
    expect(await memberTier(USER, LIVE_ENV, async () => kv, pass(read({ fetchedAt: new Date().toISOString() })))).toBe("OS");
    // Billing not configured → FREE whatever the pass says.
    expect(await memberTier(USER, {}, async () => kv, pass(read({ fetchedAt: new Date().toISOString() })))).toBe("FREE");
  });
});
