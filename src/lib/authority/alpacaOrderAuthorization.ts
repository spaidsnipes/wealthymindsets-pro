/**
 * alpacaOrderAuthorization — the pure bridge that puts the canonical
 * execution-authority gate in front of the real Alpaca paper order path
 * (/api/alpaca/trade), per the Founder ATH Intelligence System canon
 * (August 30, 2026): "NO MODEL OUTPUT ALONE CREATES AUTHORITY."
 *
 * WHY A SEPARATE PURE MODULE: the route handler itself (requireAuth, fetch,
 * NextResponse) is not unit-testable under this repo's pure-function test
 * rule. This module maps the wire request → an AuthorizationInput, runs the
 * gate + receipt via authorizeAndRecord, and is fully deterministic — so the
 * "an authenticated human owner is unaffected, but an automated caller without
 * human approval is DENIED" guarantee is locked by tests and survives refactors.
 *
 * ENV IS PAPER-ONLY here (the route hard-rejects live). A directly
 * authenticated human owner IS the ACTION authority for their own paper
 * order — so the default path stays open and behavior does not change for
 * humans. An automated source (model/strategy/external-bot) must supply its
 * own evidence verdict AND explicit human approval, exactly as the canon
 * requires, or it is denied before any broker call.
 *
 * PURE / DETERMINISTIC — caller supplies nowIso + any real broker ack; no
 * clock, no I/O, no secrets inside.
 */

import { authorizeAndRecord, type AuthorizeAndRecordResult } from "./authorizeAndRecord";
import type { ProposalSource } from "./executionAuthority";
import type { RightOfWay } from "@/lib/marketData/viewModels/decisionPermissionCompiler";
import type { CanonicalOrderAck } from "@/lib/broker/BrokerAdapter";

/** The subset of the /api/alpaca/trade body that authority cares about. */
export interface AlpacaOrderAuthorizationRequest {
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly qty: number;
  /** Who is placing this order. Defaults to "human" (the authenticated owner). */
  readonly source?: ProposalSource;
  /**
   * Evidence verdict from the decision compiler, when the caller has one.
   * A direct human defaults to "ACTION" (human sovereignty over their own
   * paper order); an automated source defaults to null (must prove evidence).
   */
  readonly rightOfWay?: RightOfWay | null;
  /** Explicit human approval — required for any automated source. */
  readonly humanApproval?: { readonly approved: boolean; readonly approvedBy?: string } | null;
}

/**
 * Map an Alpaca order status string onto the canonical ack status the
 * receipt understands. Unknown/absent → "unknown" (never claims success).
 */
export function canonicalizeAlpacaStatus(
  status: string | null | undefined,
): CanonicalOrderAck["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "accepted":
    case "new":
    case "filled":
    case "partially_filled":
    case "done_for_day":
    case "calculated":
      return "accepted";
    case "pending_new":
    case "pending_replace":
    case "accepted_for_bidding":
    case "held":
      return "pending";
    case "rejected":
    case "canceled":
    case "cancelled":
    case "expired":
    case "stopped":
    case "suspended":
      return "rejected";
    default:
      return "unknown";
  }
}

export interface AuthorizeAlpacaOrderArgs {
  readonly request: AlpacaOrderAuthorizationRequest;
  /** The authenticated owner's user id — recorded as a source ref, never a secret. */
  readonly ownerUserId: string;
  /** ISO timestamp supplied by the route (no clock inside this module). */
  readonly nowIso: string;
  /**
   * Real broker ack, present only AFTER a submitted order. Absence = preflight
   * (authorize-before-submit); the receipt then says AUTHORIZED_NOT_EXECUTED.
   */
  readonly brokerAck?: Pick<CanonicalOrderAck, "brokerOrderId" | "status"> | null;
}

/**
 * Authorize (and record) an Alpaca paper order. Call it TWICE from the route:
 *   1. Preflight (no brokerAck) — if `.decision.authorized` is false, refuse
 *      before touching the broker and return `.receipt` (a DENIED receipt).
 *   2. Post-submit (with the real brokerAck) — to emit the truthful EXECUTED /
 *      FAILED receipt that rides back on the response.
 */
export function authorizeAlpacaOrder(args: AuthorizeAlpacaOrderArgs): AuthorizeAndRecordResult {
  const source: ProposalSource = args.request.source ?? "human";
  const rightOfWay: RightOfWay | null =
    args.request.rightOfWay ?? (source === "human" ? "ACTION" : null);
  const brokerOrderId = args.brokerAck?.brokerOrderId;
  return authorizeAndRecord({
    authorization: {
      intent: { symbol: args.request.symbol, side: args.request.side, qty: args.request.qty },
      source,
      env: "paper",
      rightOfWay,
      humanApproval: args.request.humanApproval ?? null,
    },
    receiptId: brokerOrderId
      ? `alpaca:${brokerOrderId}`
      : `alpaca:preflight:${(args.request.symbol || "?").toUpperCase()}:${args.request.side}:${args.request.qty}`,
    createdAtIso: args.nowIso,
    product: "wm-pro",
    sourceRefs: [`owner:${args.ownerUserId}`],
    brokerAck: args.brokerAck ?? null,
  });
}

/**
 * The canonical JSON body for a gate DENIAL — returned with HTTP 403 BEFORE any
 * broker call. Both Alpaca order routes (/api/alpaca/trade and
 * /api/alpaca-trading) MUST return this exact shape so a client sees one
 * contract no matter which path served the request. Extracting it here is what
 * stops the two routes from drifting again — divergence between these paths is
 * precisely the class of gap that let the second order path ship ungated.
 *
 * PURE: plain JSON-serializable data; the route wraps it in NextResponse.
 */
export function alpacaGateDenialBody(preflight: AuthorizeAndRecordResult): {
  readonly error: string;
  readonly code: AuthorizeAndRecordResult["decision"]["reasonCode"];
  readonly receipt: AuthorizeAndRecordResult["receipt"];
} {
  return {
    error: preflight.decision.reason,
    code: preflight.decision.reasonCode,
    receipt: preflight.receipt,
  };
}

export default authorizeAlpacaOrder;
