/**
 * PLATE 27 · AGGRESSIVE, PASSIVE, ESTIMATED — Garden 19 finish line (Founder 2026-10-15).
 *
 * "Different evidence gets a different shape. Aggressive orders push, so they are wedges.
 * Resting orders hold, so they are shelves. Estimates are hatched and say so."
 *
 * Serving 746945f painted Aggressive/Passive as 17 tinted rings on the 3 newest bars (the
 * only bars the held tape reached), each with a price printed inside — a third bubble type
 * nobody could read. This owner replaces it with three shapes, each from its own evidence:
 *
 *   WEDGE    a bar where market orders clearly pushed one way (its own buy vs sell volume:
 *            held tape, else the provider's bar bid / ask volume). ▲ under the low for buyers,
 *            ▼ over the high for sellers, sized by how hard. Only the strongest few speak.
 *   SHELF    a price that was tested and held — the bars came back to it at least twice and
 *            did not close through it. "Buyers held 3×". When the held tape reaches every
 *            test, the volume that traded INTO the shelf is named ("1,240 sold into them").
 *   HATCHED  bars with no buy / sell count at all: their split is estimated from where the
 *            bar closed in its range, and the region says "Estimated". An estimate never
 *            outranks a count — wedges come from estimates only when nothing on camera is counted.
 *
 * Pure: no canvas, no React. MainChart paints what this returns.
 */

export type FlowSource = "TAPE" | "BAR_SIDES" | "ESTIMATED";

/** What this owner reads of a bar (a projection of the chart's own bar — the open is never read). */
export interface EvidenceBar {
  readonly time: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  /** Counted buy / sell volume (held tape, else the provider's bar sides); null when not counted. */
  readonly counted: { readonly buy: number; readonly sell: number; readonly source: "TAPE" | "BAR_SIDES" } | null;
}

export interface BarFlow { readonly time: number; readonly buy: number; readonly sell: number; readonly source: FlowSource }

/** A bar's split: counted when it is, else estimated from where it closed in its range (close-location × volume). */
export function barFlow(b: EvidenceBar): BarFlow | null {
  if (b.counted && b.counted.buy + b.counted.sell > 0) return { time: b.time, buy: b.counted.buy, sell: b.counted.sell, source: b.counted.source };
  const range = b.high - b.low;
  if (!(b.volume > 0) || !(range > 0)) return null;
  const buy = b.volume * ((b.close - b.low) / range);
  return { time: b.time, buy, sell: b.volume - buy, source: "ESTIMATED" };
}

/* ── WEDGES ─────────────────────────────────────────────────────────────── */

export interface Wedge {
  readonly time: number;
  readonly side: "buy" | "sell";
  readonly delta: number;
  /** 0..1 — |delta| against the strongest wedge on camera (sizes the shape). */
  readonly strength: number;
  readonly estimated: boolean;
}

/** A bar's net must be at least this share of its traded volume to count as a push. */
export const WEDGE_MIN_SHARE = 0.25;
/**
 * …and at least this share of the strongest push on camera. 0.4 → 0.15 (serving f203fb2, NQ1! 5m,
 * 60 bars): one bar at −396 against a field of ±50 left ONE wedge on the glass; the plate shows the
 * strongest several. The budget below, by rank, keeps it to the few that matter.
 */
export const WEDGE_MIN_OF_PEAK = 0.15;

/** How many wedges may speak for `n` bars on camera: about one in six, 3..8. */
export function wedgeBudget(n: number): number {
  return Math.max(3, Math.min(8, Math.round(n / 6)));
}

export function chooseWedges(flows: readonly BarFlow[]): Wedge[] {
  const counted = flows.filter(f => f.source !== "ESTIMATED");
  const pool = counted.length > 0 ? counted : flows;
  const cands = pool
    .map(f => ({ f, d: f.buy - f.sell, tot: f.buy + f.sell }))
    .filter(c => c.tot > 0 && Math.abs(c.d) / c.tot >= WEDGE_MIN_SHARE);
  const peak = cands.reduce((m, c) => Math.max(m, Math.abs(c.d)), 0);
  if (!(peak > 0)) return [];
  const chosen = cands
    .filter(c => Math.abs(c.d) >= peak * WEDGE_MIN_OF_PEAK)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, wedgeBudget(flows.length));
  return chosen
    .map(c => ({ time: c.f.time, side: c.d > 0 ? "buy" as const : "sell" as const, delta: c.d, strength: Math.sqrt(Math.abs(c.d) / peak), estimated: c.f.source === "ESTIMATED" }))
    .sort((a, b) => a.time - b.time);
}

/** Wedge base width in px: 10 (weakest that speaks) .. 20 (the strongest), never wider than the bar slot allows. */
export function wedgeWidth(strength: number, barSpacing: number): number {
  return Math.max(8, Math.min(10 + 10 * Math.max(0, Math.min(1, strength)), Math.max(8, barSpacing * 1.6)));
}

/* ── SHELVES ────────────────────────────────────────────────────────────── */

export interface Shelf {
  readonly side: "buyers" | "sellers";
  readonly price: number;
  /** Bar times of every test (the first touch included). */
  readonly tests: readonly number[];
  readonly holds: number;
  /** Volume that traded into the shelf on its tests, when the held tape reaches every test; else null. */
  readonly volume: number | null;
  /** Closed through after the last test. */
  readonly broken: boolean;
}

