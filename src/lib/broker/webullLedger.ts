/**
 * WEBULL LIFETIME LEDGER (Garden 18 v2 §29/§30/§36) — PURE.
 *
 * Layer 1, RAW: every order Webull's order history returns, read field for
 * field (`/openapi/trade/order/history`: groups of `{ combo_type, orders[] }`,
 * each order with legs, fees[], filled_price, filled_time). Immutable
 * provenance — nothing here edits a broker number.
 *
 * Layer 2, EPISODES: filled orders replayed per account + instrument, flat →
 * flat. An episode is RECONSTRUCTED: WM did not watch it happen; it is rebuilt
 * from the broker's fills. Cash is price × quantity × the contract multiplier
 * the order itself states; fees are Webull's own itemised `actual_value`s.
 *
 * Missing stays missing: a long option still open after its expiry, with no
 * closing order in the history, is UNSETTLED — the order history does not say
 * whether it expired worthless, was exercised or closed elsewhere, so it never
 * enters realised P&L.
 */

export type TruthLabel = "ACTUAL BROKER RESULT" | "RECONSTRUCTED" | "UNSETTLED" | "OPEN";

export interface LedgerFee { readonly type: string; readonly value: number }

export interface LedgerOrder {
  readonly accountId: string;
  readonly orderId: string;
  readonly clientOrderId: string | null;
  readonly comboOrderId: string | null;
  readonly comboType: string | null;
  readonly symbol: string;
  readonly instrumentType: string;
  /** One key per instrument: the stock ticker, or "TSLA 2026-06-10 407.5C". */
  readonly instrumentKey: string;
  readonly side: "BUY" | "SELL";
  readonly positionIntent: string | null;
  readonly status: string;
  readonly orderType: string | null;
  readonly quantity: number;
  readonly filledQuantity: number;
  readonly filledPrice: number | null;
  readonly limitPrice: number | null;
  readonly stopPrice: number | null;
  readonly placedAt: string | null;
  readonly filledAt: string | null;
  readonly multiplier: number;
  readonly expiry: string | null;
  readonly strike: number | null;
  readonly right: "C" | "P" | null;
  readonly fees: readonly LedgerFee[];
  readonly feeTotal: number;
  readonly commission: number;
  /** Webull stated fees on this order (a `fees` list or a commission). False = fees UNREPORTED — counted as no fee, said on screen, never "$0 fees". */
  readonly feesReported?: boolean;
}

const num = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const iso = (at: unknown, ms: unknown): string | null => {
  const a = str(at);
  if (a && !Number.isNaN(Date.parse(a))) return new Date(a).toISOString();
  const m = num(ms);
  return m != null && m > 0 ? new Date(m > 1e12 ? m : m * 1000).toISOString() : null;
};
const cents = (x: number) => Math.round(x * 100) / 100;

/** Webull's order-history payload (a list, or `{ data }`) → flat orders, one per order id. */
export function readWebullHistory(payload: unknown, accountId: string): LedgerOrder[] {
  const top = Array.isArray(payload) ? payload : Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  const out: LedgerOrder[] = [];
  for (const g of top) {
    const group = (g ?? {}) as Record<string, unknown>;
    const inner = Array.isArray(group.orders) ? group.orders : [group];
    for (const raw of inner) {
      const o = (raw ?? {}) as Record<string, unknown>;
      const orderId = str(o.order_id);
      const symbol = str(o.symbol);
      const side = (str(o.side) ?? "").toUpperCase();
      if (!orderId || !symbol || (side !== "BUY" && side !== "SELL")) continue;
      const leg = (Array.isArray(o.legs) ? o.legs[0] : null) as Record<string, unknown> | null;
      const rightWord = (str(leg?.option_type) ?? "").toUpperCase();
      const right = rightWord === "CALL" ? "C" : rightWord === "PUT" ? "P" : null;
      const expiry = str(leg?.option_expire_date);
      const strike = num(leg?.strike_price);
      const isOption = right != null && expiry != null && strike != null;
      const multiplier = isOption ? (num(leg?.option_contract_multiplier) ?? 100) : 1;
      const fees: LedgerFee[] = (Array.isArray(o.fees) ? o.fees : []).flatMap(f => {
        const r = (f ?? {}) as Record<string, unknown>;
        const value = num(r.actual_value) ?? num(r.receivable_value);
        return value != null ? [{ type: str(r.type) ?? "FEE", value }] : [];
      });
      const c = (o.commission ?? {}) as Record<string, unknown>;
      const commission = num(c.actual_value) ?? num(c.value) ?? 0;
      out.push({
        accountId,
        orderId,
        clientOrderId: str(o.client_order_id) ?? str(group.client_order_id),
        comboOrderId: str(group.combo_order_id),
        comboType: str(group.combo_type),
        symbol,
        instrumentType: (str(o.instrument_type) ?? (isOption ? "OPTION" : "EQUITY")).toUpperCase(),
        instrumentKey: isOption ? `${symbol} ${expiry} ${strike}${right}` : symbol,
        side,
        positionIntent: str(o.position_intent),
        status: (str(o.status) ?? "UNKNOWN").toUpperCase(),
        orderType: str(o.order_type),
        quantity: num(o.total_quantity) ?? 0,
        filledQuantity: num(o.filled_quantity) ?? 0,
        filledPrice: num(o.filled_price),
        limitPrice: num(o.limit_price),
        stopPrice: num(o.stop_price),
        placedAt: iso(o.place_time_at, o.place_time),
        filledAt: iso(o.filled_time_at, o.filled_time),
        multiplier,
        expiry: isOption ? expiry : null,
        strike: isOption ? strike : null,
        right,
        fees,
        feeTotal: cents(fees.reduce((s, f) => s + f.value, 0)),
        commission,
        feesReported: Array.isArray(o.fees) || num(c.actual_value) != null || num(c.value) != null,
      });
    }
  }
  return out;
}

