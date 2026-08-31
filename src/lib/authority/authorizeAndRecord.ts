/**
 * authorizeAndRecord — the single honest entry point that composes the
 * canonical execution-authority gate with the AI Execution Receipt, per
 * the Founder ATH Intelligence System canon (August 30, 2026).
 *
 * WHY THIS EXISTS: executionAuthority.ts decides, executionReceipt.ts
 * records. A surface (order ticket, /api broker route, ai-bot proposal
 * path) should never have to hand-thread the decision from the gate into
 * the receipt builder itself — that seam is exactly where an overclaim or
 * a dropped denial could creep in. This orchestrator makes "propose →
 * authorize → record" one atomic, testable call so every surface produces
 * the SAME truthful pairing: the receipt's authorization always reflects
 * the gate's decision, and the receipt is emitted whether authorized or
 * DENIED (a denial is a first-class receipt, not a silent drop).
 *
 * IMPORTANT — authority ≠ execution. This function does NOT submit an
 * order. It authorizes and records. Broker submission stays in the broker
 * layer; the caller passes back a real broker ack (if any) so the receipt
 * can truthfully say EXECUTED — this function never fabricates one.
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no randomness, no secrets. The
 * caller supplies receiptId + createdAtIso so the result stays reproducible.
 */

import {
  authorizeExecution,
  type AuthorizationInput,
  type AuthorizationDecision,
} from "./executionAuthority";
import {
  buildExecutionReceipt,
  type ModelRuntimeRef,
  type AIExecutionReceipt,
} from "./executionReceipt";
import type { CanonicalOrderAck } from "@/lib/broker/BrokerAdapter";

export interface AuthorizeAndRecordInput {
  /** The authorization request handed to the canonical gate. */
  readonly authorization: AuthorizationInput;
  /** Stable receipt id supplied by the caller (idempotency / lookup). */
  readonly receiptId: string;
  /** ISO 8601 timestamp supplied by the caller (no clock inside). */
  readonly createdAtIso: string;
  /** Owning product/workspace, e.g. "wm-pro". */
  readonly product: string;
  /** Model runtime CLASS used to produce the proposal, or null (never a secret). */
  readonly modelRuntime?: ModelRuntimeRef | null;
  /** Evidence/source references the decision leaned on. */
  readonly sourceRefs?: readonly string[];
  /**
   * Real broker acknowledgement, IF the caller already attempted execution
   * AFTER a prior authorization. Absence means no execution happened and the
   * receipt will not claim one. This function never submits an order itself.
   */
  readonly brokerAck?: Pick<CanonicalOrderAck, "brokerOrderId" | "status"> | null;
}

export interface AuthorizeAndRecordResult {
  readonly decision: AuthorizationDecision;
  readonly receipt: AIExecutionReceipt;
}

/**
 * Authorize a proposal and produce its AI Execution Receipt in one call.
 * The receipt's `authorized`/`reasonCode`/`result` are always derived from
 * the gate's decision — they can never disagree. A denial still yields a
 * receipt (result: "DENIED"), so nothing slips through unrecorded.
 */
export function authorizeAndRecord(
  input: AuthorizeAndRecordInput,
): AuthorizeAndRecordResult {
  const decision = authorizeExecution(input.authorization);
  const receipt = buildExecutionReceipt({
    receiptId: input.receiptId,
    createdAtIso: input.createdAtIso,
    product: input.product,
    decision,
    source: input.authorization.source,
    env: input.authorization.env,
    intentSummary: {
      symbol: input.authorization.intent.symbol,
      side: input.authorization.intent.side,
      qty: input.authorization.intent.qty,
    },
    modelRuntime: input.modelRuntime ?? null,
    sourceRefs: input.sourceRefs,
    // The receipt records WHO approved — the identity from the token, never
    // a secret. Absent => null.
    approvedBy: input.authorization.humanApproval?.approvedBy ?? null,
    brokerAck: input.brokerAck ?? null,
  });
  return { decision, receipt };
}

export default authorizeAndRecord;
