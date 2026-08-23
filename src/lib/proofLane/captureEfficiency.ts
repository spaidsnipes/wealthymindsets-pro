/**
 * captureEfficiency — canon §7 Management Studio.
 *
 * Founder canon 3·6·9·12 v0.2 §7 verbatim: "Capture % = Realized
 * favorable excursion ÷ Maximum favorable excursion." A trailing-stop
 * management method that captures 70% of the average MFE across a
 * 30-trade sample is quantifiably better than one that captures 40%,
 * regardless of individual trade P&L.
 *
 * Rejection guarantees:
 *  - Undefined when mfeR is missing or ≤ 0 (nothing to divide against
 *    — never returns 0/0 = NaN).
 *  - Undefined when realizedR is missing (never fabricated).
 *  - Negative captures allowed (e.g. realizedR = -0.5R with mfeR = +2R
 *    means the trade printed +2R unrealized but the trader gave it all
 *    back plus took a -0.5R loss → capture = -25%). Canon expects the
 *    trader to see this and improve.
 *  - Return is expressed as a ratio (0.7 = 70%), not a percentage.
 */

export interface CaptureInput {
  realizedR?: number;
  mfeR?: number;
}

export function captureEfficiency(input: CaptureInput): number | undefined {
  const r = input.realizedR;
  const mfe = input.mfeR;
  if (typeof r !== "number" || !Number.isFinite(r)) return undefined;
  if (typeof mfe !== "number" || !Number.isFinite(mfe) || mfe <= 0) return undefined;
  return r / mfe;
}

/**
 * Averaged capture over a sample. Excludes entries missing either R
 * or MFE — canon: never fabricate a capture rate from partial data.
 */
export function averageCapture(entries: readonly CaptureInput[]): {
  avgCapture: number | undefined;
  sampleSize: number;
} {
  const eligible = entries
    .map(captureEfficiency)
    .filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  if (!eligible.length) return { avgCapture: undefined, sampleSize: 0 };
  const sum = eligible.reduce((a, b) => a + b, 0);
  return { avgCapture: sum / eligible.length, sampleSize: eligible.length };
}
