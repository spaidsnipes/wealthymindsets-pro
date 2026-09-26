/**
 * SCAFFOLDING DEPTH — the same read at three levels of hand-holding.
 *
 * Child: SCAFFOLDING LEVELS (Foundation → Intermediate → Advanced/Pro).
 * Parent: Academy › Scaffolding Removal Path; chart scaffolding. Class: LENS
 * on /charts. Plate: the Founder's "SAME SKILL. DEEPER MASTERY. LESS
 * HAND-HOLDING." mockup (2026-09-24).
 *
 * THE TRUTH DOES NOT CHANGE — ONLY THE SCAFFOLDING DOES. All three depths are
 * compiled from ONE reading of the camera, in one call:
 *
 *   FOUNDATION   — six steps, each with its measured verdict and the fact
 *                  behind it.
 *   INTERMEDIATE — the same six compressed to three dynamics (EFFORT,
 *                  RESULT, LOCATION) and one posture.
 *   PRO          — geometry only: the effort curve against the result curve
 *                  over the window, and result-per-effort as a plain ratio.
 *                  The window's own bars and its per-segment conversion are
 *                  carried so the glass can draw that geometry ON THE REAL
 *                  CANDLES (scaffoldingGlass.ts) instead of on a toy chart.
 *
 * Every verdict reads an owner that already exists — `selectMarketStructure`
 * (bias, swings), `selectAbsorptionAnatomy` (effort, displacement, zones),
 * `selectExhaustion` (pushes). Nothing here re-measures the market.
 *
 * ── WHAT THE PLATE ASKS FOR AND IS REFUSED ─────────────────────────────────
 *
 * Step 6 on the plate is "CAUTION / PROBABILITY — assign probability", and the
 * Pro card shows "EFFICIENCY RATIO 62% ★★★★★". Nothing measures a probability
 * and nothing measures stars, so neither is built. Step 6 is CAUTION ·
 * EVIDENCE: the flags that fired, counted. The Pro ratio is result share ÷
 * effort share over the window's second half — a ratio, printed as one.
 *
 * "HTF RESISTANCE" becomes LOCATION: the nearest confirmed swing on THIS
 * timeframe. No higher timeframe is read here, so none is claimed.
 *
 * Side ("buyers", "sellers") is named only on a delta basis. On VOLUME the
 * tape never said who the aggressor was.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM, AnatomyBar } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";
import type { MarketStructureVM } from "./selectMarketStructure";

export const SCAFFOLDING_VERSION = 1;
export const SCAFFOLDING_WINDOW = 20;
/** Within this many median bar ranges of a swing = "at" it. */
export const NEAR_RANGES = 2;
/** Recent-half vs earlier-half change that counts as rising / fading. */
export const CHANGE_AT = 0.15;
/** PRO: the window is read in segments of this many bars (the plate's cells). */
export const SEGMENT_BARS = 4;

export type ScaffoldingDepth = "FOUNDATION" | "INTERMEDIATE" | "PRO";
export const SCAFFOLDING_DEPTHS: readonly ScaffoldingDepth[] = ["FOUNDATION", "INTERMEDIATE", "PRO"];

export type Trend = "UP" | "DOWN" | "FLAT";

export interface ScaffoldStep {
  readonly n: number;
  readonly title: string;
  readonly task: string;
  /** The short verdict chip. */
  readonly verdict: string;
  /** The measured fact behind the verdict. */
  readonly evidence: string;
}

export interface ScaffoldDynamic {
  readonly label: string;
  readonly trend: Trend;
  readonly line: string;
}

export type Conversion = "CONVERTING" | "EVEN" | "NOT CONVERTING";

/** PRO: a run of SEGMENT_BARS window bars and whether its effort was paid for. */
export interface ScaffoldSegment {
  /** Inclusive indices into `window`. */
  readonly from: number;
  readonly to: number;
  /** Share of the window's effort / result that traded in this segment. */
  readonly effortShare: number;
  readonly resultShare: number;
  /** resultShare ÷ effortShare against CHANGE_AT — the window ratio's own rule, per segment. Null with no effort. */
  readonly conversion: Conversion | null;
}

