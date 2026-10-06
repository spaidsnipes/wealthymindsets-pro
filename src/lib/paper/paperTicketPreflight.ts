/**
 * PAPER TICKET PREFLIGHT — Garden 18 §4 (2026-10-06). PURE.
 *
 * THE FINDING: "Market state displayed ACTIVE DEGRADED with an old
 * observation; visible simulation balance and ticket controls are not proof
 * that simulated orders work."
 *
 * Two defects behind it:
 *
 *   1. QUOTE AGE WAS JUDGED ONLY WHEN THE QUOTE ARRIVED. `selectPaperQuoteReadiness`
 *      measures age at fetch time and the page polls every 20 s. Between polls
 *      (or forever, when a request hangs or the tab is throttled) the verdict
 *      stays ACTIVE DEGRADED / actionable while the observation keeps aging —
 *      so a quote observed 14m50s ago could still fill a simulated order at
 *      15m10s. The age is now re-measured against the clock at the moment of
 *      the press and the fill, and a refusal NAMES the age and the threshold.
 *
 *   2. THE SEND BUTTON ENABLED ON THE QUOTE ALONE. Missing price levels,
 *      fractional contracts, an unsupported type and an unfundable buy were
 *      refused only after the press (or, for funding, only at fill time as a
 *      rejected order). Every check that can be made before the press is now
 *      made before the button enables, and each blocker is said in words.
 *
 * Protection is DISCLOSED, never implied: this ticket sends ONE order. It does
 * not attach a bracket, and there is no OCO pairing — a resting stop and a
 * resting target are two independent orders.
 */

import { PAPER_DELAYED_QUOTE_MAX_AGE_MS, type PaperQuoteReadiness } from "../marketData/viewModels/selectPaperQuoteReadiness";
import { selectOrderRejection, type OrderSide, type OrderType } from "../paperTrade";
import { validateTicketLevels } from "../orderPurpose";

export const PAPER_SUPPORTED_ORDER_TYPES: readonly OrderType[] = ["market", "limit", "stop", "stop-limit"];

/** Seconds or minutes, said plainly. */
function ageWords(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

export type PaperQuoteAgeVerdict =
  | { readonly fresh: true; readonly ageMs: number; readonly thresholdMs: number }
  | { readonly fresh: false; readonly ageMs: number | null; readonly thresholdMs: number; readonly reason: string };

/**
 * Is the quote behind a simulated fill young enough, measured NOW?
 * The threshold is /paper's own freshness budget (15 minutes).
 */
export function paperQuoteAgeVerdict(
  readiness: PaperQuoteReadiness | null | undefined,
  nowMs: number,
  thresholdMs: number = PAPER_DELAYED_QUOTE_MAX_AGE_MS,
): PaperQuoteAgeVerdict {
  const limit = ageWords(thresholdMs);
  if (!readiness || readiness.observedAt == null || !Number.isFinite(readiness.observedAt) || !Number.isFinite(nowMs)) {
    return { fresh: false, ageMs: null, thresholdMs, reason: `Quote age unknown — a simulated fill needs a quote observed within ${limit}.` };
  }
  const ageMs = Math.max(0, nowMs - readiness.observedAt);
  if (!readiness.actionable) {
    return { fresh: false, ageMs, thresholdMs, reason: `Quote not actionable (${readiness.status}) — observed ${ageWords(ageMs)} ago; the simulation limit is ${limit}.` };
  }
  if (ageMs > thresholdMs) {
    return { fresh: false, ageMs, thresholdMs, reason: `Quote is ${ageWords(ageMs)} old — over the ${limit} simulation limit, so no simulated fill until a newer quote arrives.` };
  }
  return { fresh: true, ageMs, thresholdMs };
}

export interface PaperTicketPreflightInput {
  readonly readiness: PaperQuoteReadiness | null | undefined;
  readonly nowMs: number;
  readonly type: OrderType;
  readonly side: OrderSide;
  readonly qty: number;
  readonly wholeContracts: boolean;
  readonly limitRaw: string;
  readonly stopRaw: string;
  /** Point value / contract multiplier for the symbol. */
  readonly multiplier: number;
  /** Paper cash available, or null when the book is unreadable. */
  readonly cash: number | null;
}

export interface PaperTicketPreflight {
  readonly ready: boolean;
  /** Each reason the send button is disabled, in words. Empty when ready. */
  readonly blockers: readonly string[];
  /** Always shown: what this ticket does NOT do for protection. */
  readonly protectionNote: string;
}

export const PAPER_TICKET_PROTECTION_NOTE =
  "This sends one simulated order. No bracket is attached and there is no OCO pairing — a stop or target is a separate order you place yourself.";

export function selectPaperTicketPreflight(input: PaperTicketPreflightInput): PaperTicketPreflight {
  const blockers: string[] = [];
  const age = paperQuoteAgeVerdict(input.readiness, input.nowMs);
  if (!age.fresh) blockers.push(age.reason);

  if (!PAPER_SUPPORTED_ORDER_TYPES.includes(input.type)) {
    blockers.push(`Order type "${input.type}" is not supported by the paper simulator.`);
  }
  if (!(Number.isFinite(input.qty) && input.qty > 0)) blockers.push("Quantity must be greater than zero.");
  else if (input.wholeContracts && !Number.isInteger(input.qty)) blockers.push("Futures trade in whole contracts.");

  const ref = input.readiness?.actionable ? input.readiness.price ?? undefined : undefined;
  const levels = validateTicketLevels({ type: input.type, side: input.side, limitRaw: input.limitRaw, stopRaw: input.stopRaw, referencePrice: ref });
  if (!levels.ok) for (const i of levels.issues) blockers.push(i.reason);

  if (input.side === "buy" && typeof ref === "number" && Number.isFinite(input.qty) && input.qty > 0) {
    if (input.cash == null) blockers.push("Paper cash is unreadable, so this buy cannot be funded.");
    else {
      // Funding at the CURRENT quote — the fill-time gate still re-checks at
      // the observed fill price, which is the authoritative one.
      const reject = selectOrderRejection({ side: "buy", qty: input.qty, price: ref, cash: input.cash, multiplier: input.multiplier });
      if (reject) blockers.push(reject);
    }
  }

  return { ready: blockers.length === 0, blockers, protectionNote: PAPER_TICKET_PROTECTION_NOTE };
}
