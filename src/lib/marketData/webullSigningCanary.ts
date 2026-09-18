export const WEBULL_SIGNING_PROFILES = ["legacy-sha1", "sdk-sha256"] as const;

export type WebullSigningProfile = (typeof WEBULL_SIGNING_PROFILES)[number];

export type WebullCanaryState =
  | "OBSERVED"
  | "UNCONFIGURED"
  | "BLOCKED_AUTH"
  | "BLOCKED_ENTITLEMENT"
  | "ACCESS_UNPROVEN"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "NO_EVENTS"
  | "STALE"
  | "CLOCK_INVALID"
  | "TIMEOUT"
  | "UNAVAILABLE";

export interface WebullCanaryReceipt {
  readonly profile: WebullSigningProfile;
  readonly state: WebullCanaryState | "INVALID_RECEIPT" | "REQUEST_FAILED";
  readonly fidelity: "SNAPSHOT" | "NONE";
  readonly requestedAt: string | null;
  readonly tickCount: number;
  readonly newestObservedAt: string | null;
  readonly newestPrice: number | null;
  readonly newestSize: number | null;
}

const WEBULL_CANARY_STATES = new Set<WebullCanaryState>([
  "OBSERVED",
  "UNCONFIGURED",
  "BLOCKED_AUTH",
  "BLOCKED_ENTITLEMENT",
  "ACCESS_UNPROVEN",
  "RATE_LIMITED",
  "PROVIDER_ERROR",
  "NO_EVENTS",
  "STALE",
  "CLOCK_INVALID",
  "TIMEOUT",
  "UNAVAILABLE",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveNumber(value: unknown): number | null {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function invalidReceipt(profile: WebullSigningProfile): WebullCanaryReceipt {
  return {
    profile,
    state: "INVALID_RECEIPT",
    fidelity: "NONE",
    requestedAt: null,
    tickCount: 0,
    newestObservedAt: null,
    newestPrice: null,
    newestSize: null,
  };
}

/**
 * Reduces a provider receipt to the non-secret fields the Founder needs to
 * compare signing contracts. Provider prose and raw payloads never enter the
 * browser scene, so credentials, signatures, and upstream diagnostics cannot
 * be echoed accidentally.
 */
export function summarizeWebullCanaryReceipt(
  value: unknown,
  expectedProfile: WebullSigningProfile,
): WebullCanaryReceipt {
  if (!isRecord(value)) return invalidReceipt(expectedProfile);
  if (value.source !== "webull" || value.signingProfile !== expectedProfile) {
    return invalidReceipt(expectedProfile);
  }
  if (typeof value.state !== "string" || !WEBULL_CANARY_STATES.has(value.state as WebullCanaryState)) {
    return invalidReceipt(expectedProfile);
  }

  const state = value.state as WebullCanaryState;
  const fidelity = value.fidelity === "SNAPSHOT" ? "SNAPSHOT" : "NONE";
  const requestedAt = typeof value.requestedAt === "string" ? value.requestedAt : null;
  const ticks = Array.isArray(value.ticks)
    ? value.ticks.filter((tick): tick is Record<string, unknown> => (
        isRecord(tick)
        && positiveNumber(tick.observedAtMs) !== null
        && positiveNumber(tick.price) !== null
        && positiveNumber(tick.volume) !== null
      ))
    : [];
  if (state === "OBSERVED" && (fidelity !== "SNAPSHOT" || ticks.length === 0)) {
    return invalidReceipt(expectedProfile);
  }
  const newest = ticks.reduce<Record<string, unknown> | null>((candidate, tick) => {
    const observedAt = positiveNumber(tick.observedAtMs);
    if (observedAt === null) return candidate;
    if (!candidate || observedAt > (finiteNumber(candidate.observedAtMs) ?? -Infinity)) return tick;
    return candidate;
  }, null);
  const newestObservedAtMs = newest ? finiteNumber(newest.observedAtMs) : null;

  return {
    profile: expectedProfile,
    state,
    fidelity,
    requestedAt,
    tickCount: ticks.length,
    newestObservedAt: newestObservedAtMs === null ? null : new Date(newestObservedAtMs).toISOString(),
    newestPrice: newest ? positiveNumber(newest.price) : null,
    newestSize: newest ? positiveNumber(newest.volume) : null,
  };
}

export function failedWebullCanaryReceipt(profile: WebullSigningProfile): WebullCanaryReceipt {
  return { ...invalidReceipt(profile), state: "REQUEST_FAILED" };
}

/**
 * THE WITNESS BrokerConnectPanel WAS MISSING.
 *
 * The 2026-09-18-C baton recorded the broker panel as "renders with no witness
 * — not a defect (it renders no tape)". THAT CLAIM IS FALSE, and it was
 * disproven by re-reading the panel rather than trusting the note: the signing
 * canary renders `N prints · $PRICE · size N · time` whenever a receipt is
 * OBSERVED. A rendered price IS tape. So the panel reproduces Canon Weakness
 * #1 exactly — a strip may claim webull is evidenceless inches above a webull
 * print this page drew.
 *
 * This reduces the canary's receipts to the ONLY shape a wire strip is allowed
 * to hear: what the page is currently attributing a drawn observation to. It
 * computes no verdict, and it is deliberately unable to express one.
 *
 * The bar is the SAME predicate the panel itself uses to decide whether to draw
 * the price line (`state === "OBSERVED" && tickCount > 0`) AND the presence of
 * a finite positive price. If the panel drew nothing, this witnesses nothing —
 * a witness that outruns its own surface is a fabrication with extra steps.
 */
export function webullCanaryObservation(
  receipts: readonly WebullCanaryReceipt[],
): { readonly source: "webull"; readonly quotePresent: true; readonly barsPresent: false } | null {
  const drawnPrice = receipts.some(
    receipt =>
      receipt.state === "OBSERVED" &&
      receipt.tickCount > 0 &&
      receipt.newestPrice !== null &&
      Number.isFinite(receipt.newestPrice) &&
      receipt.newestPrice > 0,
  );
  // The canary draws no candles, so `barsPresent` is false and stays false.
  // Claiming bars here would let a snapshot receipt speak for a chart that does
  // not exist on this surface.
  return drawnPrice ? { source: "webull", quotePresent: true, barsPresent: false } : null;
}
