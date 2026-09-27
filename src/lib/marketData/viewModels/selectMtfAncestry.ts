/**
 * MTF ANCESTRY — T-210 / F10 MULTI-TIMEFRAME ON ONE CHART.
 *
 * Canon plate WM_H_T210_MTF_NOT_FOUR_CHARTS: "MULTI-TIMEFRAME IS ONE
 * EXECUTION VIEW. NOT FOUR CHARTS." On the one 15m chart: a translucent green
 * 4H ANCESTRY BAND tagged "4H" at the right edge, a hatched grey 1H NODE box
 * tagged "1H", a dashed gold DAILY SHELF tagged "D", and a compact MTF inspect
 * (ANCESTRY + NODES + SHELF). REJECT 2x2 CHART GRID. Mockup 48 draws the same
 * idea as dashed higher-TF structure lines named "(1H)" / "(D)". Authority
 * checklist row 42: HTF appears as object ancestry, contextual lighting,
 * horizon tag — never a four-chart wall, a Time Room or competing clocks.
 *
 * WHAT THIS OWNER DOES. It RESAMPLES the chart's own loaded bars into 1H, 4H
 * and D. Nothing is fetched: a higher-timeframe bar exists here only when the
 * loaded history holds every slot of it. A HTF element the history cannot
 * build is a NAMED SILENCE (`NO_COMPLETE_BAR`), never an estimate.
 *
 *   D SHELF   the most recent COMPLETED session's high and low (PDH / PDL);
 *             the one nearest the newest close is the shelf, with the side
 *             price is on.
 *   4H BAND   among the last MAX_BAND_LOOKBACK completed 4H bars, the newest
 *             whose BODY (open–close) holds the newest close — the ancestor
 *             price grew from — else the one whose body is nearest (a tie goes
 *             to the newer bar). Which bar is stated (its first bar's time).
 *   1H NODE   the highest-volume row of the last completed 1H bar: each
 *             constituent bar's volume spread evenly over its own range, in
 *             bins at the chart's price step (coarsened only past
 *             MAX_NODE_BINS, and the bin used is published). The node is the
 *             peak row and its shoulder (rows ≥ NODE_SHOULDER of the peak).
 *             No volume on those bars → silence `NO_VOLUME`.
 *
 * Only timeframes STRICTLY ABOVE the chart's: a 1H chart gets 4H + D, a 4H
 * chart only D, a daily chart none (`CHART_TF_NOT_BELOW`).
 *
 * THE ONE SESSION OWNER. Day boundaries are `sessionKeyOf(sessionWindowFor(…))`
 * — RTH / ETH for US equities (the chart's own Extended Hours mode), the
 * Globex / FX day, the ET day for a continuous market. 1H / 4H buckets are
 * `clockBucketOf` from the same owner: clock-aligned, never across a session.
 *
 * COMPLETE MEANS COMPLETE.
 *   end   — a later loaded bar lies outside the bucket, OR the bucket's last
 *           bar is its final slot (the next slot is outside the bucket) and
 *           the wall clock (`asOfSec`, omitted during replay) says that bar
 *           has closed. The forming bucket never counts.
 *   start — the oldest loaded bucket counts only when the slot before the
 *           first loaded bar is outside it (the history did not begin mid-bucket).
 *
 * PURE. DETERMINISTIC (given `asOfSec`). No fetch, no storage, no React.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { clockBucketOf, sessionKeyOf, type SessionWindow } from "@/lib/marketData/sessionWindow";

export const MTF_ANCESTRY_VERSION = 1;
/** How many completed 4H bars the ancestry search walks back through. */
export const MAX_BAND_LOOKBACK = 6;
/** A node row joins the peak's shoulder at ≥ this share of the peak's volume. */
export const NODE_SHOULDER = 0.85;
/** Past this many rows the bin coarsens (to a whole number of price steps). */
export const MAX_NODE_BINS = 1000;

export type MtfTf = "1H" | "4H" | "D";
export const MTF_SPAN_MINUTES: Readonly<Record<MtfTf, number>> = { "1H": 60, "4H": 240, D: 1440 };

/** The chart's own bar shape (M8: no private bar shapes) — only what resampling reads. */
export type MtfBar = Pick<LegacyOhlcvTuple, "time" | "open" | "high" | "low" | "close"> & {
  readonly volume?: LegacyOhlcvTuple["volume"] | null;
};

