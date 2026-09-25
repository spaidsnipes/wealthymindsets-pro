/**
 * PROFILE DNA — the profile's fingerprint, in numbers. P-110 organism #5.
 *
 * Child: PROFILE DNA. Parent family: F09 Profiles. Class: CHART LANGUAGE
 * (annotation of the Living Profile). House surface: /charts, drawn on the
 * Living Profile's own lane as geometry, with the numbers in Inspect. Plate:
 * WM_H_P110_PROFILE_ORGANISM ("5 · DNA · Behavioral & statistical code");
 * Registry F.5 "fingerprint numbers · uncertainty · sample size / evidence
 * honesty · never prophecy".
 *
 * ── WHAT IT IS, AND WHAT IT REFUSES TO BE ────────────────────────────────────
 *
 * A trader glancing at a profile reads its SHAPE before any level: a P (value
 * built high — buyers accepted higher prices), a b (value built low), a D
 * (balanced), or an elongated distribution (a trend that never paused long
 * enough to build value). DNA puts that reading into stated numbers so it is
 * the same reading every time, on every surface.
 *
 * It is DESCRIPTION, never prophecy. A P-shape says where value was built; it
 * does not say price will go up. No field here is a probability, a score, or
 * a direction.
 *
 * ── THE NUMBERS ──────────────────────────────────────────────────────────────
 *
 *   pocPosition  — where the POC sits in the traded range, 0 = low, 1 = high.
 *   valueWidth   — (VAH − VAL) ÷ range. Wide = little agreement on value.
 *   massCentre   — volume-weighted mean price position, 0..1.
 *   skew         — volume-weighted third standardized moment of price.
 *                  Negative when the thin tail runs LOW (a P), positive when
 *                  it runs high (a b).
 *   excessKurtosis — fourth standardized moment − 3. About −1.2 for a flat
 *                  (uniform) profile; positive when volume piles on one price.
 *   rows / bars  — the sample, always printed beside the shape.
 *   rowStep      — the price height of one row: the resolution every number
 *                  above was measured at.
 *
 * The canvas draws the reading as GEOMETRY on the profile's own lane (spine =
 * range, bracket = value, notch = POC, diamond = mass centre), so it reads the
 * prices published here — lo, hi, the mass-centre price — and never
 * recomputes them.
 *
 * Thresholds are stated constants, not tuned magic: shape is ELONGATED when
 * value spans ≥ 60% of the range; otherwise P / b when the POC sits in the
 * top / bottom 38%; otherwise D.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

export const PROFILE_DNA_VERSION = 2;
/** Below this many traded rows a shape is the sample's range, not a fingerprint. */
export const MIN_DNA_ROWS = 12;
export const ELONGATED_VALUE_WIDTH = 0.6;
export const SHAPE_EDGE = 0.38;

export type ProfileShape = "P" | "b" | "D" | "ELONGATED";
export type ProfileDnaReason = "MEASURED" | "NO_PROFILE" | "THIN_SAMPLE" | "FLAT_RANGE";

export interface ProfileDnaInput {
  readonly curve: readonly { readonly price: number; readonly volume: number }[];
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  /** How many bars the profile was built from. Printed, never inferred. */
  readonly bars: number;
  readonly estimated: boolean;
  /**
   * The compiler's own row height (the Living Profile's tick grid). When it is
   * absent the smallest gap between traded rows is used — the grid the curve
   * was actually built on.
   */
  readonly rowStep?: number | null;
}

