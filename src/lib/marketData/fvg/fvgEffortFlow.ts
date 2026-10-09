/**
 * FVG × EFFORT→RESPONSE and FVG × ORDER FLOW — the readings handed to
 * fvgRelationships (Garden 19 §13, §14 — 2026-10-09). PURE.
 *
 * This module classifies NOTHING itself. It asks the owners about the bars
 * the gap already names — the displacement bar b2 and the first bar of each
 * interaction the engine recorded — and hands their words on:
 *
 *   effort      readEffortResponseField (cells from effortEvidence.cellFor, the
 *               Response Matrix's one threshold set), words from
 *               effortResponseWords. Volume law from volumeTruthFor.
 *   order flow  readTapeSide (the one verdict on who took the aggressive
 *               volume) over that bar's signed volume, and barDeltaKeel's own
 *               failure-to-displace rule (readKeels) — never a second rule.
 *
 * AS-OF LAW. Each bar is ranked over the FVG_EFFORT_WINDOW closed bars ENDING
 * at that bar (medians), with ATR walked forward from at most
 * FVG_EFFORT_ATR_WARMUP bars before that window. Nothing after the bar is
 * read, so appending later bars can never change an earlier reading. This is
 * NOT the camera-ranked field drawn on the volume band (that one re-ranks on
 * pan); the Inspect row names the window.
 *
 * SILENCE. No traded volume (spot FX, spot metals, a placeholder feed) → the
 * effort input says so and carries no reading. No signed volume for a bar →
 * no order-flow reading for it. A bar the owner did not read gets no reading —
 * never a neighbour's.
 */

import { readKeels } from "@/lib/chart/barDeltaKeel";
import { atrSeries, effortResponseWords, readEffortResponseField, type FieldBar } from "@/lib/chart/effortResponseField";
import { needsTradedVolumeSentence, volumeTruthFor } from "@/lib/chart/volumeTruth";
import { readTapeSide } from "@/lib/marketData/tapeSideVerdict";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";

import type { FvgObject } from "./fvgEngine";
import type { AnchoredBarReading, EffortInput, FlowInput } from "./fvgRelationships";

export const FVG_EFFORT_WINDOW = 100;
export const FVG_EFFORT_ATR_WARMUP = 300;

/** The canonical bar's own fields (asOf = bar open, epoch ms) — no private bar here (M8). */
export type EffortFlowBar = Pick<CanonicalBar, "asOf" | "open" | "high" | "low" | "close" | "volume">;

type Obj = Pick<FvgObject, "bars" | "interactions" | "createdBarIndex">;
type Anchor = { readonly anchor: "DISPLACEMENT" | "TOUCH"; readonly episode: number | null; readonly i: number };

/**
 * The bars the gap names: b2, then the first bar of each interaction. The engine indexes its OWN
 * series (createdBarIndex = b3, startBarIndex = the touch bar); the caller's bars may start
 * elsewhere, so both are placed relative to b3's position in the caller's bars.
 */
function anchorsOf(o: Obj, bars: readonly EffortFlowBar[], indexByAsOf: ReadonlyMap<number, number>): Anchor[] {
  const i2 = indexByAsOf.get(o.bars.b2.asOf);
  const i3 = indexByAsOf.get(o.bars.b3.asOf);
  if (i2 === undefined) return [];
  const out: Anchor[] = [{ anchor: "DISPLACEMENT", episode: null, i: i2 }];
  if (i3 === undefined) return out;
  for (const it of o.interactions) {
    const i = i3 + (it.startBarIndex - o.createdBarIndex);
    if (i > i3 - 1 && i < bars.length) out.push({ anchor: "TOUCH", episode: it.episode, i });
  }
  return out;
}

const tuplesFor = (bars: readonly EffortFlowBar[], from: number, to: number): FieldBar[] =>
  bars.slice(from, to + 1).map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));

/** One series' index, built once per reader. */
export function effortFlowIndex(bars: readonly EffortFlowBar[]): ReadonlyMap<number, number> {
  const m = new Map<number, number>();
  bars.forEach((b, i) => m.set(b.asOf, i));
  return m;
}

/**
 * The effort→response readings for one gap from the CLOSED bars it was read on.
 * `volumeReal` lets a caller that already asked volumeTruth pass its verdict; otherwise it is asked here.
 */
