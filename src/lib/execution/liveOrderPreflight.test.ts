import { describe, expect, it } from "vitest";

import {
  DEFAULT_SERVER_LIMITS,
  datedFuturesContract,
  preflightLiveOrder,
  readServerOrderLimits,
  type PreflightOrder,
  type ServerOrderLimits,
} from "./liveOrderPreflight";

const NOW = Date.UTC(2026, 9, 7, 5, 0, 0);
const LIMITS: ServerOrderLimits = {
  armed: true, killSwitch: false, maxContractsPerOrder: 2, maxSharesPerOrder: 100,
  maxNotionalUsdPerOrder: 200_000, maxLossUsdPerOrder: 300, maxQuoteAgeMs: 5_000, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: NOW - 60_000,
};
// MNQ: $2 a point. Long 1 at 25000 with a stop at 24900 risks $200.
const MNQ: PreflightOrder = {
  instrumentType: "Future", symbol: "/MNQZ6", action: "Buy to Open", qty: 1, type: "Limit", limitPx: 25_000, stopPx: null,
  protectiveStopPx: 24_900, environment: "production", accountIndex: 1, quote: { bid: 24_999.75, ask: 25_000, atMs: NOW - 1_000 },
};
const ctx = (limits: ServerOrderLimits | null = LIMITS, extra: object = {}) => ({ limits, serverEnvironment: "production" as const, nowMs: NOW, ...extra });
const codes = (r: ReturnType<typeof preflightLiveOrder>) => (r.ok ? [] : r.refusals.map(x => x.code));

describe("server-held limits parse fail-closed", () => {
  it("nothing stored, garbage, or blanks read DISARMED with no caps", () => {
    for (const raw of [null, "", "{not json", "[]", { armed: "yes", maxContractsPerOrder: -1 }]) {
      const l = readServerOrderLimits(raw);
      expect(l.armed).toBe(false);
      expect(l.maxContractsPerOrder).toBeNull();
      expect(l.updatedAtMs).toBeNull();
    }
    expect(readServerOrderLimits(null)).toEqual(DEFAULT_SERVER_LIMITS);
  });
  it("the quote-age limit is bounded — it can never be widened past 15s", () => {
    expect(readServerOrderLimits({ maxQuoteAgeMs: 3_600_000 }).maxQuoteAgeMs).toBe(15_000);
    expect(readServerOrderLimits({ maxQuoteAgeMs: 1 }).maxQuoteAgeMs).toBe(500);
  });
});

describe("continuous futures resolve to a visible dated contract", () => {
  it("names month and year; a continuous symbol is not a contract", () => {
    expect(datedFuturesContract("/NQZ6", NOW)).toMatchObject({ root: "NQ", month: "DEC", year: 2026, label: "/NQZ6 · DEC 2026" });
    expect(datedFuturesContract("/MNQH7", NOW)).toMatchObject({ root: "MNQ", month: "MAR", year: 2027 });
    expect(datedFuturesContract("/ESZ5", NOW)?.year).toBe(2035);
    expect(datedFuturesContract("/ESZ26", NOW)?.year).toBe(2026);
    for (const s of ["NQ1!", "/NQ", "MNQZ6", "/NQ1!"]) expect(datedFuturesContract(s, NOW)).toBeNull();
  });
});

describe("the gate passes a bounded, protected, fresh, explicit order", () => {
  it("MNQ long 1 with a stop 100 points away: $200 at risk under a $300 cap", () => {
    const r = preflightLiveOrder(MNQ, ctx());
    expect(r).toMatchObject({ ok: true, opening: true, referencePx: 25_000, pointValue: 2, notionalUsd: 50_000, lossAtStopUsd: 200, protection: "BROKER-NATIVE", riskBound: "STOP" });
  });
  it("a closing resting stop needs no fresh quote and no protection of its own", () => {
    const r = preflightLiveOrder({ ...MNQ, action: "Sell to Close", type: "Stop", limitPx: null, stopPx: 24_900, protectiveStopPx: null, quote: null }, ctx());
    expect(r).toMatchObject({ ok: true, opening: false, riskBound: "CLOSING" });
  });
  it("a long option's loss is bounded by its premium", () => {
    const r = preflightLiveOrder({ ...MNQ, instrumentType: "Equity Option", symbol: "TSLA  261016C00300000", qty: 1, limitPx: 2.5, protectiveStopPx: null }, ctx());
    expect(r).toMatchObject({ ok: true, riskBound: "PREMIUM", lossAtStopUsd: 250 });
  });
});

