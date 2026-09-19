"use client";

import * as React from "react";
import { useSanctuarySession } from "@/lib/experience/sanctuarySessionContext";
import {
  classifyMarketFieldFreshness,
  type MarketFieldFreshness,
} from "@/lib/experience/marketFieldFreshness";

/**
 * DeckMarketChart — the deck's MARKET section renders a REAL CHART.
 *
 * ── Why this file exists ──────────────────────────────────────────────────────
 *
 * The Founder's Ticket T (2026-09-11 Command Center) requires the normal
 * Founder scene to carry "MARKET (real TSLA market/chart evidence)". Until this
 * commit, the deck's MARKET section was `MarketCanvasPanel` — a 173-line
 * component that renders chip lists (clearances, blockers, invalidators). There
 * was no chart. A trader arriving at /command-deck saw a decision compilation
 * with no market visible; the actual candles lived on /charts, one route away.
 *
 * A shift can add three text-only fences and still be TRANSFORMATION_STALLED
 * by the Founder's own definition. The one atom that moves visible fruit is a
 * chart on the room the trader arrives in.
 *
 * ── What it renders and, more importantly, what it does not ──────────────────
 *
 * Real candles from /api/yahoo, drawn with lightweight-charts (the same
 * library MainChart uses — no second chart engine, no second registry). One
 * program, one canvas, one series. When the fetch hasn't returned, when the
 * response is empty, or when it errors, the panel prints an honest sentence —
 * never a placeholder chart, never a stale silhouette. Missing data is not a
 * blank axis; missing data is words.
 *
 * The chart is not a replacement for the /charts trading surface — it is
 * Ticket T's "chart evidence" so a trader reading the deck can see the tape
 * the decision is talking about.
 *
 * ── On the height ────────────────────────────────────────────────────────────
 *
 * It was a fixed 240px, then a fixed 360px, repeated as a literal in five
 * places (READY / LOADING / EMPTY / UNAVAILABLE / IDLE). Two problems with
 * that. The DRY one is obvious: five literals drift, and a LOADING box of a
 * different height than the READY box makes the room jump when candles land.
 *
 * The Founder one is the real one. Measured live on production at 1920x847,
 * a 360px chart owned 18% of the viewport AREA and began 47% of the way down
 * the page. The Founder audit's required silhouette says "the market field
 * visually owns most of the viewport" — a fixed pixel height cannot promise
 * that on any screen, because it does not know how big the screen is.
 *
 * MARKET_FIELD_HEIGHT is therefore viewport-proportional with both ends
 * pinned: never shorter than 320px (below that candles stop being readable,
 * which would be a prettier lie than a small chart), never taller than 620px
 * (past that the support column falls entirely below the fold and the room
 * fragments the other way). Between those, it takes 56% of the viewport so
 * that MARKET wins the five-second test on a laptop and on a large display
 * alike.
 */

/**
 * Single owner of the market field's height. Exported so the geometry test can
 * name the value it is checking rather than re-typing a literal.
 */
export const MARKET_FIELD_HEIGHT = "clamp(320px, 56vh, 620px)";

/**
 * Exported because the deck now forwards these candles into canonical market
 * state and needs to name their type. `time` is SECONDS — the
 * lightweight-charts convention, and the same one `deriveLastBarClose` expects.
 *
 * There is deliberately NO `volume`: /api/yahoo's volume is not trusted here,
 * so `parseCandles` drops it rather than forward a number this file cannot
 * stand behind. That absence is why `deriveLastBarClose` takes the minimal
 * `BarCloseCandidate` shape instead of a full `LegacyOhlcvTuple` — so these candles
 * can be published honestly without anyone inventing `volume: 0`.
 */
export interface Candle {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
}

type FetchState =
  | { kind: "IDLE" }
  | { kind: "LOADING" }
  /**
   * READY carries the moment the candles LANDED, not the moment they were
   * requested. Without this stamp the room could draw six-hour-old geometry
   * with the same confidence as a live read — see marketFieldFreshness.ts.
   */
  | {
      kind: "READY";
      candles: readonly Candle[];
      fetchedAtMs: number;
      /**
       * Set when a REFRESH failed while these candles were on screen. The
       * candles stay — they are real — but the room must admit that its last
       * attempt to confirm them did not land.
       */
      refreshFailure?: string | null;
    }
  | { kind: "EMPTY" }
  | { kind: "UNAVAILABLE"; reason: string };

