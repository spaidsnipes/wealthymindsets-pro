/**
 * THE LENSES ON THE GLASS — the geometry the canon plates draw, as pure functions.
 *
 * Founder, 2026-09-25: "WORK SIDE BY SIDE WITH THE VISUALS CANON … I STILL
 * HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS WITHIN THE CANON." Each
 * function here is one plate's drawing, reduced to where its pixels go:
 *
 *   H-401 / F14  CONTRADICTION NOT AVERAGED — ONE PRICE ZONE drawn as a dashed
 *                box at the zone's real prices (depth) from where the zone
 *                began to NOW (width). Inside it: a tall UP arrow at its left,
 *                a tall DOWN arrow at its right, the crack between them. The
 *                family names go under the arrows and UNRESOLVED under the
 *                crack — words, not cards.
 *   H-801 / F03  EXPECTED ENVELOPE — a percentile FAN: each band is a polygon
 *                along its upper edge forward in time and back along its lower
 *                edge, from the open through NOW and on to the right.
 *   F17A / H-1001 RISK ON PRICE — the R ticks on the reward bracket: 1R, 2R,
 *                3R at entry ± k × risk, only where the plan's own target
 *                reaches.
 *
 * Nothing here decides a market fact: the owners (selectContradiction,
 * selectExpectedEnvelope, selectRiskOnPrice) decide the prices and times.
 * This module only says where on the glass those facts go.
 *
 * PURE. DETERMINISTIC. No canvas.
 */

export interface GlassPoint {
  readonly x: number;
  readonly y: number;
}

// ── H-401 · ONE PRICE ZONE ──────────────────────────────────────────────────

export interface ZoneBox {
  readonly x0: number;
  readonly x1: number;
  readonly yTop: number;
  readonly yBot: number;
}

/** The narrowest box whose two arrows and crack can each carry their words beneath. */
export const ZONE_BOX_MIN_W = 240;
/** A zone born long ago is still drawn as ONE zone at NOW, not a ribbon across the day. */
export const ZONE_BOX_MAX_W = 340;

/**
 * The zone box: depth is the zone's real prices; width runs from where the
 * band began (`xFrom`, null when unknown) to NOW, clamped to
 * [ZONE_BOX_MIN_W, ZONE_BOX_MAX_W] and never left of `minX`.
 */
export function contradictionZoneBox(a: {
  readonly xNow: number;
  readonly xFrom: number | null;
  readonly yA: number;
  readonly yB: number;
  readonly minX: number;
}): ZoneBox {
  const yTop = Math.min(a.yA, a.yB);
  const yBot = Math.max(a.yA, a.yB);
  const want = a.xFrom != null && Number.isFinite(a.xFrom) ? a.xNow - a.xFrom : ZONE_BOX_MIN_W;
  const w = Math.min(ZONE_BOX_MAX_W, Math.max(ZONE_BOX_MIN_W, want));
  const x0 = Math.max(a.minX, a.xNow - w);
  return { x0, x1: Math.max(x0 + 1, a.xNow), yTop, yBot };
}

export interface ZoneArrow {
  readonly lean: "UP" | "DOWN";
  /** The arrow's centre line. */
  readonly x: number;
  /** Top and bottom of the whole arrow (the tip is at the top for UP). */
  readonly yTop: number;
  readonly yBot: number;
  readonly shaftW: number;
  readonly headW: number;
  readonly headH: number;
}

export interface ContradictionGlyph {
  readonly up: ZoneArrow;
  readonly down: ZoneArrow;
  /** The crack's centre and half-extents. */
  readonly crack: { readonly cx: number; readonly cy: number; readonly hw: number; readonly hh: number };
  /** Lowest and highest y any part of the glyph reaches (labels go outside this). */
  readonly yTop: number;
  readonly yBot: number;
}

/**
 * A zone thinner than this still gets the sheet's TALL arrows; they straddle
 * it. (44px read as small marks on a real TSLA 15m zone, 2026-09-25 harness.)
 */
export const ZONE_ARROW_MIN_H = 64;

