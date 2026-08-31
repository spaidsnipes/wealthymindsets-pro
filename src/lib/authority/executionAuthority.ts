/**
 * executionAuthority — the canonical gate that turns a *proposal* into
 * an *authorization* to execute, per the Founder ATH Intelligence
 * System canon (August 30, 2026).
 *
 * CANON VERBATIM (Authority Model):
 *   "Intelligence and authority are separate. A model can propose an
 *    action without being authorized to execute it. Authority is
 *    granted by policy, role, permission, risk class and explicit
 *    human approval where required.
 *      OBSERVE — read/summarize/explain.
 *      PREPARE — draft/plan/simulate without external effect.
 *      LOW-RISK ACT — reversible, permissioned actions within narrow bounds.
 *      HIGH-IMPACT ACT — money, legal commitments, destructive operations,
 *        sensitive communication, trading execution, health/safety-critical
 *        or similarly consequential actions require stronger controls and
 *        appropriate human authority.
 *      NO MODEL OUTPUT ALONE CREATES AUTHORITY."
 *
 * CANON VERBATIM (Fusion / Megazord Law — trading example):
 *   "Multiple trading strategies may PROPOSE; only the canonical
 *    execution/risk gate may translate an approved proposal into broker
 *    execution. ... NO EXTERNAL BOT, MODEL OR PROVIDER MAY BECOME ATH
 *    IDENTITY, MEMORY, MARKET TRUTH, RISK AUTHORITY OR PORTFOLIO TRUTH."
 *
 * This module IS that gate for WM Pro. It sits between:
 *   - the evidence/permission compiler (decisionPermissionCompiler →
 *     RightOfWay), which answers "is the setup evidence-complete?", and
 *   - the broker execution layer (BrokerAdapter.submitOrder), which
 *     performs the real-money effect.
 *
 * It answers a DIFFERENT question than RightOfWay: "who is allowed to
 * turn THIS proposal into execution, and is that authority present?"
 * A model or bot proposal can be evidence-perfect (RightOfWay=ACTION)
 * and STILL be unauthorized to execute a live order without explicit
 * human approval. That separation is the whole point of the canon.
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no fabrication, no secrets.
 * Test-first so the "no model output alone creates authority" guarantee
 * survives every future refactor. Higher layers (API route, order
 * ticket, ai-bot adapter) call this before ever touching a BrokerAdapter.
 */

import type { UniversalOrderIntent } from "@/lib/broker/BrokerAdapter";
import type { RightOfWay } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

/** Canon action risk classes. */
export type ActionClass = "OBSERVE" | "PREPARE" | "LOW_RISK_ACT" | "HIGH_IMPACT_ACT";

/**
 * Who originated the proposal. The canon's core rule keys off this:
 * a non-human source can never self-authorize a real-money effect.
 */
export type ProposalSource =
  | "human"        // a person acting directly through the UI
  | "model"        // an LLM / AI suggestion
  | "strategy"     // an internal automated strategy
  | "external-bot" // a third-party/authorized external bot adapter
  | "unknown";

/** Broker environment marker — paper/sandbox is reversible, live is not. */
export type ExecutionEnv = "paper" | "sandbox" | "live";

/**
 * Explicit human approval token. Presence of an object is NOT approval —
 * `approved` must be literally true. `approvedBy` records the authorizing
 * identity for the receipt; it is never a secret.
 */
export interface HumanApproval {
  readonly approved: boolean;
  readonly approvedBy?: string;
  /** Optional: the human explicitly chose to override their own hard rule. */
  readonly overrideHardRule?: boolean;
}

export interface AuthorizationInput {
  /** The concrete order the caller wants to execute. */
  readonly intent: Pick<UniversalOrderIntent, "side" | "qty" | "symbol">;
  /** Who is proposing this execution. */
  readonly source: ProposalSource;
  /** Broker environment the order would hit. */
  readonly env: ExecutionEnv;
  /** Evidence/permission verdict from decisionPermissionCompiler, or null. */
  readonly rightOfWay: RightOfWay | null;
  /** Explicit human approval, or null when none was collected. */
  readonly humanApproval: HumanApproval | null;
}

/** Machine-stable reason codes — surfaces map these to copy + receipts. */
export type AuthorizationReasonCode =
  | "AUTHORIZED"
  | "AUTHORIZED_HUMAN_OVERRIDE"
  | "DENIED_INVALID_INTENT"
  | "DENIED_HUMAN_APPROVAL_REQUIRED"
  | "DENIED_MODEL_CANNOT_SELF_AUTHORIZE"
  | "DENIED_EVIDENCE_INCOMPLETE"
  | "DENIED_HARD_RULE";

export interface AuthorizationDecision {
  readonly authorized: boolean;
  readonly actionClass: ActionClass;
  /** True when this action class demands explicit human approval. */
  readonly requiresHumanApproval: boolean;
  readonly reasonCode: AuthorizationReasonCode;
  /** Short human-readable reason for surfaces + AI Execution Receipt. */
  readonly reason: string;
}

