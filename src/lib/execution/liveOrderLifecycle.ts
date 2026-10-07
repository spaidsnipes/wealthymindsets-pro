/**
 * ONE LIVE ORDER'S LIFECYCLE ON THE CHART — Garden 19 §23 "TRADE FROM CHART",
 * build-order P0.3. PURE.
 *
 * "Broker acknowledgement and reconciliation determine execution truth." This
 * machine is the only place a chart ticket's order state changes. It never
 * guesses: a send that timed out is UNKNOWN (it may be at the broker), never
 * REJECTED; UNKNOWN can only move by asking the broker (RECONCILING → a read-
 * back), never by sending again. A STAGED line is not a working order, and a
 * PREVIEWED ticket is not an order either — only the broker's readback is.
 *
 * The broker statuses arrive already mapped by tastytradeOrderState
 * (readTastytradeOrder → WmOrderState); this file maps that one vocabulary
 * onto the ticket's, so the two cannot drift.
 */

import type { WmOrderState } from "@/lib/broker/tastytradeOrderState";

export type LiveOrderPhase =
  /** Nothing staged, or the kill switch / master arm took the ticket down. */
  | "DISARMED"
  /** Entry / stop / target picked on the chart. Lines read STAGED — not working. */
  | "STAGED"
  /** tastytrade's dry run is in flight. */
  | "PREVIEWING"
  /** tastytrade's dry run accepted exactly this ticket. Still nothing placed. */
  | "PREVIEWED"
  /** Refused before send — locally, by the server firewall, or by the dry run. */
  | "REFUSED"
  /** The confirm sheet is open: every cap, the dated contract, account, environment. */
  | "CONFIRMING"
  /** The one POST is in flight. */
  | "SUBMITTING"
  | "ACKNOWLEDGED"
  | "WORKING"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCEL_PENDING"
  | "CANCELED"
  | "REPLACE_PENDING"
  | "REJECTED"
  | "CLOSED"
  /** The send did not answer clearly. It may be at the broker. Never resend from here. */
  | "UNKNOWN"
  /** Asking the broker for the client order id. */
  | "RECONCILING";

export type LiveOrderEvent =
  | { readonly type: "STAGE" }
  | { readonly type: "DISARM" }
  | { readonly type: "KILL" }
  | { readonly type: "PREVIEW" }
  | { readonly type: "PREVIEW_OK" }
  | { readonly type: "REFUSE"; readonly reasons: readonly string[] }
  | { readonly type: "CONFIRM" }
  | { readonly type: "BACK" }
  | { readonly type: "SEND" }
  /** The order-submit route's `state` word plus, when present, the order it read back. */
  | { readonly type: "SUBMIT_ANSWER"; readonly state: string; readonly order?: { readonly state: WmOrderState } | null }
  /** The request threw or never answered. */
  | { readonly type: "TIMEOUT" }
  | { readonly type: "RECONCILE" }
  /** A broker readback: the order found by id / client order id, or null when not (yet) seen. */
  | { readonly type: "READBACK"; readonly order: { readonly state: WmOrderState } | null }
  | { readonly type: "CANCEL" };

export interface LiveOrderTransition {
  readonly phase: LiveOrderPhase;
  /** False when the event is not allowed from this phase; `phase` is then unchanged. */
  readonly accepted: boolean;
  readonly why?: string;
}

const TERMINAL: ReadonlySet<LiveOrderPhase> = new Set(["FILLED", "CANCELED", "REJECTED", "CLOSED"]);
/** At the broker (or possibly at the broker): the ticket may not be restaged over it. */
const IN_FLIGHT: ReadonlySet<LiveOrderPhase> = new Set([
  "SUBMITTING", "ACKNOWLEDGED", "WORKING", "PARTIALLY_FILLED", "CANCEL_PENDING", "REPLACE_PENDING", "UNKNOWN", "RECONCILING",
]);
/** Before anything was sent. */
const PRE_SEND: ReadonlySet<LiveOrderPhase> = new Set(["DISARMED", "STAGED", "PREVIEWING", "PREVIEWED", "REFUSED", "CONFIRMING"]);

