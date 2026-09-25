/**
 * LIQUIDITY LIFECYCLE — the Founder's "Liquidity Weather Heatmap" mockup
 * (APPEARED → GREW → PERSISTED → TOUCHED → REFILLED → CONSUMED → PULLED),
 * F08 liquidity lifecycle on the SAME camera.
 *
 * WHAT A POOL IS HERE. This feed carries no order-book depth, so a resting
 * pool cannot be seen directly. What the bars CAN show is where volume
 * accumulated at price: a pool is a volume-by-price node (a row whose
 * accumulated volume is a local peak and well above the median row). Volume
 * is spread over each bar's range — CANDLE-ESTIMATED, and labelled so.
 *
 * STAGES, each a measured event on the bars (never a forecast):
 *   APPEARED   the row first qualifies as a node
 *   GREW       its volume has risen ≥ GROWTH since it appeared
 *   PERSISTED  it has qualified for ≥ PERSIST_STEPS consecutive steps
 *   TOUCHED    price traded back into it after ≥ AWAY_BARS bars away
 *   REFILLED   after a touch, volume at the row grew again ≥ GROWTH
 *   CONSUMED   price closed through it and stayed beyond for HOLD_BARS
 *   PULLED     REFUSED on this feed: a pull is resting size leaving the
 *              book without trading, which only book depth can show.
 *
 * PURE. DETERMINISTIC.
 */

export const LIQUIDITY_LIFECYCLE_VERSION = 1;
export const STEP_BARS = 4;
export const PERSIST_STEPS = 3;
export const GROWTH = 0.3;
export const AWAY_BARS = 3;
export const HOLD_BARS = 3;
export const MAX_POOLS = 6;

export type LifecycleStage = "APPEARED" | "GREW" | "PERSISTED" | "TOUCHED" | "REFILLED" | "CONSUMED";
export const STAGE_ORDER: readonly (LifecycleStage | "PULLED")[] = ["APPEARED", "GREW", "PERSISTED", "TOUCHED", "REFILLED", "CONSUMED", "PULLED"];
export const PULLED_REFUSAL = "PULLED needs order-book depth — this feed has none, so no pool is ever called pulled";

export interface LifecycleBar { readonly time: number; readonly high: number; readonly low: number; readonly close: number; readonly volume: number }

export interface LiquidityPool {
  readonly price: number;
  readonly low: number;
  readonly high: number;
  readonly stage: LifecycleStage;
  readonly events: readonly { readonly stage: LifecycleStage; readonly time: number }[];
  readonly volume: number;
}

