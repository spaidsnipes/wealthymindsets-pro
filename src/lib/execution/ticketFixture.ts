/**
 * /charts?scene=ticket-fixture&side=buy|sell[&state=flat|holding|working|inflight|noquote] — a SAMPLE book
 * for the trade ticket (coordinator order 2026-10-09). PURE.
 *
 * The Founder's ticket is never pressed to prove a layout. This scene pre-picks the side and feeds
 * the REAL ticket a sample broker readback (through the real selectBrokerOrderLines), so the phone
 * ACT stage, the protect line, a working-order row with its Cancel control, HOLDING with protection
 * and the in-flight fold refusal can be read on serving — while every send / cancel / flatten
 * control is refused at the control (railSendGate "PROOF_SCENE") and no order route can be reached.
 *
 * Nothing here fetches, stores or sends. The sample is labelled SAMPLE in every row a trader reads.
 */

import { SCENE_PARAM } from "@/lib/chart/proofScene";
import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";

import { selectBrokerOrderLines, type BrokerLinesResult, type BrokerReadback } from "./brokerOrderLines";

export const TICKET_FIXTURE_SCENE = "ticket-fixture";
export const TICKET_FIXTURE_BANNER = "PROOF SCENE — sample book, not your account · nothing can be sent";
export const TICKET_FIXTURE_STATES = ["flat", "holding", "working", "inflight", "noquote"] as const;
export type TicketFixtureState = (typeof TICKET_FIXTURE_STATES)[number];

export interface TicketFixture {
  readonly side: "BUY" | "SELL";
  readonly state: TicketFixtureState;
}

/** The scene the URL asks for, or null. A side is required — the scene exists to pre-pick it. */
export function parseTicketFixture(search: string): TicketFixture | null {
  let q: URLSearchParams;
  try { q = new URLSearchParams(search); } catch { return null; }
  if ((q.get(SCENE_PARAM) ?? "").trim() !== TICKET_FIXTURE_SCENE) return null;
  const side = (q.get("side") ?? "").trim().toLowerCase();
  if (side !== "buy" && side !== "sell") return null;
  const raw = (q.get("state") ?? "flat").trim().toLowerCase();
  const state = (TICKET_FIXTURE_STATES as readonly string[]).includes(raw) ? raw as TicketFixtureState : null;
  return state ? { side: side === "buy" ? "BUY" : "SELL", state } : null;
}

/** Account tails that cannot be mistaken for real ones. */
export const TICKET_FIXTURE_TAIL = "SMPL";

/**
 * The sample readback for a state, around a reference price (the chart's last price, or 100):
 *   flat     — read, nothing held, nothing working;
 *   holding  — a position in the picked side's direction, UNPROTECTED (no stop working);
 *   working  — the same position WITH a working protective stop (PROTECTED) — a cancellable row;
 *   inflight — as `working`; the ticket additionally treats its entry order as in flight.
 *   noquote  — as `flat`; the ticket additionally shows NO quote for the contract, so no limit is
 *              prefilled and "Review & preview" is refused with its reason beside the button.
 */
export function ticketFixtureReadback(fx: TicketFixture, contract: string, refPx: number | null, nowMs: number): BrokerReadback {
  const px = refPx != null && Number.isFinite(refPx) && refPx > 0 ? refPx : 100;
  const long = fx.side === "BUY";
  const holding = fx.state !== "flat" && fx.state !== "noquote";
  // A whole number: on tick for every listed future and for any stock (never 30988.28 on a 0.25 tick).
  const stopPx = Math.round(px * (long ? 0.995 : 1.005));
  const stop: TtOrderView = {
    id: "9000001", status: "Live", state: "WORKING", symbol: contract, action: long ? "Sell to Close" : "Buy to Close", quantity: 1, filled: 0,
    price: null, stopTrigger: String(stopPx), orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null,
  };
  const withStop = fx.state === "working" || fx.state === "inflight";
  return {
    asOfMs: nowMs, ok: true,
    positions: holding ? [{ symbol: contract, quantity: 1, direction: long ? "Long" : "Short", averageOpenPrice: px, instrumentType: null }] : [],
    orders: withStop ? [stop] : [],
    tails: [TICKET_FIXTURE_TAIL],
    orderAccounts: withStop ? { [stop.id]: { index: 0, tail: TICKET_FIXTURE_TAIL } } : {},
  };
}

/** The sample book rows' source, through the real selector — the same shape useBrokerChartLines returns. */
export function ticketFixtureLines(fx: TicketFixture, contract: string, refPx: number | null, pointValue: number | null, nowMs: number): BrokerLinesResult {
  return selectBrokerOrderLines(ticketFixtureReadback(fx, contract, refPx, nowMs), contract, refPx, pointValue, nowMs);
}
