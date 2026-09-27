/**
 * WEBULL REAL-TIME PAYLOADS, DECODED BY WEBULL'S OWN SCHEMA.
 *
 * The /api/market-data/webull/stream route forwards each MQTT PUBLISH body
 * as-is (a protobuf message, carried as a byte string: one char per byte).
 * The schema is Webull's (SDK 3.0.2, webull/data/quotes/subscribe/message.proto):
 *
 *   Basic    { 1 symbol, 2 instrument_id, 3 timestamp, 4 trading_session }
 *   Snapshot { 1 basic, 2 trade_time, 3 price, 4 open, 5 high, 6 low,
 *              7 pre_close, 8 volume, 9 change, 10 change_ratio, … }
 *   Quote    { 1 basic, 2 asks[], 3 bids[] }       AskBid { 1 price, 2 size, … }
 *   Tick     { 1 basic, 2 time, 3 price, 4 volume, 5 side }
 *
 * Every scalar is a STRING field in Webull's schema, so the decoder reads only
 * wire types 0 (varint, skipped) and 2 (length-delimited). A field it cannot
 * read makes the whole message null — a half-decoded price is not a price.
 *
 * Nothing here stores anything (GP12 §21). PURE.
 */

type Fields = Map<number, string[]>;

function readVarint(b: string, i: { p: number }): number | null {
  let result = 0, shift = 0;
  while (i.p < b.length) {
    const byte = b.charCodeAt(i.p++);
    if (byte > 0xff) return null;
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return result;
    shift += 7;
    if (shift > 49) return null;
  }
  return null;
}

/** One protobuf message's length-delimited fields, by number; null when the bytes are not a message. */
function fieldsOf(b: string): Fields | null {
  const out: Fields = new Map();
  const i = { p: 0 };
  while (i.p < b.length) {
    const key = readVarint(b, i);
    if (key == null) return null;
    const field = Math.floor(key / 8), wire = key % 8;
    if (wire === 0) { if (readVarint(b, i) == null) return null; continue; }
    if (wire !== 2) return null;
    const len = readVarint(b, i);
    if (len == null || i.p + len > b.length) return null;
    const v = b.slice(i.p, i.p + len);
    i.p += len;
    const arr = out.get(field) ?? [];
    arr.push(v);
    out.set(field, arr);
  }
  return out;
}

const num = (s: string | undefined): number | null => {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export interface WebullBasic {
  readonly symbol: string;
  /** Webull's own timestamp for the message, epoch ms. */
  readonly atMs: number | null;
  readonly session: string | null;
}

function basicOf(raw: string | undefined): WebullBasic | null {
  if (raw == null) return null;
  const f = fieldsOf(raw);
  const symbol = f?.get(1)?.[0];
  if (!f || !symbol) return null;
  return { symbol, atMs: num(f.get(3)?.[0]), session: f.get(4)?.[0] ?? null };
}

export interface WebullSnapshotFrame {
  readonly kind: "SNAPSHOT";
  readonly basic: WebullBasic;
  readonly price: number | null;
  readonly open: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly preClose: number | null;
  readonly volume: number | null;
}

export interface WebullQuoteFrame {
  readonly kind: "QUOTE";
  readonly basic: WebullBasic;
  readonly ask: { readonly price: number; readonly size: number | null } | null;
  readonly bid: { readonly price: number; readonly size: number | null } | null;
}

export interface WebullTickFrame {
  readonly kind: "TICK";
  readonly basic: WebullBasic;
  readonly price: number | null;
  readonly volume: number | null;
  readonly side: string | null;
}

export type WebullFrame = WebullSnapshotFrame | WebullQuoteFrame | WebullTickFrame;

function level(raw: string | undefined): { price: number; size: number | null } | null {
  if (raw == null) return null;
  const f = fieldsOf(raw);
  const price = num(f?.get(1)?.[0]);
  return f && price != null ? { price, size: num(f.get(2)?.[0]) } : null;
}

/** Decode one forwarded frame by its MQTT topic; null when it is not a well-formed message of that kind. */
export function decodeWebullFrame(topic: string, payload: string): WebullFrame | null {
  const f = fieldsOf(payload);
  if (!f) return null;
  const basic = basicOf(f.get(1)?.[0]);
  if (!basic) return null;
  switch (topic.toLowerCase()) {
    case "snapshot":
      return {
        kind: "SNAPSHOT", basic,
        price: num(f.get(3)?.[0]), open: num(f.get(4)?.[0]), high: num(f.get(5)?.[0]),
        low: num(f.get(6)?.[0]), preClose: num(f.get(7)?.[0]), volume: num(f.get(8)?.[0]),
      };
    case "quote":
      return { kind: "QUOTE", basic, ask: level(f.get(2)?.[0]), bid: level(f.get(3)?.[0]) };
    case "tick":
      return { kind: "TICK", basic, price: num(f.get(3)?.[0]), volume: num(f.get(4)?.[0]), side: f.get(5)?.[0] ?? null };
    default:
      return null;
  }
}