/**
 * Classify a broker order into a canon action risk class.
 *
 * A LIVE broker order moves real money / creates a real position →
 * HIGH_IMPACT_ACT. A paper/sandbox order is reversible and touches no
 * real money → LOW_RISK_ACT. (OBSERVE/PREPARE are for non-executing
 * flows — reads and drafts — and are exposed for callers that classify
 * non-order actions through the same vocabulary.)
 */
export function classifyOrderActionClass(env: ExecutionEnv): ActionClass {
  return env === "live" ? "HIGH_IMPACT_ACT" : "LOW_RISK_ACT";
}

/** A source that is not a human being acting directly. */
function isAutomatedSource(source: ProposalSource): boolean {
  return source === "model" || source === "strategy" || source === "external-bot";
}

/** RightOfWay values that permit an act to proceed. */
function rightOfWayPermitsAct(row: RightOfWay | null): boolean {
  return row === "ACTION" || row === "CAUTION";
}

/**
 * The canonical authorization gate. Deterministic priority — earlier
 * rules win. Each rule maps 1:1 to a clause of the Aug-30 canon so the
 * guarantee is auditable line by line.
 */
export function authorizeExecution(input: AuthorizationInput): AuthorizationDecision {
  const actionClass = classifyOrderActionClass(input.env);
  const requiresHumanApproval = actionClass === "HIGH_IMPACT_ACT";
  const approved = input.humanApproval?.approved === true;

  // Rule 0 — A malformed intent can never be authorized. Guards against
  // a caller passing a zero/negative qty or empty symbol into execution.
  if (!input.intent || !input.intent.symbol || !(input.intent.qty > 0)) {
    return {
      authorized: false,
      actionClass,
      requiresHumanApproval,
      reasonCode: "DENIED_INVALID_INTENT",
      reason: "Order intent is incomplete (symbol/qty). Nothing to authorize.",
    };
  }

  // Rule 1 — HIGH-IMPACT (live) ALWAYS requires explicit human approval,
  // regardless of source or evidence. Canon: "trading execution ...
  // require stronger controls and appropriate human authority."
  if (requiresHumanApproval && !approved) {
    return {
      authorized: false,
      actionClass,
      requiresHumanApproval,
      reasonCode: "DENIED_HUMAN_APPROVAL_REQUIRED",
      reason: "Live execution requires explicit human authorization.",
    };
  }

  // Rule 2 — NO MODEL OUTPUT ALONE CREATES AUTHORITY. An automated
  // source (model/strategy/external-bot) may PROPOSE but never self-
  // authorize a real execution; a human must approve. This holds even
  // for LOW-RISK (paper) so bots cannot silently drive the account.
  if (isAutomatedSource(input.source) && !approved) {
    return {
      authorized: false,
      actionClass,
      requiresHumanApproval,
      reasonCode: "DENIED_MODEL_CANNOT_SELF_AUTHORIZE",
      reason: "A proposal from an automated source needs human approval to execute.",
    };
  }

  // Rule 3 — Hard rule / risk gate (RightOfWay = NO TRADE). A human who
  // explicitly chose to override their own hard rule may proceed (human
  // sovereignty), but the override is recorded loudly. An automated
  // source can never override a hard rule (already blocked by Rule 2).
  if (input.rightOfWay === "NO TRADE") {
    if (input.source === "human" && input.humanApproval?.overrideHardRule === true) {
      return {
        authorized: true,
        actionClass,
        requiresHumanApproval,
        reasonCode: "AUTHORIZED_HUMAN_OVERRIDE",
        reason: "Human explicitly overrode their own NO-TRADE rule.",
      };
    }
    return {
      authorized: false,
      actionClass,
      requiresHumanApproval,
      reasonCode: "DENIED_HARD_RULE",
      reason: "A hard steward rule blocks this trade (NO TRADE).",
    };
  }

  // Rule 4 — Evidence must permit the act. WAIT / UNKNOWN / null all mean
  // the evidence is not complete enough to authorize an execution.
  if (!rightOfWayPermitsAct(input.rightOfWay)) {
    return {
      authorized: false,
      actionClass,
      requiresHumanApproval,
      reasonCode: "DENIED_EVIDENCE_INCOMPLETE",
      reason:
        input.rightOfWay == null
          ? "Right of Way was not evaluated — cannot authorize an execution."
          : `Right of Way is ${input.rightOfWay} — evidence not complete enough to execute.`,
    };
  }

  // Rule 5 — Authorized: evidence permits, and either a human is acting
  // directly or a human approved an automated proposal.
  return {
    authorized: true,
    actionClass,
    requiresHumanApproval,
    reasonCode: "AUTHORIZED",
    reason: `Authorized to execute (${input.rightOfWay}).`,
  };
}

export default authorizeExecution;
