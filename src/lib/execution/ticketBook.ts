/**
 * THE TICKET'S BOOK — §23 rows on the canvas-connected ticket (Garden 19, 2026-10-08). PURE.
 *
 * POSITION STATE · WORKING ORDERS (each with a cancel) · MODIFY · FLATTEN. Every word about the
 * book comes from tastytrade's READBACK (useBrokerChartLines → selectBrokerOrderLines) — never from
 * what this ticket sent or hoped. Fail-closed:
 *   · NEVER_READ: nothing is assumed flat, nothing is loadable;
 *   · STALE: RECONCILING — FLATTEN is refused (the held quantity may have changed), cancel stays open;
 *   · the kill switch refuses every NEW order (FLATTEN, the new order after a cancel) — cancel stays open;
 *   · unset server limits refuse every live send — said at the control;
 *   · MODIFY is NOT WIRED as an atomic replace: it is cancel, read back CANCELED, then a new order.
 */

import { traderClock } from "@/components/time/traderClock";
import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";

import { planFlatten, type BrokerLinesResult } from "./brokerOrderLines";
import { CANCEL_REPLACE_LIMITS, PHASE_WORDS, phaseOfBrokerState } from "./liveOrderLifecycle";
import { bookLine } from "./ticketTruth";

export interface TicketGate {
  readonly killSwitch: boolean;
  /** Server limits saved (server.state === "SET"). Unset = every live send is refused. */
  readonly limitsSet: boolean;
  /** A proof scene's sample book: every cancel / flatten / new order is refused with this reason (railSendGate — one owner). */
  readonly proofRefusal?: string | null;
}

export interface PositionStateRow {
  readonly kind: "POSITION STATE";
  readonly state: "FLAT" | "HOLDING" | "RECONCILING" | "NOT READ";
  readonly words: string;
  readonly protection: "PROTECTED" | "UNPROTECTED" | null;
}

export interface WorkingOrderRow {
  readonly kind: "WORKING ORDER";
  readonly id: string;
  readonly accountIndex: number | null;
  readonly tail: string | null;
  /** The broker's own state, in the lifecycle's words. */
  readonly state: string;
  readonly words: string;
  readonly cancel: { readonly allowed: boolean; readonly reason: string | null };
}

export interface ModifyRow {
  readonly kind: "MODIFY";
  readonly state: "NOT WIRED · cancel, then a new order" | "NOTHING TO MODIFY";
  readonly words: string;
  /** Said at the control: why the NEW order after the cancel would be refused today. */
  readonly refusal: string | null;
}

export interface FlattenRow {
  readonly kind: "FLATTEN";
  readonly state: "LOADABLE" | "REFUSED" | "NOTHING TO FLATTEN" | "NOT READ";
  readonly plan: ReturnType<typeof planFlatten> | null;
  readonly words: string;
  readonly refusal: string | null;
}

export interface TicketBook {
  readonly position: PositionStateRow;
  readonly working: readonly WorkingOrderRow[];
  readonly modify: ModifyRow;
  readonly flatten: FlattenRow;
}

/** Broker-ack words for an order's state — the lifecycle's words, never the ticket's. */
export const brokerStateWords = (o: Pick<TtOrderView, "state">): string => PHASE_WORDS[phaseOfBrokerState(o.state)];

const clock = (ms: number | null | undefined) => (ms != null ? traderClock(ms, { seconds: false }) : null);

