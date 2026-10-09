/**
 * FIELD FOG BUDGET — stacked translucent fields never multiply over the candles.
 *
 * Founder, on the phone (2026-10-09): "the opacity … still sucks". Measured at
 * 390 on serving ada59d4 with every layer on: a green regime field over 59% of
 * the plot, three gold washes over ~30% each, a cream wash over 20%, an olive
 * band over 11% — and on BTC-USD eleven blue washes. Each is faint alone; where
 * they stack they make a grey fog over price. The canon: candles and price
 * first, no stacked translucent bands multiplying.
 *
 * ONE SHARED CAP. Every LARGE translucent rectangle fill (≥ FOG_MIN_COVER of
 * the plot, ink alpha under FOG_OPAQUE — a card's opaque backing is not fog)
 * is counted on a coarse grid of the plot. The frame's worst cell — the largest
 * SUM of effective alpha over any one place — is compared with FOG_CAP. If it
 * was over, the NEXT frame scales every large field by cap / worst, so the sum
 * over any candle never exceeds the cap. Proportional (no field is singled
 * out), order-free, one frame of lag in, and it releases the frame after the
 * stack thins. Small fills (candles, volume bars, cells, chips) are never
 * touched: the test is one multiplication per fillRect.
 *
 * Path fills (`ctx.fill()`) are not counted; the large fields on this glass are
 * rectangle fills.
 */

export const FOG_CAP = 0.18;
export const FOG_MIN_COVER = 0.06;
export const FOG_OPAQUE = 0.6;
export const FOG_GRID = 8;

export interface FogFrame {
  /** The largest summed effective alpha over any one grid cell this frame (after scaling). */
  readonly worst: number;
  /** What the worst would have been unscaled. */
  readonly worstRaw: number;
  /** The scale applied to every large field this frame (1 = none). */
  readonly scale: number;
  readonly fills: number;
}

export interface FogLedger {
  /** Count one large fill; returns the scale to paint it with. */
  add(rect: { x: number; y: number; w: number; h: number }, effectiveAlpha: number): number;
  frame(): FogFrame;
}

/** `scale` is what last frame's worst cell asks of this frame. */
export function createFogLedger(plot: { w: number; h: number }, scale = 1): FogLedger {
  const cells = new Float64Array(FOG_GRID * FOG_GRID);
  const cw = Math.max(1, plot.w) / FOG_GRID, ch = Math.max(1, plot.h) / FOG_GRID;
  let fills = 0;
  return {
    add(rect, a) {
      fills++;
      const x0 = Math.max(0, rect.x), y0 = Math.max(0, rect.y);
      const x1 = Math.min(plot.w, rect.x + rect.w), y1 = Math.min(plot.h, rect.y + rect.h);
      for (let gy = 0; gy < FOG_GRID; gy++) {
        const cy0 = gy * ch, cy1 = cy0 + ch;
        const oy = Math.min(y1, cy1) - Math.max(y0, cy0);
        if (oy < ch / 2) continue;
        for (let gx = 0; gx < FOG_GRID; gx++) {
          const cx0 = gx * cw, cx1 = cx0 + cw;
          if (Math.min(x1, cx1) - Math.max(x0, cx0) >= cw / 2) cells[gy * FOG_GRID + gx] += a;
        }
      }
      return scale;
    },
    frame() {
      let raw = 0;
      for (const v of cells) if (v > raw) raw = v;
      return { worst: raw * scale, worstRaw: raw, scale, fills };
    },
  };
}

/** The scale the next frame needs so its worst cell sits at the cap. */
export function fogScaleFor(worstRaw: number): number {
  return worstRaw > FOG_CAP ? FOG_CAP / worstRaw : 1;
}

/** The alpha of a CSS colour string as the canvas reports it (`rgba(…, a)`; hex / rgb = 1). `null` = not a plain colour. */
export function inkAlpha(fillStyle: unknown): number | null {
  if (typeof fillStyle !== "string") return null;
  const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(fillStyle);
  return m ? Number(m[1]) : 1;
}

type FogCtx = Pick<CanvasRenderingContext2D, "fillRect" | "fillStyle" | "globalAlpha" | "getTransform">;

export interface FogGate {
  /** Start a frame. `on: false` (the desk) counts nothing and scales nothing. */
  beginFrame(opts: { on: boolean; plot: { w: number; h: number }; dpr: number }): void;
  /** `OFF` · `WORST:<after>|RAW:<before>|K:<scale>|FILLS:<n>` — the frame so far. */
  receipt(): string;
}

const GATES = new WeakMap<object, FogGate>();

/** Wrap `ctx.fillRect` once (idempotent). Inert until `beginFrame({ on: true })`. */
export function installFogGate(ctx: FogCtx): FogGate {
  const have = GATES.get(ctx);
  if (have) return have;
  const raw = ctx.fillRect;
  let on = false;
  let plot = { w: 1, h: 1 };
  let dpr = 1;
  let minArea = Infinity;
  let ledger: FogLedger | null = null;
  let nextScale = 1;
  ctx.fillRect = function fogFillRect(this: FogCtx, x: number, y: number, w: number, h: number) {
    // One multiplication for every small fill — candles, bars, cells, chips.
    if (!on || !ledger || Math.abs(w * h) < minArea) return raw.call(this as CanvasRenderingContext2D, x, y, w, h);
    const ink = inkAlpha(this.fillStyle);
    if (ink == null || ink >= FOG_OPAQUE || ink <= 0) return raw.call(this as CanvasRenderingContext2D, x, y, w, h);
    const tr = this.getTransform();
    const k = dpr > 0 ? dpr : 1;
    const rx = (tr.a * x + tr.e) / k, ry = (tr.d * y + tr.f) / k, rw = (tr.a * w) / k, rh = (tr.d * h) / k;
    const rect = { x: Math.min(rx, rx + rw), y: Math.min(ry, ry + rh), w: Math.abs(rw), h: Math.abs(rh) };
    if (rect.w * rect.h < plot.w * plot.h * FOG_MIN_COVER) return raw.call(this as CanvasRenderingContext2D, x, y, w, h);
    const ga = this.globalAlpha;
    const s = ledger.add(rect, ink * ga);
    if (s >= 1) return raw.call(this as CanvasRenderingContext2D, x, y, w, h);
    this.globalAlpha = ga * s;
    try { return raw.call(this as CanvasRenderingContext2D, x, y, w, h); } finally { this.globalAlpha = ga; }
  } as CanvasRenderingContext2D["fillRect"];
  const gate: FogGate = {
    beginFrame(o) {
      // Last frame's worst cell decides this frame's scale (released when it thins).
      if (on && ledger) nextScale = fogScaleFor(ledger.frame().worstRaw);
      else nextScale = 1;
      on = o.on; plot = o.plot; dpr = o.dpr;
      // In the context's own units a fill smaller than this can never be large (transform scale ≥ 1).
      minArea = plot.w * plot.h * FOG_MIN_COVER * 0.25;
      ledger = on ? createFogLedger(plot, nextScale) : null;
    },
    receipt() {
      if (!on || !ledger) return "OFF";
      const f = ledger.frame();
      return `WORST:${f.worst.toFixed(3)}|RAW:${f.worstRaw.toFixed(3)}|K:${f.scale.toFixed(2)}|FILLS:${f.fills}`;
    },
  };
  GATES.set(ctx, gate);
  return gate;
}
