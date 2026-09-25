/**
 * ANATOMY CARDS — the plate's two KEY METRICS columns, side by side.
 *
 * Child: ABSORPTION vs EXHAUSTION · KEY METRICS. Parent: F06 Order Flow ›
 * Effort → Response. Class: LENS on /charts. Plate: "ABSORPTION vs
 * EXHAUSTION — The Anatomy of Impact · The Cost of Mismanagement" (Founder,
 * 2026-09-24): an ABSORPTION ANATOMY card (effort level, displacement,
 * integrity, energy transfer + outcome) beside an EXHAUSTION ANATOMY card
 * (aggression level, extension, follow-through, energy transfer + outcome).
 *
 * The plate's "AGGRESSION LEVEL" is printed as EFFORT 2ND ÷ 1ST: the number
 * is the push's effort in its second half over its first, and effort here is
 * unsigned (bar volume, or |ask − bid|). Naming it aggression would claim an
 * initiating side the reading never measured.
 *
 * The on-candle marks already say WHERE each happened. These cards say HOW
 * MUCH, in the plate's own four-metric shape, for the newest reading of each
 * — and every number is read from the two owners already on the chart:
 * `selectAbsorptionAnatomy` (zones, per-bar effort/displacement) and
 * `selectExhaustion` (push metrics). Nothing is re-measured here.
 *
 * ── WHAT THE PLATE SHOWS AND IS NOT BUILT ──────────────────────────────────
 *
 * "STRUCTURAL INTEGRITY 96%" has no measurement behind it. Its slot carries
 * what IS measured about the zone holding: EFFICIENCY RATIO (effort per unit
 * displacement) with the anatomy owner's own STRONG / MODERATE / WEAK legend.
 * The plate's "1.7 cm" / "4.8 cm" are body metaphors; displacement and
 * extension are stated in the chart's own units — % of the window's largest
 * bar move, and multiples of the median bar range.
 *
 * A push that did not exhaust still gets a card, labelled NOT EXHAUSTED with
 * the conditions it met, so a near miss is shown honestly rather than hidden.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM } from "@/lib/marketData/selectAbsorptionAnatomy";
import { DECLINING_AT, EXTENDED_AT, FT_BARS, type ExhaustionVM } from "./selectExhaustion";

export const ANATOMY_CARDS_VERSION = 1;
/** Mirrors selectAbsorptionAnatomy's defaults: the thresholds a zone bar met. */
export const HIGH_EFFORT_AT = 0.6;
export const WEAK_DISPLACEMENT_AT = 0.35;

export interface AnatomyMetric {
  readonly label: string;
  readonly value: string;
  /** The plate's one-word reading under the number. */
  readonly word: string;
}

export interface AnatomyCard {
  readonly kind: "ABSORPTION" | "EXHAUSTION";
  readonly title: string;
  readonly subtitle: string;
  /** Null when the card has nothing to read — it says why instead. */
  readonly metrics: readonly AnatomyMetric[];
  readonly outcome: string;
  readonly outcomeNote: string;
  /** Where on the chart the reading sits (for the leader line). */
  readonly time: number | null;
  readonly price: number | null;
  readonly empty: string | null;
}