/**
 * The sheet's order: UP arrow at the left, the crack in the middle, DOWN arrow
 * at the right, all centred on the zone's depth. The arrows fill the zone
 * (inset 5px) when it is deep enough, else they keep ZONE_ARROW_MIN_H and
 * straddle its middle.
 */
export function contradictionGlyph(box: ZoneBox): ContradictionGlyph {
  const w = box.x1 - box.x0;
  const depth = box.yBot - box.yTop;
  const h = Math.max(ZONE_ARROW_MIN_H, depth - 10);
  const cy = (box.yTop + box.yBot) / 2;
  const yTop = cy - h / 2, yBot = cy + h / 2;
  const headW = Math.max(16, Math.min(26, w * 0.12));
  const shaftW = Math.round(headW * 0.42);
  const headH = Math.min(h * 0.34, headW * 0.9);
  const inset = Math.max(headW / 2 + 8, w * 0.14);
  const up: ZoneArrow = { lean: "UP", x: box.x0 + inset, yTop, yBot, shaftW, headW, headH };
  const down: ZoneArrow = { lean: "DOWN", x: box.x1 - inset, yTop, yBot, shaftW, headW, headH };
  const cx = (up.x + down.x) / 2;
  const hw = Math.max(8, Math.min(h * 0.55, (down.x - up.x) / 2 - headW / 2 - 8));
  return { up, down, crack: { cx, cy, hw, hh: h * 0.48 }, yTop, yBot };
}

/** The arrow's outline, clockwise from the tail's left corner. */
export function arrowOutline(a: ZoneArrow): GlassPoint[] {
  const sl = a.x - a.shaftW / 2, sr = a.x + a.shaftW / 2;
  const hl = a.x - a.headW / 2, hr = a.x + a.headW / 2;
  if (a.lean === "UP") {
    const neck = a.yTop + a.headH;
    return [
      { x: sl, y: a.yBot }, { x: sl, y: neck }, { x: hl, y: neck }, { x: a.x, y: a.yTop },
      { x: hr, y: neck }, { x: sr, y: neck }, { x: sr, y: a.yBot },
    ];
  }
  const neck = a.yBot - a.headH;
  return [
    { x: sl, y: a.yTop }, { x: sr, y: a.yTop }, { x: sr, y: neck }, { x: hr, y: neck },
    { x: a.x, y: a.yBot }, { x: hl, y: neck }, { x: sl, y: neck },
  ];
}

/**
 * The crack: two jagged fractures crossing (a split ✕, never a divider) and a
 * few short branches. Returned as polylines; the jag is fixed, not random, so
 * the same zone draws the same crack every frame.
 */
export function crackStrokes(c: ContradictionGlyph["crack"]): GlassPoint[][] {
  const { cx, cy, hw, hh } = c;
  // The jag scales with the crack so a wide crack still reads as a fracture.
  const j = Math.max(3, hw * 0.18);
  const jag = (sx: number): GlassPoint[] => {
    const pts: GlassPoint[] = [{ x: cx + sx * hw, y: cy - hh }];
    [0.14, 0.3, 0.45, 0.6, 0.76, 0.9].forEach((t, k) =>
      pts.push({ x: cx + sx * hw - sx * 2 * hw * t + (k % 2 ? j : -j), y: cy - hh + 2 * hh * t }));
    pts.push({ x: cx - sx * hw, y: cy + hh });
    return pts;
  };
  const branch = (x0: number, y0: number, x1: number, y1: number): GlassPoint[] =>
    [{ x: cx + x0 * hw, y: cy + y0 * hh }, { x: cx + x1 * hw, y: cy + y1 * hh }];
  return [
    jag(-1), jag(1),
    branch(-0.5, -0.5, -0.95, -0.76), branch(0.55, -0.4, 0.95, -0.6),
    branch(-0.45, 0.44, -0.9, 0.72), branch(0.5, 0.5, 0.92, 0.8),
  ];
}

export interface LabelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Air kept between the three word groups on their row. */
export const ZONE_LABEL_GAP = 6;