export interface ProfileDnaVM {
  readonly version: number;
  readonly measured: boolean;
  readonly reason: ProfileDnaReason;
  readonly shape: ProfileShape | null;
  readonly pocPosition: number | null;
  readonly valueWidth: number | null;
  readonly massCentre: number | null;
  readonly skew: number | null;
  readonly excessKurtosis: number | null;
  /**
   * Traded range in PRICE. Published for THIN_SAMPLE and FLAT_RANGE too: the
   * range is a fact even when the sample is too small to be a fingerprint, and
   * the canvas draws a THIN_SAMPLE as that range alone.
   */
  readonly lo: number | null;
  readonly hi: number | null;
  /** The volume-weighted mean price — where the diamond sits. */
  readonly massCentrePrice: number | null;
  /** The levels the bracket and notch are drawn at — the ones DNA measured. */
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly rowStep: number | null;
  readonly rows: number;
  readonly bars: number;
  readonly estimated: boolean;
  /**
   * The reading in one line, for Inspect and assistive tech. Never printed on
   * the glass: the glass carries the geometry. Empty when not measured.
   */
  readonly strip: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function selectProfileDna(input: ProfileDnaInput | null | undefined): ProfileDnaVM {
  const none = (
    reason: Exclude<ProfileDnaReason, "MEASURED">,
    rows = 0,
    range: { lo: number; hi: number; rowStep: number | null } | null = null,
  ): ProfileDnaVM => ({
    version: PROFILE_DNA_VERSION,
    measured: false,
    reason,
    shape: null,
    pocPosition: null,
    valueWidth: null,
    massCentre: null,
    skew: null,
    excessKurtosis: null,
    lo: range?.lo ?? null,
    hi: range?.hi ?? null,
    massCentrePrice: null,
    poc: null,
    vah: null,
    val: null,
    rowStep: range?.rowStep ?? null,
    rows,
    bars: input?.bars ?? 0,
    estimated: input?.estimated ?? true,
    strip: "",
  });

  if (!input || input.poc == null || input.vah == null || input.val == null) return none("NO_PROFILE");
  const traded = input.curve.filter(p => Number.isFinite(p.price) && p.volume > 0);
  if (traded.length === 0) return none("NO_PROFILE");

  let lo = Infinity;
  let hi = -Infinity;
  let vol = 0;
  let weighted = 0;
  for (const p of traded) {
    if (p.price < lo) lo = p.price;
    if (p.price > hi) hi = p.price;
    vol += p.volume;
    weighted += p.price * p.volume;
  }
  const rowStep = resolveRowStep(input.rowStep, traded);
  if (traded.length < MIN_DNA_ROWS) return none("THIN_SAMPLE", traded.length, { lo, hi, rowStep });
  const range = hi - lo;
  if (!(range > 0) || !(vol > 0)) return none("FLAT_RANGE", traded.length, { lo, hi, rowStep });

  // Volume-weighted central moments over the published rows. The mean is the
  // mass centre; the standardized third and fourth moments are the profile's
  // lean and its peakedness — both descriptions of where volume sat.
  const mean = weighted / vol;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const p of traded) {
    const d = p.price - mean;
    const d2 = d * d;
    m2 += p.volume * d2;
    m3 += p.volume * d2 * d;
    m4 += p.volume * d2 * d2;
  }
  m2 /= vol;
  m3 /= vol;
  m4 /= vol;
  // range > 0 with every row carrying volume means m2 > 0; the guard only
  // keeps a degenerate float from printing NaN.
  const skew = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
  const excessKurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;

  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const pocPosition = clamp((input.poc - lo) / range);
  const valueWidth = clamp((input.vah - input.val) / range);
  const massCentre = clamp((mean - lo) / range);

  const shape: ProfileShape =
    valueWidth >= ELONGATED_VALUE_WIDTH ? "ELONGATED"
      : pocPosition >= 1 - SHAPE_EDGE ? "P"
        : pocPosition <= SHAPE_EDGE ? "b"
          : "D";

  const est = input.estimated ? " · EST" : "";
  const strip =
    `DNA ${shape} · VALUE ${pct(valueWidth)} OF RANGE · POC AT ${pct(pocPosition)} · ` +
    `${traded.length} ROWS${input.estimated ? ` / ${input.bars} BARS` : ""}${est}`;

  return {
    version: PROFILE_DNA_VERSION,
    measured: true,
    reason: "MEASURED",
    shape,
    pocPosition,
    valueWidth,
    massCentre,
    skew,
    excessKurtosis,
    lo,
    hi,
    massCentrePrice: mean,
    poc: input.poc,
    vah: input.vah,
    val: input.val,
    rowStep,
    rows: traded.length,
    bars: input.bars,
    estimated: input.estimated,
    strip,
  };
}

/** The supplied grid step, else the smallest gap between the traded rows. */
function resolveRowStep(
  supplied: number | null | undefined,
  traded: readonly { readonly price: number }[],
): number | null {
  if (supplied != null && Number.isFinite(supplied) && supplied > 0) return supplied;
  const prices = [...new Set(traded.map(p => p.price))].sort((a, z) => a - z);
  let step = Infinity;
  for (let i = 1; i < prices.length; i++) step = Math.min(step, prices[i] - prices[i - 1]);
  return Number.isFinite(step) && step > 0 ? step : null;
}

export default selectProfileDna;
