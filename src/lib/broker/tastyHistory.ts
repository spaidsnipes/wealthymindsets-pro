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

const FIELDS = ["eventType", "eventSymbol", "eventFlags", "time", "sequence", "price", "size", "aggressorSide", "bidPrice", "askPrice"] as const;
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

export async function fetchTastyTimeAndSales(
  streamer: string | readonly string[],
  fromTime: number,
  opts: { readonly timeoutMs?: number; readonly maxEvents?: number; readonly signal?: AbortSignal } = {},
): Promise<TastyPrintHistory | null> {
  let tok: { state?: string; token?: string; dxlinkUrl?: string } | null = null;
  try {
    const a = await fetchQuoteToken(opts.signal);
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
    const symbols = typeof streamer === "string" ? [streamer] : [...streamer];
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
    opts.signal?.addEventListener("abort", () => finish(false));
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
                values: { time: num(flat[j + 3]), sequence: num(flat[j + 4]), price: num(flat[j + 5]), size: num(flat[j + 6]), bidPrice: num(flat[j + 8]), askPrice: num(flat[j + 9]) },
                text: { aggressorSide: typeof flat[j + 7] === "string" ? (flat[j + 7] as string) : null },
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
