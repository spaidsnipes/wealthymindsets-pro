/**
 * A SIGNED COLOURED NUMBER BESIDE A TICKER IS A PRICE CHANGE. THIS ONE ISN'T.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, the Evidence-saved
 * popover, read straight out of the DOM — visible text on the left, the
 * element's own `title` on the right:
 *
 *   BTC   +290.93   │ "BTC: 229,371 trades observed. Δ 290.93. Big 1375."
 *   TSLA    -0.19   │ "TSLA: 100 trades observed. Δ -0.19. Big 0."
 *   META    +0.01   │ "META: 37 trades observed. Δ 0.01. Big 0."
 *   AAPL    -0.01   │ "AAPL: 5 trades observed. Δ -0.01. Big 0."
 *
 * `+0.01` was painted green and `-0.01` red, in the one slot on a trading
 * screen that is universally read as "change today, in the instrument's
 * currency". It is not a price change and it is not in dollars. It is
 * `sessionSymbolStore.stats.delta` — a signed sum of `tick.size`, i.e. NET
 * AGGRESSIVE VOLUME in shares, contracts or coins.
 *
 * The `Δ` that makes the number legible was present — in the `title`, where it
 * reaches a hover and nothing else.
 *
 * ── THE CHIP WAS ALREADY CARRYING THE CURE ────────────────────────────
 * `NectarVaultChip`'s own docblock, thirty-five lines above the render this
 * owner replaces, states the law it went on to break:
 *
 *   "the qualifier travels WITH the reading. Different nouns cannot be
 *    mistaken for one another; bare integers can."
 *
 * So the first half of the fix is not an invention. It is the file obeying the
 * sentence it already wrote down.
 *
 * ── THE SECOND HALF: COLOUR WAS A VERDICT ON NOISE ────────────────────
 * The old colour came from `Math.sign(delta)` and nothing else. That paints
 * AAPL's net −0.01 shares — assembled from FIVE observed trades — in the same
 * red as a genuine net −290 of anything. Colour may never carry state alone,
 * and it may certainly never carry a verdict the record cannot support.
 *
 * The honest discriminator cannot be an absolute size: `0.5` is dust in AAPL
 * shares and an enormous trade in BTC. So this owner grades the IMBALANCE
 * RATIO, |delta| ÷ (buyVol + sellVol), which is dimensionless and therefore
 * means the same thing on every instrument WM can draw.
 *
 * {@link DIRECTION_MIN_IMBALANCE} is declared as a CONVENTION, not derived —
 * saying otherwise would be its own small overclaim. Below it, buy and sell
 * volume agree to within one part in a hundred, and calling that "buyers in
 * control" is a verdict on a coin flip.
 *
 * ── WHAT IS WITHHELD, AND WHAT NEVER IS ───────────────────────────────
 * Only the DIRECTION COLOUR is withheld. The number itself is always rendered,
 * always signed, always prefixed with `Δ`. §35 PROTECTED TRUTH rejects trading
 * an overclaim for a blindness just as firmly as the overclaim: a trader who
 * cannot see the delta at all is worse off than one who sees it uncoloured.
 */

export type EvidenceDeltaKind =
  /** Sided volume observed and the imbalance clears the convention. */
  | "DIRECTIONAL"
  /** Sided volume observed, but buys and sells are within the convention. */
  | "BALANCED"
  /** No sided volume has been observed at all — nothing to be balanced about. */
  | "UNOBSERVED";

export interface EvidenceDeltaChip {
  readonly kind: EvidenceDeltaKind;
  /** The visible glyph. Always carries `Δ`, so it cannot read as a price. */
  readonly text: string;
  /**
   * `1`, `-1`, or `0`. `0` means "do not paint a direction colour" — it is NOT
   * a claim that the delta is zero, which is why the sign still shows in `text`.
   */
  readonly direction: 1 | -1 | 0;
  /** Hover text. Names the unit, the sample and, when withheld, the reason. */
  readonly title: string;
  /** Appended to the row's accessible name so the delta is not hover-only. */
  readonly spoken: string;
}

