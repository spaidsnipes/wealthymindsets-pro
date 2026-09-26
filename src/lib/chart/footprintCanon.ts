/**
 * FOOTPRINT CANON — the six per-candle order-flow modes (Tools › Order flow ›
 * "ON EACH CANDLE · FOOTPRINT"), drawn the way the canon plates draw them.
 *
 * Found on serving (BTC-USD 1m, NEAR, live Coinbase tape, 2026-09-25 14:17
 * CDT): every mode was a stack of boxes — a solid delta chip over each column
 * that read "0" while the delta under the same bar read "−0.05", ratio chips,
 * "AGG BUYS 0.67" pills, two-number summaries, and Big Trades as rings with
 * SEPARATE rectangular tickets that overlapped each other and the candles.
 * The Founder: "I STILL HAVE ALOT OF JUST CARDS, NOT THE ACTUAL DESIGNS".
 *
 * ── THE GEOMETRY, WRITTEN DOWN BEFORE THE CODE ─────────────────────────────
 *
 *   BID × ASK (M46 footprint absorption). One column per bar, the candle's
 *     body width, high → low. One cell per price row that TRADED, 1px dark
 *     gutter between cells (a grid, not a slab); an untraded row is blank.
 *     Tint = the dominant side's ink, stronger with dominance and volume.
 *     Text is "bid × ask" centred, only when it FITS the cell
 *     (`fitBidAskCellText`), else the tight "bid×ask", else the dominant
 *     number, else nothing — never two numbers colliding. Gold POC border.
 *     The bar's delta, when shown above the column, is halo text in the
 *     delta ink (no box), read from `barTapeDelta` — the SAME owner the NEAR
 *     volume-band delta row reads, so the two can never disagree again.
 *
 *   DELTA BUBBLES (Founder-preserved Nectar plate). No cells and no chips:
 *     the trail alone — one aggressor-coloured bubble per price zone riding
 *     the price path, the zone's real heaviest price written inside.
 *
 *   VOLUME PROFILE. A per-candle horizontal histogram: each traded row is a
 *     bar growing right from the column's left edge, length ∝ the row's
 *     volume against the bar's heaviest row (`vpBarWidth`, the VP owner), its
 *     buy share and sell share split by `vpBarSplit`; the POC row in the
 *     profile family's POC ink. Numbers only at NEAR and only where the row
 *     is tall enough and the number fits before the next column.
 *
 *   IMBALANCE. Tint + edge mark on each imbalanced row (a 3px mark on the
 *     dominant side's edge: ask/buy → right, bid/sell → left). "Imbalanced"
 *     is the stacked-imbalance owner's 3:1 and its weight floor, never a
 *     private 2.5× and never a one-sided row of dust. Ratio WORDS only for a
 *     run of ≥ MIN_STACK_LEVELS adjacent rows leaning one way: a bracket on
 *     that edge and the run's weakest ratio in `formatImbalanceRatio`'s words.
 *
 *   AGG/PASSIVE PROXY (the same Nectar trail). One ring per zone for the
 *     side that initiated more there: SOLID when it traded inside the bar,
 *     DASHED when it traded into the bar's own extreme fifth (buys into the
 *     high, sells into the low — location only, never a claim about who
 *     defended). Price inside. No pills, no 2×2 grid.
 *
 *   BIG TRADES (F07A · G04 · F06/H-701 · F07B). Luminous GOLD bubbles at the
 *     execution's own time and price, AREA ∝ size (bubbleDrawGeometry), with
 *     SIZE / TIME / ↑PRICE written INSIDE the disc — only the lines that fit
 *     the chord (`fitBubbleInscription`). A dashed RESPONSE PATH runs from
 *     the print through the closes of the next RESPONSE_BARS CLOSED bars
 *     (selectPrintResponse's own rule) — before those bars exist, no path.
 *     AT MOST ONE gold leader callout (G04) for the dominant print, in
 *     percentile language against the session's captured prints, placed
 *     through the keep-out owner. No other tickets: the rest lives in Inspect.
 *     F07B (2026-09-26): discs that touch on the screen MERGE into one
 *     cluster disc (clusterBigTrades — area = Σ areas, size-weighted
 *     centre, "TOTAL ×n" + the anchor's price inside), so no two discs on
 *     the glass ever overprint; only a disc — never a member — takes the
 *     callout, and every member stays selectable in Inspect.
 *
 * PURE. DETERMINISTIC. No canvas: text width arrives as a `measure` callback.
 */

