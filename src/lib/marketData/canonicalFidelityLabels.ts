/**
 * canonicalFidelityLabels — canon §Living Market Visual Systems (2026-08-27).
 *
 * Canon verbatim (5 binding laws):
 *   1. "THE MARKET SHOULD LOOK ALIVE; THE INTERFACE SHOULD FEEL STILL."
 *   2. "CLOSED IS NOT DELAYED."
 *   3. "FIDELITY IS PER CAPABILITY, NOT A SYMBOL-WIDE INSULT."
 *   4. "THE NEW OS MUST NOT REQUIRE THE USER TO THINK LIKE A DATA ENGINEER."
 *   5. "Generic yellow dots are prohibited."
 *
 * Canon verbatim (vocabulary):
 *   "If a status is material, present calm semantic language such as:
 *    SESSION CLOSED — LAST VERIFIED; LIVE — CERTIFIED QUOTE;
 *    HISTORICAL BARS VERIFIED; DELAYED BY ENTITLEMENT;
 *    STALE PIPELINE; ACTIVE DEGRADED; BLOCKED BY ENTITLEMENT.
 *    Color may support meaning but may never replace it."
 *
 * Canon quarantine list (verbatim):
 *   "Remove or quarantine from the new production path: old yellow-dot
 *    vocabulary, old provider-specific status strips, blanket delayed
 *    labels, blanket OHLC-only badges, duplicate chart-app toolbars,
 *    stale provider icons used as primary UX."
 *
 * This module is the single source of truth for market-fidelity
 * labels shown to the trader on any surface. Every consumer that
 * used to hand-roll a status pill string must import a label from
 * here so:
 *
 *   - the canon vocabulary is enforced uniformly (canon §OS Acceptance);
 *   - closed-state and unavailable-state are visibly different
 *     (canon: "closed is not delayed");
 *   - a Sentinel regression can lock the set (see .test.ts) and any
 *     future free-form pill string gets caught before shipping.
 *
 * NOT a design system decision: color and layout stay in the surface
 * component. This module only owns TEXT + semantic verdict.
 */

/**
 * The canonical seven labels, verbatim from the Visual Systems Canon
 * (2026-08-27, "GENERIC YELLOW DOTS ARE PROHIBITED" section).
 *
 * These strings are UI copy — do not rephrase them without a canon
 * amendment. The regression test locks the set exactly.
 */
export const CANONICAL_FIDELITY_LABELS = {
  /** Regular / premarket / after-hours window is closed for this
   *  symbol; the last verified market picture is still shown with
   *  its timestamp. Never "delayed" — canon: closed is not delayed. */
  SESSION_CLOSED_LAST_VERIFIED: "SESSION CLOSED — LAST VERIFIED",

  /** Real-time consolidated tape is arriving from a certified source. */
  LIVE_CERTIFIED_QUOTE: "LIVE — CERTIFIED QUOTE",

  /** OHLCV bars have been verified end-to-end but a richer capability
   *  (ticks / depth / Greeks) may still be unavailable. Do NOT stamp
   *  the whole symbol OHLC-only — canon: "fidelity is per capability,
   *  not a symbol-wide insult." */
  HISTORICAL_BARS_VERIFIED: "HISTORICAL BARS VERIFIED",

  /** The provider is live but a paid-tier entitlement is required to
   *  reach the certified consolidated tape — the trader is served a
   *  15-minute-lagged feed by contract, not by pipeline failure. */
  DELAYED_BY_ENTITLEMENT: "DELAYED BY ENTITLEMENT",

  /** The pipeline has not delivered fresh ticks within the freshness
   *  budget — infrastructure state, distinct from an entitlement gap. */
  STALE_PIPELINE: "STALE PIPELINE",

  /** The session is active but at least one capability is degraded —
   *  the trader can still act, with reduced confidence. */
  ACTIVE_DEGRADED: "ACTIVE DEGRADED",

  /** Attempt to reach the capability was refused by the provider
   *  (auth / entitlement / policy). Not a bug, not a stale tick —
   *  a wall. */
  BLOCKED_BY_ENTITLEMENT: "BLOCKED BY ENTITLEMENT",
} as const;

export type CanonicalFidelityLabelKey = keyof typeof CANONICAL_FIDELITY_LABELS;
export type CanonicalFidelityLabel =
  (typeof CANONICAL_FIDELITY_LABELS)[CanonicalFidelityLabelKey];

/**
 * The exhaustive set as a plain array — useful for regression tests
 * and lookup helpers that want to iterate.
 */
