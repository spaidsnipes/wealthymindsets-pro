/**
 * The order-rate limiter and daily cap (2026-10-10): per owner, per broker,
 * per minute and per ET day, from the server-held limits; a send cannot reach
 * the broker's place call without it. No order is sent here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_SERVER_LIMITS, type ServerOrderLimits } from "./liveOrderPreflight";
import { checkOrderRate, etDay, orderRateDayKey, readOrderRate, reserveOrderSend, type RateKv } from "./orderRateLimit";

const L: ServerOrderLimits = { ...DEFAULT_SERVER_LIMITS, armed: true, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 5000, maxLossUsdPerOrder: 500, maxOrdersPerMinute: 2, maxOrdersPerDay: 3, updatedAtMs: 1 };
const kvOf = () => { const m = new Map<string, string>(); return { m, kv: { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => { m.set(k, v); } } as RateKv }; };
const T = Date.UTC(2026, 9, 10, 14, 30, 5);                  // Oct 10, 10:30:05 AM EDT
const at = (o: Partial<{ nowMs: number; limits: ServerOrderLimits | null; broker: "tastytrade" | "webull"; ownerId: string }> = {}) => ({ broker: "tastytrade" as const, ownerId: "owner-1", limits: L, nowMs: T, ...o });
const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

describe("the Eastern-time day", () => {
  it("dates by ET and ends at the next ET midnight, on ordinary and DST-change days", () => {
    expect(etDay(T)).toEqual({ date: "2026-10-10", endsAtMs: Date.UTC(2026, 9, 11, 4, 0, 0) });
    expect(etDay(Date.UTC(2026, 9, 11, 3, 59, 0)).date).toBe("2026-10-10");             // 11:59 PM EDT
    expect(etDay(Date.UTC(2026, 10, 1, 12, 0, 0))).toEqual({ date: "2026-11-01", endsAtMs: Date.UTC(2026, 10, 2, 5, 0, 0) });   // fall back: a 25-hour day
    expect(etDay(Date.UTC(2027, 2, 14, 12, 0, 0))).toEqual({ date: "2027-03-14", endsAtMs: Date.UTC(2027, 2, 15, 4, 0, 0) });  // spring forward: 23 hours
  });
});

describe("the limiter", () => {
  it("unset limits refuse (the same rule as every other cap); an unreadable store refuses", async () => {
    const { kv } = kvOf();
    for (const limits of [null, { ...L, maxOrdersPerMinute: null }, { ...L, maxOrdersPerDay: null }]) {
      const r = await checkOrderRate(kv, at({ limits }));
      expect(r).toMatchObject({ ok: false, code: "ORDER_RATE_UNSET" });
    }
    expect(await checkOrderRate(null, at())).toMatchObject({ ok: false, code: "ORDER_RATE_UNREADABLE" });
    const broken: RateKv = { get: async () => { throw new Error("kv down"); }, put: async () => {} };
    expect(await checkOrderRate(broken, at())).toMatchObject({ ok: false, code: "ORDER_RATE_UNREADABLE" });
  });

  it("per minute: the third send in a minute is refused in trader words with when to try again; the next minute is open", async () => {
    const { kv } = kvOf();
    expect((await reserveOrderSend(kv, at())).ok).toBe(true);
    expect((await reserveOrderSend(kv, at({ nowMs: T + 10_000 }))).ok).toBe(true);
    const third = await reserveOrderSend(kv, at({ nowMs: T + 20_000 }));
    expect(third).toMatchObject({ ok: false, code: "OVER_ORDERS_PER_MINUTE" });
    if (!third.ok) expect(third.reason).toBe("You have sent 2 live tastytrade orders this minute — your limit is 2 a minute. Try again at 10:31 AM EDT.");
    expect((await reserveOrderSend(kv, at({ nowMs: T + 60_000 }))).ok).toBe(true);
  });

  it("per day: the cap holds across minutes, says when it resets, and resets at midnight ET", async () => {
    const { kv } = kvOf();
    for (let i = 0; i < 3; i++) expect((await reserveOrderSend(kv, at({ nowMs: T + i * 120_000 }))).ok).toBe(true);
    const over = await checkOrderRate(kv, at({ nowMs: T + 600_000 }));
    expect(over).toMatchObject({ ok: false, code: "OVER_ORDERS_PER_DAY" });
    if (!over.ok) expect(over.reason).toBe("You have sent 3 live tastytrade orders today — your daily limit is 3. It resets at midnight Eastern (12:00 AM EDT). Cancelling stays open.");
    expect((await checkOrderRate(kv, at({ nowMs: Date.UTC(2026, 9, 11, 4, 0, 1) }))).ok).toBe(true);
  });

  it("per owner and per broker: one never spends another's budget", async () => {
    const { kv } = kvOf();
    for (let i = 0; i < 3; i++) await reserveOrderSend(kv, at({ nowMs: T + i * 120_000 }));
    expect((await checkOrderRate(kv, at({ nowMs: T + 600_000, broker: "webull" }))).ok).toBe(true);
    expect((await checkOrderRate(kv, at({ nowMs: T + 600_000, ownerId: "owner-2" }))).ok).toBe(true);
  });

  it("checking spends nothing; only a reservation counts; a reservation that cannot be written refuses (not sent)", async () => {
    const { kv, m } = kvOf();
    for (let i = 0; i < 10; i++) await checkOrderRate(kv, at());
    expect(m.size).toBe(0);
    await reserveOrderSend(kv, at());
    expect(m.get(orderRateDayKey("tastytrade", "owner-1", "2026-10-10"))).toBe("1");
    const readOnlyKv: RateKv = { get: kv.get, put: async () => { throw new Error("no write"); } };
    const r = await reserveOrderSend(readOnlyKv, at({ nowMs: T + 120_000 }));
    expect(r).toMatchObject({ ok: false, code: "ORDER_RATE_UNREADABLE" });
    if (!r.ok) expect(r.reason).toMatch(/this order was NOT sent/);
  });

  it("the standing reads what is left today", async () => {
    const { kv } = kvOf();
    await reserveOrderSend(kv, at());
    expect(await readOrderRate(kv, at())).toMatchObject({ perMinute: 2, perDay: 3, usedToday: 1, usedThisMinute: 1, remainingToday: 2, etDate: "2026-10-10" });
  });
});

describe("a send cannot reach the broker's place call without the limiter", () => {
  const doors: [string, string, string][] = [
    ["app/api/broker/tastytrade/order-submit/route.ts", "getTastytradeAccounts()", "await submitTastytradeOrder("],
    ["app/api/broker/webull/order-submit/route.ts", "durableWebullOrderLedger(env)", "await submitWebullOrderOnce("],
  ];
  it.each(doors)("%s: check after the gate and before the first broker call; reserve immediately before the place call", (f, firstBroker, place) => {
    const src = read(f);
    expect(src.length).toBeGreaterThan(3000);
    const gate = src.indexOf("if (!preflight.ok) {");
    const check = src.indexOf("const rate = await checkOrderRate(");
    const firstCall = src.indexOf(firstBroker, gate);
    const reserve = src.indexOf("const reserved = await reserveOrderSend(");
    const placeAt = src.indexOf(place);
    expect(gate).toBeGreaterThan(0);
    expect(check).toBeGreaterThan(gate);
    expect(check).toBeLessThan(firstCall);
    expect(src.slice(check, check + 400)).toContain("if (!rate.ok) return");
    expect(reserve).toBeGreaterThan(check);
    expect(reserve).toBeLessThan(placeAt);
    expect(src.slice(reserve, placeAt)).toContain("if (!reserved.ok) return");
    // Nothing between the reservation and the place call can return without... the place call being the next broker step.
    expect(src.slice(reserve, placeAt)).not.toMatch(/fetch\(|getTastytrade|previewWebull|listWebullAccounts/);
    expect(src.match(new RegExp(place.replace(/[(]/g, "\\("), "g"))).toHaveLength(1);
  });

  it("the arming and confirm path is untouched: the limiter does not read or write armed or confirmLive", () => {
    const owner = read("lib/execution/orderRateLimit.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(owner).not.toMatch(/armed|killSwitch|confirmLive/);
  });
});
