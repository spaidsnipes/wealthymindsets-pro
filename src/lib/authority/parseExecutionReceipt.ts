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

/**
 * The known-member sets for each enum identity field, expressed as
 * `Record<Union, true>` rather than a hand-listed array. This is deliberate:
 * TypeScript FORCES every union member to appear as a key, so if a new
 * `ProposalSource` / `ActionClass` / … is ever added to the type, this file
 * fails to compile until the set is updated. A plain `string[]` would silently
 * go stale and start REJECTING valid receipts. Membership is then an O(1)
 * own-property check via `isKnown`.
 */
const EXECUTION_RESULT_SET: Record<ExecutionResult, true> = {
  EXECUTED: true,
  AUTHORIZED_NOT_EXECUTED: true,
  FAILED: true,
  DENIED: true,
};

const ACTION_CLASS_SET: Record<ActionClass, true> = {
  OBSERVE: true,
  PREPARE: true,
  LOW_RISK_ACT: true,
  HIGH_IMPACT_ACT: true,
};

const REASON_CODE_SET: Record<AuthorizationReasonCode, true> = {
  AUTHORIZED: true,
  AUTHORIZED_HUMAN_OVERRIDE: true,
  DENIED_INVALID_INTENT: true,
  DENIED_HUMAN_APPROVAL_REQUIRED: true,
  DENIED_MODEL_CANNOT_SELF_AUTHORIZE: true,
  DENIED_EVIDENCE_INCOMPLETE: true,
  DENIED_HARD_RULE: true,
};

const PROPOSAL_SOURCE_SET: Record<ProposalSource, true> = {
  human: true,
  model: true,
  strategy: true,
  "external-bot": true,
  unknown: true,
};

const EXECUTION_ENV_SET: Record<ExecutionEnv, true> = {
  paper: true,
  sandbox: true,
  live: true,
};

/** O(1) known-member check that also narrows `value` to the union type. */
function isKnown<T extends string>(
  set: Record<T, true>,
  value: unknown,
): value is T {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(set, value);
}

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

  // Verdict — no fabrication of a missing / unknown verdict.
  if (!isKnown(EXECUTION_RESULT_SET, value.result)) return null;

  const intentSummary = parseIntentSummary(value.intentSummary);
  if (!intentSummary) return null;

  // Required scalar identity fields.
  if (typeof value.receiptId !== "string") return null;
  if (typeof value.reason !== "string") return null;
  if (typeof value.authorized !== "boolean") return null;
  if (typeof value.requiresHumanApproval !== "boolean") return null;

  // Enum identity fields — every one of these is printed into a WHY row by
  // formatExecutionReceiptWhy, so an unchecked cast would let a garbage member
  // reach the surface. Validate against the known-member set (which itself is
  // compile-time-forced to cover the whole union). `isKnown` narrows the type,
  // so no casts are needed below.
  if (!isKnown(EXECUTION_ENV_SET, value.env)) return null;
  if (!isKnown(PROPOSAL_SOURCE_SET, value.source)) return null;
  if (!isKnown(ACTION_CLASS_SET, value.actionClass)) return null;
  if (!isKnown(REASON_CODE_SET, value.reasonCode)) return null;

  return {
    receiptId: value.receiptId,
    createdAtIso: typeof value.createdAtIso === "string" ? value.createdAtIso : "",
    product: typeof value.product === "string" ? value.product : "",
    source: value.source,
    env: value.env,
    actionClass: value.actionClass,
    intentSummary,
    authorized: value.authorized,
    reasonCode: value.reasonCode,
    reason: value.reason,
    requiresHumanApproval: value.requiresHumanApproval,
    humanApprovedBy: typeof value.humanApprovedBy === "string" ? value.humanApprovedBy : null,
    modelRuntime: parseModelRuntime(value.modelRuntime),
    sourceRefs: isStringArray(value.sourceRefs) ? value.sourceRefs : [],
    brokerOrderId: typeof value.brokerOrderId === "string" ? value.brokerOrderId : null,
    result: value.result,
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
