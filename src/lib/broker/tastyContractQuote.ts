/**
 * CANONICAL DERIVATIVE CONTRACT QUOTE — Garden 18 §LI–§LIV.
 *
 * tastytrade's DXLink stream, read by its own guide
 * (developer.tastytrade.com/docs/guides/stream-market-data): Quote, Trade,
 * Greeks and Summary events in COMPACT format, keyed by the chain's
 * `streamer-symbol` (`./EWZ26C4750:XCME`, `/ESZ26:XCME`, `.SPY261002C305`) —
 * never a symbol assembled here.
 *
 * One state per streamer symbol combines quote, last, Greeks, summary and
 * freshness. Every consumer (chain row, contract lens, preflight) reads the
 * same object. A missing value is never blank: `quoteWords` names why.
 *
 * PURE: no socket, no secret. The socket owner is tastyQuoteStream.ts.
 */

import { DXLINK_FEED_CHANNEL, type DxlinkFrame } from "@/lib/marketData/dxlinkProtocol";

/** Field order IS the COMPACT decoder's contract — one owner per event type. */
export const CONTRACT_EVENT_FIELDS = {
  Quote: ["eventType", "eventSymbol", "bidPrice", "askPrice", "bidSize", "askSize"],
  Trade: ["eventType", "eventSymbol", "price", "dayVolume", "size", "time"],
  // Extended-hours trades (dxFeed TradeETH) — the after-hours last the chart
  // prints; without it the watch lane held the regular close (§LXXXIX).
  TradeETH: ["eventType", "eventSymbol", "price", "dayVolume", "size", "time"],
  Greeks: ["eventType", "eventSymbol", "price", "volatility", "delta", "gamma", "theta", "rho", "vega"],
  Summary: ["eventType", "eventSymbol", "openInterest", "dayOpenPrice", "dayHighPrice", "dayLowPrice", "prevDayClosePrice"],
  // Every print, with the exchange-reported aggressor (BUY / SELL / UNDEFINED).
  // Proven on the owner's live socket 2026-10-01: `/ESZ26:XCME` 7766 × 1 BUY at 7765.75 / 7766.
  // `sequence` makes (time, sequence) the print's identity, so a print heard
  // live and again in a history snapshot folds once.
  TimeAndSale: ["eventType", "eventSymbol", "time", "sequence", "price", "size", "aggressorSide", "bidPrice", "askPrice"],
  // History bars by snapshot (see adapters/tastytradeCandles.ts for the receipts).
  Candle: ["eventType", "eventSymbol", "eventFlags", "time", "open", "high", "low", "close", "volume"],
} as const;

export type ContractEventType = keyof typeof CONTRACT_EVENT_FIELDS;
/** What a quoted contract subscribes to. The print tape is opt-in per symbol (TAPE_EVENT_TYPE). */
export const CONTRACT_EVENT_TYPES: ContractEventType[] = ["Quote", "Trade", "TradeETH", "Greeks", "Summary"];
export const TAPE_EVENT_TYPE: ContractEventType = "TimeAndSale";
/** Fields carried as text, never coerced to numbers. */
const TEXT_FIELDS: ReadonlySet<string> = new Set(["aggressorSide"]);

export function buildContractFeedSetupFrame(): DxlinkFrame {
  return {
    type: "FEED_SETUP",
    channel: DXLINK_FEED_CHANNEL,
    acceptAggregationPeriod: 0.25,
    acceptDataFormat: "COMPACT",
    acceptEventFields: Object.fromEntries((Object.keys(CONTRACT_EVENT_FIELDS) as ContractEventType[]).map(t => [t, [...CONTRACT_EVENT_FIELDS[t]]])),
  };
}

/** Add and/or remove streamer symbols for the given event types (default: the quote set), in one frame. */
export function buildContractSubscriptionFrame(add: readonly string[], remove: readonly string[] = [], reset = false, types: readonly ContractEventType[] = CONTRACT_EVENT_TYPES): DxlinkFrame {
  const clean = (xs: readonly string[]) => Array.from(new Set(xs.map(s => s.trim()).filter(Boolean)));
  const rows = (xs: readonly string[]) => clean(xs).flatMap(symbol => types.map(type => ({ type, symbol })));
  const frame: Record<string, unknown> = { type: "FEED_SUBSCRIPTION", channel: DXLINK_FEED_CHANNEL };
  if (reset) frame.reset = true;
  if (add.length) frame.add = rows(add);
  if (remove.length) frame.remove = rows(remove);
  return frame as DxlinkFrame;
}

export interface ContractEvent {
  readonly type: ContractEventType;
  readonly symbol: string;
  readonly values: Readonly<Record<string, number | null>>;
  readonly text: Readonly<Record<string, string | null>>;
}

const toNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * COMPACT FEED_DATA: `data` is `[type, [flat values…], type, [flat values…]]`
 * (or one `[type, [...]]` pair); each flat list repeats the declared fields.
 */
export function decodeCompactFeedData(data: unknown): ContractEvent[] {
  if (!Array.isArray(data)) return [];
  const out: ContractEvent[] = [];
  for (let i = 0; i + 1 < data.length; i += 2) {
    const type = data[i];
    const flat = data[i + 1];
    if (typeof type !== "string" || !Array.isArray(flat) || !(type in CONTRACT_EVENT_FIELDS)) continue;
    const fields = CONTRACT_EVENT_FIELDS[type as ContractEventType];
    for (let j = 0; j + fields.length <= flat.length; j += fields.length) {
      const symbol = flat[j + 1];
      if (typeof symbol !== "string") continue;
      const values: Record<string, number | null> = {};
      const text: Record<string, string | null> = {};
      for (let k = 2; k < fields.length; k++) {
        const f = fields[k];
        if (TEXT_FIELDS.has(f)) text[f] = typeof flat[j + k] === "string" ? (flat[j + k] as string) : null;
        else values[f] = toNum(flat[j + k]);
      }
      out.push({ type: type as ContractEventType, symbol, values, text });
    }
  }
  return out;
}

