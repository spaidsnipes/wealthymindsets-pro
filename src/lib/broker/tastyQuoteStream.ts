"use client";

/**
 * THE ONE TASTYTRADE MARKET-DATA STREAM — Garden 18 §LI ("One streaming owner.
 * Many consumers. No independent React WebSockets per component.").
 *
 * One DXLink socket per tab. Consumers subscribe streamer symbols with a
 * refcount; the socket is opened on the first subscriber and closed shortly
 * after the last leaves. Frames come from dxlinkProtocol / tastyContractQuote,
 * the token from the owner-gated /api/broker/tastytrade/quote-token route.
 * State is a plain store read through useSyncExternalStore.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  TAPE_EVENT_TYPE,
  type ContractEvent,
  applyContractEvent,
  buildContractFeedSetupFrame,
  buildContractSubscriptionFrame,
  decodeCompactFeedData,
  emptyContractQuote,
  type ContractQuoteState,
  type StreamState,
} from "@/lib/broker/tastyContractQuote";
import {
  DXLINK_FEED_CHANNEL,
  buildAuthFrame,
  buildChannelRequestFrame,
  buildKeepaliveFrame,
  buildSetupFrame,
} from "@/lib/marketData/dxlinkProtocol";
import { isSnapshotEnd, type TastyCandleRow } from "@/lib/marketData/adapters/tastytradeCandles";

interface Snapshot {
  readonly stream: StreamState;
  readonly reason: string | null;
  readonly quotes: ReadonlyMap<string, ContractQuoteState>;
  readonly version: number;
}

const refs = new Map<string, number>();
/** Symbols whose every print (TimeAndSale) is also wanted — the chart's tape lane. */
const tapeRefs = new Map<string, number>();
/** Per-event listeners (the chart's tick lane), beside the last-value store. */
const eventListeners = new Set<{ readonly symbols: ReadonlySet<string>; readonly onEvent: (e: ContractEvent, receivedAtMs: number) => void }>();
let quotes = new Map<string, ContractQuoteState>();
/** One-shot candle snapshots in flight, keyed by the candle symbol dxFeed echoes. */
const candleRequests = new Map<string, { readonly fromTime: number; readonly rows: TastyCandleRow[]; readonly done: (rows: TastyCandleRow[] | null) => void }>();
let snapshot: Snapshot = { stream: "IDLE", reason: null, quotes, version: 0 };
const listeners = new Set<() => void>();
let ws: WebSocket | null = null;
let feedOpen = false;
let keepalive: ReturnType<typeof setInterval> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;
let emitQueued = false;

function emit(patch: Partial<Omit<Snapshot, "version" | "quotes">> = {}) {
  snapshot = { ...snapshot, ...patch, quotes, version: snapshot.version + 1 };
  for (const l of listeners) l();
}
/** Quote bursts are batched to one notification per frame. */
function emitSoon() {
  if (emitQueued) return;
  emitQueued = true;
  const run = () => { emitQueued = false; emit(); };
  if (typeof requestAnimationFrame === "function" && typeof document !== "undefined" && !document.hidden) requestAnimationFrame(run);
  else setTimeout(run, 250);
}

function send(frame: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
}

function teardown() {
  if (keepalive) clearInterval(keepalive);
  keepalive = null;
  feedOpen = false;
  if (ws) { ws.onclose = null; ws.onerror = null; ws.onmessage = null; try { ws.close(); } catch { /* closed */ } }
  ws = null;
}

function scheduleRetry(reason: string) {
  teardown();
  if (refs.size === 0) { emit({ stream: "IDLE", reason: null }); return; }
  emit({ stream: "DEGRADED", reason });
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(retries++, 5));
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retryTimer = null; void connect(); }, delay);
}