/** Orders deduped by account + order id (pages overlap), oldest placement first. */
export function dedupeOrders(orders: readonly LedgerOrder[]): LedgerOrder[] {
  const m = new Map<string, LedgerOrder>();
  for (const o of orders) m.set(`${o.accountId}|${o.orderId}`, o);
  return [...m.values()].sort((a, b) => (a.filledAt ?? a.placedAt ?? "").localeCompare(b.filledAt ?? b.placedAt ?? ""));
}

export interface EpisodeFill {
  readonly orderId: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly price: number;
  readonly at: string;
  readonly fees: number;
  readonly orderType: string | null;
  readonly comboType: string | null;
  /** True when Webull stated no fill time and the order's PLACEMENT time stands in (older 2025 orders). */
  readonly atIsPlacement: boolean;
  /** False when the order stated no fees — this fill's fee is UNREPORTED (not $0). */
  readonly feesReported?: boolean;
}

export interface Episode {
  readonly id: string;
  readonly accountId: string;
  readonly instrumentKey: string;
  readonly symbol: string;
  readonly instrumentType: string;
  readonly direction: "LONG" | "SHORT";
  readonly multiplier: number;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly holdMs: number | null;
  readonly maxQuantity: number;
  readonly entries: readonly EpisodeFill[];
  readonly exits: readonly EpisodeFill[];
  readonly avgEntry: number;
  readonly avgExit: number | null;
  /** Cash in minus cash out, before fees. Null while the episode has not closed. */
  readonly gross: number | null;
  readonly fees: number;
  readonly net: number | null;
  /** Money committed at entry (premium × multiplier for a long option). */
  readonly entryCost: number;
  readonly label: TruthLabel;
  readonly note: string | null;
  /** Fills in this round trip whose order stated no fees (their fee is UNREPORTED; `fees` and `net` exclude it). */
  readonly feesUnreportedFills?: number;
}

/**
 * Filled orders → episodes. Per account + instrument, the position is walked
 * fill by fill; an episode opens when it leaves flat and closes when it returns.
 * A fill that crosses through flat closes one episode and opens the next with
 * the remainder.
 */
export function reconstructEpisodes(orders: readonly LedgerOrder[], nowMs: number): Episode[] {
  const fills = dedupeOrders(orders).filter(o => o.status === "FILLED" || (o.filledQuantity > 0 && o.filledPrice != null));
  const byKey = new Map<string, LedgerOrder[]>();
  for (const o of fills) {
    // Older orders (cash 2025-01..05, 145 fills) carry no fill time; placement stands in, flagged.
    if (!(o.filledQuantity > 0) || o.filledPrice == null || !(o.filledAt ?? o.placedAt)) continue;
    const k = `${o.accountId}|${o.instrumentKey}`;
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(o);
  }
  const out: Episode[] = [];
  for (const list of byKey.values()) {
    const at = (o: LedgerOrder) => (o.filledAt ?? o.placedAt)!;
    list.sort((a, b) => at(a).localeCompare(at(b)));
    let pos = 0;
    let cur: { first: LedgerOrder; entries: EpisodeFill[]; exits: EpisodeFill[]; max: number; dir: 1 | -1 } | null = null;
    const close = (closedAt: string | null) => {
      if (!cur) return;
      out.push(finish(cur.first, cur.entries, cur.exits, cur.max, cur.dir, closedAt, nowMs));
      cur = null;
    };
    for (const o of list) {
      const signed = o.side === "BUY" ? 1 : -1;
      let qty = o.filledQuantity;
      const feePer = o.feeTotal / o.filledQuantity;
      while (qty > 0) {
        if (pos === 0) {
          cur = { first: o, entries: [], exits: [], max: 0, dir: signed as 1 | -1 };
        }
        const c = cur!;
        const sameWay = Math.sign(pos) === signed || pos === 0;
        const take = sameWay ? qty : Math.min(qty, Math.abs(pos));
        const fill: EpisodeFill = { orderId: o.orderId, side: o.side, quantity: take, price: o.filledPrice!, at: at(o), fees: cents(feePer * take), orderType: o.orderType, comboType: o.comboType, atIsPlacement: !o.filledAt, feesReported: o.feesReported !== false };
        if (sameWay) c.entries.push(fill); else c.exits.push(fill);
        pos += signed * take;
        c.max = Math.max(c.max, Math.abs(pos));
        qty -= take;
        if (pos === 0) close(at(o));
      }
    }
    if (cur) close(null);
  }
  return out.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}