import { describeBubbleClaim, formatBubbleExact } from "@/lib/bubbleClaim";
import type { AggressorMethod } from "@/lib/marketData/marketEvent";
import { formatImbalanceRatio } from "@/lib/marketData/formatImbalanceRatio";
import {
  IMBALANCE_RATIO_PCT,
  MIN_LEVEL_SHARE,
  MIN_STACK_LEVELS,
} from "@/lib/marketData/viewModels/selectStackedImbalance";
import { MIN_PRINTS_FOR_PERCENTILE } from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
import { selectPrintResponse, type ResponseBar } from "@/lib/marketData/viewModels/selectPrintResponse";
import type { ScreenRect } from "@/lib/chartKeepOut";
import { vpBarSplit, vpBarWidth } from "@/lib/vpDrawGeometry";

export const FOOTPRINT_CANON_VERSION = 1;

/** Aggressor convention is codebase-wide: ask = buyer-initiated, bid = seller-initiated. */
export interface TapeSideRow {
  readonly bid: number;
  readonly ask: number;
}

const pos = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/* ═══ ONE OWNER OF A BAR'S TAPE DELTA ══════════════════════════════════════ */

export interface BarTapeDelta {
  readonly buy: number;
  readonly sell: number;
  /** buy − sell. */
  readonly delta: number;
}

/**
 * A bar's delta from its captured tape rows. Null when nothing was heard —
 * silence is not a zero. The Bid × Ask column's delta and the NEAR volume-band
 * delta row both read THIS, so one bar can never say "0" in one place and
 * "−0.05" in another (serving, 2026-09-25: the chip formatted a negative delta
 * through a volume formatter that maps every v ≤ 0 to "0").
 */
export function barTapeDelta(rows: readonly TapeSideRow[] | null | undefined): BarTapeDelta | null {
  if (!rows) return null;
  let buy = 0, sell = 0;
  for (const r of rows) { buy += pos(r.ask); sell += pos(r.bid); }
  if (!(buy + sell > 0)) return null;
  return { buy, sell, delta: buy - sell };
}

/** A signed flow in the chart's volume words: "+1.2k", "−0.05", "0". */
export function signedFlowText(delta: number, fmt: (v: number) => string): string {
  if (!Number.isFinite(delta)) return "—";
  if (delta === 0) return "0";
  return `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))}`;
}

/* ═══ BID × ASK CELL TEXT ══════════════════════════════════════════════════ */

export type CellTextForm = "PAIR" | "PAIR_TIGHT" | "DOMINANT" | "NONE";

export interface CellText {
  readonly form: CellTextForm;
  readonly text: string;
  readonly px: number;
}

/** Smallest cell font the grid will print. */
export const CELL_MIN_PX = 8;

/**
 * What a Bid × Ask cell may print, given the room it has. "bid × ask" (M46),
 * else the tight "bid×ask", else the dominant side alone, else nothing. A side
 * that did not trade prints as an empty slot beside the × ("× 12"), never as a
 * manufactured zero. Tried from `maxPx` down to CELL_MIN_PX.
 */
export function fitBidAskCellText(
  bid: number,
  ask: number,
  fmt: (v: number) => string,
  measure: (text: string, px: number) => number,
  maxW: number,
  maxPx: number,
): CellText {
  const b = pos(bid), a = pos(ask);
  if (b + a <= 0 || !(maxW > 0)) return { form: "NONE", text: "", px: 0 };
  const bs = b > 0 ? fmt(b) : "", as = a > 0 ? fmt(a) : "";
  const pair = `${bs} × ${as}`.trim();
  const tight = `${bs}×${as}`;
  const dom = fmt(Math.max(a, b));
  for (let px = Math.max(CELL_MIN_PX, Math.floor(maxPx)); px >= CELL_MIN_PX; px--) {
    if (measure(pair, px) <= maxW) return { form: "PAIR", text: pair, px };
  }
  for (let px = Math.max(CELL_MIN_PX, Math.floor(maxPx)); px >= CELL_MIN_PX; px--) {
    if (measure(tight, px) <= maxW) return { form: "PAIR_TIGHT", text: tight, px };
  }
  for (let px = Math.max(CELL_MIN_PX, Math.floor(maxPx)); px >= CELL_MIN_PX; px--) {
    if (measure(dom, px) <= maxW) return { form: "DOMINANT", text: dom, px };
  }
  return { form: "NONE", text: "", px: 0 };
}

/* ═══ VOLUME PROFILE — ONE HISTOGRAM ROW ═══════════════════════════════════ */

export interface HistogramRow {
  /** Whole bar length, ∝ the row's volume against the bar's heaviest row. */
  readonly width: number;
  /** Buy-initiated share of that length, drawn first (from the left). */
  readonly buyWidth: number;
  /** Sell-initiated remainder. */
  readonly sellWidth: number;
}

