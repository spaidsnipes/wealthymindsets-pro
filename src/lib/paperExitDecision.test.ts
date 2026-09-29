import { describe, expect, it } from "vitest";
import { decisionOfOpenPosition, type Order } from "./paperTrade";
import { continueOrMint, mintDecisionId, type DecisionIdentity } from "./traderMemory/decisionIdentity";

const ord = (o: Partial<Order>): Order => ({ id: Math.random().toString(36).slice(2), symbol: "TSLA", side: "buy", type: "market", qty: 1, status: "filled", ts: 1, ...o } as Order);

describe("G6 — one decision from chart to exit (2026-09-29)", () => {
  it("the exit order inherits the decision that opened the position", () => {
    const orders = [ord({ decisionId: "wmd_A" as never, ts: 10 }), ord({ side: "sell", decisionId: "wmd_B" as never, ts: 5 })];
    expect(decisionOfOpenPosition(orders, "TSLA", 1)).toEqual({ ok: true, decisionId: "wmd_A" });
    expect(decisionOfOpenPosition(orders, "TSLA", -1)).toEqual({ ok: true, decisionId: "wmd_B" });
  });
  it("BREAK: identity lost → the exit fails BY TRANSITION NAME, never re-minted", () => {
    expect(decisionOfOpenPosition([ord({})], "TSLA", 1)).toEqual({ ok: false, transition: "EXIT: decision identity absent" });
  });
  it("BREAK: a malformed persisted id is not accepted as the exit's decision", () => {
    expect(decisionOfOpenPosition([ord({ decisionId: "wmd_ord-9" as never })], "TSLA", 1).ok).toBe(false);
    expect(decisionOfOpenPosition([ord({ decisionId: "" as never })], "TSLA", 1).ok).toBe(false);
  });
  it("the ticket's continuation keeps the scene's id: order id === chart id", () => {
    const chart = mintDecisionId({ cause: "PERMISSION_GRANTED", deviceId: "dev", nowMs: 1, nonce: "scene-nonce" });
    if (!chart.ok) throw new Error("mint refused");
    const onTicket = continueOrMint(chart.identity as DecisionIdentity, { cause: "EXPLICIT_INTENT", deviceId: "dev", nowMs: 2, nonce: "other" });
    expect(onTicket.ok && onTicket.identity.decisionId).toBe(chart.identity.decisionId);
  });
});
