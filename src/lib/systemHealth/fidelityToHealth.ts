/**
 * fidelityToHealth — canonical bridge between the two grammars.
 *
 * Canon anchors:
 *   §Living Market Visual Systems (2026-08-27) — the 7 canon fidelity
 *   labels (SESSION CLOSED · LIVE · HISTORICAL BARS · DELAYED · STALE
 *   PIPELINE · ACTIVE DEGRADED · BLOCKED BY ENTITLEMENT).
 *
 *   §Failure + Recovery Grammar (2026-08-28) — the 6 canon health
 *   states (NORMAL / DEGRADED / BLOCKED / UNAVAILABLE / RECOVERING /
 *   UNKNOWN).
 *
 * Every subsystem that renders a fidelity label to the trader also
 * has an implicit health state. Encoding the mapping in ONE place
 * (this file) enforces the ATH Systems Clarity single-writer law:
 * "many lenses, one owner per truth." A future surface that wants
 * to show subsystem health without repeating the fidelity label
 * simply asks fidelityToHealth() for the shape it needs.
 *
 * The mapping is intentional and audited — see the test file for
 * every (fidelity → health) pair. No fidelity string produces
 * NORMAL: the concept of "normal" is per-subsystem and cannot be
 * inferred from a market-data fidelity chip alone.
 */

import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "../marketData/canonicalFidelityLabels";
import type {
  CanonicalFailureState,
  FailureStateReport,
} from "./failureStateGrammar";

/**
 * Map a canonical fidelity label to the health state it implies for
 * the emitting subsystem. Called by surfaces that need to color a
 * subsystem-health chip based on the label the emitter chose.
 */
export function fidelityLabelToFailureState(
  label: CanonicalFidelityLabel,
): CanonicalFailureState {
  const L = CANONICAL_FIDELITY_LABELS;
  switch (label) {
    case L.LIVE_CERTIFIED_QUOTE:
      // Live + certified is the healthiest possible market-data state
      // available; caller may still gate NORMAL on higher-level
      // considerations (freshness across all capabilities, etc.).
      return "NORMAL";
    case L.HISTORICAL_BARS_VERIFIED:
      // Bars are trustworthy, but the live tape capability is absent.
      // Canon: fidelity is per capability — one missing capability is
      // DEGRADED, not UNAVAILABLE.
      return "DEGRADED";
    case L.DELAYED_BY_ENTITLEMENT:
      // Trader has data, but real-time is walled by tier.
      return "DEGRADED";
    case L.ACTIVE_DEGRADED:
      // The label itself encodes the state.
      return "DEGRADED";
    case L.SESSION_CLOSED_LAST_VERIFIED:
      // Closed is not delayed and is not a failure. There's no live
      // work for the subsystem to fail at. Canon: normal inactivity
      // is not failure — so we report NORMAL, not UNAVAILABLE.
      return "NORMAL";
    case L.STALE_PIPELINE:
      // Pipeline was supposed to produce and did not.
      return "RECOVERING";
    case L.BLOCKED_BY_ENTITLEMENT:
      // A policy wall — distinct from a pipeline outage.
      return "BLOCKED";
  }
}

/**
 * Build a full FailureStateReport from a fidelity label. Populates
 * the seven narrative fields with canon-safe defaults so downstream
 * assertFailureStateReport does not throw for any label.
 */
export function fidelityLabelToFailureReport(
  label: CanonicalFidelityLabel,
): FailureStateReport {
  const state = fidelityLabelToFailureState(label);
  const L = CANONICAL_FIDELITY_LABELS;
  switch (label) {
    case L.LIVE_CERTIFIED_QUOTE:
      return { state };
    case L.SESSION_CLOSED_LAST_VERIFIED:
      return { state };
    case L.HISTORICAL_BARS_VERIFIED:
      return {
        state,
        affected: "real-time tape",
        stillWorks: "verified OHLCV bars",
        reason: "no realtime provider resolved for this feed",
        userImpact: "chart is trustworthy for past-tense analysis; no live tick claim",
        nextSafeAction: "review structure using bars; wait for tape before live-execution decisions",
        recoveredWhen: "a certified realtime source connects and freshness < 20s",
      };
    case L.DELAYED_BY_ENTITLEMENT:
      return {
        state,
        affected: "real-time consolidated tape",
        stillWorks: "delayed (~15 min lagged) quote + verified bars",
        reason: "free-tier entitlement does not include realtime consolidated feed",
        userImpact: "quotes lag the live tape; not suitable for microstructure decisions",
        nextSafeAction: "upgrade entitlement or route decisions through a realtime-eligible symbol",
        recoveredWhen: "certified realtime entitlement is active for this symbol",
      };
    case L.ACTIVE_DEGRADED:
      return {
        state,
        affected: "one or more active-session capabilities",
        stillWorks: "trader can still act with reduced confidence",
        reason: "at least one downstream capability is producing weaker evidence than usual",
        userImpact: "reduce size or wait for confidence to restore",
        nextSafeAction: "consult the capability-specific chip to identify the impaired signal",
        recoveredWhen: "all active-session capabilities return to LIVE — CERTIFIED QUOTE",
      };
    case L.STALE_PIPELINE:
      return {
        state,
        affected: "live tick pipeline",
        stillWorks: "last verified bars remain rendered",
        reason: "pipeline did not deliver a fresh tick within the freshness budget",
        userImpact: "any decision that depends on the last tick is unsafe until recovery",
        nextSafeAction: "wait for the pipeline to recover; do not treat the last known price as live",
        recoveredWhen: "fresh ticks resume for ≥ 60s continuously",
      };
    case L.BLOCKED_BY_ENTITLEMENT:
      return {
        state,
        affected: "the capability the caller attempted to reach",
        stillWorks: "capabilities the current entitlement covers",
        reason: "provider refused the capability request (auth / entitlement / policy)",
        userImpact: "this capability is unreachable without a plan/config change",
        nextSafeAction: "either upgrade the entitlement or select a symbol/feature the entitlement supports",
        recoveredWhen: "entitlement is granted at the provider layer",
      };
  }
}