describe("refuse before send (P0.3)", () => {
  it("no limits stored → LIMITS_UNSET; default limits → DISARMED and every cap unset", () => {
    expect(codes(preflightLiveOrder(MNQ, ctx(null)))).toContain("LIMITS_UNSET");
    const c = codes(preflightLiveOrder(MNQ, ctx({ ...DEFAULT_SERVER_LIMITS, updatedAtMs: NOW })));
    expect(c).toContain("DISARMED");
    // 3 -> 5 on 2026-10-10: orders per minute and orders per day are caps too (orderRateLimit); unset refuses.
    expect(c.filter(x => x === "CAP_UNSET")).toHaveLength(5);
  });
  it("the kill switch refuses even a fully armed, in-cap order", () => {
    expect(codes(preflightLiveOrder(MNQ, ctx({ ...LIMITS, killSwitch: true })))).toEqual(["KILL_SWITCH"]);
  });
  it("quantity, notional and loss caps each bite", () => {
    expect(codes(preflightLiveOrder({ ...MNQ, qty: 3 }, ctx()))).toEqual(expect.arrayContaining(["OVER_QTY_CAP", "OVER_LOSS_CAP"]));
    expect(codes(preflightLiveOrder(MNQ, ctx({ ...LIMITS, maxNotionalUsdPerOrder: 10_000 })))).toEqual(["OVER_NOTIONAL_CAP"]);
    expect(codes(preflightLiveOrder({ ...MNQ, protectiveStopPx: 24_800 }, ctx()))).toEqual(["OVER_LOSS_CAP"]);
  });
  it("a stale or missing quote refuses a risk-increasing order", () => {
    expect(codes(preflightLiveOrder({ ...MNQ, quote: { bid: 1, ask: 1, atMs: NOW - 6_000 } }, ctx()))).toEqual(["QUOTE_STALE"]);
    expect(codes(preflightLiveOrder({ ...MNQ, quote: null }, ctx()))).toEqual(["QUOTE_STALE"]);
    // A closing MARKET order is risk-reducing but its price is unknown: it still needs a live touch.
    expect(codes(preflightLiveOrder({ ...MNQ, action: "Sell to Close", type: "Market", limitPx: null, quote: null }, ctx()))).toEqual(["QUOTE_STALE"]);
  });
  it("no stop, or a stop on the wrong side, is no verified protection", () => {
    expect(codes(preflightLiveOrder({ ...MNQ, protectiveStopPx: null }, ctx()))).toEqual(["NO_PROTECTION"]);
    expect(codes(preflightLiveOrder({ ...MNQ, protectiveStopPx: 25_100 }, ctx()))).toEqual(["STOP_WRONG_SIDE"]);
    expect(codes(preflightLiveOrder({ ...MNQ, action: "Sell to Open", protectiveStopPx: 24_900 }, ctx()))).toEqual(["STOP_WRONG_SIDE"]);
  });
  it("a continuous symbol, an unstated or mismatched environment, and no named account are refused", () => {
    expect(codes(preflightLiveOrder({ ...MNQ, symbol: "NQ1!" }, ctx()))).toContain("NOT_A_DATED_CONTRACT");
    expect(codes(preflightLiveOrder({ ...MNQ, environment: null }, ctx()))).toEqual(["ENVIRONMENT"]);
    expect(codes(preflightLiveOrder({ ...MNQ, environment: "cert" }, ctx()))).toEqual(["ENVIRONMENT"]);
    expect(codes(preflightLiveOrder({ ...MNQ, accountIndex: null }, ctx()))).toEqual(["ACCOUNT_UNSTATED"]);
  });
  it("unsupported products: naked short options, opening crypto, a future with no point value", () => {
    expect(codes(preflightLiveOrder({ ...MNQ, instrumentType: "Equity Option", symbol: "TSLA  261016C00300000", action: "Sell to Open", limitPx: 2.5, protectiveStopPx: null }, ctx()))).toContain("UNSUPPORTED_PRODUCT");
    expect(codes(preflightLiveOrder({ ...MNQ, instrumentType: "Cryptocurrency", symbol: "BTC/USD", qty: 0.001, limitPx: 60_000, protectiveStopPx: null }, ctx()))).toContain("UNSUPPORTED_PRODUCT");
    expect(codes(preflightLiveOrder({ ...MNQ, symbol: "/QQQQZ6" }, ctx()))).toContain("UNSUPPORTED_PRODUCT");
  });
  it("an earlier UNKNOWN send blocks every new one", () => {
    expect(codes(preflightLiveOrder(MNQ, ctx(LIMITS, { unresolvedSends: 1 })))).toEqual(["UNKNOWN_ORDER_STATE"]);
  });
  it("every refusal is listed, not only the first", () => {
    const r = preflightLiveOrder({ ...MNQ, qty: 5, quote: null, accountIndex: null, protectiveStopPx: null }, ctx({ ...LIMITS, armed: false }));
    expect(codes(r)).toEqual(expect.arrayContaining(["DISARMED", "ACCOUNT_UNSTATED", "OVER_QTY_CAP", "QUOTE_STALE", "NO_PROTECTION"]));
  });
});