/** The VP owner's length and split, for one per-candle row. */
export function footprintHistogramRow(row: TapeSideRow, maxRowTotal: number, columnWidth: number): HistogramRow {
  const total = pos(row.ask) + pos(row.bid);
  const width = vpBarWidth(total, maxRowTotal, columnWidth);
  const { upWidth, downWidth } = vpBarSplit(width, total > 0 ? pos(row.ask) / total : 0.5);
  return { width, buyWidth: upWidth, sellWidth: downWidth };
}

/* ═══ IMBALANCE ════════════════════════════════════════════════════════════ */

export interface ImbalanceRowRead {
  /** The dominant initiator when the row qualifies; null otherwise. */
  readonly side: "buy" | "sell" | null;
  /** dominant ÷ opposing × 100 (formatImbalanceRatio's convention); the 300 sentinel when one-sided. */
  readonly ratioPct: number;
  readonly oneSided: boolean;
}

/**
 * Which rows lean. The threshold (IMBALANCE_RATIO_PCT) and the weight floor
 * (MIN_LEVEL_SHARE of the median traded row) are the stacked-imbalance
 * owner's: one lot against zero is a row nobody traded, not infinite conviction.
 */
export function readImbalanceRows(rows: readonly TapeSideRow[]): ImbalanceRowRead[] {
  const totals = rows.map(r => pos(r.ask) + pos(r.bid));
  const traded = totals.filter(t => t > 0).sort((x, y) => x - y);
  const mid = traded.length >> 1;
  const median = traded.length === 0 ? 0 : traded.length % 2 ? traded[mid] : (traded[mid - 1] + traded[mid]) / 2;
  const floor = MIN_LEVEL_SHARE * median;
  return rows.map((r, i) => {
    const a = pos(r.ask), b = pos(r.bid), t = totals[i];
    if (!(t > 0) || t < floor) return { side: null, ratioPct: 0, oneSided: false };
    const dom = Math.max(a, b), opp = Math.min(a, b);
    const oneSided = opp <= 0;
    const ratioPct = oneSided ? IMBALANCE_RATIO_PCT : (dom / opp) * 100;
    const leans = oneSided || ratioPct >= IMBALANCE_RATIO_PCT;
    return { side: leans ? (a >= b ? "buy" : "sell") : null, ratioPct, oneSided };
  });
}

/**
 * How strongly a leaning row is tinted, 0..1: 0 at the owner's 3:1, 1 at
 * three times that. A one-sided row sits mid-scale — its ratio is unbounded,
 * which is a fact about the empty side, not a louder reading.
 */
export function imbalanceStrength(rd: ImbalanceRowRead): number {
  if (!rd.side) return 0;
  if (rd.oneSided) return 0.5;
  return Math.max(0, Math.min(1, (rd.ratioPct - IMBALANCE_RATIO_PCT) / (2 * IMBALANCE_RATIO_PCT)));
}

export interface ImbalanceRun {
  /** First and last row index (inclusive), in the caller's row order. */
  readonly from: number;
  readonly to: number;
  readonly side: "buy" | "sell";
  /** The run's weakest measured ratio (×100); null when every row was one-sided. */
  readonly weakestPct: number | null;
}

/** Runs of ≥ MIN_STACK_LEVELS adjacent rows leaning the same way. */
export function imbalanceRuns(reads: readonly ImbalanceRowRead[], minRun: number = MIN_STACK_LEVELS): ImbalanceRun[] {
  const out: ImbalanceRun[] = [];
  let i = 0;
  while (i < reads.length) {
    const side = reads[i].side;
    if (!side) { i++; continue; }
    let j = i;
    while (j + 1 < reads.length && reads[j + 1].side === side) j++;
    if (j - i + 1 >= minRun) {
      let weakest: number | null = null;
      for (let k = i; k <= j; k++) if (!reads[k].oneSided) weakest = weakest == null ? reads[k].ratioPct : Math.min(weakest, reads[k].ratioPct);
      out.push({ from: i, to: j, side, weakestPct: weakest });
    }
    i = j + 1;
  }
  return out;
}

/** The one ratio word a run prints, in formatImbalanceRatio's words. */
export function imbalanceRunWord(run: ImbalanceRun): string {
  return run.weakestPct == null ? formatImbalanceRatio(IMBALANCE_RATIO_PCT, true) : `≥${formatImbalanceRatio(run.weakestPct)}`;
}

/* ═══ AGG / PASSIVE PROXY ══════════════════════════════════════════════════ */

/** The extreme fifth of a bar, as the four-role legend has always read it. */
export const AGG_PASSIVE_EXTREME_SHARE = 0.2;

export type AggPassiveRole = "AGGRESSIVE" | "INTO_HIGH" | "INTO_LOW";

