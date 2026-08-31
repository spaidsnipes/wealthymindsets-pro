import { CANONICAL_FIDELITY_LABELS } from "../canonicalFidelityLabels";
import { YAHOO_QUOTE_OBSERVATION_SPEC_VERSION } from "../yahooQuoteObservation";

export const PAPER_DELAYED_QUOTE_MAX_AGE_MS = 15 * 60_000;

export type PaperQuoteReadinessStatus = "LOADING" | "DELAYED" | "STALE" | "UNKNOWN";

export interface PaperQuoteReadiness {
  readonly status: PaperQuoteReadinessStatus;
  readonly actionable: boolean;
  readonly price: number | null;
  readonly observedAt: number | null;
  readonly availableAt: number | null;
  readonly receivedAt: number | null;
  readonly ageMs: number | null;
  readonly label: string;
  readonly reason: string;
}

export function initialPaperQuoteReadiness(): PaperQuoteReadiness {
  return {
    status: "LOADING",
    actionable: false,
    price: null,
    observedAt: null,
    availableAt: null,
    receivedAt: null,
    ageMs: null,
    label: "LOADING · NOT ACTIONABLE",
    reason: "Waiting for a canonical market observation.",
  };
}

/**
 * Returns the only price Paper execution/derivation code may act on.
 * Keeping this boundary next to the readiness selector prevents UI-disabled
 * controls from becoming the sole guard against synthetic option marks or
 * direct handler invocation.
 */
export function actionablePaperQuotePrice(
  readiness: PaperQuoteReadiness | null | undefined,
): number | null {
  return readiness?.actionable === true && finitePositive(readiness.price)
    ? readiness.price
    : null;
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function priorAsStale(
  prior: PaperQuoteReadiness,
  capturedAt: number,
  reason: string,
): PaperQuoteReadiness {
  if (prior.price == null || prior.observedAt == null) {
    return {
      status: "UNKNOWN",
      actionable: false,
      price: null,
      observedAt: null,
      availableAt: null,
      receivedAt: null,
      ageMs: null,
      label: "UNKNOWN · NOT ACTIONABLE",
      reason,
    };
  }

  return {
    ...prior,
    status: "STALE",
    actionable: false,
    ageMs: Math.max(0, capturedAt - prior.observedAt),
    label: `${CANONICAL_FIDELITY_LABELS.STALE_PIPELINE} · NOT ACTIONABLE`,
    reason,
  };
}

/**
 * Strict Paper-simulation actionability gate for Yahoo quote responses.
 *
 * This selector creates no store, clock, request layer, or market identity.
 * It only validates the existing SF-D01 observation contract and translates
 * it into a surface-ready permission. Missing/malformed chronology always
 * fails closed. A previously accepted price may remain visible as STALE, but
 * can never authorize a fill, preview, or bot decision.
 */
export function selectPaperQuoteReadiness(
  response: unknown,
  prior: PaperQuoteReadiness,
  capturedAt: number,
  staleAfterMs = PAPER_DELAYED_QUOTE_MAX_AGE_MS,
): PaperQuoteReadiness {
  if (!finitePositive(capturedAt)) {
    return priorAsStale(prior, 0, "Quote evaluation time was invalid.");
  }

  if (!response || typeof response !== "object") {
    return priorAsStale(prior, capturedAt, "Quote response was unavailable.");
  }

  const quote = response as { price?: unknown; observation?: unknown };
  if (!quote.observation || typeof quote.observation !== "object") {
    return priorAsStale(prior, capturedAt, "Canonical quote chronology was absent.");
  }

  const observation = quote.observation as Record<string, unknown>;
  if (observation.resolution !== "RESOLVED") {
    return priorAsStale(prior, capturedAt, "Canonical quote observation is UNKNOWN.");
  }

  const valid =
    observation.specVersion === YAHOO_QUOTE_OBSERVATION_SPEC_VERSION &&
    finitePositive(quote.price) &&
    finitePositive(observation.price) &&
    quote.price === observation.price &&
    finitePositive(observation.observedAt) &&
    finitePositive(observation.availableAt) &&
    finitePositive(observation.receivedAt) &&
    typeof observation.ageMs === "number" &&
    Number.isFinite(observation.ageMs) &&
    observation.ageMs >= 0 &&
    observation.availableAt >= observation.observedAt &&
    observation.availableAt >= observation.receivedAt &&
    observation.availableAt === Math.max(
      observation.observedAt as number,
      observation.receivedAt as number,
    ) &&
    observation.observedAt <= capturedAt &&
    observation.receivedAt <= capturedAt &&
    observation.availableAt <= capturedAt;

  if (!valid) {
    return priorAsStale(prior, capturedAt, "Canonical quote chronology was malformed.");
  }

  const observedAt = observation.observedAt as number;
  const ageMs = Math.max(0, capturedAt - observedAt);
  const base = {
    price: quote.price as number,
    observedAt,
    availableAt: observation.availableAt as number,
    receivedAt: observation.receivedAt as number,
    ageMs,
  } as const;

  if (ageMs > staleAfterMs) {
    return {
      ...base,
      status: "STALE",
      actionable: false,
      label: `${CANONICAL_FIDELITY_LABELS.STALE_PIPELINE} · NOT ACTIONABLE`,
      reason: "The last canonical observation exceeded the Paper freshness budget.",
    };
  }

  return {
    ...base,
    status: "DELAYED",
    actionable: true,
    // Monday Test 2 law: never assert DELAYED BY ENTITLEMENT without a
    // provider-proven entitlement edge. A canonical delayed observation with
    // no proven paid-tier cause is an honestly degraded-but-usable capability
    // (canon ACTIVE DEGRADED: session active, one capability degraded, the
    // trader can still act with reduced confidence) — never a false
    // entitlement claim.
    label: CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED,
    reason: "Canonical delayed observation accepted for paper simulation only.",
  };
}
