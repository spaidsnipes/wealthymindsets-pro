/**
 * MEASURED NUMBER — one owner for rendering a quantity whose SCALE belongs to
 * the instrument rather than to the code.
 *
 * WHY THIS FILE EXISTS
 *
 * Almost every number in the order-flow experience is a magnitude nobody can
 * bound in advance. A cost is size-per-spread, and size is 0.065 on BTC and
 * 4,100,000 on SOFI. An efficiency ratio is price per unit of net effort, which
 * is whatever those two units happen to be. A fixed number of decimals is only
 * ever safe when you ALREADY KNOW THE SCALE, and on these numbers nobody does.
 *
 * Each module worked that out independently, wrote the same sentence in its own
 * comment, and implemented its own answer. Three answers shipped:
 *
 *   `toFixed(0)`        LiquidityWeatherPanel — median cost
 *   `toFixed(2)`        AbsorptionAnatomyPanel — efforts and displacement
 *   `toExponential(2)`  AbsorptionAnatomyPanel — efficiency ratio
 *
 * and `roundSig` itself existed BYTE-FOR-BYTE TWICE, in `selectAbsorption.ts`
 * and `selectLiquidityWeather.ts`, each above a comment explaining the same
 * reasoning to a reader who would never see the other copy.
 *
 * TWO OF THE THREE ANSWERS WERE WRONG, AND BOTH WERE OBSERVED ON PRODUCTION
 * rather than reasoned about here:
 *
 *   MEDIAN COST      0          — BTCUSD, 2026-09-18. The real cost was a
 *                                 fraction. `toFixed(0)` told a trader it
 *                                 costs NOTHING to move this market.
 *   EFFICIENCY RATIO 4.37e+2    — same session. The number is 437. Scientific
 *                                 notation is not a reading; it is a dare.
 *
 * The lesson is not "those two call sites were careless." It is that a
 * convention gets re-decided at every call site and some of the decisions are
 * wrong. An owner is decided once. That is what this file is.
 *
 * WHAT IS *NOT* OWNED HERE. Bounded quantities — percentages, shares of a
 * whole, counts, R multiples, a ratio deliberately shown against 1.00× — have
 * a scale their own surface already knows, and a fixed-decimal render of those
 * is correct. Pulling them in here would make this module the place all
 * formatting goes to be argued about, which is how an owner turns back into a
 * convention.
 */

/**
 * Round to significant figures. Scale-preserving: 0.0651 stays 0.0651 and
 * 4,137,201 stays 4,140,000, where a fixed-decimal rounder would have
 * destroyed one and padded the other.
 */
export function roundSig(v: number, digits = 4): number {
  if (!Number.isFinite(v) || v === 0) return 0;
  const mag = Math.ceil(Math.log10(Math.abs(v)));
  const factor = Math.pow(10, digits - mag);
  return Math.round(v * factor) / factor;
}

/**
 * Format a MAGNITUDE for a trader to read — a cost, an effort, an efficiency.
 *
 * Above a thousand it is grouped and whole, because nobody reads
 * "4,137,201.2836" and the decimals were never measured to that precision
 * anyway. Below that it keeps three significant figures, which is what stops
 * a real 0.065 from rendering as "0".
 *
 * Never scientific notation. The number the trader is being asked to act on
 * has to be legible at a glance, and "4.37e+2" is a second puzzle stacked on
 * top of the first.
 *
 * THIS FUNCTION'S FIRST DRAFT ENDED `return String(roundSig(v, 3))` AND WAS
 * WRONG IN EXACTLY THE WAY IT WAS WRITTEN TO FIX. JavaScript's default
 * number-to-string switches to exponential below 1e-6, so `String(9.1e-7)` is
 * "9.1e-7" — this module would have re-shipped `toExponential` under a new
 * name, on the very values it exists to protect. Its own test caught it before
 * the commit. That is the argument for a gate stated as a PROPERTY over a
 * range of inputs rather than as a couple of examples: the examples all passed.
 *
 * So the decimal count is derived from the value's own exponent instead of
 * being fixed, and the trailing zeros that derivation produces are trimmed.
 */
export function formatMagnitude(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  // The >= 1000 branch is taken on the RAW value, deliberately. Significant
  // figures protect a small number's scale; on a large one they would throw
  // away precision that was genuinely measured — 4,137,201 prints of volume is
  // not "4,140,000", and a trader reading a size has every right to the digits.
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString("en-US");
  const r = roundSig(v, 3);
  if (r === 0) return "0";

  // Enough decimals to carry three significant figures at THIS value's scale,
  // clamped to what `toFixed` will accept.
  const exp = Math.floor(Math.log10(Math.abs(r)));
  const decimals = Math.min(100, Math.max(0, 2 - exp));
  const s = r.toFixed(decimals);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/**
 * Format a RATIO for reading.
 *
 * FOUND BY LOOKING AT A RENDERED PANEL, which said a genuine vacuum cost
 * "0.00× what its neighbours paid". Two decimals is fine for a ratio near one
 * and destroys one near zero: the real value was about 0.002, and "0.00" reads
 * as free rather than as very cheap.
 *
 * A ratio is not a magnitude, which is why it is a separate function rather
 * than a call into `formatMagnitude`: near 1 a reader expects "1.00×" and
 * "2.50×", and three significant figures would print "1" and "2.5" and lose
 * the sense that these are being compared against a baseline. The two
 * behaviours diverge deliberately, and each is pinned by its own tests.
 */
export function formatRatio(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 100) return Math.round(v).toLocaleString("en-US");
  if (a >= 0.01) return v.toFixed(2);
  return Number(v.toPrecision(2)).toString();
}