export interface AggPassiveRing {
  readonly side: "buy" | "sell";
  /** The initiating side's own volume in the zone. */
  readonly volume: number;
  readonly role: AggPassiveRole;
}

/**
 * The ring a zone earns: the side that initiated more there, and WHERE in the
 * bar it traded. A buy into the bar's top fifth / a sell into its bottom fifth
 * is the passive proxy (location only — Garden 12: never "absorbed").
 */
export function aggPassiveRing(price: number, low: number, high: number, bid: number, ask: number): AggPassiveRing | null {
  const a = pos(ask), b = pos(bid);
  if (a + b <= 0 || !Number.isFinite(price)) return null;
  const side: "buy" | "sell" = a >= b ? "buy" : "sell";
  const range = high - low;
  const f = range > 0 ? (price - low) / range : 0.5;
  const role: AggPassiveRole = side === "buy" && f > 1 - AGG_PASSIVE_EXTREME_SHARE ? "INTO_HIGH"
    : side === "sell" && f < AGG_PASSIVE_EXTREME_SHARE ? "INTO_LOW"
    : "AGGRESSIVE";
  return { side, volume: side === "buy" ? a : b, role };
}

/* ═══ BIG TRADES ═══════════════════════════════════════════════════════════ */

export interface SessionPercentile {
  /** Share of the session's captured prints STRICTLY smaller, 0..1; null below the population floor. */
  readonly pct: number | null;
  readonly prints: number;
}

/**
 * Where one print stands among every print this chart captured this session
 * (since the tab opened — history before that carries no tape). The same
 * convention as selectBigTradeIntelligence's `sizePercentile` (strictly
 * smaller, so a tie never out-ranks its twin) and the same population floor
 * (MIN_PRINTS_FOR_PERCENTILE): a percentile of a handful is the largest print
 * wearing a statistic's clothes.
 */
export function sessionSizePercentile(size: number, bars: Iterable<readonly TapeSideRow[]>): SessionPercentile {
  let n = 0, below = 0;
  for (const prints of bars) {
    for (const p of prints) {
      const s = pos(p.bid) + pos(p.ask);
      if (s <= 0) continue;
      n++;
      if (s < size) below++;
    }
  }
  return { pct: n >= MIN_PRINTS_FOR_PERCENTILE && n > 0 ? below / n : null, prints: n };
}

/**
 * "98.7TH" — one decimal, FLOORED so a claim never rounds up into a rank it
 * did not reach (99.96 reads 99.9, never 100.0). The suffix follows the digit
 * printed last, as the plates write it ("87.3rd", "98.7TH").
 */
export function percentileOrdinal(pct01: number): string {
  const v = Math.floor(Math.max(0, Math.min(1, pct01)) * 1000) / 10;
  const s = v.toFixed(1);
  const d = s[s.length - 1];
  const suffix = d === "1" ? "ST" : d === "2" ? "ND" : d === "3" ? "RD" : "TH";
  return `${s}${suffix}`;
}

export interface InscriptionLine {
  readonly text: string;
  readonly px: number;
  readonly weight: 600 | 700;
}

export interface PlacedInscriptionLine extends InscriptionLine {
  /** Centre of the line, relative to the bubble's centre. */
  readonly dy: number;
}

/**
 * The candidate line sets a big-trade disc tries, in F07A's order: SIZE / TIME
 * / ↑PRICE, else SIZE / ↑PRICE, else SIZE — each first at the disc's own
 * sizes, then one step smaller, so a larger disc never carries FEWER lines
 * than a smaller one (the 9px lines of a big disc fall back to the 8px lines a
 * smaller disc already fits).
 */
export function bigTradeInscriptionLines(r: number, sizeText: string, timeText: string, priceText: string, members = 1): InscriptionLine[][] {
  const sizePx = Math.max(9, Math.min(15, Math.round(r * 0.42)));
  const subs = r >= 30 ? [9, 8] : [8];
  const sizes = [...new Set([sizePx, Math.max(8, sizePx - 2)])];
  // F07B · a CLUSTER disc writes its TOTAL with "×n" and its anchor's price.
  // No time line: n prints have n times, and one of them written alone would
  // read as the cluster's time — the members' clocks live in Inspect.
  const cluster = members > 1;
  const S = (px: number): InscriptionLine => ({ text: cluster ? `${sizeText} ×${members}` : sizeText, px, weight: 700 });
  const T = (px: number): InscriptionLine => ({ text: timeText, px, weight: 600 });
  const P = (px: number): InscriptionLine => ({ text: priceText, px, weight: 600 });
  const out: InscriptionLine[][] = [];
  if (!cluster) for (const sp of sizes) for (const sub of subs) out.push([S(sp), T(sub), P(sub)]);
  for (const sp of sizes) for (const sub of subs) out.push([S(sp), P(sub)]);
  for (const sp of sizes) out.push([S(sp)]);
  return out;
}

