/**
 * WEBULL ORDERS — the capital-protection laws, proven offline.
 *
 * Nothing here talks to Webull. Every fetch is a fake that records what WOULD
 * have left the process, because the claims under test are about what leaves:
 * never while the gate is closed, never twice for one client order id, never
 * again after an unknown submission until the exact lookup proves absence.
 */

import { describe, expect, it, vi } from "vitest";

import { WEBULL_SDK_CONTRACT } from "@/lib/marketData/webullSdkContract";
import {
  getWebullOrderByClientId,
  inMemoryOrderLedger,
  mapToWebullStockOrder,
  mintClientOrderId,
  previewWebullOrder,
  submitWebullOrderOnce,
  type WebullOrderIntent,
} from "./webullOrders";

const NOW = new Date(Date.UTC(2026, 8, 25, 15, 0, 0));
const config = {
  appKey: "key",
  appSecret: "secret",
  accessToken: "session",
  now: () => NOW,
  nonce: () => "nonce",
};
const live = { ...config, liveOrdersEnabled: true };

const intent = (over: Partial<WebullOrderIntent> = {}): WebullOrderIntent => ({
  clientOrderId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  decisionId: "D-1842",
  accountId: "ACC1",
  symbol: "TSLA",
  side: "buy",
  type: "limit",
  qty: 1,
  limitPx: 250.5,
  tif: "day",
  assetClass: "equity",
  ...over,
});

type Call = { url: string; init: RequestInit };
function scripted(...answers: Array<(() => Response) | "THROW">) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = answers.shift();
    if (!next || next === "THROW") throw new TypeError("network lost");
    return next();
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}
const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const pathOf = (c: Call) => new URL(c.url).pathname;

describe("mapping a canonical intent to Webull's own order shape", () => {
  it("writes the SDK sample's field names and string prices", () => {
    const r = mapToWebullStockOrder(intent());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order).toEqual({
      client_order_id: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      combo_type: "NORMAL",
      symbol: "TSLA",
      instrument_type: "EQUITY",
      market: "US",
      order_type: "LIMIT",
      limit_price: "250.5",
      quantity: "1",
      support_trading_session: "CORE",
      side: "BUY",
      time_in_force: "DAY",
      entrust_type: "QTY",
    });
  });

  it("refuses rather than approximates", () => {
    const refusals: Partial<WebullOrderIntent>[] = [
      { decisionId: "" },
      { clientOrderId: "x" },
      { assetClass: "future" },
      { assetClass: undefined },
      { qty: 0 },
      { qty: 1.5 },
      { type: "limit", limitPx: undefined },
      { type: "market", limitPx: 10 },
      { type: "stop", limitPx: undefined, stopPx: undefined },
      { type: "stop-limit", limitPx: 10, stopPx: undefined },
      { tif: "fok" },
      { symbol: "tsla; drop" },
    ];
    for (const over of refusals) {
      expect(mapToWebullStockOrder(intent(over)).ok, JSON.stringify(over)).toBe(false);
    }
  });

  it("maps every supported type to the SDK's order_type enum", () => {
    const t = (over: Partial<WebullOrderIntent>) => {
      const r = mapToWebullStockOrder(intent(over));
      return r.ok ? r.order.order_type : null;
    };
    expect(t({ type: "market", limitPx: undefined })).toBe("MARKET");
    expect(t({ type: "limit" })).toBe("LIMIT");
    expect(t({ type: "stop", limitPx: undefined, stopPx: 240 })).toBe("STOP_LOSS");
    expect(t({ type: "stop-limit", stopPx: 240 })).toBe("STOP_LOSS_LIMIT");
  });

  it("mints client ids in the SDK sample's uuid4-hex format", () => {
    const id = mintClientOrderId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(mintClientOrderId()).not.toBe(id);
  });
});

