/**
 * THE BUS · CLEAN RUNWAY (Founder 2026-10-20 08:46: "when the bus start moving, it always has … a clean runway";
 * 11-05: "don't try to get on the bus late").
 *
 *   BREAK     the newest close beyond a confirmed swing (a close above a swing high = the bus leaving UP,
 *             below a swing low = DOWN) inside the last BUS_LOOKBACK_BARS bars.
 *   RUNWAY    from that break level to the next mapped obstacle in the bus's direction beyond price (a wall,
 *             a zone edge, a named level, an older swing) — or OPEN when nothing mapped stands ahead.
 *   STATE     measured from where price is now on that road:
 *               STALLED     price closed back behind the break level
 *               BOARDABLE   price has travelled < half the runway since the break
 *               LEFT        price has travelled ≥ half — the late seat
 *               ARRIVED     price reached the obstacle
 *
 * Every price is one the market printed or an obstacle the room already compiled. Nothing is projected.
 * PURE. DETERMINISTIC. No React, no canvas, no clock.
 */

export interface RunwayBar { readonly time: number; readonly high: number; readonly low: number; readonly close: number }
export interface RunwaySwing { readonly time: number; readonly price: number }
export interface RunwayObstacle { readonly price: number; readonly name: string }

export type BusState = "BOARDABLE" | "LEFT" | "STALLED" | "ARRIVED";

export interface BusRunway {
  readonly drawn: true;
  readonly dir: "UP" | "DOWN";
  readonly breakLevel: number;
  readonly breakTime: number;
  /** The bar the break CLOSED on (unix s). */
  readonly breakBarTime: number;
  /** The obstacle ahead, or null for an OPEN runway. */
  readonly target: RunwayObstacle | null;
  readonly price: number;
  /** 0–1 of the runway travelled (null when OPEN). */
  readonly travelled: number | null;
  readonly state: BusState;
}
export type BusRunwayVerdict = BusRunway | { readonly drawn: false; readonly reason: "NO_BARS" | "NO_SWINGS" | "NO_BREAK" };

export const BUS_LOOKBACK_BARS = 40;
export const BOARDABLE_SHARE = 0.5;

export function selectBusRunway(input: {
  readonly bars: readonly RunwayBar[];
  readonly swingHighs: readonly RunwaySwing[];
  readonly swingLows: readonly RunwaySwing[];
  readonly obstacles: readonly RunwayObstacle[];
}): BusRunwayVerdict {
  const { bars } = input;
  if (bars.length < 5) return { drawn: false, reason: "NO_BARS" };
  if (!input.swingHighs.length && !input.swingLows.length) return { drawn: false, reason: "NO_SWINGS" };
  const from = Math.max(1, bars.length - BUS_LOOKBACK_BARS);
  let brk: { dir: "UP" | "DOWN"; level: number; swingTime: number; i: number } | null = null;
  for (let i = bars.length - 1; i >= from && !brk; i--) {
    const b = bars[i], p = bars[i - 1];
    // Only swings confirmed BEFORE this bar can be broken by it.
    const hs = input.swingHighs.filter(s => s.time < b.time);
    const ls = input.swingLows.filter(s => s.time < b.time);
    const hi = hs[hs.length - 1], lo = ls[ls.length - 1];
    if (hi && b.close > hi.price && p.close <= hi.price) brk = { dir: "UP", level: hi.price, swingTime: hi.time, i };
    else if (lo && b.close < lo.price && p.close >= lo.price) brk = { dir: "DOWN", level: lo.price, swingTime: lo.time, i };
  }
  if (!brk) return { drawn: false, reason: "NO_BREAK" };
  const price = bars[bars.length - 1].close;
  const up = brk.dir === "UP";
  const edge = up ? Math.max(brk.level, price) : Math.min(brk.level, price);
  const ahead = input.obstacles.filter(o => Number.isFinite(o.price) && (up ? o.price > edge : o.price < edge));
  // Older swings on the road are obstacles too (a prior high is where sellers stood).
  const swingObs: RunwayObstacle[] = (up ? input.swingHighs : input.swingLows)
    .filter(s => s.time < brk!.swingTime && (up ? s.price > edge : s.price < edge))
    .map(s => ({ price: s.price, name: up ? "PRIOR SWING HIGH" : "PRIOR SWING LOW" }));
  const cands = [...ahead, ...swingObs].sort((a, b) => (up ? a.price - b.price : b.price - a.price));
  const target = cands[0] ?? null;
  const backBehind = up ? price < brk.level : price > brk.level;
  let travelled: number | null = null;
  if (target) {
    const road = Math.abs(target.price - brk.level);
    travelled = road > 0 ? Math.max(0, Math.min(1, (up ? price - brk.level : brk.level - price) / road)) : 1;
  }
  const state: BusState = backBehind ? "STALLED" : travelled != null && travelled >= 0.999 ? "ARRIVED" : travelled != null && travelled >= BOARDABLE_SHARE ? "LEFT" : "BOARDABLE";
  return { drawn: true, dir: brk.dir, breakLevel: brk.level, breakTime: brk.swingTime, breakBarTime: bars[brk.i].time, target, price, travelled, state };
}

export function busReceipt(v: BusRunwayVerdict): string {
  if (!v.drawn) return v.reason;
  return `${v.dir}:${v.state}|BREAK:${v.breakLevel}|TO:${v.target ? `${v.target.name}@${v.target.price}` : "OPEN"}|T:${v.travelled == null ? "-" : v.travelled.toFixed(2)}`;
}