/**
 * THE VENUE THESE CANDLES COME FROM — exported so the deck can attribute them.
 *
 * This file is the only fetcher of the deck's candles, so it is the only thing
 * that can honestly answer "which venue?". The deck publishes those candles
 * into canonical market state, where CANDLE-ONLY dimensions (structure,
 * aggression) mint evidence refs naming a source. Before this constant the
 * deck had no way to say, and the publisher fell back to the TAPE source.
 *
 * Measured live on production BTC 15m, 2026-09-18: `/command-deck` attributed
 * its swing-sequence evidence to `coinbase` — the WebSocket tape — while the
 * numbers were computed from Yahoo candles, which is why `/charts` (Coinbase
 * candles via /api/exchange) read `HIGHER HIGHS` at the same instant that the
 * deck read `structure ?`. The disagreement is legitimate; two venues print
 * different candles. Both receipts naming the SAME venue was not.
 *
 * Kept as one constant that builds the URL below, so the label and the request
 * cannot drift into disagreeing about where the bars came from.
 */
export const DECK_CANDLE_SOURCE = "yahoo";

export interface DeckMarketChartProps {
  readonly symbol: string;
  readonly timeframe: string;
  /** Bars to request. Compact chart → ~120 bars reads well at 240px. */
  readonly bars?: number;
  /**
   * Injectable fetch for tests — the default reads /api/yahoo on window.
   * Server-side render skips the fetch entirely.
   */
  readonly fetcher?: (url: string) => Promise<Response>;
  /**
   * THE CANDLES LEAVE THE ROOM.
   *
   * Until this prop existed, the candles fetched here were rendered and then
   * discarded. That made the deck's own chart a DEAD END for truth: it drew
   * 120 real bars closing at 356.58 while canonical market state — with no
   * bars of its own — published `lastBar: null`, and HeroTruth directly above
   * the chart rendered `?` for price. One room, two owners, one of them
   * needlessly ignorant.
   *
   * This is the deck's analogue of `MainChart.onBarsReady`. The parent hands
   * what it receives to `usePublishChartMarketState`, which is the single
   * writer of canonical state. Nothing is computed here and nothing is
   * published here — the chart stays a pure view; it merely stops keeping its
   * evidence to itself.
   *
   * Fires ONLY on a READY fetch, so an empty or failed load can never be
   * mistaken for "the bars are gone" — absence of a call is not a claim.
   */
  readonly onCandlesReady?: (candles: readonly Candle[]) => void;
}

/**
 * The narrow response shape this file trusts. If /api/yahoo changes, the
 * classifier below fails closed (EMPTY / UNAVAILABLE), never silently draws
 * garbage.
 */
function parseCandles(payload: unknown): readonly Candle[] | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as { candles?: unknown }).candles;
  if (!Array.isArray(raw)) return null;
  const out: Candle[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const c = r as Record<string, unknown>;
    const time = typeof c.time === "number" ? c.time : null;
    const open = typeof c.open === "number" ? c.open : null;
    const high = typeof c.high === "number" ? c.high : null;
    const low = typeof c.low === "number" ? c.low : null;
    const close = typeof c.close === "number" ? c.close : null;
    if (time === null || open === null || high === null || low === null || close === null) {
      return null;
    }
    if (!Number.isFinite(time) || !Number.isFinite(open) || !Number.isFinite(high)
        || !Number.isFinite(low) || !Number.isFinite(close)) {
      return null;
    }
    out.push({ time, open, high, low, close });
  }
  return out;
}

/**
 * PURE — exposed for the guard test. Given raw fetch outcomes, decides which
 * of the four states the chart should be in. Isolated so the same reasoning is
 * unit-testable without a DOM or a network.
 */
export function classifyFetch(
  ok: boolean,
  status: number,
  payload: unknown,
  fetchedAtMs: number = Date.now(),
): FetchState {
  if (!ok) return { kind: "UNAVAILABLE", reason: `HTTP ${status}` };
  const candles = parseCandles(payload);
  if (candles === null) return { kind: "UNAVAILABLE", reason: "malformed response" };
  if (candles.length === 0) return { kind: "EMPTY" };
  return { kind: "READY", candles, fetchedAtMs };
}

