"use client";

/**
 * WMSession VP — Session Volume Profile Indicator
 *
 * Shows the volume profile for the current Regular Trading Hours session
 * (9:30 AM – 4:00 PM ET = 13:30–20:00 UTC).
 *
 * Key features:
 * - Live bid/ask per price level from real ticks (via useWebSocket)
 * - Bid/ask numbers visible when zoomed in (barSpacing > threshold)
 * - POC, VAH, VAL markers
 * - Session progress indicator
 * - Compact sidebar panel
 */

import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { clsx } from "clsx";
import {
  nyParts,
  selectSessionCandles,
  buildSessionLevels,
  foldTape,
  buildTapeLevels,
  type SessionLevel,
  type Candle,
  type SessionWindow,
  type TapeTick,
} from "@/lib/sessionVP";

interface SessionWindowConfig {
  label:     string;
  desc:      string;
  startHour: number; // UTC hour session starts (0-23, or -1 for multi-day)
  endHour:   number; // UTC hour session ends
  lookback:  number; // days to look back (1 = today only)
}

const SESSION_WINDOWS: Record<SessionWindow, SessionWindowConfig> = {
  RTH: { label: "RTH",      desc: "9:30–4:00 PM ET",    startHour: 13.5, endHour: 20,   lookback: 1 },
  ETH: { label: "Extended", desc: "4:00 AM–8:00 PM ET", startHour: 8,    endHour: 24,   lookback: 1 },
  "24H":{ label: "24H",     desc: "Full 24 hours",       startHour: 0,    endHour: 24,   lookback: 1 },
  "2D": { label: "2 Days",  desc: "Last 2 sessions",     startHour: 0,    endHour: 24,   lookback: 2 },
  "1W": { label: "1 Week",  desc: "Mon–Fri this week",   startHour: 0,    endHour: 24,   lookback: 7 },
  "1M": { label: "1 Month", desc: "Last 30 days",        startHour: 0,    endHour: 24,   lookback: 30 },
};

