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
 * verdict (broker/providerReadiness) and a provider-specific live receipt so a
 * surface never renders a misleading "order sent" from credential presence.
 * It NEVER inspects a secret value.
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no randomness, no secrets.
 */

import type { AuthorizationDecision } from "./executionAuthority";
import type { ProviderReadiness } from "@/lib/broker/providerReadiness";

export type ExecutionReadyState =
  /** Authorized, connected, and the live receipt proves execution capability. */
  | "READY_TO_EXECUTE"
  /** Required config exists, but no matching live broker receipt exists. */
  | "AUTHORIZED_CONFIGURED_UNPROVEN"
  /** The broker answered, but this receipt proves read-only capability only. */
  | "AUTHORIZED_CONNECTED_READ_ONLY"
  /** Authorization succeeded, but the broker is not connected here. */
  | "AUTHORIZED_BUT_DISCONNECTED"
  /** The authority gate denied the action — connectivity is moot. */
  | "NOT_AUTHORIZED";

export interface ExecutionReadyVerdict {
  readonly state: ExecutionReadyState;
  /** True ONLY when authorized AND the provider is READY. Never rounds up. */
  readonly canReachBroker: boolean;
  /** True ONLY when authority, identity, connection, and execution all agree. */
  readonly canExecute: boolean;
  /** Human-readable, truthful reason for surfaces + the AI Execution Receipt. */
  readonly reason: string;
  /** Required env NAMES missing when AUTHORIZED_BUT_DISCONNECTED (else []). */
  readonly missing: readonly string[];
}

export interface ExecutionConnectionReceipt {
  /** Must match the provider readiness row; a different provider cannot prove this wire. */
  readonly provider: ProviderReadiness["provider"];
  /** A provider-specific runtime probe reached and authenticated this broker. */
  readonly connected: boolean;
  /** The same live probe explicitly proved order execution capability. */
  readonly executionCapable: boolean;
  /** Provider-owned explanation safe for the human receipt. */
  readonly reason: string;
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
  connection?: ExecutionConnectionReceipt,
): ExecutionReadyVerdict {
  if (!decision.authorized) {
    return {
      state: "NOT_AUTHORIZED",
      canReachBroker: false,
      canExecute: false,
      reason: decision.reason,
      missing: [],
    };
  }

  if (readiness.status !== "READY") {
    const names = readiness.missing.join(", ");
    return {
      state: "AUTHORIZED_BUT_DISCONNECTED",
      canReachBroker: false,
      canExecute: false,
      reason: `Authorized, but ${readiness.label} is not connected in this runtime (missing: ${names}).`,
      missing: readiness.missing,
    };
  }

  if (!connection || connection.provider !== readiness.provider) {
    return {
      state: "AUTHORIZED_CONFIGURED_UNPROVEN",
      canReachBroker: false,
      canExecute: false,
      reason: `Authorized and ${readiness.label} configuration is present, but no matching live connection receipt proves this broker wire.`,
      missing: [],
    };
  }

  if (!connection.connected) {
    return {
      state: "AUTHORIZED_BUT_DISCONNECTED",
      canReachBroker: false,
      canExecute: false,
      reason: `Authorized, but ${readiness.label} is not connected: ${connection.reason}`,
      missing: [],
    };
  }

  if (!connection.executionCapable) {
    return {
      state: "AUTHORIZED_CONNECTED_READ_ONLY",
      canReachBroker: true,
      canExecute: false,
      reason: `Authorized and ${readiness.label} is reachable, but execution is not proven: ${connection.reason}`,
      missing: [],
    };
  }

  return {
    state: "READY_TO_EXECUTE",
    canReachBroker: true,
    canExecute: true,
    reason: `Authorized and ${readiness.label} has a matching live execution-capability receipt.`,
    missing: [],
  };
}

export default resolveExecutionReady;
