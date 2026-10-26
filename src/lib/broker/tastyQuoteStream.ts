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

import { fetchQuoteToken, forgetQuoteToken } from "./tastyQuoteTokenClient";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  CONTRACT_EVENT_FIELDS,
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
/** Bumped when the identity behind the stream changes; a connect that began before it gives up. */
let identity = 0;

/*
 * THE PRINT TAPE RIDES ITS OWN CHANNEL, UNAGGREGATED (perf 2026-10-25 night — the Founder: "still some
 * delay and lag", worst on 1m). The quote channel is set up with acceptAggregationPeriod 0.25 s: right
 * for quotes, Greeks and option chains (dxFeed conflates them to 4 updates a second), wrong for the
 * chart's prints, which dxFeed then delivers in clumps every 250 ms — up to a quarter second late, and
 * a forming candle that jumps four times a second instead of moving with the tape. TimeAndSale now
 * subscribes on a second FEED channel set up with aggregation 0 (the same setup tastyHistory's own
 * socket has always used for prints). If that channel does not open, or the server refuses it, the
 * prints fall back to the quote channel exactly as before — never both, so no print is heard twice.
 */
export const TAPE_CHANNEL = DXLINK_FEED_CHANNEL + 2;
/** How long the tape channel may take to open before the prints fall back to the quote channel. */
export const TAPE_CHANNEL_OPEN_MS = 2500;
type TapeLane = "PENDING" | "OPEN" | "FALLBACK";
let tapeLane: TapeLane = "PENDING";
let tapeLaneTimer: ReturnType<typeof setTimeout> | null = null;
/** Which channel the prints ride now, or null while the tape channel is still opening. */
function tapeChannelNow(): number | null {
  if (!feedOpen) return null;
  return tapeLane === "OPEN" ? TAPE_CHANNEL : tapeLane === "FALLBACK" ? DXLINK_FEED_CHANNEL : null;
}
function onChannel<T extends { channel?: number }>(frame: T, channel: number): T {
  return { ...frame, channel };
}
function sendTapeSubscription(add: readonly string[], remove: readonly string[], reset = false) {
  const ch = tapeChannelNow();
  if (ch == null || (!add.length && !remove.length && !reset)) return;
  send(onChannel(buildContractSubscriptionFrame(add, remove, reset, [TAPE_EVENT_TYPE]), ch));
}
/** The prints move to the quote channel for the rest of this socket's life. */
function tapeFallBack() {
  if (tapeLaneTimer) { clearTimeout(tapeLaneTimer); tapeLaneTimer = null; }
  if (tapeLane === "FALLBACK") return;
  tapeLane = "FALLBACK";
  if (feedOpen && tapeRefs.size) sendTapeSubscription([...tapeRefs.keys()], []);
}
/** The tape channel's own setup: prints only, never aggregated. */
export function buildTapeFeedSetupFrame() {
  return {
    type: "FEED_SETUP",
    channel: TAPE_CHANNEL,
    acceptAggregationPeriod: 0,
    acceptDataFormat: "COMPACT",
    acceptEventFields: { [TAPE_EVENT_TYPE]: [...CONTRACT_EVENT_FIELDS[TAPE_EVENT_TYPE]] },
  };
}

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
  tapeLane = "PENDING";
  if (tapeLaneTimer) { clearTimeout(tapeLaneTimer); tapeLaneTimer = null; }
  if (ws) { ws.onclose = null; ws.onerror = null; ws.onmessage = null; try { ws.close(); } catch { /* closed */ } }
  ws = null;
}

/**
 * Does anyone want this socket? Quote subscribers AND prints-only ones. Asking
 * `refs` alone left a prints-only consumer with no socket at all (FX lane,
 * 2026-10-06: the CME 6E related-flow line on EURUSD sat at CONNECTING —
 * `connect()` returned before asking for a token; the Options Flow lane had
 * the same hole whenever no quote panel was open beside it).
 */
const wanted = () => refs.size > 0 || tapeRefs.size > 0;

