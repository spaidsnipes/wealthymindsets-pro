import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { bracketSupport } from "@/lib/execution/instrumentCapability";
import { DEFAULT_SERVER_LIMITS, preflightLiveOrder, type ServerOrderLimits } from "@/lib/execution/liveOrderPreflight";

import { BRACKET_RATE_COST, bracketChildKeys, bracketPreflightOrder, toTastytradeBracket, type TtBracketIntent } from "./tastytradeBracket";
import { toTastytradeOrder } from "./tastytradeOrder";

const LONG: TtBracketIntent = {
  entry: { instrumentType: "Future", symbol: "/MNQZ6", action: "Buy to Open", qty: 2, type: "Limit", limitPx: 21000, decisionId: "wmd_D-1", clientOrderId: "abcdef0123456789" },
  stopPx: 20980,
  targetPx: 21040,
};

describe("OTOCO payload — entry triggers target + stop, OCO between the exits", () => {
  it("builds tastytrade's complex-order shape from three single-order maps", () => {
    const r = toTastytradeBracket(LONG);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.type).toBe("OTOCO");
    expect(r.order["trigger-order"]).toEqual((toTastytradeOrder({ ...LONG.entry, clientOrderId: "abcdef0123456789-e" }) as { order: unknown }).order);
    const [target, stop] = r.order.orders;
    expect(target).toMatchObject({ "order-type": "Limit", price: "21040", "price-effect": "Credit", "time-in-force": "GTC", "external-identifier": "abcdef0123456789-t" });
    expect(target.legs[0]).toEqual({ "instrument-type": "Future", symbol: "/MNQZ6", quantity: 2, action: "Sell to Close" });
    expect(stop).toMatchObject({ "order-type": "Stop", "stop-trigger": "20980", "time-in-force": "GTC", "external-identifier": "abcdef0123456789-s" });
    expect(stop.legs[0].action).toBe("Sell to Close");
  });
  it("a short bracket closes with Buy to Close, target below, stop above", () => {
    const r = toTastytradeBracket({ entry: { ...LONG.entry, action: "Sell to Open" }, stopPx: 21020, targetPx: 20960 });
    expect(r.ok && r.order.orders.map(o => o.legs[0].action)).toEqual(["Buy to Close", "Buy to Close"]);
  });
  it("refuses wrong-side exits, closing entries, market entries, crypto, continuous futures and a missing key", () => {
    expect(toTastytradeBracket({ ...LONG, stopPx: 21010 }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, targetPx: 20990 }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, action: "Sell to Close" } }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, type: "Market", limitPx: undefined } }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, instrumentType: "Cryptocurrency", symbol: "BTC/USD", qty: 0.01 } }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, symbol: "MNQ1!" } }).ok).toBe(false);
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, decisionId: "" } }).ok).toBe(false);
    expect(bracketChildKeys("short")).toBeNull();
    expect(toTastytradeBracket({ ...LONG, entry: { ...LONG.entry, clientOrderId: "x".repeat(64) } }).ok).toBe(false);
  });
  it("the broker sees three orders, so the rate limiter is charged three", () => {
    expect(BRACKET_RATE_COST).toBe(3);
  });
});

