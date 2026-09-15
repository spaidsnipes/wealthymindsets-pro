import { parseTimeframeMs } from "../experience/marketFieldFreshness";

/**
 * THE LAST OWNER STILL SAYING "CLOSE" ABOUT A BAR THAT HAS NOT CLOSED.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-15, https://wealthymindsetspro.com/charts, NQ1! 1h, one viewport:
 *
 *   chart header :  O 29403.00  H 29403.00  L 29403.00  C 29403.00  V 0
 *                   (countdown 0:05:04 to bar close)
 *   MARKET tile  :  NQ1! · 1h · 29405 LAST 1h BAR CLOSE
 *
 * Two owners, one screen, two different numbers, and BOTH are labelled with
 * the word "close". Only one of them is telling the truth. The tile names the
 * newest bar that has provably ended (`deriveLastBarClose`). The header names
 * the bar currently forming — zero range, zero volume, five minutes still on
 * its countdown — and calls its running value `C`.
 *
 * `C` is not a neutral abbreviation on a trading surface. It is a provenance
 * claim: "this bar ended here." A bar with a live countdown ended nowhere. The
 * proof that it is a claim and not a formality is that the number MOVES: across
 * two reads fourteen seconds apart the header's `C` went 29398.75 → 29403.00
 * while the tile's bar close stayed pinned at 29405. A close does not move.
 *
 * ── WHY NOT JUST HIDE IT ──────────────────────────────────────────────
 * The forming bar's running value is genuinely useful — it is where the market
 * is right now on this timeframe. Removing it would trade an overclaim for a
 * blindness, which §35 PROTECTED TRUTH treats as the same family of defect.
 * So the VALUE stays and only the WORD changes. `NOW` is honest about exactly
 * what it is; `C` is reserved for a bar that has actually ended.
 *
 * ── THE PROOF, AND THE REFUSAL TO GUESS ───────────────────────────────
 * Unlike `deriveLastBarClose`, this selector has no "a newer bar exists"
 * escape hatch — it is asked about the NEWEST bar by construction, so the only
 * available proof is the clock: `barOpen + one interval <= now`.
 *
 * When either half of that proof is missing — an unparseable timeframe, or no
 * caller-supplied clock — we return `NOW`, not `C`. That degradation
 * understates (a closed bar may be labelled as forming for one render) and can
 * never overstate. Given the choice, §35 picks understating every time.
 */
export interface ChartCloseLabel {
  /** The word rendered in front of the fourth OHLC value. */
  readonly label: "C" | "NOW";
  /** True when the bar could not be proven to have ended. */
  readonly forming: boolean;
  /** Hover text. Always present — the label alone is too terse to carry this. */
  readonly title: string;
}

const CLOSED: ChartCloseLabel = {
  label: "C",
  forming: false,
  title:
    "Close — this bar's interval has fully elapsed, so this is the price it " +
    "ended at. It will not change.",
};

/**
 * Pure. `barOpenedAtSeconds` is in SECONDS, matching `OHLCVBar.time` and the
 * lightweight-charts convention. `nowMs` is MILLISECONDS and is supplied by the
 * caller — a selector that reaches for `Date.now()` itself stops being testable.
 */
export function selectChartCloseLabel(
  barOpenedAtSeconds: number | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): ChartCloseLabel {
  const tf = typeof timeframe === "string" ? timeframe.trim() : "";

  const forming = (): ChartCloseLabel => ({
    label: "NOW",
    forming: true,
    title:
      `This ${tf || "current"} bar has not closed yet — it has no close. This ` +
      "is its value right now and it can still move in either direction. The " +
      "last bar that actually closed is reported separately.",
  });

  if (!tf) return forming();
  if (typeof barOpenedAtSeconds !== "number") return forming();
  if (!Number.isFinite(barOpenedAtSeconds) || barOpenedAtSeconds <= 0) return forming();

  const intervalMs = parseTimeframeMs(tf);
  if (intervalMs === null) return forming();

  const clockOk = typeof nowMs === "number" && Number.isFinite(nowMs) && nowMs > 0;
  if (!clockOk) return forming();

  return Math.round(barOpenedAtSeconds * 1000) + intervalMs <= (nowMs as number)
    ? CLOSED
    : forming();
}