export interface ScaffoldingReadVM {
  readonly version: number;
  readonly measured: boolean;
  readonly reason: "MEASURED" | "UNMEASURED_EFFORT" | "TOO_FEW_BARS";
  readonly basis: AbsorptionAnatomyVM["basis"];
  readonly steps: readonly ScaffoldStep[];
  readonly conclusion: string;
  readonly dynamics: readonly ScaffoldDynamic[];
  readonly caution: boolean;
  readonly cautionFlags: readonly string[];
  readonly posture: string;
  /** PRO: cumulative shares 0..1 over the window, one point per bar. */
  readonly effortCurve: readonly number[];
  readonly resultCurve: readonly number[];
  /** Result share ÷ effort share over the window's second half. Null when effort is zero. */
  readonly resultPerEffort: number | null;
  readonly conversion: Conversion | null;
  /** The nearest swing above and below the last close, for the geometry's ceiling/floor. */
  readonly swingAbove: number | null;
  readonly swingBelow: number | null;
  /** The bar each of those swings was confirmed on (its pivot), for the □ mark on price. */
  readonly swingAboveTime: number | null;
  readonly swingBelowTime: number | null;
  /** Whether each was a swing HIGH or a swing LOW — which side of its bar the □ sits. */
  readonly swingAboveKind: "HIGH" | "LOW" | null;
  readonly swingBelowKind: "HIGH" | "LOW" | null;
  /**
   * The level the recent half is PUSHING INTO — the plate's resistance rule:
   * the swing above when the recent half travelled up, the swing below when
   * it travelled down. Null when price did not travel or nothing is
   * confirmed on that side. Named by kind ("SWING ABOVE"), never "HTF".
   */
  readonly pushingInto: "SWING ABOVE" | "SWING BELOW" | null;
  /**
   * PRO: the read window's bars, oldest first — the anatomy's OWN bars (no
   * second bar shape, M8), so the glass maps them with the chart's own
   * transforms — and its segments.
   */
  readonly window: readonly AnatomyBar[];
  readonly segments: readonly ScaffoldSegment[];
}

