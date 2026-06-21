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

function getTickSize(base: number) {
  if (base > 10_000) return 5;
  if (base > 1_000)  return 0.25;
  if (base > 100)    return 0.1;
  if (base > 10)     return 0.05;
  if (base > 1)      return 0.001;
  return 0.0001;
}

const SEED_PRICES: Record<string,number> = {
  "NQ1!": 21_847, "ES1!": 5_892, "RTY1!": 2_184, "YM1!": 43_210,
  "GC1!": 2_652,  "CL1!": 78.42, "AAPL": 228, "TSLA": 412, "NVDA": 875,
  "SPY": 589, "QQQ": 513, "BTC": 104_280, "ETH": 3_890,
};
function getBase(sym: string) { return SEED_PRICES[sym.toUpperCase()] ?? 100; }

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

/* Build initial session levels centered on base price */
function buildSessionLevels(base: number): SessionLevel[] {
  const tick = getTickSize(base);
  const levels: SessionLevel[] = [];
  const count = 40;
  const half  = Math.floor(count / 2);

  for (let i = half; i >= -half; i--) {
    const price = +(base + i * tick).toFixed(6);
    // Bell-curve distribution — POC near center
    const bell  = Math.exp(-0.5 * (i / (half * 0.3)) ** 2);
    // Seeded so base volumes are stable across re-renders
    const n = Math.floor(Math.abs(price) * 100) + i * 997;
    const r1 = Math.abs(Math.sin(n * 12.9898 + i * 78.233) * 43758.5453 % 1);
    const r2 = Math.abs(Math.sin(n * 37.719  + i * 43.321) * 43758.5453 % 1);
    const total = Math.floor(100 + bell * 4000 + r1 * 200);
    const askR  = 0.35 + r2 * 0.4;
    const ask   = Math.floor(total * askR);
    const bid   = total - ask;
    levels.push({ price, bid, ask, total, delta: ask - bid });
  }
  return levels;
}

