/**
 * LEVEL PASSPORT — render proof. "Kind only changes the noun on the door.
 * The drawer layout does not change."
 *
 * A selected swing LEVEL (selectStructureMarketObjects) fell through to the
 * bar ticket: Inspect described a bar while the trader had selected an
 * object. The fixture level is built by the REAL owner and its lineage by the
 * same owner a zone uses, so the markup is checked against what they publish.
 *
 * Rendered to static markup (no testing-library in this repo).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { selectStructureMarketObjects } from "@/lib/marketData/viewModels/selectStructureMarketObjects";
import { selectObjectLineage, type ObjectLineageVM } from "@/lib/marketData/viewModels/selectZoneLineage";
import type { MarketObject } from "@/lib/marketData/marketObjectKinds";

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
const levels = selectStructureMarketObjects({ structure, bars, identities });
const high = levels.find(l => l.objectId.endsWith(":HIGH"))!;
const METHOD = "selectMarketStructure → selectStructureMarketObjects (confirmed, untouched swing levels)";

const passport = (level: MarketObject, lineage: ObjectLineageVM | null) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      selectedLevel={level}
      levelLineage={lineage}
    />,
  );

describe("a selected LEVEL opens its Passport, not the bar ticket", () => {
  it("the fixture really is a level from the owner", () => {
    expect(high).toBeDefined();
    expect(high.kind).toBe("LEVEL");
    expect(high.priceLow).toBe(high.priceHigh);
  });

  it("the same drawer as a zone: noun, price, fidelity, state, lineage from the owner", () => {
    const html = passport(high, selectObjectLineage({ object: high, method: METHOD, identities, decisionId: null }));
    expect(html).toContain("MARKET OBJECT PASSPORT");
    expect(html).toContain(`data-inspect-object="${high.objectId}"`);
    expect(html).toContain('data-inspect-kind="LEVEL"');
    expect(html).toContain("Level · 14.00 · swing high");
    expect(html).toContain(">INDICATIVE<");
    expect(html).toContain('data-inspect-lineage="READ"');
    expect(html).toContain("BTC|1h|2000|e0 · coinbase · REST_BACKFILL · INDICATIVE");
    expect(html).toContain(METHOD);
    // The bar ticket publishes its reach; the Passport is not it.
    expect(html).not.toContain("data-inspect-reach=");
  });

  it("states what the level owner cannot know instead of inferring it", () => {
    const html = passport(high, null);
    expect(html).toContain("None since birth — the level owner publishes only untouched levels");
    expect(html).toContain("No rule stated — this level has no lifecycle owner yet");
    expect(html).toContain('data-inspect-lineage="NOT_COMPILED"');
  });

  it("never prints a lineage compiled for another object", () => {
    const low = levels.find(l => l.objectId.endsWith(":LOW"));
    const other = low ?? { ...high, objectId: "LEVEL:other" };
    const html = passport(high, selectObjectLineage({ object: other, method: METHOD, identities, decisionId: null }));
    expect(html).toContain('data-inspect-lineage="NOT_COMPILED"');
  });
});
