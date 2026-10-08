/**
 * WHAT ACTUALLY HAPPENED, FROM WEBULL'S READBACK — read only. PURE.
 *
 * Journal auto-capture (journalCaptureFromFill) is tastytrade-only: Webull
 * fills are NOT turned into journal drafts. Review reads them, though, for a
 * Decision_ID WM sent through Webull (the journal feed links each Webull fill
 * to its decision by client order id). This turns that story's Webull fills
 * into the actuals planVsActual compares with the frozen plan.
 *
 * What Webull's readback in WM can and cannot say:
 *   · fills: side (BUY / SELL / SHORT…), quantity, price, time — per execution,
 *     or per filled order from order history;
 *   · NO open / close flag — WM pairs fills flat-to-flat in time order (the
 *     first fill sets the direction), and stops at the first return to flat;
 *   · NO stop / target orders in the feed — stop and target moves are not
 *     visible (said as UNKNOWN, never "not moved");
 *   · fees: executions state none (UNREPORTED); order history itemises them;
 *   · multi-leg option orders are read as leg 0 only — refused here.
 * It never calls a Webull order tool; it reads what the journal feed returned.
 */

import type { ActualEvent, TradeActuals } from "./planVsActual";

export interface WebullStoryFill {
  readonly orderId: string | null;
  readonly action: string | null;
  readonly quantity: number | null;
  readonly price: number | null;
  readonly executedAt: string | null;
  readonly symbol?: string | null;
  readonly feesReported?: boolean;
  readonly legCount?: number | null;
}

export const WEBULL_READBACK_UNKNOWNS: readonly string[] = [
  "UNKNOWN: WM reads Webull fills only — stop and target orders, and any moves of them, are not visible here.",
  "UNKNOWN: Webull fills carry no open / close flag — WM paired them flat-to-flat in time order (the first fill sets the direction).",
];

export const WEBULL_NOT_AUTO_CAPTURED = "Webull fills are read for Review and the Broker Ledger; WM does not auto-capture them into the Journal — add the entry yourself.";

export type WebullActualsResult =
  | { readonly ok: true; readonly actuals: TradeActuals; readonly feesKnown: boolean }
  | { readonly ok: false; readonly reason: string };

const side = (a: string | null): 1 | -1 | null => {
  const t = (a ?? "").trim().toUpperCase();
  if (t.startsWith("BUY")) return 1;
  if (t.startsWith("SELL") || t.startsWith("SHORT")) return -1;
  return null;
};
const ms = (iso: string | null) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null; };

export function actualsFromWebullStory(fills: readonly WebullStoryFill[], source = "Webull fills (journal feed)"): WebullActualsResult {
  const priced = fills.filter(f => typeof f.price === "number" && f.price > 0 && typeof f.quantity === "number" && f.quantity > 0 && side(f.action) != null);
  if (!priced.length) return { ok: false, reason: "No priced Webull fill with a side is on record for this decision." };
  if (priced.some(f => (f.legCount ?? 1) > 1)) {
    return { ok: false, reason: "A multi-leg Webull order is read as its first leg only, so WM does not compare it with the plan — UNKNOWN how the legs pair." };
  }
  const symbols = new Set(priced.map(f => (f.symbol ?? "").trim()).filter(Boolean));
  if (symbols.size > 1) return { ok: false, reason: `This decision's Webull fills span ${symbols.size} instruments, so they are not one position — UNKNOWN how they pair.` };

  // One event per Webull order: quantity-weighted price, earliest time (null if any time is missing).
  const byOrder = new Map<string, WebullStoryFill[]>();
  priced.forEach((f, i) => { const k = f.orderId ?? `fill-${i}`; (byOrder.get(k) ?? byOrder.set(k, []).get(k)!).push(f); });
  const events = [...byOrder.values()].map(g => {
    const q = g.reduce((s, f) => s + (f.quantity as number), 0);
    const times = g.map(f => ms(f.executedAt));
    return {
      side: side(g[0].action) as 1 | -1,
      ev: { atMs: times.every(t => t != null) ? Math.min(...(times as number[])) : null, px: g.reduce((s, f) => s + (f.price as number) * (f.quantity as number), 0) / q, qty: q } as ActualEvent,
    };
  }).sort((a, b) => (a.ev.atMs ?? Infinity) - (b.ev.atMs ?? Infinity));

  const dir = events[0].side;
  let pos = 0;
  const opens: ActualEvent[] = [], exits: ActualEvent[] = [];
  for (const e of events) {
    if (e.side === dir) { opens.push(e.ev); pos += e.ev.qty as number; }
    else { exits.push(e.ev); pos -= e.ev.qty as number; if (pos <= 0) break; }
  }
  return {
    ok: true,
    feesKnown: priced.every(f => f.feesReported === true),
    actuals: {
      direction: dir === 1 ? "LONG" : "SHORT",
      entry: opens[0] ?? null,
      adds: opens.slice(1),
      exits,
      stopMoves: [],
      targetMoves: [],
      source,
      unknowns: WEBULL_READBACK_UNKNOWNS,
    },
  };
}
