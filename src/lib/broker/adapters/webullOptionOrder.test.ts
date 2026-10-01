/**
 * Garden 18 §LXXVIII–§XCIII — a single-leg US option order, in Webull's own
 * field names (SDK 3.0.2 samples/trade/trade_client_v3.py), built from the
 * contract the trader SELECTED (its OSI identity), never re-typed.
 */
import { describe, expect, it, vi } from "vitest";

import { mapToWebullOptionOrder, parseOsi, previewWebullOrder, submitWebullOrderOnce, inMemoryOrderLedger, type WebullOrderIntent } from "./webullOrders";

const leg = { ...parseOsi("TSLA261002C00305000")!, positionIntent: "BUY_TO_OPEN" as const };
const intent: WebullOrderIntent = {
  clientOrderId: "a1b2c3d4e5f60718293a4b5c6d7e8f90", decisionId: "wmd_D-1842", accountId: "acct-1",
  symbol: "TSLA", side: "buy", type: "limit", qty: 1, limitPx: 49.5, tif: "day", assetClass: "option", option: leg,
};

describe("the OSI identity is the contract", () => {
  it("TSLA261002C00305000 is the 305 call expiring 2026-10-02", () => {
    expect(parseOsi("TSLA261002C00305000")).toEqual({ underlying: "TSLA", expiry: "2026-10-02", strike: 305, right: "CALL" });
    expect(parseOsi("SPY261016P00702500")).toEqual({ underlying: "SPY", expiry: "2026-10-16", strike: 702.5, right: "PUT" });
    expect(parseOsi("TSLA")).toBeNull();
    expect(parseOsi("TSLA261302C00305000")).toBeNull(); // month 13
  });
});

describe("mapToWebullOptionOrder", () => {
  it("builds Webull's SINGLE leg exactly", () => {
    const m = mapToWebullOptionOrder(intent);
    expect(m).toEqual({ ok: true, order: {
      client_order_id: intent.clientOrderId, combo_type: "NORMAL", order_type: "LIMIT", limit_price: "49.5", quantity: "1",
      option_strategy: "SINGLE", side: "BUY", time_in_force: "DAY", entrust_type: "QTY", position_intent: "BUY_TO_OPEN",
      legs: [{ side: "BUY", quantity: "1", symbol: "TSLA", strike_price: "305", option_expire_date: "2026-10-02", instrument_type: "OPTION", option_type: "CALL", market: "US" }],
    } });
  });

  it("refuses what it cannot state truthfully", () => {
    expect(mapToWebullOptionOrder({ ...intent, side: "sell" })).toMatchObject({ ok: false, reason: expect.stringMatching(/contradicts BUY TO OPEN/) });
    expect(mapToWebullOptionOrder({ ...intent, qty: 1.5 })).toMatchObject({ ok: false });
    expect(mapToWebullOptionOrder({ ...intent, option: undefined })).toMatchObject({ ok: false });
    expect(mapToWebullOptionOrder({ ...intent, decisionId: "" })).toMatchObject({ ok: false });
    expect(mapToWebullOptionOrder({ ...intent, limitPx: undefined })).toMatchObject({ ok: false });
  });
});

describe("preview sends the option leg; submit stays equity-only", () => {
  it("preview posts the leg to Webull's v3 order preview", async () => {
    const bodies: unknown[] = [];
    const f = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ ok: 1 }), { status: 200 }); });
    const r = await previewWebullOrder(f as unknown as typeof fetch, { appKey: "k", appSecret: "s", accessToken: null, now: () => new Date(0), nonce: () => "n" } as never, intent);
    expect(r.state).toBe("PREVIEWED");
    expect(new URL(String(f.mock.calls[0][0])).pathname).toBe("/trading/orders/preview");
    expect((bodies[0] as { new_orders: { legs: { option_type: string }[] }[] }).new_orders[0].legs[0].option_type).toBe("CALL");
  });

  it("submit refuses an option before anything is sent (live option placing is not authorized)", async () => {
    const f = vi.fn();
    const r = await submitWebullOrderOnce(f as unknown as typeof fetch, { appKey: "k", appSecret: "s", accessToken: null, liveOrdersEnabled: true, now: () => new Date(0), nonce: () => "n" } as never, inMemoryOrderLedger(), intent);
    expect(r.sent).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
