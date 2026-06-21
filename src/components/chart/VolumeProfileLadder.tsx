"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

// Seed prices — overridden by live REST fetch at mount
const SYMBOL_SEEDS: Record<string, number> = {
  "NQ1!": 30_414, "ES1!": 7_557,  "RTY1!": 2_968,  "YM1!": 52_464,
  "GC1!": 4_349,  "CL1!": 75.68,  "SI1!":  33,     "ZB1!": 115,
  "AAPL": 212,    "TSLA": 396,    "NVDA":  134,    "AMZN": 204,
  "META": 665,    "MSFT": 472,    "GOOG":  183,    "SPY":  741,
  "QQQ":  733,    "IWM":  215,    "BTC":   104_500, "ETH":  2_490,
  "SOL":  155,    "BNB":  640,    "XRP":   2.38,   "DOGE": 0.17,
  "EUR/USD":1.13, "GBP/USD":1.34, "USD/JPY":144,   "ADA":  0.65,
};

function getBase(sym: string) { return SYMBOL_SEEDS[sym.toUpperCase()] ?? 100; }

function getTickSize(base: number) {
  if (base > 10_000) return 25;
  if (base > 1_000)  return 2.5;
  if (base > 100)    return 0.5;
  if (base > 10)     return 0.1;
  return 0.0001;
}

interface Level {
  price:  number;
  bid:    number;
  ask:    number;
  total:  number;
  delta:  number;
  pct:    number;
  isPOC:  boolean;
  isVAH:  boolean;
  isVAL:  boolean;
  inVA:   boolean;
}

// Deterministic seeded random — same price+index always produces same value.
// This keeps the synthetic base volumes STABLE so the VP doesn't spin.
function stableRand(price: number, idx: number): number {
  const n = Math.floor(price * 100) + idx * 997;
  const v = Math.sin(n * 12.9898 + idx * 78.233) * 43758.5453;
  return v - Math.floor(v); // [0, 1)
}

function generateProfile(base: number, levels = 36, volMultiplier = 1): Level[] {
  const tick = getTickSize(base);
  // Force-snap base to nearest tick multiple so all prices align correctly
  const snappedBase = Math.round(base / tick) * tick;
  const half = Math.floor(levels / 2);
  const raws: { price: number; bid: number; ask: number }[] = [];

  for (let i = half; i >= -half; i--) {
    // Round to nearest tick to prevent floating-point drift accumulating across levels
    const raw   = snappedBase + i * tick;
    const price = Math.round(raw / tick) * tick;
    const bell  = Math.exp(-0.5 * Math.pow(i / (half * 0.35), 2));
    // Full Day VP uses volMultiplier ~30 so individual ticks don't visibly move it
    const bvol  = (300 + bell * 3800) * volMultiplier;
    // Use stable (seeded) random so base volumes don't change every render
    const total = Math.floor(bvol * (0.7 + stableRand(Math.round(price), i) * 0.6));
    const askR  = 0.35 + stableRand(Math.round(price), i + 1000) * 0.45;
    const ask   = Math.floor(total * askR);
    raws.push({ price, bid: total - ask, ask });
  }

  const totals  = raws.map(r => r.bid + r.ask);
  const maxVol  = Math.max(...totals);
  const pocIdx  = totals.indexOf(maxVol);
  const totalVol = totals.reduce((a, b) => a + b, 0);

  let vaVol = totals[pocIdx], lo = pocIdx, hi = pocIdx;
  while (vaVol < totalVol * 0.7 && (lo > 0 || hi < raws.length - 1)) {
    const addLo = lo > 0 ? totals[lo - 1] : 0;
    const addHi = hi < raws.length - 1 ? totals[hi + 1] : 0;
    if (addLo >= addHi && lo > 0) { lo--; vaVol += totals[lo]; }
    else if (hi < raws.length - 1) { hi++; vaVol += totals[hi]; }
    else break;
  }

  return raws.map((r, i) => ({
    price:  r.price,
    bid:    r.bid,
    ask:    r.ask,
    total:  r.bid + r.ask,
    delta:  r.ask - r.bid,
    pct:    (r.bid + r.ask) / maxVol,
    isPOC:  i === pocIdx,
    isVAH:  i === lo,
    isVAL:  i === hi,
    inVA:   i >= lo && i <= hi,
  }));
}