/**
 * A CONVENTION, not a derivation. One percent net imbalance.
 *
 * Any threshold here is a choice; pretending otherwise would be the kind of
 * borrowed authority this file exists to remove. What is defensible is the
 * SHAPE: a dimensionless ratio, so the same rule governs a five-share equity
 * tape and a six-figure crypto tape.
 */
export const DIRECTION_MIN_IMBALANCE = 0.01;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Enough precision to show sub-unit dust for what it is, without a wall of zeros. */
function fmtDelta(d: number): string {
  const abs = Math.abs(d);
  const dp = abs >= 100 ? 2 : abs >= 1 ? 2 : 4;
  return `${d > 0 ? "+" : d < 0 ? "−" : ""}${abs.toFixed(dp)}`;
}

/**
 * Pure. `symbol` is used only to name the instrument in the hover and spoken
 * text; a blank one degrades the wording, never the verdict.
 */
export function selectEvidenceDeltaChip(
  stats:
    | { delta?: unknown; buyVol?: unknown; sellVol?: unknown; tradeCount?: unknown }
    | null
    | undefined,
  symbol?: string | null,
): EvidenceDeltaChip {
  const sym = (typeof symbol === "string" ? symbol.trim() : "") || "This symbol";

  const delta = num(stats?.delta) ?? 0;
  const buy = Math.max(0, num(stats?.buyVol) ?? 0);
  const sell = Math.max(0, num(stats?.sellVol) ?? 0);
  const trades = Math.max(0, num(stats?.tradeCount) ?? 0);
  const sided = buy + sell;

  const text = `Δ ${fmtDelta(delta)}`;
  const sample = `${trades.toLocaleString()} trade${trades === 1 ? "" : "s"} observed in this browser`;

  // No sided volume means no denominator, and a ratio against zero is not a
  // small imbalance — it is no observation. Those are different readings and
  // they get different words. A tape that reports trades without sides lands
  // here too, which is correct: unsided trades cannot establish aggression.
  if (sided <= 0) {
    return {
      kind: "UNOBSERVED",
      text,
      direction: 0,
      title:
        `${sym}: Δ is NET AGGRESSIVE VOLUME — shares, contracts or coins, never ` +
        `currency. No buy or sell volume has been observed yet (${sample}), so ` +
        `there is no imbalance to grade and WM will not colour a direction.`,
      spoken: `Delta ${fmtDelta(delta)} net volume, no sided volume observed`,
    };
  }

  const imbalance = Math.abs(delta) / sided;
  if (imbalance < DIRECTION_MIN_IMBALANCE) {
    return {
      kind: "BALANCED",
      text,
      direction: 0,
      title:
        `${sym}: Δ is NET AGGRESSIVE VOLUME — shares, contracts or coins, never ` +
        `currency. Buy and sell volume are within ${(DIRECTION_MIN_IMBALANCE * 100).toFixed(0)}% ` +
        `of each other (${(imbalance * 100).toFixed(2)}% net imbalance across ${sample}), ` +
        `so WM shows the number but will not colour it as a direction.`,
      spoken: `Delta ${fmtDelta(delta)} net volume, balanced — no direction claimed`,
    };
  }

  return {
    kind: "DIRECTIONAL",
    text,
    direction: delta > 0 ? 1 : -1,
    title:
      `${sym}: Δ is NET AGGRESSIVE VOLUME — shares, contracts or coins, never ` +
      `currency. ${delta > 0 ? "Buyers" : "Sellers"} lifted ` +
      `${(imbalance * 100).toFixed(1)}% more volume than the other side across ${sample}. ` +
      `This is a statement about the tape this browser saw, not about the whole market.`,
    spoken: `Delta ${fmtDelta(delta)} net volume, ${delta > 0 ? "buy" : "sell"} side ahead`,
  };
}
