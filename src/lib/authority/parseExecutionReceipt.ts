/**
 * parseExecutionReceipt — the defensive boundary between an API response and
 * the WHY / evidence view. Both Alpaca order routes ride an AI Execution
 * Receipt back on their JSON (`{ ..., receipt }`); a surface that wants to
 * render that receipt receives it as untrusted `unknown` from `fetch`.
 *
 * Per the Security Constitution ("untrusted content may inform but never
 * command"), a surface must NOT hand raw JSON straight to the formatter. This
 * pure guard validates the receipt's shape and returns a typed
 * `AIExecutionReceipt` or `null` — never throws, never trusts, never invents a
 * field the payload didn't carry. A malformed or partial payload yields `null`
 * so the caller shows "no receipt" rather than a fabricated verdict.
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no randomness.
 */

import type { AIExecutionReceipt, ExecutionResult, ModelRuntimeRef } from "./executionReceipt";
import type {
  ActionClass,
  AuthorizationReasonCode,
  ProposalSource,
  ExecutionEnv,
} from "./executionAuthority";

const EXECUTION_RESULTS: readonly ExecutionResult[] = [
  "EXECUTED",
  "AUTHORIZED_NOT_EXECUTED",
  "FAILED",
  "DENIED",
];

const ACTION_CLASSES: readonly ActionClass[] = [
  "OBSERVE",
  "PREPARE",
  "LOW_RISK_ACT",
  "HIGH_IMPACT_ACT",
];

const REASON_CODES: readonly AuthorizationReasonCode[] = [
  "AUTHORIZED",
  "AUTHORIZED_HUMAN_OVERRIDE",
  "DENIED_INVALID_INTENT",
  "DENIED_HUMAN_APPROVAL_REQUIRED",
  "DENIED_MODEL_CANNOT_SELF_AUTHORIZE",
  "DENIED_EVIDENCE_INCOMPLETE",
  "DENIED_HARD_RULE",
];

const PROPOSAL_SOURCES: readonly ProposalSource[] = [
  "human",
  "model",
  "strategy",
  "external-bot",
  "unknown",
];

const EXECUTION_ENVS: readonly ExecutionEnv[] = ["paper", "sandbox", "live"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function parseModelRuntime(v: unknown): ModelRuntimeRef | null {
  if (!isRecord(v)) return null;
  if (typeof v.providerClass !== "string" || typeof v.capability !== "string") return null;
  return { providerClass: v.providerClass, capability: v.capability };
}

function parseIntentSummary(
  v: unknown,
): AIExecutionReceipt["intentSummary"] | null {
  if (!isRecord(v)) return null;
  if (typeof v.symbol !== "string") return null;
  if (typeof v.side !== "string") return null;
  if (typeof v.qty !== "number" || !Number.isFinite(v.qty)) return null;
  return { symbol: v.symbol, side: v.side, qty: v.qty };
}

/**
 * Structurally validate an unknown value as an AI Execution Receipt. Returns
 * the typed receipt when every required field is present and well-typed, else
 * `null`. Optional fields are normalized (missing arrays → [], missing broker
 * id → null) so downstream formatters never see `undefined`.
 */
export function parseExecutionReceipt(value: unknown): AIExecutionReceipt | null {
  if (!isRecord(value)) return null;

  const result = value.result;
  if (typeof result !== "string" || !EXECUTION_RESULTS.includes(result as ExecutionResult)) {
    return null;
  }

  const intentSummary = parseIntentSummary(value.intentSummary);
  if (!intentSummary) return null;

  // Required scalar identity + verdict fields — a receipt without these is not
  // a receipt we will render (no fabrication of a missing verdict).
  if (typeof value.receiptId !== "string") return null;
  if (typeof value.reason !== "string") return null;
  if (
    typeof value.env !== "string" ||
    !EXECUTION_ENVS.includes(value.env as ExecutionEnv)
  ) {
    return null;
  }
  if (
    typeof value.source !== "string" ||
    !PROPOSAL_SOURCES.includes(value.source as ProposalSource)
  ) {
    return null;
  }
  if (typeof value.authorized !== "boolean") return null;
  if (typeof value.requiresHumanApproval !== "boolean") return null;

  // Enum identity fields — a receipt whose actionClass / reasonCode is not a
  // known member is not a receipt we will render. formatExecutionReceiptWhy
  // prints actionClass straight into a WHY row, so an unchecked cast here would
  // let a garbage class reach the surface. Validate, don't trust.
  if (
    typeof value.actionClass !== "string" ||
    !ACTION_CLASSES.includes(value.actionClass as ActionClass)
  ) {
    return null;
  }
  if (
    typeof value.reasonCode !== "string" ||
    !REASON_CODES.includes(value.reasonCode as AuthorizationReasonCode)
  ) {
    return null;
  }

  return {
    receiptId: value.receiptId,
    createdAtIso: typeof value.createdAtIso === "string" ? value.createdAtIso : "",
    product: typeof value.product === "string" ? value.product : "",
    source: value.source as AIExecutionReceipt["source"],
    env: value.env as AIExecutionReceipt["env"],
    actionClass: value.actionClass as AIExecutionReceipt["actionClass"],
    intentSummary,
    authorized: value.authorized,
    reasonCode: value.reasonCode as AIExecutionReceipt["reasonCode"],
    // (actionClass / reasonCode validated above against their known sets)
    reason: value.reason,
    requiresHumanApproval: value.requiresHumanApproval,
    humanApprovedBy: typeof value.humanApprovedBy === "string" ? value.humanApprovedBy : null,
    modelRuntime: parseModelRuntime(value.modelRuntime),
    sourceRefs: isStringArray(value.sourceRefs) ? value.sourceRefs : [],
    brokerOrderId: typeof value.brokerOrderId === "string" ? value.brokerOrderId : null,
    result: result as ExecutionResult,
  };
}

/**
 * Convenience: pull the receipt out of a raw order-route response body
 * (`{ ..., receipt }`) and validate it. Returns `null` when the body carries
 * no receipt or a malformed one.
 */
export function parseReceiptFromResponse(body: unknown): AIExecutionReceipt | null {
  if (!isRecord(body)) return null;
  return parseExecutionReceipt(body.receipt);
}

export default parseExecutionReceipt;