/** Space kept between an inscription and the rim. */
export const INSCRIPTION_PAD = 2;

/**
 * F07A writes SIZE / TIME / ↑PRICE inside the disc. A line prints only where
 * the circle's chord at that line is wide enough for it; the first candidate
 * set whose every line fits wins, else nothing is written inside — the bubble
 * never grows a label outside itself.
 */
export function fitBubbleInscription(
  r: number,
  candidates: readonly (readonly InscriptionLine[])[],
  measure: (text: string, px: number, weight: 600 | 700) => number,
  pad: number = INSCRIPTION_PAD,
): PlacedInscriptionLine[] {
  if (!(r > 0)) return [];
  const GAP = 2;
  for (const lines of candidates) {
    if (lines.length === 0) continue;
    const h = lines.reduce((s, l) => s + l.px, 0) + GAP * (lines.length - 1);
    let top = -h / 2;
    const placed: PlacedInscriptionLine[] = [];
    let ok = true;
    for (const l of lines) {
      const dy = top + l.px / 2;
      const worst = Math.max(Math.abs(dy - l.px / 2), Math.abs(dy + l.px / 2));
      const chord = worst >= r ? 0 : 2 * Math.sqrt(r * r - worst * worst);
      if (measure(l.text, l.px, l.weight) > chord - 2 * pad) { ok = false; break; }
      placed.push({ ...l, dy });
      top += l.px + GAP;
    }
    if (ok) return placed;
  }
  return [];
}

export type BigTradeCalloutReason = "SELECTED" | "HOVERED" | "DOMINANT";
export type BigTradeCalloutSilence = "FAR" | "NEAR_QUIET" | "NO_PRINT";

export interface CalloutCandidate {
  readonly key: string;
  /** The size the bubble claims (its dominant side). */
  readonly magnitude: number;
  readonly onCamera: boolean;
}

/**
 * AT MOST ONE callout (G04). The selected print, else the hovered one, else —
 * at MID only — the dominant print on camera. FAR speaks macro; at NEAR the
 * numbers live in the rows and inside the bubbles, so the callout waits to be
 * asked for (selected or hovered).
 */
export function pickBigTradeCallout<T extends CalloutCandidate>(
  bubbles: readonly T[],
  opts: { readonly depth: string; readonly selectedKey: string | null; readonly hoveredKey: string | null },
): { readonly target: T; readonly reason: BigTradeCalloutReason } | { readonly target: null; readonly reason: BigTradeCalloutSilence } {
  const seen = bubbles.filter(b => b.onCamera && b.magnitude > 0);
  const sel = opts.selectedKey != null ? seen.find(b => b.key === opts.selectedKey) : undefined;
  if (sel) return { target: sel, reason: "SELECTED" };
  const hov = opts.hoveredKey != null ? seen.find(b => b.key === opts.hoveredKey) : undefined;
  if (hov) return { target: hov, reason: "HOVERED" };
  if (opts.depth === "FAR") return { target: null, reason: "FAR" };
  if (opts.depth === "NEAR") return { target: null, reason: "NEAR_QUIET" };
  let best: T | null = null;
  for (const b of seen) if (!best || b.magnitude > best.magnitude) best = b;
  return best ? { target: best, reason: "DOMINANT" } : { target: null, reason: "NO_PRINT" };
}

/** The callout's words: side (in the claim owner's heading), size @ price, rank in the session. */
export function bigTradeCalloutLines(input: {
  readonly bid: number;
  readonly ask: number;
  readonly price: number;
  readonly priceText: string;
  readonly aggressorMethod?: AggressorMethod;
  readonly pct: number | null;
  readonly prints: number;
  /**
   * F07B · the disc is a CLUSTER of `n` prints whose claimed sizes sum to
   * `total`. Its first line names the cluster, its size line the total at the
   * anchor print's price; the side of each member lives in Inspect.
   */
  readonly cluster?: { readonly n: number; readonly total: number } | null;
}): { readonly lines: readonly string[]; readonly receipt: string } | null {
  const rank = input.pct == null
    ? `UNRANKED · ${input.prints} SESSION PRINTS`
    : `${percentileOrdinal(input.pct)} PERCENTILE`;
  const pctReceipt = input.pct == null ? "UNRANKED" : (Math.floor(input.pct * 1000) / 10).toFixed(1);
  if (input.cluster && input.cluster.n > 1) {
    if (!(input.cluster.total > 0)) return null;
    const total = formatBubbleExact(input.cluster.total);
    return {
      lines: [`CLUSTER ×${input.cluster.n}`, `${total} @ ${input.priceText}`, rank],
      receipt: `CLUSTER${input.cluster.n}:${total}@${pctReceipt}`,
    };
  }
  const claim = describeBubbleClaim({ kind: "big-trade", bid: input.bid, ask: input.ask, price: input.price, aggressorMethod: input.aggressorMethod });
  if (!claim) return null;
  const size = formatBubbleExact(Math.abs(claim.value));
  return {
    lines: [claim.heading, `${size} @ ${input.priceText}`, rank],
    receipt: `ONE:${size}@${pctReceipt}`,
  };
}