export interface ContractQuoteState {
  readonly symbol: string;
  readonly bid: number | null;
  readonly ask: number | null;
  readonly bidSize: number | null;
  readonly askSize: number | null;
  readonly last: number | null;
  readonly dayVolume: number | null;
  readonly iv: number | null;
  readonly delta: number | null;
  readonly gamma: number | null;
  readonly theta: number | null;
  readonly vega: number | null;
  readonly openInterest: number | null;
  readonly prevClose: number | null;
  /** When WM Pro received the last Quote for this symbol (epoch ms). */
  readonly quoteAt: number | null;
  readonly tradeAt: number | null;
  /** The exchange's own time of the trade `last` came from (epoch ms), when it said. */
  readonly tradeTime?: number | null;
  readonly greeksAt: number | null;
}

export function emptyContractQuote(symbol: string): ContractQuoteState {
  return { symbol, bid: null, ask: null, bidSize: null, askSize: null, last: null, dayVolume: null, iv: null, delta: null, gamma: null, theta: null, vega: null, openInterest: null, prevClose: null, quoteAt: null, tradeAt: null, greeksAt: null };
}

/** Fold one event into its symbol's state. A null field never erases a known one. */
export function applyContractEvent(prev: ContractQuoteState, e: ContractEvent, nowMs: number): ContractQuoteState {
  const v = e.values;
  const keep = (next: number | null | undefined, old: number | null) => (next == null ? old : next);
  switch (e.type) {
    case "Quote": {
      // dxFeed sends 0/NaN for an empty side; an empty side is "no bid", not a price of 0.
      const side = (x: number | null | undefined) => (x != null && x > 0 ? x : null);
      return { ...prev, bid: side(v.bidPrice), ask: side(v.askPrice), bidSize: v.bidSize ?? null, askSize: v.askSize ?? null, quoteAt: nowMs };
    }
    case "Trade":
    case "TradeETH": {
      // The NEWER trade is the last, by the exchange's own clock: a regular-
      // session snapshot never overwrites a later extended-hours print.
      const t = v.time != null && v.time > 0 ? v.time : null;
      if (t != null && prev.tradeTime != null && t < prev.tradeTime) return { ...prev, dayVolume: e.type === "Trade" ? keep(v.dayVolume, prev.dayVolume) : prev.dayVolume };
      return { ...prev, last: keep(v.price, prev.last), dayVolume: e.type === "Trade" ? keep(v.dayVolume, prev.dayVolume) : prev.dayVolume, tradeAt: nowMs, tradeTime: t ?? prev.tradeTime ?? null };
    }
    case "Greeks":
      return { ...prev, iv: keep(v.volatility, prev.iv), delta: keep(v.delta, prev.delta), gamma: keep(v.gamma, prev.gamma), theta: keep(v.theta, prev.theta), vega: keep(v.vega, prev.vega), greeksAt: nowMs };
    case "Summary":
      return { ...prev, openInterest: keep(v.openInterest, prev.openInterest), prevClose: keep(v.prevDayClosePrice, prev.prevClose) };
    case "TimeAndSale":
      return { ...prev, last: keep(v.price, prev.last), tradeAt: nowMs };
    case "Candle":
      return prev;
  }
}

export type StreamState = "IDLE" | "CONNECTING" | "LIVE" | "DEGRADED" | "NOT_CONNECTED" | "NOT_OWNER";

export const STALE_QUOTE_MS = 15_000;

export interface ContractQuoteReading {
  readonly mark: number | null;
  readonly spread: number | null;
  readonly spreadPct: number | null;
  readonly ageMs: number | null;
  /** The human word for this contract's quote right now — never blank. */
  readonly state: "LIVE" | "ONE-SIDED" | "STALE" | "WAITING FOR QUOTE" | "STREAM DEGRADED" | "NOT CONNECTED";
}

export function readContractQuote(q: ContractQuoteState | undefined, stream: StreamState, nowMs: number): ContractQuoteReading {
  const none = { mark: null, spread: null, spreadPct: null, ageMs: null } as const;
  if (stream === "NOT_CONNECTED" || stream === "NOT_OWNER") return { ...none, state: "NOT CONNECTED" };
  if (!q || q.quoteAt == null) return { ...none, state: stream === "DEGRADED" ? "STREAM DEGRADED" : "WAITING FOR QUOTE" };
  const ageMs = Math.max(0, nowMs - q.quoteAt);
  const two = q.bid != null && q.ask != null;
  const mark = two ? (q.bid! + q.ask!) / 2 : null;
  const spread = two ? q.ask! - q.bid! : null;
  const spreadPct = two && mark! > 0 ? (spread! / mark!) * 100 : null;
  const state = stream === "DEGRADED" ? "STREAM DEGRADED" : !two ? "ONE-SIDED" : ageMs > STALE_QUOTE_MS && stream !== "LIVE" ? "STALE" : "LIVE";
  return { mark, spread, spreadPct, ageMs, state };
}
