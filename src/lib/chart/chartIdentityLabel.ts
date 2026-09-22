/**
 * ── WHAT INSTRUMENT AM I LOOKING AT? ────────────────────────────────────────
 *
 * LOOKED AT, NOT INFERRED. 2026-09-21, canon frame F24 beside a 1440x900 shot
 * of this build's /charts room. F24 prints its identity INSIDE the candle pane,
 * at the legend's leading edge:
 *
 *     TSLA · Tesla, Inc. · 1D · NASDAQ
 *
 * This build prints no identity in the pane at all. The price legend opens
 * straight into a number. Read back from the live DOM, the symbol appears in
 * exactly two places on the whole screen:
 *
 *   1. the search field in `.wm-chart-toolbar` (a 32px chrome row), and
 *   2. the decision spine's `MARKET NQ1! · 5m` line, 1100px away on the far
 *      right flank.
 *
 * That matters beyond taste. The toolbar row is the single largest remaining
 * piece of chrome above the candles, and the plan is to move it into the Tools
 * room — whose door already reads "Open in this room". Delete that row while
 * the pane still has no identity of its own and the instrument's NAME leaves
 * the market surface entirely. So identity has to arrive here FIRST. This
 * module exists to make that ordering a fact in the codebase rather than a
 * note in somebody's head.
 *
 * ── IT PRINTS ONLY WHAT IT CAN PROVE ────────────────────────────────────────
 * F24 draws four parts. This build can honestly supply two.
 *
 *   symbol     — the instrument the room is tuned to. Always known; it is the
 *                prop the whole chart is built from.
 *   timeframe  — the bar size, read from the canonical TIMEFRAME table so this
 *                label and the toolbar cannot drift into two spellings of one
 *                fact (the exact defect `src/lib/timeframes.ts` was written to
 *                end: "D" vs "1D").
 *
 * The other two are DELIBERATELY ABSENT, and the absence is the honest answer:
 *
 *   company name — no owner exists. Nothing in `src/lib` resolves a ticker to
 *                  "Tesla, Inc.". Printing the ticker twice, or a prettified
 *                  guess, would be decoration wearing a fact's clothes.
 *   exchange     — the nearest thing available is `canonicalAssetClass()`, and
 *                  it is a CLASSIFIER, not a venue: its final line is
 *                  `return "equity"` for everything it does not recognise. It
 *                  would confidently stamp NASDAQ-ish authority on a symbol it
 *                  has never seen. An asset class is also not an exchange even
 *                  when it is right.
 *
 * When either gets a real owner, it belongs HERE, as another part — not as a
 * second span written at the call site.
 */

import { getTimeframe, isTFId, normalizeTFId } from "../timeframes";

/** One printable fact about the instrument, and the words for saying it aloud. */
export interface ChartIdentityPart {
  /** What this part IS, for tests, tooltips and screen readers. */
  readonly kind: "symbol" | "timeframe";
  /** The glyphs. Never empty — a part with nothing to print is not returned. */
  readonly text: string;
  /** A whole sentence. Screen readers get this, not the bare glyphs. */
  readonly spoken: string;
}

export interface ChartIdentityLabel {
  /** Leading edge first. Always at least one part (the symbol). */
  readonly parts: readonly ChartIdentityPart[];
  /** The parts joined for the eye, e.g. `NQ1! · 5m`. */
  readonly text: string;
  /** The parts joined for the ear, as one sentence. */
  readonly spoken: string;
}

/** The separator F24 uses between identity parts. */
export const IDENTITY_SEPARATOR = " · ";

/**
 * A symbol is printed as the trader typed it, uppercased and trimmed — the same
 * normalisation `canonicalAssetClass` applies before it reasons about one, so
 * the label and the classifier cannot be looking at different strings.
 *
 * A BLANK SYMBOL IS NOT AN EMPTY LABEL. If it were, this function could return
 * `{ parts: [], text: "" }` and every `toContain` assertion downstream would
 * pass vacuously while the pane silently lost its identity — the exact failure
 * mode the house calls a VACUOUS GUARD. It returns `null` instead, which is
 * unrepresentable as "fine" and forces the caller to decide.
 */
export function chartIdentityLabel(
  symbol: string,
  timeframe: string,
): ChartIdentityLabel | null {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return null;

  const parts: ChartIdentityPart[] = [
    { kind: "symbol", text: ticker, spoken: `Instrument ${ticker}` },
  ];

  /**
   * `normalizeTFId` exists because saved layouts still carry the pre-2026-07
   * literals ("D", "W", "M"). A label that refused those would go blank for a
   * trader whose localStorage predates the migration — a regression visible
   * only to the people who have used the product longest.
   */
  const id = normalizeTFId(timeframe);
  if (id !== null && isTFId(id)) {
    const label = getTimeframe(id).label;
    parts.push({
      kind: "timeframe",
      text: label,
      spoken: `${label} bars`,
    });
  }

  return {
    parts,
    text: parts.map(p => p.text).join(IDENTITY_SEPARATOR),
    spoken: parts.map(p => p.spoken).join(". ") + ".",
  };
}