export type MtfSilenceReason =
  | "NO_BARS"
  | "CHART_TF_NOT_BELOW"
  | "NO_SESSION"
  | "NO_COMPLETE_BAR"
  | "NO_VOLUME";

export interface MtfSilence {
  readonly kind: "SILENT";
  readonly tf: MtfTf;
  readonly reason: MtfSilenceReason;
}

/** One resampled, COMPLETE higher-timeframe bar. */
export type HtfBar = Pick<LegacyOhlcvTuple, "open" | "high" | "low" | "close"> & {
  readonly tf: MtfTf;
  readonly key: string;
  /** The first constituent bar's open time (the bar's own time on the chart). */
  readonly firstTime: number;
  /** The last constituent bar's open time. */
  readonly lastTime: number;
  readonly bars: number;
  /** Index range into the input bars, inclusive. */
  readonly i0: number;
  readonly i1: number;
};

export interface MtfShelf {
  readonly kind: "SHELF";
  readonly tf: "D";
  /** The session key of the completed day (its trading date). */
  readonly day: string;
  readonly firstTime: number;
  readonly pdh: number;
  readonly pdl: number;
  readonly level: "PDH" | "PDL";
  readonly price: number;
  /** Where the newest close sits relative to the shelf. */
  readonly side: "ABOVE" | "BELOW" | "AT";
}

export interface MtfBand {
  readonly kind: "BAND";
  readonly tf: "4H";
  /** The ancestor 4H bar's first bar time — "which bar". */
  readonly firstTime: number;
  readonly lastTime: number;
  readonly low: number;
  readonly high: number;
  readonly relation: "INSIDE" | "NEAREST";
  /** Price distance from the newest close to the body (0 when INSIDE). */
  readonly distance: number;
  /** 0 = the newest completed 4H bar, 1 = the one before, … */
  readonly age: number;
}

export interface MtfNode {
  readonly kind: "NODE";
  readonly tf: "1H";
  readonly firstTime: number;
  readonly lastTime: number;
  /** The peak row's price (centre of the peak run, on the bin grid). */
  readonly price: number;
  /** The node band: the peak and its shoulder. */
  readonly low: number;
  readonly high: number;
  readonly bin: number;
  /** Share of the hour's volume inside the node band, 0–1. */
  readonly share: number;
}

export interface MtfAncestryVM {
  readonly version: number;
  /** The newest close the elements are read against; null with no bars. */
  readonly price: number | null;
  readonly shelf: MtfShelf | MtfSilence;
  readonly band: MtfBand | MtfSilence;
  readonly node: MtfNode | MtfSilence;
  /** `SHELF:D:PDL@412.30|BAND:4H:@<unix>:INSIDE|NODE:1H:@410.25` (or `…:SILENT:<reason>`). */
  readonly receipt: string;
}

export interface MtfAncestryInput {
  readonly bars: readonly MtfBar[];
  /** `sessionWindowFor(symbol, timeframe, extendedHours)` — the one session owner. */
  readonly window: SessionWindow;
  /** The chart bar's length in seconds. */
  readonly chartSec: number;
  /** The market's quoted decimals (pricePrecision) — the chart's price step is 10^-precision. */
  readonly precision: number;
  /** Wall clock (unix s). Omit during replay: only later bars can then close a bucket. */
  readonly asOfSec?: number | null;
  /** Optional per-bar clock memo across frames (same symbol / timeframe / session mode). */
  readonly memo?: Map<string, string | null>;
}

const silent = (tf: MtfTf, reason: MtfSilenceReason): MtfSilence => ({ kind: "SILENT", tf, reason });

/** The bucket key of a time for a timeframe, through the one session owner. */
function keyFn(tf: MtfTf, win: SessionWindow, memo: Map<string, string | null> | undefined) {
  return (sec: number): string | null => {
    const mk = `${tf}:${sec}`;
    if (memo?.has(mk)) return memo.get(mk)!;
    const k = tf === "D" ? sessionKeyOf(sec, win) : clockBucketOf(sec, win, MTF_SPAN_MINUTES[tf])?.key ?? null;
    memo?.set(mk, k);
    return k;
  };
}

/**
 * The newest `want` COMPLETE buckets of `tf`, newest first. Walks the bars
 * from the newest backwards and stops as soon as it has them.
 */