function finish(first: LedgerOrder, entries: EpisodeFill[], exits: EpisodeFill[], max: number, dir: 1 | -1, closedAt: string | null, nowMs: number): Episode {
  const m = first.multiplier;
  const q = (xs: EpisodeFill[]) => xs.reduce((s, f) => s + f.quantity, 0);
  const v = (xs: EpisodeFill[]) => xs.reduce((s, f) => s + f.quantity * f.price, 0);
  const avgEntry = v(entries) / Math.max(1e-9, q(entries));
  const avgExit = exits.length ? v(exits) / q(exits) : null;
  const fees = cents([...entries, ...exits].reduce((s, f) => s + f.fees, 0));
  const closed = closedAt != null;
  // Long: sold minus bought. Short: the reverse.
  const gross = closed ? cents(dir * (v(exits) - v(entries)) * m) : null;
  const expired = first.expiry != null && Date.parse(`${first.expiry}T21:00:00Z`) < nowMs;
  const label: TruthLabel = closed ? "RECONSTRUCTED" : expired ? "UNSETTLED" : "OPEN";
  const note = closed ? null
    : expired ? `Still open in the order history after its ${first.expiry} expiry — Webull's order history does not state whether it expired, was exercised or closed elsewhere. Not counted in realised P&L.`
    : "Open position — no closing fill yet.";
  const opened = entries[0].at;
  return {
    id: `${first.accountId}|${first.instrumentKey}|${opened}`,
    accountId: first.accountId,
    instrumentKey: first.instrumentKey,
    symbol: first.symbol,
    instrumentType: first.instrumentType,
    direction: dir === 1 ? "LONG" : "SHORT",
    multiplier: m,
    openedAt: opened,
    closedAt,
    holdMs: closed ? Date.parse(closedAt!) - Date.parse(opened) : null,
    maxQuantity: max,
    entries,
    exits,
    avgEntry,
    avgExit,
    gross,
    fees,
    net: gross == null ? null : cents(gross - fees),
    entryCost: cents(v(entries) * m),
    label,
    note,
    feesUnreportedFills: [...entries, ...exits].filter(f => f.feesReported === false).length,
  };
}

export interface LedgerBucket { readonly key: string; readonly trades: number; readonly wins: number; readonly net: number; readonly fees: number }

export interface LedgerSummary {
  readonly closed: number;
  readonly open: number;
  readonly unsettled: number;
  /** Premium paid into LONG options still open past expiry — the most they could have lost. */
  readonly unsettledCost: number;
  /** SHORT positions open past expiry: a sell with no matching buy in the history (a gap, not a strategy, unless the trader sells options). */
  readonly unsettledShort: number;
  readonly wins: number;
  readonly losses: number;
  readonly scratches: number;
  readonly winRate: number | null;
  readonly gross: number;
  readonly fees: number;
  readonly net: number;
  readonly avgWin: number | null;
  readonly avgLoss: number | null;
  /** Mean net per closed trade. */
  readonly expectancy: number | null;
  readonly profitFactor: number | null;
  readonly largestWin: number | null;
  readonly largestLoss: number | null;
  /** Deepest peak-to-trough fall of cumulative net, closed trades in close order. */
  readonly maxDrawdown: number;
  readonly equity: readonly { readonly at: string; readonly cum: number }[];
  readonly byMonth: readonly LedgerBucket[];
  readonly bySymbol: readonly LedgerBucket[];
  readonly byAccount: readonly LedgerBucket[];
  readonly firstFillAt: string | null;
  readonly lastFillAt: string | null;
  /** Closed round trips with at least one fill whose fee Webull did not state. */
  readonly feesUnreportedTrades?: number;
}