/** Bars between two touches for them to count as separate tests (a two-bar wick is one test). */
export const SHELF_MIN_GAP = 2;
export const SHELF_MAX_PER_SIDE = 2;
export const SHELF_MAX = 3;

/** The price tolerance a test may miss by: two ticks, or 8% of the median bar range, whichever is larger. */
export function shelfTolerance(bars: readonly { high: number; low: number }[], tick: number): number {
  const ranges = bars.map(b => b.high - b.low).filter(r => r > 0).sort((a, b) => a - b);
  const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
  return Math.max(tick > 0 ? tick * 2 : 0, med * 0.08);
}

/**
 * Prices the market came back to and held. `volumeInto(time, lo, hi, side)` returns the counted
 * volume that traded into [lo, hi] on that bar from the side that pushed into the shelf (sellers
 * into a buyers' shelf, buyers into a sellers'), or null when the held tape does not reach it.
 */
export function findShelves(
  bars: readonly EvidenceBar[], tol: number,
  volumeInto?: (time: number, lo: number, hi: number, side: "buyers" | "sellers") => number | null,
): Shelf[] {
  const out: Shelf[] = [];
  if (!(tol > 0) || bars.length < SHELF_MIN_GAP + 1) return out;
  for (const side of ["buyers", "sellers"] as const) {
    const found: Shelf[] = [];
    for (let i = 0; i < bars.length; i++) {
      const L = side === "buyers" ? bars[i].low : bars[i].high;
      if (found.some(s => Math.abs(s.price - L) <= tol * 3)) continue;
      const touches = [i];
      let broken = false;
      for (let j = i + 1; j < bars.length; j++) {
        const b = bars[j];
        const through = side === "buyers" ? b.close < L - tol : b.close > L + tol;
        if (through) { broken = true; break; }
        const edge = side === "buyers" ? b.low : b.high;
        if (Math.abs(edge - L) <= tol && j - touches[touches.length - 1] >= SHELF_MIN_GAP) touches.push(j);
      }
      if (touches.length < 2) continue;
      let volume: number | null = null;
      if (volumeInto) {
        let sum = 0, all = true;
        for (const k of touches) {
          const v = volumeInto(bars[k].time, L - tol, L + tol, side);
          if (v == null) { all = false; break; }
          sum += v;
        }
        volume = all && sum > 0 ? sum : null;
      }
      found.push({ side, price: L, tests: touches.map(k => bars[k].time), holds: touches.length, volume, broken });
    }
    found.sort((a, b) => b.holds - a.holds || b.tests[b.tests.length - 1] - a.tests[a.tests.length - 1]);
    out.push(...found.slice(0, SHELF_MAX_PER_SIDE));
  }
  return out
    .sort((a, b) => b.holds - a.holds || b.tests[b.tests.length - 1] - a.tests[a.tests.length - 1])
    .slice(0, SHELF_MAX);
}

/** "Buyers held 3× · 1,240 sold into them" — plain words, the count only when it was counted. */
export function shelfWords(s: Shelf, fmtVolume: (v: number) => string = v => Math.round(v).toLocaleString("en-US")): string {
  const who = s.side === "buyers" ? "Buyers" : "Sellers";
  const into = s.volume != null ? ` · ${fmtVolume(s.volume)} ${s.side === "buyers" ? "sold" : "bought"} into them` : "";
  // A shelf price later closed through still held those tests — and the words say it did not last.
  return `${who} held ${s.holds}×${into}${s.broken ? ", then broke" : ""}`;
}

/* ── ESTIMATED RUNS ─────────────────────────────────────────────────────── */

export interface EstimatedRun { readonly from: number; readonly to: number; readonly bars: number }

/** Contiguous bars whose split is estimated (no counted buy / sell volume). */
export function estimatedRuns(flows: readonly (BarFlow | null)[], times: readonly number[]): EstimatedRun[] {
  const runs: EstimatedRun[] = [];
  let start = -1;
  for (let i = 0; i <= flows.length; i++) {
    const est = i < flows.length && flows[i]?.source === "ESTIMATED";
    if (est && start < 0) start = i;
    if (!est && start >= 0) { runs.push({ from: times[start], to: times[i - 1], bars: i - start }); start = -1; }
  }
  return runs;
}

/* ── LEGEND + RECEIPT ───────────────────────────────────────────────────── */

export const EVIDENCE_LEGEND = {
  wedge: "Aggressive: market orders pushing",
  shelf: "Passive: prices that held",
  estimated: "Estimated from bars",
} as const;

/** "W:3B/2S|S:BUYERS@30075x3,SELLERS@30210x2|E:1" */
export function evidenceReceipt(wedges: readonly Wedge[], shelves: readonly Shelf[], runs: readonly EstimatedRun[]): string {
  const b = wedges.filter(w => w.side === "buy").length, s = wedges.length - b;
  const sh = shelves.map(x => `${x.side.toUpperCase()}@${x.price}x${x.holds}${x.volume != null ? "v" : ""}${x.broken ? "!" : ""}`).join(",") || "NONE";
  return `W:${b}B/${s}S|S:${sh}|E:${runs.length}`;
}
