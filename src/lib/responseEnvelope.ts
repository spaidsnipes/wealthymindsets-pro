/**
 * selectResponseEnvelope — BUILD ORDER §4, "HONEST UNDERLYING → OPTION
 * TRANSLATION" / EXPECTED RESPONSE ENVELOPE.
 *
 * The Founder thinks: "Exit if TSLA loses THIS LEVEL." Today he must translate
 * that himself into "maybe sell the option around $0.xx" — the manual step the
 * Execution Order names as the primary options pain.
 *
 * Canon, verbatim on the shape of the answer:
 *
 *   The structural underlying level may be exact.
 *   The modeled option premium at that future underlying level is NOT exact.
 *   Never display "TSLA 378.40 = option $0.42" as deterministic truth.
 *   MODEL PRICE ≠ FUTURE PRICE.
 *
 * So this returns a RANGE with named assumptions, never a point estimate. The
 * range is not decoration: it is produced by re-pricing the contract across an
 * implied-volatility band and a time-to-evaluation, because those are the two
 * inputs most able to move the answer between now and the moment the level is
 * actually touched.
 *
 * Returns UNKNOWN — never a number — when any input needed to price is missing
 * or unusable (§14.8: "A failed estimate returns UNKNOWN, not last week's
 * dollar").
 *
 * PURE — no I/O, no clock. `nowMs` and every market input are supplied.
 */

export type EnvelopeStatus = "ESTIMATED" | "UNKNOWN";

export interface ResponseEnvelopeInput {
  /** Underlying price at which the thesis is structurally invalidated. */
  readonly underlyingAtLevel: number;
  readonly strike: number;
  readonly isCall: boolean;
  /** Expiry in epoch ms. */
  readonly expiryMs: number;
  /** Evaluation time in epoch ms — when the level is expected to be tested. */
  readonly evaluateAtMs: number;
  /** Current implied volatility as a decimal (0.5 = 50%). */
  readonly iv: number;
  /**
   * Fractional IV uncertainty band, default 0.25 (±25% relative). IV is the
   * least knowable input, so the envelope widens with it rather than pretending
   * today's IV survives to the level being touched.
   */
  readonly ivUncertainty?: number;
  /** Risk-free rate as a decimal. */
  readonly riskFreeRate?: number;
  /** Where the IV figure came from, for the assumptions line. */
  readonly ivSource?: string;
}

export interface ResponseEnvelope {
  readonly status: EnvelopeStatus;
  /** Low end of the modeled premium band. null when UNKNOWN. */
  readonly low: number | null;
  /** High end of the modeled premium band. null when UNKNOWN. */
  readonly high: number | null;
  /** Display string, e.g. "$0.38–$0.46" or "UNKNOWN". Never a single price. */
  readonly display: string;
  /** Named assumptions behind the band. Empty when UNKNOWN. */
  readonly assumptions: readonly string[];
  /** Present only when UNKNOWN — why no estimate could be produced. */
  readonly unknownReason: string | null;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

function bsPrice(spot: number, strike: number, tYears: number, sig: number, isCall: boolean, r: number): number {
  const T = Math.max(tYears, 1 / 365 / 24);
  const s = Math.max(sig, 0.01);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + (s * s) / 2) * T) / (s * sqrtT);
  const d2 = d1 - s * sqrtT;
  const disc = Math.exp(-r * T);
  const price = isCall
    ? spot * normCdf(d1) - strike * disc * normCdf(d2)
    : strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  return Math.max(price, 0);
}

function unknown(reason: string): ResponseEnvelope {
  return { status: "UNKNOWN", low: null, high: null, display: "UNKNOWN", assumptions: [], unknownReason: reason };
}

function money(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function selectResponseEnvelope(input: ResponseEnvelopeInput): ResponseEnvelope {
  const { underlyingAtLevel, strike, isCall, expiryMs, evaluateAtMs, iv } = input;

  if (!Number.isFinite(underlyingAtLevel) || underlyingAtLevel <= 0) return unknown("No structural level supplied.");
  if (!Number.isFinite(strike) || strike <= 0) return unknown("No contract strike supplied.");
  if (!Number.isFinite(iv) || iv <= 0) return unknown("Implied volatility unavailable — premium cannot be modeled.");
  if (!Number.isFinite(expiryMs) || !Number.isFinite(evaluateAtMs)) return unknown("Contract or evaluation time unavailable.");
  if (expiryMs <= evaluateAtMs) return unknown("Contract expires at or before the evaluation time.");

  const band = Number.isFinite(input.ivUncertainty ?? NaN) ? Math.abs(input.ivUncertainty!) : 0.25;
  const r = Number.isFinite(input.riskFreeRate ?? NaN) ? input.riskFreeRate! : 0.045;
  const tYears = (expiryMs - evaluateAtMs) / YEAR_MS;

  const ivLow = Math.max(0.01, iv * (1 - band));
  const ivHigh = iv * (1 + band);

  // Lower IV → cheaper long premium; higher IV → richer. Compute both and order
  // by value rather than assuming which way the band maps.
  const a = bsPrice(underlyingAtLevel, strike, tYears, ivLow, isCall, r);
  const b = bsPrice(underlyingAtLevel, strike, tYears, ivHigh, isCall, r);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return unknown("Pricing model did not resolve.");

  const low = Math.min(a, b);
  const high = Math.max(a, b);

  const daysToExpiry = tYears * 365;
  const assumptions = [
    `Black-Scholes, ${daysToExpiry < 1 ? `${(daysToExpiry * 24).toFixed(1)}h` : `${daysToExpiry.toFixed(1)}d`} to expiry at evaluation`,
    `IV ${(iv * 100).toFixed(0)}% ±${(band * 100).toFixed(0)}%${input.ivSource ? ` (${input.ivSource})` : ""}`,
    `underlying ${underlyingAtLevel.toFixed(2)}, strike ${strike.toFixed(2)}, ${isCall ? "call" : "put"}`,
    `risk-free ${(r * 100).toFixed(1)}%`,
  ];

  return {
    status: "ESTIMATED",
    low,
    high,
    // A range, always — even when the band collapses, so the surface can never
    // render a single number that reads as destiny.
    display: `${money(low)}–${money(high)}`,
    assumptions,
    unknownReason: null,
  };
}
