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
 * separate, still-open item. This proves the arithmetic, not the pixels.
 */

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
      return "Delta+VP — no per-level trade data for these bars";
    case "too-narrow":
      return "Delta+VP — box too narrow for two columns";
    case "too-short":
      return "Delta+VP — box too short to bin a profile";
    case "none":
      return "";
  }
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

/**
 * Compact number for the on-row labels. Thousands are abbreviated because a
 * full count does not fit beside a 10px row, and the threshold for dropping the
 * decimal is where the extra digit would overflow the gutter.
 */
export function dvpFormatCount(v: number): string {
  const a = Math.abs(v);
  return a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : String(Math.round(a));
}
