/**
 * LIQUIDITY ON THE GLASS — the geometry the canon plates draw, as pure functions.
 *
 * F08A "liquidity lifecycle on the book": each pool is a glowing gold LADDER of
 * fine horizontal lines at its price, BOUNDED IN TIME by its lifecycle — it is
 * not on the glass before it APPEARED, and it stops where it was CONSUMED (or
 * runs to the live edge while it still stands). Dashed phase ticks mark each
 * lifecycle event.
 *
 * F08B "weather is a lens" (and FL06 ⑤ "Liquidity Weather (Lens)"): the weather
 * reading is a brass-ringed LENS over the price/time region its prints actually
 * landed in, with the colour field clipped inside the lens only and the words
 * set ON the ring, not stacked in a corner.
 *
 * Nothing here decides a market fact. The lifecycle owner
 * (selectLiquidityLifecycle) decides the events; the weather owner
 * (selectLiquidityWeatherGlass / selectHeatLens) decides the window and the
 * cells. This module only says where on the glass those facts go.
 *
 * PURE. DETERMINISTIC. No canvas.
 */

import type { LifecycleStage } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";

// ── F08A · THE POOL LADDER ──────────────────────────────────────────────────

/**
 * Rungs in the ladder once the pool has reached a stage. Maturity is FORM: a
 * pool that only appeared is two faint lines; one that grew, persisted and
 * refilled after a touch is a denser ladder. A TOUCH changes nothing about
 * the pool's depth, so it keeps the form it had. Never fewer rungs later —
 * a pool that persisted before it grew does not lose a rung when it grows.
 */
export const LADDER_RUNGS = { APPEARED: 2, GREW: 3, PERSISTED: 4, REFILLED: 5 } as const;

/** The small word printed over a phase tick (F08A's APPEAR / PERSIST / … labels). */
export const PHASE_WORD: Readonly<Record<LifecycleStage, string>> = {
  APPEARED: "APPEAR",
  GREW: "GREW",
  PERSISTED: "PERSIST",
  TOUCHED: "TOUCH",
  REFILLED: "REFILL",
  CONSUMED: "CONSUMED",
  PULLED: "PULLED",
};

/**
 * Each stage's one-line meaning, as plate F08A prints it under the stage word
 * ("PERSIST — resting liquidity, book builds"). Garden 18 §XLVI: learning
 * without lecture — the word names it, the line says what it means.
 */
export const PHASE_MEANING: Readonly<Record<LifecycleStage, string>> = {
  APPEARED: "liquidity appears",
  GREW: "size builds",
  PERSISTED: "resting liquidity holds",
  TOUCHED: "price tests it",
  REFILLED: "liquidity replenishes",
  CONSUMED: "traded away",
  PULLED: "left the book",
};

export interface PoolPhase {
  /** Form of the ladder from `fromTime` to `toTime` (null = the pool's end). */
  readonly rungs: number;
  readonly fromTime: number;
  readonly toTime: number | null;
}

export interface PoolSpan {
  /** APPEARED. The ladder does not exist on the glass before this bar. */
  readonly startTime: number;
  /** CONSUMED or PULLED bar, or null while the pool still stands (it runs to the live edge). */
  readonly endTime: number | null;
  readonly consumed: boolean;
  /** The size left an OBSERVED book without trading (book basis only). */
  readonly pulled: boolean;
  /** Consecutive stretches of one ladder form, in time order, covering start→end. */
  readonly phases: readonly PoolPhase[];
  /** One mark per lifecycle event, in time order. PULLED appears only on an observed book. */
  readonly ticks: readonly { readonly stage: LifecycleStage; readonly time: number }[];
}

/**
 * The pool's biography as time spans. Null when the owner handed a pool with
 * no events — a pool with no APPEARED has no start, and a ladder with no start
 * would have to be drawn from the camera's edge, which is the flat
 * full-width band this replaces.
 */
