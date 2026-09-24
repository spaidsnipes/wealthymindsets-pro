/**
 * THE QUESTION LENS — one active question, asked of the camera itself.
 *
 * Child: QUESTION LENS (evidence question + measured debt + noise quieted).
 * Parent: F13 Semantic Zoom / Question Lenses; F16 Evidence Debt. Class:
 * LENS. House surface: /charts — "Questions reorganize emphasis without
 * routing away." Plates: the Founder's "IS BUYER EFFORT BEING ABSORBED?" and
 * "Question-Driven Mode" mockups (2026-09-24).
 *
 * The question machinery used to live on the Command Deck — a second market.
 * This compiles the question FROM THE CAMERA'S OWN READINGS, so asking it
 * never leaves the chart and never mints a second truth:
 *
 *   newest ABSORPTION zone  → "Is effort being absorbed at <zone>?"
 *   newest EXHAUSTION mark  → "Is this push exhausted at <price>?"
 *   (whichever ended later wins; none → no question, nothing quieted)
 *
 * Side is named ONLY on a delta basis: on VOLUME the tape never said who the
 * aggressor was, so the question says "effort", not "buyer effort".
 *
 * ── THE DEBT IS MEASURED, ITEM BY ITEM ─────────────────────────────────────
 *
 * Absorption question (the plate's own four "MISSING" rows):
 *   CLEAR DISPLACEMENT   — after the zone, price moved ≥ 2 median bar ranges
 *                          away from it.
 *   SUSTAINED AGGRESSION — effort after the zone stayed ≥ the zone's own
 *                          mean effort (the pressure did not vanish).
 *   STRUCTURE CONFIRMATION — a confirmed swing pivot formed after the zone,
 *                          at a price inside the zone band.
 *   VOLUME ACCEPTANCE    — the Living Profile's POC sits inside the zone band.
 * Exhaustion question:
 *   FOLLOW-THROUGH LOST  — paid when the exhaustion's FT reads 0/3.
 *   STRUCTURE BREAK      — a close back beyond the push's origin.
 *   AGGRESSION DECLINE   — paid when aggression < 75% (always true when the
 *                          mark exists; listed so the chain is complete).
 *
 * Unpaid items are the debt. Any debt → the lens says WAIT: "let the market
 * pay." No probability, no confidence bar — the plate's "confidence read"
 * is deliberately NOT built: nothing measures one.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";

export const QUESTION_LENS_VERSION = 1;
export const DISPLACEMENT_RANGES = 2;

export interface DebtItem {
  readonly label: string;
  readonly paid: boolean;
  /** The measured fact behind the verdict, in one line. */
  readonly evidence: string;
}

export interface QuestionLensVM {
  readonly version: number;
  readonly active: boolean;
  readonly kind: "ABSORPTION" | "EXHAUSTION" | null;
  readonly question: string | null;
  readonly focus: string | null;
  /** Price band the question is about (for the on-price band). */
  readonly bandLow: number | null;
  readonly bandHigh: number | null;
  readonly bandStart: number | null;
  readonly debt: readonly DebtItem[];
  readonly openDebt: number;
  /** "WAIT · LET THE MARKET PAY" while any item is unpaid. */
  readonly posture: string | null;
  /** The next question the plate asks, when the current one is answered. */
  readonly nextQuestion: string | null;
  /**
   * MOCK 3's "AGGRESSION vs DISPLACEMENT — who is in control?" pair, read
   * from the zone's own bars: mean effort and mean displacement (0..1 of the
   * window's peaks), and the verdict the plate prints under them. Absorption
   * questions only; null otherwise.
   */
  readonly control: {
    readonly aggression: number;
    readonly displacement: number;
    readonly verdict: "EFFORT ABSORBED" | "AGGRESSION PAID";
  } | null;
}

export interface QuestionLensInput {
  readonly absorption: AbsorptionAnatomyVM | null;
  readonly exhaustion: ExhaustionVM | null;
  /** Living Profile POC, when drawn. */
  readonly livingPoc: number | null;
  /** Confirmed structure pivots (time + price). */
  readonly pivots: readonly { readonly time: number; readonly price: number }[];
}

const NONE: QuestionLensVM = {
  version: QUESTION_LENS_VERSION, active: false, kind: null, question: null, focus: null,
  bandLow: null, bandHigh: null, bandStart: null, debt: [], openDebt: 0, posture: null, nextQuestion: null,
  control: null,
};

const f2 = (n: number) => n.toFixed(2);

