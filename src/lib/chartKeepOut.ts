/**
 * CANDLE PRESERVATION — the newest candle bodies are a keep-out.
 *
 * Garden Pass 12, Defect 4: "candle-preservation zones … the market remains
 * dominant." The newest three candles in view are what the trader is reading
 * right now. An opaque label printed on one of them does not annotate the
 * market, it hides it — and the live edge is exactly where the profile stack's
 * label column, the Profile Memory labels and the selected-zone callout all
 * land, because that is where "now" is.
 *
 * The law this file holds:
 *
 *   · A BACKING WITH ALPHA ≥ 0.5 IS OPAQUE, and an opaque backing never sits
 *     on the body of one of the newest 3 candles in view.
 *   · BODIES, NOT WICKS. The box runs open→close (±2px). A hairline or a
 *     leader may cross a wick or a body; only a filled backing may not.
 *   · THE LABEL IS NEVER DELETED. It first tries the placer's own alternate
 *     slots, then slides LEFT along its own price row past the keep-out (the
 *     caller ties it back with a dotted leader). If no spot is left, it stays
 *     where it was and its backing drops below the opaque line, so the words
 *     survive and the candle reads through.
 *
 * PURE. DETERMINISTIC. No canvas: the caller passes the chart's own
 * time→x and price→y transforms, so the boxes are exactly where the series
 * draws the candles.
 */

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface KeepOutBar {
  readonly time: number;
  readonly open: number;
  readonly close: number;
}

export interface KeepOutCamera {
  /** The chart's visible LOGICAL range (bar index space); null means "every bar". */
  readonly visible: { readonly from: number; readonly to: number } | null;
  /** Pixels between bar centres — the slot each candle owns. */
  readonly barSpacing: number;
  readonly timeToX: (time: number) => number | null;
  readonly priceToY: (price: number) => number | null;
}

/** How many of the newest candles in view are protected. */
export const KEEP_OUT_NEWEST = 3;
/** A backing at or above this alpha hides what is under it. */
export const OPAQUE_BACKING_ALPHA = 0.5;
/** The backing a label keeps when no spot clears the candles: words stay, the body reads through. */
export const YIELDED_BACKING_ALPHA = 0.3;
/** Half a body is never narrower than this, so a zoomed-out candle still owns a target. */
export const KEEP_OUT_MIN_HALF_WIDTH = 3;
/** Vertical margin around a body, so a backing never kisses its edge. */
export const KEEP_OUT_BODY_PAD = 2;

/** Receipts published on the overlay canvas; withdrawn together when nothing consulted the keep-out. */
export const KEEP_OUT_RECEIPTS = ["candleKeepOut", "keepOutSlides", "labelsYieldedToCandles"] as const;

export const isOpaqueBacking = (alpha: number): boolean => alpha >= OPAQUE_BACKING_ALPHA;

/**
 * One box per newest-in-view candle BODY, newest first. Fewer than `count`
 * bars in view → the boxes cover what exists; no bars → no boxes.
 */
export function newestCandleKeepOut(
  bars: readonly KeepOutBar[],
  camera: KeepOutCamera,
  count: number = KEEP_OUT_NEWEST,
): ScreenRect[] {
  const out: ScreenRect[] = [];
  if (bars.length === 0 || count <= 0) return out;
  // A bar is in view when any of its slot [i-½, i+½] is: the forming candle
  // half past the right edge is still being read.
  const last = bars.length - 1;
  const i1 = camera.visible ? Math.min(last, Math.floor(camera.visible.to + 0.5)) : last;
  const i0 = camera.visible ? Math.max(0, Math.ceil(camera.visible.from - 0.5)) : 0;
  const half = Math.max(KEEP_OUT_MIN_HALF_WIDTH, (Number.isFinite(camera.barSpacing) ? camera.barSpacing : 0) * 0.5);
  for (let i = i1; i >= i0 && out.length < count; i--) {
    const b = bars[i];
    if (!b || !Number.isFinite(b.open) || !Number.isFinite(b.close)) continue;
    const x = camera.timeToX(b.time);
    const yo = camera.priceToY(b.open);
    const yc = camera.priceToY(b.close);
    if (x == null || yo == null || yc == null || !Number.isFinite(x) || !Number.isFinite(yo) || !Number.isFinite(yc)) continue;
    const top = Math.min(yo, yc) - KEEP_OUT_BODY_PAD;
    const bottom = Math.max(yo, yc) + KEEP_OUT_BODY_PAD;
    out.push({ x: x - half, y: top, w: half * 2, h: bottom - top });
  }
  return out;
}

