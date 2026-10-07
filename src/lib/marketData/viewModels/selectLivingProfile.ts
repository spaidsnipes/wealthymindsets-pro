import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
/**
 * ASSET 06 · THE PRO LIVING PROFILE — VAH / POC / VAL, and the NODES.
 *
 * `vpEngine` already owns the volume-at-price distribution and publishes the
 * three classical levels. This compiler reads that snapshot and answers the
 * question the levels alone cannot: WHERE IN THE DISTRIBUTION DID THE MARKET
 * SPEND TIME, AND WHERE DID IT REFUSE TO. Those are the high- and low-volume
 * nodes, and they are the part of a profile a trader actually navigates by.
 *
 * ── WHY THE NODES ARE REFUSED ON THE CANDLE-ESTIMATED PATH ───────────────────
 *
 * This is the whole reason this file exists rather than a `useMemo` in a view.
 *
 * `computeProfileFromBars` spreads each bar's volume EVENLY across every bucket
 * its high–low touched. That is an honest fallback for an aggregate — the POC
 * of a wide sample survives it — but it means the within-bar shape is FLAT BY
 * CONSTRUCTION. Every ripple in the resulting curve comes from bars OVERLAPPING
 * each other, not from where trades landed.
 *
 * So an LVN read off a candle-estimated profile does not say "price refused to
 * trade here". It says "fewer bar ranges happened to cover this price". Those
 * are different sentences, and the second one is about candle geometry, not
 * about the market. A trader who places a stop beyond an LVN is acting on the
 * first sentence. Printing the second one in the first one's clothes is the
 * exact class of lie this product exists to refuse.
 *
 * Therefore: POC/VAH/VAL are published on both paths, labelled by quality.
 * HVN/LVN are published ONLY on the trade-based path, and the candle-estimated
 * path NAMES the refusal rather than showing an empty rail.
 *
 * ── WHY THE GRID IS REBUILT DENSE ────────────────────────────────────────────
 *
 * `vpEngine.finalize` drops rows with zero volume. That is correct for the
 * engine — an empty bucket is not a row — but it is exactly backwards for node
 * detection: a run of prices where NOTHING traded is the strongest low-volume
 * node a profile can contain, and in the sparse array it is invisible, because
 * the two prices either side of the void sit next to each other. This compiler
 * walks the tick grid and restores the holes before it looks for shape.
 *
 * ── WHY AN EDGE IS NOT A NODE ────────────────────────────────────────────────
 *
 * The lowest and highest populated buckets of any profile are always thin. They
 * are the TAILS of the distribution, not places price rejected. An LVN must
 * carry real volume both above it and below it — a trough, not a slope. The
 * detector requires flanking shelves on both sides for that reason.
 */

import {
  computeProfileFromBars,
  computeProfileFromTrades,
  type NormalizedTradeLite,
  type ProfileQuality,
  type ProfileSnapshot,
} from "@/lib/vpEngine";

export const LIVING_PROFILE_VERSION = 1;

/** Buckets either side searched when deciding whether a row is an extremum. */
export const NODE_WINDOW = 2;
/** A peak must stand this many times above its neighbourhood's mean to count. */
export const HVN_PROMINENCE = 1.35;
/** A trough must sit this far BELOW its neighbourhood's mean to count. */
export const LVN_PROMINENCE = 0.65;
/** Fewer dense buckets than this and "shape" is not a thing the data has. */
export const MIN_DENSE_BUCKETS = 9;
/** Published rails are capped — a rail of forty nodes is a histogram, not a read. */
export const MAX_NODES = 6;
/** Defensive: a pathological tickSize must not spin a grid of millions. */
export const MAX_GRID = 20_000;
/**
 * Beyond this the curve is not drawn. It is NOT down-sampled: merging buckets
 * to fit a screen would move the POC, and a POC that moves because of a layout
 * decision is not a POC.
 */
export const MAX_CURVE = 600;

export type LivingProfileMissingInput = "NO_PROFILE" | "TOO_FEW_BUCKETS";
export type NodesMissingInput =
  | LivingProfileMissingInput
  | "CANDLE_ESTIMATED"
  | "GRID_TOO_WIDE";

export interface ProfileNode {
  readonly kind: "HVN" | "LVN";
  /** Bucket LOW edge, exactly as the engine keyed it. Never rounded here. */
  readonly price: number;
  readonly volume: number;
  readonly shareOfTotal: number;
  readonly insideValueArea: boolean;
  /** Signed: positive means above the POC. */
  readonly distanceFromPoc: number;
  /** True when the bucket took no volume at all — an untraded price. */
  readonly untraded: boolean;
}