export function ticketBook(broker: BrokerLinesResult | null, contract: string | null, gate: TicketGate): TicketBook {
  const readback = broker?.readback ?? null;
  const tails = broker?.tails ?? [];
  const at = clock(broker?.asOfMs);
  const from = tails.length ? ` from ${tails.map(t => `…${t}`).join(", ")}` : "";

  /* ── POSITION STATE — readback only ─────────────────────────────────────── */
  let position: PositionStateRow;
  if (!broker || readback === "NEVER_READ" || !contract) {
    position = { kind: "POSITION STATE", state: "NOT READ", protection: null, words: bookLine({ readback: "NEVER_READ", holding: false, working: 0, asOfMs: null, tails: [] })! };
  } else if (readback === "STALE") {
    const held = broker.position ? `last read ${broker.position.row.direction.toUpperCase()} ${broker.position.row.quantity} @ ${broker.position.row.averageOpenPrice}` : "last read flat";
    position = { kind: "POSITION STATE", state: "RECONCILING", protection: null, words: `RECONCILING · tastytrade has not answered recently (${held}${at ? `, ${at}` : ""}). Nothing here is treated as current.` };
  } else if (broker.position) {
    const p = broker.position;
    const pnl = p.pnlUsd == null ? "P&L —" : `P&L ${p.pnlUsd >= 0 ? "+" : "−"}$${Math.abs(p.pnlUsd).toFixed(2)}`;
    position = { kind: "POSITION STATE", state: "HOLDING", protection: p.protection, words: `${p.row.direction.toUpperCase()} ${p.row.quantity} ${contract} @ ${p.row.averageOpenPrice} · ${p.protection === "PROTECTED" ? "STOP WORKING" : "UNPROTECTED"} · ${pnl} · ${broker.working ?? 0} working${at ? ` · read ${at}${from}` : ""}` };
  } else {
    position = { kind: "POSITION STATE", state: "FLAT", protection: null, words: bookLine({ readback: "FRESH", holding: false, working: broker.working ?? 0, asOfMs: broker.asOfMs ?? null, tails })! };
  }

  /* ── WORKING ORDERS — each with a cancel (exit stays open) ──────────────── */
  const working: WorkingOrderRow[] = (broker?.workingOrders ?? []).map(o => {
    const acct = broker?.orderAccounts?.[o.id] ?? null;
    const reason = gate.proofRefusal ? gate.proofRefusal
      : !o.cancellable ? "tastytrade reports this order cannot be cancelled right now."
      : acct == null ? "The account this order sits in was not read back — cancel it at tastytrade."
      : null;
    return {
      kind: "WORKING ORDER", id: o.id, accountIndex: acct?.index ?? null, tail: acct?.tail ?? null, state: o.state,
      words: `${brokerStateWords(o)} · #${o.id} · ${o.action ?? ""} ${o.filled != null && o.quantity != null && o.filled > 0 ? `${o.filled}/${o.quantity}` : o.quantity ?? ""} ${o.symbol ?? ""}${o.price ? ` @ ${o.price}` : o.stopTrigger ? ` · trigger ${o.stopTrigger}` : ""}${readback === "STALE" ? " · RECONCILING" : ""}`.replace(/\s+/g, " ").trim(),
      cancel: { allowed: reason == null, reason },
    };
  });

  /* ── MODIFY — never an atomic replace here ──────────────────────────────── */
  const newOrderRefusal = gate.proofRefusal ? gate.proofRefusal
    : gate.killSwitch ? "KILL SWITCH ENGAGED — the new order after the cancel is refused. Cancel stays open."
    : !gate.limitsSet ? "Server limits are not set — the new order after the cancel is refused until they are saved in Settings › Execution."
    : null;
  const modify: ModifyRow = {
    kind: "MODIFY",
    state: working.length ? "NOT WIRED · cancel, then a new order" : "NOTHING TO MODIFY",
    words: CANCEL_REPLACE_LIMITS,
    refusal: working.length ? newOrderRefusal : null,
  };

  /* ── FLATTEN — a closing MARKET order for the held quantity, loaded, never sent ─ */
  let flatten: FlattenRow;
  if (!broker || readback === "NEVER_READ") {
    flatten = { kind: "FLATTEN", state: "NOT READ", plan: null, refusal: null, words: "FLATTEN needs the position read back from tastytrade first." };
  } else if (readback === "STALE") {
    flatten = { kind: "FLATTEN", state: "REFUSED", plan: null, refusal: "Readback is stale — the held quantity may have changed. Reconcile first.", words: "FLATTEN refused." };
  } else if (!broker.position) {
    flatten = { kind: "FLATTEN", state: "NOTHING TO FLATTEN", plan: null, refusal: null, words: `No position on ${contract ?? "this contract"} to flatten.` };
  } else {
    const plan = planFlatten(broker.position.row);
    const refusal = gate.proofRefusal ? gate.proofRefusal
      : gate.killSwitch ? "KILL SWITCH ENGAGED — a closing order is still a new order here; release it in Settings › Execution to flatten."
      : !gate.limitsSet ? "Server limits are not set — every live send is refused, including this closing order."
      : null;
    flatten = { kind: "FLATTEN", state: refusal ? "REFUSED" : "LOADABLE", plan, refusal, words: `${plan.action.toUpperCase()} ${plan.qty} ${plan.symbol} · MARKET · loads into this ticket; still needs preview and your confirmation.` };
  }

  return { position, working, modify, flatten };
}
