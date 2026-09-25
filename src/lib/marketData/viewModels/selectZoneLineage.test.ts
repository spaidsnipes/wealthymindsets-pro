import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import { checkNoReprint } from "../inspectChain";
import type { MarketStructureVM } from "./selectMarketStructure";
import { selectStructureZoneObjects } from "./selectStructureZoneObjects";
import { selectZoneLineage } from "./selectZoneLineage";

// Built by the REAL zone owner, so the lineage is checked against what the Passport selects.
const bars: LegacyOhlcvTuple[] = [
  { time: 1, open: 8, high: 10, low: 7, close: 9, volume: 1 },
  { time: 2, open: 9, high: 14, low: 11, close: 13, volume: 1 },
  { time: 3, open: 12, high: 13, low: 9.5, close: 12, volume: 1 },
  { time: 4, open: 12, high: 13, low: 11.5, close: 12.5, volume: 1 },
];
const identities: CanonicalBarIdentity[] = bars.map(bar => ({
  barId: `BTC|1h|${bar.time * 1000}|e0`, symbolId: "BTC", sessionId: "CONTINUOUS",
  timeframe: "1h", asOf: bar.time * 1000, receivedAt: bar.time * 1000 + 1,
  fidelity: "INDICATIVE", source: "coinbase", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const structure: MarketStructureVM = {
  measured: true, lookback: 1, barCount: bars.length, unconfirmedBars: 1,
  confirmationLagNote: "one bar", swingHighs: [{ time: 2, price: 14 }],
  swingLows: [{ time: 1, price: 7 }], lastSwingHigh: { time: 2, price: 14 },
  lastSwingLow: { time: 1, price: 7 }, bias: "RANGE", biasNote: "range",
  insufficientNote: null,
};
const demand = selectStructureZoneObjects({ structure, bars, identities }).find(z => z.side === "DEMAND")!;

describe("selectZoneLineage — the Passport's ids, provenance and chain, from the owners", () => {
  it("names the object, its kind and session, the birth bar's admitted source and provenance", () => {
    const l = selectZoneLineage({ zone: demand, identities, decisionId: null });
    expect(l.objectId).toBe("ZONE:BTC|1h|1000|e0:DEMAND");
    expect([l.kind, l.sessionId, l.symbolId]).toEqual(["ZONE", "CONTINUOUS", "BTC"]);
    expect(l.birth).toEqual({ state: "READ", barId: "BTC|1h|1000|e0", line: "BTC|1h|1000|e0 · coinbase · REST_BACKFILL · INDICATIVE" });
    expect(l.method).toBe(`selectStructureZoneObjects + selectZoneLifecycle v${demand.lifecycle.version}`);
    expect(l.asOf).toBe(4000);
  });

  it("lists EVERY evidence id in the object's order: the birth bar, then each test bar", () => {
    const l = selectZoneLineage({ zone: demand, identities, decisionId: null });
    expect(l.evidence).toEqual([
      { id: "BTC|1h|1000|e0", role: "BIRTH" },
      { id: "BTC|1h|3000|e0", role: "TEST" },
    ]);
    expect(l.evidence.map(e => e.id)).toEqual(demand.object.evidenceIds);
  });

  it("carries the chain BAR → OBJECT → DECISION, with the decision or 'none taken'", () => {
    expect(selectZoneLineage({ zone: demand, identities, decisionId: "D-1842" }).chain).toEqual({
      state: "READ", decisionId: "D-1842",
      line: "BAR BTC|1h|1000|e0 → OBJECT ZONE:BTC|1h|1000|e0:DEMAND → DECISION D-1842",
    });
    const none = selectZoneLineage({ zone: demand, identities, decisionId: null }).chain;
    expect(none.state === "READ" && none.line.endsWith("→ DECISION none taken")).toBe(true);
  });

  it("a birth bar with no admitted identity says so, keeping its id; a refused chain prints the refusal", () => {
    const l = selectZoneLineage({ zone: demand, identities: identities.slice(1), decisionId: null });
    expect(l.birth.state).toBe("UNREAD");
    expect(l.birth.barId).toBe("BTC|1h|1000|e0");
    expect(l.birth.state === "UNREAD" && l.birth.absence).toMatch(/^Birth bar identity not admitted/);
    const orphan = { ...demand, object: { ...demand.object, birthBarId: "  " } };
    const refused = selectZoneLineage({ zone: orphan, identities, decisionId: "D-1" }).chain;
    expect(refused.state).toBe("UNREAD");
    expect(refused.state === "UNREAD" && refused.reason).toMatch(/chain starts at the bar/);
  });

  it("reprints no bar: ids and words only", () => {
    const l = selectZoneLineage({ zone: demand, identities, decisionId: "D-1" });
    expect(checkNoReprint(l as unknown as Record<string, unknown>)).toEqual({ ok: true });
    expect(checkNoReprint(l.birth as unknown as Record<string, unknown>)).toEqual({ ok: true });
    expect(JSON.stringify(l)).not.toMatch(/"(open|high|low|close|volume)"/);
  });
});
