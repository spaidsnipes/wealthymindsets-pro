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
/**
 * PEEK / ACT (approved 2026-10-09 after the serving read on 0971594: one static height measured
 * 79 % coverage at 390 — the chart is 532 px tall there and the action path alone needs ~500 px).
 *   PEEK — header (KILL), quote, side + quantity, the Details summary. ~290 px, ≤ ~50 % of the chart.
 *          Shown while no side is picked, or when the trader folds the ticket to see the chart.
 *   ACT  — once a side is picked the ticket grows so price → stop / target → risk → Preview show with
 *          no inner scroll. It MAY cover more than 55 % of the chart while an order is being built;
 *          holding ≤ 55 % in ACT needs the live-order block shortened — a Founder decision.
 * The fold is CSS only: nothing is unmounted, so a live order's state cannot be lost, and the fold
 * is refused while an order is in flight.
 */
export const COMPACT_PEEK_MAX_HEIGHT = "40svh";
/**
 * BUILD and REVIEW each fit inside this; globals.css carries the same caps beside its 58svh phone rule.
 * Measured on serving b290eef at 390 × 844 (mouse pointer): BUILD 592 px, no inner scroll; REVIEW hit the
 * 72svh cap (608 px) with 26 px of inner scroll. So REVIEW now hides Details and the footer, and the cap
 * is 84svh — room for the 44 px touch floor a real phone adds to every control.
 */
export const COMPACT_ACT_MAX_HEIGHT = "84svh";
/** @deprecated the single phone height that measured 79 % coverage; kept so the reason is on record. */
export const COMPACT_MAX_HEIGHT = "52vh";

export type TicketStage = "FULL" | "PEEK" | "ACT";

/** Which stage the ticket is in. An order in flight is always ACT: its state is never folded away. */
export function ticketStage(x: { readonly compact: boolean; readonly sidePicked: boolean; readonly folded: boolean; readonly preSend: boolean }): TicketStage {
  if (!x.compact) return "FULL";
  if (!x.preSend) return "ACT";
  return !x.sidePicked || x.folded ? "PEEK" : "ACT";
}

export interface FoldControl {
  /** Whether the header shows the fold control at all (phone, and a side is picked). */
  readonly shown: boolean;
  readonly enabled: boolean;
  /** The control's own words — when it is refused, the reason IS the label. */
  readonly label: string;
  readonly ariaLabel: string;
}

export function foldControl(x: { readonly compact: boolean; readonly sidePicked: boolean; readonly folded: boolean; readonly preSend: boolean }): FoldControl {
  if (!x.compact || !x.sidePicked) return { shown: false, enabled: false, label: "", ariaLabel: "" };
  if (!x.preSend) return { shown: true, enabled: false, label: "IN FLIGHT · stays open", ariaLabel: "An order is in flight — the ticket stays open until tastytrade answers" };
  return x.folded
    ? { shown: true, enabled: true, label: "TICKET ▴", ariaLabel: "Show the ticket — price, stop, target and preview" }
    : { shown: true, enabled: true, label: "CHART ▾", ariaLabel: "Fold the ticket to see the chart — nothing is cleared" };
}

export type TicketStep = "BUILD" | "REVIEW";

/** Which ACT step shows. An order in flight is always REVIEW — the order's state stays in view. */
export function ticketStep(x: { readonly stage: TicketStage; readonly reviewing: boolean; readonly preSend: boolean }): TicketStep | null {
  if (x.stage !== "ACT") return null;
  if (!x.preSend) return "REVIEW";
  return x.reviewing ? "REVIEW" : "BUILD";
}

/** May "Review & preview ▸" be pressed? When it may not, the reason is said beside the button. */
export function reviewGate(x: { readonly priceOk: boolean; readonly entryType: string; readonly stopWrongSide: boolean }): { readonly allowed: boolean; readonly reason: string | null } {
  if (x.stopWrongSide) return { allowed: false, reason: "The stop is on the wrong side of the entry — fix it before the preview." };
  if (!x.priceOk) {
    return { allowed: false, reason: x.entryType === "Stop Limit" ? "Set a stop trigger and a limit price first." : x.entryType === "Stop" ? "Set a stop trigger first." : "Set a limit price first." };
  }
  return { allowed: true, reason: null };
}

export type TicketSection =
  | "QUOTE" | "PROPOSAL" | "BOOK" | "SIDE" | "CLOSING" | "ACTION_LINE" | "SIZE" | "ENTRY_TYPE" | "PRICE" | "RISK_INPUTS" | "RISK_LINE" | "ECONOMICS"
  | "PICK_STATUS" | "PROTECTION_DRYRUN" | "PLAN" | "LIVE_ORDER" | "PROTECT";

/** Tablet / desktop: the flowing order the ticket has always had (RISK_LINE is the phone's one-line economics). */
const FULL: readonly TicketSection[] = ["QUOTE", "PROPOSAL", "BOOK", "SIDE", "CLOSING", "ACTION_LINE", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"];
/**
 * The phone's action path, in three groups (approved 2026-10-09 after the serving read on 9f4d784:
 * ACT measured 420 px of inner scroll — the path to Preview is ~770 px on a mouse pointer and taller
 * on touch, where every control takes the 44 px floor, on an 844 px screen):
 *   PEEK   — quote, a waiting proposal, the side buttons and the order line;
 *   BUILD  — closing checkbox, quantity, price, stop / target, the risk line, then "Review & preview ▸";
 *   REVIEW — the live-order block alone, with "◂ Edit". Forced while an order is in flight.
 * Preview is one tap from BUILD with no scrolling in either step.
 */
export const COMPACT_PEEK_SECTIONS: readonly TicketSection[] = ["QUOTE", "PROPOSAL", "SIDE", "ACTION_LINE"];
export const COMPACT_BUILD_SECTIONS: readonly TicketSection[] = ["CLOSING", "SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS"];
export const COMPACT_REVIEW_SECTIONS: readonly TicketSection[] = ["LIVE_ORDER"];
const COMPACT_ACTION: readonly TicketSection[] = [...COMPACT_PEEK_SECTIONS, ...COMPACT_BUILD_SECTIONS, ...COMPACT_REVIEW_SECTIONS];
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