/**
 * One drawable bucket. The compiler publishes the curve so the view owns no
 * arithmetic at all: `share` is already normalised against the heaviest bucket,
 * which is the only number a bar's width may be derived from. A view computing
 * its own normalisation is how two surfaces end up drawing the same profile at
 * two different scales.
 */
export interface ProfileCurvePoint {
  readonly price: number;
  readonly volume: number;
  /** volume ÷ the heaviest bucket's volume, in [0,1]. */
  readonly share: number;
  readonly insideValueArea: boolean;
  readonly isPoc: boolean;
  readonly node: "HVN" | "LVN" | null;
}

export interface LivingProfileVM {
  readonly measured: boolean;
  readonly missingInput: LivingProfileMissingInput | null;
  readonly missingInputNote: string | null;

  readonly quality: ProfileQuality;
  readonly qualityNote: string;

  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly valueAreaPct: number;
  readonly totalVolume: number;
  readonly populatedRows: number;
  readonly tickSize: number;

  readonly nodesMeasured: boolean;
  readonly nodesMissingInput: NodesMissingInput | null;
  readonly nodesNote: string | null;
  readonly hvn: readonly ProfileNode[];
  readonly lvn: readonly ProfileNode[];

  /** Descending by price — the order a profile is read on a chart. */
  readonly curve: readonly ProfileCurvePoint[];
  readonly curveNote: string | null;

  readonly livePrice: number | null;
  /** Owned here so two surfaces can never word the same location differently. */
  readonly locationNote: string | null;
}

export interface LivingProfileOptions {
  readonly livePrice?: number | null;
  readonly window?: number;
  readonly maxNodes?: number;
}

const MISSING_NOTE: Readonly<Record<LivingProfileMissingInput, string>> = {
  NO_PROFILE:
    "no volume has been distributed across price yet — there is no profile to "
    + "read, so no level is claimed",
  TOO_FEW_BUCKETS:
    "this profile spans too few price buckets to have a shape — a value area "
    + "drawn across a handful of buckets is the sample's range wearing a "
    + "statistic's clothes",
};

const NODES_NOTE: Readonly<Record<NodesMissingInput, string>> = {
  ...MISSING_NOTE,
  CANDLE_ESTIMATED:
    "this profile was ESTIMATED FROM CANDLES, which spread each bar's volume "
    + "evenly across its range — the ripples in that curve are bars overlapping, "
    + "not trades landing. Nodes are withheld because a low-volume node read "
    + "from it would describe candle geometry, not where price refused to trade",
  GRID_TOO_WIDE:
    "the bucket size is too fine for this price span to walk the grid safely, "
    + "so nodes are not computed rather than approximated",
};

const QUALITY_NOTE: Readonly<Record<ProfileQuality, string>> = {
  "trade-based":
    "built from classified trades — each print was placed at the price it "
    + "actually executed",
  "candle-estimated":
    "ESTIMATED FROM CANDLES — each bar's volume was spread evenly across its "
    + "high–low range, because this feed carries no per-trade tape",
};

interface DenseBucket {
  readonly price: number;
  readonly total: number;
}

/**
 * Restore the zero-volume buckets the engine dropped. Returns null when the
 * grid would be unreasonably wide, so the caller can name that rather than
 * silently degrade.
 */
function densify(snapshot: ProfileSnapshot): DenseBucket[] | null {
  const { rows, tickSize } = snapshot;
  if (rows.length === 0 || !(tickSize > 0)) return [];

  const first = rows[0].price;
  const last = rows[rows.length - 1].price;
  const span = Math.round((last - first) / tickSize) + 1;
  if (!Number.isFinite(span) || span <= 0) return [];
  if (span > MAX_GRID) return null;

  // A bucket that took volume keeps the engine's EXACT key. Only the restored
  // holes get a reconstructed price, because only they have no key to keep —
  // the engine stays the owner of what a traded bucket is called.
  const dense: DenseBucket[] = [];
  for (let i = 0; i < span; i++) dense.push({ price: first + i * tickSize, total: 0 });
  for (const r of rows) {
    const i = Math.round((r.price - first) / tickSize);
    if (i >= 0 && i < dense.length) dense[i] = { price: r.price, total: r.total };
  }
  return dense;
}

