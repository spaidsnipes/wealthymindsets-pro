/**
 * TASTYTRADE LIFETIME LEDGER — Garden 18 v2 §29/§30/§36, the second rail
 * beside Webull's. Built ONLY from tastytrade's own trade transactions: each
 * fill carries the broker's net cash effect (`value`, signed by value-effect)
 * and its itemised fees, so a round trip's result is the broker's arithmetic,
 * not a model's — "ACTUAL BROKER RESULT", with the multiplier already inside
 * tastytrade's number (options ×100, futures by contract).
 *
 * A round trip per instrument (tastytrade's symbol) runs from flat to flat by
 * signed quantity: Buy to Open / Buy to Close add, Sell to Open / Sell to
 * Close subtract. A position not yet flat is OPEN, never a result. PURE.
 */

import type { TtFill } from "./tastytradeFills";

export interface TtRoundTrip {
  readonly symbol: string;
  readonly instrumentType: string | null;
  readonly openedAt: string | null;
  readonly closedAt: string | null;
  readonly fills: number;
  /** Largest absolute position held during the trip. */
  readonly maxQty: number;
  readonly direction: "LONG" | "SHORT";
  /** Sum of tastytrade's net cash effects (fees already inside `value` are NOT double-counted — see `gross`). */
  readonly net: number;
  readonly fees: number;
  /** Net before fees. */
  readonly gross: number;
  readonly truth: "ACTUAL BROKER RESULT" | "OPEN";
}

export interface TtLedgerSummary {
  readonly closed: number;
  readonly open: number;
  readonly wins: number;
  readonly losses: number;
  readonly net: number;
  readonly fees: number;
  readonly byInstrumentType: readonly { readonly type: string; readonly trades: number; readonly net: number }[];
}

const signOf = (action: string | null): 1 | -1 | 0 => {
  const a = (action ?? "").toLowerCase();
  if (a.startsWith("buy")) return 1;
  if (a.startsWith("sell")) return -1;
  return 0;
};
const cents = (x: number) => Math.round(x * 100) / 100;

/**
 * tastytrade's `value` on a Trade transaction is the principal cash effect;
 * fees are separate fields (commission, clearing, regulatory). Net = value − fees.
 */
export function buildTtRoundTrips(fills: readonly TtFill[]): TtRoundTrip[] {
  const bySym = new Map<string, TtFill[]>();
  for (const f of fills) {
    if (!f.symbol || f.quantity == null || f.value == null) continue;
    const list = bySym.get(f.symbol) ?? [];
    list.push(f);
    bySym.set(f.symbol, list);
  }
  const out: TtRoundTrip[] = [];
  for (const [symbol, list] of bySym) {
    list.sort((a, b) => (a.executedAt ?? "").localeCompare(b.executedAt ?? ""));
    let pos = 0, cash = 0, fees = 0, netCash = 0, netKnown = true, n = 0, maxQty = 0, opened: string | null = null, dir: "LONG" | "SHORT" = "LONG", type: string | null = null;
    for (const f of list) {
      const sg = signOf(f.action);
      if (sg === 0) continue;
      if (pos === 0) { opened = f.executedAt; cash = 0; fees = 0; netCash = 0; netKnown = true; n = 0; maxQty = 0; dir = sg > 0 ? "LONG" : "SHORT"; type = f.instrumentType; }
      pos += sg * (f.quantity ?? 0);
      cash += f.value ?? 0;
      fees += f.fees;
      if (f.netValue == null) netKnown = false; else netCash += f.netValue;
      n++;
      maxQty = Math.max(maxQty, Math.abs(pos));
      if (Math.abs(pos) < 1e-9) {
        pos = 0;
        // The broker's own after-fee number when every fill carried it.
        const net = netKnown ? netCash : cash - fees;
        out.push({ symbol, instrumentType: type, openedAt: opened, closedAt: f.executedAt, fills: n, maxQty, direction: dir, gross: cents(cash), fees: cents(fees), net: cents(net), truth: "ACTUAL BROKER RESULT" });
      }
    }
    if (pos !== 0) out.push({ symbol, instrumentType: type, openedAt: opened, closedAt: null, fills: n, maxQty, direction: dir, gross: cents(cash), fees: cents(fees), net: 0, truth: "OPEN" });
  }
  return out.sort((a, b) => (b.closedAt ?? b.openedAt ?? "").localeCompare(a.closedAt ?? a.openedAt ?? ""));
}

export function summarizeTtLedger(trips: readonly TtRoundTrip[]): TtLedgerSummary {
  const closed = trips.filter(t => t.truth === "ACTUAL BROKER RESULT");
  const types = new Map<string, { trades: number; net: number }>();
  for (const t of closed) {
    const k = t.instrumentType ?? "Unknown";
    const v = types.get(k) ?? { trades: 0, net: 0 };
    types.set(k, { trades: v.trades + 1, net: cents(v.net + t.net) });
  }
  return {
    closed: closed.length,
    open: trips.length - closed.length,
    wins: closed.filter(t => t.net > 0).length,
    losses: closed.filter(t => t.net < 0).length,
    net: cents(closed.reduce((s, t) => s + t.net, 0)),
    fees: cents(closed.reduce((s, t) => s + t.fees, 0)),
    byInstrumentType: [...types].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.trades - a.trades),
  };
}

/**
 * The chart a round trip opens on, or null when the camera cannot honestly
 * show its instrument. Equities and futures open as themselves ("/ESZ6" is a
 * symbol /charts resolves); an option opens its UNDERLYING — the stock for an
 * equity option, the futures contract named inside a futures option's symbol
 * ("./MNQZ6MN5CU6260930P30675" → "/MNQZ6"). The row still names the contract.
 * Anything unrecognised gets no door rather than a guessed one.
 */
export function ttChartSymbol(t: Pick<TtRoundTrip, "symbol" | "instrumentType">): string | null {
  const type = (t.instrumentType ?? "").toLowerCase();
  const sym = t.symbol.trim().toUpperCase();
  if (!sym) return null;
  if (type === "equity" || type === "future") return sym;
  if (type === "equity option") {
    const root = sym.split(/\s+/)[0] ?? "";
    return /^[A-Z.]{1,6}$/.test(root) ? root : null;
  }
  if (type === "future option") {
    const m = /^\.\/([A-Z0-9]{1,4}?[FGHJKMNQUVXZ]\d)/.exec(sym);
    return m ? `/${m[1]}` : null;
  }
  return null;
}