describe("preview is non-money and goes to the preview path only", () => {
  it("POSTs {account_id, new_orders} to the cited preview path", async () => {
    const { fetchImpl, calls } = scripted(json({ estimated_cost: "250.50" }));
    const r = await previewWebullOrder(fetchImpl, config, intent());
    expect(r.state).toBe("PREVIEWED");
    expect(calls.map(pathOf)).toEqual([WEBULL_SDK_CONTRACT.ORDER_PREVIEW.path]);
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.account_id).toBe("ACC1");
    expect(body.new_orders[0].client_order_id).toBe(intent().clientOrderId);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-version"]).toBe("v3");
    expect(headers["x-access-token"]).toBe("session");
  });

  it("never reaches the network for an intent it refuses locally", async () => {
    const { fetchImpl, calls } = scripted();
    const r = await previewWebullOrder(fetchImpl, config, intent({ qty: 0 }));
    expect(r.state).toBe("REFUSED_LOCAL");
    expect(calls).toHaveLength(0);
  });
});

describe("THE GATE — no live order without the Founder's instruction", () => {
  it("sends nothing while liveOrdersEnabled is false", async () => {
    const { fetchImpl, calls } = scripted(json({}));
    const r = await submitWebullOrderOnce(fetchImpl, { ...config, liveOrdersEnabled: false }, inMemoryOrderLedger(), intent());
    expect(r.outcome).toBe("REFUSED_GATE");
    expect(r.sent).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("EXACTLY ONCE — an unknown submission is never blindly retried", () => {
  it("records SUBMITTING before the request leaves", async () => {
    const ledger = inMemoryOrderLedger();
    let seenBeforeSend: string | undefined;
    const fetchImpl = vi.fn(async () => {
      seenBeforeSend = (await ledger.get(intent().clientOrderId))?.state;
      return new Response(JSON.stringify({ client_order_id: intent().clientOrderId, order_id: "W1" }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(seenBeforeSend).toBe("SUBMITTING");
    expect(r.outcome).toBe("ACKNOWLEDGED");
    expect(r.brokerOrderId).toBe("W1");
  });

  it("a lost answer becomes SUBMISSION_UNKNOWN, not a failure", async () => {
    const ledger = inMemoryOrderLedger();
    const { fetchImpl } = scripted("THROW");
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(r.outcome).toBe("SUBMISSION_UNKNOWN");
    expect(r.sent).toBe(true);
    expect((await ledger.get(intent().clientOrderId))?.state).toBe("SUBMISSION_UNKNOWN");
  });

  it("a 5xx or 429 on place is UNKNOWN too — Webull may have taken it", async () => {
    for (const status of [500, 502, 503, 429, 408]) {
      const { fetchImpl } = scripted(json({ code: "BUSY" }, status));
      const r = await submitWebullOrderOnce(fetchImpl, live, inMemoryOrderLedger(), intent());
      expect(r.outcome, String(status)).toBe("SUBMISSION_UNKNOWN");
    }
  });

  it("after an unknown submission it READS the exact order first and does not place again when found", async () => {
    const ledger = inMemoryOrderLedger();
    await submitWebullOrderOnce(scripted("THROW").fetchImpl, live, ledger, intent());
    const { fetchImpl, calls } = scripted(
      json({ client_order_id: intent().clientOrderId, order_id: "W9", status: "FILLED" }),
    );
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(calls.map(pathOf)).toEqual([WEBULL_SDK_CONTRACT.ORDER_DETAIL.path]);
    expect(new URL(calls[0].url).searchParams.get("client_order_id")).toBe(intent().clientOrderId);
    expect(r.outcome).toBe("ALREADY_PLACED");
    expect(r.sent).toBe(false);
    expect(r.brokerOrderId).toBe("W9");
  });

  it("keeps waiting — sends nothing — while the exact lookup cannot answer", async () => {
    const ledger = inMemoryOrderLedger();
    await submitWebullOrderOnce(scripted("THROW").fetchImpl, live, ledger, intent());
    const { fetchImpl, calls } = scripted("THROW");
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(r.outcome).toBe("SUBMISSION_UNKNOWN");
    expect(r.sent).toBe(false);
    expect(calls.map(pathOf)).not.toContain(WEBULL_SDK_CONTRACT.ORDER_PLACE.path);
  });

  it("only a PROVEN absence permits another place, with the SAME client id", async () => {
    const ledger = inMemoryOrderLedger();
    await submitWebullOrderOnce(scripted("THROW").fetchImpl, live, ledger, intent());
    const { fetchImpl, calls } = scripted(
      json({}, 404),
      json({ client_order_id: intent().clientOrderId, order_id: "W2" }),
    );
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(calls.map(pathOf)).toEqual([
      WEBULL_SDK_CONTRACT.ORDER_DETAIL.path,
      WEBULL_SDK_CONTRACT.ORDER_PLACE.path,
    ]);
    const placed = JSON.parse(String(calls[1].init.body));
    expect(placed.new_orders[0].client_order_id).toBe(intent().clientOrderId);
    expect(r.outcome).toBe("ACKNOWLEDGED");
  });

  it("a finished submission is never re-sent", async () => {
    const ledger = inMemoryOrderLedger();
    await submitWebullOrderOnce(scripted(json({ order_id: "W1" })).fetchImpl, live, ledger, intent());
    const { fetchImpl, calls } = scripted(json({ order_id: "W-dup" }));
    const r = await submitWebullOrderOnce(fetchImpl, live, ledger, intent());
    expect(r.outcome).toBe("ALREADY_PLACED");
    expect(calls).toHaveLength(0);
  });

  it("sends the category header the SDK derives from the order", async () => {
    const { fetchImpl, calls } = scripted(json({ order_id: "W1" }));
    await submitWebullOrderOnce(fetchImpl, live, inMemoryOrderLedger(), intent());
    expect((calls[0].init.headers as Record<string, string>).category).toBe("US_EQUITY");
  });

  it("a 4xx refusal is recorded REJECTED with Webull's own words", async () => {
    const { fetchImpl } = scripted(json({ code: "INSUFFICIENT_BUYING_POWER", message: "not enough" }, 400));
    const r = await submitWebullOrderOnce(fetchImpl, live, inMemoryOrderLedger(), intent());
    expect(r.outcome).toBe("REJECTED");
    expect(r.note).toMatch(/INSUFFICIENT_BUYING_POWER/);
  });
});

describe("the exact lookup never mistakes silence for absence", () => {
  const id = intent().clientOrderId;
  it("FOUND reads status from the record carrying OUR id", async () => {
    const { fetchImpl } = scripted(json({ data: [{ client_order_id: "other", status: "FILLED" }, { client_order_id: id, status: "PARTIAL FILLED", order_id: "W3" }] }));
    const r = await getWebullOrderByClientId(fetchImpl, config, "ACC1", id);
    expect(r).toEqual({ state: "FOUND", status: "PARTIAL_FILLED", rawStatus: "PARTIAL FILLED", brokerOrderId: "W3" });
  });

  it("a non-empty answer that carries a different id is UNKNOWN, not NOT_FOUND", async () => {
    const { fetchImpl } = scripted(json({ data: [{ client_order_id: "other" }] }));
    expect((await getWebullOrderByClientId(fetchImpl, config, "ACC1", id)).state).toBe("UNKNOWN");
  });

  it("no answer is UNKNOWN", async () => {
    const { fetchImpl } = scripted("THROW");
    expect((await getWebullOrderByClientId(fetchImpl, config, "ACC1", id)).state).toBe("UNKNOWN");
  });

  it("an auth failure is UNKNOWN, never absence", async () => {
    const { fetchImpl } = scripted(json({ code: "INVALID_TOKEN" }, 401));
    expect((await getWebullOrderByClientId(fetchImpl, config, "ACC1", id)).state).toBe("UNKNOWN");
  });
});