export function poolSpan(events: readonly { readonly stage: LifecycleStage; readonly time: number }[]): PoolSpan | null {
  const ev = events.filter(e => Number.isFinite(e.time)).slice().sort((a, z) => a.time - z.time);
  if (ev.length === 0) return null;
  const consume = ev.find(e => e.stage === "CONSUMED" || e.stage === "PULLED") ?? null;
  const endTime = consume ? consume.time : null;
  const live = consume ? ev.filter(e => e.time <= consume.time) : ev;

  const phases: PoolPhase[] = [];
  let rungs: number = LADDER_RUNGS.APPEARED;
  for (let k = 0; k < live.length; k++) {
    const e = live[k];
    if (e.stage === "CONSUMED" || e.stage === "PULLED") break;
    if (e.stage in LADDER_RUNGS) rungs = Math.max(rungs, LADDER_RUNGS[e.stage as keyof typeof LADDER_RUNGS]);
    const last = phases[phases.length - 1];
    if (last && last.rungs === rungs) continue; // same form — the stretch simply continues
    if (last) phases[phases.length - 1] = { ...last, toTime: e.time };
    phases.push({ rungs, fromTime: e.time, toTime: null });
  }
  if (phases.length > 0 && endTime != null) {
    const last = phases[phases.length - 1];
    phases[phases.length - 1] = { ...last, toTime: endTime };
  }
  return { startTime: ev[0].time, endTime, consumed: consume?.stage === "CONSUMED", pulled: consume?.stage === "PULLED", phases, ticks: live.map(e => ({ stage: e.stage, time: e.time })) };
}

/**
 * The rung rows of a ladder inside a pool's price band [top, top + h] (screen
 * px). Evenly spaced across the band; when the band is thinner than the rungs
 * need, the ladder keeps a 3px pitch centred on the band so its lines stay
 * distinguishable (F08A's ladders read as separate fine lines, not a smear) —
 * it never grows past 3px per rung.
 */
export const LADDER_MIN_PITCH = 3;
export function ladderRungYs(top: number, h: number, rungs: number): number[] {
  const n = Math.max(1, Math.round(rungs));
  if (n === 1) return [top + h / 2];
  const pitch = Math.max(LADDER_MIN_PITCH, h / (n + 1));
  const span = pitch * (n - 1);
  const y0 = top + h / 2 - span / 2;
  return Array.from({ length: n }, (_, i) => y0 + i * pitch);
}

/**
 * THE LADDER'S INK — how brightly a pool is lit (serving BTC-USD 5m desktop,
 * 2026-09-26 04:04 CDT: next to F08A's glowing gold ladders, the rungs read as
 * faint hairlines). Age used to quiet EVERY pool linearly to 0.35 over 240
 * quiet bars, so a pool that had simply stood, PERSISTED, for 100 bars was
 * painted at ~0.4 before the governor even spoke. A standing pool is still
 * liquidity on the book: age may dim it only to STANDING_AGE_FLOOR. A consumed
 * pool is memory, at half weight, and ages all the way down. The governor's
 * alpha is applied on top by the caller and is not this function's business.
 */
export const STANDING_AGE_FLOOR = 0.8;
export interface LadderInk {
  readonly age: number;
  readonly rungAlpha: number;
  readonly glowAlpha: number;
  readonly lineWidth: number;
  readonly blur: number;
}
export function ladderInk(p: { rungs: number; consumed: boolean; barsQuiet: number; weight: number }): LadderInk {
  const quiet = Number.isFinite(p.barsQuiet) ? Math.max(0, p.barsQuiet) : 0;
  const raw = Math.max(0.35, Math.min(1, 1 - quiet / 240));
  const age = p.consumed ? raw * 0.5 : Math.max(STANDING_AGE_FLOOR, raw);
  const w = Math.max(0, Math.min(1, Number.isFinite(p.weight) ? p.weight : 0));
  return {
    age,
    rungAlpha: Math.min(0.95, 0.5 + 0.1 * p.rungs) * age,
    // Garden 16 reconstruction (plate F08A beside the glass, 2026-09-27): a
    // standing pool is a LUMINOUS bar — bloom and blur roughly doubled; a
    // consumed pool stays memory-quiet.
    glowAlpha: (p.consumed ? 0.07 + 0.15 * w : 0.16 + 0.3 * w) * age,
    lineWidth: p.consumed ? 1 : p.rungs >= LADDER_RUNGS.PERSISTED ? 1.5 : 1.2,
    blur: p.consumed ? 2 : 13,
  };
}