function bucket(rows: readonly Episode[], keyOf: (e: Episode) => string): LedgerBucket[] {
  const m = new Map<string, { trades: number; wins: number; net: number; fees: number }>();
  for (const e of rows) {
    const k = keyOf(e);
    const b = m.get(k) ?? { trades: 0, wins: 0, net: 0, fees: 0 };
    b.trades++; if ((e.net ?? 0) > 0) b.wins++; b.net += e.net ?? 0; b.fees += e.fees;
    m.set(k, b);
  }
  return [...m.entries()].map(([key, b]) => ({ key, trades: b.trades, wins: b.wins, net: cents(b.net), fees: cents(b.fees) }));
}

const NY_MONTH = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" });
/** "2026-09" — the New York month of an instant. */
export function nyMonth(iso: string): string {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? NY_MONTH.format(new Date(t)).slice(0, 7) : iso.slice(0, 7);
}

/** The round-trip pairing, said on screen: Webull's order history links no close to an open. */
export const WEBULL_PAIRING_TRUTH = "round trips PAIRED BY WM flat-to-flat from Webull's fills in time order — Webull's order history does not link a close to its open";

/**
 * How much history was read, per account, in days — so the page says "read N days" and never
 * implies the account's whole life. `askedBackTo` is the walk's own floor; WM asks Webull up to
 * tomorrow because Webull's end date is exclusive, so today is included.
 */
export function ledgerCoverageLine(row: { readonly askedBackTo: string; readonly stoppedBecause: string; readonly reason?: string | null }, todayMs: number): string {
  const from = Date.parse(`${row.askedBackTo}T00:00:00Z`);
  const todayUtc = Date.parse(`${new Date(todayMs).toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Number.isFinite(from) ? Math.max(0, Math.round((todayUtc - from) / 86_400_000)) + 1 : null;
  const why = row.stoppedBecause === "QUIET_YEARS" ? "two quiet years before that"
    : row.stoppedBecause === "REFUSED" ? `Webull refused${row.reason ? ` (${row.reason})` : ""} — older history NOT read`
    : row.stoppedBecause === "PAGE_BUDGET" ? "page budget reached — older history NOT read"
    : row.stoppedBecause === "FLOOR" ? "the walk's floor" : row.stoppedBecause;
  return `read ${days == null ? "an unknown number of" : days} days of history, back to ${row.askedBackTo || "—"} (today included) · stopped: ${why}`;
}

export function summarizeLedger(episodes: readonly Episode[]): LedgerSummary {
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED").sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
  const wins = closed.filter(e => e.net! > 0), losses = closed.filter(e => e.net! < 0);
  const sum = (xs: readonly Episode[], f: (e: Episode) => number) => xs.reduce((s, e) => s + f(e), 0);
  const winSum = sum(wins, e => e.net!), lossSum = sum(losses, e => e.net!);
  let cum = 0, peak = 0, dd = 0;
  const equity = closed.map(e => { cum += e.net!; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); return { at: e.closedAt!, cum: cents(cum) }; });
  const unsettled = episodes.filter(e => e.label === "UNSETTLED");
  const allFills = episodes.flatMap(e => [...e.entries, ...e.exits]).map(f => f.at).sort();
  return {
    closed: closed.length,
    open: episodes.filter(e => e.label === "OPEN").length,
    unsettled: unsettled.length,
    unsettledCost: cents(sum(unsettled.filter(e => e.direction === "LONG"), e => e.entryCost)),
    unsettledShort: unsettled.filter(e => e.direction === "SHORT").length,
    wins: wins.length,
    losses: losses.length,
    scratches: closed.length - wins.length - losses.length,
    winRate: closed.length ? wins.length / closed.length : null,
    gross: cents(sum(closed, e => e.gross!)),
    fees: cents(sum(closed, e => e.fees)),
    net: cents(sum(closed, e => e.net!)),
    avgWin: wins.length ? cents(winSum / wins.length) : null,
    avgLoss: losses.length ? cents(lossSum / losses.length) : null,
    expectancy: closed.length ? cents(sum(closed, e => e.net!) / closed.length) : null,
    profitFactor: lossSum < 0 ? Math.round((winSum / -lossSum) * 100) / 100 : null,
    largestWin: wins.length ? Math.max(...wins.map(e => e.net!)) : null,
    largestLoss: losses.length ? Math.min(...losses.map(e => e.net!)) : null,
    maxDrawdown: cents(dd),
    equity,
    // The trader's market month (New York), not the UTC month: a close at 19:30 ET on the 31st is that month's.
    byMonth: bucket(closed, e => nyMonth(e.closedAt!)).sort((a, b) => a.key.localeCompare(b.key)),
    bySymbol: bucket(closed, e => e.symbol).sort((a, b) => a.net - b.net),
    byAccount: bucket(closed, e => e.accountId.slice(-4)),
    firstFillAt: allFills[0] ?? null,
    lastFillAt: allFills[allFills.length - 1] ?? null,
    feesUnreportedTrades: closed.filter(e => (e.feesUnreportedFills ?? 0) > 0).length,
  };
}
