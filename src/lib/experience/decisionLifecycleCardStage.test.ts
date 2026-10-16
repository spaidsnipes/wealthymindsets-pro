import { describe, expect, it } from "vitest";
import { nearestLiveZone, selectCardStage as selectTradeStage, type CardStageInput as TradeStageInput } from "./decisionLifecycle";

const base: TradeStageInput = { verdict: "WAIT", reason: "RISK NOT DECLARED · CLARITY PRECEDES ENTRY", book: null, nearZone: null, closedToday: null };
const flat = { state: "FLAT", quantity: 0, averagePrice: null, protection: null, working: 0 } as const;

describe("plate 34 · the card moves through the real setup", () => {
  it("WAIT says the plaque's reason in plain words", () => {
    expect(selectTradeStage(base)).toEqual({ stage: "WAIT", sentence: "Risk not declared." });
  });
  it("WATCH when price is near a live zone", () => {
    expect(selectTradeStage({ ...base, nearZone: { side: "SUPPLY", distance: 6, unit: "points" } }))
      .toEqual({ stage: "WATCH", sentence: "Price is 6 points from the supply zone." });
  });
  it("inside a zone is said as inside, never '0 points from'", () => {
    expect(selectTradeStage({ ...base, nearZone: { side: "DEMAND", distance: 0, unit: "points" } }).sentence).toBe("Price is inside the demand zone.");
  });
  it("READY when an order is working, or the evidence is paid — never 'go'", () => {
    expect(selectTradeStage({ ...base, book: { ...flat, working: 1 } }).stage).toBe("READY");
    expect(selectTradeStage({ ...base, verdict: "ACTION" }).sentence).toContain("permission is yours");
  });
  it("IN TRADE when a position has no working stop; MANAGE when it has one", () => {
    const pos = { state: "LONG", quantity: 2, averagePrice: 30100, protection: "UNPROTECTED" as const, working: 0 };
    expect(selectTradeStage({ ...base, book: pos })).toEqual({ stage: "IN_TRADE", sentence: "Long 2 at 30,100. No stop working — set one." });
    expect(selectTradeStage({ ...base, book: { ...pos, protection: "PROTECTED" } }).stage).toBe("MANAGE");
  });
  it("REVIEW only when the room says a trade closed today", () => {
    expect(selectTradeStage({ ...base, book: flat, closedToday: { result: "+$1,200" } }))
      .toEqual({ stage: "REVIEW", sentence: "Closed +$1,200 today. Journal it." });
  });
  it("a held position outranks everything", () => {
    expect(selectTradeStage({ ...base, closedToday: { result: "+$1" }, book: { state: "SHORT", quantity: -1, averagePrice: null, protection: null, working: 0 } }).stage).toBe("IN_TRADE");
  });
});

describe("plate 34 · the nearest live zone", () => {
  const zones = [
    { side: "SUPPLY" as const, low: 110, high: 112, live: true },
    { side: "DEMAND" as const, low: 90, high: 92, live: true },
    { side: "SUPPLY" as const, low: 101, high: 102, live: false },
  ];
  it("measures to the near edge, ignores dead zones, respects reach", () => {
    expect(nearestLiveZone(zones, 104, 10)).toEqual({ side: "SUPPLY", distance: 6 });
    expect(nearestLiveZone(zones, 104, 5)).toBeNull();
    expect(nearestLiveZone(zones, 91, 1)).toEqual({ side: "DEMAND", distance: 0 });
  });
});
