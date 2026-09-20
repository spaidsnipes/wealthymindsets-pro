"use client";

/**
 * ChartCompanion — FL-04 "News Chart Companion". The /news right column
 * that HOLDS THE SAME CAMERA as /charts instead of opening another app.
 *
 * Plate authority: WM_FL_04_NEWS_CHART_COMPANION — "COMPANION TRAVELS
 * SAME DECISION_ID NOT ANOTHER APP". Before this component existed the
 * guest tour failed step 11: leaving /charts for /news dropped every
 * market pixel; the reader lost the symbol, the verdict, and the session
 * truth until they navigated back.
 *
 * THIS FILE DECIDES NOTHING. Every judgement — price, session, freshness,
 * whether the panel may appear at all — belongs to
 * `selectChartCompanion()` (src/lib/experience/selectChartCompanion.ts),
 * which delegates in turn to the canonical owners. What lives here is
 * React wiring and pixels. A component that re-derived any of those
 * readings would be a SECOND OPINION, and two owners of one reading is
 * how this codebase got a phone pill claiming RTH on a Saturday.
 *
 * WHAT "SAME CAMERA" MEANS IN CODE — every reading here is a second
 * consumer of an owner /charts already writes, never a second writer:
 *
 *   symbol        SymbolContext (the room-shared identity)
 *   identity      canonicalMarketStateIdentity over the SAME persisted
 *                 wm_timeframe / wm_extHours the chart itself seeds from,
 *                 so this panel subscribes to the exact store key the
 *                 chart's publisher writes — not a parallel 15m guess.
 *   price         chartHeaderPriceFact (the one owner of "live quote vs
 *                 bar close vs nothing") over the canonical snapshot.
 *   verdict       useMarketCanvasVM → CanvasSummaryPill / CanvasBadgeMini,
 *                 the same compiler /charts and /command-deck read.
 *   session       selectCanonicalSessionToken — the owner that stopped
 *                 the phone pill claiming RTH on a Saturday.
 *   tape          sessionSymbolStore (browser-local observed trades),
 *                 labelled as browser-local memory, never as a feed.
 *
 * WHAT THIS PANEL MUST NEVER DO:
 *   - mint a Decision_ID (it renders state; it decides nothing) — §7
 *     Market Camera Immortality;
 *   - fabricate a price (no snapshot → the honest sentence about WHY,
 *     which names a store lifetime, not a market condition);
 *   - claim LIVE from memory (freshness comes from lastTradeAtMs and
 *     ages on the canvas clock, exactly like MobileSessionPill).
 *
 * The canonical market state store is IN-MEMORY and page-session scoped
 * (canonicalMarketStateStore.ts: "not an unbounded history database").
 * Client-side navigation from /charts keeps it warm; a hard reload of
 * /news starts it empty. Both states are rendered truthfully — the
 * empty one says the chart has not compiled in THIS page session and
 * offers the door back, which is an honest absence, not a beautiful lie.
 *
 * Desktop-and-up column (hidden below lg): at phone width the shell
 * header already carries the camera via MobileSessionPill, and a second
 * phone owner for the same reading would be a duplicate-owner defect.
 */

import * as React from "react";
import Link from "next/link";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { useSessionClockDate } from "@/lib/marketData/useProvenSessionClosure";
import { useCanonicalMarketState } from "@/lib/marketData/useCanonicalMarketState";
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import { useCanvasClock } from "@/lib/marketData/viewModels/canvasClock";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import {
  selectChartCompanion,
  type CompanionTapeReading,
} from "@/lib/experience/selectChartCompanion";
import CanvasSummaryPill from "@/components/experience/CanvasSummaryPill";
import CanvasBadgeMini from "@/components/experience/CanvasBadgeMini";

/**
 * The chart's OWN persisted camera settings, read after mount only.
 * `null` until hydrated — the component renders nothing before that, so
 * SSR and first client paint agree (no #418, no fabricated defaults).
 */