/* ═══ BIG TRADE CLUSTERS (F07B · GP12 §60 / §64) ═══════════════════════════
 *
 * Found on serving (BTC-USD 1m, MID, 2026-09-26 03:55 CDT): four prints in one
 * minute at 84209–84211 drew four gold discs ON TOP OF EACH OTHER at the live
 * edge — one unreadable knot whose inscriptions overprinted. GP12 §64:
 * "Stagger bubbles… Suppress low-value labels when crowded. Merge labels."
 *
 * THE RULE, written before the code. Each print is placed at its EXACT time
 * and price by the anchor owner and sized by the size owner. Then, on the
 * screen the trader is looking at:
 *   · discs whose circles overlap — counting the membrane's breath
 *     (BIG_TRADE_BREATH) and a CLUSTER_GAP_PX hairline, so two discs that
 *     only kiss while breathing are one knot too — MERGE into one CLUSTER
 *     disc, transitively, and again until no two discs on the glass touch;
 *   · the cluster's AREA is the sum of its members' areas (r = √Σr²), capped
 *     at the size owner's ceiling — never a new scale;
 *   · its CENTRE is the members' size-weighted time and price (and pixel);
 *   · it keeps every member, so each print stays individually inspectable;
 *   · a lone disc is its own cluster and keeps its own key — identity,
 *     selection and the dedupe set are unchanged for it.
 * Nothing is invented: a cluster is a grouping of real prints, and every
 * number it prints is a sum or a member's own.
 *
 * PURE. DETERMINISTIC. Screen-space: the caller re-clusters every frame,
 * because zoom decides what touches.
 */

/** The membrane's breath: the disc's semi-axes swing by ±this share of r. */
export const BIG_TRADE_BREATH = 0.03;
/** Clear glass kept between two discs that are NOT merged (px). */
export const CLUSTER_GAP_PX = 2;
/** A multi-print cluster's key is this prefix + its anchor print's key. */
export const CLUSTER_KEY_PREFIX = "cluster:";

export interface ClusterDiscInput {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  /** The size owner's TARGET radius (never the spawn-eased one). */
  readonly r: number;
  /** The size the disc claims (bubbleClaimMagnitude) — the cluster weight. */
  readonly size: number;
  readonly timeSec: number;
  readonly barTime: number;
  readonly price: number;
  readonly bid: number;
  readonly ask: number;
}

export interface BigTradeCluster<T extends ClusterDiscInput = ClusterDiscInput> {
  /** A lone print keeps its own key; a cluster is CLUSTER_KEY_PREFIX + anchor key. */
  readonly key: string;
  /** Every print in it, oldest first. */
  readonly members: readonly T[];
  /** The largest member (earliest on a tie) — whose price the cluster writes. */
  readonly anchor: T;
  readonly x: number;
  readonly y: number;
  /** √Σr², capped at maxR. */
  readonly r: number;
  /** Size-weighted time and price of the members. */
  readonly timeSec: number;
  readonly price: number;
  /** Σ member sizes (each member's own claim). */
  readonly size: number;
  readonly bid: number;
  readonly ask: number;
  /** Distinct bars the members printed in, ascending. */
  readonly barTimes: readonly number[];
}

/** True when two discs touch on the glass: overlap, counting breath and the hairline gap. */
export function discsTouch(
  a: { readonly x: number; readonly y: number; readonly r: number },
  b: { readonly x: number; readonly y: number; readonly r: number },
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * (1 + BIG_TRADE_BREATH) + CLUSTER_GAP_PX;
}

/** Area is additive: r = √Σr², capped at the size owner's ceiling. */
export function clusterRadius(radii: readonly number[], maxR: number): number {
  let s = 0;
  for (const r of radii) if (Number.isFinite(r) && r > 0) s += r * r;
  return Math.min(maxR, Math.sqrt(s));
}

