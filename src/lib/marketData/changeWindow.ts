/**
 * changeWindow — name the MEASURE behind a percent, so two different measures
 * cannot share one visual slot in silence.
 *
 * ── The defect this exists to close ──────────────────────────────────────────
 *
 * Observed live on /charts (2026-09-04T15:53Z), one screen, one moment:
 *
 *     TSLA   Tesla Inc     ACTIVE DEGRADED         351.55   -6.59%
 *     BTC    Bitcoin       LIVE — CERTIFIED QUOTE  79485.00 -2.31%
 *
 * Those two percentages are not the same kind of number.
 *
 *   - TSLA's is measured against the PRIOR DAILY CLOSE (/api/yahoo prevClose).
 *   - BTC's is measured against the price 24 HOURS AGO (/api/exchange, which
 *     derives `change` from each exchange's rolling 24h `open` field).
 *
 * Probed at the same instant, the gap is not rounding:
 *
 *     BTC  /api/exchange -2.40%   vs  /api/yahoo -2.2375%   (0.16pp)
 *     ETH  /api/exchange -2.56%   vs  /api/yahoo -2.1695%   (0.39pp)
 *
 * Both numbers are REAL. Neither is fabricated. That is precisely what makes
 * this dangerous: no amount of staring at the digits reveals that the question
 * being answered changed between one row and the next. It is canon Weakness #1
 * (multi-price disagreement on one page) in its semantic form.
 *
 * ── Why we do NOT "fix" this by making the numbers agree ─────────────────────
 *
 * Crypto trades 24/7. It has no close. Forcing it onto an equities calendar-day
 * boundary would replace a disclosed difference with an invented one — a worse
 * lie, and it would disagree with every exchange and price site a trader
 * cross-checks against.
 *
 * So: DO NOT CHANGE THE NUMBER. DISCLOSE THE MEASURE.
 *
 * ── Why PRIOR_CLOSE renders no suffix ────────────────────────────────────────
 *
 * On a trading screen, a bare "-6.59%" already means "today, against the prior
 * close" by universal convention. Suffixing every equity row with "today" would
 * be noise, and noise trains people to stop reading labels. We label the
 * DEVIATION from the convention, not the convention itself.
 *
 * PURE — no I/O, no clock, no provider knowledge.
 */

/** The reference a percent was measured against. */
export type ChangeWindow =
  /** Prior daily close. The equities convention; renders without a suffix. */
  | "PRIOR_CLOSE"
  /** The price exactly 24h ago. Crypto exchanges' rolling stat. */
  | "ROLLING_24H"
  /** Today's opening print. Weaker than a close, but a real observation. */
  | "SESSION_OPEN"
  /** No reference established — the percent must not be presented as a change. */
  | "UNKNOWN";

export const CHANGE_WINDOWS: readonly ChangeWindow[] = [
  "PRIOR_CLOSE",
  "ROLLING_24H",
  "SESSION_OPEN",
  "UNKNOWN",
] as const;

/**
 * The short chip rendered beside a percent.
 *
 * `PRIOR_CLOSE` is deliberately empty — see the header note. `UNKNOWN` is also
 * empty because a percent with no reference should not be rendered at all; the
 * caller's withheld-signature guard owns that case, and a "?" chip beside a
 * number would imply the number is real but merely unlabelled.
 */
export function changeWindowSuffix(window: ChangeWindow): string {
  switch (window) {
    case "ROLLING_24H":  return "24h";
    case "SESSION_OPEN": return "from open";
    case "PRIOR_CLOSE":  return "";
    case "UNKNOWN":      return "";
  }
}

/** Full sentence for a tooltip / accessible description. */
export function describeChangeWindow(window: ChangeWindow): string {
  switch (window) {
    case "PRIOR_CLOSE":
      return "Change measured against the prior daily close.";
    case "ROLLING_24H":
      return "Change measured against the price 24 hours ago — not against a daily close. Crypto trades continuously and has no close.";
    case "SESSION_OPEN":
      return "Change measured against today's opening price, not the prior close.";
    case "UNKNOWN":
      return "No reference price was established, so no change is being claimed.";
  }
}

/**
 * Narrow an untrusted value (an API response field, a cache entry written by a
 * previous deploy) to a ChangeWindow.
 *
 * The window is rendered as a literal chip beside a price. Trusting the wire
 * would let any string the server happened to emit — or a stale value written
 * by an older build into `window.__wmWatchlist` — print itself next to a
 * number. `UNKNOWN` is the correct floor: it renders no suffix and claims
 * nothing, which is what we actually know about an unrecognised value.
 */
export function coerceChangeWindow(value: unknown, fallback: ChangeWindow = "UNKNOWN"): ChangeWindow {
  return (CHANGE_WINDOWS as readonly string[]).includes(value as string)
    ? (value as ChangeWindow)
    : fallback;
}

/**
 * True when a set of rows rendered together answers more than one question.
 *
 * `UNKNOWN` rows are excluded: they carry no claim, so they cannot contradict
 * one. A screen is only "mixed" when two rows each assert a change against
 * DIFFERENT real references.
 */
export function mixesChangeWindows(windows: readonly ChangeWindow[]): boolean {
  const claimed = new Set(windows.filter((w) => w !== "UNKNOWN"));
  return claimed.size > 1;
}

/**
 * Resolve a rolling-window change from a price and a window-open price.
 *
 * Mirrors `referenceCandidate` in resolveQuoteDayChange, and for the same
 * reason: `open` must be a real, distinct observation. An `open` that merely
 * echoes `price` is indistinguishable from the `|| price` fallback the exchange
 * route used to apply when a venue omitted its 24h stat — that fallback
 * manufactures `change = price - price = 0` out of missing data.
 *
 * Returns `UNKNOWN` with null figures rather than a zero, because a zero here
 * is a claim ("flat") and we have no evidence for it.
 */
export function resolveRollingChange(
  price: unknown,
  open: unknown,
  window: Exclude<ChangeWindow, "UNKNOWN"> = "ROLLING_24H",
): {
  readonly changeWindow: ChangeWindow;
  readonly referenceOpen: number | null;
  readonly change: number | null;
  readonly changePct: number | null;
} {
  const none = { changeWindow: "UNKNOWN" as const, referenceOpen: null, change: null, changePct: null };

  // `typeof === "number"` alone lets NaN through, and NaN is FALSY — which is
  // exactly how the exchange route used to fall into a `: 0` branch and publish
  // `changePct: 0` for an instrument it had never heard of.
  const p = typeof price === "number" && Number.isFinite(price) ? price : null;
  const o = typeof open === "number" && Number.isFinite(open) ? open : null;
  if (p === null || p <= 0) return none;
  if (o === null || o <= 0) return none;
  if (o === p) return none;

  return {
    changeWindow: window,
    referenceOpen: o,
    change: +(p - o).toFixed(2),
    changePct: +(((p - o) / o) * 100).toFixed(2),
  };
}