export function DeckMarketChart({
  symbol,
  timeframe,
  bars = 120,
  fetcher,
  onCandlesReady,
}: DeckMarketChartProps): React.ReactElement {
  const [state, setState] = React.useState<FetchState>({ kind: "IDLE" });
  // The canonical session signal, read from the context the deck page already
  // publishes. Not a prop, not a second session owner — see
  // sanctuarySessionContext.ts. A CLOSED tape makes old candles FINAL, not
  // stale; an UNKNOWN one buys no exemption from aging.
  const session = useSanctuarySession();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<unknown>(null);
  const seriesRef = React.useRef<unknown>(null);

  /**
   * Refresh generation. Bumping this re-runs the fetch effect. It is the ONLY
   * way candles are re-read, so there is exactly one door into "ask again".
   */
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  // Fetch effect — one owner of the "am I looking at fresh candles" question.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const isRefresh = refreshNonce > 0;

    // A refresh must NOT blank the room. The trader is mid-read; replacing
    // real candles with "Loading candles…" every bar interval would make the
    // market field flicker between evidence and absence. Only the first load
    // shows LOADING; a refresh happens underneath the chart already on screen.
    if (!isRefresh) setState({ kind: "LOADING" });

    const url = `/api/${DECK_CANDLE_SOURCE}?sym=${encodeURIComponent(symbol)}&type=candles&tf=${encodeURIComponent(timeframe)}&bars=${bars}`;
    const doFetch = fetcher ?? ((u: string) => fetch(u, { cache: "no-store" }));

    /**
     * A failed REFRESH is not the same event as a failed LOAD, and collapsing
     * them loses truth in both directions. Dropping to UNAVAILABLE would throw
     * away real candles the trader still has; silently keeping them would hide
     * that the last attempt to confirm them failed. So we keep the candles AND
     * record the failure — the surface then says exactly what happened.
     */
    const onFailure = (reason: string) => {
      setState((prev) =>
        prev.kind === "READY"
          ? { ...prev, refreshFailure: reason }
          : { kind: "UNAVAILABLE", reason },
      );
    };

    doFetch(url)
      .then(async (r) => {
        if (cancelled) return;
        let body: unknown = null;
        try { body = await r.json(); } catch { body = null; }
        const next = classifyFetch(r.ok, r.status, body);
        if (next.kind === "READY") { setState(next); return; }
        if (!isRefresh) { setState(next); return; }
        onFailure(next.kind === "UNAVAILABLE" ? next.reason : "no candles returned");
      })
      .catch((err) => {
        if (cancelled) return;
        const reason = String(err?.message ?? err);
        if (!isRefresh) { setState({ kind: "UNAVAILABLE", reason }); return; }
        onFailure(reason);
      });
    return () => { cancelled = true; };
  }, [symbol, timeframe, bars, fetcher, refreshNonce]);

  // Chart build/update effect — mounts the canvas when READY, disposes on
  // unmount or when the state leaves READY. The chart is created ONCE per
  // container mount and its series data is REPLACED on candle changes.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.kind !== "READY") return;
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async () => {
      const LW = (await import("lightweight-charts")) as any;
      if (disposed || !containerRef.current) return;
      let chart = chartRef.current as any;
      if (!chart) {
        chart = LW.createChart(el, {
          autoSize: true,
          layout: {
            background: { color: "transparent" },
            textColor: "#8a8271",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10,
            attributionLogo: false,
          },
          grid: {
            vertLines: { color: "rgba(139,106,41,0.10)", style: LW.LineStyle.Dotted },
            horzLines: { color: "rgba(139,106,41,0.10)", style: LW.LineStyle.Dotted },
          },
          rightPriceScale: { borderColor: "rgba(139,106,41,0.25)", textColor: "#8a8271" },
          timeScale:       { borderColor: "rgba(139,106,41,0.25)", timeVisible: true, secondsVisible: false },
          crosshair:       { mode: LW.CrosshairMode.Normal },
          handleScroll:    { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
          handleScale:     { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
        });
        chartRef.current = chart;
      }
      let series = seriesRef.current as any;
      if (!series) {
        series = chart.addSeries(LW.CandlestickSeries, {
          upColor:        "#5cb85c",
          downColor:      "#c05a4a",
          borderUpColor:  "#5cb85c",
          borderDownColor:"#c05a4a",
          wickUpColor:    "#5cb85c",
          wickDownColor:  "#c05a4a",
        });
        seriesRef.current = series;
      }
      series.setData(state.candles.map((c) => ({
        time: c.time as unknown as number,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      chart.timeScale().fitContent();
    })();

    return () => {
      disposed = true;
    };
  }, [state]);

  // Full dispose on unmount — the intermediate effect above only guards its
  // own build; leaking a lightweight-charts instance leaves a canvas + its
  // WebGL context alive after navigation.
  React.useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chart = chartRef.current as any;
      if (chart && typeof chart.remove === "function") chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Hand the candles up. Separate from the chart-build effect on purpose: a
  // publication is not a rendering concern, and coupling them would mean a
  // failure to mount the canvas silently withheld the evidence too.
  //
  // `state.candles` is a fresh array only when a fetch actually landed, so a
  // parent that stores it in state re-renders at most once per load. A parent
  // passing an unstable callback would loop — hence `onCandlesReady` is
  // documented as requiring a stable identity, and the deck uses useCallback.
  React.useEffect(() => {
    if (state.kind !== "READY") return;
    onCandlesReady?.(state.candles);
  }, [state, onCandlesReady]);

  const barCount = state.kind === "READY" ? state.candles.length : 0;

  // ── The age ticker ──────────────────────────────────────────────────────────
  //
  // MOTION RECEIPT: the ONLY thing this interval moves is the as-of SENTENCE.
  // No price, no axis, no geometry. Time passing is truth about AGE, and the
  // Founder motion law permits a surface to move when a canonical event
  // updates the state it displays — here the canonical event is the wall clock
  // crossing the stale budget. 30s is slow enough to be invisible as motion
  // and fast enough that "Read 4m ago" is never off by more than half a minute.
  //
  // It runs only while READY, so a LOADING or UNAVAILABLE room is perfectly
  // still and no timer survives the state leaving READY.
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.kind !== "READY") return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [state.kind]);

  const freshness: MarketFieldFreshness | null =
    state.kind === "READY"
      ? classifyMarketFieldFreshness({
          fetchedAtMs: state.fetchedAtMs,
          nowMs,
          timeframe,
          session,
        })
      : null;

  // ── The refresh scheduler ───────────────────────────────────────────────────
  //
  // Labelling staleness without offering a recovery path would leave the room
  // permanently and accurately broken. A refetch is the canonical event that
  // lets price legitimately move: PRICE MAY ONLY MOVE WHEN TRUTH MOVES, and new
  // candles ARE truth moving. A timer that redraws without new data would not
  // be — which is exactly why the redraw is downstream of the fetch, never of
  // the interval.
  //
  // Three gates, each of which is a Founder law rather than an optimisation:
  //
  //   1. session !== "CLOSED" — a shut tape produces no new bars, so polling it
  //      would be manufactured activity in a sanctuary the canon requires to be
  //      calm when the market is closed. UNKNOWN does NOT get this exemption,
  //      for the same reason it does not get the staleness exemption.
  //   2. document is visible — a backgrounded tab has no trader to inform, and
  //      burning provider quota to refresh a chart nobody is looking at steals
  //      from the read that matters.
  //   3. only while READY — nothing reschedules a failed first load into a
  //      retry storm.
  //
  // The cadence is the freshness budget itself, so the room refreshes exactly
  // as often as it would otherwise start lying. One owner, one number.
  const refreshEveryMs = freshness?.budgetMs ?? null;
  const shouldRefresh = state.kind === "READY" && session !== "CLOSED" && refreshEveryMs !== null;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldRefresh || refreshEveryMs === null) return;

    const ask = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      setRefreshNonce((n) => n + 1);
    };

    const id = window.setInterval(ask, refreshEveryMs);

    // Returning to a tab that sat hidden past the budget should not make the
    // trader wait a full further interval to see current candles.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (state.kind !== "READY") return;
      if (Date.now() - state.fetchedAtMs < refreshEveryMs) return;
      ask();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shouldRefresh, refreshEveryMs, state]);

  // Colour is the SECOND channel, never the only one. Each state also carries
  // a distinct glyph and distinct words, so a trader who cannot separate brass
  // from rust still receives the warning.
  const FRESHNESS_STYLE = {
    FRESH: { color: "#8a8271", glyph: "●" },
    AGING: { color: "#c9a55c", glyph: "◐" },
    STALE: { color: "#c05a4a", glyph: "!" },
    FINAL: { color: "#8a8271", glyph: "◼" },
  } as const;

  return (
    <section
      data-testid="deck-market-chart"
      aria-label={`${symbol} ${timeframe} chart`}
      style={{
        // SCENE_FRAGMENTATION repair (Founder audit 2026-09-13): the
        // full-box brass border made this section read as an "app card"
        // inside the room. MARKET is the room, not a card. Only the top
        // hairline stays — a brass structural line, not a container.
        borderTop: "1px solid rgba(139,106,41,0.20)",
        padding: "8px 0 4px",
        background: "transparent",
      }}
    >
      {/*
        SCENE_FRAGMENTATION repair, second pass. This header used to read
        "MARKET · CHART EVIDENCE" on the left and "TSLA · 15m · 120 bars" on
        the right. Both halves were redundant against the NOW block sitting
        directly above it in the same scene owner:

          · the left label announced a card inside a room whose ONLY subject
            is the market — a section title that tells the trader something
            the room already is;
          · the right half re-printed the symbol and timeframe that HeroTruth
            renders at 34px eleven pixels higher up. Two owners printing one
            instrument identity is the duplicate-identity shape the audit
            calls out by name.

        What is NOT redundant is the bar count: it is the only place the
        trader can see HOW MUCH evidence the candles represent, and deleting
        it to win vertical space would be trading truth for layout. It stays,
        alone, right-aligned, at label scale — and only when candles actually
        arrived, so it can never imply evidence the fetch did not return.
      */}
      {/*
        The as-of line is the second half of the same sentence. "120 bars" says
        HOW MUCH evidence; without an age it does not say whether that evidence
        still describes the market. The two belong on one row, and the age is
        on the LEFT — the eye reaches it first, because a stale chart is worth
        knowing about before the bar count is.
      */}
      {state.kind === "READY" && freshness && (
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <span
            data-testid="deck-market-chart-asof"
            data-freshness={freshness.kind}
            role={freshness.kind === "STALE" ? "status" : undefined}
            style={{
              fontSize: 9,
              letterSpacing: 0.3,
              color: FRESHNESS_STYLE[freshness.kind].color,
              fontWeight: freshness.kind === "STALE" ? 700 : 400,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 5,
              minWidth: 0,
            }}
          >
            <span aria-hidden="true">{FRESHNESS_STYLE[freshness.kind].glyph}</span>
            <span>{freshness.label}</span>
            {/* When the timeframe could not be parsed we are guessing the
                refresh cadence. Saying so costs one clause and stops the
                budget from posing as a derived number. */}
            {freshness.budgetIsAssumed && (
              <span style={{ color: "#55503f" }}>· cadence assumed</span>
            )}
            {/* The candles on screen are real; the last attempt to CONFIRM
                them was not. Both halves of that are true at once and the
                room says both rather than picking the flattering one. */}
            {state.refreshFailure && (
              <span data-testid="deck-market-chart-refresh-failed" style={{ color: "#c05a4a" }}>
                · refresh failed ({state.refreshFailure})
              </span>
            )}
          </span>
          <span style={{ fontSize: 9, letterSpacing: 0.3, color: "#8a8271" }}>
            {barCount} bars
          </span>
        </header>
      )}

      {/* One and only one visible state at a time — no ghost chart under a
          loading message, no "empty" ambient chart, no error silhouette. */}
      {state.kind === "READY" && (
        <div
          ref={containerRef}
          data-testid="deck-market-chart-canvas"
          style={{ width: "100%", height: MARKET_FIELD_HEIGHT }}
        />
      )}

      {state.kind === "LOADING" && (
        <div
          data-testid="deck-market-chart-loading"
          style={{ height: MARKET_FIELD_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#8a8271", fontSize: 11, letterSpacing: 0.3 }}
        >
          Loading candles…
        </div>
      )}

      {state.kind === "EMPTY" && (
        <div
          data-testid="deck-market-chart-empty"
          style={{ height: MARKET_FIELD_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#8a8271", fontSize: 11, letterSpacing: 0.3, fontStyle: "italic" }}
        >
          No candles yet for {symbol} {timeframe}.
        </div>
      )}

      {state.kind === "UNAVAILABLE" && (
        <div
          data-testid="deck-market-chart-unavailable"
          style={{ height: MARKET_FIELD_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#c05a4a", fontSize: 11, letterSpacing: 0.3 }}
        >
          Chart evidence unavailable — {state.reason}
        </div>
      )}

      {state.kind === "IDLE" && (
        <div style={{ height: MARKET_FIELD_HEIGHT }} data-testid="deck-market-chart-idle" />
      )}
    </section>
  );
}

export default DeckMarketChart;
