/**
 * deltaVPGeometry — the pure layout math of the Delta + Volume Profile box.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * `computeDeltaVP` in `deltaVP.ts` is truth-locked: it owns WHAT the profile
 * says. Nothing owned WHERE it goes. The geometry lived as bare expressions
 * inside a ~7000-line canvas draw loop in `MainChart.tsx`, where no test can
 * reach it and `tsc` sees only numbers going into numbers.
 *
 * That is the same defect class this build has now confirmed twice on the
 * decision spine: a surface whose CORRECTNESS is gated and whose GEOMETRY is
 * not. There the failure was flex; here it would be a bar drawn at the wrong
 * width, an unreadable row, or a profile silently culled off-box. A canvas has
 * no DOM, so `scripts/measure-experience-geometry.mjs` cannot witness it and a
 * `renderToStaticMarkup` test certainly cannot. The only way to gate it is to
 * make the arithmetic a function.
 *
 * ── What this file is NOT ────────────────────────────────────────────────────
 *
 * It owns no truth and touches no canvas. Every value here was moved verbatim
 * out of the draw loop; the constants are the shipped constants, not improved
 * ones. Changing a number here changes what the Founder sees, which is exactly
 * why the numbers now have tests standing over them.
 *
 * ── WHY EVERYTHING HERE IS PREFIXED `dvp` AND NOT `vp` ───────────────────────
 *
 * `src/lib/vpDrawGeometry.ts` already exists and already owns pixel geometry —
 * for the WM VOLUME PROFILE INDICATOR: a right-side lane fed by `vpEngine`
 * buckets, bar length DIRECTLY proportional to volume, rows snapped at both
 * endpoints so neighbours share a boundary pixel.
 *
 * This file owns a DIFFERENT surface: the `delta-vp` DRAWING TOOL, a box the
 * trader drags over bars, fed by `computeDeltaVP`, split into two columns about
 * a centre gutter, with a 0.7 power curve on the bar length. The two modules
 * genuinely disagree on the bar-length law, and each is right for its own
 * picture — so they must not share a name. The first draft of this file exported
 * a second `vpBarWidth`; `tsc` refused it as a duplicate identifier in
 * `MainChart.tsx`, which imports both. That refusal was correct, and the names
 * were changed rather than the collision aliased away: a reader of the draw loop
 * must be able to tell which law governs the bar in front of them.
 *
 * NOTE ON THE LIVE GATE: proving the box RENDERS correctly on a live chart is a
 * separate item, now partly closed and honestly partly open.
 *
 *   CLOSED — the arithmetic, and since `dvpRowPaint` the COMPOSITION of that
 *   arithmetic into rectangles: origins, containment, the ask/bid tiling. That
 *   layer used to be inline in the draw loop, where each scalar was gated and
 *   the sum of scalars was not.
 *
 *   OPEN — the raster. Colour, alpha, stacking order and the clip are still the
 *   canvas's own, and no test in this repo witnesses them. That half is
 *   HUMAN_PROOF_REQUIRED, not green.
 */

import type { AggressorMethod } from "@/lib/marketData/marketEvent";

/** Horizontal separation between the delta column, the gutter, and the volume column. */
export const DVP_GUTTER = 3;

/** Below this the box cannot hold two labelled columns, so the profile is refused. */
export const DVP_MIN_BOX_W = 56;
export const DVP_MIN_BOX_H = 26;

/** A row shorter than this cannot seat a 10px monospace number. */
export const DVP_MIN_LABEL_ROW_H = 9;

/** A column narrower than this cannot seat its "DELTA" / "VOLUME" caption. */
export const DVP_MIN_CAPTION_W = 26;

/**
 * Bins are chosen from the box's HEIGHT, not from the data. A profile with more
 * rows than the box has pixels is a solid block, and one with fewer is a
 * staircase; ~22px per row is the shipped compromise. Clamped so a tall box
 * cannot melt the draw loop and a short one still shows a shape.
 */
