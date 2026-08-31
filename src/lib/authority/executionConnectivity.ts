/**
 * executionConnectivity — the missing truth between "authorized to execute"
 * and "actually able to reach the broker."
 *
 * The Aug-30 authority gate (executionAuthority.authorizeExecution) answers
 * "who is allowed to turn this proposal into execution?" It deliberately does
 * NOT know whether the target broker is even connected in THIS runtime. On a
 * portable app that runs both locally (`next dev`) and on the host, a decision
 * can be perfectly AUTHORIZED and still be un-executable because the broker's
 * credentials are absent from this lane's env — the exact class of issue the
 * Founder asked to stop running into ("make sure my app is connected locally
 * also so we stop running into these issues").
 *
 * This pure selector composes the authority decision with a provider-readiness
 * verdict (broker/providerReadiness) so a surface never renders a misleading
 * "order sent" when the adapter has no credentials to send with. It NEVER
 * inspects a secret value — it only reads the presence-only readiness result.
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no randomness, no secrets.
 */

import type { AuthorizationDecision } from "./executionAuthority";
import type { ProviderReadiness } from "@/lib/broker/providerReadiness";

export type ExecutionReadyState =
  /** Authorized AND the broker's credentials are present in this runtime. */
  | "READY_TO_EXECUTE"
  /** Authorization succeeded, but the broker is not connected here. */
  | "AUTHORIZED_BUT_DISCONNECTED"
  /** The authority gate denied the action — connectivity is moot. */
  | "NOT_AUTHORIZED";

export interface ExecutionReadyVerdict {
  readonly state: ExecutionReadyState;
  /** True ONLY when authorized AND the provider is READY. Never rounds up. */
  readonly canReachBroker: boolean;
  /** Human-readable, truthful reason for surfaces + the AI Execution Receipt. */
  readonly reason: string;
  /** Required env NAMES missing when AUTHORIZED_BUT_DISCONNECTED (else []). */
  readonly missing: readonly string[];
}

/**
 * Compose the authority decision with the broker-readiness verdict.
 *
 * Priority is deliberate: a DENIED authorization dominates — if you may not
 * act, connectivity is irrelevant and we surface the denial, not a
 * connectivity complaint. Only once authorized do we check whether the broker
 * can actually be reached in this lane.
 */
export function resolveExecutionReady(
  decision: AuthorizationDecision,
  readiness: ProviderReadiness,
): ExecutionReadyVerdict {
  if (!decision.authorized) {
    return {
      state: "NOT_AUTHORIZED",
      canReachBroker: false,
      reason: decision.reason,
      missing: [],
    };
  }

  if (readiness.status !== "READY") {
    const names = readiness.missing.join(", ");
    return {
      state: "AUTHORIZED_BUT_DISCONNECTED",
      canReachBroker: false,
      reason: `Authorized, but ${readiness.label} is not connected in this runtime (missing: ${names}).`,
      missing: readiness.missing,
    };
  }

  return {
    state: "READY_TO_EXECUTE",
    canReachBroker: true,
    reason: `Authorized and ${readiness.label} credentials are present in this runtime.`,
    missing: [],
  };
}

export default resolveExecutionReady;
