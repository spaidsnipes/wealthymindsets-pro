/**
 * ZONE PASSPORT · LINEAGE — render proof.
 *
 * The Passport printed its object id only as a data attribute and two of its
 * evidence ids; the session, the birth bar's source and provenance, the
 * lifecycle version and the Decision_ID chain never reached the glass. The
 * fixture zone is built by the REAL owners, and the lineage by
 * `selectZoneLineage`, so the markup is checked against what they publish.
 *
 * Rendered to static markup (no testing-library in this repo).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { selectStructureZoneObjects } from "@/lib/marketData/viewModels/selectStructureZoneObjects";
import { selectZoneLineage, type ZoneLineageVM } from "@/lib/marketData/viewModels/selectZoneLineage";

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
const zone = selectStructureZoneObjects({ structure, bars, identities }).find(z => z.side === "DEMAND")!;

/** The LINEAGE section alone: from its own test id to the footer.
 *  2026-09-26 (F11B): the drawer's order is now the eight slots, the touch
 *  depth, LINEAGE, then the PASSPORT ID footer — the section ends at the
 *  footer, not at the old INVALIDATION CONDITION head (now a slot above it). */
const lineageOf = (html: string) => {
  const at = html.indexOf('data-testid="passport-provenance"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(at, html.indexOf('data-testid="passport-footer"', at));
};

const passport = (zoneLineage: ZoneLineageVM | null, activeDecisionId: string | null = null) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      selectedZone={zone}
      zoneLineage={zoneLineage}
      activeDecisionId={activeDecisionId}
    />,
  );

describe("the Passport prints its LINEAGE", () => {
  it("object id as text, kind and session, the birth bar's source and provenance, every evidence id, both owners and the version", () => {
    const html = passport(selectZoneLineage({ zone, identities, decisionId: null }));
    const lineage = lineageOf(html);
    expect(lineage).toContain('data-inspect-lineage="READ"');
    // 2026-09-26: the section heads carry no glyph now (the medallions are on the slots).
    expect(lineage).toContain(">LINEAGE</div>");
    expect(lineage).toContain(">ZONE:BTC|1h|1000|e0:DEMAND<");
    expect(lineage).toContain("ZONE · session CONTINUOUS");
    expect(lineage).toContain("BTC|1h|1000|e0 · coinbase · REST_BACKFILL · INDICATIVE");
    for (const id of zone.object.evidenceIds) expect(lineage).toContain(`>${id}<`);
    expect(lineage).toMatch(/BTC\|1h\|1000\|e0<\/span> <span[^>]*>· birth/);
    expect(lineage).toMatch(/BTC\|1h\|3000\|e0<\/span> <span[^>]*>· test/);
    expect(lineage).toContain(`selectStructureZoneObjects + selectZoneLifecycle v${zone.lifecycle.version}`);
    // 2026-09-26: the lifecycle owner is v2 (touch depth → CONSUMPTION).
    expect(lineage).toContain("selectZoneLifecycle v2");
  });

  it("the CHAIN row names the decision, or says none was taken", () => {
    const taken = passport(selectZoneLineage({ zone, identities, decisionId: "D-1842" }), "D-1842");
    expect(taken).toContain('data-inspect-chain="READ"');
    expect(taken).toContain("BAR BTC|1h|1000|e0 → OBJECT ZONE:BTC|1h|1000|e0:DEMAND → DECISION D-1842");
    const none = passport(selectZoneLineage({ zone, identities, decisionId: null }));
    expect(none).toContain("→ DECISION none taken");
  });

  // 2026-09-26 (F11B): SOURCE FIDELITY / INVALIDATION CONDITION became the
  // FIDELITY and INVALIDATION slots; LINEAGE sits after every slot, before the footer.
  it("sits after the FIDELITY slot and before the footer, and reprints no price of the birth bar", () => {
    const html = passport(selectZoneLineage({ zone, identities, decisionId: null }));
    const at = html.indexOf(">LINEAGE</div>");
    expect(html.indexOf('data-passport-slot="FIDELITY"')).toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(html.indexOf('data-passport-slot="FIDELITY"'));
    expect(at).toBeLessThan(html.indexOf('data-testid="passport-footer"'));
    const lineage = lineageOf(html);
    expect(lineage).toContain("Birth bar");
    expect(lineage).not.toMatch(/\b(open|high|low|close)\b/i);
    expect(lineage).not.toMatch(/>(7|10|9)(\.0+)?</);
  });

  it("a birth bar with no admitted identity is said in the UNREAD colour, keeping its id", () => {
    const html = passport(selectZoneLineage({ zone, identities: identities.slice(1), decisionId: null }));
    expect(html).toContain('data-inspect-lineage="UNREAD"');
    expect(html).toMatch(/color:#F0B429">Birth bar identity not admitted/);
    expect(html).toContain(">BTC|1h|1000|e0<");
  });

  it("a lineage compiled for another object is never printed beside this one", () => {
    const other = { ...selectZoneLineage({ zone, identities, decisionId: "D-9" }), objectId: "ZONE:OTHER" };
    const html = passport(other, "D-9");
    expect(html).toContain('data-inspect-lineage="NOT_COMPILED"');
    expect(html).not.toContain("ZONE:OTHER");
    expect(html).toContain("Not compiled for this object.");
  });
});

describe("the room compiles the lineage it hands the Passport", () => {
  const ROOM = readFileSync(join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

  it("from the admitted identities and the camera's own decision, once per selection change", () => {
    expect(ROOM).toContain(
      "? selectZoneLineage({ zone, identities: chartBarIdentities, decisionId: currentSceneDecision?.decisionId ?? null })",
    );
    expect(ROOM).toContain("}, [chartStructureZones, selectedMarketObjectId, chartBarIdentities, currentSceneDecision?.decisionId]);");
    expect(ROOM).toContain("zoneLineage={selectedZoneLineage}");
    // Read during render: declared after the decision it reads, or it throws in the TDZ.
    expect(ROOM.indexOf("const selectedZoneLineage = React.useMemo(")).toBeGreaterThan(ROOM.indexOf("const currentSceneDecision ="));
  });
});
