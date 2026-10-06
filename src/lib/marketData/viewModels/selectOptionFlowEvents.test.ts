import { describe, expect, it } from "vitest";
import { flowSideWords, selectOptionFlowEvents, type OptionLeg, type OptionPrint } from "./selectOptionFlowEvents";

const legs = new Map<string, OptionLeg>([
  ["./NQZ26C31400", { contract: "NQZ6 C31400", type: "call", strike: 31400, expiration: "2026-10-09", multiplier: 20 }],
  ["./NQZ26P31000", { contract: "NQZ6 P31000", type: "put", strike: 31000, expiration: "2026-10-09", multiplier: null }],
]);
const p = (o: Partial<OptionPrint>): OptionPrint => ({
  streamer: "./NQZ26C31400", timeMs: 1000, sequence: 1, price: 50, size: 1, aggressor: "UNDEFINED", bid: 49, ask: 51, ...o,
});

describe("options flow events (P-03)", () => {
  const small = Array.from({ length: 20 }, (_, i) => p({ timeMs: 100 + i, sequence: i, size: 2 }));

  it("qualifies by size against the median heard (≥ 3× median, ≥ 5), states the rule", () => {
    const vm = selectOptionFlowEvents([...small, p({ timeMs: 900, sequence: 99, size: 6 }), p({ timeMs: 950, sequence: 98, size: 5 })], legs);
    expect(vm.minSize).toBe(6);
    expect(vm.events.map(e => e.size)).toEqual([6]);
    expect(vm.receipt).toBe("OPTFLOW:HEARD:22|MIN:6|EVENTS:1|STAMPED:0");
  });

  it("side: exchange aggressor stamped; otherwise ask/bid-near INFERRED; otherwise unknown", () => {
    const vm = selectOptionFlowEvents([
      p({ size: 10, sequence: 1, aggressor: "BUY" }),
      p({ size: 10, sequence: 2, timeMs: 1001, price: 51 }),
      p({ size: 10, sequence: 3, timeMs: 1002, price: 49 }),
      p({ size: 10, sequence: 4, timeMs: 1003, price: 50 }),
    ], legs);
    expect(vm.events.map(e => [e.side, e.sideStamped])).toEqual([["BUY", true], ["ASK_NEAR", false], ["BID_NEAR", false], ["UNKNOWN", false]]);
    expect(flowSideWords(vm.events[1])).toBe("CALL ASK-NEAR · inferred · open/close unknown");
  });

  it("premium is an estimate only with a known multiplier; duplicates fold; unknown contracts ignored", () => {
    const vm = selectOptionFlowEvents([
      p({ size: 10 }), p({ size: 10 }),
      p({ streamer: "./NQZ26P31000", size: 10, timeMs: 2000, sequence: 7 }),
      p({ streamer: "./OTHER", size: 999 }),
    ], legs);
    expect(vm.events).toHaveLength(2);
    expect(vm.events[0].premiumEst).toBe(50 * 10 * 20);
    expect(vm.events[1].premiumEst).toBeNull();
  });

  it("same instant, same size, different contracts → MULTI-LEG? on both", () => {
    const vm = selectOptionFlowEvents([
      p({ size: 12, timeMs: 5000 }), p({ streamer: "./NQZ26P31000", size: 12, timeMs: 5000, sequence: 2 }),
    ], legs);
    expect(vm.events.every(e => e.multiLeg)).toBe(true);
    expect(flowSideWords(vm.events[1])).toContain("MULTI-LEG?");
  });
});