export function dvpBinCount(boxHeight: number): number {
  return Math.max(6, Math.min(40, Math.round(boxHeight / 22)));
}

/**
 * True when the box can be drawn as a profile rather than a hint.
 *
 * Deliberately DERIVED from `dvpProfileRefusal` rather than repeating the three
 * conditions. The predicate and the explanation must never be able to disagree:
 * a box that admits a profile while the refusal says "too-narrow" would put the
 * draw loop and the message it prints on opposite sides of the same question.
 */
export function dvpBoxAdmitsProfile(boxWidth: number, boxHeight: number, rowCount: number): boolean {
  return dvpProfileRefusal(boxWidth, boxHeight, rowCount) === "none";
}

/**
 * WHY a box was refused a profile.
 *
 * ── The defect this exists to kill ───────────────────────────────────────────
 * `dvpBoxAdmitsProfile` refuses for THREE unrelated reasons, and the draw loop
 * used to answer all three with one sentence: "draw a wider box over bars".
 * Observed live on 2026-09-15 on TSLA 15m — a box measuring roughly 548x142 CSS
 * px, an order of magnitude past both minimums, showed that message. It was not
 * too narrow. There were simply no per-level rows for those bars.
 *
 * So the trader is told to take an action that CANNOT help, and drags a bigger
 * and bigger box forever. The honest answer is that no box size will produce a
 * profile without per-level data.
 *
 * ── Why `no-levels` outranks the size reasons ────────────────────────────────
 * Deliberately checked FIRST, even when the box is also too small. A size
 * complaint implies "resize and you will get your profile", which is a promise
 * this build cannot keep when there is nothing to bin. Naming the unfixable
 * cause first is the difference between a hint and a wild goose chase.
 *
 * Absence is not a small number and it is not a narrow box (canon H1).
 */
export type DVPRefusal = "none" | "no-levels" | "too-narrow" | "too-short";

export function dvpProfileRefusal(
  boxWidth: number,
  boxHeight: number,
  rowCount: number,
): DVPRefusal {
  if (rowCount <= 0) return "no-levels";
  if (boxWidth <= DVP_MIN_BOX_W) return "too-narrow";
  if (boxHeight <= DVP_MIN_BOX_H) return "too-short";
  return "none";
}

/**
 * The sentence shown in place of the profile. Each names the ACTUAL obstacle,
 * and only the two size messages ask the trader to do something — because only
 * those two can be fixed by doing it.
 */
export function dvpRefusalMessage(refusal: DVPRefusal): string {
  switch (refusal) {
    case "no-levels":
      // WHY this names a CAPTURE condition and not a box action. Traced in
      // MainChart's `getBarSubProfile`, which is deliberately honest:
      // "Historical OHLCV does not contain aggressor-side executions at each
      // price. Without captured real tape, leave the footprint empty — never
      // synthesize it." The tape accumulator it reads is an in-memory ref, reset
      // on every symbol / source / timeframe change and bounded to 400 bars.
      //
      // So per-level data exists for exactly one population: bars whose ticks
      // arrived while this chart was open on this timeframe. That is the tool's
      // real domain, and it is the one thing the trader needs to know. Saying
      // only "no data" would leave them guessing whether it is broken.
      // The chart is the instrument, not the explanation drawer. Keep the
      // refusal short enough to stay attached to the selected box; the full
      // provenance sentence remains on the canonical Profiles control.
      return "Delta+VP · no per-level tape · captured live only";
    case "too-narrow":
      return "Delta+VP — box too narrow for two columns";
    case "too-short":
      return "Delta+VP — box too short to bin a profile";
    case "none":
      return "";
  }
}

/**
 * One global tape absence may affect several Delta+VP drawings at once. The
 * canvas must name that shared absence once rather than stamping the same prose
 * over price for every empty drawing. Size refusals stay local to their box and
 * therefore never receive a multiplier.
 */