function useChartCameraSettings(): { timeframe: string; extHours: boolean } | null {
  const [settings, setSettings] = React.useState<{ timeframe: string; extHours: boolean } | null>(null);
  React.useEffect(() => {
    const read = <T,>(key: string, fallback: T): T => {
      try {
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : fallback;
      } catch {
        return fallback;
      }
    };
    // Same keys, same fallbacks, as ChartsDashboard's own seeds — this is
    // a READ of the chart's persisted camera, not a second opinion on it.
    setSettings({
      timeframe: read<string>("wm_timeframe", "5m"),
      extHours: read<boolean>("wm_extHours", true),
    });
  }, []);
  return settings;
}

/** Observed-trade memory for one symbol — a read of the shared store. */
function useTapeReading(symbol: string): CompanionTapeReading {
  const [tick, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => subscribeSessionSymbolStore(() => force()), []);
  return React.useMemo(() => {
    const upper = symbol.toUpperCase();
    const rows = getKnownSessionSymbols().filter(
      (s) => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0,
    );
    const trades = rows.reduce((sum, r) => sum + r.slot.stats.tradeCount, 0);
    const lastTradeMs = rows.reduce<number | null>((acc, r) => {
      const t = r.slot.lastTradeAtMs
        ?? (r.slot.horizon?.startedAtSec != null ? r.slot.horizon.startedAtSec * 1000 : null);
      if (t == null) return acc;
      return acc == null ? t : Math.max(acc, t);
    }, null);
    // The richest slot's CVD spark (most trades = most evidence). Real
    // samples only; an empty array draws nothing.
    const richest = rows.reduce<(typeof rows)[number] | null>(
      (best, r) => (!best || r.slot.stats.tradeCount > best.slot.stats.tradeCount ? r : best),
      null,
    );
    return { trades, lastTradeMs, cvdSpark: richest?.slot.cvdSpark ?? [] };
    // `tick` is the store-notification counter — the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tick]);
}

/** Minimal real-data sparkline. Silent under 2 samples — one dot is not a line. */
function CvdSparkline({ samples }: { samples: readonly number[] }): React.ReactElement | null {
  if (samples.length < 2) return null;
  const w = 132;
  const h = 26;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const pts = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * (w - 2) + 1;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Session CVD sparkline, ${samples.length} samples, browser-local memory`}
      data-testid="chart-companion-cvd-spark"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#c9a55c"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChartCompanion(): React.ReactElement | null {
  const { activeSymbol } = useActiveSymbol();
  const auth = useAuth();
  const camera = useChartCameraSettings();
  const symbol = (activeSymbol || "").toUpperCase();

  // Identity = the SAME store key the chart's publisher writes for this
  // symbol at its persisted timeframe. Throws only on an unknown tf id
  // (e.g. a legacy value in localStorage) — silence beats a white screen.
  const identity = React.useMemo(() => {
    if (!camera || !symbol) return null;
    try {
      return canonicalMarketStateIdentity({
        symbol,
        timeframe: camera.timeframe,
        extHours: camera.extHours,
      });
    } catch {
      return null;
    }
  }, [camera, symbol]);

  const state = useCanonicalMarketState(identity);
  const { canvas } = useMarketCanvasVM({
    identity,
    ownerId: auth?.user?.id ?? null,
  });
  const tape = useTapeReading(symbol);
  const sessionClockDate = useSessionClockDate();
  const tickedNowMs = useCanvasClock();

  // THE ONE JUDGEMENT CALL. Everything below this line is pixels.
  const vm = selectChartCompanion({
    symbol,
    timeframe: camera?.timeframe ?? null,
    state,
    tape,
    nowMs: tickedNowMs ?? Date.now(),
    at: sessionClockDate,
  });

  // Pre-hydration (camera settings unread) the panel renders nothing:
  // SSR/first-paint agreement, and no claim is made before it can be true.
  if (!vm.visible) return null;

  const { fresh } = vm;
  const dotColor = !vm.tapeObserved ? "#8a8271" : fresh ? "#00E88A" : "#F5A623";

  return (
    <aside
      data-testid="chart-companion"
      aria-label={vm.spoken}
      className="hidden lg:flex flex-col shrink-0 gap-3 p-3 overflow-y-auto"
      style={{
        width: 232,
        borderLeft: "1px solid rgba(139,106,41,0.18)",
        background: "linear-gradient(180deg, rgba(11,11,13,0.92) 0%, rgba(11,11,13,0.72) 100%)",
      }}
    >
      {/* Masthead — plate: the companion is the SAME camera, not another app */}
      <div>
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 9,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "#8a8271",
          }}
        >
          Chart Companion
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
          <span
            aria-hidden="true"
            style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: dotColor,
              boxShadow: fresh ? "0 0 3px #00E88A" : "none",
            }}
          />
          <span
            data-testid="chart-companion-symbol"
            style={{
              fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
              color: "#ede6d3", fontVariantNumeric: "tabular-nums",
            }}
          >
            {vm.symbol}
          </span>
          <span
            title={vm.sessionDetail}
            style={{
              color: "#c9a55c", fontSize: 8, fontWeight: 500,
              letterSpacing: 0.3, padding: "1px 4px", borderRadius: 3,
              border: "1px solid rgba(201,165,92,0.32)",
              background: "rgba(201,165,92,0.06)",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}
          >
            {vm.sessionToken}
          </span>
          <CanvasBadgeMini vm={canvas} />
        </div>
      </div>

      {/* Price — the one owner's exact words, or the honest absence */}
      <div data-testid="chart-companion-price">
        {vm.price.kind === "READING" ? (
          <div
            title={vm.price.fact.reason}
            style={{
              fontSize: vm.price.fact.kind === "LIVE_QUOTE" ? 18 : 12,
              fontWeight: 600,
              color: vm.price.fact.measured ? "#ede6d3" : "#8a8271",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.25,
              overflowWrap: "anywhere",
            }}
          >
            {vm.price.fact.text}
          </div>
        ) : (
          <p style={{ fontSize: 10, lineHeight: 1.5, color: "#8a8271", margin: 0 }}>
            {vm.price.reason}
          </p>
        )}
      </div>

      {/* Verdict / evidence — same compiler as /charts; silent-safe */}
      <CanvasSummaryPill vm={canvas} />

      {/* Observed tape memory — labelled as browser-local, never as a feed */}
      {vm.tapeObserved && (
        <div data-testid="chart-companion-tape">
          <div
            style={{
              fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase",
              color: "#8a8271", marginBottom: 2,
            }}
          >
            Session tape · browser-local memory
          </div>
          <div style={{ fontSize: 10, color: "#c2b892", fontVariantNumeric: "tabular-nums" }}>
            {vm.tradeCount.toLocaleString("en-US")} trade{vm.tradeCount === 1 ? "" : "s"} observed
            {" · "}
            {fresh ? "fresh <30s" : "not fresh"}
          </div>
          <CvdSparkline samples={vm.cvdSpark} />
        </div>
      )}

      {/* The door back — carries the camera (symbol + tf), mints nothing */}
      <Link
        href={vm.chartHref}
        data-testid="chart-companion-open-chart"
        className="transition-all"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minHeight: 32, padding: "6px 10px", borderRadius: 6,
          border: "1px solid rgba(212,175,55,0.35)",
          background: "rgba(212,175,55,0.08)",
          color: "#d4af37", fontSize: 10, fontWeight: 700,
          letterSpacing: 0.4, textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        Open chart · {vm.symbol} {vm.timeframe}
      </Link>

      <p style={{ fontSize: 8.5, lineHeight: 1.5, color: "#655f52", margin: 0 }}>
        Same decision camera as the chart — this panel reads the state the
        chart compiled. It decides nothing and mints no Decision ID.
      </p>
    </aside>
  );
}

export default ChartCompanion;