/**
 * Every candle BODY whose slot lies under the horizontal span [x0, x1] — for a
 * label that prints along a row of history (a line named at its newest point
 * runs left over the last dozen candles), not only beside "now". Same boxes as
 * `newestCandleKeepOut` (bodies, not wicks, padded), newest first. Walks back
 * from the newest bar in view and stops once a slot lies wholly left of x0.
 */
export function spanCandleKeepOut(
  bars: readonly KeepOutBar[],
  camera: KeepOutCamera,
  x0: number,
  x1: number,
): ScreenRect[] {
  const out: ScreenRect[] = [];
  if (bars.length === 0 || !(x1 > x0)) return out;
  const last = bars.length - 1;
  const i1 = camera.visible ? Math.min(last, Math.floor(camera.visible.to + 0.5)) : last;
  const i0 = camera.visible ? Math.max(0, Math.ceil(camera.visible.from - 0.5)) : 0;
  const half = Math.max(KEEP_OUT_MIN_HALF_WIDTH, (Number.isFinite(camera.barSpacing) ? camera.barSpacing : 0) * 0.5);
  for (let i = i1; i >= i0; i--) {
    const b = bars[i];
    if (!b || !Number.isFinite(b.open) || !Number.isFinite(b.close)) continue;
    const x = camera.timeToX(b.time);
    if (x == null || !Number.isFinite(x)) continue;
    if (x + half < x0) break;
    if (x - half > x1) continue;
    const yo = camera.priceToY(b.open);
    const yc = camera.priceToY(b.close);
    if (yo == null || yc == null || !Number.isFinite(yo) || !Number.isFinite(yc)) continue;
    const top = Math.min(yo, yc) - KEEP_OUT_BODY_PAD;
    const bottom = Math.max(yo, yc) + KEEP_OUT_BODY_PAD;
    out.push({ x: x - half, y: top, w: half * 2, h: bottom - top });
  }
  return out;
}