export function dvpGroupedRefusalMessage(refusal: DVPRefusal, count: number): string {
  const message = dvpRefusalMessage(refusal);
  const safeCount = Math.max(1, Math.floor(count));
  if (refusal !== "no-levels" || safeCount === 1) return message;
  return message.replace("Delta+VP", `Delta+VP ×${safeCount}`);
}

export interface DVPColumns {
  /** X of the centre gutter — delta grows left of it, volume right of it. */
  readonly midX: number;
  /** Drawable width of the delta column. May be negative in a degenerate box. */
  readonly leftW: number;
  /** Drawable width of the volume column. */
  readonly rightW: number;
}

export function dvpColumns(boxX: number, boxWidth: number): DVPColumns {
  const midX = boxX + Math.round(boxWidth * 0.5);
  return {
    midX,
    leftW: midX - boxX - DVP_GUTTER,
    rightW: boxX + boxWidth - midX - DVP_GUTTER,
  };
}

export interface DVPRowBox {
  readonly top: number;
  readonly height: number;
  readonly midY: number;
}

/**
 * A row's box from its two projected price edges. The edges arrive in either
 * order because price grows upward and y grows downward, and a floor of 2px
 * keeps a squeezed row visible rather than invisible — a row drawn 0px tall
 * would silently drop volume the trader believes is displayed.
 */
export function dvpRowBox(yA: number, yB: number): DVPRowBox {
  const top = Math.min(yA, yB);
  const height = Math.max(2, Math.abs(yB - yA) - 1);
  return { top, height, midY: top + height / 2 };
}

/** True when a row falls outside the box and must not be drawn. */
export function dvpRowCulled(row: DVPRowBox, boxY: number, boxHeight: number): boolean {
  return row.top + row.height < boxY - 1 || row.top > boxY + boxHeight + 1;
}

/**
 * Bar length for a fraction of the column's maximum.
 *
 * The 0.7 exponent is deliberate: a linear scale makes every row except the POC
 * look empty on a thin profile, and the trader then reads "no volume here" where
 * the truth is "less volume here". The floor guarantees a non-zero row is never
 * drawn as nothing — absence and near-zero must not look identical.
 */
export function dvpBarWidth(fraction: number, columnWidth: number, minimum: number): number {
  return Math.max(minimum, Math.round(Math.pow(fraction, 0.7) * (columnWidth - 2)));
}

/**
 * The ask-side share of a volume bar. A row with zero volume splits evenly
 * rather than dividing by zero — a NaN width silently draws nothing at all.
 */
export function dvpAskWidth(barWidth: number, buy: number, volume: number): number {
  return Math.round(barWidth * (volume ? buy / volume : 0.5));
}

/** A rectangle in canvas pixels, in the order `fillRect` takes them. */
export interface DVPRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Every rectangle one profile row paints, as a value.
 *
 * `ask` and `bid` are null on the POC row, which is painted as ONE gold bar
 * rather than split by aggressor — the POC's job is to mark the price, not to
 * re-tell the buy/sell story the rows around it already tell.
 */
export interface DVPRowPaint {
  readonly delta: DVPRect;
  readonly volume: DVPRect;
  readonly ask: DVPRect | null;
  readonly bid: DVPRect | null;
}