export const ALL_CANONICAL_FIDELITY_LABELS: readonly CanonicalFidelityLabel[] = Object.freeze(
  Object.values(CANONICAL_FIDELITY_LABELS) as CanonicalFidelityLabel[],
);

/**
 * Legacy phrases that must NOT appear in NEW production label
 * surfaces. Historical mentions inside comments / docstrings / test
 * fixtures are permitted so we can name what we're moving away from.
 * The audit script scripts/audit-fidelity-labels.mjs enforces this at
 * the code-string level.
 *
 * Canon anchor: §Legacy Surface Quarantine.
 */
export const QUARANTINED_FIDELITY_PHRASES: readonly string[] = Object.freeze([
  "NO FEED",           // generic no-signal blanket — replaced by
                       // SESSION_CLOSED_LAST_VERIFIED or STALE_PIPELINE
  "OHLCV ONLY",        // blanket OHLC-only insult — replaced by
                       // HISTORICAL_BARS_VERIFIED
  "OHLC ONLY",         // typographical variant
  "DELAYED 15 MIN",    // provider-specific time-count — replaced by
                       // DELAYED_BY_ENTITLEMENT
]);

/**
 * Pure predicate — is this a canon-approved label?
 * Callers should never render a fidelity string that isn't one of
 * these seven values.
 */
export function isCanonicalFidelityLabel(s: string): s is CanonicalFidelityLabel {
  return (ALL_CANONICAL_FIDELITY_LABELS as readonly string[]).includes(s);
}

/**
 * Input shape for resolveCanonicalFidelityLabel — session-aware +
 * capability-aware selector for the ONE label the surface should
 * show right now.
 *
 * The caller passes what it truthfully knows; the resolver never
 * fabricates. UNKNOWN inputs → the resolver returns undefined and
 * the surface renders no chip at all (canon §silence-is-a-feature).
 */
export interface FidelityResolutionInput {
  /** Is the eligible market session currently open? */
  sessionOpen?: boolean;
  /** Have we received a fresh certified quote inside the freshness
   *  budget? Requires sessionOpen=true. */
  liveQuoteFresh?: boolean;
  /** Is the underlying entitlement gate blocking live access? */
  entitlementBlocked?: boolean;
  /** Did the provider explicitly identify contractual delayed access? */
  entitlementDelayed?: boolean;
  /** Have we exceeded the pipeline freshness budget without a wall
   *  entitlement block? */
  pipelineStale?: boolean;
  /** Any active-session capability is degraded (ticks OK, depth
   *  unavailable, etc.) — but the trader can still act. */
  activeButDegraded?: boolean;
  /** OHLCV bars are verified end-to-end. Used only when the session
   *  is closed AND we have last-verified bars to show. */
  historicalBarsVerified?: boolean;
}

/**
 * Priority: the strongest, most specific truth wins. If the market
 * session is closed, the label is CLOSED (canon: closed is not
 * delayed — never STALE_PIPELINE). If the entitlement wall is up,
 * that beats stale-pipeline. Fresh live quote beats degraded.
 */
export function resolveCanonicalFidelityLabel(
  input: FidelityResolutionInput,
): CanonicalFidelityLabel | undefined {
  // Closed session dominates — canon: "closed is not delayed".
  if (input.sessionOpen === false) {
    return input.historicalBarsVerified
      ? CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED
      : CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED;
  }
  // Entitlement wall — a policy verdict, distinct from pipeline health.
  if (input.entitlementBlocked === true) {
    return CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT;
  }
  // Live + fresh — the strongest active-session grant.
  if (input.sessionOpen === true && input.liveQuoteFresh === true) {
    return input.activeButDegraded === true
      ? CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED
      : CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  }
  // Session open but pipeline stale.
  if (input.sessionOpen === true && input.pipelineStale === true) {
    return CANONICAL_FIDELITY_LABELS.STALE_PIPELINE;
  }
  // Entitlement-based delay (paid-tier gap). This requires affirmative
  // provider evidence; `entitlementBlocked=false` merely rules out one wall
  // and must never be rounded up into a delay contract.
  if (input.entitlementDelayed === true && input.liveQuoteFresh === false && input.sessionOpen === true) {
    return CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT;
  }
  // We have bars but no active session signal — fall back to bars-verified.
  if (input.historicalBarsVerified === true) {
    return CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED;
  }
  // Silence — the surface renders nothing (canon: no fake status).
  return undefined;
}