const overlaps = (a: ScreenRect, b: ScreenRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** How many of `boxes` the rect overlaps (touching edges do not count). */
export function rectHits(rect: ScreenRect, boxes: readonly ScreenRect[]): number {
  let n = 0;
  for (const b of boxes) if (overlaps(rect, b)) n++;
  return n;
}

export type KeepOutMode =
  /** The preferred spot was already clear. */
  | "CLEAR"
  /** One of the placer's own alternate slots was taken. */
  | "MOVED"
  /** The label slid left along its own row; its y is unchanged. */
  | "SLID"
  /** Nowhere clear: the preferred spot is kept. */
  | "BLOCKED";

export interface KeepOutPlacement {
  readonly mode: KeepOutMode;
  readonly rect: ScreenRect;
  /** The returned rect still sits on a protected body — its backing must yield. */
  readonly onCandles: boolean;
  /** The preferred spot sat on a protected body — the keep-out is why it moved. */
  readonly displaced: boolean;
}

export interface KeepOutOptions {
  /** The slide never goes left of this x (the pane edge, or a column another owner holds). */
  readonly minX: number;
  /** Other chrome a MOVED or SLID label must also clear (chips already on the glass). */
  readonly blockers?: readonly ScreenRect[];
  /** When true the preferred spot must clear `blockers` too — a slot test, not only a candle test. */
  readonly strict?: boolean;
  /** The placer's own other slots, tried in order before sliding. */
  readonly alternates?: readonly ScreenRect[];
  /** Air between a slid label and the body it stepped past. */
  readonly gap?: number;
}

/**
 * Where a label with an opaque backing may print. Never returns a CLEAR,
 * MOVED or SLID rect that overlaps `keepOut`; BLOCKED keeps the preferred
 * rect and says so through `onCandles`.
 */
export function placeClearOfKeepOut(
  preferred: ScreenRect,
  keepOut: readonly ScreenRect[],
  opts: KeepOutOptions,
): KeepOutPlacement {
  const blockers = opts.blockers ?? [];
  const gap = opts.gap ?? 3;
  const displaced = rectHits(preferred, keepOut) > 0;
  const clearOf = (r: ScreenRect) => rectHits(r, keepOut) === 0 && rectHits(r, blockers) === 0;

  if (!displaced && (!opts.strict || rectHits(preferred, blockers) === 0)) {
    return { mode: "CLEAR", rect: preferred, onCandles: false, displaced };
  }
  for (const alt of opts.alternates ?? []) {
    if (alt.x >= opts.minX && clearOf(alt)) return { mode: "MOVED", rect: alt, onCandles: false, displaced };
  }
  // Each step lands left of every obstacle it currently overlaps, so x only
  // decreases and every obstacle is passed at most once.
  const obstacles = [...keepOut, ...blockers];
  let x = preferred.x;
  for (let guard = 0; guard <= obstacles.length; guard++) {
    const r = { ...preferred, x };
    const hits = obstacles.filter(o => overlaps(r, o));
    if (hits.length === 0) return { mode: "SLID", rect: r, onCandles: false, displaced };
    x = Math.min(...hits.map(o => o.x)) - gap - preferred.w;
    if (x < opts.minX) break;
  }
  return { mode: "BLOCKED", rect: preferred, onCandles: displaced, displaced };
}

/**
 * For a placer that owns a fixed slot list (above a shelf, below it, stepped
 * further out) instead of a row to slide along: the first slot clear of both
 * the chrome (`taken`) and the keep-out. When only slots on a protected body
 * are free of chrome, the first of them is kept and its backing must yield.
 * Null when every slot is taken by chrome — the caller's own rule stands.
 */
export function pickSlotClearOfKeepOut(
  slots: readonly ScreenRect[],
  keepOut: readonly ScreenRect[],
  taken: (slot: ScreenRect) => boolean,
): KeepOutPlacement | null {
  const open = slots.filter(s => !taken(s));
  if (open.length === 0) return null;
  const displaced = rectHits(open[0], keepOut) > 0;
  const clear = open.find(s => rectHits(s, keepOut) === 0);
  if (clear) return { mode: clear === open[0] ? "CLEAR" : "MOVED", rect: clear, onCandles: false, displaced };
  return { mode: "BLOCKED", rect: open[0], onCandles: true, displaced };
}

/** The backing alpha a placed label may use: unchanged unless it still sits on a protected body. */
export function keepOutBackingAlpha(placement: Pick<KeepOutPlacement, "onCandles">, alpha: number): number {
  return placement.onCandles ? Math.min(alpha, YIELDED_BACKING_ALPHA) : alpha;
}

export interface KeepOutLedger {
  /** Null until a placer consulted the keep-out this frame. */
  boxes: ScreenRect[] | null;
  slides: number;
  yields: number;
}

export const emptyKeepOutLedger = (): KeepOutLedger => ({ boxes: null, slides: 0, yields: 0 });

/** Count one placement into the frame's ledger. */
export function recordKeepOut(ledger: KeepOutLedger, placement: KeepOutPlacement): void {
  if (placement.onCandles) ledger.yields++;
  else if (placement.displaced) ledger.slides++;
}

/** The frame's receipt, or null when no placer consulted the keep-out (withdraw it). */
export function keepOutReceipt(ledger: KeepOutLedger): Record<(typeof KEEP_OUT_RECEIPTS)[number], string> | null {
  if (!ledger.boxes) return null;
  return {
    candleKeepOut: String(ledger.boxes.length),
    keepOutSlides: String(ledger.slides),
    labelsYieldedToCandles: String(ledger.yields),
  };
}