export interface LiquidityLifecycleVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: "DRAWN" | "TOO_FEW_BARS" | "NO_VOLUME" | "NO_POOLS";
  readonly pools: readonly LiquidityPool[];
  readonly step: number;
  readonly basis: "CANDLE_ESTIMATED";
  readonly pulledRefusal: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export function selectLiquidityLifecycle(input: readonly LifecycleBar[] | null | undefined): LiquidityLifecycleVM {
  const bars = (input ?? []).filter(b => [b.time, b.high, b.low, b.close, b.volume].every(Number.isFinite) && b.high >= b.low);
  const base = { version: LIQUIDITY_LIFECYCLE_VERSION, basis: "CANDLE_ESTIMATED" as const, pulledRefusal: PULLED_REFUSAL };
  if (bars.length < STEP_BARS * (PERSIST_STEPS + 2)) return { ...base, drawn: false, reason: "TOO_FEW_BARS", pools: [], step: 0 };
  if (!bars.some(b => b.volume > 0)) return { ...base, drawn: false, reason: "NO_VOLUME", pools: [], step: 0 };

  const medRange = median(bars.map(b => b.high - b.low).filter(r => r > 0)) || 0.01;
  const step = +(medRange / 3).toFixed(8);
  const row = (p: number) => Math.floor(p / step);
  const vol = new Map<number, number>();

  type Track = { row: number; firstStep: number; firstVol: number; lastQualStep: number; streak: number;
    events: { stage: LifecycleStage; time: number }[]; awayBars: number; touched: boolean; touchVol: number;
    beyondBars: number; beyondSide: 0 | 1 | -1; consumed: boolean };
  const tracks = new Map<number, Track>();
  /** Rows within ±2 of a consumed pool: history, excluded from node slots and the peak. */
  const historyRows = new Set<number>();
  const add = (t: Track, stage: LifecycleStage, time: number) => { if (!t.events.some(e => e.stage === stage) || stage === "TOUCHED" || stage === "REFILLED") t.events.push({ stage, time }); };

  bars.forEach((b, i) => {
    // Spread the bar's volume over the rows it traded through.
    const r0 = row(b.low), r1 = row(b.high), n = r1 - r0 + 1;
    for (let r = r0; r <= r1; r++) vol.set(r, (vol.get(r) ?? 0) + b.volume / n);

    // Touch / consume bookkeeping for known pools, every bar.
    for (const t of tracks.values()) {
      if (t.consumed) continue;
      const inside = b.low <= (t.row + 1) * step && b.high >= t.row * step;
      if (inside) {
        if (t.awayBars >= AWAY_BARS) { add(t, "TOUCHED", b.time); t.touched = true; t.touchVol = vol.get(t.row) ?? 0; }
        t.awayBars = 0;
      } else t.awayBars++;
      const side: 1 | -1 | 0 = b.close > (t.row + 1) * step ? 1 : b.close < t.row * step ? -1 : 0;
      if (t.touched && side !== 0) {
        t.beyondBars = side === t.beyondSide ? t.beyondBars + 1 : 1;
        t.beyondSide = side;
        if (t.beyondBars >= HOLD_BARS) {
          // Consumed only if price crossed to the OTHER side of where it came from.
          const cameFrom = t.events.length ? Math.sign(bars[Math.max(0, i - HOLD_BARS - AWAY_BARS)].close - (t.row + 0.5) * step) : 0;
          if (cameFrom !== 0 && cameFrom !== side) {
            add(t, "CONSUMED", b.time); t.consumed = true;
            for (let d = -2; d <= 2; d++) historyRows.add(t.row + d);
          }
        }
      } else if (side === 0) { t.beyondBars = 0; }
      if (t.touched && !t.consumed && (vol.get(t.row) ?? 0) >= t.touchVol * (1 + GROWTH) && t.touchVol > 0) {
        add(t, "REFILLED", b.time); t.touchVol = vol.get(t.row) ?? 0;
      }
    }

    if ((i + 1) % STEP_BARS !== 0) return;
    const s = (i + 1) / STEP_BARS;
    // A CONSUMED pool is history: its rows no longer compete for the node
    // slots or set the bar a new pool must clear. They did — the heaviest
    // rows the loaded history ever built filled every slot and set the
    // peak, so no pool near today's price could be born (serving, NQ1! 5m:
    // six consumed pools, 0 painted, nothing live).
    // Kept as a set that grows only when a pool is consumed: scanning every
    // consumed pool for every row on every step doubled the selector's cost
    // at 5,000 bars (Sentinel, 2026-09-25).
    const rows = [...vol.entries()].filter(([r]) => !historyRows.has(r));
    if (rows.length === 0) return;
    // A node is a local peak carrying at least half the heaviest live row's volume.
    const peak = Math.max(...rows.map(([, v]) => v));
    const nodes = rows
      .filter(([r, v]) => v >= peak * 0.5 && v >= (vol.get(r - 1) ?? 0) && v >= (vol.get(r + 1) ?? 0))
      .sort((a, z) => z[1] - a[1])
      .slice(0, MAX_POOLS);
    for (const [r, v] of nodes) {
      const near = [...tracks.values()].find(t => Math.abs(t.row - r) <= 2);
      if (!near) {
        tracks.set(r, { row: r, firstStep: s, firstVol: v, lastQualStep: s, streak: 1, events: [{ stage: "APPEARED", time: b.time }],
          awayBars: 0, touched: false, touchVol: 0, beyondBars: 0, beyondSide: 0, consumed: false });
        continue;
      }
      if (near.consumed) continue;
      if (near.lastQualStep === s) continue; // one qualifying row per pool per step
      near.streak = near.lastQualStep === s - 1 ? near.streak + 1 : 1;
      near.lastQualStep = s;
      if (v >= near.firstVol * (1 + GROWTH)) add(near, "GREW", b.time);
      if (near.streak >= PERSIST_STEPS) add(near, "PERSISTED", b.time);
    }
  });

  const pools: LiquidityPool[] = [...tracks.values()]
    .map(t => {
      const events = [...t.events].sort((a, z) => a.time - z.time);
      return { price: (t.row + 0.5) * step, low: t.row * step, high: (t.row + 1) * step, stage: events[events.length - 1].stage, events, volume: vol.get(t.row) ?? 0 };
    })
    // LIVE LIQUIDITY FIRST. Ranked by volume alone, the heaviest pools the
    // loaded history ever built — long since consumed, off camera — filled
    // every slot, and the glass painted 0 of 6 while the caption said "6
    // pools" (serving, NQ1! 5m, 2026-09-25). A pool still standing outranks
    // any consumed one; among consumed, the most recently consumed; volume
    // breaks ties.
    .sort((a, z) => {
      const la = a.stage !== "CONSUMED" ? 1 : 0, lz = z.stage !== "CONSUMED" ? 1 : 0;
      if (la !== lz) return lz - la;
      if (!la) {
        const ta = a.events[a.events.length - 1]?.time ?? 0, tz = z.events[z.events.length - 1]?.time ?? 0;
        if (ta !== tz) return tz - ta;
      }
      return z.volume - a.volume;
    })
    .slice(0, MAX_POOLS);
  return { ...base, drawn: pools.length > 0, reason: pools.length ? "DRAWN" : "NO_POOLS", pools, step };
}

export default selectLiquidityLifecycle;