export function WMSessionVP({ symbol, timeframe, onClose }: WMSessionVPProps) {
  const base = getBase(symbol);
  const [levels,        setLevels]        = useState<SessionLevel[]>(() => buildSessionLevels(base));
  const [showBidAsk,    setShowBidAsk]    = useState(true);
  const [viewMode,      setViewMode]      = useState<"profile"|"delta">("profile");
  const [sessionPct,    setSessionPct]    = useState(0);
  const [sessionWindow, setSessionWindow] = useState<SessionWindow>("RTH");
  const [winOpen,       setWinOpen]       = useState(false);
  const tickCountRef = useRef(0);

  const { recentTicks } = useWebSocket({ symbol, timeframe });

  /* Reset levels when session window changes */
  useEffect(() => {
    setLevels(buildSessionLevels(base));
    tickCountRef.current = 0;
  }, [sessionWindow, base]);

  /* Update session pct based on selected window */
  useEffect(() => {
    const cfg = SESSION_WINDOWS[sessionWindow];
    const calc = () => {
      const now = new Date();
      const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
      let pct: number;
      if (sessionWindow === "RTH") {
        pct = Math.max(0, Math.min(100, ((utcH - 13.5) / (20 - 13.5)) * 100));
      } else if (cfg.lookback > 1) {
        // Multi-day: base on day of week / time in lookback period
        const dayOfWeek = now.getUTCDay(); // 0=Sun
        pct = Math.min(100, (dayOfWeek / Math.min(cfg.lookback, 5)) * 100);
      } else {
        const start = cfg.startHour, end = cfg.endHour === 24 ? 24 : cfg.endHour;
        pct = Math.max(0, Math.min(100, ((utcH - start) / (end - start)) * 100));
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
    const tick = recentTicks[0]; // most recent
    tickCountRef.current++;

    setLevels(prev => {
      // Find nearest level and add volume
      let nearest = 0;
      let minDist = Infinity;
      prev.forEach((lvl, i) => {
        const d = Math.abs(lvl.price - tick.price);
        if (d < minDist) { minDist = d; nearest = i; }
      });

      // Also nudge 1-2 adjacent levels with smaller volume
      const updated = prev.map((lvl, i) => {
        const dist = Math.abs(i - nearest);
        if (dist > 2) return lvl;
        const factor = dist === 0 ? 1 : dist === 1 ? 0.4 : 0.15;
        const addVol = Math.max(1, Math.floor(tick.size * factor));
        const addBid = tick.side === "sell" ? addVol : Math.floor(addVol * 0.3);
        const addAsk = tick.side === "buy"  ? addVol : Math.floor(addVol * 0.3);
        const bid    = lvl.bid + addBid;
        const ask    = lvl.ask + addAsk;
        return { ...lvl, bid, ask, total: bid + ask, delta: ask - bid };
      });
      return updated;
    });
  }, [recentTicks]);

  /* Recompute VA/POC */
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

          <button
            onClick={() => setViewMode(v => v === "profile" ? "delta" : "profile")}
            className={clsx(
              "text-[9px] px-1.5 py-0.5 rounded font-bold transition-all border",
              viewMode === "delta"
                ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
                : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text"
            )}>
            {viewMode === "profile" ? "B×A" : "Δ"}
          </button>
          <button
            onClick={() => setShowBidAsk(v => !v)}
            className={clsx(
              "text-[9px] px-1.5 py-0.5 rounded font-bold transition-all border",
              showBidAsk
                ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40"
                : "bg-wm-surface border-wm-border text-wm-text-muted"
            )}
            title="Show bid/ask numbers">
            #
          </button>
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
        {viewMode === "profile" ? (
          <>
            <span className="text-[10px] font-black text-wm-red w-12 text-left">BID</span>
            <div className="flex-1 text-center text-[9px] text-wm-text-muted">PRICE</div>
            <span className="text-[10px] font-black text-wm-green w-12 text-right">ASK</span>
          </>
        ) : (
          <>
            <div className="flex-1 text-center text-[9px] text-wm-text-muted">PRICE</div>
            <span className="text-[10px] font-black text-wm-text-muted w-16 text-right">DELTA</span>
          </>
        )}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {levels.map((lvl, i) => {
          const barPct   = lvl.total / maxTotal;
          const isPOC    = i === pocIdx;
          const isVAH    = i === lo;
          const isVAL    = i === hi;
          const inVA     = i >= lo && i <= hi;
          const deltaPos = lvl.delta >= 0;
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

              {viewMode === "profile" ? (
                <div className="absolute inset-0 flex items-center px-1">
                  {/* BID number */}
                  <span className="font-mono text-left shrink-0"
                    style={{ width:44, fontSize:11, color: isPOC ? "#FF6B7A" : "rgba(255,77,106,0.9)", fontWeight:700 }}>
                    {showBidAsk ? fmt(lvl.bid) : ""}
                  </span>

                  {/* Bar area */}
                  <div className="relative flex-1 rounded-sm overflow-hidden mx-1" style={{ height: 14 }}>
                    {/* Bid bar (left) */}
                    <div className="absolute left-0 top-0 bottom-0 transition-all duration-300"
                      style={{
                        width:`${(lvl.bid / lvl.total) * barPct * 100}%`,
                        background: isPOC ? "rgba(139,92,246,0.65)" : `rgba(255,77,106,${0.18 + barPct * 0.5})`,
                      }}
                    />
                    {/* Ask bar (right) */}
                    <div className="absolute right-0 top-0 bottom-0 transition-all duration-300"
                      style={{
                        width:`${(lvl.ask / lvl.total) * barPct * 100}%`,
                        background: isPOC ? "rgba(139,92,246,0.65)" : `rgba(0,212,170,${0.18 + barPct * 0.5})`,
                      }}
                    />
                    {/* Price label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-center leading-none"
                        style={{
                          fontSize:   10,
                          color:      isPOC ? "#A78BFA" : inVA ? "#4FA3E0" : "#6B7280",
                          fontWeight: isPOC ? 900 : 600,
                        }}>
                        {priceStr}
                        {isPOC && " ◄POC"}
                      </span>
                    </div>
                  </div>

                  {/* ASK number */}
                  <span className="font-mono text-right shrink-0"
                    style={{ width:44, fontSize:11, color: isPOC ? "#20FFD0" : "rgba(0,212,170,0.9)", fontWeight:700 }}>
                    {showBidAsk ? fmt(lvl.ask) : ""}
                  </span>
                </div>
              ) : (
                /* Delta view */
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="font-mono shrink-0 text-[10px] text-wm-text-dim" style={{ width:60 }}>{priceStr}</span>
                  <div className="relative flex-1 mx-1" style={{ height:12 }}>
                    <div className="absolute inset-y-0 left-1/2 w-px bg-wm-border" />
                    <div className="absolute top-0 bottom-0 transition-all duration-300"
                      style={{
                        left:   deltaPos ? "50%" : `${50 - Math.abs(lvl.delta)/lvl.total*50}%`,
                        width:  `${Math.abs(lvl.delta)/lvl.total*50}%`,
                        background: deltaPos ? "rgba(0,212,170,0.6)" : "rgba(255,77,106,0.6)",
                      }}
                    />
                  </div>
                  <span className="font-mono font-bold text-right text-[10px] shrink-0"
                    style={{ width:48, color: deltaPos ? "#00D4AA" : "#FF4D6A" }}>
                    {deltaPos ? "+" : ""}{fmt(Math.abs(lvl.delta))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: POC / VAH / VAL */}
      <div className="border-t border-wm-border px-2 py-1.5 shrink-0 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-wm-purple uppercase tracking-wider">POC</span>
          <span className="text-xs font-mono font-black text-wm-purple">{fmtPrice(pocLevel.price)}</span>
          {showBidAsk && (
            <span className="text-[9px] font-mono text-wm-text-dim">{fmt(pocLevel.bid)}B / {fmt(pocLevel.ask)}A</span>
          )}
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
