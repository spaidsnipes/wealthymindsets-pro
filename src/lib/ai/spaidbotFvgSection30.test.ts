/**
 * Garden 19 §30 — SpaidBot × FVG coverage. The fact block for a selected gap
 * carries EVERY §30 item, each read from its existing owner:
 *   definition · formation time · boundaries · original size · remaining
 *   territory · touch status · mitigation depth · age · displacement ·
 *   structure / profile / order-flow / wall relationships · prior interaction ·
 *   limitations.
 * Relationships come from the ONE relationship owner (fvgRelationshipsFor via
 * fvgBarContext + the options owner's reading), exactly as Inspect reads them.
 * No provider call.
 */
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { fvgBarContext, fvgBarOnlyRelationships } from "@/lib/marketData/fvg/fvgBarContext";
import { fvgRelationshipsFor, type FvgRelationshipReading } from "@/lib/marketData/fvg/fvgRelationships";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { fvgInspectAsk } from "./spaidbotAsk";
import { formatFvgFactBlock, formatOneFvgFact, fvgFactsForSpaidbot, spaidbotFvgScene } from "./spaidbotFvgFacts";

type Row = readonly [number, number, number, number];
const MIN = 60_000, T0 = Date.UTC(2026, 9, 6, 10, 0, 0), SYM = "BTC-USD";
const series = (rows: readonly Row[]): CanonicalBar[] => rows.map(([o, h, l, c], i) => {
  const asOf = T0 + i * MIN;
  return { barId: `${SYM}|1m|${asOf}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m", open: o, high: h, low: l, close: c, volume: 1, asOf, receivedAt: asOf + MIN, fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0 };
});
// A swing high of 103 (confirmed before b2 opens) that b2 closes through → a STRUCTURE relationship.
const FLAT: Row[] = Array.from({ length: 15 }, (_, i) => (i === 7 ? [100, 103, 99, 100] : [100, 101, 99, 100]) as Row);
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const PARTIAL: Row = [104, 104.2, 101.6, 102.6];
const bars = series([...FLAT, ...BULL, AWAY, PARTIAL, AWAY, AWAY]);
const ledger = detectFvgs(bars, { symbolId: SYM, timeframe: "1m", tickSize: 0.01 });
const obj = ledger.objects.find(o => o.bottom === 101 && o.top === 102)!;

/** The options owner's drawn reading (shape as selectDerivativesPressure returns it): a put wall inside the gap. */
const walls = {
  drawn: true, version: 1, underlying: SYM, spot: 104.5, climate: "DAMPING", climateRatio: 0.4, netAtSpot: 1, gross: 2.5,
  geography: [], zeroGamma: 80, testSpanSec: 0, pockets: [], envelope: null, contracts: 120,
  walls: [{ strike: 101.5, exposure: 1, share: 0.2, callOi: 100, putOi: 900, side: "BELOW", life: "BORN", tests: 0, closesBeyond: 0, firstTestTime: null, testTimes: [] }],
  clocks: { chainAsOf: null, underlyingAsOf: null, oiAsOf: "PRIOR_SESSION", modelAsOf: 0 },
  source: "CBOE_DELAYED", fidelity: "DELAYED", epistemic: { exposure: "INFERRED", envelope: "DERIVED", tests: "OBSERVED" },
  assumption: "dealers long calls / short puts", receipt: "PRESSURE:FIXTURE",
} as unknown as DerivativesPressureVM;

function inspectReading(): FvgRelationshipReading {
  // Exactly what Inspect composes: bar-only structure + profile, plus the options owner.
  const ctx = fvgBarContext(bars, SYM, "1m");
  const barOnly = fvgBarOnlyRelationships(ctx, obj);
  const withWalls = fvgRelationshipsFor(obj, { derivatives: walls });
  return {
    objectId: obj.objectId,
    relationships: [...barOnly.relationships, ...withWalls.relationships.filter(r => r.family === "WALL")],
    sources: [...barOnly.sources.filter(s => s.family !== "WALL"), ...withWalls.sources.filter(s => s.family === "WALL")],
  };
}

describe("§30 — every item, from its owner", () => {
  const reading = inspectReading();
  const block = formatOneFvgFact(fvgFactsForSpaidbot(obj, true, 2, reading))!;

  it.each([
    ["definition", /definition FVG_3C v1/],
    ["formation time", /formed 2026-10-06T10:\d\dZ \(close of its third bar\)/],
    ["boundaries", /boundaries 101\.00–102\.00/],
    ["original size", /size 1\.00 points \(100 ticks\)/],
    ["remaining territory", /remaining territory 101\.00–101\.60/],
    ["touch status", /first touched 2026-10-06T10:\d\dZ/],
    ["mitigation depth", /mitigation depth PARTIAL \(deepest penetration 40% of size\)/],
    ["age", /age \d+ bars/],
    ["displacement", /displacement context: middle-bar body\/range \d\.\d\d, range \d\.\d\d× ATR\(14\)/],
    ["structure relationship", /RELATIONSHIPS .*STRUCTURE Market structure broke the swing 103\.00 at formation, evidence PARTIAL/],
    ["wall relationship", /WALL Options walls put wall 101\.50 inside, owner says BORN, evidence DEGRADED/],
    ["order-flow relationship (stated as the sense only)", /ORDER_FLOW has no relationship family — its only reading is the ORDER_FLOW sense above/],
    ["order-flow sense", /ORDER_FLOW SILENCE \(no owner reading attached\)/],
    ["prior interaction", /1 interaction: \w+ \(deepest 40%\)/],
    ["limitations", /LIMITATIONS: read as of .* price does not have to fill it; a sense marked SILENCE says nothing either way/],
  ])("%s", (_name, re) => {
    expect(block).toMatch(re);
  });

  it("profile: a row from the profile owner, or SILENCE with its reason — never absent", () => {
    const profileRow = /PROFILE [^;.]* (POC|VAH|VAL|HVN|LVN) [\d.–]+ /.test(block);
    const profileSilent = /silent: [^.]*PROFILE [^;.]*SILENCE/.test(block);
    expect(profileRow || profileSilent).toBe(true);
  });

  it("no forecast words anywhere in the block", () => {
    expect(block).not.toMatch(/\b(will|must) fill|probabilit|likely|chance|score\b/i);
  });
});

describe("§30 — the doors carry the relationships for the SELECTED gap only", () => {
  const reading = inspectReading();

  it("Inspect's Ask door patches the reading in", () => {
    const ask = fvgInspectAsk(obj, 2, reading);
    const f = (ask.context.fvg as ReturnType<typeof fvgFactsForSpaidbot>[])[0];
    expect(f.relationships!.rows.map(r => r.family)).toContain("STRUCTURE");
    expect(f.relationships!.rows.map(r => r.family)).toContain("WALL");
  });

  it("the chart scene attaches it to the selected gap, never to the others; a reading for another gap is not attached", () => {
    const others = ledger.objects.filter(o => o !== obj);
    const scene = spaidbotFvgScene({ objects: [...others, obj], selectedObjectId: obj.objectId, selectedRelationships: reading });
    expect(scene[0].selected).toBe(true);
    expect(scene[0].relationships).toBeDefined();
    expect(scene.slice(1).every(f => f.relationships === undefined)).toBe(true);
    expect(fvgFactsForSpaidbot(obj, true, 2, { ...reading, objectId: "FVG|X|1m|1|BULLISH|v1" }).relationships).toBeUndefined();
  });

  it("unattached relationships are SAID to be unattached (never 'none')", () => {
    const b = formatOneFvgFact(fvgFactsForSpaidbot(obj, false, 2))!;
    expect(b).toContain("RELATIONSHIPS (other owners' readings, by reference, DERIVED MEASUREMENT — not re-graded): not attached for this gap");
  });

  it("server validation: a junk relationship row is dropped, the block survives", () => {
    const f = fvgFactsForSpaidbot(obj, true, 2, reading);
    const junk = { ...f, relationships: { rows: [{ family: "WALL", kind: "MOON_WALL", relation: "INSIDE", price: 1, priceHigh: null, distance: 0, ownerState: null, label: "x", evidence: "FULL" }, ...f.relationships!.rows], silences: [] } };
    const b = formatFvgFactBlock([junk]);
    expect(b).not.toContain("MOON");
    expect(b).toContain("put wall 101.50");
  });
});