function fmt(n: number) {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000)  return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export function VolumeProfileLadder({ symbol }: { symbol: string }) {
  const [levels,     setLevels]     = useState<Level[]>([]);
  const [view,       setView]       = useState<"bars"|"delta">("bars");
  const [vpTab,      setVpTab]      = useState<"full"|"session">("full");
  const [showBidAsk, setShowBidAsk] = useState(false);
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // Real tick accumulator: Map<roundedPrice, {bid, ask}>
  const tickAccRef = useRef<Map<number, { bid: number; ask: number }>>(new Map());
  // Stable VP center — snaps to nearest tick-level, only shifts when price moves
  // significantly (>8 ticks) so the grid doesn't slide on every synthetic tick
  const vpCenterRef = useRef<number | null>(null);
  // Ref to latest liveBar — lets rebuildProfile read it without being a dep
  const liveBarRef  = useRef<typeof liveBar | null>(null);

  const { recentTicks, liveBar } = useWebSocket({ symbol, timeframe: "1m" });

  // Fetch real spot price at mount to anchor VP at correct price level
  useEffect(() => {
    const up = symbol.toUpperCase();
    const isFutures = up.endsWith("1!") || up.includes("=F");
    const isCrypto  = ["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC"].includes(up);
    const url = (!isFutures && !isCrypto)
      ? `/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`
      : `/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`;
    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then(j => {
        const price = j?.price ?? 0;
        if (price > 0) {
          SYMBOL_SEEDS[up] = price;
          vpCenterRef.current = null; // force re-center at real price
        }
      })
      .catch(() => {});
  }, [symbol]);

  // Keep liveBarRef current without adding liveBar to rebuildProfile deps
  useEffect(() => { liveBarRef.current = liveBar; }, [liveBar]);

  // Reset stable center when symbol changes
  useEffect(() => {
    vpCenterRef.current = null;
    tickAccRef.current  = new Map();
  }, [symbol]);

  // Process real ticks into accumulator
  useEffect(() => {
    if (!recentTicks?.length) return;
    const base = getBase(symbol);
    const tick = getTickSize(base);
    recentTicks.forEach(t => {
      const key = Math.round(t.price / tick) * tick;
      const rk  = +key.toFixed(4);
      const ex  = tickAccRef.current.get(rk) ?? { bid: 0, ask: 0 };
      tickAccRef.current.set(rk, {
        bid: ex.bid + (t.side === "sell" ? t.size : 0),
        ask: ex.ask + (t.side === "buy"  ? t.size : 0),
      });
    });
    // Keep max 200 price levels
    if (tickAccRef.current.size > 200) {
      const keys = [...tickAccRef.current.keys()].sort((a,b) => a-b);
      const mid  = liveBar?.close ?? getBase(symbol);
      // Remove furthest from mid
      const sorted = keys.sort((a,b) => Math.abs(b-mid) - Math.abs(a-mid));
      for (let i = 0; i < sorted.length - 150; i++) tickAccRef.current.delete(sorted[i]);
    }
  }, [recentTicks, symbol, liveBar]);

  // Rebuild profile from accumulated ticks + synthetic fill
  const rebuildProfile = useCallback(() => {
    const base    = getBase(symbol);
    const tick    = getTickSize(base);
    const rawPrice = liveBarRef.current?.close ?? base;

    // Always snap center to nearest tick — ensures grid is tick-aligned
    const snapped = Math.round(rawPrice / tick) * tick;
    if (vpCenterRef.current === null) {
      // First run: initialize to snapped price
      vpCenterRef.current = snapped;
    } else {
      // Re-snap the stored center (guards against any stale non-aligned value)
      const alignedCurrent = Math.round(vpCenterRef.current / tick) * tick;
      if (Math.abs(snapped - alignedCurrent) > tick * 8) {
        // Price moved >8 ticks — shift grid to follow
        vpCenterRef.current = snapped;
      } else {
        // Stay on current grid but keep it tick-aligned
        vpCenterRef.current = alignedCurrent;
      }
    }
    const center = vpCenterRef.current;

    // Full Day VP: 30× volume so individual ticks barely register (represents full day's activity)
    // Session VP: 1× (standard, responsive to current ticks)
    const volMult = vpTab === "full" ? 30 : 1;
    const synthetic = generateProfile(center || base, 36, volMult);

    // Overlay real tick data where available
    const merged = synthetic.map(lvl => {
      const key = +Math.round(lvl.price / tick).toFixed(0) * tick;
      const rk  = +key.toFixed(4);
      const rt  = tickAccRef.current.get(rk);
      if (rt && (rt.bid + rt.ask) > 0) {
        const total = lvl.total + rt.bid + rt.ask;
        const bid   = lvl.bid + rt.bid;
        const ask   = lvl.ask + rt.ask;
        return { ...lvl, bid, ask, total, delta: ask - bid };
      }
      return lvl;
    });

    // Recompute pct, POC, VA
    const maxTot  = Math.max(...merged.map(l => l.total));
    const pocIdx  = merged.findIndex(l => l.total === maxTot);
    const totVol  = merged.reduce((s,l) => s + l.total, 0);
    let vaVol = merged[pocIdx]?.total ?? 0, lo = pocIdx, hi = pocIdx;
    while (vaVol < totVol * 0.70 && (lo > 0 || hi < merged.length - 1)) {
      const addLo = lo > 0 ? merged[lo-1].total : 0;
      const addHi = hi < merged.length-1 ? merged[hi+1].total : 0;
      if (addLo >= addHi && lo > 0)         { lo--; vaVol += merged[lo].total; }
      else if (hi < merged.length-1)         { hi++; vaVol += merged[hi].total; }
      else break;
    }
    setLevels(merged.map((l,i) => ({
      ...l, pct: l.total/maxTot,
      isPOC: i===pocIdx, isVAH: i===lo, isVAL: i===hi, inVA: i>=lo&&i<=hi,
    })));
  }, [symbol, vpTab]); // liveBar intentionally excluded — read via liveBarRef

  useEffect(() => {
    rebuildProfile();
    // Full Day VP: 60s — represents the entire day's accumulated volume,
    // should appear nearly static like a daily candle.
    // Session VP: 8s — responsive to intraday price action.
    const interval = vpTab === "full" ? 60_000 : 8_000;
    tickRef.current = setInterval(rebuildProfile, interval);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [rebuildProfile]);

  if (!levels.length) return null;

  const maxTotal = Math.max(...levels.map(l => l.total));
  const pocLevel = levels.find(l => l.isPOC);
  const vahLevel = levels.find(l => l.isVAH);
  const valLevel = levels.find(l => l.isVAL);

  const ROW_H = 34;

  return (
    <div
      className="border-l border-wm-border bg-wm-black shrink-0 flex flex-col select-none"
      style={{ width: 340, overflow: "hidden" }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 border-b border-wm-border shrink-0" style={{ height: 36 }}>
        <span className="font-black text-wm-text uppercase tracking-widest" style={{ fontSize: 13 }}>Vol Profile</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowBidAsk(v => !v)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all border ${
              showBidAsk
                ? "bg-wm-green/20 text-wm-green border-wm-green/40"
                : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text"
            }`}
            title="Toggle bid/ask numbers per level"
          >
            B/A
          </button>
          <button
            onClick={() => setView(v => v === "bars" ? "delta" : "bars")}
            className={`text-[11px] px-2 py-0.5 rounded font-bold transition-all border ${
              view === "delta"
                ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
                : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text"
            }`}
          >
            {view === "bars" ? "B×A" : "Δ"}
          </button>
          <span className="w-2 h-2 rounded-full bg-wm-green animate-pulse" />
        </div>
      </div>

      {/* ── VP Tab toggle ────────────────────────────────── */}
      <div className="flex border-b border-wm-border shrink-0">
        <button
          onClick={() => setVpTab("full")}
          className={`flex-1 text-[10px] font-bold py-1 transition-colors ${
            vpTab === "full"
              ? "text-wm-blue border-b-2 border-wm-blue bg-wm-blue/5"
              : "text-wm-text-muted hover:text-wm-text"
          }`}
        >
          Full Day VP
        </button>
        <button
          onClick={() => setVpTab("session")}
          className={`flex-1 text-[10px] font-bold py-1 transition-colors ${
            vpTab === "session"
              ? "text-wm-gold border-b-2 border-wm-gold bg-wm-gold/5"
              : "text-wm-text-muted hover:text-wm-text"
          }`}
        >
          Session VP
        </button>
      </div>

      {/* ── Column legend ────────────────────────────────── */}
      <div className="flex items-center px-2 border-b border-wm-border/60 shrink-0" style={{ height: 24 }}>
        <span className="font-black text-wm-red text-left" style={{ width: 58, fontSize: 12 }}>BID</span>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-semibold text-wm-text-muted" style={{ fontSize: 12 }}>PRICE</span>
        </div>
        <span className="font-black text-wm-green text-right" style={{ width: 58, fontSize: 12 }}>ASK</span>
        <div style={{ width: 38 }} />
      </div>

      {/* ── Session label ────────────────────────────────── */}
      {vpTab === "session" && (
        <div className="flex items-center gap-1.5 px-3 py-0.5 bg-wm-gold/5 border-b border-wm-gold/20 shrink-0">
          <span className="text-[10px] text-wm-gold font-bold">wmSession</span>
          <span className="text-[9px] text-wm-text-dim">9:30 AM ET → now</span>
        </div>
      )}

      {/* ── Rows ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {levels.map((lvl, i) => {
          const barPct = lvl.total / maxTotal;
          const priceStr = lvl.price.toLocaleString("en-US", {
            minimumFractionDigits: lvl.price < 10 ? 4 : lvl.price < 100 ? 2 : 1,
            maximumFractionDigits: lvl.price < 10 ? 4 : lvl.price < 100 ? 2 : 1,
          });
          const bidW = `${(lvl.bid / lvl.total) * barPct * 100}%`;
          const askW = `${(lvl.ask / lvl.total) * barPct * 100}%`;
          const deltaPos = lvl.delta >= 0;

          // Sqrt-scaled bar: compresses the range so thin rows are visible.
          // POC (barPct=1) → 100%, mid-range (50%) → 71%, thin rows (5%) → 22%, min 18%.
          const scaledPct   = Math.sqrt(barPct);
          const totalBarPct = Math.max(0.18, scaledPct) * 100;
          const bidBarPct   = totalBarPct * (lvl.bid / lvl.total);
          const askBarPct   = totalBarPct * (lvl.ask / lvl.total);

          return (
            <div
              key={i}
              className="relative flex items-center cursor-pointer group hover:brightness-110"
              style={{
                height: ROW_H,
                background: lvl.isPOC
                  ? "rgba(240,180,41,0.12)"
                  : lvl.inVA
                  ? "rgba(79,163,224,0.05)"
                  : "transparent",
                borderBottom: lvl.isPOC ? "none" : "1px solid rgba(37,45,56,0.35)",
              }}
            >
              {/* POC band */}
              {lvl.isPOC && (
                <>
                  <div className="absolute inset-0 z-[1]" style={{
                    borderTop:    "2px solid rgba(240,180,41,0.90)",
                    borderBottom: "2px solid rgba(240,180,41,0.90)",
                    background:   "rgba(240,180,41,0.08)",
                  }} />
                  <div className="absolute left-0 top-0 bottom-0 z-[6] pointer-events-none"
                    style={{ width: 3, background: "rgba(240,180,41,0.95)", boxShadow: "0 0 6px rgba(240,180,41,0.7)" }} />
                </>
              )}
              {lvl.isVAH && (
                <div className="absolute inset-x-0 top-0 h-[2px] z-[2]"
                  style={{ background: "rgba(79,163,224,0.85)" }} />
              )}
              {lvl.isVAL && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] z-[2]"
                  style={{ background: "rgba(79,163,224,0.85)" }} />
              )}

              {/* Prominent volume bar — fills from left, split bid(red)/ask(green) */}
              <div className="absolute inset-y-[2px] left-0 z-[2]" style={{ right: 0, overflow: "hidden" }}>
                {/* Bid portion (left) */}
                <div className="absolute top-0 bottom-0 left-0 transition-all duration-500" style={{
                  width: `${bidBarPct}%`,
                  background: lvl.isPOC
                    ? "rgba(255,77,106,0.80)"
                    : `rgba(255,77,106,${0.42 + barPct * 0.40})`,
                }} />
                {/* Ask portion (right of bid) */}
                <div className="absolute top-0 bottom-0 transition-all duration-500" style={{
                  left: `${bidBarPct}%`,
                  width: `${askBarPct}%`,
                  background: lvl.isPOC
                    ? "rgba(0,212,170,0.80)"
                    : `rgba(0,212,170,${0.42 + barPct * 0.40})`,
                }} />
              </div>

              {/* Content row — numbers + price + badge on top of bar */}
              <div className="absolute inset-0 flex items-center z-[4]">
                {view === "bars" ? (
                  <>
                    {/* BID number */}
                    <span className="font-mono font-bold shrink-0 text-left pl-2"
                      style={{ width: 58, fontSize: 13, color: lvl.isPOC ? "#FF6B7A" : "rgba(255,77,106,0.95)" }}>
                      {fmt(lvl.bid)}
                    </span>

                    {/* Price centered */}
                    <div className="flex-1 flex items-center justify-center">
                      <span className="font-mono text-center leading-none"
                        style={{
                          fontSize:   14,
                          color:      lvl.isPOC ? "#F0B429" : lvl.inVA ? "#4FA3E0" : "#8B8FA8",
                          fontWeight: lvl.isPOC ? 900 : lvl.inVA ? 700 : 600,
                          textShadow: lvl.isPOC ? "0 0 8px rgba(240,180,41,0.6)" : "none",
                        }}>
                        {priceStr}
                      </span>
                    </div>

                    {/* ASK number */}
                    <span className="font-mono font-bold shrink-0 text-right"
                      style={{ width: 58, fontSize: 13, color: lvl.isPOC ? "#20FFD0" : "rgba(0,212,170,0.95)" }}>
                      {fmt(lvl.ask)}
                    </span>

                    {/* Badge */}
                    <div style={{ width: 38, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight: 4, flexShrink: 0 }}>
                      {lvl.isPOC && (
                        <span style={{ fontSize:10, fontWeight:900, color:"#F0B429", background:"rgba(240,180,41,0.22)", borderRadius:3, padding:"1px 5px", letterSpacing:0.5 }}>POC</span>
                      )}
                      {!lvl.isPOC && lvl.isVAH && (
                        <span style={{ fontSize:10, fontWeight:800, color:"#4FA3E0", background:"rgba(79,163,224,0.18)", borderRadius:3, padding:"1px 5px", letterSpacing:0.5 }}>VAH</span>
                      )}
                      {!lvl.isPOC && lvl.isVAL && (
                        <span style={{ fontSize:10, fontWeight:800, color:"#4FA3E0", background:"rgba(79,163,224,0.18)", borderRadius:3, padding:"1px 5px", letterSpacing:0.5 }}>VAL</span>
                      )}
                    </div>
                  </>
                ) : showBidAsk ? (
                  <>
                    <span className="font-mono font-bold shrink-0 text-left pl-2"
                      style={{ width: 58, fontSize: 13, color: "rgba(255,77,106,0.95)" }}>
                      {fmt(lvl.bid)}
                    </span>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="font-mono text-center leading-none"
                        style={{ fontSize: 14, color: lvl.isPOC ? "#F0B429" : "#4FA3E0", fontWeight: lvl.isPOC ? 900 : 700 }}>
                        {priceStr}
                      </span>
                    </div>
                    <span className="font-mono font-bold shrink-0 text-right"
                      style={{ width: 58, fontSize: 13, color: "rgba(0,212,170,0.95)" }}>
                      {fmt(lvl.ask)}
                    </span>
                    <div style={{ width: 38, flexShrink: 0 }} />
                  </>
                ) : (
                  <>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="font-mono text-center leading-none"
                        style={{ fontSize: 14, color: lvl.isPOC ? "#F0B429" : "#4FA3E0", fontWeight: lvl.isPOC ? 900 : 700 }}>
                        {priceStr}
                      </span>
                    </div>
                    <span className="font-mono font-bold pr-2 shrink-0 text-right"
                      style={{ width: 72, fontSize: 14, color: deltaPos ? "#00D4AA" : "#FF4D6A" }}>
                      {deltaPos ? "+" : ""}{fmt(Math.abs(lvl.delta))}
                    </span>
                    <div style={{ width: 38, flexShrink: 0 }} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="border-t border-wm-border px-3 pt-2 pb-2 shrink-0" style={{ background: "rgba(13,14,20,0.95)" }}>
        {/* VAH / POC / VAL — large readable numbers per user sketch */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="flex flex-col items-center rounded-lg py-2 px-1" style={{ background: "rgba(79,163,224,0.07)", border: "1px solid rgba(79,163,224,0.25)" }}>
            <span style={{ fontSize:10, fontWeight:900, color:"#4FA3E0", letterSpacing:1.5, textTransform:"uppercase" }}>VAH</span>
            <span className="font-mono font-black" style={{ fontSize:17, color:"#4FA3E0", marginTop:3, lineHeight:1 }}>
              {vahLevel?.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) ?? "—"}
            </span>
            <span style={{ fontSize:9, color:"rgba(79,163,224,0.5)", marginTop:3 }}>Value Area High</span>
          </div>
          <div className="flex flex-col items-center rounded-lg py-2 px-1" style={{ background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.35)" }}>
            <span style={{ fontSize:10, fontWeight:900, color:"#F0B429", letterSpacing:1.5, textTransform:"uppercase" }}>POC</span>
            <span className="font-mono font-black" style={{ fontSize:17, color:"#F0B429", marginTop:3, lineHeight:1 }}>
              {pocLevel?.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) ?? "—"}
            </span>
            <span style={{ fontSize:9, color:"rgba(240,180,41,0.55)", marginTop:3 }}>Point of Control</span>
          </div>
          <div className="flex flex-col items-center rounded-lg py-2 px-1" style={{ background: "rgba(79,163,224,0.07)", border: "1px solid rgba(79,163,224,0.25)" }}>
            <span style={{ fontSize:10, fontWeight:900, color:"#4FA3E0", letterSpacing:1.5, textTransform:"uppercase" }}>VAL</span>
            <span className="font-mono font-black" style={{ fontSize:17, color:"#4FA3E0", marginTop:3, lineHeight:1 }}>
              {valLevel?.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) ?? "—"}
            </span>
            <span style={{ fontSize:9, color:"rgba(79,163,224,0.5)", marginTop:3 }}>Value Area Low</span>
          </div>
        </div>
        {/* Passive Orders banner */}
        <div className="flex items-center gap-1.5 px-1 py-1 rounded" style={{ background:"rgba(79,163,224,0.05)", border:"1px solid rgba(79,163,224,0.12)" }}>
          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background:"rgba(79,163,224,0.5)" }} />
          <span style={{ fontSize:8, color:"rgba(79,163,224,0.7)", letterSpacing:0.8, fontWeight:700, textTransform:"uppercase" }}>Passive Orders — Value Area</span>
          <span style={{ fontSize:7, color:"#4A5070", marginLeft:"auto" }}>70% vol</span>
        </div>
        {/* Honest label for synthetic VP */}
        <div className="text-center mt-1">
          <span style={{ fontSize:7, color:"#2A3050" }}>est. · connect Databento for real tick VP</span>
        </div>
      </div>
    </div>
  );
}
