/**
 * THE LIVE-ORDER FIREWALL'S RISK GATE — Garden 19 §23 / build-order P0.3. PURE.
 *
 * One function decides, before anything reaches tastytrade, whether a live
 * order is inside the trader's SERVER-HELD limits. The order-submit route runs
 * it after the owner gate and before the broker's dry run; the chart ticket
 * runs the very same function to show the refusal before the press. Every
 * refusal is collected (not just the first) so the ticket can list them all.
 *
 * Refuses before send (P0.3):
 *   · kill switch engaged; server arm off (default DISARMED); limits never set;
 *   · a cap that applies to this order is unset — "no ceiling" is never a way to send;
 *   · quantity / notional / loss-at-stop above its cap;
 *   · environment not stated, or not the server's (production vs cert);
 *   · account not named explicitly;
 *   · unsupported product (naked short options, crypto opening without a stop rail,
 *     a contract with no point value on file);
 *   · a risk-increasing order on a quote that is missing or stale;
 *   · an opening order with no verified bound on loss (a broker-native stop plan
 *     on the right side, or a long option's premium) — never a bracket or OCO
 *     implied: protection is labelled BROKER-NATIVE / SERVER-MANAGED / UNAVAILABLE;
 *   · an earlier send on this ticket still UNKNOWN / RECONCILING.
 *
 * Tightening only: nothing here can make an order easier to send than the
 * route already made it.
 */

import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import type { TtAction, TtInstrumentType } from "@/lib/broker/tastytradeOrder";

/* ── Server-held limits ───────────────────────────────────────────────────── */

export interface ServerOrderLimits {
  /** Server-side master arm. Default false: a fresh deployment is DISARMED. */
  readonly armed: boolean;
  /** Founder kill switch. Engaged = every new order refused (cancel stays open). */
  readonly killSwitch: boolean;
  readonly maxContractsPerOrder: number | null;
  readonly maxSharesPerOrder: number | null;
  /** Per order, in USD: entry reference × point value × quantity (premium × multiplier for options). */
  readonly maxNotionalUsdPerOrder: number | null;
  /** Per order, in USD: |entry − protective stop| × point value × quantity (premium for a long option). */
  readonly maxLossUsdPerOrder: number | null;
  /** How old the touch may be for a risk-increasing order. Bounded to [500 ms, 15 s]. */
  readonly maxQuoteAgeMs: number;
  readonly updatedAtMs: number | null;
}

export const DEFAULT_QUOTE_AGE_MS = 5_000;
export const MIN_QUOTE_AGE_MS = 500;
export const MAX_QUOTE_AGE_MS = 15_000;

export const DEFAULT_SERVER_LIMITS: ServerOrderLimits = {
  armed: false,
  killSwitch: false,
  maxContractsPerOrder: null,
  maxSharesPerOrder: null,
  maxNotionalUsdPerOrder: null,
  maxLossUsdPerOrder: null,
  maxQuoteAgeMs: DEFAULT_QUOTE_AGE_MS,
  updatedAtMs: null,
};

const ceiling = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Parse stored limits fail-closed: anything unreadable is DISARMED with no caps. */
export function readServerOrderLimits(raw: unknown): ServerOrderLimits {
  let o: Record<string, unknown> = {};
  if (typeof raw === "string") { try { o = (JSON.parse(raw) ?? {}) as Record<string, unknown>; } catch { o = {}; } }
  else if (raw && typeof raw === "object") o = raw as Record<string, unknown>;
  const age = Number(o.maxQuoteAgeMs);
  return {
    armed: o.armed === true,
    // Unreadable kill switch reads as NOT engaged only because armed is also false then.
    killSwitch: o.killSwitch === true,
    maxContractsPerOrder: ceiling(o.maxContractsPerOrder),
    maxSharesPerOrder: ceiling(o.maxSharesPerOrder),
    maxNotionalUsdPerOrder: ceiling(o.maxNotionalUsdPerOrder),
    maxLossUsdPerOrder: ceiling(o.maxLossUsdPerOrder),
    maxQuoteAgeMs: Number.isFinite(age) ? Math.min(MAX_QUOTE_AGE_MS, Math.max(MIN_QUOTE_AGE_MS, age)) : DEFAULT_QUOTE_AGE_MS,
    updatedAtMs: Number.isFinite(Number(o.updatedAtMs)) && Number(o.updatedAtMs) > 0 ? Number(o.updatedAtMs) : null,
  };
}

/* ── Protection ───────────────────────────────────────────────────────────── */

/**
 * BROKER-NATIVE  a resting Stop at tastytrade (sent separately after the fill; NOT
 *                linked to a target — no bracket / OCO is built).
 * SERVER-MANAGED a stop WM's server would watch and send — NOT BUILT; refused.
 * UNAVAILABLE    no stop rail for this product / order.
 */
