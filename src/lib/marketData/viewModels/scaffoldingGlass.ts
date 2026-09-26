/**
 * SCAFFOLDING GLASS — where each depth of the one scaffolding read lands ON
 * THE CHART.
 *
 * Plates: WM Transformation UI-12 "Progressive Scaffolding — Foundation /
 * Intermediate / Advanced-Pro", UI-13 "Mastery Path", and F05A "Clarity is the
 * default language of the room" (Drive visual canon).
 *
 * Founder, 2026-09-25 13:58 CDT: "I STILL HAVE A LOT OF JUST CARDS, NOT THE
 * ACTUAL DESIGNS WITHIN THE CANON THAT THE CHART SHOULD SHOW." The Pro depth
 * had been built as a card holding its own little effort/result line chart,
 * printed over the left third of the real candles. The plate's Pro view is
 * GEOMETRY: a dashed resistance, a pressure mass rising along price and
 * flattening into it, a buying-pressure and a selling-pressure arrow, and ONE
 * plaque. On a chart that already HAS price, the mass belongs on the candles.
 *
 * What this file owns (pure, deterministic, no canvas, no colour):
 *
 *   · `planProSleeve` — the Pro mass: the read window's REAL bars mapped with
 *     the chart's own time→x and price→y, an envelope around them whose
 *     thickness past each candle is that bar's effort, split into the read's
 *     conversion segments. The caller cuts the candles out before it fills,
 *     so the mass never sits on a candle.
 *   · `proPlaqueSlots` — the one plaque's preferred spot and alternates, tied
 *     to the window's last bar. The caller runs them through the keep-out
 *     placer (strict) — this file never decides clearance on its own.
 *   · `dockClearOfCandles` — for the Foundation and Intermediate cards: the
 *     first spot, nearest the preferred one, that covers no candle (body or
 *     wick) and no chip already on the glass. When the camera has none, it
 *     says so (NONE, with the hit count) rather than pretending.
 */

import type { ScaffoldingReadVM, Conversion } from "./selectScaffoldingRead";

export interface GlassRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface GlassCamera {
  readonly timeToX: (time: number) => number | null;
  readonly priceToY: (price: number) => number | null;
}

/** Past each candle's wick, the mass is at least this thick (px). */
export const SLEEVE_PAD_MIN = 2;
/** ...and grows by this many px at the window's biggest effort (effortNorm 1). */
export const SLEEVE_PAD_EFFORT = 12;

export interface SleevePoint {
  readonly time: number;
  readonly x: number;
  /** The bar's own high / low on screen — what the leader and plaque tie to. */
  readonly yHigh: number;
  readonly yLow: number;
  /** The mass's upper / lower edge at this bar (never inside the candle). */
  readonly top: number;
  readonly bottom: number;
}

export interface SleeveSegment {
  /** Inclusive indices into `points`. */
  readonly from: number;
  readonly to: number;
  /** Screen span of the segment's cell. */
  readonly x0: number;
  readonly x1: number;
  readonly conversion: Conversion | null;
}

export interface ProSleeve {
  readonly drawn: boolean;
  readonly reason: "DRAWN" | "NO_WINDOW" | "OFF_CAMERA";
  readonly points: readonly SleevePoint[];
  readonly segments: readonly SleeveSegment[];
  /** Half the slot a bar owns on screen. */
  readonly halfBar: number;
}

const finite = (n: number | null): n is number => n != null && Number.isFinite(n);

/**
 * The Pro pressure mass over the read window, on the chart's own transforms.
 * A bar the camera cannot place is skipped; fewer than two placed bars and
 * nothing is drawn (OFF_CAMERA) — a mass with one point is a claim about a
 * shape nobody measured.
 */