/**
 * ── WHY THIS EXISTS: the half of the gate the refusal atom left open ─────────
 *
 * `deltaVPGeometry.ts` closed the SCALAR half — bin counts, bar lengths, row
 * boxes — and its own header admitted the rest: "proving the box RENDERS
 * correctly on a live chart is a separate, still-open item. This proves the
 * arithmetic, not the pixels."
 *
 * The reason the pixels stayed open is that the rectangles were never a value.
 * `dvpBarWidth` returned a LENGTH, and the draw loop turned that length into an
 * origin — `midX - gap - dBarW`, `vx0 + askW` — inline, against a live `ctx`.
 * Each scalar was gated; the composition of scalars into a rectangle was not.
 * That is where a bar drawn past the box edge, or an ask/bid pair that leaves a
 * one-pixel seam, would live: in arithmetic no test could name.
 *
 * Returning the rectangles makes the composition itself assertable without a
 * canvas and without a DOM. The draw loop keeps the colours and the clip; it no
 * longer keeps the geometry.
 *
 * ── The tiling property, and why it is exact ────────────────────────────────
 *
 * `bid.w` is DERIVED as `volume.w - ask.w`, never rounded a second time. Two
 * independent `Math.round` calls on the two halves would disagree with the whole
 * by a pixel about half the time, and the trader would see a hairline seam or a
 * one-pixel overlap darkening the join. Ask and bid must tile the volume bar
 * exactly: `ask.w + bid.w === volume.w`, `bid.x === ask.x + ask.w`.
 */
export function dvpRowPaint(args: {
  readonly row: DVPRowBox;
  readonly columns: DVPColumns;
  readonly volumeFraction: number;
  readonly deltaFraction: number;
  readonly buy: number;
  readonly volume: number;
  readonly isPOC: boolean;
}): DVPRowPaint {
  const { row, columns, volumeFraction, deltaFraction, buy, volume, isPOC } = args;
  const { midX, leftW, rightW } = columns;

  const volW = dvpBarWidth(volumeFraction, rightW, 3);
  const volX = midX + DVP_GUTTER;
  const volumeRect: DVPRect = { x: volX, y: row.top, w: volW, h: row.height };

  const deltaW = dvpBarWidth(deltaFraction, leftW, 2);
  const deltaRect: DVPRect = {
    x: midX - DVP_GUTTER - deltaW,
    y: row.top,
    w: deltaW,
    h: row.height,
  };

  if (isPOC) {
    return { delta: deltaRect, volume: volumeRect, ask: null, bid: null };
  }

  const askW = dvpAskWidth(volW, buy, volume);
  return {
    delta: deltaRect,
    volume: volumeRect,
    ask: { x: volX, y: row.top, w: askW, h: row.height },
    // NOT dvpAskWidth's complement computed afresh — the remainder, so the two
    // halves can never fail to add up to the bar they divide.
    bid: { x: volX + askW, y: row.top, w: volW - askW, h: row.height },
  };
}

/**
 * Compact number for the on-row labels. Thousands are abbreviated because a
 * full count does not fit beside a 10px row, and the threshold for dropping the
 * decimal is where the extra digit would overflow the gutter.
 */
export function dvpFormatCount(v: number): string {
  const a = Math.abs(v);
  return a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : String(Math.round(a));
}

/**
 * HOW THE SIDES WERE KNOWN decides how they may be painted.
 *
 * A provider-stamped aggressor (or a maker side inverted, which is the same
 * fact read from the other party) is an observation: solid ask/bid fills. A
 * side inferred by the tick rule or a quote test is a GUESS about each print,
 * and painting it in the same solid ink as an observation is how a guess
 * passes for evidence. So an inferred split is drawn outline-only and says
 * INFERRED SIDE. With no aggressor method at all there is no lawful split to
 * draw, and the box takes the no-levels refusal — never a split from bars.
 */
export type DVPSideStyle = "SOLID_PROVIDER" | "SOLID_MAKER_SIDE" | "OUTLINE_INFERRED" | "WITHHOLD";

export function dvpSideStyle(method: AggressorMethod | null | undefined): DVPSideStyle {
  switch (method) {
    case "PROVIDER":
      return "SOLID_PROVIDER";
    case "MAKER_SIDE_INVERTED":
      return "SOLID_MAKER_SIDE";
    case "TICK_RULE":
    case "QUOTE_TEST":
      return "OUTLINE_INFERRED";
    default:
      return "WITHHOLD";
  }
}