export function selectQuestionLens(input: QuestionLensInput): QuestionLensVM {
  const a = input.absorption;
  const bars = a?.measured ? a.bars : [];
  if (bars.length === 0) return NONE;
  const zone = a!.zones.at(-1) ?? null;
  const ex = input.exhaustion?.marks.at(-1) ?? null;
  if (!zone && !ex) return NONE;

  const ranges = bars.map(b => b.high - b.low).filter(r => r > 0).sort((x, y) => x - y);
  const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;

  const useExhaustion = ex && (!zone || ex.time > zone.endTime);

  if (!useExhaustion && zone) {
    const after = bars.filter(b => b.time > zone.endTime);
    const inZone = bars.filter(b => b.time >= zone.startTime && b.time <= zone.endTime);
    const zoneEffort = inZone.length ? inZone.reduce((s, b) => s + b.effortNorm, 0) / inZone.length : 0;
    const afterEffort = after.length ? after.reduce((s, b) => s + b.effortNorm, 0) / after.length : 0;
    const farthest = after.reduce((m, b) => Math.max(m, b.high - zone.priceHi, zone.priceLo - b.low), 0);
    const displaced = med > 0 && farthest >= DISPLACEMENT_RANGES * med;
    const pivot = input.pivots.find(p => p.time > zone.endTime && p.price >= zone.priceLo && p.price <= zone.priceHi);
    const accepted = input.livingPoc != null && input.livingPoc >= zone.priceLo && input.livingPoc <= zone.priceHi;
    const delta = a!.basis === "SIGNED_DELTA" || a!.basis === "INFERRED_DELTA";
    const zDelta = inZone.reduce((s, b) => s + (b.delta ?? 0), 0);
    const who = delta ? (zDelta >= 0 ? "buyer effort" : "seller effort") : "effort";
    const debt: DebtItem[] = [
      { label: "CLEAR DISPLACEMENT", paid: displaced,
        evidence: after.length === 0 ? "no bars after the zone yet"
          : `farthest move away ${f2(farthest)} vs ${DISPLACEMENT_RANGES}× median range ${f2(DISPLACEMENT_RANGES * med)}` },
      { label: "SUSTAINED AGGRESSION", paid: after.length > 0 && afterEffort >= zoneEffort,
        evidence: after.length === 0 ? "no bars after the zone yet"
          : `effort after ${Math.round(afterEffort * 100)}% vs in zone ${Math.round(zoneEffort * 100)}%` },
      { label: "STRUCTURE CONFIRMATION", paid: !!pivot,
        evidence: pivot ? `swing confirmed at ${f2(pivot.price)} inside the zone` : "no confirmed swing inside the zone since it formed" },
      { label: "VOLUME ACCEPTANCE", paid: accepted,
        evidence: input.livingPoc == null ? "Living Profile not drawn — POC unknown"
          : accepted ? `Living POC ${f2(input.livingPoc)} inside the zone` : `Living POC ${f2(input.livingPoc)} outside the zone` },
    ];
    const open = debt.filter(d => !d.paid).length;
    return {
      version: QUESTION_LENS_VERSION,
      active: true,
      kind: "ABSORPTION",
      question: `Is ${who} being absorbed at ${f2(zone.priceLo)}–${f2(zone.priceHi)}?`,
      focus: `Absorption of ${who}${delta ? "" : " (volume basis — side unknown)"}`,
      bandLow: zone.priceLo,
      bandHigh: zone.priceHi,
      bandStart: zone.startTime,
      debt,
      openDebt: open,
      posture: open > 0 ? "WAIT · LET THE MARKET PAY" : "DEBT PAID · READ THE ANSWER",
      nextQuestion: "Is the opposite side's effort being rewarded?",
      control: (() => {
        const disp = inZone.length ? inZone.reduce((t, b) => t + b.displacementNorm, 0) / inZone.length : 0;
        return {
          aggression: zoneEffort,
          displacement: disp,
          // The anatomy owner's own weak-displacement gate (0.35).
          verdict: disp <= 0.35 ? "EFFORT ABSORBED" as const : "AGGRESSION PAID" as const,
        };
      })(),
    };
  }

  // EXHAUSTION question
  const m = ex!;
  const pushStartIdx = Math.max(0, bars.findIndex(b => b.time === m.time) - m.pushBars);
  const origin = m.direction === "UP" ? bars[pushStartIdx]?.low : bars[pushStartIdx]?.high;
  const after = bars.filter(b => b.time > m.time);
  const broke = origin != null && after.some(b => (m.direction === "UP" ? b.close < origin : b.close > origin));
  const debt: DebtItem[] = [
    { label: "FOLLOW-THROUGH LOST", paid: m.followThrough === 0,
      evidence: m.followThrough == null ? "fewer than 3 bars since the extreme" : `${m.followThrough}/3 bars made a new extreme` },
    { label: "AGGRESSION DECLINE", paid: m.aggressionLevel < 0.75,
      evidence: `second-half effort ${Math.round(m.aggressionLevel * 100)}% of first half` },
    { label: "STRUCTURE BREAK", paid: broke,
      evidence: origin == null ? "push origin unknown" : broke ? `closed back beyond the push origin ${f2(origin)}` : `no close back beyond the push origin ${f2(origin)}` },
  ];
  const open = debt.filter(d => !d.paid).length;
  return {
    version: QUESTION_LENS_VERSION,
    active: true,
    kind: "EXHAUSTION",
    question: `Is this ${m.direction === "UP" ? "up" : "down"}-push exhausted at ${f2(m.price)}?`,
    focus: "Exhaustion of the push",
    bandLow: m.price,
    bandHigh: m.price,
    bandStart: m.time,
    debt,
    openDebt: open,
    posture: open > 0 ? "WAIT · LET THE MARKET PAY" : "DEBT PAID · READ THE ANSWER",
    nextQuestion: m.direction === "UP" ? "Is seller effort now being rewarded?" : "Is buyer effort now being rewarded?",
    control: null,
  };
}

export default selectQuestionLens;
