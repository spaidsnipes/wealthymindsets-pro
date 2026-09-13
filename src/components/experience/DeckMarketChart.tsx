"use client";

import * as React from "react";

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
 * The chart is COMPACT (240px tall) on purpose. This is not a replacement for
 * the /charts trading surface — it is Ticket T's "chart evidence" so a trader
 * reading the deck can see the tape the decision is talking about.
 */

interface Candle {
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
  | { kind: "READY"; candles: readonly Candle[] }
  | { kind: "EMPTY" }
  | { kind: "UNAVAILABLE"; reason: string };

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
): FetchState {
  if (!ok) return { kind: "UNAVAILABLE", reason: `HTTP ${status}` };
  const candles = parseCandles(payload);
  if (candles === null) return { kind: "UNAVAILABLE", reason: "malformed response" };
  if (candles.length === 0) return { kind: "EMPTY" };
  return { kind: "READY", candles };
}

export function DeckMarketChart({
  symbol,
  timeframe,
  bars = 120,
  fetcher,
}: DeckMarketChartProps): React.ReactElement {
  const [state, setState] = React.useState<FetchState>({ kind: "IDLE" });
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<unknown>(null);
  const seriesRef = React.useRef<unknown>(null);

  // Fetch effect — one owner of the "am I looking at fresh candles" question.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    setState({ kind: "LOADING" });
    const url = `/api/yahoo?sym=${encodeURIComponent(symbol)}&type=candles&tf=${encodeURIComponent(timeframe)}&bars=${bars}`;
    const doFetch = fetcher ?? ((u: string) => fetch(u, { cache: "no-store" }));
    doFetch(url)
      .then(async (r) => {
        if (cancelled) return;
        let body: unknown = null;
        try { body = await r.json(); } catch { body = null; }
        setState(classifyFetch(r.ok, r.status, body));
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ kind: "UNAVAILABLE", reason: String(err?.message ?? err) });
      });
    return () => { cancelled = true; };
  }, [symbol, timeframe, bars, fetcher]);

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

  const barCount = state.kind === "READY" ? state.candles.length : 0;

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
        padding: "12px 0 4px",
        background: "transparent",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Market · chart evidence
        </span>
        <span style={{ fontSize: 9, letterSpacing: 0.3, color: "#8a8271" }}>
          {symbol} · {timeframe}
          {state.kind === "READY" ? ` · ${barCount} bars` : ""}
        </span>
      </header>

      {/* One and only one visible state at a time — no ghost chart under a
          loading message, no "empty" ambient chart, no error silhouette. */}
      {state.kind === "READY" && (
        <div
          ref={containerRef}
          data-testid="deck-market-chart-canvas"
          style={{ width: "100%", height: 240 }}
        />
      )}

      {state.kind === "LOADING" && (
        <div
          data-testid="deck-market-chart-loading"
          style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#8a8271", fontSize: 11, letterSpacing: 0.3 }}
        >
          Loading candles…
        </div>
      )}

      {state.kind === "EMPTY" && (
        <div
          data-testid="deck-market-chart-empty"
          style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#8a8271", fontSize: 11, letterSpacing: 0.3, fontStyle: "italic" }}
        >
          No candles yet for {symbol} {timeframe}.
        </div>
      )}

      {state.kind === "UNAVAILABLE" && (
        <div
          data-testid="deck-market-chart-unavailable"
          style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center",
                   color: "#c05a4a", fontSize: 11, letterSpacing: 0.3 }}
        >
          Chart evidence unavailable — {state.reason}
        </div>
      )}

      {state.kind === "IDLE" && (
        <div style={{ height: 240 }} data-testid="deck-market-chart-idle" />
      )}
    </section>
  );
}

export default DeckMarketChart;