/**
 * The sheet's word row — the UP family names under the UP arrow, UNRESOLVED
 * under the crack, the DOWN family names under the DOWN arrow — each centred
 * on its own mark at row top `y`. When two would touch, the UP words step
 * left and the DOWN words step right (never the crack's): the crack is the
 * point of the drawing and keeps its place.
 */
export function contradictionLabelRow(
  g: ContradictionGlyph,
  size: { readonly up: { w: number; h: number }; readonly crack: { w: number; h: number }; readonly down: { w: number; h: number } },
  y: number,
): { readonly up: LabelRect; readonly crack: LabelRect; readonly down: LabelRect } {
  const crack = { x: g.crack.cx - size.crack.w / 2, y, w: size.crack.w, h: size.crack.h };
  const up = { x: Math.min(g.up.x - size.up.w / 2, crack.x - ZONE_LABEL_GAP - size.up.w), y, w: size.up.w, h: size.up.h };
  const down = { x: Math.max(g.down.x - size.down.w / 2, crack.x + crack.w + ZONE_LABEL_GAP), y, w: size.down.w, h: size.down.h };
  return { up, crack, down };
}

// ── H-801 · THE ANALOGUE FAN ────────────────────────────────────────────────

export interface FanColumn {
  readonly x: number;
  readonly lo: number;
  readonly hi: number;
}

/**
 * A band of the fan as one closed polygon: along its upper edge forward in
 * time, then back along its lower edge. Columns must be in time order.
 */
export function fanBandPolygon(cols: readonly FanColumn[]): GlassPoint[] {
  return [...cols.map(c => ({ x: c.x, y: c.hi })), ...[...cols].reverse().map(c => ({ x: c.x, y: c.lo }))];
}

/** One quadratic segment: control point, then the point it ends on. */
export interface CurveSegment {
  readonly cx: number;
  readonly cy: number;
  readonly x: number;
  readonly y: number;
}

/**
 * A curve through measured points instead of a sawtooth between them — the
 * plate's fan is a smooth dashed spread, and ten sessions' quantiles step by
 * step zig-zag at the sample's own grain. Midpoint smoothing: the curve
 * starts on the first point, ends on the last, and bends at every interior
 * point toward it (each interior point is a control point), so no value is
 * invented or moved — the curve only rounds the corners between them. A
 * caller traces `moveTo(first)` (or `lineTo(first)` to continue a path) then
 * `quadraticCurveTo(cx, cy, x, y)` per segment.
 */
export function smoothSegments(pts: readonly GlassPoint[]): CurveSegment[] {
  if (pts.length < 2) return [];
  if (pts.length === 2) return [{ cx: pts[0].x, cy: pts[0].y, x: pts[1].x, y: pts[1].y }];
  const out: CurveSegment[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i + 1];
    const end = i === pts.length - 2 ? n : { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 };
    out.push({ cx: p.x, cy: p.y, x: end.x, y: end.y });
  }
  // The first stretch runs straight from the first point to the first midpoint.
  const m0 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  return [{ cx: m0.x, cy: m0.y, x: m0.x, y: m0.y }, ...out];
}

// ── F17A · THE R TICKS ──────────────────────────────────────────────────────

/**
 * 1R, 2R, 3R … on the reward side: entry ± k × risk for every whole k the
 * plan's own target reaches, capped at `maxR`. No target → no ticks: an R
 * the plan never claimed is not drawn.
 */
export function rewardRTicks(
  side: "LONG" | "SHORT",
  entry: number,
  risk: number,
  rr: number | null,
  maxR = 3,
): { readonly r: number; readonly price: number }[] {
  if (!(risk > 0) || rr == null || !(rr >= 1)) return [];
  const dir = side === "LONG" ? 1 : -1;
  const out: { r: number; price: number }[] = [];
  for (let k = 1; k <= Math.min(maxR, Math.floor(rr + 1e-9)); k++) out.push({ r: k, price: entry + dir * k * risk });
  return out;
}