async function connect() {
  if (ws || refs.size === 0) return;
  emit({ stream: "CONNECTING", reason: null });
  let tok: { state?: string; token?: string; dxlinkUrl?: string; reason?: string; error?: string } | null = null;
  let status = 0;
  try {
    const r = await fetch("/api/broker/tastytrade/quote-token", { cache: "no-store" });
    status = r.status;
    tok = await r.json().catch(() => null);
  } catch { /* network */ }
  if (status === 403) { emit({ stream: "NOT_OWNER", reason: tok?.error ?? "tastytrade market data belongs to its owner only." }); return; }
  if (tok?.state === "NOT_CONFIGURED") { emit({ stream: "NOT_CONNECTED", reason: "tastytrade is not connected on this deployment." }); return; }
  if (tok?.state !== "OK" || !tok.token || !tok.dxlinkUrl) { scheduleRetry(`Quote token unavailable${tok?.reason ? `: ${tok.reason}` : status ? ` (HTTP ${status})` : ""}`); return; }
  if (refs.size === 0) return;

  const sock = new WebSocket(tok.dxlinkUrl);
  ws = sock;
  const token = tok.token;
  sock.onopen = () => send(buildSetupFrame());
  sock.onerror = () => { /* onclose follows */ };
  sock.onclose = () => { if (ws === sock) scheduleRetry("tastytrade stream closed; reconnecting."); };
  sock.onmessage = ev => {
    let m: { type?: string; channel?: number; state?: string; data?: unknown; error?: string; message?: string };
    try { m = JSON.parse(String(ev.data)); } catch { return; }
    switch (m.type) {
      case "SETUP":
        if (!keepalive) keepalive = setInterval(() => send(buildKeepaliveFrame()), 30_000);
        return;
      case "AUTH_STATE":
        if (m.state === "UNAUTHORIZED") send(buildAuthFrame(token));
        else if (m.state === "AUTHORIZED") send(buildChannelRequestFrame());
        return;
      case "CHANNEL_OPENED":
        if (m.channel === DXLINK_FEED_CHANNEL) {
          send(buildContractFeedSetupFrame());
          feedOpen = true;
          retries = 0;
          send(buildContractSubscriptionFrame([...refs.keys()], [], true));
          if (tapeRefs.size) send(buildContractSubscriptionFrame([...tapeRefs.keys()], [], false, [TAPE_EVENT_TYPE]));
          for (const [symbol, r] of candleRequests) send(candleFrame("add", symbol, r.fromTime));
          emit({ stream: "LIVE", reason: null });
        }
        return;
      case "FEED_DATA": {
        const now = Date.now();
        for (const e of decodeCompactFeedData(m.data)) {
          if (e.type === "Candle") {
            const req = candleRequests.get(e.symbol);
            if (!req) continue;
            req.rows.push(e.values);
            if (isSnapshotEnd(e.values.eventFlags)) req.done(req.rows);
            continue;
          }
          if (!refs.has(e.symbol)) continue;
          quotes.set(e.symbol, applyContractEvent(quotes.get(e.symbol) ?? emptyContractQuote(e.symbol), e, now));
          for (const l of eventListeners) if (l.symbols.has(e.symbol)) l.onEvent(e, now);
        }
        quotes = new Map(quotes);
        emitSoon();
        return;
      }
      case "ERROR":
        scheduleRetry(`tastytrade stream error: ${m.error ?? ""} ${m.message ?? ""}`.trim());
        return;
      default:
        return;
    }
  };
}

function subscribe(symbols: readonly string[], tape = false): () => void {
  const tapeAdded: string[] = [];
  if (tape) for (const s of symbols) { const n = tapeRefs.get(s) ?? 0; tapeRefs.set(s, n + 1); if (n === 0) tapeAdded.push(s); }
  if (tapeAdded.length && feedOpen) send(buildContractSubscriptionFrame(tapeAdded, [], false, [TAPE_EVENT_TYPE]));
  const added: string[] = [];
  for (const s of symbols) {
    const n = refs.get(s) ?? 0;
    refs.set(s, n + 1);
    if (n === 0) added.push(s);
  }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  if (added.length && feedOpen) send(buildContractSubscriptionFrame(added));
  if (!ws && !retryTimer) void connect();
  return () => {
    if (tape) {
      const tapeRemoved: string[] = [];
      for (const s of symbols) { const n = (tapeRefs.get(s) ?? 1) - 1; if (n <= 0) { tapeRefs.delete(s); tapeRemoved.push(s); } else tapeRefs.set(s, n); }
      if (tapeRemoved.length && feedOpen) send(buildContractSubscriptionFrame([], tapeRemoved, false, [TAPE_EVENT_TYPE]));
    }
    const removed: string[] = [];
    for (const s of symbols) {
      const n = (refs.get(s) ?? 1) - 1;
      if (n <= 0) { refs.delete(s); removed.push(s); quotes.delete(s); } else refs.set(s, n);
    }
    if (removed.length && feedOpen) send(buildContractSubscriptionFrame([], removed));
    if (refs.size === 0) {
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (refs.size) return;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        teardown();
        quotes = new Map();
        emit({ stream: "IDLE", reason: null });
      }, 5_000);
    }
  };
}

