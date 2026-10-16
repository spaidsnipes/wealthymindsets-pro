/**
 * PLATE 29 · THE TAPE'S OWN INDICATORS (Garden 19 finish line, Founder 2026-10-15).
 *
 *   TAPE SPEED       prints per second in each bar ("31 prints/sec · fast")
 *   TRADE SIZE MIX   each bar's volume split into large / mid / small prints ("Large 22% · Mid 26% · Small 52%")
 *   SWEEPS           one aggressor walking through ≥ SWEEP_MIN_LEVELS prices in a burst ("⚡ Buy sweep · 4 levels")
 *
 * All three read the individual prints the chart holds (MainChart's print store, one row per execution,
 * its own timestamp). The provider's time-and-sale history reaches back ~10 minutes, so these exist only
 * on bars the tape reached — every pane says from when. Never estimated from bars. Pure: no canvas.
 */

export interface TapePrint {
  readonly price: number;
  /** Seller-initiated size. */
  readonly bid: number;
  /** Buyer-initiated size. */
  readonly ask: number;
  readonly timeMs?: number;
}

const size = (p: TapePrint) => (p.bid > 0 ? p.bid : 0) + (p.ask > 0 ? p.ask : 0);

/* ── TAPE SPEED ─────────────────────────────────────────────────────────── */

/** Prints per second over `seconds` (the bar's length, or the time elapsed in a forming bar). */
export function tapeSpeed(prints: readonly TapePrint[], seconds: number): number | null {
  if (!(seconds > 0)) return null;
  const n = prints.filter(p => size(p) > 0).length;
  return n / seconds;
}

/** A bar is FAST at twice the median speed of the bars the tape reached, or more. */
export const TAPE_FAST_MULTIPLE = 2;

export function medianOf(values: readonly number[]): number | null {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}

/** "31 prints/sec · fast" / "4.2 prints/sec" */
export function tapeSpeedWords(pps: number | null, median: number | null): string | null {
  if (pps == null || !Number.isFinite(pps)) return null;
  const n = pps >= 10 ? Math.round(pps).toString() : pps.toFixed(1);
  const fast = median != null && median > 0 && pps >= median * TAPE_FAST_MULTIPLE;
  return `${n} prints/sec${fast ? " · fast" : ""}`;
}

/* ── TRADE SIZE MIX ─────────────────────────────────────────────────────── */

export interface SizeCuts { readonly small: number; readonly large: number }

/** Session cuts from every held print: small = under the median size, large = the top tenth (≥ p90). */
export function sizeCuts(all: Iterable<readonly TapePrint[]>): SizeCuts | null {
  const sizes: number[] = [];
  for (const bar of all) for (const p of bar) { const s = size(p); if (s > 0) sizes.push(s); }
  if (sizes.length < 20) return null;
  sizes.sort((a, b) => a - b);
  const q = (f: number) => sizes[Math.min(sizes.length - 1, Math.floor(f * sizes.length))];
  const small = q(0.5), large = Math.max(q(0.9), small + Number.EPSILON);
  return { small, large };
}

export interface SizeMix { readonly large: number; readonly mid: number; readonly small: number }

/** The bar's VOLUME by print size (shares 0..1, summing to 1); null when the bar holds no prints. */
export function tradeSizeMix(prints: readonly TapePrint[], cuts: SizeCuts): SizeMix | null {
  let L = 0, M = 0, S = 0;
  for (const p of prints) {
    const s = size(p);
    if (!(s > 0)) continue;
    if (s >= cuts.large) L += s; else if (s < cuts.small) S += s; else M += s;
  }
  const t = L + M + S;
  return t > 0 ? { large: L / t, mid: M / t, small: S / t } : null;
}

/** "Large 22% · Mid 26% · Small 52%" */
export function sizeMixWords(m: SizeMix | null): string | null {
  if (!m) return null;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return `Large ${pct(m.large)} · Mid ${pct(m.mid)} · Small ${pct(m.small)}`;
}

/* ── SWEEPS ─────────────────────────────────────────────────────────────── */

export const SWEEP_MIN_LEVELS = 3;
/** Prints in one sweep follow each other within this many ms. */
export const SWEEP_GAP_MS = 300;

export interface Sweep {
  readonly side: "buy" | "sell";
  readonly levels: number;
  readonly from: number;
  readonly to: number;
  readonly timeMs: number;
  readonly size: number;
}

/**
 * One side's prints in a burst (each within SWEEP_GAP_MS of the last), walking the book in its own
 * direction (buys up, sells down, never back), through at least SWEEP_MIN_LEVELS distinct prices.
 * Prints without a timestamp cannot be put in order and are not read.
 */
export function findSweeps(prints: readonly TapePrint[], tick: number): Sweep[] {
  const rows = prints
    .filter(p => p.timeMs != null && size(p) > 0 && (p.ask > 0) !== (p.bid > 0))
    .slice()
    .sort((a, b) => (a.timeMs as number) - (b.timeMs as number));
  const out: Sweep[] = [];
  const key = (px: number) => (tick > 0 ? Math.round(px / tick) : px);
  let run: TapePrint[] = [];
  const flush = () => {
    if (run.length >= SWEEP_MIN_LEVELS) {
      const side = run[0].ask > 0 ? "buy" as const : "sell" as const;
      const levels = new Set(run.map(p => key(p.price))).size;
      if (levels >= SWEEP_MIN_LEVELS) {
        out.push({ side, levels, from: run[0].price, to: run[run.length - 1].price, timeMs: run[0].timeMs as number, size: run.reduce((s, p) => s + size(p), 0) });
      }
    }
    run = [];
  };
  for (const p of rows) {
    const last = run[run.length - 1];
    const sameSide = last && (last.ask > 0) === (p.ask > 0);
    const inTime = last && (p.timeMs as number) - (last.timeMs as number) <= SWEEP_GAP_MS;
    const onward = last && (p.ask > 0 ? p.price >= last.price : p.price <= last.price);
    if (last && sameSide && inTime && onward) run.push(p);
    else { flush(); run = [p]; }
  }
  flush();
  return out;
}

/** "⚡ Buy sweep · 4 levels" */
export function sweepWords(s: Sweep): string {
  return `⚡ ${s.side === "buy" ? "Buy" : "Sell"} sweep · ${s.levels} levels`;
}