/*
 * A BACKGROUND TAB GIVES ITS SEAT BACK (2026-10-18). tastytrade allows a fixed number of live-feed sessions per
 * account, and every WM Pro tab held one forever — a trader with several tabs (or a teacher with devices) locked
 * the feed out ("number of user sessions has exceeded the configured limit"). After a minute hidden the socket
 * closes; it reopens the moment the tab is seen again. Closing the tab releases it at once.
 */
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let hiddenReleased = false;
if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(() => {
        hiddenTimer = null;
        if (!document.hidden) return;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        teardown();
        hiddenReleased = true;
        emit({ stream: "IDLE", reason: "Paused while this tab is in the background — resumes when you return." });
      }, 60_000);
    } else {
      if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
      hiddenReleased = false;
      if (wanted() && !ws && !retryTimer) { retries = 0; void connect(); }
    }
  });
  window.addEventListener("pagehide", () => { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } teardown(); });
}

/**
 * TRADER WORDS for a degraded stream (Sheriff P2, 2026-10-08: the glass printed
 * "tastytrade stream error: TIMEOUT The timeout for SETUP…"). The feed's own
 * code never reaches a trader; what happened and what WM Pro does next does.
 */
export function tastyStreamReasonWords(kind: "ERROR" | "TOKEN" | "CLOSED", code?: string | null): string {
  // tastytrade caps live-feed sessions per account (2026-10-18: "The number of user sessions has exceeded the configured
  // limit" — every open WM Pro tab and device holds one). Said plainly, with the trader's next step.
  if (/user sessions has exceeded|session.*limit/i.test(code ?? "")) return "Too many WM Pro tabs or devices have tastytrade's live feed open — close extra tabs (a background tab gives its seat back after a minute).";
  if (kind === "TOKEN") return "WM Pro could not open tastytrade's live feed just now — trying again shortly.";
  if (kind === "CLOSED") return "tastytrade's live feed closed — reconnecting.";
  return /TIMEOUT/i.test(code ?? "")
    ? "tastytrade's live feed did not answer in time — reconnecting."
    : "tastytrade's live feed reported a problem — reconnecting.";
}

function scheduleRetry(reason: string) {
  teardown();
  if (!wanted()) { emit({ stream: "IDLE", reason: null }); return; }
  emit({ stream: "DEGRADED", reason });
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(retries++, 5));
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retryTimer = null; void connect(); }, delay);
}

/**
 * ONE CONNECT IN FLIGHT (G19 Mansion, serving 0ce4515, cold NQ1! 5m, 2026-10-11 21:30 CDT): `ws` is
 * set only after the token answers, so every subscriber that arrived during that await (panels, tape,
 * candles) started its own connect — SEVEN DXLink sockets opened in the same millisecond. Each orphan's
 * CHANNEL_OPENED re-sent FEED_SETUP and the subscriptions through the live socket, one landed in the
 * middle of the candle snapshot, SNAPSHOT_END never came, and the futures chart waited the full 8 s
 * timeout for bars a warm socket delivers in 0.5 s. The orphans also held connections open.
 */
let connecting = false;