export type ProtectionMode = "BROKER-NATIVE" | "SERVER-MANAGED" | "UNAVAILABLE";

export const PROTECTION_WORDS: Readonly<Record<ProtectionMode, string>> = {
  "BROKER-NATIVE": "BROKER-NATIVE · a resting Stop at tastytrade, sent after the fill · NOT linked to the target (no OCO / bracket)",
  "SERVER-MANAGED": "SERVER-MANAGED · not built — refused",
  UNAVAILABLE: "UNAVAILABLE · no stop rail for this order",
};

/** Which protection this product can carry in this build. */
export function protectionFor(instrumentType: TtInstrumentType): ProtectionMode {
  return instrumentType === "Future" || instrumentType === "Equity" ? "BROKER-NATIVE" : "UNAVAILABLE";
}

/* ── Dated contracts ──────────────────────────────────────────────────────── */

const MONTHS: Readonly<Record<string, string>> = { F: "JAN", G: "FEB", H: "MAR", J: "APR", K: "MAY", M: "JUN", N: "JUL", Q: "AUG", U: "SEP", V: "OCT", X: "NOV", Z: "DEC" };

/**
 * `/NQZ6` → `{ root: "NQ", month: "DEC", year: 2026 }`. A continuous symbol
 * (`NQ1!`, `/NQ`) is not a dated contract and answers null. One-digit years
 * resolve to the first year ≥ this year with that digit (tastytrade lists
 * nothing expired), so "6" in 2026 is 2026 and "5" is 2035.
 */
export function datedFuturesContract(symbol: string, nowMs: number): { root: string; month: string; year: number; label: string } | null {
  const m = /^\/([A-Z0-9]{1,4}?)([FGHJKMNQUVXZ])(\d{1,2})$/.exec(symbol.trim().toUpperCase());
  if (!m) return null;
  const [, root, code, yy] = m;
  const nowYear = new Date(nowMs).getUTCFullYear();
  let year: number;
  if (yy.length === 2) year = 2000 + Number(yy);
  else {
    year = nowYear - (nowYear % 10) + Number(yy);
    if (year < nowYear) year += 10;
  }
  return { root, month: MONTHS[code], year, label: `/${root}${code}${yy} · ${MONTHS[code]} ${year}` };
}

/* ── The gate ─────────────────────────────────────────────────────────────── */

export type RefusalCode =
  | "KILL_SWITCH" | "DISARMED" | "LIMITS_UNSET" | "CAP_UNSET" | "OVER_QTY_CAP" | "OVER_NOTIONAL_CAP" | "OVER_LOSS_CAP"
  | "ENVIRONMENT" | "ACCOUNT_UNSTATED" | "UNSUPPORTED_PRODUCT" | "NOT_A_DATED_CONTRACT" | "QUOTE_STALE" | "NO_PROTECTION"
  | "STOP_WRONG_SIDE" | "UNKNOWN_ORDER_STATE" | "NO_PRICE_REFERENCE";

export interface Refusal { readonly code: RefusalCode; readonly reason: string }

export type TradeEnvironment = "production" | "cert";

export interface PreflightOrder {
  readonly instrumentType: TtInstrumentType;
  /** The executable symbol tastytrade will receive (`/NQZ6`), never the chart's `NQ1!`. */
  readonly symbol: string;
  readonly action: TtAction;
  readonly qty: number;
  readonly type: "Market" | "Limit" | "Stop" | "Stop Limit";
  readonly limitPx: number | null;
  readonly stopPx: number | null;
  /** The planned protective stop for an opening order (the risk plan). */
  readonly protectiveStopPx: number | null;
  /** The environment the TICKET showed the trader. Must equal the server's. */
  readonly environment: TradeEnvironment | null;
  readonly accountIndex: number | null;
  /** The touch the ticket priced against. */
  readonly quote: { readonly bid: number | null; readonly ask: number | null; readonly atMs: number | null } | null;
  /** Option multiplier from tastytrade's own contract terms, when the ticket has it. */
  readonly multiplier?: number | null;
}

export interface PreflightContext {
  readonly limits: ServerOrderLimits | null;
  readonly serverEnvironment: TradeEnvironment;
  readonly nowMs: number;
  /** Sends on this ticket still UNKNOWN / RECONCILING (the client says; the server also checks the broker by key). */
  readonly unresolvedSends?: number;
  /**
   * The protection rail of the broker this order goes to, when it is NOT the
   * default (tastytrade's). A broker with no stop rail wired (Webull,
   * 2026-10-09) passes "UNAVAILABLE": an opening order that would need a stop
   * is refused rather than passed on a stop that will never be placed.
   * TIGHTENING ONLY — it can replace BROKER-NATIVE with a weaker rail, and a
   * weaker rail only ever refuses more.
   */
  readonly protectionRail?: ProtectionMode;
  /** The broker's name for the refusal words (default "tastytrade"). */
  readonly brokerName?: string;
}

