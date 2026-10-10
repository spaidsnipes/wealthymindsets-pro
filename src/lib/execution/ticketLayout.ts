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

/**
 * ACT IS THE OPEN STATE AT EVERY SIZE (Founder P0 2026-10-09, "trading feels restricted and minimized";
 * Sheriff measured 1,462 px of content in a 400 px desk panel). Tablet and desktop no longer open in a
 * long flowing "FULL" stack: they open in ACT — the entry path first (BUY / SELL, quantity, order type,
 * price, stop, target, risk / reward, then the live-order block with its account, preview and send row)
 * — with everything else behind the same one "Details" fold the phone uses. The position / MODIFY /
 * FLATTEN block joins the entry path only while a position is held or an order is working. The phone
 * keeps PEEK and the BUILD / REVIEW steps; a wide ticket has room for the whole path and takes no steps.
 */
export type TicketStage = "PEEK" | "ACT";

/** Which stage the ticket is in. An order in flight is always ACT: its state is never folded away. */
export function ticketStage(x: { readonly compact: boolean; readonly sidePicked: boolean; readonly folded: boolean; readonly preSend: boolean }): TicketStage {
  if (!x.compact) return "ACT";
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

/**
 * HALF (Founder P0 2026-10-09): on a phone the ACT ticket covers the camera, so the staged entry / stop /
 * target lines cannot be seen while they are adjusted. HALF is an OPTION the trader chooses — the same
 * ACT ticket capped at half the screen and scrolling inside, so the upper half of the chart stays in view.
 * The default is unchanged (the full ACT sheet). Nothing is unmounted; it is refused while an order is in
 * flight, like the fold. Whether ACT should default to ≤ 55 % is still a Founder question.
 */
export const COMPACT_HALF_MAX_HEIGHT = "50svh";
export interface HalfControl { readonly shown: boolean; readonly enabled: boolean; readonly label: string; readonly ariaLabel: string }
export function halfControl(x: { readonly compact: boolean; readonly stage: TicketStage; readonly half: boolean; readonly preSend: boolean }): HalfControl {
  if (!x.compact || x.stage !== "ACT") return { shown: false, enabled: false, label: "", ariaLabel: "" };
  if (!x.preSend) return { shown: true, enabled: false, label: "½", ariaLabel: "An order is in flight — the ticket stays at full height until tastytrade answers" };
  return x.half
    ? { shown: true, enabled: true, label: "FULL ▴", ariaLabel: "Full-height ticket — every field without scrolling" }
    : { shown: true, enabled: true, label: "HALF ▾", ariaLabel: "Half-height ticket — keep the chart and its order lines in view; the ticket scrolls inside" };
}
/** The grip: a vertical drag of at least this many px snaps the sheet (down → HALF, up → FULL). */
export const HALF_DRAG_SNAP_PX = 40;
/** What a finished drag on the grip asks for; null = not far enough, or the control is refused. PURE. */
export function halfFromDrag(dyPx: number, ctl: HalfControl): boolean | null {
  if (!ctl.shown || !ctl.enabled || !Number.isFinite(dyPx)) return null;
  if (dyPx >= HALF_DRAG_SNAP_PX) return true;
  if (dyPx <= -HALF_DRAG_SNAP_PX) return false;
  return null;
}

/** Is the half height in force? Never while an order is in flight. */
export function halfInForce(x: { readonly compact: boolean; readonly stage: TicketStage; readonly half: boolean; readonly preSend: boolean }): boolean {
  return x.compact && x.stage === "ACT" && x.half && x.preSend;
}

export type TicketStep = "BUILD" | "REVIEW";

/** Which ACT step shows. An order in flight is always REVIEW — the order's state stays in view. */
export function ticketStep(x: { readonly stage: TicketStage; readonly reviewing: boolean; readonly preSend: boolean; readonly compact?: boolean }): TicketStep | null {
  // A wide ticket shows the whole entry path at once — it has no BUILD / REVIEW steps.
  if (x.stage !== "ACT" || x.compact === false) return null;
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

/**
 * Tablet / desktop ACT: the entry path. When FLAT with nothing working, nothing sits above BUY / SELL but
 * the quote (symbol and price are in the header). RISK_LINE is the one-line risk / reward in money; the
 * long economics table, the protection note, the plan card and protect-the-position fold into Details.
 */
export const WIDE_ACTION_SECTIONS: readonly TicketSection[] = ["QUOTE", "SIDE", "CLOSING", "ACTION_LINE", "PROPOSAL", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"];
export const WIDE_DETAILS_SECTIONS: readonly TicketSection[] = ["BOOK", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"];
/**
 * The wide ticket's SEND part — what stands beside the inputs on a desk: the live-order block, and above it the
 * position / working-orders / MODIFY / FLATTEN block while a position is held or an order is working (measured
 * on serving 52824b6 at 1440 × 900: with the book above the inputs the path ran 1,173–1,264 px in an 810 px panel).
 */
export function wideSendSections(bookActive: boolean): readonly TicketSection[] {
  return bookActive ? ["BOOK", "LIVE_ORDER"] : ["LIVE_ORDER"];
}
/** Holding or working: the book block leaves Details and joins the path, directly above the live-order block. */
function wideLayout(bookActive: boolean): { readonly action: readonly TicketSection[]; readonly details: readonly TicketSection[] } {
  if (!bookActive) return { action: WIDE_ACTION_SECTIONS, details: WIDE_DETAILS_SECTIONS };
  return { action: [...WIDE_ACTION_SECTIONS.filter(s => s !== "LIVE_ORDER"), "BOOK", "LIVE_ORDER"], details: WIDE_DETAILS_SECTIONS.filter(s => s !== "BOOK") };
};
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

export function ticketSections(compact: boolean, bookActive = false): { readonly action: readonly TicketSection[]; readonly details: readonly TicketSection[] } {
  return compact ? { action: COMPACT_ACTION, details: COMPACT_DETAILS } : wideLayout(bookActive);
}

/** Is a position held or an order working? (Broker readback only — never the draft.) */
export function bookIsActive(book: TicketBook): boolean {
  return book.position.state !== "FLAT" || book.working.length > 0;
}

/** The wide ticket's height: the whole entry path without an inner scroll on a 900 px desk; it still scrolls if the screen is shorter. */
export const WIDE_TICKET_MAX_HEIGHT = "calc(100vh - 88px)";

/** "Details · FLAT · 0 working" — the disclosure states the book before it is opened. */
export function detailsSummary(book: TicketBook, plan?: { readonly inside: boolean }): string {
  const n = book.working.length;
  const refused = [book.modify.refusal, book.flatten.refusal].filter(Boolean).length;
  // Lifecycle check 2026-10-10: the management plan card (with Morning Prep's day rules) folds into Details, so the
  // summary says it is there — the plan is never hidden without a word.
  return `Details · ${book.position.state} · ${n} working${refused ? ` · ${refused} refused` : ""}${plan?.inside ? " · management plan + today's rules" : ""}`;
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
