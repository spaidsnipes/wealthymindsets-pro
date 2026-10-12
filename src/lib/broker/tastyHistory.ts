"use client";

/**
 * TASTYTRADE PRINT HISTORY — a ONE-SHOT snapshot, not a stream.
 *
 * Receipt (owner's socket, 2026-10-01): TimeAndSale for /MNQZ26:XCME with a
 * `fromTime` 30 minutes back answered 1,061 prints, 1,060 carrying the
 * exchange's aggressor side, opened by eventFlags 4 and closed by 10.
 *
 * WHY A SEPARATE, SHORT-LIVED CONNECTION. Re-subscribing the live tape symbol
 * with a `fromTime` on the shared socket would REPLACE its live subscription,
 * and removing it after the snapshot would silence the live tape. So history is
 * fetched like a REST call: open, authorize, take the snapshot, close. The live
 * stream keeps its one owner (tastyQuoteStream).
 */

import { fetchQuoteToken } from "./tastyQuoteTokenClient";
import type { ContractEvent } from "@/lib/broker/tastyContractQuote";
import { isSnapshotEnd } from "@/lib/marketData/adapters/tastytradeCandles";

const FIELDS = ["eventType", "eventSymbol", "eventFlags", "time", "sequence", "price", "size", "aggressorSide", "bidPrice", "askPrice", "type", "spreadLeg"] as const;
const CHANNEL = 7;

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export interface TastyPrintHistory {
  readonly events: readonly ContractEvent[];
  /** True only when tastytrade closed an UNTRIMMED snapshot; false on snip, timeout or cap. */
  readonly complete: boolean;
}

/**
 * ONE HISTORY READ PER CONTRACT SET (2026-10-12). The chart's backfill and the price hook's ring seed each
 * opened their own one-shot DXLink socket for the same contract on every futures load (a 4-screen desk: eight).
 * tastytrade answers at most ~1,000 prints whatever the window, so a caller whose window is COVERED by a read
 * already in flight joins it and keeps only its own window. The shared read carries no caller's abort signal —
 * each caller stops LISTENING on its own — so one unmounting chart cannot cancel another's history.
 */
const inflight = new Map<string, { readonly fromTime: number; readonly promise: Promise<TastyPrintHistory | null> }>();
/**
 * A FINISHED read is kept this long (measured on serving 8b104b6: the hook's seed finished in ~1 s and the
 * chart's backfill asked ~1 s later, so there was nothing in flight to join and it opened its own socket).
 * Prints after the read reach both callers through the live subscription that is already open.
 */
export const TASTY_HISTORY_REUSE_MS = 20_000;

export function fetchTastyTimeAndSales(
  streamer: string | readonly string[],
  fromTime: number,
  opts: { readonly timeoutMs?: number; readonly maxEvents?: number; readonly signal?: AbortSignal } = {},
): Promise<TastyPrintHistory | null> {
  const symbols = typeof streamer === "string" ? [streamer] : [...streamer];
  const key = `${[...symbols].sort().join(",")}|${opts.maxEvents ?? 60_000}|${opts.timeoutMs ?? 15_000}`;
  const pending = inflight.get(key);
  let shared: Promise<TastyPrintHistory | null>;
  if (pending && pending.fromTime <= fromTime) {
    shared = pending.promise.then(h => (h ? { events: h.events.filter(e => (e.values.time ?? 0) >= fromTime), complete: h.complete } : null));
  } else {
    shared = openTimeAndSales(symbols, fromTime, { timeoutMs: opts.timeoutMs, maxEvents: opts.maxEvents });
    inflight.set(key, { fromTime, promise: shared });
    // A null (failed) read is let go at once; a real one stays joinable for TASTY_HISTORY_REUSE_MS.
    void shared.then(h => {
      const drop = () => { if (inflight.get(key)?.promise === shared) inflight.delete(key); };
      if (!h) drop(); else setTimeout(drop, TASTY_HISTORY_REUSE_MS);
    }, () => { if (inflight.get(key)?.promise === shared) inflight.delete(key); });
  }
  const signal = opts.signal;
  if (!signal) return shared;
  if (signal.aborted) return Promise.resolve(null);
  return Promise.race([shared, new Promise<null>(res => signal.addEventListener("abort", () => res(null), { once: true }))]);
}