export function planProSleeve(read: ScaffoldingReadVM, cam: GlassCamera, barSpacing: number): ProSleeve {
  const halfBar = Math.max(3, (Number.isFinite(barSpacing) ? barSpacing : 6) / 2);
  if (!read.measured || read.window.length < 2) {
    return { drawn: false, reason: "NO_WINDOW", points: [], segments: [], halfBar };
  }
  const placed: { i: number; time: number; x: number; yHigh: number; yLow: number; pad: number }[] = [];
  read.window.forEach((b, i) => {
    const x = cam.timeToX(b.time);
    const yh = cam.priceToY(b.high);
    const yl = cam.priceToY(b.low);
    if (!finite(x) || !finite(yh) || !finite(yl)) return;
    const e = Math.max(0, Math.min(1, Number.isFinite(b.effortNorm) ? b.effortNorm : 0));
    placed.push({ i, time: b.time, x, yHigh: Math.min(yh, yl), yLow: Math.max(yh, yl), pad: SLEEVE_PAD_MIN + e * SLEEVE_PAD_EFFORT });
  });
  if (placed.length < 2) return { drawn: false, reason: "OFF_CAMERA", points: [], segments: [], halfBar };

  // The edge at a bar clears its neighbours' wicks too, so the smoothed
  // outline never cuts back into a candle between two bar centres.
  const points: SleevePoint[] = placed.map((p, k) => {
    const nb = placed.slice(Math.max(0, k - 1), Math.min(placed.length, k + 2));
    return {
      time: p.time,
      x: p.x,
      yHigh: p.yHigh,
      yLow: p.yLow,
      top: Math.min(...nb.map(q => q.yHigh)) - p.pad,
      bottom: Math.max(...nb.map(q => q.yLow)) + p.pad,
    };
  });

  const segments: SleeveSegment[] = [];
  for (const s of read.segments) {
    const idx = placed.map((p, k) => (p.i >= s.from && p.i <= s.to ? k : -1)).filter(k => k >= 0);
    if (idx.length === 0) continue;
    const from = idx[0], to = idx[idx.length - 1];
    const x0 = from > 0 ? (points[from - 1].x + points[from].x) / 2 : points[from].x - halfBar;
    const x1 = to < points.length - 1 ? (points[to].x + points[to + 1].x) / 2 : points[to].x + halfBar;
    segments.push({ from, to, x0, x1, conversion: s.conversion });
  }
  return { drawn: true, reason: "DRAWN", points, segments, halfBar };
}

/** The mass as boxes, one per placed bar — what the plaque and its words must not cover. */
export function sleeveBoxes(sleeve: ProSleeve): GlassRect[] {
  return sleeve.points.map(p => ({ x: p.x - sleeve.halfBar, y: p.top, w: sleeve.halfBar * 2, h: p.bottom - p.top }));
}

/**
 * The Pro plaque's spots, tied to the window's LAST bar (F05A: one callout,
 * one candle). Preferred: above the mass, ending just left of the bar. Then
 * below it, then beside the window's first bar, then further out. Every slot
 * is kept inside `bounds`; the caller's keep-out placer picks among them.
 */
export function proPlaqueSlots(
  sleeve: ProSleeve,
  size: { readonly w: number; readonly h: number },
  bounds: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number },
): { preferred: GlassRect; alternates: GlassRect[] } | null {
  if (!sleeve.drawn || sleeve.points.length === 0) return null;
  const last = sleeve.points[sleeve.points.length - 1];
  const first = sleeve.points[0];
  const topMin = Math.min(...sleeve.points.map(p => p.top));
  const botMax = Math.max(...sleeve.points.map(p => p.bottom));
  const clamp = (r: GlassRect): GlassRect => ({
    x: Math.max(bounds.x0, Math.min(bounds.x1 - r.w, r.x)),
    y: Math.max(bounds.y0, Math.min(bounds.y1 - r.h, r.y)),
    w: r.w,
    h: r.h,
  });
  const gap = 14;
  const leftOfLast = last.x - sleeve.halfBar - 8 - size.w;
  const raw: GlassRect[] = [
    { x: leftOfLast, y: last.top - gap - size.h, ...size },
    { x: leftOfLast, y: last.bottom + gap, ...size },
    { x: leftOfLast, y: topMin - gap - size.h, ...size },
    { x: leftOfLast, y: botMax + gap, ...size },
    { x: first.x - sleeve.halfBar - 12 - size.w, y: first.top - size.h / 2, ...size },
    { x: first.x - sleeve.halfBar - 12 - size.w, y: first.bottom - size.h / 2, ...size },
  ];
  const [preferred, ...alternates] = raw.map(clamp);
  return { preferred, alternates };
}

export type DockMode = "PREFERRED" | "DOCKED" | "NONE";

export interface DockResult {
  readonly mode: DockMode;
  readonly rect: GlassRect;
  /** Candles (body or wick) and chips the returned rect covers. 0 unless NONE. */
  readonly hits: number;
}

export interface DockInput {
  readonly size: { readonly w: number; readonly h: number };
  /** The region the card may use (plot, under the header, clear of a column another owner holds). */
  readonly bounds: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /** Whole candles in view, high→low (wicks included): a card is opaque, it may hide no price. */
  readonly candles: readonly GlassRect[];
  /** Chips and cards already on the glass this frame. */
  readonly blockers: readonly GlassRect[];
  readonly preferred: { readonly x: number; readonly y: number };
  readonly xStep?: number;
}