async function connect() {
  if (hiddenReleased) return; // a background tab that gave its seat back reopens only when seen again
  if (ws || connecting || !wanted()) return;
  connecting = true;
  emit({ stream: "CONNECTING", reason: null });
  const asked = identity;
  let tok: { state?: string; token?: string; dxlinkUrl?: string; reason?: string; error?: string } | null = null;
  let status = 0;
  try {
    const a = await fetchQuoteToken();
    status = a.status;
    tok = a.body;
  } catch { /* network */ } finally { connecting = false; }
  // The account changed while the token was being asked for: that token
  // belongs to the previous identity and must not open a socket now.
  // (A newer identity's subscriber waited behind this connect: it gets its own now.)
  if (asked !== identity) { if (wanted() && !ws && !retryTimer) void connect(); return; }
  if (status === 403) { emit({ stream: "NOT_OWNER", reason: tok?.error ?? "tastytrade market data belongs to its owner only." }); return; }
  if (tok?.state === "NOT_CONFIGURED") { emit({ stream: "NOT_CONNECTED", reason: "tastytrade is not connected on this deployment." }); return; }
  if (tok?.state !== "OK" || !tok.token || !tok.dxlinkUrl) { void status; scheduleRetry(tastyStreamReasonWords("TOKEN")); return; }
  if (!wanted()) return;

  const sock = new WebSocket(tok.dxlinkUrl);
  ws = sock;
  const token = tok.token;
  sock.onopen = () => send(buildSetupFrame());
  sock.onerror = () => { /* onclose follows */ };
  // A close may mean the token was refused: the reconnect asks for a fresh one.
  sock.onclose = () => { if (ws === sock) { forgetQuoteToken(); scheduleRetry(tastyStreamReasonWords("CLOSED")); } };
  sock.onmessage = ev => {
    // A socket that is no longer THE socket speaks for nobody (it would set up the live one again).
    if (ws !== sock) { try { sock.close(); } catch { /* closed */ } return; }
    let m: { type?: string; channel?: number; state?: string; data?: unknown; error?: string; message?: string };
    try { m = JSON.parse(String(ev.data)); } catch { return; }
    switch (m.type) {
      case "SETUP":
        if (!keepalive) keepalive = setInterval(() => send(buildKeepaliveFrame()), 30_000);
        return;
      case "AUTH_STATE":
        if (m.state === "UNAUTHORIZED") send(buildAuthFrame(token));
        else if (m.state === "AUTHORIZED") {
          send(buildChannelRequestFrame());
          send(onChannel(buildChannelRequestFrame(), TAPE_CHANNEL));
        }
        return;
      case "CHANNEL_OPENED":
        if (m.channel === DXLINK_FEED_CHANNEL) {
          send(buildContractFeedSetupFrame());
          feedOpen = true;
          retries = 0;
          send(buildContractSubscriptionFrame([...refs.keys()], [], true));
          // The prints: on the tape channel once it is open; on this one if it has fallen back; and a
          // tape channel that has not opened by TAPE_CHANNEL_OPEN_MS hands them to this one.
          if (tapeRefs.size) sendTapeSubscription([...tapeRefs.keys()], []);
          if (tapeLane === "PENDING" && !tapeLaneTimer) tapeLaneTimer = setTimeout(() => { tapeLaneTimer = null; if (ws === sock && tapeLane === "PENDING") tapeFallBack(); }, TAPE_CHANNEL_OPEN_MS);
          for (const [symbol, r] of candleRequests) send(candleFrame("add", symbol, r.fromTime));
          emit({ stream: "LIVE", reason: null });
        } else if (m.channel === TAPE_CHANNEL && tapeLane === "PENDING") {
          send(buildTapeFeedSetupFrame());
          tapeLane = "OPEN";
          if (tapeLaneTimer) { clearTimeout(tapeLaneTimer); tapeLaneTimer = null; }
          if (tapeRefs.size) sendTapeSubscription([...tapeRefs.keys()], [], true);
        }
        return;
      case "CHANNEL_CLOSED":
        // The tape channel closing is not the stream failing: the prints go back to the quote channel.
        if (m.channel === TAPE_CHANNEL) tapeFallBack();
        return;
      case "FEED_DATA": {
        const now = Date.now();
        for (const e of decodeCompactFeedData(m.data)) {
          if (e.type === "Candle") {
            const req = candleRequests.get(e.symbol);
            if (!req) continue;
            req.rows.push(e.values);
            // Receipt for the proof channel: rows received per candle request.
            try { const w = window as unknown as { __wmCandleReceipt?: Record<string, number> }; (w.__wmCandleReceipt ??= {})[e.symbol] = req.rows.length; } catch { /* no window */ }
            if (isSnapshotEnd(e.values.eventFlags)) req.done(req.rows);
            continue;
          }
          if (!refs.has(e.symbol)) {
            // A PRINTS-ONLY symbol (Options Flow, 2026-10-06): its prints go to
            // their listeners; it holds no quote and repaints no quote panel.
            if (e.type === TAPE_EVENT_TYPE && tapeRefs.has(e.symbol)) for (const l of eventListeners) if (l.symbols.has(e.symbol)) l.onEvent(e, now);
            continue;
          }
          quotes.set(e.symbol, applyContractEvent(quotes.get(e.symbol) ?? emptyContractQuote(e.symbol), e, now));
          for (const l of eventListeners) if (l.symbols.has(e.symbol)) l.onEvent(e, now);
        }
        quotes = new Map(quotes);
        emitSoon();
        return;
      }
      case "ERROR":
        if (m.channel === TAPE_CHANNEL) { tapeFallBack(); return; }
        scheduleRetry(tastyStreamReasonWords("ERROR", `${m.error ?? ""} ${m.message ?? ""}`.trim() || null));
        return;
      default:
        return;
    }
  };
}

