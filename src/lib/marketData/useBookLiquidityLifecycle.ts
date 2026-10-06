"use client";

/**
 * The observed-book Liquidity Lifecycle for the chart's symbol — Kraken's
 * public book (depth 100) and trades, for the crypto pairs Kraken lists.
 *
 * Returns null when the symbol has no Kraken pair, when `enabled` is false,
 * or before the first book snapshot: the room then keeps the candle reading
 * with its PULLED refusal. Nothing here is persisted (GP12 §21: consumption
 * is not storage) — the tracker lives in memory for this page only.
 *
 * The book is maintained exactly as Kraken v2 documents: a snapshot, then
 * deltas where qty 0 removes a level, truncated back to the subscribed depth
 * after every update (levels beyond the depth are no longer maintained).
 */

import { useEffect, useRef, useState } from "react";
import { owned, readOwned, UNOWNED, type Owned } from "@/lib/marketData/symbolOwned";

import { KRAKEN_WS_URL } from "@/lib/api/kraken";
import type { LiquidityLifecycleVM } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import { createBookLifecycleTracker, krakenBookPairForChart, type BookLevel, type BookLifecycleTracker } from "@/lib/marketData/bookLiquidityLifecycle";

export const BOOK_DEPTH = 100;
const PUBLISH_MS = 1_000;

export function useBookLiquidityLifecycle(symbol: string, enabled: boolean, step: number): LiquidityLifecycleVM | null {
  // Stored WITH its pair + bucket: a switch never paints the previous book.
  const [ownedVm, setOwnedVm] = useState<Owned<LiquidityLifecycleVM>>(UNOWNED);
  const trackerRef = useRef<BookLifecycleTracker | null>(null);
  const pair = enabled ? krakenBookPairForChart(symbol) : null;
  // The bucket is fixed per connection; a changed step reopens the reading.
  const stepKey = Number.isFinite(step) && step > 0 ? +step.toPrecision(3) : 0;

  useEffect(() => {
    setOwnedVm(UNOWNED);
    if (!pair || !stepKey || typeof WebSocket === "undefined") { trackerRef.current = null; return; }
    const tracker = createBookLifecycleTracker({ step: stepKey, venue: "Kraken" });
    trackerRef.current = tracker;
    const bids = new Map<number, number>();
    const asks = new Map<number, number>();
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let snapshotSeen = false;

    const truncate = (m: Map<number, number>, desc: boolean) => {
      if (m.size <= BOOK_DEPTH) return;
      const keep = [...m.keys()].sort((a, b) => (desc ? b - a : a - b)).slice(0, BOOK_DEPTH);
      const keepSet = new Set(keep);
      for (const k of [...m.keys()]) if (!keepSet.has(k)) m.delete(k);
    };
    const levels = (m: Map<number, number>): BookLevel[] => [...m.entries()].map(([price, size]) => ({ price, size }));
    const apply = (m: Map<number, number>, rows: unknown) => {
      if (!Array.isArray(rows)) return;
      for (const r of rows as { price?: unknown; qty?: unknown }[]) {
        const p = Number(r.price), q = Number(r.qty);
        if (!Number.isFinite(p) || !Number.isFinite(q)) continue;
        if (q === 0) m.delete(p); else m.set(p, q);
      }
    };

    const open = () => {
      if (closed) return;
      ws = new WebSocket(KRAKEN_WS_URL);
      ws.onopen = () => {
        ws?.send(JSON.stringify({ method: "subscribe", params: { channel: "book", symbol: [pair], depth: BOOK_DEPTH } }));
        ws?.send(JSON.stringify({ method: "subscribe", params: { channel: "trade", symbol: [pair] } }));
      };
      ws.onmessage = (ev) => {
        let msg: { channel?: string; type?: string; data?: unknown[] };
        try { msg = JSON.parse(String(ev.data)); } catch { return; }
        const now = Date.now();
        if (msg.channel === "book" && Array.isArray(msg.data) && msg.data[0]) {
          const d = msg.data[0] as { bids?: unknown; asks?: unknown };
          if (msg.type === "snapshot") { bids.clear(); asks.clear(); snapshotSeen = true; }
          if (!snapshotSeen) return;
          apply(bids, d.bids);
          apply(asks, d.asks);
          truncate(bids, true);
          truncate(asks, false);
          tracker.applyBook(now, levels(bids), levels(asks));
        } else if (msg.channel === "trade" && Array.isArray(msg.data)) {
          for (const t of msg.data as { price?: unknown; qty?: unknown; timestamp?: unknown }[]) {
            const at = typeof t.timestamp === "string" ? Date.parse(t.timestamp) : now;
            tracker.applyTrade(Number.isFinite(at) ? at : now, Number(t.price), Number(t.qty));
          }
        }
      };
      ws.onclose = () => {
        if (closed) return;
        // A reconnect starts a fresh book: deltas across a gap are not trusted.
        snapshotSeen = false;
        retry = setTimeout(open, 3_000);
      };
      ws.onerror = () => { try { ws?.close(); } catch { /* closing */ } };
    };
    open();
    const publish = setInterval(() => {
      if (snapshotSeen && trackerRef.current === tracker) setOwnedVm(owned(`${pair}|${stepKey}`, tracker.read(Date.now())));
    }, PUBLISH_MS);
    return () => {
      closed = true;
      clearInterval(publish);
      if (retry) clearTimeout(retry);
      try { ws?.close(); } catch { /* closing */ }
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, [pair, stepKey]);

  return pair ? readOwned(ownedVm, `${pair}|${stepKey}`) : null;
}
