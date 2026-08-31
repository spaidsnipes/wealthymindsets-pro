/**
 * executionReceipt — the AI Execution Receipt for the WM Pro authority
 * spine, per the Founder ATH Intelligence System canon (August 30, 2026).
 *
 * CANON VERBATIM (Model Gateway):
 *   "Each run may create an AI Execution Receipt containing provider/model
 *    class, capability used, source references, data exposure, tool calls,
 *    important policy decisions, result status, cost where relevant,
 *    failure/fallback and human approval when required."
 *
 * CANON VERBATIM (Spaidbot posture): "ACCOUNTABLE — important work
 * produces receipts." And the Supersuit "FIRST BUILDABLE SLICE":
 *   "... one ATHOS tool -> WHY/evidence view -> AI Execution Receipt ->
 *    provider swap/failure -> continuity preserved ..."
 *
 * This builder takes an authorizeExecution() decision plus its context
 * and produces a truthful, machine-readable receipt. It is the paired
 * concept of executionAuthority.ts: the gate decides, the receipt records.
 *
 * TRUTH DISCIPLINE (why the result field is derived, never asserted):
 * a receipt must never overclaim. This builder refuses to say EXECUTED
 * unless a real broker acknowledgement was passed in. If the gate denied,
 * result is DENIED. If the gate authorized but no broker ack is present,
 * result is AUTHORIZED_NOT_EXECUTED — authorization is not execution.
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no randomness, no secrets. The
 * caller supplies receiptId + createdAtIso so the function stays testable
 * and the receipt stays reproducible. Never place tokens/keys in a receipt.
 */

import type {
  AuthorizationDecision,
  ProposalSource,
  ExecutionEnv,
} from "./executionAuthority";
import type { CanonicalOrderAck } from "@/lib/broker/BrokerAdapter";

/** Provider/model-class record — a class label, never a secret or key. */
export interface ModelRuntimeRef {
  /** e.g. "anthropic-claude", "openai-gpt", "local", "deterministic". */
  readonly providerClass: string;
  /** What the runtime was used for, e.g. "propose-order", "explain". */
  readonly capability: string;
}

/** Terminal result status of the run the receipt records. */
export type ExecutionResult =
  | "DENIED"                 // gate refused authorization
  | "AUTHORIZED_NOT_EXECUTED" // gate allowed, no broker effect attempted/recorded
  | "EXECUTED"               // broker acknowledged accepted/pending
  | "FAILED";                // broker acknowledged rejected, or execution error

export interface ExecutionReceiptInput {
  /** Stable id supplied by the caller (idempotency / receipt lookup). */
  readonly receiptId: string;
  /** ISO 8601 timestamp supplied by the caller (no clock inside). */
  readonly createdAtIso: string;
  /** Owning product/workspace, e.g. "wm-pro". */
  readonly product: string;
  /** The authorization decision this receipt records. */
  readonly decision: AuthorizationDecision;
  /** Who proposed the action. */
  readonly source: ProposalSource;
  /** Broker environment the order would/did hit. */
  readonly env: ExecutionEnv;
  /** Human-readable intent summary — NO secrets. */
  readonly intentSummary: { readonly symbol: string; readonly side: string; readonly qty: number };
  /** Model runtime class used to produce the proposal, or null. */
  readonly modelRuntime?: ModelRuntimeRef | null;
  /** Evidence/source references the decision leaned on. */
  readonly sourceRefs?: readonly string[];
  /** Who approved (identity, never a secret), or null. */
  readonly approvedBy?: string | null;
  /**
   * Real broker acknowledgement, IF an execution was attempted. Absence
   * means no execution happened — the receipt will not claim one.
   */
  readonly brokerAck?: Pick<CanonicalOrderAck, "brokerOrderId" | "status"> | null;
}

export interface AIExecutionReceipt {
  readonly receiptId: string;
  readonly createdAtIso: string;
  readonly product: string;
  readonly source: ProposalSource;
  readonly env: ExecutionEnv;
  readonly actionClass: AuthorizationDecision["actionClass"];
  readonly intentSummary: { readonly symbol: string; readonly side: string; readonly qty: number };
  readonly authorized: boolean;
  readonly reasonCode: AuthorizationDecision["reasonCode"];
  readonly reason: string;
  readonly requiresHumanApproval: boolean;
  readonly humanApprovedBy: string | null;
  readonly modelRuntime: ModelRuntimeRef | null;
  readonly sourceRefs: readonly string[];
  readonly brokerOrderId: string | null;
  readonly result: ExecutionResult;
}

/**
 * Derive the terminal result WITHOUT overclaiming. Priority:
 *   1. Not authorized               -> DENIED
 *   2. Authorized, no broker ack     -> AUTHORIZED_NOT_EXECUTED
 *   3. Broker ack rejected/unknown   -> FAILED
 *   4. Broker ack accepted/pending   -> EXECUTED
 */
export function deriveExecutionResult(
  authorized: boolean,
  brokerAck: Pick<CanonicalOrderAck, "status"> | null | undefined,
): ExecutionResult {
  if (!authorized) return "DENIED";
  if (!brokerAck) return "AUTHORIZED_NOT_EXECUTED";
  if (brokerAck.status === "accepted" || brokerAck.status === "pending") return "EXECUTED";
  return "FAILED";
}

/** Build a truthful, machine-readable AI Execution Receipt. */
export function buildExecutionReceipt(input: ExecutionReceiptInput): AIExecutionReceipt {
  const result = deriveExecutionResult(input.decision.authorized, input.brokerAck ?? null);
  return {
    receiptId: input.receiptId,
    createdAtIso: input.createdAtIso,
    product: input.product,
    source: input.source,
    env: input.env,
    actionClass: input.decision.actionClass,
    intentSummary: input.intentSummary,
    authorized: input.decision.authorized,
    reasonCode: input.decision.reasonCode,
    reason: input.decision.reason,
    requiresHumanApproval: input.decision.requiresHumanApproval,
    humanApprovedBy: input.approvedBy ?? null,
    modelRuntime: input.modelRuntime ?? null,
    sourceRefs: input.sourceRefs ?? [],
    brokerOrderId: input.brokerAck?.brokerOrderId ?? null,
    result,
  };
}

export default buildExecutionReceipt;