export function completeHtfBars(
  bars: readonly MtfBar[],
  tf: MtfTf,
  win: SessionWindow,
  chartSec: number,
  want: number,
  asOfSec?: number | null,
  memo?: Map<string, string | null>,
): HtfBar[] {
  const out: HtfBar[] = [];
  if (bars.length === 0 || want <= 0) return out;
  const keyOf = keyFn(tf, win, memo);
  let i = bars.length - 1;
  let laterBarOutside = false; // a bar newer than the current group, in no bucket or another one
  while (i >= 0 && out.length < want) {
    const k = keyOf(Number(bars[i].time));
    if (k == null) { laterBarOutside = true; i--; continue; }
    const i1 = i;
    while (i - 1 >= 0 && keyOf(Number(bars[i - 1].time)) === k) i--;
    const i0 = i;
    i--;
    const last = bars[i1];
    const nextSlot = Number(last.time) + chartSec;
    const closedAtEnd = laterBarOutside
      || (keyOf(nextSlot) !== k && asOfSec != null && Number.isFinite(asOfSec) && asOfSec >= nextSlot);
    const openAtStart = i0 > 0 || keyOf(Number(bars[0].time) - chartSec) !== k;
    laterBarOutside = true;
    if (!closedAtEnd || !openAtStart) continue;
    let high = -Infinity, low = Infinity, ok = true;
    for (let j = i0; j <= i1; j++) {
      const b = bars[j];
      if (!Number.isFinite(b.high) || !Number.isFinite(b.low)) { ok = false; break; }
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
    }
    const open = bars[i0].open, close = bars[i1].close;
    if (!ok || !Number.isFinite(open) || !Number.isFinite(close)) continue;
    out.push({ tf, key: k, firstTime: Number(bars[i0].time), lastTime: Number(bars[i1].time), open, high, low, close, bars: i1 - i0 + 1, i0, i1 });
  }
  return out;
}

const fmt = (v: number, dp: number) => v.toFixed(dp);

