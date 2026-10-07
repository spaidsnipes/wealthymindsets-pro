import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { hydrateJournalEntries } from "./hydrateJournalEntries";
import {
  FVG_REF_KIND,
  fvgReferenceAtDecision,
  fvgReferenceSentence,
  parseFvgObjectId,
  readJournalFvgReference,
} from "./fvgDecisionReference";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
function series(rows: readonly Row[]): CanonicalBar[] {
  return rows.map(([o, h, l, c], i) => {
    const asOf = T0 + i * MIN;
    return {
      barId: `${SYM}|1m|${asOf}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
      open: o, high: h, low: l, close: c, volume: 1, asOf, receivedAt: asOf + MIN,
      fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
    };
  });
}
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const INSIDE: Row = [104, 104.2, 101.6, 101.8]; // wick in, close inside → interaction runs
const DEEP_IN: Row = [101.8, 101.9, 101.2, 101.5];
const bars = series([...FLAT, ...BULL, AWAY, INSIDE, DEEP_IN, AWAY, AWAY, AWAY, AWAY, AWAY, AWAY, INSIDE, AWAY]);
const obj = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }).objects.find(o => o.direction === "BULLISH")!;
const closeOf = (i: number) => bars[i].asOf + MIN;
const B3 = FLAT.length + 2;

describe("Journal ↔ FVG — a reference + its state AT DECISION TIME, never FVG = YES", () => {
  it("parses only FVG_3C object ids", () => {
    expect(parseFvgObjectId(obj.objectId)).toMatchObject({ symbol: SYM, timeframe: "1m", direction: "BULLISH", version: 1 });
    expect(parseFvgObjectId("YES")).toBeNull();
  });

  it("before any touch: the snapshot cannot see the later touch (as-of, no hindsight)", () => {
    const r = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3 + 1), bars });
    if (!r.ok) throw new Error(r.reason);
    expect(obj.firstTouch).not.toBeNull(); // the full history did touch it
    expect(r.ref.snapshot).toMatchObject({ interaction: "BEFORE_ANY_TOUCH", interactionsSoFar: 0, mitigation: "NONE", maxPenetration: 0 });
    expect(r.ref.readAsOfMs).toBe(closeOf(B3 + 1));
    expect(r.ref.kind).toBe(FVG_REF_KIND);
    expect(r.ref.definitionId).toBe("FVG_3C");
  });

  it("during the first interaction, with penetration as it stood then", () => {
    const r = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3 + 2), bars });
    if (!r.ok) throw new Error(r.reason);
    expect(r.ref.snapshot.interaction).toBe("DURING_FIRST_INTERACTION");
    expect(r.ref.snapshot.maxPenetration).toBeCloseTo(0.4, 9);
    const later = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(bars.length - 2), bars });
    if (!later.ok) throw new Error(later.reason);
    expect(later.ref.snapshot.interactionsSoFar).toBeGreaterThanOrEqual(2);
    expect(later.ref.snapshot.interaction).toMatch(/LATER_INTERACTION$/);
  });

  it("evidence per sense: price FULL from OHLC; others NOT_ATTACHED unless an owner is referenced", () => {
    const r = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3 + 2), bars });
    if (!r.ok) throw new Error(r.reason);
    expect(r.ref.snapshot.evidence.map(e => `${e.sense}:${e.state}`)).toEqual(["PRICE_GEOMETRY:FULL", "ORDER_FLOW:NOT_ATTACHED", "DERIVATIVES:NOT_ATTACHED"]);
  });

  it("refuses plainly: before the gap existed, unknown id, not in the bars, unknown time", () => {
    expect(fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3) - 1, bars })).toMatchObject({ ok: false, reason: expect.stringMatching(/did not exist yet/) });
    expect(fvgReferenceAtDecision({ objectId: "FVG = YES", decisionAtMs: 1, bars }).ok).toBe(false);
    expect(fvgReferenceAtDecision({ objectId: obj.objectId.replace(/\|\d+\|/, "|1|"), decisionAtMs: closeOf(20), bars })).toMatchObject({ ok: false, reason: expect.stringMatching(/not in the bars/) });
    expect(fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: Number.NaN, bars }).ok).toBe(false);
  });

  it("stored round-trip through the journal hydrator; a tampered record is dropped whole", () => {
    const r = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3 + 2), bars });
    if (!r.ok) throw new Error(r.reason);
    const stored = JSON.parse(JSON.stringify(r.ref));
    expect(readJournalFvgReference(stored)).toEqual(r.ref);
    expect(readJournalFvgReference({ ...stored, snapshot: { ...stored.snapshot, state: "YES" } })).toBeNull();
    expect(readJournalFvgReference(true)).toBeNull();
    const base = { id: "e1", date: "2026-10-06", symbol: SYM, side: "long", entry: 1, exit: 2, size: 1, pnl: 1, pct: 1, tags: [], notes: "", mood: "neutral", result: "win", starred: false, images: [], voiceSec: 0, setup: "", mistakes: "", lessons: "", emojis: [] };
    const h = hydrateJournalEntries([{ ...base, fvgRef: stored }, { ...base, id: "e2", fvgRef: "YES" }]);
    expect(h.entries[0].fvgRef).toEqual(r.ref);
    expect(h.entries[1].fvgRef).toBeUndefined();
  });

  it("the sentence states facts — no grade, no fill expectation", () => {
    const r = fvgReferenceAtDecision({ objectId: obj.objectId, decisionAtMs: closeOf(B3 + 2), bars });
    if (!r.ok) throw new Error(r.reason);
    const s = fvgReferenceSentence(r.ref);
    expect(s).toMatch(/^bullish gap 101\.00–102\.00 on BTC-USD 1m \(FVG_3C v1\): at decision time it was .*during the first interaction \(1 interaction so far\), deepest penetration 40%/);
    expect(s).not.toMatch(/will fill|must fill|score|probab|yes/i);
    // Prices print at the instrument's display decimals — float noise is not a quote.
    expect(fvgReferenceSentence({ ...r.ref, priceDp: null, snapshot: { ...r.ref.snapshot, bottom: 374.6000061035156, top: 378.5199890136719 } })).toContain("374.6–378.52");
  });

  it("source: reads through fvgStateAsOf; does not touch the plan lane", () => {
    const src = readFileSync(path.resolve(__dirname, "fvgDecisionReference.ts"), "utf8");
    expect(src.length).toBeGreaterThan(1000);
    expect(src).toContain("fvgStateAsOf(full, input.decisionAtMs)");
    expect(src).not.toMatch(/from "\.\/(managementPlan|planVsActual)/);
  });
});