/**
 * Every event for these streamer symbols, as it arrives, on the SAME socket the
 * panels use — a second consumer never opens a second stream. `onState` hears
 * the stream's own state so a lane can say when it is not live.
 */
export function subscribeTastyEvents(
  streamerSymbols: readonly string[],
  onEvent: (e: ContractEvent, receivedAtMs: number) => void,
  onState?: (stream: StreamState, reason: string | null) => void,
  tape = false,
): () => void {
  const entry = { symbols: new Set(streamerSymbols), onEvent };
  eventListeners.add(entry);
  const stateListener = onState ? () => onState(snapshot.stream, snapshot.reason) : null;
  if (stateListener) { listeners.add(stateListener); stateListener(); }
  const release = subscribe(streamerSymbols, tape);
  return () => {
    eventListeners.delete(entry);
    if (stateListener) listeners.delete(stateListener);
    release();
  };
}

function candleFrame(op: "add" | "remove", symbol: string, fromTime: number) {
  return { type: "FEED_SUBSCRIPTION", channel: DXLINK_FEED_CHANNEL, [op]: [op === "add" ? { type: "Candle", symbol, fromTime } : { type: "Candle", symbol }] };
}

/**
 * The contract's own bar history since `fromTime`, as one snapshot on the SHARED
 * socket. `keepAlive` (the contract's streamer symbol) holds the socket open for
 * the request. Resolves at dxFeed's SNAPSHOT_END, or null on timeout / when the
 * stream cannot open (not the owner, not connected) — the caller falls through.
 */
export function requestTastyCandles(candleSymbol: string, keepAlive: string, fromTime: number, timeoutMs = 8_000): Promise<TastyCandleRow[] | null> {
  return new Promise(resolve => {
    if (candleRequests.has(candleSymbol)) { resolve(null); return; }
    let settled = false;
    const release = subscribe([keepAlive]);
    const finish = (rows: TastyCandleRow[] | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(watch);
      candleRequests.delete(candleSymbol);
      if (feedOpen) send(candleFrame("remove", candleSymbol, fromTime));
      release();
      resolve(rows);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    // A stream that will never open (guest, not configured) answers at once.
    const watch = setInterval(() => { if (snapshot.stream === "NOT_OWNER" || snapshot.stream === "NOT_CONNECTED") finish(null); }, 200);
    candleRequests.set(candleSymbol, { fromTime, rows: [], done: finish });
    if (feedOpen) send(candleFrame("add", candleSymbol, fromTime));
  });
}

const getSnapshot = () => snapshot;
const onStore = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Diagnostic count for the duplicate-stream check (§CX): sockets this tab holds. */
export function tastyStreamSocketCount(): number {
  return ws ? 1 : 0;
}

/** Live contract quotes for these streamer symbols, from the one shared stream. */
export function useTastyQuotes(streamerSymbols: readonly string[]): Snapshot {
  const key = useMemo(() => [...new Set(streamerSymbols.filter(Boolean))].sort().join("|"), [streamerSymbols]);
  useEffect(() => {
    if (!key) return;
    return subscribe(key.split("|"));
  }, [key]);
  return useSyncExternalStore(onStore, getSnapshot, getSnapshot);
}