interface WMSessionVPProps {
  symbol:    string;
  timeframe: string;
  /**
   * The canonical candles the chart actually rendered for the current data
   * identity (provider-correct). WM-VP-P0-01: the VP is a PURE projection of
   * these — it never fetches its own candles, so it can never diverge from the
   * chart's provider/symbol/timeframe again.
   */
  candles:   Candle[];
  /**
   * Monotonic version that bumps when the chart's data identity changes
   * (symbol / timeframe / provider). On change the VP drops accumulated tape
   * atomically, so symbol B never shows symbol A's tape.
   */
  dataVersion?: number;
  /** Resolved provider name — used only for honest "unavailable" messaging. */
  provider?: string;
  onClose?:  () => void;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`;
  return String(n);
}

function fmtPrice(p: number): string {
  if (p > 10_000) return p.toFixed(0);
  if (p > 100)    return p.toFixed(2);
  if (p > 1)      return p.toFixed(3);
  return p.toFixed(5);
}

export function WMSessionVP({ symbol, timeframe, candles, dataVersion = 0, provider, onClose }: WMSessionVPProps) {
  const [tape,          setTape]          = useState<TapeTick[]>([]);
  const [hasRealTape,   setHasRealTape]   = useState(false);
  const [sessionPct,    setSessionPct]    = useState(0);
  const [sessionWindow, setSessionWindow] = useState<SessionWindow>("RTH");
  const [winOpen,       setWinOpen]       = useState(false);
  const tickCountRef = useRef(0);

  const { recentTicks } = useWebSocket({ symbol, timeframe });

  // WM-VP-P0-01 Fix 1 (kills F-A): bar-derived profile is a PURE projection of
  // the chart's canonical candles for the selected session. No fetch — the VP
  // can no longer diverge from the chart's provider/symbol/timeframe.
  const barLevels = React.useMemo(
    () => buildSessionLevels(selectSessionCandles(candles, sessionWindow)),
    [candles, sessionWindow],
  );

  // Whether the chart handed us ANY candles — distinguishes "provider gave us
  // nothing to project" from "today's session hasn't produced bars yet".
  const haveCandles = candles.length > 0;

  // WM-VP-P0-01 Fix 4: drop accumulated tape atomically whenever the chart's
  // data identity changes (symbol / timeframe / provider / session window), so
  // symbol B never renders symbol A's tape. Mirrors DataVersionGuard semantics.
  const identity = `${dataVersion}|${symbol}|${timeframe}|${sessionWindow}`;
  useEffect(() => {
    setTape([]);
    setHasRealTape(false);
    tickCountRef.current = 0;
  }, [identity]);

  /* Update session pct based on selected window */
  useEffect(() => {
    const cfg = SESSION_WINDOWS[sessionWindow];
    const calc = () => {
      const now = new Date();
      const etMinute = nyParts(Math.floor(now.getTime() / 1000)).minute;
      let pct: number;
      if (sessionWindow === "RTH") {
        pct = Math.max(0, Math.min(100, ((etMinute - 570) / (960 - 570)) * 100));
      } else if (cfg.lookback > 1) {
        // Multi-day: base on day of week / time in lookback period
        const dayOfWeek = now.getUTCDay(); // 0=Sun
        pct = Math.min(100, (dayOfWeek / Math.min(cfg.lookback, 5)) * 100);
      } else {
        const start = sessionWindow === "ETH" ? 240 : 0;
        const end = sessionWindow === "ETH" ? 1200 : 1440;
        pct = Math.max(0, Math.min(100, ((etMinute - start) / (end - start)) * 100));
      }
      setSessionPct(pct);
    };
    calc();
    const iv = setInterval(calc, 60_000);
    return () => clearInterval(iv);
  }, [sessionWindow]);

  /* Absorb one representative live executed trade per tick update into the tape
     (same fold cardinality as before — no new tick pipeline). */
  useEffect(() => {
    if (!recentTicks.length) return;
    const tick = recentTicks.find(t => t.trade && t.size > 0 && t.price > 0);
    if (!tick) return;
    setHasRealTape(true);
    tickCountRef.current++;
    setTape(prev => {
      const next = prev.concat({ price: tick.price, size: tick.size, side: tick.side });
      return next.length > 5000 ? next.slice(-5000) : next;   // bounded
    });
  }, [recentTicks]);

  // WM-VP-P0-01 Fix 3 (kills F-C): bar layer and live-tape layer are combined
  // independently. When bar bins exist, fold the tape into them; when the bar
  // layer is empty but tape is flowing, build a profile from the tape alone.
  // Bar-emptiness must never suppress a non-empty tick layer.
  const levels = React.useMemo<SessionLevel[]>(() => {
    if (barLevels.length) return foldTape(barLevels, tape);
    if (tape.length)      return buildTapeLevels(tape);
    return [];
  }, [barLevels, tape]);

  // Which layer is actually feeding the panel (labels itself honestly).
  const layerLabel = barLevels.length ? "BAR-DERIVED" : (tape.length ? "LIVE TAPE" : "—");

  /* Recompute VA/POC */
  if (levels.length === 0) {
    // Honest empty states: no candles from the chart at all vs. a rendered
    // session that simply carries no reported volume yet. Never a blank Yahoo.
    const reason = !haveCandles
      ? "Session starting — awaiting first bars"
      : "No reported volume for this session";
    return (
      <div className="border-l border-wm-border bg-wm-black shrink-0 flex flex-col items-center justify-center gap-2"
        style={{ width: 260 }}>
        <span className="text-[10px] font-black text-wm-purple uppercase tracking-widest">wmSession VP</span>
        <span className="text-[10px] text-wm-text-dim text-center px-3">{reason}</span>
        {onClose && <button onClick={onClose} className="text-[10px] text-wm-text-muted hover:text-wm-text">Close</button>}
      </div>
    );
  }

  const maxTotal  = Math.max(...levels.map(l => l.total), 1);
  const pocIdx    = levels.reduce((best, l, i) => l.total > levels[best].total ? i : best, 0);
  const totalVol  = levels.reduce((s, l) => s + l.total, 0);

  // 70% value area
  let vaVol = levels[pocIdx].total;
  let lo = pocIdx, hi = pocIdx;
  while (vaVol < totalVol * 0.7 && (lo > 0 || hi < levels.length - 1)) {
    const addLo = lo > 0         ? levels[lo - 1].total : 0;
    const addHi = hi < levels.length - 1 ? levels[hi + 1].total : 0;
    if (addLo >= addHi && lo > 0) { lo--; vaVol += levels[lo].total; }
    else if (hi < levels.length - 1) { hi++; vaVol += levels[hi].total; }
    else break;
  }

  const pocLevel  = levels[pocIdx];
  const vahLevel  = levels[lo];
  const valLevel  = levels[hi];

  const ROW_H = 22;

  return (
    <div
      className="border-l border-wm-border bg-wm-black shrink-0 flex flex-col select-none"
      style={{ width: 260, overflow: "hidden" }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 border-b border-wm-border shrink-0" style={{ height: 34 }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-wm-purple uppercase tracking-widest">wmSession VP</span>
          {/* §9 COLOR + MOTION LAW: a green pulsing dot used to sit here,
              conditioned on NOTHING. It reported no event and proved no feed —
              it simply made the panel look alive. Deleted rather than
              recoloured, because there is no true statement it was making. */}
        </div>
        <div className="flex items-center gap-1">
          {/* Session Window Picker */}
          <div className="relative">
            <button
              onClick={() => setWinOpen(v => !v)}
              className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold border bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text transition-all"
            >
              {SESSION_WINDOWS[sessionWindow].label} ▾
            </button>
            {winOpen && (
              <div className="absolute top-7 right-0 z-50 bg-wm-card border border-wm-border rounded-xl shadow-2xl overflow-hidden" style={{ minWidth: 160 }}>
                {(Object.entries(SESSION_WINDOWS) as [SessionWindow, SessionWindowConfig][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setSessionWindow(key); setWinOpen(false); }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-wm-surface/60 transition-colors",
                      sessionWindow === key ? "text-wm-purple" : "text-wm-text"
                    )}
                  >
                    <span className="text-[10px] font-bold">{cfg.label}</span>
                    <span className="text-[9px] text-wm-text-dim ml-2">{cfg.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span
            className="text-[8px] px-1.5 py-0.5 rounded font-bold border bg-wm-surface border-wm-border text-wm-text-dim"
            title={hasRealTape ? "Real executed trades are being added live" : "Historical profile uses reported OHLCV total volume"}>
            {hasRealTape ? "LIVE TAPE +" : "OHLCV"}
          </span>
          {onClose && (
            <button onClick={onClose}
              className="text-wm-text-dim hover:text-wm-red transition-colors text-[11px] px-1">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Session time progress */}
      <div className="px-2 pt-1.5 pb-1 border-b border-wm-border/50 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-wm-text-dim">{SESSION_WINDOWS[sessionWindow].desc}</span>
          <span className="text-[9px] font-bold text-wm-green">{sessionPct.toFixed(0)}% done</span>
        </div>
        <div className="h-1 bg-wm-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${sessionPct}%`,
              background: "linear-gradient(90deg, #8B5CF6, #4FA3E0)",
            }}
          />
        </div>
      </div>

      {/* Column legend */}
      <div className="flex items-center px-2 border-b border-wm-border/60 shrink-0" style={{ height: 20 }}>
        <span className="text-[9px] font-black text-wm-purple w-14">VOLUME</span>
        <div className="flex-1 text-center text-[9px] text-wm-text-muted">PRICE</div>
        <span className="text-[8px] text-wm-text-dim">{layerLabel}</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {levels.map((lvl, i) => {
          const barPct   = lvl.total / maxTotal;
          const isPOC    = i === pocIdx;
          const isVAH    = i === lo;
          const isVAL    = i === hi;
          const inVA     = i >= lo && i <= hi;
          const priceStr = fmtPrice(lvl.price);

          return (
            <div
              key={i}
              className="relative flex items-center cursor-pointer hover:brightness-110"
              style={{
                height: ROW_H,
                background: isPOC ? "rgba(139,92,246,0.12)"
                  : inVA ? "rgba(79,163,224,0.04)"
                  : "transparent",
                borderBottom: "1px solid rgba(37,45,56,0.25)",
                borderLeft: isPOC ? "3px solid #8B5CF6" : "3px solid transparent",
              }}
            >
              {/* VAH/VAL lines */}
              {isVAH && <div className="absolute inset-x-0 top-0 h-px" style={{ background:"rgba(79,163,224,0.7)" }} />}
              {isVAL && <div className="absolute inset-x-0 bottom-0 h-px" style={{ background:"rgba(79,163,224,0.7)" }} />}

              <div className="absolute inset-0 flex items-center gap-2 px-2">
                <span className="font-mono text-right shrink-0 text-[10px] font-bold"
                  style={{ width: 42, color: isPOC ? "#E8B923" : "#A78BFA" }}>
                  {fmt(lvl.total)}
                </span>
                <div className="relative flex-1 overflow-hidden" style={{ height: 15 }}>
                  <div className="absolute right-0 inset-y-[1px] rounded-l-sm transition-all duration-300"
                    style={{
                      width: `${Math.max(2, barPct * 100)}%`,
                      background: isPOC
                        ? "linear-gradient(90deg, rgba(232,185,35,.42), rgba(232,185,35,.94))"
                        : `linear-gradient(90deg, rgba(139,92,246,.18), rgba(139,92,246,${0.42 + barPct * 0.38}))`,
                      boxShadow: isPOC ? "0 0 9px rgba(232,185,35,.35)" : "none",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-center leading-none"
                      style={{
                        fontSize: 10,
                        color: isPOC ? "#F7D879" : inVA ? "#B8CBFF" : "#89909C",
                        fontWeight: isPOC ? 900 : 600,
                        textShadow: "0 1px 2px rgba(0,0,0,.9)",
                      }}>
                      {priceStr}{isPOC && "  POC"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: POC / VAH / VAL */}
      <div className="border-t border-wm-border px-2 py-1.5 shrink-0 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-wm-purple uppercase tracking-wider">POC</span>
          <span className="text-xs font-mono font-black text-wm-purple">{fmtPrice(pocLevel.price)}</span>
          <span className="text-[9px] font-mono text-wm-text-dim">{fmt(pocLevel.total)} vol</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-wm-blue uppercase tracking-wider">VAH</span>
          <span className="text-xs font-mono font-semibold text-wm-blue">{fmtPrice(vahLevel.price)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-wm-blue uppercase tracking-wider">VAL</span>
          <span className="text-xs font-mono font-semibold text-wm-blue">{fmtPrice(valLevel.price)}</span>
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-wm-border/40">
          <span className="text-[9px] text-wm-text-dim">Session vol</span>
          <span className="text-[9px] font-mono text-wm-text">{totalVol.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
