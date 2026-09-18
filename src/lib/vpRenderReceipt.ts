/**
 * What the Volume Profile ACTUALLY drew — the render receipt.
 *
 * THE GAP THIS CLOSES. `src/lib/vpEngine.ts` owns where the volume goes and
 * `src/lib/vpDrawGeometry.ts` owns where the pixels go. Both are pure and both
 * are tested. Neither can tell you whether the profile you asked for appeared
 * on the screen, because neither of them runs the draw loop.
 *
 * `drawWMVP` has FIVE early returns, and every one of them is a decline:
 *
 *   · no bars in the requested source
 *   · a flat price range (high === low)
 *   · the engine produced no rows / no volume
 *   · no populated buckets survived re-keying onto the draw grid
 *   · `vpColumnLayout(...).fits === false` — no horizontal room for the column
 *
 * Until now all five returned `undefined` into a void context. The toolbar
 * toggle stayed lit, the trader looked at a chart with no histogram on it, and
 * nothing anywhere — not a pixel, not an attribute, not a console line —
 * distinguished "your profile is drawn and it is thin" from "your profile was
 * never drawn". §5 SYSTEM TRUTH LAW: work that was requested and not performed
 * has to say so.
 *
 * `vpDrawGeometry` already made the LAST of those five explicit to its caller
 * (`fits: false`, added when the inline arithmetic was found painting bars at a
 * negative x). This module is the other half of that repair: the caller now has
 * somewhere to put the answer, and all five declines arrive in the same shape.
 *
 * WHY A RECEIPT AND NOT A BOOLEAN. Two profiles can be requested at once
 * (Fixed + Session, side by side). "Did the VP draw?" has no single answer in
 * that case — one column can be fully drawn while the other is declined for a
 * reason that belongs only to it, which is exactly the Founder-reported
 * "Session VP disappeared" shape. So the receipt counts attempts and keeps each
 * decline attributed to the profile that suffered it.
 *
 * PURE. Nothing here touches a canvas, a chart handle, or the DOM, so the
 * arithmetic the chart stamps is the arithmetic under test.
 */

/** Which of the two profiles an attempt belongs to. */
export type VpProfileKind = "FIXED" | "SESSION";

/**
 * Why a requested column produced no histogram.
 *
 * These are the five early returns in `drawWMVP`, named. They are deliberately
 * DISTINCT rather than collapsed into one "EMPTY": a profile with no bars in
 * its source is a data problem the trader can act on by widening the range,
 * and a profile with no room is a layout problem they act on by widening the
 * pane. Reporting both as "empty" would send them to fix the wrong thing.
 */
export type VpDeclineReason =
  /** The requested bar source was empty — e.g. Session VP on a symbol with no bars in session. */
  | "NO_BARS"
  /** high === low across the whole source, so there is no price axis to bucket. */
  | "FLAT_RANGE"
  /** The engine returned no rows, or zero total volume. */
  | "NO_VOLUME"
  /** Rows existed but none survived re-keying onto the draw grid. */
  | "NO_BUCKETS"
  /** `vpColumnLayout` reported `fits: false` — the usable span cannot hold this column. */
  | "NO_ROOM";

/**
 * Where a drawn column's right edge landed, and against what.
 *
 * WHY THIS IS ON THE RECEIPT AND NOT ONLY IN `vpDrawGeometry`'s tests.
 * `vpColumnLayout` is pure and well covered, so the FORMULA is proven. But a
 * pure function is only as honest as the numbers handed to it, and the whole
 * point of this layer is that it is handed a live measurement — the price
 * axis width, which grows with the instrument's digit count. A unit test
 * feeds that formula a number chosen by the test. Nothing, anywhere, checked
 * that the number the RENDERER passes is the real axis width.
 *
 * 2026-09-17: that exact gap produced three separate live defects on this
 * canvas — a chip, a window label and a clamp all measured against
 * `cont.offsetWidth`, the CONTAINER's edge, which includes the price axis and
 * the time axis. Each was arithmetically correct, drew every frame, and was
 * painted underneath an axis where no one had ever read it. A formula that is
 * right about the wrong edge is indistinguishable from a formula that is
 * wrong, and no test on either side can see the difference.
 *
 * So the runtime geometry travels WITH the render receipt, and the receipt
 * computes the one number that matters.
 */
export interface VpColumnGeometry {
  /** Full overlay canvas width in CSS px — includes the price axis gutter. */
  readonly canvasWidth: number;
  /** Width reserved for the price axis, as measured live this frame. */
  readonly priceScaleWidth: number;
  /** x of the column's right edge, as `vpColumnLayout` returned it. */
  readonly right: number;
}

/** One profile's outcome for one frame. */
export interface VpColumnAttempt {
  readonly profile: VpProfileKind;
  /**
   * Null means the column was drawn. A reason means it was not.
   *
   * Null-as-success rather than a separate `drawn` flag, so a caller cannot
   * report `drawn: true` alongside a reason and leave the receipt to guess.
   */
  readonly declined: VpDeclineReason | null;
  /**
   * Price rows actually painted. Meaningful only for a drawn column; a declined
   * column is required to report 0.
   */
  readonly rows: number;
  /**
   * The pixel geometry this column was laid out with, when it drew.
   *
   * Optional because a DECLINED column has no geometry to report — and an
   * absent measurement must not be encoded as a measurement of zero, which
   * would read as "flush against the axis" and raise a false alarm.
   */
  readonly geometry?: VpColumnGeometry;
}