function buildCluster<T extends ClusterDiscInput>(members: T[], maxR: number): BigTradeCluster<T> {
  members.sort((a, z) => a.timeSec - z.timeSec || a.key.localeCompare(z.key));
  let W = 0, x = 0, y = 0, t = 0, p = 0, bid = 0, ask = 0;
  let anchor = members[0];
  for (const m of members) {
    W += m.size; x += m.size * m.x; y += m.size * m.y; t += m.size * m.timeSec; p += m.size * m.price;
    bid += pos(m.bid); ask += pos(m.ask);
    if (m.size > anchor.size) anchor = m;
  }
  const lone = members.length === 1;
  return {
    key: lone ? members[0].key : `${CLUSTER_KEY_PREFIX}${anchor.key}`,
    members,
    anchor,
    x: lone ? members[0].x : x / W,
    y: lone ? members[0].y : y / W,
    r: lone ? Math.min(maxR, members[0].r) : clusterRadius(members.map(m => m.r), maxR),
    timeSec: lone ? members[0].timeSec : t / W,
    price: lone ? members[0].price : p / W,
    size: W,
    bid, ask,
    barTimes: [...new Set(members.map(m => m.barTime))].sort((a, z) => a - z),
  };
}

/**
 * The frame's clusters. Discs with a non-finite position, a non-positive
 * radius or no claimed size are not on the glass and are dropped. Output is
 * ordered by the size each cluster claims, largest first.
 */
export function clusterBigTrades<T extends ClusterDiscInput>(discs: readonly T[], opts: { readonly maxR: number }): BigTradeCluster<T>[] {
  let groups: T[][] = discs
    .filter(d => Number.isFinite(d.x) && Number.isFinite(d.y) && d.r > 0 && d.size > 0)
    .map(d => [d]);
  let clusters = groups.map(g => buildCluster(g, opts.maxR));
  // Union-find over touching pairs, then rebuild — until nothing touches.
  // Each round merges at least two groups, so it ends in < n rounds.
  for (;;) {
    const n = clusters.length;
    const parent = clusters.map((_, i) => i);
    const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    // Sweep by x: a pair farther apart in x than the widest possible touch cannot touch.
    const order = clusters.map((_, i) => i).sort((a, z) => clusters[a].x - clusters[z].x);
    let merged = false;
    for (let i = 0; i < n; i++) {
      const a = clusters[order[i]];
      const reach = (a.r + opts.maxR) * (1 + BIG_TRADE_BREATH) + CLUSTER_GAP_PX;
      for (let j = i + 1; j < n; j++) {
        const b = clusters[order[j]];
        if (b.x - a.x >= reach) break;
        if (!discsTouch(a, b)) continue;
        const ra = find(order[i]), rb = find(order[j]);
        if (ra !== rb) { parent[rb] = ra; merged = true; }
      }
    }
    if (!merged) break;
    const byRoot = new Map<number, T[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      const list = byRoot.get(root) ?? [];
      list.push(...groups[i]);
      byRoot.set(root, list);
    }
    groups = [...byRoot.values()];
    clusters = groups.map(g => buildCluster(g, opts.maxR));
  }
  return clusters.sort((a, z) => z.size - a.size || a.key.localeCompare(z.key));
}

/** A selected key → the cluster on this frame that holds it (its own key, a member's, or its anchor's). */
export function clusterHolding<T extends ClusterDiscInput>(clusters: readonly BigTradeCluster<T>[], key: string | null): BigTradeCluster<T> | null {
  if (key == null) return null;
  const base = key.startsWith(CLUSTER_KEY_PREFIX) ? key.slice(CLUSTER_KEY_PREFIX.length) : key;
  return clusters.find(c => c.key === key || c.members.some(m => m.key === base)) ?? null;
}

/** The print a cluster key was minted from (a lone print's key is its own). */
export function clusterAnchorKey(key: string): string {
  return key.startsWith(CLUSTER_KEY_PREFIX) ? key.slice(CLUSTER_KEY_PREFIX.length) : key;
}

/**
 * RECEIPT `bigTradeOverlaps`: pairs of DRAWN discs whose circles intersect.
 * After clustering this is 0 — anything else is a knot on the glass.
 */
export function countCircleOverlaps(circles: readonly { readonly x: number; readonly y: number; readonly r: number }[]): number {
  let n = 0;
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const a = circles[i], b = circles[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) n++;
    }
  }
  return n;
}

/**
 * F07B's BARS TOUCHED dots: one per bar from the cluster's first bar to its
 * last, filled where a member printed. Capped at `max` dots (the last is then
 * the cluster's final bar, so the row never claims a span it did not show).
 */
export function clusterBarDots(barTimes: readonly number[], intervalSec: number, max = 12): boolean[] {
  if (!barTimes.length || !(intervalSec > 0)) return [];
  const first = barTimes[0], last = barTimes[barTimes.length - 1];
  const span = Math.round((last - first) / intervalSec) + 1;
  const touched = new Set(barTimes.map(t => Math.round((t - first) / intervalSec)));
  const n = Math.min(span, max);
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) out.push(touched.has(i === n - 1 ? span - 1 : i));
  return out;
}