export interface PreflightPass {
  readonly ok: true;
  readonly opening: boolean;
  readonly referencePx: number | null;
  readonly pointValue: number | null;
  readonly notionalUsd: number | null;
  readonly lossAtStopUsd: number | null;
  readonly protection: ProtectionMode;
  readonly riskBound: "STOP" | "PREMIUM" | "CLOSING";
}
export type PreflightResult = PreflightPass | { readonly ok: false; readonly refusals: readonly Refusal[] };

const positive = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

/** Point value per unit: shares 1, coins 1, futures from the contract table, options × multiplier. */
function pointValueOf(o: PreflightOrder): number | null {
  if (o.instrumentType === "Equity" || o.instrumentType === "Cryptocurrency") return 1;
  if (o.instrumentType === "Future") {
    const e = instrumentEconomics(o.symbol, null);
    return e.status === "PRICED" ? e.pointValue : null;
  }
  if (o.instrumentType === "Equity Option") return positive(o.multiplier) ? o.multiplier : 100;
  // A futures option moves with its underlying's point value (tastytrade's own multiplier when the ticket has it).
  if (positive(o.multiplier)) return o.multiplier;
  const under = /^\.(\/[A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{1,2})/.exec(o.symbol)?.[1];
  if (!under) return null;
  const e = instrumentEconomics(under, null);
  return e.status === "PRICED" ? e.pointValue : null;
}

export function preflightLiveOrder(o: PreflightOrder, ctx: PreflightContext): PreflightResult {
  const refusals: Refusal[] = [];
  const refuse = (code: RefusalCode, reason: string) => { refusals.push({ code, reason }); };
  const L = ctx.limits;
  const opening = o.action === "Buy to Open" || o.action === "Sell to Open";
  const buying = o.action.startsWith("Buy");
  const isOption = o.instrumentType === "Equity Option" || o.instrumentType === "Future Option";
  const contracts = o.instrumentType !== "Equity" && o.instrumentType !== "Cryptocurrency";

  // 1. Switches.
  if (!L || L.updatedAtMs == null) refuse("LIMITS_UNSET", "No server-held order limits are set. Set them in Settings › Execution; until then nothing live can be sent.");
  if (L?.killSwitch) refuse("KILL_SWITCH", "The kill switch is engaged. No new live order can be sent until you release it in Settings › Execution.");
  if (L && !L.armed) refuse("DISARMED", "Live trading is DISARMED on the server. Arm it in Settings › Execution.");
  if ((ctx.unresolvedSends ?? 0) > 0) refuse("UNKNOWN_ORDER_STATE", `An earlier send is still UNKNOWN. Reconcile it with ${ctx.brokerName ?? "tastytrade"} before sending anything else — a timeout is not a rejection.`);

  // 2. Where it goes.
  if (o.environment == null) refuse("ENVIRONMENT", "The ticket did not state an environment (production or cert).");
  else if (o.environment !== ctx.serverEnvironment) refuse("ENVIRONMENT", `The ticket showed ${o.environment.toUpperCase()} but the server trades ${ctx.serverEnvironment.toUpperCase()}. Nothing is rerouted silently.`);
  if (!Number.isInteger(o.accountIndex)) refuse("ACCOUNT_UNSTATED", "A live order names its account explicitly.");

  // 3. What it is.
  if (o.instrumentType === "Future" && !datedFuturesContract(o.symbol, ctx.nowMs)) {
    refuse("NOT_A_DATED_CONTRACT", `"${o.symbol}" is not a dated futures contract. A continuous symbol (NQ1!) must resolve to its month (/NQZ6) on the ticket first.`);
  }
  if (isOption && o.action === "Sell to Open") refuse("UNSUPPORTED_PRODUCT", "Selling options to open (undefined risk) is not supported from this ticket.");
  if (o.instrumentType === "Cryptocurrency" && opening) refuse("UNSUPPORTED_PRODUCT", "Crypto has no stop rail here, so an opening crypto order cannot carry verified protection.");
  const pv = pointValueOf(o);
  if (pv == null) refuse("UNSUPPORTED_PRODUCT", `No point value on file for ${o.symbol}; notional and loss cannot be bounded, so it is not sent.`);

  // 4. Caps that apply to this order must be SET, then held.
  if (L) {
    const qtyCap = contracts ? L.maxContractsPerOrder : o.instrumentType === "Equity" ? L.maxSharesPerOrder : null;
    const qtyWord = contracts ? "contracts" : "shares";
    if (o.instrumentType !== "Cryptocurrency") {
      if (qtyCap == null) refuse("CAP_UNSET", `Set a maximum ${qtyWord} per order on the server (Settings › Execution).`);
      else if (o.qty > qtyCap) refuse("OVER_QTY_CAP", `${o.qty} ${qtyWord} is above your ${qtyCap}-${qtyWord.replace(/s$/, "")} ceiling.`);
    }
    if (L.maxNotionalUsdPerOrder == null) refuse("CAP_UNSET", "Set a maximum notional per order on the server (Settings › Execution).");
    if (L.maxLossUsdPerOrder == null) refuse("CAP_UNSET", "Set a maximum loss per order on the server (Settings › Execution).");
  }

  // 5. The price this order is judged at.
  const q = o.quote;
  const quoteAge = q?.atMs != null ? ctx.nowMs - q.atMs : null;
  const quoteFresh = quoteAge != null && quoteAge >= -1_000 && quoteAge <= (L?.maxQuoteAgeMs ?? DEFAULT_QUOTE_AGE_MS);
  const touch = buying ? q?.ask ?? null : q?.bid ?? null;
  // Risk-increasing orders need a fresh touch. Exit is easier than entry (§LXXIX):
  // a resting closing Stop / Limit (protection, target) is never held hostage to a dead quote.
  const needsFreshQuote = opening || o.type === "Market";
  if (needsFreshQuote && !quoteFresh) {
    refuse("QUOTE_STALE", quoteAge == null
      ? "No live quote for this contract. A risk-increasing order is never priced from nothing."
      : `The quote is ${(quoteAge / 1000).toFixed(1)}s old (limit ${((L?.maxQuoteAgeMs ?? DEFAULT_QUOTE_AGE_MS) / 1000).toFixed(1)}s). Refresh before sending.`);
  }
  const referencePx = o.type === "Limit" || o.type === "Stop Limit" ? (positive(o.limitPx) ? o.limitPx : null)
    : o.type === "Stop" ? (positive(o.stopPx) ? o.stopPx : null)
    : positive(touch) ? touch : null;
  if (referencePx == null && opening) refuse("NO_PRICE_REFERENCE", "No price to judge this order at (no limit, trigger or live touch).");

  const notionalUsd = referencePx != null && pv != null ? referencePx * pv * o.qty : null;
  if (L?.maxNotionalUsdPerOrder != null && notionalUsd != null && notionalUsd > L.maxNotionalUsdPerOrder) {
    refuse("OVER_NOTIONAL_CAP", `${usd(notionalUsd)} notional is above your ${usd(L.maxNotionalUsdPerOrder)} ceiling.`);
  }

  // 6. Protection: a verified bound on loss for every opening order.
  let protection: ProtectionMode = ctx.protectionRail ?? protectionFor(o.instrumentType);
  let riskBound: PreflightPass["riskBound"] = "CLOSING";
  let lossAtStopUsd: number | null = null;
  if (opening) {
    if (isOption && buying) {
      // A long option's worst case is its premium — bounded without a stop.
      riskBound = "PREMIUM";
      protection = "UNAVAILABLE";
      lossAtStopUsd = notionalUsd;
    } else if (protection === "BROKER-NATIVE") {
      riskBound = "STOP";
      const sp = o.protectiveStopPx;
      if (!positive(sp)) refuse("NO_PROTECTION", "An opening order needs a protective stop (BROKER-NATIVE, sent after the fill). Place the stop line on the chart.");
      else if (referencePx != null && (buying ? sp >= referencePx : sp <= referencePx)) refuse("STOP_WRONG_SIDE", `The stop ${sp} is on the wrong side of the entry ${referencePx}.`);
      else if (referencePx != null && pv != null) lossAtStopUsd = Math.abs(referencePx - sp) * pv * o.qty;
    } else if (!refusals.some(r => r.code === "UNSUPPORTED_PRODUCT")) {
      refuse("NO_PROTECTION", `No verified protection for ${o.instrumentType} (${PROTECTION_WORDS[protection]}).`);
    }
    if (L?.maxLossUsdPerOrder != null && lossAtStopUsd != null && lossAtStopUsd > L.maxLossUsdPerOrder) {
      refuse("OVER_LOSS_CAP", `${usd(lossAtStopUsd)} at the stop is above your ${usd(L.maxLossUsdPerOrder)} loss ceiling.`);
    }
  }

  if (refusals.length) return { ok: false, refusals };
  return { ok: true, opening, referencePx, pointValue: pv, notionalUsd, lossAtStopUsd, protection, riskBound };
}