export interface VpRenderReceipt {
  /** Columns the toolbar asked for this frame. */
  readonly requested: number;
  /** Columns that painted at least one row. */
  readonly drawn: number;
  /** Columns that were asked for and did not appear. */
  readonly declined: number;
  /** Total price rows painted across all drawn columns. */
  readonly rows: number;
  /**
   * A short line naming what is missing, or null when nothing is.
   *
   * Null is the ONLY honest value when every requested column drew — a note
   * saying "all good" would be a claim this module cannot make, since it sees
   * counts and not pixels. Absence of a complaint is not a certificate.
   */
  readonly note: string | null;
  /**
   * Pixels between the rightmost drawn column and the start of the price axis,
   * taken across every drawn column — so it reports the WORST case, not an
   * average that a second, safer column could hide.
   *
   * Positive is clearance. Zero or negative means the histogram is being
   * painted over the price labels, which is the failure `vpDrawGeometry`'s
   * header names and which until now nothing could observe.
   *
   * Null when no column drew, or when no drawn column reported geometry.
   * Null is "not measured" and is never conflated with 0, which is "measured,
   * and flush against the axis".
   */
  readonly axisClearancePx: number | null;
}

const EMPTY: VpRenderReceipt = Object.freeze({
  requested: 0,
  drawn: 0,
  declined: 0,
  rows: 0,
  note: null,
  axisClearancePx: null,
});

const WORDING: Record<VpDeclineReason, string> = {
  NO_BARS: "no bars in its source",
  FLAT_RANGE: "a flat price range",
  NO_VOLUME: "no volume at any level",
  NO_BUCKETS: "no populated price levels",
  NO_ROOM: "no room in the pane",
};

const LABEL: Record<VpProfileKind, string> = {
  FIXED: "Fixed VP",
  SESSION: "Session VP",
};

/**
 * Fold a frame's attempts into one receipt.
 *
 * A DRAWN column that painted zero rows is counted as DECLINED with
 * `NO_BUCKETS`, regardless of what the caller claimed. The draw loop can pass
 * every guard and still `continue` past every single row — every bucket
 * off-screen — and a column that painted nothing is not a column the trader can
 * see. Trusting the caller's word over the row count is how a receipt starts
 * certifying work rather than recording it.
 */
export function compileVpRenderReceipt(
  attempts: readonly VpColumnAttempt[],
): VpRenderReceipt {
  if (!attempts.length) return EMPTY;

  let drawn = 0;
  let rows = 0;
  let axisClearancePx: number | null = null;
  const missing: string[] = [];

  for (const a of attempts) {
    const rowCount = Number.isFinite(a.rows) && a.rows > 0 ? Math.floor(a.rows) : 0;
    const reason: VpDeclineReason | null =
      a.declined ?? (rowCount === 0 ? "NO_BUCKETS" : null);

    if (reason === null) {
      drawn += 1;
      rows += rowCount;
      // Geometry is read only from columns that actually drew. A declined
      // column's layout numbers describe pixels nobody saw, and folding them
      // in would let a column that was never painted set the clearance the
      // trader is told about.
      const clearance = columnClearance(a.geometry);
      if (clearance !== null) {
        axisClearancePx =
          axisClearancePx === null ? clearance : Math.min(axisClearancePx, clearance);
      }
    } else {
      missing.push(`${LABEL[a.profile]} not drawn — ${WORDING[reason]}`);
    }
  }

  // An overlap is a louder fact than a decline: the trader is looking at a
  // profile that IS there and at prices they cannot read. It joins the same
  // note rather than getting a channel of its own, so one place answers "what
  // is wrong with the profile right now".
  if (axisClearancePx !== null && axisClearancePx <= 0) {
    missing.push(
      `profile drawn over the price axis by ${Math.abs(axisClearancePx)}px`,
    );
  }

  return {
    requested: attempts.length,
    drawn,
    declined: attempts.length - drawn,
    rows,
    note: missing.length ? missing.join(" · ") : null,
    axisClearancePx,
  };
}

/**
 * Clearance between one column's right edge and the price axis, or null when
 * the column reported no usable geometry.
 *
 * Non-finite inputs return null rather than a number. A NaN that slipped
 * through as 0 would announce a collision with the price axis that is not
 * happening, and a false alarm about a truth failure costs the same trust as
 * missing a real one.
 */
function columnClearance(geometry: VpColumnGeometry | undefined): number | null {
  if (!geometry) return null;
  const { canvasWidth, priceScaleWidth, right } = geometry;
  if (!Number.isFinite(canvasWidth)) return null;
  if (!Number.isFinite(priceScaleWidth)) return null;
  if (!Number.isFinite(right)) return null;
  return Math.round(canvasWidth - priceScaleWidth - right);
}
