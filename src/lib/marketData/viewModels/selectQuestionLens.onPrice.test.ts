/**
 * THE QUESTION LENS ON PRICE — GP12 §67, plates UI-04 / UI-15 / UI-07
 * (2026-09-26). Each question names where on price its evidence sits, read
 * from the same bars, swings, zones and marks its debt was measured on. These
 * pin the plate geometry per question and the one invariant under all of it:
 * every mark stands on a bar, swing or zone the owners handed in — the lens
 * never places a guess, and where nothing anchors a mark it names the silence.
 */
import { describe, expect, it } from "vitest";

import selectQuestionLens, { type LensMark, type QuestionLensInput, type QuestionLensVM } from "./selectQuestionLens";
import type { AbsorptionAnatomyVM, AnatomyBar, AbsorptionZone } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";

const bar = (i: number, low: number, high: number, close: number, effortNorm = 0.5, extra: Partial<AnatomyBar> = {}): AnatomyBar => ({
  time: i * 60, open: (low + high) / 2, high, low, close, effort: effortNorm * 100, effortNorm, delta: null,
  displacement: 0.5, displacementNorm: 0.5, absorbing: false, ...extra,
});
const anatomy = (bars: AnatomyBar[], over: Partial<AbsorptionAnatomyVM> = {}) => ({
  basis: "VOLUME", measured: true, bars, zones: [], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true, effortSpreadNote: null, ...over,
} as AbsorptionAnatomyVM);
const noEx: ExhaustionVM = { version: 1, measured: true, basis: "VOLUME", reason: "MEASURED", marks: [], pushes: [], latestPush: null };
const kinds = (v: QuestionLensVM) => (v.marks ?? []).map(m => m.kind);
const of = (v: QuestionLensVM, k: LensMark["kind"]) => (v.marks ?? []).filter(m => m.kind === k);

/** Every mark's anchor (and end) is a time an owner handed in. */
function anchoredOnOwners(v: QuestionLensVM, input: QuestionLensInput): string[] {
  const t = new Set<number>();
  for (const b of input.absorption?.bars ?? []) t.add(b.time);
  for (const p of input.pivots) t.add(p.time);
  for (const z of input.absorption?.zones ?? []) { t.add(z.startTime); t.add(z.endTime); }
  for (const m of input.exhaustion?.marks ?? []) { t.add(m.time); t.add(m.pushStartTime); }
  const bad: string[] = [];
  for (const m of v.marks ?? []) {
    if (!t.has(m.time)) bad.push(`${m.kind}@${m.time}`);
    if (m.time2 != null && !t.has(m.time2)) bad.push(`${m.kind}→${m.time2}`);
    if (!Number.isFinite(m.price)) bad.push(`${m.kind} price`);
  }
  return bad;
}