describe("the SAME server gate judges a bracket — its entry, with the attached stop as protection", () => {
  const rest = { environment: "production" as const, accountIndex: 0, quote: { bid: 20999.75, ask: 21000, atMs: 1_000 } };
  it("unset limits refuse it exactly as they refuse a single order (fail-closed)", () => {
    const r = preflightLiveOrder(bracketPreflightOrder(LONG, rest), { limits: DEFAULT_SERVER_LIMITS, serverEnvironment: "production", nowMs: 1_500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.refusals.map(x => x.code)).toContain("LIMITS_UNSET");
  });
  it("set + armed limits: the loss at the attached stop is the bound the ceiling checks", () => {
    const L: ServerOrderLimits = { ...DEFAULT_SERVER_LIMITS, armed: true, killSwitch: false, maxContractsPerOrder: 5, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 1_000_000, maxLossUsdPerOrder: 50, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: 1 };
    const p = bracketPreflightOrder(LONG, rest);
    expect(p.protectiveStopPx).toBe(20980);
    const r = preflightLiveOrder(p, { limits: L, serverEnvironment: "production", nowMs: 1_500 });
    // 20 pts × $2 × 2 contracts = $80 at the stop > $50 ceiling → refused by the existing gate.
    expect(r.ok).toBe(false);
    const kill = preflightLiveOrder(p, { limits: { ...L, killSwitch: true }, serverEnvironment: "production", nowMs: 1_500 });
    expect(!kill.ok && kill.refusals.some(x => x.code === "KILL_SWITCH")).toBe(true);
  });
});

describe("NEVER SENT — no WM code posts a bracket; the ticket says it is not available", () => {
  it("only this module and its test name the OTOCO builder; no route or component imports it", () => {
    const SRC = path.resolve(__dirname, "../..");
    const walk = (d: string, out: string[] = []): string[] => {
      for (const n of readdirSync(d)) { const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (/\.tsx?$/.test(n)) out.push(p); }
      return out;
    };
    // Source files only (tests and the screen-reach ledger may NAME it; nothing that ships may import it).
    const users = walk(SRC).filter(f => !/\.test\.tsx?$/.test(f) && !/tastytradeBracket\.ts$/.test(f) && /from\s+["'][^"']*tastytradeBracket["']/.test(readFileSync(f, "utf8")));
    expect(users).toEqual([]);
    const me = readFileSync(path.join(SRC, "lib/broker/tastytradeBracket.ts"), "utf8");
    expect(me.length).toBeGreaterThan(2000);
    expect(me).not.toMatch(/fetch\(|complex-orders|ttPost|\/api\//);
  });
  it("the ledger keeps BRACKET unbuilt on both rails, so the ticket shows the not-available words", () => {
    expect(bracketSupport("tastytrade").supported).toBe(false);
    expect(bracketSupport("tastytrade").words).toMatch(/not available on tastytrade/);
    expect(bracketSupport("Webull").supported).toBe(false);
  });
});

import { checkOrderRate, reserveOrderSend, type RateKv } from "@/lib/execution/orderRateLimit";

describe("the SAME order-rate limiter charges a bracket BRACKET_RATE_COST (still never sent)", () => {
  const L: ServerOrderLimits = { ...DEFAULT_SERVER_LIMITS, armed: true, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 5000, maxLossUsdPerOrder: 500, maxOrdersPerMinute: 4, maxOrdersPerDay: 5, updatedAtMs: 1 };
  const kvOf = () => { const m = new Map<string, string>(); return { m, kv: { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => { m.set(k, v); } } as RateKv }; };
  const at = (nowMs: number, limits: ServerOrderLimits = L) => ({ broker: "tastytrade" as const, ownerId: "owner-1", limits, nowMs, cost: BRACKET_RATE_COST });
  const T = Date.UTC(2026, 9, 10, 14, 30, 5);
  it("one bracket uses 3 of the minute; a second would exceed 4 a minute and is refused, saying it counts as 3", async () => {
    const { kv } = kvOf();
    const roomy = { ...L, maxOrdersPerDay: 50 };
    const first = await reserveOrderSend(kv, at(T, roomy));
    expect(first.ok && first.standing.usedThisMinute).toBe(3);
    const second = await checkOrderRate(kv, at(T + 5_000, roomy));
    expect(second.ok).toBe(false);
    if (!second.ok) { expect(second.code).toBe("OVER_ORDERS_PER_MINUTE"); expect(second.reason).toMatch(/counts as 3 orders/); }
  });
  it("the daily cap counts 3 per bracket too (5 a day: one bracket, then no second)", async () => {
    const { kv } = kvOf();
    expect((await reserveOrderSend(kv, at(T))).ok).toBe(true);
    const next = await checkOrderRate(kv, at(T + 120_000));
    expect(!next.ok && next.code).toBe("OVER_ORDERS_PER_DAY");
  });
  it("a single order still costs 1 (cost omitted)", async () => {
    const { kv } = kvOf();
    const r = await reserveOrderSend(kv, { broker: "tastytrade", ownerId: "owner-1", limits: L, nowMs: T });
    expect(r.ok && r.standing.usedThisMinute).toBe(1);
  });
});