export function selectMtfAncestry(input: MtfAncestryInput): MtfAncestryVM {
  const { bars, window: win, chartSec, asOfSec, memo } = input;
  const dp = Math.max(0, Math.min(8, Math.round(Number.isFinite(input.precision) ? input.precision : 2)));
  const step = 10 ** -dp;
  const newest = bars.length ? bars[bars.length - 1] : null;
  const price = newest && Number.isFinite(newest.close) ? newest.close : null;

  const chartMin = chartSec / 60;
  const above = (tf: MtfTf) => win.kind !== "DAILY_WINDOW" && chartSec > 0 && chartMin < MTF_SPAN_MINUTES[tf];
  const gate = (tf: MtfTf): MtfSilence | null =>
    price == null ? silent(tf, "NO_BARS")
    : !above(tf) ? silent(tf, "CHART_TF_NOT_BELOW")
    : null;
  const noSession = (tf: MtfTf): MtfSilence | null => {
    // The owner puts no loaded bar in any session: a named silence, not "incomplete".
    const keyOf = keyFn(tf, win, memo);
    for (let i = bars.length - 1; i >= 0 && i >= bars.length - 500; i--) if (keyOf(Number(bars[i].time)) != null) return null;
    return silent(tf, "NO_SESSION");
  };

  // ── D SHELF ───────────────────────────────────────────────────────────
  let shelf: MtfShelf | MtfSilence = gate("D") ?? noSession("D") ?? silent("D", "NO_COMPLETE_BAR");
  if (shelf.kind === "SILENT" && shelf.reason === "NO_COMPLETE_BAR" && price != null) {
    const [day] = completeHtfBars(bars, "D", win, chartSec, 1, asOfSec, memo);
    if (day) {
      const dH = Math.abs(price - day.high), dL = Math.abs(price - day.low);
      const level = dH < dL ? "PDH" : "PDL";
      const lp = level === "PDH" ? day.high : day.low;
      shelf = {
        kind: "SHELF", tf: "D", day: day.key, firstTime: day.firstTime,
        pdh: day.high, pdl: day.low, level, price: lp,
        side: price > lp ? "ABOVE" : price < lp ? "BELOW" : "AT",
      };
    }
  }

  // ── 4H ANCESTRY BAND ──────────────────────────────────────────────────
  let band: MtfBand | MtfSilence = gate("4H") ?? noSession("4H") ?? silent("4H", "NO_COMPLETE_BAR");
  if (band.kind === "SILENT" && band.reason === "NO_COMPLETE_BAR" && price != null) {
    const fours = completeHtfBars(bars, "4H", win, chartSec, MAX_BAND_LOOKBACK, asOfSec, memo);
    let best: { b: HtfBar; age: number; d: number } | null = null;
    for (let age = 0; age < fours.length; age++) {
      const b = fours[age];
      const lo = Math.min(b.open, b.close), hi = Math.max(b.open, b.close);
      const d = price < lo ? lo - price : price > hi ? price - hi : 0;
      if (d === 0) { best = { b, age, d }; break; }
      if (!best || d < best.d) best = { b, age, d };
    }
    if (best) {
      const b = best.b;
      band = {
        kind: "BAND", tf: "4H", firstTime: b.firstTime, lastTime: b.lastTime,
        low: Math.min(b.open, b.close), high: Math.max(b.open, b.close),
        relation: best.d === 0 ? "INSIDE" : "NEAREST", distance: best.d, age: best.age,
      };
    }
  }

  // ── 1H NODE ───────────────────────────────────────────────────────────
  let node: MtfNode | MtfSilence = gate("1H") ?? noSession("1H") ?? silent("1H", "NO_COMPLETE_BAR");
  if (node.kind === "SILENT" && node.reason === "NO_COMPLETE_BAR" && price != null) {
    const [hour] = completeHtfBars(bars, "1H", win, chartSec, 1, asOfSec, memo);
    if (hour) {
      const members = bars.slice(hour.i0, hour.i1 + 1);
      const vol = (b: MtfBar) => (typeof b.volume === "number" && Number.isFinite(b.volume) && b.volume > 0 ? b.volume : 0);
      const total = members.reduce((s, b) => s + vol(b), 0);
      if (!(total > 0)) {
        node = silent("1H", "NO_VOLUME");
      } else {
        const lo = hour.low, hi = hour.high;
        let bin = step;
        if ((hi - lo) / bin + 1 > MAX_NODE_BINS) bin = Math.ceil((hi - lo) / (MAX_NODE_BINS - 1) / step) * step;
        const n = Math.max(1, Math.floor((hi - lo) / bin + 1e-9) + 1);
        const rows = new Float64Array(n);
        const idx = (p: number) => Math.min(n - 1, Math.max(0, Math.floor((p - lo) / bin + 1e-9)));
        for (const b of members) {
          const v = vol(b);
          if (v <= 0) continue;
          const a = idx(b.low), z = idx(b.high);
          const each = v / (z - a + 1);
          for (let r = a; r <= z; r++) rows[r] += each;
        }
        let peak = 0;
        for (let r = 1; r < n; r++) if (rows[r] > rows[peak] * (1 + 1e-9)) peak = r;
        const top = rows[peak];
        // The peak run (equal rows beside the first peak), then its shoulder.
        let p0 = peak, p1 = peak;
        while (p1 + 1 < n && rows[p1 + 1] >= top * (1 - 1e-9)) p1++;
        let s0 = p0, s1 = p1;
        while (s0 - 1 >= 0 && rows[s0 - 1] >= top * NODE_SHOULDER) s0--;
        while (s1 + 1 < n && rows[s1 + 1] >= top * NODE_SHOULDER) s1++;
        let inBand = 0;
        for (let r = s0; r <= s1; r++) inBand += rows[r];
        const centre = lo + ((p0 + p1 + 1) / 2) * bin;
        const snap = (v: number) => Number((Math.round(v / step) * step).toFixed(dp));
        node = {
          kind: "NODE", tf: "1H", firstTime: hour.firstTime, lastTime: hour.lastTime,
          price: snap(centre), low: snap(lo + s0 * bin), high: snap(lo + (s1 + 1) * bin),
          bin: Number(bin.toFixed(dp)), share: inBand / total,
        };
      }
    }
  }

  const part = (e: MtfShelf | MtfBand | MtfNode | MtfSilence): string => {
    const name = e.kind === "SILENT" ? (e.tf === "D" ? "SHELF" : e.tf === "4H" ? "BAND" : "NODE") : e.kind;
    if (e.kind === "SILENT") return `${name}:${e.tf}:SILENT:${e.reason}`;
    if (e.kind === "SHELF") return `SHELF:D:${e.level}@${fmt(e.price, dp)}`;
    if (e.kind === "BAND") return `BAND:4H:@${e.firstTime}:${e.relation}`;
    return `NODE:1H:@${fmt(e.price, dp)}`;
  };

  return {
    version: MTF_ANCESTRY_VERSION,
    price,
    shelf,
    band,
    node,
    receipt: [part(shelf), part(band), part(node)].join("|"),
  };
}

export default selectMtfAncestry;
