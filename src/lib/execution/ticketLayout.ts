/**
 * COMPACT PHONE TICKET — one ticket, two layouts (coordinator design call, 2026-10-08). PURE.
 *
 * At ≤ 430 px the open trade ticket covered ~86 % of the chart and the send path sat ~700 px down
 * inside it. The rule now:
 *   · ONE ticket — the same component, the same state, the same gates. Only the ORDER of its
 *     sections changes; nothing is rendered twice and nothing is dropped.
 *   · The action path — quote, side, quantity, price, stop / target, the risk line, preview / confirm —
 *     comes first and fits without scrolling inside the ticket (max height COMPACT_MAX_HEIGHT, so the
 *     ticket covers no more than ~55 % of the chart).
 *   · Everything else (the book: position state / working orders / modify / flatten; entry order
 *     type; economics; the protection note and dry run; the plan card; protect-the-position) folds
 *     behind ONE "Details" disclosure whose summary states the book ("Details · FLAT · 0 working").
 *   · KILL stays in the header, always visible.
 *   · A reason a control is disabled is never folded away: the live-order block carries its own
 *     refusals beside Preview, and the risk line says "stop is on the wrong side" beside the stop.
 * Tablet and desktop keep the one flowing order they had.
 */

import type { TicketBook } from "./ticketBook";

export const COMPACT_TICKET_MAX_WIDTH = 430;
export const COMPACT_TICKET_QUERY = `(max-width: ${COMPACT_TICKET_MAX_WIDTH}px)`;
/** Ticket height on a phone: with the ticket anchored above the bottom bar this covers ≤ ~55 % of the chart pane. */
export const COMPACT_MAX_HEIGHT = "52vh";

export type TicketSection =
  | "QUOTE" | "PROPOSAL" | "BOOK" | "SIDE_SIZE" | "ENTRY_TYPE" | "PRICE" | "RISK_INPUTS" | "RISK_LINE" | "ECONOMICS"
  | "PICK_STATUS" | "PROTECTION_DRYRUN" | "PLAN" | "LIVE_ORDER" | "PROTECT";

/** Tablet / desktop: the flowing order the ticket has always had (RISK_LINE is the phone's one-line economics). */
const FULL: readonly TicketSection[] = ["QUOTE", "PROPOSAL", "BOOK", "SIDE_SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"];
const COMPACT_ACTION: readonly TicketSection[] = ["QUOTE", "PROPOSAL", "SIDE_SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"];
const COMPACT_DETAILS: readonly TicketSection[] = ["BOOK", "ENTRY_TYPE", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"];

export function ticketSections(compact: boolean): { readonly action: readonly TicketSection[]; readonly details: readonly TicketSection[] } {
  return compact ? { action: COMPACT_ACTION, details: COMPACT_DETAILS } : { action: FULL, details: [] };
}

/** "Details · FLAT · 0 working" — the disclosure states the book before it is opened. */
export function detailsSummary(book: TicketBook): string {
  const n = book.working.length;
  const refused = [book.modify.refusal, book.flatten.refusal].filter(Boolean).length;
  return `Details · ${book.position.state} · ${n} working${refused ? ` · ${refused} refused` : ""}`;
}

/** The phone's one-line economics, beside the stop and target: the wrong-side refusal is never folded away. */
export function compactRiskLine(x: {
  readonly stopWrongSide: boolean;
  readonly riskUsd: number | null;
  readonly rewardUsd: number | null;
  readonly entryKnown: boolean;
}): { readonly refusal: boolean; readonly text: string } {
  if (x.stopWrongSide) return { refusal: true, text: "The stop is on the wrong side of the entry — an opening order would be refused." };
  const risk = x.riskUsd != null ? `Risk −$${x.riskUsd.toFixed(2)}` : !x.entryKnown ? "Risk: entry fill unknown" : "Risk: set a stop";
  const reward = x.rewardUsd != null ? ` · Reward +$${x.rewardUsd.toFixed(2)}${x.riskUsd ? ` · ${(x.rewardUsd / x.riskUsd).toFixed(2)}R` : ""}` : "";
  return { refusal: false, text: `${risk}${reward}` };
}