function meanOf(dense: readonly DenseBucket[], lo: number, hi: number): number {
  let sum = 0;
  let n = 0;
  for (let i = lo; i <= hi; i++) {
    sum += dense[i].total;
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Below this many prints, the tape has seen less of the day than the bar
 * history has, and a trade-built profile would be a precise picture of a
 * smaller sample. Precision about the wrong window is not an improvement.
 */
export const MIN_TRADES_FOR_TAPE_PROFILE = 200;

export interface TapePrint {
  readonly price?: number | null;
  readonly size?: number | null;
  readonly side?: "buy" | "sell" | null | undefined;
  readonly trade?: boolean;
}

/**
 * THE SOURCE DECISION, OWNED IN ONE PLACE.
 *
 * A surface choosing its own path is how two panels end up drawing two
 * different POCs for one instrument and both being "right". The rule: use the
 * tape when there is enough of it, otherwise fall back to bars — and let the
 * engine label which happened, so the quality tag is never a guess made at the
 * render site.
 */
export function buildLivingProfileSnapshot(
  prints: readonly TapePrint[] | null | undefined,
  bars: readonly LegacyOhlcvTuple[] | null | undefined,
  /** The instrument's tick (pricePrecision.instrumentTickFor) — buckets and levels land on its grid. */
  instrumentTick?: number | null,
): ProfileSnapshot {
  const trades: NormalizedTradeLite[] = [];
  for (const p of prints ?? []) {
    if (p?.trade !== true) continue;
    const price = p.price;
    const size = p.size;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) continue;
    trades.push({ price, size, side: p.side === "buy" || p.side === "sell" ? p.side : "unknown" });
  }

  if (trades.length >= MIN_TRADES_FOR_TAPE_PROFILE) return computeProfileFromTrades(trades, { instrumentTick });
  return computeProfileFromBars([...(bars ?? [])], { instrumentTick });
}

export function selectLivingProfile(
  snapshot: ProfileSnapshot | null | undefined,
  options: LivingProfileOptions = {},
): LivingProfileVM {
  const window = Math.max(1, options.window ?? NODE_WINDOW);
  const maxNodes = Math.max(1, options.maxNodes ?? MAX_NODES);
  const livePriceRaw = options.livePrice;
  const livePrice =
    typeof livePriceRaw === "number" && Number.isFinite(livePriceRaw) ? livePriceRaw : null;

  const quality: ProfileQuality = snapshot?.quality ?? "candle-estimated";
  const valueAreaPct = snapshot?.valueAreaPct ?? 0.7;
  const tickSize = snapshot?.tickSize ?? 0;
  const rows = snapshot?.rows ?? [];
  const populatedRows = snapshot?.populatedRows ?? 0;
  const totalVolume = snapshot?.totalVolume ?? 0;

  const blank = (missing: LivingProfileMissingInput): LivingProfileVM => ({
    measured: false,
    missingInput: missing,
    missingInputNote: MISSING_NOTE[missing],
    quality,
    qualityNote: QUALITY_NOTE[quality],
    poc: null,
    vah: null,
    val: null,
    valueAreaPct,
    totalVolume,
    populatedRows,
    tickSize,
    nodesMeasured: false,
    nodesMissingInput: missing,
    nodesNote: NODES_NOTE[missing],
    hvn: [],
    lvn: [],
    curve: [],
    curveNote: null,
    livePrice,
    locationNote: null,
  });

  if (rows.length === 0 || !(totalVolume > 0)) return blank("NO_PROFILE");

  const dense = densify({ ...snapshot!, rows, tickSize });
  const gridTooWide = dense === null;
  const grid = dense ?? [];

  if (!gridTooWide && grid.length < MIN_DENSE_BUCKETS) return blank("TOO_FEW_BUCKETS");

  const poc = snapshot!.poc;
  const vah = snapshot!.vah;
  const val = snapshot!.val;

  // ── NODES ──────────────────────────────────────────────────────────────────
  let nodesMissing: NodesMissingInput | null = null;
  if (quality !== "trade-based") nodesMissing = "CANDLE_ESTIMATED";
  else if (gridTooWide) nodesMissing = "GRID_TOO_WIDE";

  const hvn: ProfileNode[] = [];
  const lvn: ProfileNode[] = [];

  if (nodesMissing === null) {
    const nodeOf = (kind: "HVN" | "LVN", i: number): ProfileNode => ({
      kind,
      price: grid[i].price,
      volume: grid[i].total,
      shareOfTotal: totalVolume > 0 ? grid[i].total / totalVolume : 0,
      insideValueArea: grid[i].price >= val && grid[i].price <= vah,
      distanceFromPoc: grid[i].price - poc,
      untraded: grid[i].total === 0,
    });

    for (let i = window; i < grid.length - window; i++) {
      const lo = i - window;
      const hi = i + window;
      const neighbourhood = meanOf(grid, lo, hi);
      if (!(neighbourhood > 0)) continue;

      let isMax = true;
      let isMin = true;
      let higherAbove = false;
      let higherBelow = false;
      for (let j = lo; j <= hi; j++) {
        if (j === i) continue;
        if (grid[j].total > grid[i].total) {
          isMax = false;
          if (j > i) higherAbove = true;
          else higherBelow = true;
        }
        if (grid[j].total < grid[i].total) isMin = false;
      }

      if (isMax && grid[i].total >= HVN_PROMINENCE * neighbourhood) {
        hvn.push(nodeOf("HVN", i));
        continue;
      }
      // A trough only counts with real shelves on BOTH sides. Without that it
      // is the slope into the distribution's tail, and a tail is not a refusal.
      if (isMin && higherAbove && higherBelow && grid[i].total <= LVN_PROMINENCE * neighbourhood) {
        lvn.push(nodeOf("LVN", i));
      }
    }

    // Deterministic ordering, then cap. HVN by volume desc; LVN by volume asc —
    // the emptiest price is the most informative low-volume node. Price breaks
    // every tie so the rail cannot reorder between two identical windows.
    hvn.sort((a, z) => z.volume - a.volume || a.price - z.price);
    lvn.sort((a, z) => a.volume - z.volume || a.price - z.price);
    hvn.splice(maxNodes);
    lvn.splice(maxNodes);
  }

  // ── THE DRAWABLE CURVE ─────────────────────────────────────────────────────
  //
  // Normalised against the HEAVIEST bucket, not the total, because a bar's
  // width answers "how does this price compare to the busiest one" — which is
  // what the eye reads off a profile. Not down-sampled: see MAX_CURVE.
  const nodePrice = new Map<number, "HVN" | "LVN">();
  for (const n of hvn) nodePrice.set(n.price, "HVN");
  for (const n of lvn) nodePrice.set(n.price, "LVN");

  let heaviest = 0;
  for (const b of grid) if (b.total > heaviest) heaviest = b.total;

  const curveTooWide = gridTooWide || grid.length > MAX_CURVE;
  const curve: ProfileCurvePoint[] = curveTooWide
    ? []
    : grid
        .map((b) => ({
          price: b.price,
          volume: b.total,
          share: heaviest > 0 ? b.total / heaviest : 0,
          insideValueArea: b.price >= val && b.price <= vah,
          isPoc: b.price === poc,
          node: nodePrice.get(b.price) ?? null,
        }))
        .reverse();

  // ── LOCATION ───────────────────────────────────────────────────────────────
  let locationNote: string | null = null;
  if (livePrice !== null) {
    if (livePrice > vah) locationNote = "price is ABOVE the value area";
    else if (livePrice < val) locationNote = "price is BELOW the value area";
    else locationNote = "price is INSIDE the value area";
  }

  return {
    measured: true,
    missingInput: null,
    missingInputNote: null,
    quality,
    qualityNote: QUALITY_NOTE[quality],
    poc,
    vah,
    val,
    valueAreaPct,
    totalVolume,
    populatedRows,
    tickSize,
    nodesMeasured: nodesMissing === null,
    nodesMissingInput: nodesMissing,
    nodesNote: nodesMissing === null ? null : NODES_NOTE[nodesMissing],
    hvn,
    lvn,
    curve,
    curveNote: curveTooWide
      ? "this profile spans more price buckets than can be drawn honestly — "
        + "merging them to fit would move the POC, and a POC that moves because "
        + "of a layout decision is not a POC"
      : null,
    livePrice,
    locationNote,
  };
}

/* ═══ Garden 19 §8 · THE LIVING PROFILE, AS IT STOOD AT EACH BAR'S CLOSE ═════
 *
 * "Living Profile should visibly evolve with the market." The glass draws the
 * profile as it stands NOW; this series answers, for every bar of the same
 * session window, what POC / VAH / VAL the Living Profile published when that
 * bar closed — through the SAME source decision and the SAME engine
 * (`buildLivingProfileSnapshot` → vpEngine, buckets via bucketOnTickGrid). No
 * second profile math: each point IS a snapshot, built from the bars up to
 * that bar and the prints stamped before its close.
 *
 *   NO LOOKAHEAD   point k reads bars[0..k] and prints with time < close(k).
 *   BASIS          TAPE when the tape decision chose prints (≥ the tape
 *                  threshold by then), ESTIMATED when it fell back to bars —
 *                  so the line can show the moment the tape took over.
 *   THE LAST POINT is the forming bar read at `now`, with every bar and print
 *                  the live snapshot reads: it equals the live snapshot (test).
 *   NOT A REPAINT  a finished point, once computed, is reused from `previous`
 *                  (memo): it is what the profile said THEN, even after the
 *                  ring evicts the prints it was built from. Only the forming
 *                  point and newly closed bars are computed — incremental.
 *
 * Prints without a time cannot be placed before or after a close and are
 * excluded from every point except the live (last) one, which reads them all,
 * exactly as the live snapshot does.
 */

export type LivingDevelopmentBasis = "TAPE" | "ESTIMATED";

export interface LivingDevelopmentPoint {
  /** The bar's open, unix seconds. */
  readonly time: number;
  /** POC / VAH / VAL as published at this bar's close (bucket low edges); null when nothing had traded. */
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly basis: LivingDevelopmentBasis;
  /** The bucket size the engine chose for this snapshot (it can widen as the range grows). */
  readonly tickSize: number;
  readonly totalVolume: number;
  /** True for the bar still forming — its point is the live snapshot and will move. */
  readonly forming: boolean;
}

export interface LivingDevelopmentInput {
  /** The same prints the live snapshot gets (null when volume is not real). `time` in ms. */
  readonly prints: readonly (TapePrint & { readonly time?: number | null })[] | null | undefined;
  /** The same session-window bars the live snapshot gets, oldest first. */
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly instrumentTick?: number | null;
  /** Bar length in seconds. */
  readonly barSec: number;
  /** Wall clock, ms. */
  readonly now: number;
  /** The previous result, for reuse of finished points (memo). */
  readonly previous?: readonly LivingDevelopmentPoint[] | null;
}

function developmentPoint(snap: ProfileSnapshot, time: number, forming: boolean): LivingDevelopmentPoint {
  const has = snap.populatedRows > 0;
  return {
    time,
    poc: has ? snap.poc : null,
    vah: has ? snap.vah : null,
    val: has ? snap.val : null,
    basis: snap.quality === "trade-based" ? "TAPE" : "ESTIMATED",
    tickSize: snap.tickSize,
    totalVolume: snap.totalVolume,
    forming,
  };
}

export function selectLivingProfileDevelopment(input: LivingDevelopmentInput): LivingDevelopmentPoint[] {
  const bars = input.bars;
  if (bars.length === 0) return [];
  const prints = input.prints ?? null;
  const timed = prints
    ? prints.filter(p => typeof p.time === "number" && Number.isFinite(p.time)).slice().sort((a, b) => Number(a.time) - Number(b.time))
    : null;
  const prevByTime = new Map<number, LivingDevelopmentPoint>();
  for (const p of input.previous ?? []) if (!p.forming) prevByTime.set(p.time, p);

  const out: LivingDevelopmentPoint[] = [];
  let printEnd = 0; // prints [0, printEnd) are before the current close
  for (let k = 0; k < bars.length; k++) {
    const closeMs = (bars[k].time + input.barSec) * 1000;
    const isLast = k === bars.length - 1;
    const forming = isLast && closeMs > input.now;
    if (forming) {
      // The live snapshot, exactly: every bar, every print it would read.
      out.push(developmentPoint(buildLivingProfileSnapshot(prints, bars, input.instrumentTick), bars[k].time, true));
      break;
    }
    // The newest bar is never reused: it reads what the live snapshot reads.
    const reuse = isLast ? undefined : prevByTime.get(bars[k].time);
    if (reuse) { out.push(reuse); continue; }
    if (timed) while (printEnd < timed.length && Number(timed[printEnd].time) < closeMs) printEnd++;
    // A closed last bar with nothing after it reads like the live snapshot too.
    const window = isLast ? prints : timed ? timed.slice(0, printEnd) : null;
    out.push(developmentPoint(buildLivingProfileSnapshot(window, bars.slice(0, k + 1), input.instrumentTick), bars[k].time, false));
  }
  return out;
}