function subscribe(symbols: readonly string[], tape = false, withQuotes = true): () => void {
  const tapeAdded: string[] = [];
  if (tape) for (const s of symbols) { const n = tapeRefs.get(s) ?? 0; tapeRefs.set(s, n + 1); if (n === 0) tapeAdded.push(s); }
  if (tapeAdded.length) sendTapeSubscription(tapeAdded, []);
  const added: string[] = [];
  if (withQuotes) for (const s of symbols) {
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
      if (tapeRemoved.length) sendTapeSubscription([], tapeRemoved);
    }
    const removed: string[] = [];
    if (withQuotes) for (const s of symbols) {
      const n = (refs.get(s) ?? 1) - 1;
      if (n <= 0) { refs.delete(s); removed.push(s); quotes.delete(s); } else refs.set(s, n);
    }
    if (removed.length && feedOpen) send(buildContractSubscriptionFrame([], removed));
    if (refs.size === 0 && tapeRefs.size === 0) {
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (refs.size || tapeRefs.size) return;
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
  /** False: prints only — no Quote / Greeks / Summary stream for these symbols. */
  withQuotes = true,
): () => void {
  const entry = { symbols: new Set(streamerSymbols), onEvent };
  eventListeners.add(entry);
  const stateListener = onState ? () => onState(snapshot.stream, snapshot.reason) : null;
  if (stateListener) { listeners.add(stateListener); stateListener(); }
  const release = subscribe(streamerSymbols, tape, withQuotes);
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
  // ONE SNAPSHOT, EVERY ASKER (serving /desk, 2026-10-07). A second request for
  // a candle symbol already in flight used to answer null AT ONCE, so a Desk
  // screen moved onto AAPL 5m by its link group — asking the same instant as
  // the screen that moved it — fell through to a delayed vendor and drew
  // regular-session bars ending at yesterday's close beside a twin showing the
  // overnight session. A later asker now JOINS the snapshot in flight (it
  // reaches back at least as far); one wanting older history waits for it to
  // finish and then asks for its own. Same bars, same door, for both.
  const pending = candleInflight.get(candleSymbol);
  if (pending) {
    return pending.fromTime <= fromTime
      ? pending.promise
      : pending.promise.then(() => requestTastyCandles(candleSymbol, keepAlive, fromTime, timeoutMs));
  }
  // ONE RETRY ON A COLD SOCKET (iPad NQ1! 2026-10-18: 3 of 8 loads read "NO BAR HISTORY · tastytrade was asked and
  // refused" — quote-token + socket + auth + snapshot can outrun 8s on a busy device). Nothing answered and the stream is
  // ours → ask once more with twice the budget. A guest / unconfigured stream (NOT_OWNER / NOT_CONNECTED) never retries.
  const promise = openTastyCandleRequest(candleSymbol, keepAlive, fromTime, timeoutMs).then(rows => {
    if (rows && rows.length) return rows;
    if (snapshot.stream === "NOT_OWNER" || snapshot.stream === "NOT_CONNECTED") return rows;
    const again = openTastyCandleRequest(candleSymbol, keepAlive, fromTime, timeoutMs * 2);
    candleInflight.set(candleSymbol, { fromTime, promise: again });
    return again;
  });
  candleInflight.set(candleSymbol, { fromTime, promise });
  return promise;
}

const candleInflight = new Map<string, { readonly fromTime: number; readonly promise: Promise<TastyCandleRow[] | null> }>();

function openTastyCandleRequest(candleSymbol: string, keepAlive: string, fromTime: number, timeoutMs: number): Promise<TastyCandleRow[] | null> {
  return new Promise(resolve => {
    let settled = false;
    const release = subscribe([keepAlive]);
    const finish = (rows: TastyCandleRow[] | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(watch);
      candleRequests.delete(candleSymbol);
      candleInflight.delete(candleSymbol);
      if (feedOpen) send(candleFrame("remove", candleSymbol, fromTime));
      release();
      resolve(rows);
    };
    // No SNAPSHOT_END inside the budget: what did arrive is still the contract's
    // own bars (an option's candle snapshot was measured never closing, 2026-10-02).
    const timer = setTimeout(() => { const got = candleRequests.get(candleSymbol)?.rows ?? []; finish(got.length ? got : null); }, timeoutMs);
    // A stream that will never open (guest, not configured) answers at once.
    const watch = setInterval(() => { if (snapshot.stream === "NOT_OWNER" || snapshot.stream === "NOT_CONNECTED") finish(null); }, 200);
    candleRequests.set(candleSymbol, { fromTime, rows: [], done: finish });
    if (feedOpen) send(candleFrame("add", candleSymbol, fromTime));
  });
}

const getSnapshot = () => snapshot;

/** The shared stream's state now (NOT_OWNER / NOT_CONNECTED name WHY a request answered nothing). */
export function tastyStreamState(): StreamState {
  return snapshot.stream;
}

/**
 * What the shared stream already holds for a symbol. dxFeed sends a Summary
 * (prior-day close, open interest) only on the FIRST subscription, so a
 * second consumer of an already-streamed symbol reads it here (2026-10-06:
 * /desk's tape subscribed SPY first and the chart never heard its Summary).
 */
export function peekTastyQuote(streamerSymbol: string): ContractQuoteState | null {
  return quotes.get(streamerSymbol) ?? null;
}
const onStore = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/**
 * WHOSE token the socket uses just changed — a member connected or disconnected
 * THEIR OWN tastytrade (MEMBER-BROKER-CONNECT.md). Drop the remembered token and
 * the open socket, and ask again for whatever is already subscribed, so a
 * NOT_OWNER stream becomes the member's own (or a member's stream ends).
 */
export function reopenTastyStream(): void {
  dropIdentity();
  if (wanted()) void connect();
  else emit({ stream: "IDLE", reason: null });
}

/** Everything the previous identity's stream left in this tab: token, socket, last values, pending snapshots. */
function dropIdentity(): void {
  identity += 1;
  forgetQuoteToken();
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  retries = 0;
  teardown();
  quotes = new Map();
  for (const r of [...candleRequests.values()]) r.done(null);
  candleRequests.clear();
}

/**
 * SIGN-OUT / ACCOUNT SWITCH (logoutIsolation): close the shared socket and
 * forget the token and every last value it carried, WITHOUT reconnecting — on
 * a shared device the next person must not keep receiving the previous
 * member's live stream. Mounted subscribers stay registered; the next
 * subscribe (or reopenTastyStream once a new account is known) asks for a token
 * under whoever is signed in then.
 */
export function closeTastyStreamForSignOut(): void {
  dropIdentity();
  emit({ stream: "IDLE", reason: null });
}

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

/** The live feed's current reason in words, or null (a bar refusal quotes it instead of "without saying why"). */
export function tastyStreamSnapshotReason(): string | null {
  return snapshot.reason ?? null;
}