/**
 * Slots for the callout box around its bubble, in the order G04 prefers
 * (up-right first), stepped out twice. The caller hands these to the keep-out
 * owner (`pickSlotClearOfKeepOut`), which chooses.
 */
export function bigTradeCalloutSlots(b: { readonly x: number; readonly y: number; readonly r: number }, box: { readonly w: number; readonly h: number }, gap = 18): ScreenRect[] {
  const out: ScreenRect[] = [];
  for (const k of [1, 2, 3]) {
    const g = gap * k;
    const right = b.x + b.r + g, left = b.x - b.r - g - box.w;
    const up = b.y - b.r - g - box.h, down = b.y + b.r + g;
    out.push(
      { x: right, y: up, w: box.w, h: box.h },
      { x: left, y: up, w: box.w, h: box.h },
      { x: right, y: down, w: box.w, h: box.h },
      { x: left, y: down, w: box.w, h: box.h },
      { x: right, y: b.y - box.h / 2, w: box.w, h: box.h },
      { x: left, y: b.y - box.h / 2, w: box.w, h: box.h },
    );
  }
  return out;
}

export interface ResponsePathPoint {
  readonly time: number;
  readonly price: number;
}

/**
 * The dashed RESPONSE PATH (F07A): from the print, through the close of each
 * response bar, to where price went. Which bars count — CLOSED bars after the
 * print's bar, RESPONSE_BARS of them — is selectPrintResponse's rule, asked
 * here rather than restated: until the last of them has closed there is no
 * path at all, never a partial line that reads as a result.
 */
export function bigTradeResponsePath(
  print: { readonly timeSec: number; readonly price: number; readonly side: "buy" | "sell" },
  bars: readonly ResponseBar[],
  formingBarTime: number | null,
): ResponsePathPoint[] | null {
  const pr = selectPrintResponse(print, bars, { formingBarTime });
  if (!pr.drawn || pr.verdict === "PENDING" || pr.eventBarTime == null || pr.endTime == null) return null;
  const pts: ResponsePathPoint[] = [{ time: print.timeSec, price: print.price }];
  for (const b of bars) {
    if (b.time <= pr.eventBarTime || b.time > pr.endTime) continue;
    if (!Number.isFinite(b.close) || !Number.isFinite(b.high) || !Number.isFinite(b.low) || b.high < b.low) continue;
    pts.push({ time: b.time, price: b.close });
  }
  return pts.length > 1 ? pts : null;
}

/**
 * Paths change only when the bars or the forming bar do; the paint runs ~30×/s.
 * Keyed on the bars array's identity (a new array per update), so a memo never
 * outlives the bars it was measured on.
 */
const pathMemo = new WeakMap<readonly ResponseBar[], { forming: number | null; paths: Map<string, ResponsePathPoint[] | null> }>();

export function memoBigTradeResponsePath(
  key: string,
  print: { readonly timeSec: number; readonly price: number; readonly side: "buy" | "sell" },
  bars: readonly ResponseBar[],
  formingBarTime: number | null,
): ResponsePathPoint[] | null {
  let m = pathMemo.get(bars);
  if (!m || m.forming !== formingBarTime) { m = { forming: formingBarTime, paths: new Map() }; pathMemo.set(bars, m); }
  if (m.paths.has(key)) return m.paths.get(key) ?? null;
  const p = bigTradeResponsePath(print, bars, formingBarTime);
  m.paths.set(key, p);
  return p;
}

/* ═══ RECEIPTS ═════════════════════════════════════════════════════════════ */

/** What each mode puts on the glass — published as `footprintForm`. */
export const FOOTPRINT_FORM = {
  "bid-ask": "CELLS",
  delta: "TRAIL",
  "volume-profile": "HISTOGRAM",
  imbalance: "TINT",
  "aggressive-passive": "TRAIL",
  "big-trades": "BUBBLES",
} as const satisfies Record<string, string>;

/**
 * Per-mode receipts. Withdrawn together at the top of every frame, so a mode
 * the trader left never keeps speaking for pixels that are gone; each mode
 * writes only its own.
 */
export const FOOTPRINT_MODE_RECEIPTS = [
  "footprintForm",
  "footprintRings",
  "fpCellText",
  "fpDeltaText",
  "deltaBubblesDrawn",
  "vpRowNumbers",
  "imbalanceRows",
  "imbalanceRuns",
  "imbalanceRunWords",
  "aggPassiveRings",
  "aggPassiveIntoExtreme",
] as const;