describe("ABSORBED? — UI-04: zone rings, leader words, effort columns, the side band", () => {
  // A zone at 100–101 (bars 2..3), price below it afterwards: the zone was a
  // ceiling, so its HIGHS are the tested edge. A retest at bar 6 re-enters.
  const zone: AbsorptionZone = { startTime: 120, endTime: 180, priceLo: 100, priceHi: 101, barCount: 2,
    efficiencyRatio: 3, unbounded: false, strength: "MODERATE", travelFrom: 100, travelTo: 100.4,
    netDelta: null, holdingEdge: null, holdingBasis: null };
  const bars = [
    bar(0, 98, 99, 98.8, 0.3), bar(1, 98.8, 99.8, 99.6, 0.4),
    bar(2, 99.6, 101, 100.2, 0.9, { displacementNorm: 0.2 }), bar(3, 99.9, 100.8, 100.1, 0.8, { displacementNorm: 0.2 }),
    bar(4, 99.2, 100, 99.4, 0.3), bar(5, 98.9, 99.6, 99.1, 0.3), bar(6, 99.1, 100.3, 99.3, 0.3), bar(7, 98.6, 99.4, 98.8, 0.2),
  ];
  const input: QuestionLensInput = { absorption: anatomy(bars, { zones: [zone] }), exhaustion: noEx, livingPoc: null, pivots: [], choice: "ABSORPTION" };
  const v = selectQuestionLens(input);

  it("rings the tested highs: the zone's peak and the retest after it", () => {
    const rings = of(v, "RING");
    expect(rings.map(r => [r.time, r.price])).toEqual([[120, 101], [360, 100.3]]);
  });
  it("the plate's two leader words, from the lens's own readings", () => {
    const rings = of(v, "RING");
    expect(rings[0].word).toBe("DECREASING EFFORT"); // effort after the zone < in it; VOLUME → no side named
    expect(rings[1].word).toBe("NO CONVINCING DISPLACEMENT"); // control verdict EFFORT ABSORBED
    expect(v.control?.verdict).toBe("EFFORT ABSORBED");
  });
  it("a dotted effort column per zone bar, rising into the zone's lower edge", () => {
    const cols = of(v, "EFFORT");
    expect(cols.map(c => [c.time, c.price, c.strength, c.dir])).toEqual([[120, 100, 0.9, "UP"], [180, 100, 0.8, "UP"]]);
  });
  it("on VOLUME the side band is a named silence, never a guessed side", () => {
    expect(of(v, "BAND")).toEqual([]);
    expect(v.silences).toEqual(["SIDE BAND · VOLUME BASIS — SIDE UNKNOWN"]);
  });
  it("on a delta basis the band is the pre-zone bar with the most same-side delta", () => {
    const sided = bars.map((b, i) => ({ ...b, delta: i === 1 ? 80 : 20 }));
    const d = selectQuestionLens({ ...input, absorption: anatomy(sided, { zones: [zone], basis: "SIGNED_DELTA" }) });
    expect(of(d, "BAND")).toEqual([{ kind: "BAND", time: 60, price: 98.8, price2: 99.8, time2: null, tone: "SIDE" }]);
    expect(of(d, "RING")[0].word).toBe("DECREASING BUYER EFFORT");
    expect(d.silences).toEqual([]);
  });
  it("every mark stands on an owner's bar", () => {
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
});

describe("EXHAUSTED? — ring on the extreme, the push origin, ✓/✗ per follow-through bar", () => {
  const bars = [bar(0, 97, 98, 97.5), bar(1, 99, 100, 99.8), bar(2, 100, 101, 100.8), bar(3, 101, 102, 101.9), bar(4, 102, 104, 103.5),
    bar(5, 103, 104.5, 103.2), bar(6, 102.5, 103.8, 103), bar(7, 98, 103, 98.5)];
  const ex: ExhaustionVM = { ...noEx, marks: [{ direction: "UP", time: 240, price: 104, pushBars: 4, pushStartTime: 60, pushEndTime: 240,
    followThroughTimes: [300, 360, 420], followBars: [{ time: 300, reach: 104.5, beyond: true }, { time: 360, reach: 103.8, beyond: false }, { time: 420, reach: 103, beyond: false }],
    originPrice: 99, effortFirstHalf: 0.8, effortSecondHalf: 0.4, aggressionLevel: 0.5, effortUnreportedBars: 0, extension: 5,
    followThrough: 1, energyTransfer: 1, exhausted: true }] };
  const input: QuestionLensInput = { absorption: anatomy(bars), exhaustion: ex, livingPoc: null, pivots: [], choice: "EXHAUSTION" };
  const v = selectQuestionLens(input);
  it("paints the plate's pieces", () => {
    expect(of(v, "RING")[0]).toMatchObject({ time: 240, price: 104 });
    expect(of(v, "LEVEL")[0]).toMatchObject({ time: 60, price: 99, time2: null, word: "PUSH ORIGIN" });
    expect(of(v, "OWED").map(m => m.time)).toEqual([300]);
    expect(of(v, "PAID").filter(m => m.item === "FOLLOW-THROUGH LOST").map(m => m.time)).toEqual([360, 420]);
    expect(of(v, "PAID").find(m => m.item === "STRUCTURE BREAK")).toMatchObject({ time: 420, price: 98.5 });
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
});

describe("CONTINUING? — UI-15: the leg, its extreme, the half-leg, the held higher low, the close above the prior high", () => {
  const upLeg = Array.from({ length: 11 }, (_, i) => bar(i + 10, 100 + i, 101 + i, 100.5 + i, 0.6));
  const pre = [bar(0, 98, 99, 98.5), bar(1, 99, 103, 102), bar(2, 97, 99, 98)];
  const bars = [...pre, ...upLeg];
  const pivots = [{ time: 60, price: 103, kind: "HIGH" as const }, { time: 120, price: 97, kind: "LOW" as const }, { time: 600, price: 100, kind: "LOW" as const }];
  const input: QuestionLensInput = { absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots, choice: "CONTINUATION" };
  const v = selectQuestionLens(input);
  it("the leg from origin to extreme, the extreme level, the half-leg level", () => {
    expect(of(v, "LEG")).toEqual([{ kind: "LEG", time: 600, price: 100, time2: 1200, price2: 111, tone: "ASKED" }]);
    const levels = of(v, "LEVEL");
    expect(levels.find(l => l.price === 111)).toMatchObject({ time: 1200, time2: null });
    expect(levels.find(l => l.word === "HALF-LEG")).toMatchObject({ price: 105.5, time: 600, time2: null });
  });
  it("HIGHER LOW HELD only because the prior low is lower and no close broke the origin", () => {
    expect(of(v, "RING").find(r => r.time === 600)?.word).toBe("HIGHER LOW HELD");
    const lower = selectQuestionLens({ ...input, pivots: [pivots[0], { time: 120, price: 101, kind: "LOW" }, pivots[2]] });
    expect(of(lower, "RING").find(r => r.time === 600)?.word).toBeUndefined();
  });
  it("the first close above the prior high is ringed and its level drawn to it", () => {
    const ring = of(v, "RING").find(r => r.word === "CLOSED ABOVE PRIOR HIGH");
    expect(ring).toMatchObject({ time: 780, price: 103.5 });
    expect(of(v, "LEVEL").find(l => l.price === 103)).toMatchObject({ time: 60, time2: 780 });
  });
  it("NEW EXTREME and PULLBACK SHALLOW are ✓ on their bars", () => {
    expect(of(v, "PAID").map(m => m.item)).toEqual(["NEW EXTREME", "PULLBACK SHALLOW"]);
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
});

describe("TRAP? — ring the swing, bracket the break bar, arrow back inside, ✓/✗ per item", () => {
  const pre = Array.from({ length: 6 }, (_, i) => bar(i, 100, 101, 100.5, 0.4));
  const high = { time: 120, price: 101, kind: "HIGH" as const };
  it("a poke that closes back inside: bracket, return arrow, ✓ on the paying bars", () => {
    const bars = [...pre, bar(6, 100.6, 101.6, 101.2, 0.9), bar(7, 100, 100.8, 100.4, 0.3), bar(8, 99.8, 100.4, 100.2, 0.2), bar(9, 99.6, 100.2, 100, 0.2)];
    const input: QuestionLensInput = { absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [high], choice: "TRAP" };
    const v = selectQuestionLens(input);
    expect(kinds(v)).toEqual(["RING", "BREAK_BAR", "ARROW", "PAID", "PAID"]);
    expect(of(v, "RING")[0]).toMatchObject({ time: 120, price: 101 });
    expect(of(v, "BREAK_BAR")[0]).toMatchObject({ time: 360, price: 101.6, price2: 101 });
    expect(of(v, "ARROW")[0]).toMatchObject({ time: 360, price: 101.6, time2: 420, price2: 100.4 });
    expect(of(v, "PAID").map(m => [m.item, m.time])).toEqual([["CLOSE BACK INSIDE", 420], ["FOLLOW-THROUGH FAILED", 540]]);
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
  it("an accepted break: no arrow; ✗ where it refused each item", () => {
    const bars = [...pre, bar(6, 100.8, 101.5, 101.4, 0.6), bar(7, 101.2, 102.8, 102.6, 0.7), bar(8, 102, 103.4, 103.2, 0.8), bar(9, 102.6, 104, 103.8, 0.8)];
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [high], choice: "TRAP" });
    expect(of(v, "ARROW")).toEqual([]);
    expect(of(v, "OWED").map(m => [m.item, m.time])).toEqual([["CLOSE BACK INSIDE", 540], ["NO ACCEPTANCE", 420], ["FOLLOW-THROUGH FAILED", 420]]);
  });
});

describe("HOLDING? — the level with a defense wedge per test", () => {
  it("two tests → two wedges under the support; ✓ at the rejection close", () => {
    const bars = [bar(0, 100, 100.8, 100.6), bar(1, 101, 101.8, 101.6), bar(2, 102, 102.8, 102.6), bar(3, 100.1, 100.9, 100.7), bar(4, 101, 101.9, 101.7),
      bar(5, 102, 102.9, 102.7), bar(6, 102.5, 103, 102.9), bar(7, 100.2, 101, 100.9), bar(8, 101.5, 102.4, 102.2), bar(9, 102.3, 103.2, 103)];
    const input: QuestionLensInput = { absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [{ time: 0, price: 100, kind: "LOW" }], choice: "HOLD" };
    const v = selectQuestionLens(input);
    expect(of(v, "RING")[0]).toMatchObject({ time: 0, price: 100 });
    expect(of(v, "DEFENSE").map(m => [m.time, m.price, m.dir])).toEqual([[180, 100.1, "UP"], [420, 100.2, "UP"]]);
    expect(of(v, "PAID")[0]).toMatchObject({ item: "REJECTED", time: 480 });
    expect(of(v, "OWED")).toEqual([]);
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
});

describe("WHAT CHANGED? — the window lit, each changed object outlined", () => {
  const quiet = Array.from({ length: 20 }, (_, i) => bar(i, 100, 100.5, 100.3));
  it("a quiet window: only the window, and the silence named", () => {
    const v = selectQuestionLens({ absorption: anatomy(quiet), exhaustion: noEx, livingPoc: null, pivots: [], choice: "WHAT_CHANGED" });
    expect(kinds(v)).toEqual(["WINDOW"]);
    expect(of(v, "WINDOW")[0]).toMatchObject({ time: 8 * 60, time2: null });
    expect(v.silences).toEqual(["NOTHING MOVED IN THE WINDOW"]);
  });
  it("a new swing ringed; a traded-through swing's level run to its break bar", () => {
    const bars = [...quiet.slice(0, 12), ...Array.from({ length: 8 }, (_, k) => bar(12 + k, 100 + k, 102.5 + k, 101 + k))];
    const input: QuestionLensInput = { absorption: anatomy(bars), exhaustion: noEx, livingPoc: null,
      pivots: [{ time: 60, price: 101, kind: "HIGH" }, { time: 14 * 60, price: 102, kind: "LOW" }], choice: "WHAT_CHANGED" };
    const v = selectQuestionLens(input);
    expect(of(v, "RING").map(r => r.time)).toEqual([840]);
    expect(of(v, "LEVEL")[0]).toMatchObject({ time: 60, price: 101, time2: 720, tone: "CHANGED" });
    expect(of(v, "BREAK_BAR")[0]).toMatchObject({ time: 720, price: 102.5, price2: 101 });
    expect(v.silences).toEqual([]);
    expect(anchoredOnOwners(v, input)).toEqual([]);
  });
});

describe("PERMISSION? — UI-07: one ✓ / ✗ per compiler item, on the ledger's event bar", () => {
  const bars = [bar(0, 100, 101, 100.5), bar(1, 100.5, 102, 101.5)];
  const permission = { rightOfWay: "WAIT", detail: "2 to resolve", debt: { payable: 5, resolved: 3, missingLabels: ["regime"], warnLabels: ["direction"] } };
  const ask = (eventBarTime: number | null) => selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [], choice: "PERMISSION",
    permission: { ...permission, eventBarTime } });
  it("the items stack on the event bar's high", () => {
    const v = ask(60);
    expect((v.marks ?? []).map(m => [m.kind, m.item, m.time, m.price])).toEqual([["PAID", "PAID", 60, 102], ["OWED", "REGIME", 60, 102], ["OWED", "DIRECTION", 60, 102]]);
  });
  it("no event bar, or one out of view → a named silence, no marks", () => {
    expect(ask(null).marks).toEqual([]);
    expect(ask(null).silences).toEqual(["NO EVIDENCE BAR · THE LEDGER NAMES NONE"]);
    expect(ask(999).silences).toEqual(["EVIDENCE BAR NOT IN VIEW"]);
  });
});

describe("no question → no marks", () => {
  it("inactive and refused lenses paint nothing on price", () => {
    expect(selectQuestionLens({ absorption: null, exhaustion: null, livingPoc: null, pivots: [] }).marks).toEqual([]);
    const refused = selectQuestionLens({ absorption: anatomy([bar(0, 1, 2, 1.5)]), exhaustion: noEx, livingPoc: null, pivots: [], choice: "TRAP" });
    expect(refused.refusal).not.toBeNull();
    expect(refused.marks).toEqual([]);
  });
});