/**
 * How many of the box's bars carry sided tape. Tape is captured live only, so
 * a box usually spans bars that were never watched; those bars add nothing to
 * the split, and a total that silently omits them reads as the whole span.
 * The count goes in the chip and the uncovered bars are hatched.
 */
export interface DVPCoverage {
  readonly bars: number;
  readonly withTape: number;
  readonly state: "FULL" | "PARTIAL" | "NONE";
  /** `k/N` — printed verbatim. */
  readonly label: string;
}

export function dvpCoverage(barsInSpan: number, barsWithTape: number): DVPCoverage {
  const n = Math.max(0, Math.floor(barsInSpan));
  const k = Math.min(n, Math.max(0, Math.floor(barsWithTape)));
  const state = k === 0 ? "NONE" : k === n ? "FULL" : "PARTIAL";
  return { bars: n, withTape: k, state, label: `${k}/${n}` };
}

/**
 * The box's one header: the split, how much of the span it covers, how the
 * sides were known, and the net. Never the tool's old name — "Delta+VP" said
 * nothing about coverage or method.
 */
export function dvpSplitChip(
  coverage: DVPCoverage,
  style: Exclude<DVPSideStyle, "WITHHOLD">,
  totalDelta: number,
): string {
  const method = style === "SOLID_PROVIDER" ? "PROVIDER" : style === "SOLID_MAKER_SIDE" ? "MAKER-SIDE" : "INFERRED";
  return `BID/ASK SPLIT · TAPE ${coverage.label} BARS · ${method} · net ${totalDelta >= 0 ? "+" : "−"}${dvpFormatCount(totalDelta)}`;
}

/** Hatch pitch for bars without sided tape: 1px lines at 45°, this far apart. */
export const DVP_HATCH_PITCH = 6;

export interface DVPSpan {
  readonly x0: number;
  readonly x1: number;
}

/**
 * The x-spans of the bars inside the box that carry NO sided tape, each bar
 * `barSpacing` wide about its centre, clamped to the box and merged where
 * neighbours touch so the hatch runs without seams. Bars that cannot be
 * projected are skipped rather than guessed at.
 */
export function dvpUncoveredSpans(
  bars: readonly { readonly x: number | null; readonly covered: boolean }[],
  barSpacing: number,
  boxX: number,
  boxWidth: number,
): DVPSpan[] {
  const half = Math.max(1, barSpacing) / 2;
  const left = boxX;
  const right = boxX + boxWidth;
  const spans: { x0: number; x1: number }[] = [];
  const sorted = bars.filter(b => !b.covered && b.x != null && Number.isFinite(b.x)).map(b => b.x as number).sort((a, z) => a - z);
  for (const x of sorted) {
    const x0 = Math.max(left, x - half);
    const x1 = Math.min(right, x + half);
    if (!(x1 > x0)) continue;
    const last = spans[spans.length - 1];
    if (last && x0 <= last.x1 + 0.5) last.x1 = Math.max(last.x1, x1);
    else spans.push({ x0, x1 });
  }
  return spans;
}

/**
 * The 45° hatch segments for one span, bottom-left to top-right, on a pitch
 * anchored at x = 0 so neighbouring spans and repaints line up. Segments run
 * past the span's ends; the canvas clips them to the span.
 */
export function dvpHatchSegments(
  span: DVPSpan,
  boxY: number,
  boxHeight: number,
  pitch: number = DVP_HATCH_PITCH,
): { x0: number; y0: number; x1: number; y1: number }[] {
  const out: { x0: number; y0: number; x1: number; y1: number }[] = [];
  if (!(span.x1 > span.x0) || !(boxHeight > 0) || !(pitch > 0)) return out;
  const bottom = boxY + boxHeight;
  for (let x = Math.floor((span.x0 - boxHeight) / pitch) * pitch; x <= span.x1; x += pitch) {
    out.push({ x0: x, y0: bottom, x1: x + boxHeight, y1: boxY });
  }
  return out;
}