export const isTerminalPhase = (p: LiveOrderPhase): boolean => TERMINAL.has(p);
export const isInFlightPhase = (p: LiveOrderPhase): boolean => IN_FLIGHT.has(p);
export const isPreSendPhase = (p: LiveOrderPhase): boolean => PRE_SEND.has(p);
/** The one phase a send may start from. */
export const canSend = (p: LiveOrderPhase): boolean => p === "CONFIRMING";
/** UNKNOWN / RECONCILING block every new send on the ticket until the broker answers. */
export const mustReconcileFirst = (p: LiveOrderPhase): boolean => p === "UNKNOWN" || p === "RECONCILING";

/** tastytrade's state (already in WM words) → the ticket's phase. */
export function phaseOfBrokerState(s: WmOrderState): LiveOrderPhase {
  switch (s) {
    case "SUBMITTING": return "SUBMITTING";
    case "ACKNOWLEDGED": return "ACKNOWLEDGED";
    case "WORKING": return "WORKING";
    case "PARTIALLY FILLED": return "PARTIALLY_FILLED";
    case "FILLED": return "FILLED";
    case "CANCEL_PENDING": return "CANCEL_PENDING";
    case "CANCELED": return "CANCELED";
    case "REPLACE_PENDING": return "REPLACE_PENDING";
    case "REJECTED": return "REJECTED";
    case "CLOSED": return "CLOSED";
    default: return "UNKNOWN";
  }
}

/**
 * The order-submit route's answers → the ticket's phase. Each refusal word is
 * a refusal BEFORE the broker took anything (the route says so in its own
 * contract); only UNKNOWN, or an answer this file does not know, is "may be
 * at the broker".
 */
const NOT_SENT_ANSWERS: ReadonlySet<string> = new Set([
  "REFUSED_LOCAL", "REFUSED_PREFLIGHT", "NOT_AUTHORIZED", "NOT_CONFIGURED", "NO_SUCH_ACCOUNT", "NOT_SENT", "DRY_RUN_FAILED",
  "BAD_REQUEST", "KILL_SWITCH", "LIMITS_UNSET",
]);

function answerPhase(state: string, order: { readonly state: WmOrderState } | null | undefined): LiveOrderPhase {
  if (order) return phaseOfBrokerState(order.state);
  if (NOT_SENT_ANSWERS.has(state)) return "REFUSED";
  // ACKNOWLEDGED / ALREADY_SENT without an order body, UNKNOWN, or a word this
  // file has never seen: the broker may hold it. Reconcile, never assume.
  return "UNKNOWN";
}

const ok = (phase: LiveOrderPhase): LiveOrderTransition => ({ phase, accepted: true });
const no = (phase: LiveOrderPhase, why: string): LiveOrderTransition => ({ phase, accepted: false, why });

