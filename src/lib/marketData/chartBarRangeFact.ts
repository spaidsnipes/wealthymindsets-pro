/**
 * THREE CELLS THAT CLAIM MEASUREMENT OVER AN EMPTY RECORD.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, NQ1! 30m, one viewport,
 * read straight out of the DOM:
 *
 *   O 29701.00   H 29701.00   L 29701.00   NOW 29701.00   V 0
 *
 * `H` is painted in the high colour and `L` in the low colour. Those two cells
 * are the chart's answer to "how far did price travel inside this bar" — and
 * the bar's own volume cell, two elements to the right, says the record holds
 * ZERO trades. There is no high. There is no low. There is no range. What the
 * strip is actually showing is one number, carried forward from before this
 * bar began, retyped four times in three colours.
 *
 * This is the same family as the defect `selectChartCloseLabel` was written
 * against, one cell to the left: a value that was never observed, wearing an
 * observation's clothes. There the fix was to grade the WORD (`C` → `NOW`).
 * Here three cells are asserting a measurement that the adjacent cell already
 * disproves, so the fix is to stop drawing the assertion.
 *
 * ── WHAT THIS OWNER WILL AND WILL NOT CLAIM ───────────────────────────
 * It will NOT say "no trades happened in the market." It cannot know that.
 * Some feeds never report volume at all, and on those every bar would carry a
 * zero — turning this into an overclaim in the opposite direction, which §35
 * treats as the same defect wearing the other coat.
 *
 * What it says is a statement about the RECORD, which is the only thing in
 * evidence: this bar's record carries no volume AND no range. Both halves are
 * required. A zero-volume bar that still moved is a feed that does not report
 * volume, and its high and low are real measurements that must keep their
 * cells. A bar with range but no volume keeps its cells too. Only when BOTH
 * are empty is there nothing to draw, and then the honest render is one cell
 * saying so — not three cells implying otherwise.
 *
 * The `NOW`/`C` value is NOT this owner's business and is never suppressed.
 * Where price stands is genuinely useful; removing it would trade an overclaim
 * for a blindness, which §35 PROTECTED TRUTH rejects just as firmly.
 */

export type ChartBarRangeKind = "RANGE" | "NO_RECORD";

export interface ChartBarRangeFact {
  readonly kind: ChartBarRangeKind;
  /** True when the O/H/L cells may be drawn as measurements. */
  readonly measured: boolean;
  /** The single phrase that replaces O/H/L when `measured` is false. */
  readonly text: string;
  /** Hover text. Always present; the phrase alone is too terse to carry this. */
  readonly title: string;
}

const RANGE: ChartBarRangeFact = {
  kind: "RANGE",
  measured: true,
  text: "",
  title: "",
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Pure. `timeframe` is used only to name the bar in the hover text; an absent
 * or blank one degrades the wording, never the verdict.
 */
export function chartBarRangeFact(
  bar:
    | { open?: unknown; high?: unknown; low?: unknown; close?: unknown; volume?: unknown }
    | null
    | undefined,
  timeframe?: string | null,
): ChartBarRangeFact {
  if (!bar) return RANGE;

  const o = num(bar.open);
  const h = num(bar.high);
  const l = num(bar.low);
  const c = num(bar.close);
  const v = num(bar.volume);

  // Volume must be exactly zero. A bar with one contract in it has a real
  // high and a real low even if they are the same price. `num()` returns null
  // for anything missing or non-finite, and null fails this test — a field we
  // could not read is never mistaken for a field that read zero.
  if (v !== 0) return RANGE;

  // Range must be exactly zero across all four. If the bar moved, the feed
  // simply does not report volume and the extremes are genuine measurements.
  // Strict equality also carries the unreadable-field case: a null can never
  // equal a number, so a bar with a missing leg falls through to RANGE and
  // keeps its cells. Missing numbers are not proof of an empty record — they
  // are proof that we cannot judge, and we do not judge.
  if (!(o === h && h === l && l === c)) return RANGE;

  const tf = typeof timeframe === "string" ? timeframe.trim() : "";
  return {
    kind: "NO_RECORD",
    measured: false,
    text: "NO RANGE RECORDED",
    title:
      `This ${tf || "current"} bar's record carries no volume and no range — ` +
      "its open, high and low are all the same number, carried in from before " +
      "the bar began. WM will not draw a high and a low for a bar that has " +
      "recorded no trading. This is a statement about the record, not about " +
      "the market: a feed that does not report volume can also look like this.",
  };
}