export interface ScaffoldingInput {
  readonly structure: MarketStructureVM | null;
  readonly absorption: AbsorptionAnatomyVM | null;
  readonly exhaustion: ExhaustionVM | null;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f2 = (n: number) => n.toFixed(2);
const change = (recent: number, earlier: number): Trend =>
  earlier <= 0 ? (recent > 0 ? "UP" : "FLAT")
  : recent > earlier * (1 + CHANGE_AT) ? "UP"
  : recent < earlier * (1 - CHANGE_AT) ? "DOWN"
  : "FLAT";
const pct = (recent: number, earlier: number) =>
  earlier > 0 ? `${recent >= earlier ? "+" : ""}${Math.round((recent / earlier - 1) * 100)}%` : "n/a";

function empty(reason: ScaffoldingReadVM["reason"], basis: ScaffoldingReadVM["basis"]): ScaffoldingReadVM {
  return {
    version: SCAFFOLDING_VERSION, measured: false, reason, basis, steps: [], conclusion: "", dynamics: [],
    caution: false, cautionFlags: [], posture: "", effortCurve: [], resultCurve: [], resultPerEffort: null,
    conversion: null, swingAbove: null, swingBelow: null, swingAboveTime: null, swingBelowTime: null,
    swingAboveKind: null, swingBelowKind: null, pushingInto: null, window: [], segments: [],
  };
}

export function selectScaffoldingRead(input: ScaffoldingInput): ScaffoldingReadVM {
  const a = input.absorption;
  const basis = a?.basis ?? "UNMEASURED";
  if (!a || !a.measured || basis === "UNMEASURED") return empty("UNMEASURED_EFFORT", basis);
  const bars = a.bars.slice(-SCAFFOLDING_WINDOW);
  if (bars.length < 6) return empty("TOO_FEW_BARS", basis);

  const half = Math.floor(bars.length / 2);
  const earlier = bars.slice(0, half);
  const recent = bars.slice(bars.length - half);
  const ranges = a.bars.map(b => b.high - b.low).filter(r => r > 0).sort((x, y) => x - y);
  const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
  const last = bars[bars.length - 1];
  const delta = basis === "SIGNED_DELTA" || basis === "INFERRED_DELTA";

  // 1 · STRUCTURE BIAS
  const s = input.structure;
  const biasVerdict = !s || !s.measured ? "NOT READABLE"
    : s.bias === "HIGHER_HIGHS" ? "HIGHER HIGHS & LOWS"
    : s.bias === "LOWER_LOWS" ? "LOWER HIGHS & LOWS"
    : "MIXED · RANGE";
  const biasEvidence = !s || !s.measured ? (s?.insufficientNote ?? "Market Structure not drawn") : s.biasNote;

  // 2 · EFFORT
  const effE = mean(earlier.map(b => b.effortNorm));
  const effR = mean(recent.map(b => b.effortNorm));
  const effortTrend = change(effR, effE);
  const netDelta = recent.reduce((t, b) => t + (b.delta ?? 0), 0);
  const side = delta ? (netDelta > 0 ? "BUYERS" : netDelta < 0 ? "SELLERS" : null) : null;
  const effortVerdict = side
    ? `${side} OUT-TRADING`
    : `EFFORT ${effortTrend === "UP" ? "RISING" : effortTrend === "DOWN" ? "FADING" : "STEADY"}`;
  const effortEvidence = `recent-half effort ${pct(effR, effE)} vs earlier half` +
    (delta ? ` · net delta ${netDelta >= 0 ? "+" : ""}${Math.round(netDelta)}` : " · volume basis — side unknown");

  // 3 · RESULT / DISPLACEMENT
  const dispE = mean(earlier.map(b => b.displacementNorm));
  const dispR = mean(recent.map(b => b.displacementNorm));
  const resultTrend = change(dispR, dispE);
  const travel = last.close - recent[0].open;
  const travelRanges = med > 0 ? travel / med : 0;
  const resultVerdict = resultTrend === "UP" ? "DISPLACEMENT EXPANDING"
    : resultTrend === "DOWN" ? "DISPLACEMENT SLOWING" : "DISPLACEMENT STEADY";
  const resultEvidence = `per-bar travel ${pct(dispR, dispE)} · recent half moved ${travelRanges >= 0 ? "+" : ""}${travelRanges.toFixed(1)} median ranges`;

  // 4 · LOCATION — nearest confirmed swing on THIS timeframe
  const highs = s?.measured ? s.swingHighs : [];
  const lows = s?.measured ? s.swingLows : [];
  const abovePt = [...highs, ...lows].filter(p => p.price >= last.close).sort((x, y) => x.price - y.price)[0] ?? null;
  const belowPt = [...highs, ...lows].filter(p => p.price < last.close).sort((x, y) => y.price - x.price)[0] ?? null;
  const above = abovePt?.price ?? null;
  const below = belowPt?.price ?? null;
  const dAbove = above != null && med > 0 ? (above - last.close) / med : null;
  const dBelow = below != null && med > 0 ? (last.close - below) / med : null;
  const nearAbove = dAbove != null && dAbove <= NEAR_RANGES;
  const nearBelow = dBelow != null && dBelow <= NEAR_RANGES;
  const locationVerdict = nearAbove ? "AT A SWING ABOVE" : nearBelow ? "AT A SWING BELOW"
    : above == null && below == null ? "NO CONFIRMED SWING" : "BETWEEN SWINGS";
  const locationEvidence = [
    above != null ? `above ${f2(above)} (${dAbove!.toFixed(1)} ranges)` : "nothing confirmed above",
    below != null ? `below ${f2(below)} (${dBelow!.toFixed(1)} ranges)` : "nothing confirmed below",
  ].join(" · ");

  // 5 · ORDER-FLOW CONTEXT
  const windowStart = bars[0].time;
  const zone = a.zones.filter(z => z.endTime >= windowStart).at(-1) ?? null;
  const ex = input.exhaustion?.marks.filter(m => m.time >= windowStart).at(-1) ?? null;
  const flowParts: string[] = [];
  if (zone) flowParts.push(`${zone.strength} ABSORPTION`);
  if (ex) flowParts.push(`${ex.direction}-PUSH EXHAUSTED`);
  const flowVerdict = flowParts.length ? flowParts.join(" · ") : "NOTHING MATERIAL";
  const flowEvidence = [
    zone ? `zone ${f2(zone.priceLo)}–${f2(zone.priceHi)}${zone.efficiencyRatio != null ? `, effort/displacement ${zone.efficiencyRatio.toFixed(1)}×` : ", zero displacement"}` : "no absorption zone in the window",
    ex ? `exhaustion at ${f2(ex.price)}, follow-through ${ex.followThrough}/3` : "no exhausted push in the window",
  ].join(" · ");

  // 6 · CAUTION · EVIDENCE — flags counted, never a probability
  const flags: string[] = [];
  if (effortTrend === "UP" && resultTrend !== "UP") flags.push("effort rising without result");
  if (nearAbove && travel > 0) flags.push("pushing into a swing above");
  if (nearBelow && travel < 0) flags.push("pushing into a swing below");
  if (zone) flags.push("absorption in the window");
  if (ex) flags.push("exhausted push in the window");
  const caution = flags.length > 0;

  const steps: ScaffoldStep[] = [
    { n: 1, title: "MARKET STRUCTURE BIAS", task: "Read the swing sequence on this timeframe", verdict: biasVerdict, evidence: biasEvidence },
    { n: 2, title: delta ? "BUYER / SELLER EFFORT" : "EFFORT", task: "Compare recent effort with earlier effort", verdict: effortVerdict, evidence: effortEvidence },
    { n: 3, title: "RESULT / DISPLACEMENT", task: "Measure how far that effort moved price", verdict: resultVerdict, evidence: resultEvidence },
    { n: 4, title: "LOCATION", task: "Find the nearest confirmed swing", verdict: locationVerdict, evidence: locationEvidence },
    { n: 5, title: "ORDER-FLOW CONTEXT", task: "Look for absorption and exhaustion", verdict: flowVerdict, evidence: flowEvidence },
    { n: 6, title: "CAUTION · EVIDENCE", task: "Count the flags — no probability is assigned", verdict: caution ? `CAUTION · ${flags.length} FLAG${flags.length > 1 ? "S" : ""}` : "NO FLAG", evidence: caution ? flags.join(" · ") : "no flag fired in the window" },
  ];

  const who = side === "BUYERS" ? "BUYER EFFORT" : side === "SELLERS" ? "SELLER EFFORT" : "EFFORT";
  const dynamics: ScaffoldDynamic[] = [
    { label: who, trend: effortTrend, line: effortTrend === "UP" ? "effort increasing" : effortTrend === "DOWN" ? "effort fading" : "effort steady" },
    { label: "RESULT", trend: resultTrend, line: resultTrend === "UP" ? "displacement expanding" : resultTrend === "DOWN" ? "displacement slowing" : "displacement steady" },
    { label: "LOCATION", trend: "FLAT", line: nearAbove ? "a confirmed swing close above" : nearBelow ? "a confirmed swing close below" : "clear of confirmed swings" },
  ];

  // PRO geometry — cumulative shares, 0→1, one point per bar.
  const effTot = bars.reduce((t, b) => t + b.effortNorm, 0);
  const dispTot = bars.reduce((t, b) => t + b.displacementNorm, 0);
  let ce = 0, cd = 0;
  const effortCurve: number[] = [];
  const resultCurve: number[] = [];
  for (const b of bars) {
    ce += b.effortNorm; cd += b.displacementNorm;
    effortCurve.push(effTot > 0 ? ce / effTot : 0);
    resultCurve.push(dispTot > 0 ? cd / dispTot : 0);
  }
  const effShare = effTot > 0 ? recent.reduce((t, b) => t + b.effortNorm, 0) / effTot : 0;
  const dispShare = dispTot > 0 ? recent.reduce((t, b) => t + b.displacementNorm, 0) / dispTot : 0;
  const resultPerEffort = effShare > 0 ? dispShare / effShare : null;
  const convert = (ratio: number | null): Conversion | null => ratio == null ? null
    : ratio < 1 - CHANGE_AT ? "NOT CONVERTING"
    : ratio > 1 + CHANGE_AT ? "CONVERTING" : "EVEN";
  const conversion = convert(resultPerEffort);
  // The same ratio, segment by segment, oldest first — the plate's cells.
  const segments: ScaffoldSegment[] = [];
  for (let from = 0; from < bars.length; from += SEGMENT_BARS) {
    const to = Math.min(bars.length - 1, from + SEGMENT_BARS - 1);
    const seg = bars.slice(from, to + 1);
    const es = effTot > 0 ? seg.reduce((t, b) => t + b.effortNorm, 0) / effTot : 0;
    const rs = dispTot > 0 ? seg.reduce((t, b) => t + b.displacementNorm, 0) / dispTot : 0;
    segments.push({ from, to, effortShare: es, resultShare: rs, conversion: convert(es > 0 ? rs / es : null) });
  }

  return {
    version: SCAFFOLDING_VERSION,
    measured: true,
    reason: "MEASURED",
    basis,
    steps,
    conclusion: caution ? "APPROACH WITH CAUTION. WAIT FOR CONFIRMATION OR REJECTION." : "NOTHING FLAGGED. THE READ IS STILL YOURS.",
    dynamics,
    caution,
    cautionFlags: flags,
    posture: caution ? "CAUTION" : "CLEAR",
    effortCurve,
    resultCurve,
    resultPerEffort,
    conversion,
    swingAbove: above,
    swingBelow: below,
    swingAboveTime: abovePt?.time ?? null,
    swingBelowTime: belowPt?.time ?? null,
    swingAboveKind: abovePt ? (highs.includes(abovePt) ? "HIGH" : "LOW") : null,
    swingBelowKind: belowPt ? (highs.includes(belowPt) ? "HIGH" : "LOW") : null,
    pushingInto: travel > 0 && above != null ? "SWING ABOVE" : travel < 0 && below != null ? "SWING BELOW" : null,
    window: bars,
    segments,
  };
}

export default selectScaffoldingRead;