export interface AnatomyCardsVM {
  readonly version: number;
  readonly measured: boolean;
  readonly basis: AbsorptionAnatomyVM["basis"];
  readonly absorption: AnatomyCard;
  readonly exhaustion: AnatomyCard;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const ABS_HEAD = { kind: "ABSORPTION" as const, title: "ABSORPTION ANATOMY", subtitle: "HIGH EFFORT + WEAK DISPLACEMENT" };
const EX_HEAD = { kind: "EXHAUSTION" as const, title: "EXHAUSTION ANATOMY", subtitle: "DECLINING AGGRESSION + EXTENSION + LOSS OF FOLLOW-THROUGH" };

function emptyCard(head: typeof ABS_HEAD | typeof EX_HEAD, why: string): AnatomyCard {
  return { ...head, metrics: [], outcome: "", outcomeNote: "", time: null, price: null, empty: why };
}

export function selectAnatomyCards(
  anatomy: AbsorptionAnatomyVM | null | undefined,
  exhaustion: ExhaustionVM | null | undefined,
): AnatomyCardsVM {
  const basis = anatomy?.basis ?? "UNMEASURED";
  if (!anatomy || !anatomy.measured || basis === "UNMEASURED") {
    const why = "effort not measured on this feed";
    return {
      version: ANATOMY_CARDS_VERSION, measured: false, basis,
      absorption: emptyCard(ABS_HEAD, why), exhaustion: emptyCard(EX_HEAD, why),
    };
  }

  // ── ABSORPTION: the newest zone in the window ──
  const zone = anatomy.zones.at(-1) ?? null;
  let absorption: AnatomyCard;
  if (!zone) {
    absorption = emptyCard(ABS_HEAD, anatomy.zoneQualificationPossible === false
      ? "this window could not have produced a zone — one bar holds the effort"
      : "no run of bars held high effort against weak displacement");
  } else {
    const inZone = anatomy.bars.filter(b => b.time >= zone.startTime && b.time <= zone.endTime);
    const eff = mean(inZone.map(b => b.effortNorm));
    const disp = mean(inZone.map(b => b.displacementNorm));
    const transfer = eff > 0 ? disp / eff : 0;
    absorption = {
      ...ABS_HEAD,
      metrics: [
        { label: "EFFORT LEVEL", value: pct(eff), word: eff >= HIGH_EFFORT_AT ? "HIGH" : "MODERATE" },
        { label: "DISPLACEMENT", value: pct(disp), word: disp <= WEAK_DISPLACEMENT_AT ? "WEAK" : "MODERATE" },
        { label: "EFFICIENCY RATIO", value: zone.unbounded ? "∞" : zone.efficiencyRatio == null ? "—" : `${zone.efficiencyRatio.toFixed(1)}×`, word: zone.strength },
        { label: "ENERGY TRANSFER", value: pct(transfer), word: transfer < 0.5 ? "RETAINED" : "PARTIAL" },
      ],
      outcome: "ABSORBED",
      outcomeNote: `${zone.barCount} bars · ${zone.priceLo.toFixed(2)}–${zone.priceHi.toFixed(2)} · effort met, price held`,
      time: zone.endTime,
      price: (zone.priceLo + zone.priceHi) / 2,
      empty: null,
    };
  }

  // ── EXHAUSTION: the newest exhausted push, else the newest push as a near miss ──
  const mark = exhaustion?.marks.at(-1) ?? null;
  const push = mark ?? exhaustion?.latestPush ?? null;
  let ex: AnatomyCard;
  if (!exhaustion || !exhaustion.measured || !push) {
    ex = emptyCard(EX_HEAD, "no push of 4+ same-direction closes in the window");
  } else {
    const declining = push.aggressionLevel < DECLINING_AT;
    const extended = push.extension >= EXTENDED_AT;
    const lost = push.followThrough === 0;
    const met = [declining, extended, lost].filter(Boolean).length;
    ex = {
      ...EX_HEAD,
      metrics: [
        { label: "EFFORT 2ND ÷ 1ST", value: pct(push.aggressionLevel), word: declining ? "DECLINING" : "HELD" },
        { label: "EXTENSION", value: `${push.extension.toFixed(1)}×`, word: extended ? "EXTENDED" : "CONTAINED" },
        { label: "FOLLOW-THROUGH", value: push.followThrough == null ? "—" : `${push.followThrough}/${FT_BARS}`, word: push.followThrough == null ? "PENDING" : lost ? "LOST" : "HELD" },
        { label: "ENERGY TRANSFER", value: push.energyTransfer == null ? "—" : pct(push.energyTransfer), word: push.energyTransfer == null ? "UNKNOWN" : push.energyTransfer < 1 ? "INEFFICIENT" : "EFFICIENT" },
      ],
      outcome: push.exhausted ? "EXHAUSTED" : `NOT EXHAUSTED · ${met} OF 3`,
      outcomeNote: `${push.direction === "UP" ? "up" : "down"}-push of ${push.pushBars} bars · extreme ${push.price.toFixed(2)}`,
      time: push.time,
      price: push.price,
      empty: null,
    };
  }

  return { version: ANATOMY_CARDS_VERSION, measured: true, basis, absorption, exhaustion: ex };
}

export default selectAnatomyCards;