/**
 * THE TOUCH BITE — Garden 11's recognition test ("hide the text label: can the
 * Founder still tell what invention it is?"). With words hidden, a touch must
 * read as geometry: the ladder is BITTEN where price came back — its rungs
 * break for `gap` px centred on each touch. Returns the rung segments left.
 */
export function splitAtBites(xa: number, xb: number, bites: readonly number[], gap = 4): [number, number][] {
  if (!(xb > xa)) return [];
  const cuts = bites.filter(x => Number.isFinite(x) && x > xa - gap && x < xb + gap).sort((a, z) => a - z);
  const out: [number, number][] = [];
  let from = xa;
  for (const x of cuts) {
    const l = x - gap / 2, r = x + gap / 2;
    if (l > from) out.push([from, Math.min(l, xb)]);
    from = Math.max(from, r);
    if (from >= xb) break;
  }
  if (from < xb) out.push([from, xb]);
  return out;
}

// ── F08B · THE WEATHER LENS ─────────────────────────────────────────────────

export interface ScreenBox { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
export interface WeatherLens {
  readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number;
  /** True when the measured window is larger than the pane can hold: the lens magnifies its newest end. */
  readonly partial?: boolean;
}

/** A lens smaller than this cannot carry its ring words; it is a magnifier, not a dot. */
export const LENS_MIN_RX = 84;
export const LENS_MIN_RY = 60;
/** Air between the measured region's corners and the ring. */
export const LENS_PAD = 10;
/** The most a lens may stretch from a circle (only when the window is wider than the pane can hold round). */
export const LENS_MAX_ASPECT = 1.25;
/** A PARTIAL lens's radius as a share of the pane's half-height (plate WM_NewMockup_79). */
export const LENS_PARTIAL_SHARE = 0.84;

/**
 * Normalised distance of a point from the lens centre: ≤ 1 is inside.
 */
export function lensDistance(lens: WeatherLens, x: number, y: number): number {
  return Math.hypot((x - lens.cx) / lens.rx, (y - lens.cy) / lens.ry);
}

/**
 * The lens over the region the weather was measured in.
 *
 * `region` is the screen box of the tape window (first print's bar → last
 * print's bar, highest → lowest print). The ellipse circumscribes it (×√2 on
 * each half-axis, plus air), is never smaller than the minimum lens, slides to
 * stay on the plot when the region sits at the live edge, and then grows if
 * the slide left a corner of the region outside — the lens ALWAYS encloses
 * what it describes. Null when the region is not on the plot at all (scrolled
 * into history): a lens over nothing measured would be a decoration.
 */
/**
 * THE TABLET LOUPE (2026-10-04). Founder, on iPad: "the charts pop up halfway
 * across the screen". The loupe's cap is half the plot — by plate law about
 * four-fifths of a DESK pane — and on a portrait iPad (plot ~760 wide) that
 * is a 760px brass circle across the whole market. Below LENS_TABLET_MAX_PANE_W
 * the radius is capped at LENS_TABLET_RADIUS_SHARE of the plot width instead:
 * the same loupe, magnifying the same window, standing on part of the glass.
 * Phones (< LENS_MIN_PANE_W) still yield entirely; the desk is unchanged.
 */
export const LENS_TABLET_MAX_PANE_W = 900;
export const LENS_TABLET_RADIUS_SHARE = 0.22;

/**
 * THE DESK LOUPE TOO (2026-10-04, Founder: every Smart Money tool must read on
 * the chart). Measured on serving NQ 5m: the plate-sized loupe (~4/5 of the
 * pane) sat on the newest bars — exactly where absorption shelves,
 * exhaustion marks and stacks are drawn — and its field veiled them. The desk
 * loupe is capped at LENS_DESK_RADIUS_SHARE of the plot: the same lens on the
 * same window, beside the marks rather than over them. A deliberate departure
 * from plate F08B's size, recorded on the board for the Founder.
 */
export const LENS_DESK_RADIUS_SHARE = 0.17;

export function lensRadiusCapFor(plotWidth: number): number | undefined {
  if (!Number.isFinite(plotWidth) || plotWidth <= 0) return undefined;
  return Math.max(LENS_MIN_RX, plotWidth * (plotWidth < LENS_TABLET_MAX_PANE_W ? LENS_TABLET_RADIUS_SHARE : LENS_DESK_RADIUS_SHARE));
}

/**
 * THE LIVE EDGE STAYS OUTSIDE THE LOUPE (plate F08B read beside serving NQ1! 5m,
 * 2026-10-06 08:40 CDT). On the plate the newest candles and the last-price
 * tag stand to the RIGHT of the brass ring, unveiled; on serving glass the
 * loupe sat ON them and its gold field lay under the forming candle. The
 * newest LENS_LIVE_EDGE_BARS (5) bars are a keep-out — room for the forming candle, its countdown and the last-price tag to read as the plate draws them: `liveEdgeKeepOutX` is the
 * x left of which the whole loupe (ring included) must stand. When the
 * measured window reaches into the keep-out, the loupe magnifies the part
 * left of it and says PARTIAL — it never pretends to enclose bars it does not.
 */
export const LENS_LIVE_EDGE_BARS = 5;
/** Below this many px between the plot's left side and the keep-out, the keep-out is waived (the clear-zone cut still protects the face). */
export const LENS_LIVE_EDGE_MIN_ROOM = 2 * LENS_MIN_RX + 40;
export function liveEdgeKeepOutX(xNewest: number | null | undefined, barSpacing: number): number | null {
  if (xNewest == null || !Number.isFinite(xNewest) || !Number.isFinite(barSpacing) || barSpacing <= 0) return null;
  return xNewest - barSpacing * (LENS_LIVE_EDGE_BARS - 0.5) - 6;
}

export function fitWeatherLens(region: ScreenBox, plotIn: ScreenBox, opts: { readonly maxRadius?: number; readonly liveEdgeX?: number | null } = {}): WeatherLens | null {
  const vals = [region.x0, region.x1, region.y0, region.y1, plotIn.x0, plotIn.x1, plotIn.y0, plotIn.y1];
  if (!vals.every(Number.isFinite)) return null;
  if (!(plotIn.x1 > plotIn.x0) || !(plotIn.y1 > plotIn.y0)) return null;
  const rx0 = Math.min(region.x0, region.x1), rx1 = Math.max(region.x0, region.x1);
  const ry0 = Math.min(region.y0, region.y1), ry1 = Math.max(region.y0, region.y1);
  if (rx1 < plotIn.x0 || rx0 > plotIn.x1 || ry1 < plotIn.y0 || ry0 > plotIn.y1) return null;
  const edge = opts.liveEdgeX;
  const keepOut = edge != null && Number.isFinite(edge) && edge < plotIn.x1 && edge - plotIn.x0 >= LENS_LIVE_EDGE_MIN_ROOM
    // A window wholly inside the keep-out has nothing left of it to magnify: no keep-out then (the clear-zone cut still protects the face).
    && rx0 < (edge as number);
  const plot: ScreenBox = keepOut ? { ...plotIn, x1: edge as number } : plotIn;
  const cutByEdge = keepOut && rx1 > plot.x1;
  // Only the part of the region the camera shows is enclosed.
  const bx0 = Math.max(plot.x0, rx0), bx1 = Math.min(plot.x1, rx1);
  const by0 = Math.max(plot.y0, ry0), by1 = Math.min(plot.y1, ry1);
  // F08B IS A CIRCLE (Founder plate WM_NewMockup_79, read beside serving
  // 2026-09-27): a round brass loupe, never a squashed ellipse. The radius
  // encloses the region's half-diagonal, capped by the pane; only a window
  // wider than the pane can hold stretches it, to at most LENS_MAX_ASPECT.
  const halfDiag = Math.hypot((bx1 - bx0) / 2, (by1 - by0) / 2);
  const rCap = Math.min((plot.x1 - plot.x0) / 2, (plot.y1 - plot.y0) / 2,
    opts.maxRadius != null && Number.isFinite(opts.maxRadius) ? Math.max(LENS_MIN_RX, opts.maxRadius) : Infinity);
  const r = Math.min(rCap, Math.max(LENS_MIN_RX, halfDiag + LENS_PAD));
  let rx = r;
  const ry = r;
  const needRx = ((bx1 - bx0) / 2) / Math.sqrt(Math.max(0.05, 1 - Math.pow(Math.min(0.95, ((by1 - by0) / 2) / ry), 2))) + LENS_PAD;
  if (needRx > rx) rx = Math.min(r * LENS_MAX_ASPECT, (plot.x1 - plot.x0) / 2, needRx);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const cx = clamp((bx0 + bx1) / 2, plot.x0 + rx, plot.x1 - rx);
  const cy = clamp((by0 + by1) / 2, plot.y0 + ry, plot.y1 - ry);
  const probe = { cx, cy, rx, ry };
  const k = Math.max(
    lensDistance(probe, bx0, by0), lensDistance(probe, bx1, by0),
    lensDistance(probe, bx0, by1), lensDistance(probe, bx1, by1),
  );
  // Grow (never shrink) until every visible corner of the region is inside.
  // Grow (never shrink) toward enclosing every visible corner — uniformly, so a
  // circle stays a circle — but THE WHOLE LOUPE STAYS ON THE GLASS (plate: the
  // full bezel and its engraved title are always visible). A window larger
  // than the pane can hold is magnified at its NEWEST end (where the weather is
  // now) and the lens says PARTIAL.
  const grow = k > 1 ? k * 1.02 : 1;
  const gmax = rCap / Math.max(rx, ry);
  if (grow <= gmax) return { cx, cy, rx: rx * grow, ry: ry * grow, ...(cutByEdge ? { partial: true } : {}) };
  // Plate: the loupe is about four-fifths of the pane, centred on the price it reads.
  const R = { rx: rCap * LENS_PARTIAL_SHARE, ry: rCap * LENS_PARTIAL_SHARE };
  const cxN = clamp(bx1 - R.rx * 0.85, plot.x0 + R.rx, plot.x1 - R.rx);
  const cyN = clamp((by0 + by1) / 2, plot.y0 + R.ry, plot.y1 - R.ry);
  return { cx: cxN, cy: cyN, ...R, partial: true };
}

/**
 * WHEN THE LENS MAY SPEAK AT ALL (serving, BTC-USD 1m desktop, 2026-09-25
 * 14:48 CDT). The tape starts at page load, so for the first minutes the
 * measured window is two to four bars at the live edge, and the fitted lens
 * was a ~150px knot over the newest candles — through the NEAR footprint
 * cells, the SWING labels and the value-band chip — with a field too small to
 * read. F08B draws the opposite: a large lens over a broad region.
 *
 *   NEAR          H-501: only tape and candle anatomy speak at NEAR (the
 *                 badge itself says so). The lens and its readout yield;
 *                 nothing is printed, the receipt says YIELDED_NEAR.
 *   no region     the window is off the camera: OFF_CAMERA, nothing printed.
 *   GATHERING     fewer than LENS_MIN_BARS bars measured, or a region
 *                 narrower than LENS_MIN_REGION_W px: no mini lens. The
 *                 silence is named ONCE in words (`words`), with the minutes
 *                 of tape actually held, and the receipt GATHERING:<bars>.
 *   DRAW          otherwise.
 */
export const LENS_MIN_BARS = 6;
export const LENS_MIN_REGION_W = 48;
/** Below this plot size the loupe yields — it would cover the pane. */
export const LENS_MIN_PANE_W = 520;
export const LENS_MIN_PANE_H = 300;

export type WeatherLensGate =
  | { readonly kind: "DRAW" }
  | { readonly kind: "YIELDED_NEAR"; readonly state: "YIELDED_NEAR" }
  | { readonly kind: "OFF_CAMERA"; readonly state: "OFF_CAMERA" }
  | { readonly kind: "YIELDED_SMALL_PANE"; readonly state: "YIELDED_SMALL_PANE" }
  | { readonly kind: "GATHERING"; readonly state: `GATHERING:${number}`; readonly bars: number; readonly words: string };

export function weatherLensGate(g: {
  readonly depth: string;
  /** Bars from the window's first print's bar to its last, inclusive (0 = unknown). */
  readonly spanBars: number;
  /** The window's screen width, or null when it has no place on the camera. */
  readonly regionWidth: number | null;
  /** First → last print, ms. */
  readonly spanMs: number;
  /** The price pane's plot size, px. Omitted = not measured (no yield). */
  readonly paneWidth?: number | null;
  readonly paneHeight?: number | null;
}): WeatherLensGate {
  if (g.depth === "NEAR") return { kind: "YIELDED_NEAR", state: "YIELDED_NEAR" };
  // A loupe is ~4/5 of its pane by plate law. In a desk quarter or a phone
  // pane that buries every candle (serving /desk 4-up at iPad width,
  // 2026-10-01), so the loupe yields there; maximize the screen to read it.
  if ((g.paneWidth != null && g.paneWidth < LENS_MIN_PANE_W) || (g.paneHeight != null && g.paneHeight < LENS_MIN_PANE_H)) {
    return { kind: "YIELDED_SMALL_PANE", state: "YIELDED_SMALL_PANE" };
  }
  if (g.regionWidth == null || !Number.isFinite(g.regionWidth)) return { kind: "OFF_CAMERA", state: "OFF_CAMERA" };
  const bars = Math.max(0, Math.floor(Number.isFinite(g.spanBars) ? g.spanBars : 0));
  if (bars < LENS_MIN_BARS || g.regionWidth < LENS_MIN_REGION_W) {
    const min = Number.isFinite(g.spanMs) ? g.spanMs / 60_000 : 0;
    const held = min < 1 ? "<1 min" : `${Math.round(min)} min`;
    return { kind: "GATHERING", state: `GATHERING:${bars}`, bars, words: `WEATHER · gathering — ${held} of tape` };
  }
  return { kind: "DRAW" };
}

/** A point on the ellipse `offset` px outside the lens (param angle t, canvas y-down). */
export function ringPoint(lens: WeatherLens, t: number, offset = 0): { x: number; y: number } {
  return { x: lens.cx + (lens.rx + offset) * Math.cos(t), y: lens.cy + (lens.ry + offset) * Math.sin(t) };
}

/**
 * Glyph positions for a word set ON the ring's top arc, centred at the top
 * (t = −π/2), reading left to right, each glyph rotated to the arc's tangent.
 * `widths` are the measured glyph advances.
 */
export function wordOnTopArc(
  lens: WeatherLens, widths: readonly number[], offset: number,
): { x: number; y: number; rot: number }[] {
  const Rx = lens.rx + offset, Ry = lens.ry + offset;
  const speed = (t: number) => Math.hypot(Rx * Math.sin(t), Ry * Math.cos(t)) || 1;
  const total = widths.reduce((a, w) => a + w, 0);
  // Walk half the word's length back from the top to find the first glyph.
  let t = -Math.PI / 2;
  for (let d = 0; d < total / 2; ) { const step = Math.min(1, total / 2 - d); t -= step / speed(t); d += step; }
  const out: { x: number; y: number; rot: number }[] = [];
  for (const w of widths) {
    const tc = t + (w / 2) / speed(t);
    out.push({
      x: lens.cx + Rx * Math.cos(tc),
      y: lens.cy + Ry * Math.sin(tc),
      rot: Math.atan2(Ry * Math.cos(tc), -Rx * Math.sin(tc)),
    });
    t += w / speed(t);
  }
  return out;
}

/**
 * The ring's lower arc is the lens's own legend — F08B's "PERSIST ——|——
 * RESPONSE" dimension scale. It runs from the lower-left (the dearest cell in
 * the window: size went in and price held) to the lower-right (the cheapest:
 * price moved on little). `intensity` is the heat owner's 0..1 against the
 * window's dearest cell. Returns the arc's param angle.
 */
export const SCALE_HEAVY_T = (3 * Math.PI) / 4;
export const SCALE_THIN_T = Math.PI / 4;
export function scaleAngle(intensity: number): number {
  const i = Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 0));
  return SCALE_THIN_T + i * (SCALE_HEAVY_T - SCALE_THIN_T);
}
