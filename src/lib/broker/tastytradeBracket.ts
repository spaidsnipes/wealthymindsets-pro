/**
 * ATTACHED PROTECTION — ONE WM BRACKET INTENT → TASTYTRADE'S OTOCO COMPLEX ORDER JSON
 * (Founder P0, 2026-10-10). PURE. NOTHING HERE SENDS.
 *
 * Shape (tastytrade complex orders, `type: "OTOCO"`): a `trigger-order` (the entry) and two
 * `orders` that only go live once the trigger fills, linked One-Cancels-Other — the TARGET (a closing
 * Limit, GTC) and the STOP (a closing Stop, GTC). Every one of the three is built by the SAME
 * single-order mapper (`toTastytradeOrder`), so the symbol formats, whole-quantity rule, Decision_ID
 * requirement and idempotency key rules cannot drift between a single order and a bracket.
 *
 * The SERVER GATE sees a bracket as what it is at risk: its ENTRY with the bracket's stop as the
 * verified protective stop (`bracketPreflightOrder` → the existing `preflightLiveOrder`), so the
 * kill switch, server arm, environment, account, caps, quote freshness and loss-at-stop ceiling all
 * apply unchanged. At the broker it is THREE orders, so the order-rate limiter charges
 * BRACKET_RATE_COST.
 *
 * STATUS: built and tested only. No route, client or tool in WM posts this payload — the broker
 * capability ledger keeps BRACKET at NOT_BUILT until a dry run on tastytrade's own complex-order
 * preview has been proved on the owner's account (that step is the Founder's to authorise).
 */

import { toTastytradeOrder, type TtOrder, type TtOrderIntent } from "./tastytradeOrder";
import type { PreflightOrder } from "@/lib/execution/liveOrderPreflight";

/** One bracket = the entry + its target + its stop at the broker. */
export const BRACKET_RATE_COST = 3;

export interface TtBracketIntent {
  /** The opening order: a priced entry (Limit or Stop Limit), so both exits' sides can be checked. */
  readonly entry: TtOrderIntent;
  /** Attached protective stop (a closing Stop, GTC). */
  readonly stopPx: number;
  /** Attached target (a closing Limit, GTC). */
  readonly targetPx: number;
}

export interface TtOtocoOrder {
  readonly type: "OTOCO";
  readonly "trigger-order": TtOrder;
  /** [target, stop] — One-Cancels-Other once the trigger fills. */
  readonly orders: readonly [TtOrder, TtOrder];
}

export type TtBracketResult = { readonly ok: true; readonly order: TtOtocoOrder } | { readonly ok: false; readonly reason: string };

const pos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Each child carries its own idempotency key, derived from the bracket's — one key, three reconcilable orders. */
export function bracketChildKeys(clientOrderId: string): { readonly entry: string; readonly target: string; readonly stop: string } | null {
  if (!/^[A-Za-z0-9_-]{8,61}$/.test(clientOrderId)) return null;
  return { entry: `${clientOrderId}-e`, target: `${clientOrderId}-t`, stop: `${clientOrderId}-s` };
}

export function toTastytradeBracket(b: TtBracketIntent): TtBracketResult {
  const e = b.entry;
  if (e.action !== "Buy to Open" && e.action !== "Sell to Open") return { ok: false, reason: "A bracket opens a position; a closing order carries no attached protection." };
  if (e.type !== "Limit" && e.type !== "Stop Limit") return { ok: false, reason: "A bracket needs a priced entry (Limit or Stop Limit) so the stop and target sides can be checked." };
  if (e.instrumentType === "Cryptocurrency") return { ok: false, reason: "Stop orders are not offered for crypto here, so a crypto bracket cannot carry its stop." };
  if (!pos(e.limitPx)) return { ok: false, reason: "A bracket entry needs a limit price above zero." };
  if (!pos(b.stopPx) || !pos(b.targetPx)) return { ok: false, reason: "A bracket needs both a stop and a target above zero." };
  const buying = e.action === "Buy to Open";
  if (buying ? !(b.stopPx < e.limitPx && e.limitPx < b.targetPx) : !(b.targetPx < e.limitPx && e.limitPx < b.stopPx)) {
    return { ok: false, reason: buying ? "A long bracket needs stop < entry < target." : "A short bracket needs target < entry < stop." };
  }
  const keys = bracketChildKeys(e.clientOrderId);
  if (!keys) return { ok: false, reason: "The client order id is missing or malformed; it is what makes all three orders reconcilable." };
  const exit = buying ? "Sell to Close" as const : "Buy to Close" as const;
  const trigger = toTastytradeOrder({ ...e, clientOrderId: keys.entry });
  if (!trigger.ok) return trigger;
  const target = toTastytradeOrder({ instrumentType: e.instrumentType, symbol: e.symbol, action: exit, qty: e.qty, type: "Limit", limitPx: b.targetPx, tif: "GTC", decisionId: e.decisionId, clientOrderId: keys.target });
  if (!target.ok) return target;
  const stop = toTastytradeOrder({ instrumentType: e.instrumentType, symbol: e.symbol, action: exit, qty: e.qty, type: "Stop", stopPx: b.stopPx, tif: "GTC", decisionId: e.decisionId, clientOrderId: keys.stop });
  if (!stop.ok) return stop;
  return { ok: true, order: { type: "OTOCO", "trigger-order": trigger.order, orders: [target.order, stop.order] } };
}

/**
 * What the SERVER GATE judges: the bracket's entry, with the attached stop as its protective stop.
 * The rest of the PreflightOrder (environment, account, quote, multiplier) is the same as a single order's.
 */
export function bracketPreflightOrder(b: TtBracketIntent, rest: Pick<PreflightOrder, "environment" | "accountIndex" | "quote"> & { readonly multiplier?: number | null }): PreflightOrder {
  const e = b.entry;
  return {
    instrumentType: e.instrumentType, symbol: e.symbol, action: e.action, qty: e.qty, type: e.type,
    limitPx: e.limitPx ?? null, stopPx: e.stopPx ?? null, protectiveStopPx: b.stopPx,
    environment: rest.environment, accountIndex: rest.accountIndex, quote: rest.quote,
    ...(rest.multiplier !== undefined ? { multiplier: rest.multiplier } : {}),
  };
}
