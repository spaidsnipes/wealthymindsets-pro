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

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { clsx } from "clsx";

interface SessionLevel {
  price:  number;
  bid:    number;
  ask:    number;
  total:  number;
  delta:  number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type SessionWindow = "RTH" | "ETH" | "24H" | "2D" | "1W" | "1M";

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

const nyParts = (epochSeconds: number) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(epochSeconds * 1000));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0);
  const year = get("year"), month = get("month"), day = get("day");
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minute: get("hour") * 60 + get("minute"),
  };
};

function selectSessionCandles(candles: Candle[], window: SessionWindow): Candle[] {
  if (!candles.length) return [];
  const annotated = candles
    .filter(c => c.volume > 0 && c.high >= c.low)
    .map(c => ({ candle: c, ...nyParts(c.time) }));
  if (!annotated.length) return [];

  if (window === "RTH" || window === "ETH" || window === "24H") {
    const start = window === "RTH" ? 570 : window === "ETH" ? 240 : 0;
    const end = window === "RTH" ? 960 : window === "ETH" ? 1200 : 1440;
    const eligible = annotated.filter(x => x.minute >= start && x.minute < end);
    const latestDate = eligible.at(-1)?.date;
    return eligible.filter(x => x.date === latestDate).map(x => x.candle);
  }

  const distinctDates = [...new Set(annotated.map(x => x.date))];
  const keep = window === "2D" ? 2 : window === "1W" ? 7 : 30;
  const dates = new Set(distinctDates.slice(-keep));
  return annotated.filter(x => dates.has(x.date)).map(x => x.candle);
}

function buildSessionLevels(candles: Candle[]): SessionLevel[] {
  if (!candles.length) return [];
  const low = Math.min(...candles.map(c => c.low));
  const high = Math.max(...candles.map(c => c.high));
  const range = high - low;
  if (!(range > 0)) return [];

  const count = 48;
  const binSize = range / count;
  const totals = Array.from({ length: count }, () => 0);
  for (const candle of candles) {
    const first = Math.max(0, Math.min(count - 1, Math.floor((candle.low - low) / binSize)));
    const last = Math.max(first, Math.min(count - 1, Math.floor((candle.high - low) / binSize)));
    const perBin = candle.volume / (last - first + 1);
    for (let i = first; i <= last; i++) totals[i] += perBin;
  }

  return totals.map((total, i) => ({
    price: low + (i + 0.5) * binSize,
    bid: 0,
    ask: 0,
    total,
    delta: 0,
  })).reverse();
}

export function WMSessionVP({ symbol, timeframe, onClose }: WMSessionVPProps) {
  const [levels,        setLevels]        = useState<SessionLevel[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [hasRealTape,   setHasRealTape]   = useState(false);
  const [sessionPct,    setSessionPct]    = useState(0);
  const [sessionWindow, setSessionWindow] = useState<SessionWindow>("RTH");
  const [winOpen,       setWinOpen]       = useState(false);
  const tickCountRef = useRef(0);

  const { recentTicks } = useWebSocket({ symbol, timeframe });

  /* Build a truthful bar-derived profile from observed OHLCV. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const profileTf = ["1m", "2m", "5m", "15m", "30m", "1h"].includes(timeframe) ? timeframe : "30m";
    fetch(`/api/yahoo?sym=${encodeURIComponent(symbol)}&type=candles&tf=${profileTf}&bars=3000&ext=1`, { cache: "no-store" })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const candles = Array.isArray(json?.candles) ? json.candles as Candle[] : [];
        setLevels(buildSessionLevels(selectSessionCandles(candles, sessionWindow)));
      })
      .catch(() => { if (!cancelled) setLevels([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    tickCountRef.current = 0;
    setHasRealTape(false);
    return () => { cancelled = true; };
  }, [sessionWindow, symbol, timeframe]);

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

  /* Absorb live ticks into session levels */
  useEffect(() => {
    if (!recentTicks.length) return;
    const tick = recentTicks.find(t => t.trade);
    if (!tick) return;
    setHasRealTape(true);
    tickCountRef.current++;

    setLevels(prev => {
      // Find nearest level and add volume
      let nearest = 0;
      let minDist = Infinity;
      prev.forEach((lvl, i) => {
        const d = Math.abs(lvl.price - tick.price);
        if (d < minDist) { minDist = d; nearest = i; }
      });

      // A real executed trade belongs to one nearest price bin only.
      const updated = prev.map((lvl, i) => {
        if (i !== nearest) return lvl;
        const addVol = Math.max(0, tick.size);
        const addBid = tick.side === "sell" ? addVol : 0;
        const addAsk = tick.side === "buy" ? addVol : 0;
        const bid    = lvl.bid + addBid;
        const ask    = lvl.ask + addAsk;
        return { ...lvl, bid, ask, total: lvl.total + addVol, delta: ask - bid };
      });
      return updated;
    });
  }, [recentTicks]);

  /* Recompute VA/POC */
  if (loading || levels.length === 0) {
    return (
      <div className="border-l border-wm-border bg-wm-black shrink-0 flex flex-col items-center justify-center gap-2"
        style={{ width: 260 }}>
        <span className="text-[10px] font-black text-wm-purple uppercase tracking-widest">wmSession VP</span>
        <span className="text-[10px] text-wm-text-dim">
          {loading ? "Loading real OHLCV…" : "No reported volume for this session"}
        </span>
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
          <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse" />
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
        <span className="text-[8px] text-wm-text-dim">BAR-DERIVED</span>
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