const overlaps = (a: GlassRect, b: GlassRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** How many of `boxes` the rect covers (touching edges do not count). */
export const countRectHits = (r: GlassRect, boxes: readonly GlassRect[]): number =>
  boxes.reduce((n, b) => n + (overlaps(r, b) ? 1 : 0), 0);
const countHits = countRectHits;

/**
 * The card footprints at plate scale, crumb row included (the crumb is the
 * card's first row). PRO has NO card: the geometry is on the candles and its
 * one plaque is keep-out placed, so nothing reserves room for it.
 */
export const SCAFFOLD_CARD_BOX = {
  FOUNDATION: { w: 470, h: 271 },
  FOUNDATION_COMPACT: { w: 340, h: 151 },
  INTERMEDIATE: { w: 252, h: 112 },
} as const;
/** The Pro plaque: crumb, small-caps title, the big ratio, the grade marks, the grade line. */
export const PRO_PLAQUE = { w: 212, h: 74 } as const;

/**
 * THE PLAQUE'S STARS ARE THE OWNER'S GRADE, NOTHING ELSE. Plate UI-12 prints
 * "★★★★★" under its efficiency ratio; no owner measures five grades of
 * efficiency. The one grade that exists is the read's conversion word, which
 * has THREE levels — so the marks are out of three and say exactly that word:
 * NOT CONVERTING ★☆☆ · EVEN ★★☆ · CONVERTING ★★★. No conversion (no effort)
 * → no marks at all.
 */
export const CONVERSION_GRADE_OF = 3;
export function conversionGrade(conversion: Conversion | null): number | null {
  return conversion === "CONVERTING" ? 3 : conversion === "EVEN" ? 2 : conversion === "NOT CONVERTING" ? 1 : null;
}
export function gradeMarks(conversion: Conversion | null): string {
  const g = conversionGrade(conversion);
  return g == null ? "" : "★".repeat(g) + "☆".repeat(CONVERSION_GRADE_OF - g);
}

/**
 * The spot nearest `preferred` where a card covers no candle and no chip.
 * Columns are scanned every `xStep` px; within a column the obstacles'
 * vertical spans are merged and the free gaps tall enough for the card are
 * the candidates. NONE keeps the preferred spot (clamped) and counts what it
 * covers, so the caller can yield its backing and say so.
 */
export function dockClearOfCandles(input: DockInput): DockResult {
  const { size, bounds, candles, blockers } = input;
  const obstacles = [...candles, ...blockers];
  const clampX = (x: number) => Math.max(bounds.x0, Math.min(bounds.x1 - size.w, x));
  const clampY = (y: number) => Math.max(bounds.y0, Math.min(bounds.y1 - size.h, y));
  const pref: GlassRect = { x: clampX(input.preferred.x), y: clampY(input.preferred.y), ...size };
  if (bounds.x1 - bounds.x0 < size.w || bounds.y1 - bounds.y0 < size.h) {
    return { mode: "NONE", rect: pref, hits: countHits(pref, obstacles) };
  }
  if (countHits(pref, obstacles) === 0) return { mode: "PREFERRED", rect: pref, hits: 0 };

  const step = Math.max(4, input.xStep ?? 16);
  let best: { rect: GlassRect; cost: number } | null = null;
  for (let x = bounds.x0; x + size.w <= bounds.x1 + 0.001; x += step) {
    // Vertical spans of everything under this column, merged.
    const spans = obstacles
      .filter(o => o.x < x + size.w && o.x + o.w > x)
      .map(o => [o.y, o.y + o.h] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const s of spans) {
      const m = merged[merged.length - 1];
      if (m && s[0] <= m[1]) m[1] = Math.max(m[1], s[1]);
      else merged.push([s[0], s[1]]);
    }
    // Free gaps inside the bounds.
    let cursor = bounds.y0;
    const gaps: [number, number][] = [];
    for (const [a, b] of merged) {
      if (a > cursor) gaps.push([cursor, Math.min(a, bounds.y1)]);
      cursor = Math.max(cursor, b);
      if (cursor >= bounds.y1) break;
    }
    if (cursor < bounds.y1) gaps.push([cursor, bounds.y1]);
    for (const [g0, g1] of gaps) {
      // Strict inequalities in `overlaps` let a card touch an obstacle's edge.
      if (g1 - g0 < size.h) continue;
      const y = Math.max(g0, Math.min(g1 - size.h, pref.y));
      const cost = Math.abs(x - pref.x) + Math.abs(y - pref.y);
      if (!best || cost < best.cost) best = { rect: { x, y, ...size }, cost };
    }
  }
  if (best) return { mode: "DOCKED", rect: best.rect, hits: 0 };
  return { mode: "NONE", rect: pref, hits: countHits(pref, obstacles) };
}

/** Every receipt the scaffolding glass publishes; withdrawn together each frame before it paints. */
export const SCAFFOLDING_GLASS_RECEIPTS = [
  "scaffoldingScale", "scaffoldingForm", "scaffoldingDock", "scaffoldingCardCandleHits",
  "scaffoldingGeometry", "scaffoldingPlaque", "scaffoldingCandlesKept", "scaffoldingSwingMarks",
  "scaffoldingResistance",
] as const;
