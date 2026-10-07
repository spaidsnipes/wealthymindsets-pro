/**
 * WHAT ACTUALLY HAPPENED, FROM THE BROKER'S READBACK — Garden 19 §26. PURE.
 *
 * One broker story (the orders and fills grouped under a Decision_ID by the
 * journal feed — tastytrade's own order readback and trade transactions) →
 * the actuals planVsActual compares with the frozen plan:
 *
 *   entry       the first opening fill (its order's fills averaged, timed by the earliest);
 *   adds        later opening fills from OTHER orders;
 *   exits       every closing fill, with tastytrade's executed-at time;
 *   stop moves  the closing Stop / Stop Limit orders in the order tastytrade
 *               received them: a resting stop at a trigger other than the
 *               plan's is a move from the plan's stop, and each later stop at
 *               a new trigger is a move from the one before;
 *   target moves  the same for closing Limit orders against the plan's target.
 *
 * A move is timed by the new order's `received-at`. Where tastytrade sent no
 * receipt time, the time is null ("not reported") — `updated-at` is NOT used,
 * because it moves again when the order fills or is cancelled.
 *
 * Caveat stated where it is used: a closing Limit may be a manual exit rather
 * than a target; the Review says "Target order moved", the trader annotates.
 */

import type { ActualEvent, LevelMove, TradeActuals } from "./planVsActual";

export interface StoryOrderFact {
  readonly id: string;
  readonly action: string | null;
  readonly orderType?: string | null;
  readonly stopTrigger?: string | null;
  readonly price?: string | null;
  readonly receivedAt?: string | null;
}

export interface StoryFillFact {
  readonly orderId: string | null;
  readonly action: string | null;
  readonly quantity: number | null;
  readonly price: number | null;
  readonly executedAt: string | null;
}

const opening = (a: string | null | undefined) => /to open/i.test(a ?? "");
const closing = (a: string | null | undefined) => /to close/i.test(a ?? "");
const ms = (iso: string | null | undefined) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null; };
const px = (v: string | number | null | undefined) => { const x = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v); return Number.isFinite(x) && x > 0 ? x : null; };
const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-6, 1e-9);

function byOrder(fills: readonly StoryFillFact[]): ActualEvent[] {
  const groups = new Map<string, StoryFillFact[]>();
  fills.forEach((f, i) => { const k = f.orderId ?? `fill-${i}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(f); });
  const out: ActualEvent[] = [];
  for (const g of groups.values()) {
    const priced = g.filter(f => px(f.price) != null);
    if (!priced.length) continue;
    const qty = priced.reduce((s, f) => s + (f.quantity ?? 0), 0);
    const avg = qty > 0 ? priced.reduce((s, f) => s + (f.price as number) * (f.quantity ?? 0), 0) / qty : (priced[0].price as number);
    const times = priced.map(f => ms(f.executedAt)).filter((t): t is number => t != null);
    out.push({ atMs: times.length === priced.length ? Math.min(...times) : null, px: avg, qty: qty > 0 ? qty : null });
  }
  return out.sort((a, b) => (a.atMs ?? Infinity) - (b.atMs ?? Infinity));
}

function moves(orders: readonly StoryOrderFact[], level: (o: StoryOrderFact) => number | null, plan: number | null): LevelMove[] {
  const seq = orders
    .map(o => ({ o, at: ms(o.receivedAt), lv: level(o) }))
    .filter((x): x is { o: StoryOrderFact; at: number | null; lv: number } => x.lv != null)
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || a.o.id.localeCompare(b.o.id));
  const out: LevelMove[] = [];
  let prev = plan;
  for (const x of seq) {
    if (prev != null && same(x.lv, prev)) continue;
    if (prev == null && out.length === 0 && plan == null) { prev = x.lv; continue; }
    out.push({ atMs: x.at, fromPx: prev, toPx: x.lv });
    prev = x.lv;
  }
  return out;
}

export function actualsFromBrokerStory(
  story: { readonly orders: readonly StoryOrderFact[]; readonly fills: readonly StoryFillFact[] },
  plan: { readonly stopPx: number | null; readonly targetPx: number | null },
  source = "tastytrade order readback and trade transactions",
): TradeActuals {
  const opens = byOrder(story.fills.filter(f => opening(f.action)));
  const firstOpen = story.fills.find(f => opening(f.action));
  const direction = firstOpen ? (/^buy/i.test(firstOpen.action ?? "") ? "LONG" : "SHORT") : null;
  const closers = story.orders.filter(o => closing(o.action));
  const isStop = (o: StoryOrderFact) => /stop/i.test(o.orderType ?? "");
  const isLimit = (o: StoryOrderFact) => /^limit$/i.test((o.orderType ?? "").trim());
  return {
    direction,
    entry: opens[0] ?? null,
    adds: opens.slice(1),
    exits: story.fills.filter(f => closing(f.action) && px(f.price) != null).map(f => ({ atMs: ms(f.executedAt), px: f.price as number, qty: f.quantity })),
    stopMoves: moves(closers.filter(isStop), o => px(o.stopTrigger), plan.stopPx),
    targetMoves: moves(closers.filter(isLimit), o => px(o.price), plan.targetPx),
    source,
  };
}
