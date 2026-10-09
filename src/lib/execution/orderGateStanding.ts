/**
 * THE SERVER GATE, READ WITHOUT SENDING AN ORDER (Garden 19 §66, coordinator
 * order 2026-10-09).
 *
 * §66 needs the server gate read on serving, and nobody sends an order to see
 * it. This asks the SAME decision the submit doors ask —
 * `preflightLiveOrder` over the limits `loadServerOrderLimits` returned — with
 * the smallest risk-increasing order there is, and reports the part of the
 * answer that does not depend on the order: no limits, kill switch, disarmed,
 * a cap not set. Those are the refusals the submit door would return RIGHT NOW
 * for ANY risk-increasing order.
 *
 * NO SECOND COPY OF THE RULE. This module holds no refusal sentence and no
 * condition of its own: every code and every word below comes out of
 * `preflightLiveOrder` (orderGateStanding.sentinel pins that). What it adds is
 * the probe, the filter to order-independent codes, and one honest sentence
 * for the two outcomes.
 *
 * WHAT IT DOES NOT SAY. Quantity and notional against the caps, quote age,
 * protection, the account, the product — those are judged on the real order.
 * "Would pass" therefore means "no standing refusal", never "your order will
 * go"; the broker's own checks still apply after it.
 *
 * PURE: no broker call, no ledger write, no storage, no clock of its own.
 */
import { preflightLiveOrder, type PreflightContext, type PreflightOrder, type Refusal, type RefusalCode, type ServerOrderLimits, type TradeEnvironment } from "@/lib/execution/liveOrderPreflight";

export type GateBroker = "tastytrade" | "webull";
export const GATE_BROKERS: readonly GateBroker[] = ["tastytrade", "webull"];

/** The refusals that hold for any risk-increasing order, whatever its size or price. */
export const STANDING_REFUSAL_CODES: readonly RefusalCode[] = ["LIMITS_UNSET", "KILL_SWITCH", "DISARMED", "CAP_UNSET"];

/**
 * The context each submit door passes to the gate, per broker. It must equal
 * what the route passes (the sentinel reads both): Webull has no stop rail
 * wired, so its orders are judged with protection UNAVAILABLE.
 */
export function gateContextFor(broker: GateBroker, limits: ServerOrderLimits | null, serverEnvironment: TradeEnvironment, nowMs: number): PreflightContext {
  return broker === "webull"
    ? { limits, serverEnvironment: "production", nowMs, protectionRail: "UNAVAILABLE", brokerName: "Webull" }
    : { limits, serverEnvironment, nowMs };
}

/**
 * The smallest risk-increasing orders: one long option contract and one share,
 * at one cent, on a quote taken at `nowMs`. Two probes because contracts and
 * shares have separate caps. Nothing here is sent anywhere.
 */
export function gateProbes(serverEnvironment: TradeEnvironment, nowMs: number): readonly PreflightOrder[] {
  const quote = { bid: 0.01, ask: 0.01, atMs: nowMs };
  const base = { qty: 1, type: "Limit" as const, limitPx: 0.01, stopPx: null, protectiveStopPx: null, environment: serverEnvironment, accountIndex: 0, quote };
  return [
    { ...base, instrumentType: "Equity Option", symbol: "SPY   270115C00500000", action: "Buy to Open", multiplier: 100 },
    { ...base, instrumentType: "Equity", symbol: "SPY", action: "Buy to Open" },
  ];
}

export interface OrderGateStanding {
  readonly broker: GateBroker;
  /** The switches, read from the same limits record the gate read. Null = no record. */
  readonly limits: "SET" | "UNSET";
  readonly killSwitch: "ENGAGED" | "RELEASED" | null;
  readonly serverArmed: boolean | null;
  readonly verdict: "WOULD_REFUSE" | "NO_STANDING_REFUSAL";
  /** The gate's own refusals (code + its sentence), order-independent ones only, de-duplicated. */
  readonly refusals: readonly Refusal[];
  /** One line for the glass. */
  readonly sentence: string;
  readonly asOfMs: number;
}

export function orderGateStanding(input: { readonly broker: GateBroker; readonly limits: ServerOrderLimits | null; readonly serverEnvironment: TradeEnvironment; readonly nowMs: number }): OrderGateStanding {
  const ctx = gateContextFor(input.broker, input.limits, input.serverEnvironment, input.nowMs);
  const seen = new Set<string>();
  const refusals: Refusal[] = [];
  for (const probe of gateProbes(ctx.serverEnvironment, input.nowMs)) {
    const r = preflightLiveOrder(probe, ctx);
    if (r.ok) continue;
    for (const x of r.refusals) {
      if (!STANDING_REFUSAL_CODES.includes(x.code) || seen.has(x.reason)) continue;
      seen.add(x.reason);
      refusals.push(x);
    }
  }
  const L = input.limits;
  const set = !!L && L.updatedAtMs != null;
  return {
    broker: input.broker,
    limits: set ? "SET" : "UNSET",
    killSwitch: L ? (L.killSwitch ? "ENGAGED" : "RELEASED") : null,
    serverArmed: L ? L.armed : null,
    verdict: refusals.length ? "WOULD_REFUSE" : "NO_STANDING_REFUSAL",
    refusals,
    sentence: refusals.length
      ? `would refuse: ${refusals.map(r => r.reason).join(" ")}`
      : "would pass the server gate's standing checks; the order's own size, price, quote and protection are judged when it is sent, and broker checks still apply",
    asOfMs: input.nowMs,
  };
}

/** The line Settings › Connections prints under an execute row: the gate's sentence with its own clock. */
export function serverGateNowLine(s: Pick<OrderGateStanding, "sentence" | "asOfMs"> | null, timeZone = "America/Chicago"): string {
  if (!s) return "server gate now: not read";
  let at = "";
  try { at = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(s.asOfMs)); } catch { at = new Date(s.asOfMs).toISOString(); }
  return `server gate now: ${s.sentence} · as of ${at}`;
}
