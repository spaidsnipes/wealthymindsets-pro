/**
 * A MODE THAT CHANGES WHAT EVERY NUMBER MEANS MAY NOT BE ANNOUNCED BY COLOUR.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, NQ1! 30m, the four
 * axis-control glyphs at the bottom-right of the canvas, read out of the DOM:
 *
 *   681,1358  22x22  "R"  aria-label=""  aria-pressed=null
 *   681,1384  22x22  "A"  aria-label=""  aria-pressed=null
 *   681,1410  22x22  "%"  aria-label=""  aria-pressed=null  title="Percentage mode"
 *   681,1436  22x22  "L"  aria-label=""  aria-pressed=null  title="Log scale"
 *
 * Two separate defects, and the second is not an accessibility nicety.
 *
 * 1. THE ACCESSIBLE NAME IS THE GLYPH. A `title` does not override an element's
 *    own text content, so these buttons are announced as "R", "A", "percent"
 *    and "L". The same defect `timeframeSpokenName` was written against one
 *    strip over — a control whose name is a single character is not a labelled
 *    control.
 *
 * 2. `%` AND `L` CARRIED THEIR STATE IN COLOUR AND NOWHERE ELSE. Their titles
 *    were bare nouns — "Percentage mode", "Log scale" — IDENTICAL whether the
 *    mode was on or off, and `active` fed nothing but a background colour.
 *
 * The second one is a truth defect. Percentage mode rewrites every number on
 * the price axis from a PRICE into a PERCENT CHANGE FROM THE FIRST BAR. A
 * trader who cannot tell the mode is on is reading percentages as prices —
 * canon Weakness #1's exact shape, a number wearing another quantity's
 * clothes, arrived at through an invisible mode instead of a mislabelled cell.
 * Log scale is the same argument one step quieter: it does not change the
 * numbers but it changes what the DISTANCE between them means, which is the
 * whole claim a chart makes.
 *
 * `A` was already honest — its title said "Auto Scale ON" or "Scale LOCKED" —
 * and that sentence is preserved here verbatim rather than reworded, because
 * it was right. It gains only the machine-readable half it was missing.
 *
 * ── WHAT THIS OWNER DOES NOT DO ───────────────────────────────────────
 * It does not touch the glyphs. `R A % L` is a dense, learned, one-hand
 * vocabulary on a chart that has very little room at the bottom-right, and
 * replacing them with words would trade a real ergonomic for a fix that the
 * accessible name already delivers. The visible glyph stays; the NAME becomes
 * a sentence.
 */

export type ChartAxisControl = "RESET" | "AUTO_SCALE" | "PERCENT" | "LOG";

export interface ChartAxisControlLabel {
  /** The glyph. Unchanged from what shipped — the vocabulary is deliberate. */
  readonly glyph: string;
  /** The accessible name. Always a sentence, always carries the state. */
  readonly spoken: string;
  /** Hover text. For the toggles it states the CURRENT state, never a bare noun. */
  readonly title: string;
  /**
   * `aria-pressed` for the three toggles; `undefined` for `RESET`, which is an
   * ACTION and not a mode. A momentary action wearing `aria-pressed="false"`
   * would announce a state it does not have.
   */
  readonly pressed: boolean | undefined;
}

/**
 * Pure. `active` is REQUIRED for the toggles for the same reason the glyph is:
 * a caller that can omit it is a caller that can silently reopen the defect
 * this owner exists to close.
 */
export function chartAxisControlLabel(
  control: ChartAxisControl,
  active: boolean,
): ChartAxisControlLabel {
  switch (control) {
    case "RESET":
      return {
        glyph: "R",
        spoken: "Reset view — re-centre the chart and undo any vertical drag",
        title: "R — Reset View: re-center the chart and undo any vertical drag",
        // An action, not a mode. See `pressed` above.
        pressed: undefined,
      };

    case "AUTO_SCALE":
      // These two sentences shipped already and were correct. They are carried
      // across unchanged; the control was only ever missing the machine half.
      return {
        glyph: "A",
        spoken: active
          ? "Auto scale, on — the chart auto-fits price. Activate to lock the scale."
          : "Auto scale, off — the price scale is locked and can be dragged. Activate to re-enable auto scale.",
        title: active
          ? "A — Auto Scale ON: chart auto-fits price. Click to LOCK, then drag the price axis up/down to see higher/lower prices."
          : "A — Scale LOCKED: drag the price axis (right side) up/down to pan, or scroll to zoom. Click to re-enable Auto Scale.",
        pressed: active,
      };

    case "PERCENT":
      // The axis stops showing prices. Saying so is the entire point of this
      // owner — the old title said "Percentage mode" in both states.
      return {
        glyph: "%",
        spoken: active
          ? "Percentage mode, on — the price axis is showing percent change from the first bar, not prices."
          : "Percentage mode, off — the price axis is showing prices.",
        title: active
          ? "% — Percentage mode ON: the price axis is NOT showing prices. Every number on it is percent change from the first loaded bar. Click to return to prices."
          : "% — Percentage mode OFF: the price axis is showing prices. Click to show percent change from the first loaded bar instead.",
        pressed: active,
      };

    case "LOG":
      // Log scale does not change the numbers; it changes what the distance
      // between them means, which is the claim a chart is making.
      return {
        glyph: "L",
        spoken: active
          ? "Logarithmic price axis, on — equal vertical distance means equal percent move."
          : "Logarithmic price axis, off — the axis is linear; equal vertical distance means equal price move.",
        title: active
          ? "L — Log scale ON: the price axis is logarithmic. Equal vertical distance means equal PERCENT move, not equal price move. Click for a linear axis."
          : "L — Log scale OFF: the price axis is linear. Equal vertical distance means equal PRICE move. Click for a logarithmic axis.",
        pressed: active,
      };
  }
}
