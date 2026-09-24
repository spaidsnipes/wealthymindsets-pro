/**
 * MARKET STRUCTURE on the canvas — H-704.
 *
 * P-110's #2 organism: STRUCTURE — the swing sequence a trader reads to know
 * if higher highs are printing higher, whether the last high got taken out,
 * and where the last confirmed low is. `selectMarketStructure` already
 * publishes every one of those prices, and the chart draws none of them.
 *
 * The compiler owns the refusals; this glass reshapes its output into the
 * shape a canvas paints:
 *
 *   · one MARK per confirmed pivot, priced at the pivot itself
 *   · a LAST-CONFIRMED pair (highest recent HH, lowest recent LL) picked
 *     for the strongest annotation
 *   · a BIAS word (HIGHER_HIGHS / LOWER_LOWS / RANGE / UNCLEAR) and its note
 *   · a stated UNCONFIRMED count — the newest bars a pivot cannot yet claim.
 *
 * PURE. No React, no canvas, no clock.
 */

import type { MarketStructureVM, StructurePoint, StructureBias } from "./selectMarketStructure";

export type StructurePivotKind = "HIGH" | "LOW";

export interface StructurePivotMark {
  readonly kind: StructurePivotKind;
  readonly time: number;
  readonly price: number;
  /** True for the most recent confirmed pivot of this kind. */
  readonly isLast: boolean;
}

export type MarketStructureGlass =
  | {
      readonly drawn: true;
      readonly reason: string;
      readonly pivots: readonly StructurePivotMark[];
      readonly lastHigh: StructurePoint | null;
      readonly lastLow: StructurePoint | null;
      readonly bias: StructureBias;
      readonly biasNote: string;
      readonly unconfirmedBars: number;
      readonly confirmationLagNote: string;
    }
  | {
      readonly drawn: false;
      readonly reason: string;
      readonly pivots: readonly [];
      readonly lastHigh: null;
      readonly lastLow: null;
      readonly bias: "UNCLEAR";
      readonly biasNote: string;
      readonly unconfirmedBars: number;
      readonly confirmationLagNote: string;
    };

/**
 * A window can produce dozens of pivots. Two dozen ticks on the axis is
 * annotation; a hundred is texture. Cap the strongest recent pivots — a
 * trader wants the levels the market recently defended, not every pivot on
 * screen.
 */
export const MAX_STRUCTURE_PIVOTS = 12;

const refuse = (vm: MarketStructureVM | null | undefined, reason: string): MarketStructureGlass => ({
  drawn: false,
  reason,
  pivots: [],
  lastHigh: null,
  lastLow: null,
  bias: "UNCLEAR",
  biasNote: vm?.biasNote ?? "",
  unconfirmedBars: vm?.unconfirmedBars ?? 0,
  confirmationLagNote: vm?.confirmationLagNote ?? "",
});

export function selectMarketStructureGlass(
  vm: MarketStructureVM | null | undefined,
): MarketStructureGlass {
  if (!vm) return refuse(null, "NO_READING");
  if (!vm.measured) return refuse(vm, vm.insufficientNote ? "INSUFFICIENT" : "UNMEASURED");

  const highs = [...vm.swingHighs];
  const lows = [...vm.swingLows];

  if (highs.length === 0 && lows.length === 0) return refuse(vm, "NO_PIVOTS");

  const lastHigh = vm.lastSwingHigh;
  const lastLow = vm.lastSwingLow;

  const pivots: StructurePivotMark[] = [];
  for (const p of highs) {
    pivots.push({
      kind: "HIGH", time: p.time, price: p.price,
      isLast: !!lastHigh && p.time === lastHigh.time && p.price === lastHigh.price,
    });
  }
  for (const p of lows) {
    pivots.push({
      kind: "LOW", time: p.time, price: p.price,
      isLast: !!lastLow && p.time === lastLow.time && p.price === lastLow.price,
    });
  }

  // Newest first, then cap. Sorting by time keeps recency; the cap keeps the
  // canvas from becoming texture.
  const capped = pivots
    .sort((a, b) => b.time - a.time)
    .slice(0, MAX_STRUCTURE_PIVOTS);

  return {
    drawn: true,
    reason: "DRAWN",
    pivots: capped,
    lastHigh,
    lastLow,
    bias: vm.bias,
    biasNote: vm.biasNote,
    unconfirmedBars: vm.unconfirmedBars,
    confirmationLagNote: vm.confirmationLagNote,
  };
}

export default selectMarketStructureGlass;