/** Test seam: forget every read in flight. */
export function resetTastyHistoryForTest(): void { inflight.clear(); }

async function openTimeAndSales(
  streamer: readonly string[],
  fromTime: number,
  opts: { readonly timeoutMs?: number; readonly maxEvents?: number } = {},
): Promise<TastyPrintHistory | null> {
  let tok: { state?: string; token?: string; dxlinkUrl?: string } | null = null;
  try {
    const a = await fetchQuoteToken();
    if (a.status !== 200) return null;
    tok = a.body;
  } catch { return null; }
  if (tok?.state !== "OK" || !tok.token || !tok.dxlinkUrl) return null;
  const token = tok.token;
  const maxEvents = opts.maxEvents ?? 60_000;

  return new Promise(resolve => {
    const events: ContractEvent[] = [];
    // Several contracts on one connection (options flow, 2026-10-05): the
    // snapshot is whole when EVERY symbol has closed its own.
    const symbols = [...streamer];
    const ended = new Set<string>();
    let done = false;
    let snipped = false;
    const ws = new WebSocket(tok!.dxlinkUrl!);
    const finish = (complete: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* closed */ }
      resolve({ events, complete });
    };
    const timer = setTimeout(() => finish(false), opts.timeoutMs ?? 15_000);
    const send = (f: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(f)); };
    ws.onopen = () => send({ type: "SETUP", channel: 0, version: "0.1-DXF-JS/0.3.0", keepaliveTimeout: 60, acceptKeepaliveTimeout: 60 });
    ws.onerror = () => finish(false);
    ws.onmessage = ev => {
      let m: { type?: string; channel?: number; state?: string; data?: unknown };
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.type === "AUTH_STATE" && m.state === "UNAUTHORIZED") send({ type: "AUTH", channel: 0, token });
      else if (m.type === "AUTH_STATE" && m.state === "AUTHORIZED") send({ type: "CHANNEL_REQUEST", channel: CHANNEL, service: "FEED", parameters: { contract: "AUTO" } });
      else if (m.type === "CHANNEL_OPENED" && m.channel === CHANNEL) {
        send({ type: "FEED_SETUP", channel: CHANNEL, acceptAggregationPeriod: 0, acceptDataFormat: "COMPACT", acceptEventFields: { TimeAndSale: [...FIELDS] } });
        send({ type: "FEED_SUBSCRIPTION", channel: CHANNEL, reset: true, add: symbols.map(symbol => ({ type: "TimeAndSale", symbol, fromTime })) });
      } else if (m.type === "FEED_DATA" && Array.isArray(m.data)) {
        const d = m.data as unknown[];
        for (let i = 0; i + 1 < d.length; i += 2) {
          if (d[i] !== "TimeAndSale" || !Array.isArray(d[i + 1])) continue;
          const flat = d[i + 1] as unknown[];
          for (let j = 0; j + FIELDS.length <= flat.length; j += FIELDS.length) {
            const flags = num(flat[j + 2]);
            const symbol = flat[j + 1];
            if (typeof symbol === "string") {
              events.push({
                type: "TimeAndSale",
                symbol,
                values: { time: num(flat[j + 3]), sequence: num(flat[j + 4]), price: num(flat[j + 5]), size: num(flat[j + 6]), bidPrice: num(flat[j + 8]), askPrice: num(flat[j + 9]), spreadLeg: flat[j + 11] === true ? 1 : flat[j + 11] === false ? 0 : num(flat[j + 11]) },
                text: { aggressorSide: typeof flat[j + 7] === "string" ? (flat[j + 7] as string) : null, type: typeof flat[j + 10] === "string" ? (flat[j + 10] as string) : null },
              });
            }
            // SNAPSHOT_SNIP (0x10): tastytrade trimmed the history (measured:
            // ~1,000 prints, so ~2 minutes of NQ at the open). That is a
            // PARTIAL window, never a complete one.
            if (flags != null && (flags & 0x10) !== 0) snipped = true;
            if (isSnapshotEnd(flags) && typeof symbol === "string") {
              ended.add(symbol);
              if (ended.size >= symbols.length) { finish(!snipped); return; }
            }
            if (events.length >= maxEvents) { finish(false); return; }
          }
        }
      }
    };
  });
}