export function fvgEffortInput(
  o: Obj,
  bars: readonly EffortFlowBar[],
  symbol: string,
  opts: { readonly index?: ReadonlyMap<number, number>; readonly volumeReal?: boolean; readonly volumeSilenceWhy?: string | null } = {},
): EffortInput {
  const truth = opts.volumeReal === undefined ? volumeTruthFor(symbol, bars) : null;
  const real = opts.volumeReal ?? truth!.real;
  if (!real) {
    // ONE clause for every room (Inspect, Scanner, Backtest, Journal): the volume owner's own short sentence for a
    // market with no central volume ("needs traded volume — spot FX has none"); a placeholder feed keeps its own reason.
    const why = opts.volumeSilenceWhy ?? needsTradedVolumeSentence(symbol) ?? (truth && !truth.real ? truth.title : null) ?? "this market reports no traded volume, so effort cannot be weighed";
    return { volumeReal: false, silenceWhy: why, windowBars: FVG_EFFORT_WINDOW, readings: [] };
  }
  const index = opts.index ?? effortFlowIndex(bars);
  const readings: AnchoredBarReading[] = [];
  let why: string | null = null;
  for (const a of anchorsOf(o, bars, index)) {
    const from = Math.max(0, a.i - (FVG_EFFORT_WINDOW - 1));
    const start = Math.max(0, from - FVG_EFFORT_ATR_WARMUP);
    const tuples = tuplesFor(bars, start, a.i);
    const field = readEffortResponseField(tuples, from - start, tuples.length - 1, { volumeReal: true });
    if (field.state !== "DRAWN") { why ??= field.why; continue; }
    const last = field.bars[field.bars.length - 1];
    // The cell of THAT bar; when the owner did not read it (no volume, ATR warming), no reading — never a neighbour's.
    if (!last || last.time !== tuples[tuples.length - 1].time) { why ??= "the field could not read that bar (no traded volume on it, or ATR still warming up)"; continue; }
    readings.push({ anchor: a.anchor, episode: a.episode, price: bars[a.i].close, state: last.cell, words: effortResponseWords(last) });
  }
  return { volumeReal: true, silenceWhy: readings.length ? null : why ?? "the gap's bars are not in the bars read", windowBars: FVG_EFFORT_WINDOW, readings };
}

/** One bar's signed volume as its owner holds it. */
export interface SignedBarVolume {
  readonly buy: number;
  readonly sell: number;
  readonly basis: "TAPE" | "SIDES";
  /** The tape cannot vouch for the whole bar (its first heard bar). */
  readonly partial?: boolean;
}

/**
 * The order-flow readings for one gap. `signedAt` answers for a bar's open time (epoch ms) from the
 * chart's own owners (captured tape first, the provider's bar sides second) or null. A reader that
 * holds only bars passes no `signedAt` and gets a SILENCE — candles are never read as order flow.
 */
export function fvgFlowInput(
  o: Obj,
  bars: readonly EffortFlowBar[],
  signedAt: ((asOfMs: number) => SignedBarVolume | null) | null | undefined,
  opts: { readonly index?: ReadonlyMap<number, number>; readonly silenceWhy?: string | null } = {},
): FlowInput {
  if (!signedAt) return { basis: null, silenceWhy: opts.silenceWhy ?? null, readings: [] };
  const index = opts.index ?? effortFlowIndex(bars);
  const readings: AnchoredBarReading[] = [];
  let basis: "TAPE" | "SIDES" | null = null;
  for (const a of anchorsOf(o, bars, index)) {
    const b = bars[a.i];
    const s = signedAt(b.asOf);
    if (!s) continue;
    const v = readTapeSide(s.buy, s.sell, true);
    if (v.side === "NO_TAPE") continue;
    const start = Math.max(0, a.i - FVG_EFFORT_ATR_WARMUP);
    const atr = atrSeries(tuplesFor(bars, start, a.i));
    const keel = readKeels([{ time: b.asOf / 1000, open: b.open, close: b.close, atr: atr[atr.length - 1], buy: s.buy, sell: s.sell, basis: s.basis }])[0];
    const share = v.side === "BUYERS" ? `buyers took ${v.buyPct}% of the bar's signed volume` : v.side === "SELLERS" ? `sellers took ${v.sellPct}% of the bar's signed volume` : `neither side took the larger share (buyers ${v.buyPct}% · sellers ${v.sellPct}%)`;
    readings.push({
      anchor: a.anchor, episode: a.episode, price: b.close, state: v.side,
      words: `${share}${keel?.failed ? " · the bar did not move that way (failed to displace)" : ""} · ${s.basis === "TAPE" ? `from captured signed prints${s.partial ? " (the tape began inside this bar)" : ""}` : "from the provider's per-bar bid / ask volume"}`,
      partial: s.partial === true,
      basis: s.basis,
    });
    // One basis word for the family: SIDES if any reading rests on the provider aggregate (the weaker word wins).
    basis = basis === "SIDES" || s.basis === "SIDES" ? "SIDES" : "TAPE";
  }
  return { basis: readings.length ? basis : null, silenceWhy: readings.length ? null : opts.silenceWhy ?? "no signed volume was captured for the gap's displacement or touch bars — candles are never read as order flow", readings };
}