export function stepLiveOrder(phase: LiveOrderPhase, e: LiveOrderEvent): LiveOrderTransition {
  switch (e.type) {
    case "STAGE":
      // A new ticket may replace a pre-send or finished one — never one that is at the broker.
      if (IN_FLIGHT.has(phase)) return no(phase, mustReconcileFirst(phase)
        ? "The last send is not reconciled with the broker yet. Nothing new is staged until it is."
        : "An order from this ticket is working at the broker. Cancel it, or stage a new ticket after it ends.");
      return ok("STAGED");
    case "DISARM":
    case "KILL":
      // The switch takes down everything not yet sent. It never erases what the broker holds.
      if (IN_FLIGHT.has(phase)) return no(phase, "Disarming stops new sends; this order is at the broker and is still tracked.");
      return ok("DISARMED");
    case "PREVIEW":
      return phase === "STAGED" || phase === "REFUSED" || phase === "PREVIEWED" ? ok("PREVIEWING") : no(phase, "Only a staged ticket can be previewed.");
    case "PREVIEW_OK":
      return phase === "PREVIEWING" ? ok("PREVIEWED") : no(phase, "No preview was in flight.");
    case "REFUSE":
      return PRE_SEND.has(phase) ? ok("REFUSED") : no(phase, "A refusal arrived after the send; the broker's readback decides.");
    case "CONFIRM":
      return phase === "PREVIEWED" ? ok("CONFIRMING") : no(phase, "Confirmation follows a successful preview of exactly this ticket.");
    case "BACK":
      return phase === "CONFIRMING" ? ok("PREVIEWED") : no(phase, "Nothing to step back from.");
    case "SEND":
      if (mustReconcileFirst(phase)) return no(phase, "Unknown order state: reconcile with the broker before any send. A timeout is not a rejection.");
      return canSend(phase) ? ok("SUBMITTING") : no(phase, "A send needs the confirm sheet open on a previewed ticket.");
    case "SUBMIT_ANSWER":
      return phase === "SUBMITTING" ? ok(answerPhase(e.state, e.order)) : no(phase, "No send was in flight.");
    case "TIMEOUT":
      // The single most important rule: a timeout is not a rejection.
      return phase === "SUBMITTING" || phase === "RECONCILING" ? ok("UNKNOWN") : no(phase, "No request was in flight.");
    case "RECONCILE":
      return phase === "UNKNOWN" ? ok("RECONCILING") : no(phase, "Only an unknown order is reconciled.");
    case "READBACK":
      if (phase === "RECONCILING" || phase === "UNKNOWN") return ok(e.order ? phaseOfBrokerState(e.order.state) : "UNKNOWN");
      if (IN_FLIGHT.has(phase)) {
        // An order the broker held that now reads back as nothing is not "gone" — it is unknown.
        return ok(e.order ? phaseOfBrokerState(e.order.state) : "UNKNOWN");
      }
      return no(phase, "Nothing at the broker to read back.");
    case "CANCEL":
      return phase === "ACKNOWLEDGED" || phase === "WORKING" || phase === "PARTIALLY_FILLED" || phase === "REPLACE_PENDING"
        ? ok("CANCEL_PENDING")
        : no(phase, mustReconcileFirst(phase) ? "Reconcile first: cancel needs the broker's order id." : "No working order to cancel.");
  }
}

/** Words for each phase, as the ticket prints them. */
export const PHASE_WORDS: Readonly<Record<LiveOrderPhase, string>> = {
  DISARMED: "DISARMED",
  STAGED: "STAGED · not an order",
  PREVIEWING: "PREVIEWING · dry run at tastytrade",
  PREVIEWED: "PREVIEWED · nothing placed",
  REFUSED: "REFUSED · nothing sent",
  CONFIRMING: "CONFIRM · read every line",
  SUBMITTING: "SENDING",
  ACKNOWLEDGED: "ACKNOWLEDGED by tastytrade",
  WORKING: "WORKING at tastytrade",
  PARTIALLY_FILLED: "PARTIALLY FILLED",
  FILLED: "FILLED",
  CANCEL_PENDING: "CANCEL REQUESTED · not yet confirmed",
  CANCELED: "CANCELED",
  REPLACE_PENDING: "REPLACE REQUESTED",
  REJECTED: "REJECTED by tastytrade",
  CLOSED: "CLOSED",
  UNKNOWN: "UNKNOWN · may be at the broker — do not resend",
  RECONCILING: "RECONCILING with tastytrade",
};

/**
 * What this build can and cannot do after the send — stated, never implied
 * (P0.3 "cancel/replace limitations stated").
 */
export const CANCEL_REPLACE_LIMITS =
  "MODIFY is not an atomic replace here: it is cancel, wait for tastytrade to read back CANCELED, then a new previewed and confirmed order. " +
  "A cancel is only a request until tastytrade reads it back — a fill can race it. " +
  "FLATTEN loads a closing market order for the held quantity into this ticket; it still needs preview and your confirmation.";
