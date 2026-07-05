"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useActiveSymbol } from "@/contexts/SymbolContext";

/**
 * WatchlistGrid — Moomoo-style grid of live mini-chart cards.
 * Each card pulls real OHLCV candles from /api/yahoo and draws a compact
 * candlestick + volume sub-chart with an OHLC header. Clicking a card opens
 * that symbol on the main chart (and exits grid view).
 *
 * Reads the active watchlist from the same localStorage keys WatchlistPanel
 * writes (`wm_watchlists`, `wm_active_watchlist`) so the two stay in sync.
 */

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
interface CardData { sym: string; candles: Candle[]; loading: boolean; }

const TF_RANGE: Record<string, { tf: string }> = {
  "Daily": { tf: "D" }, "Weekly": { tf: "W" }, "Monthly": { tf: "M" },
  "1h": { tf: "1h" }, "5m": { tf: "5m" }, "15m": { tf: "15m" },
};

function loadActiveSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const lists = JSON.parse(localStorage.getItem("wm_watchlists") || "{}");
    const active = localStorage.getItem("wm_active_watchlist") || Object.keys(lists)[0];
    const syms = lists[active] || lists[Object.keys(lists)[0]] || [];
    return Array.isArray(syms) ? syms : [];
  } catch { return []; }
}

function fmt(n: number) {
  if (!isFinite(n)) return "—";
  const dp = Math.abs(n) < 10 ? 4 : 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtVol(n: number) {
  if (!isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(0);
}

const GREEN = "#26a69a", RED = "#ef5350";

function MiniChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (candles.length < 2) return;

    const priceH = H * 0.74, volH = H * 0.26, volTop = priceH + 4;
    const lo = Math.min(...candles.map(c => c.low));
    const hi = Math.max(...candles.map(c => c.high));
    const range = hi - lo || 1;
    const maxVol = Math.max(...candles.map(c => c.volume), 1);
    const n = candles.length;
    const cw = W / n;
    const bodyW = Math.max(1, cw * 0.62);
    const yOf = (p: number) => 6 + (priceH - 12) * (1 - (p - lo) / range);

    candles.forEach((c, i) => {
      const x = i * cw + cw / 2;
      const up = c.close >= c.open;
      const col = up ? GREEN : RED;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      // wick
      ctx.beginPath(); ctx.moveTo(x, yOf(c.high)); ctx.lineTo(x, yOf(c.low)); ctx.stroke();
      // body
      const yO = yOf(c.open), yC = yOf(c.close);
      const top = Math.min(yO, yC), bh = Math.max(1, Math.abs(yC - yO));
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      // volume
      const vh = (c.volume / maxVol) * (volH - 4);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - bodyW / 2, volTop + (volH - 4 - vh), bodyW, vh);
      ctx.globalAlpha = 1;
    });

    // last price line
    const last = candles[candles.length - 1].close;
    const upLast = last >= candles[candles.length - 1].open;
    ctx.strokeStyle = upLast ? GREEN : RED; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yOf(last)); ctx.lineTo(W, yOf(last)); ctx.stroke();
    ctx.setLineDash([]);
  }, [candles]);

  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />;
}

function Card({ sym, tf }: { sym: string; tf: string }) {
  const { setActiveSymbol } = useActiveSymbol();
  const [data, setData] = useState<CardData>({ sym, candles: [], loading: true });

  const load = useCallback(() => {
    fetch(`/api/yahoo?sym=${encodeURIComponent(sym)}&type=candles&tf=${encodeURIComponent(tf)}&bars=120`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setData({ sym, candles: Array.isArray(j?.candles) ? j.candles : [], loading: false }))
      .catch(() => setData({ sym, candles: [], loading: false }));
  }, [sym, tf]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000); // refresh card every 30s
    return () => clearInterval(iv);
  }, [load]);

  const cs = data.candles;
  const last = cs[cs.length - 1];
  const prev = cs[cs.length - 2];
  const price = last?.close ?? 0;
  const chg = last && prev ? price - prev.close : 0;
  const chgPct = prev?.close ? (chg / prev.close) * 100 : 0;
  const up = chg >= 0;
  const col = up ? GREEN : RED;

  return (
    <div
      onClick={() => setActiveSymbol(sym)}
      style={{
        background: "#0D0E14", border: "1px solid #1E2030", borderRadius: 8,
        padding: 10, display: "flex", flexDirection: "column", cursor: "pointer",
        minHeight: 220, overflow: "hidden", transition: "border-color 0.12s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a3550")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E2030")}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#E2E8F0" }}>{sym}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>{fmt(price)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: "monospace" }}>
          {up ? "+" : ""}{fmt(chg)} {up ? "+" : ""}{chgPct.toFixed(2)}%
        </span>
      </div>
      {/* OHLC line */}
      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 9, color: "#6A7290", fontFamily: "monospace", flexWrap: "wrap", flexShrink: 0 }}>
        <span>O <span style={{ color: "#A0AEC0" }}>{fmt(last?.open ?? 0)}</span></span>
        <span>H <span style={{ color: "#A0AEC0" }}>{fmt(last?.high ?? 0)}</span></span>
        <span>L <span style={{ color: "#A0AEC0" }}>{fmt(last?.low ?? 0)}</span></span>
        <span>C <span style={{ color: "#A0AEC0" }}>{fmt(price)}</span></span>
        <span>Vol <span style={{ color: "#A0AEC0" }}>{fmtVol(last?.volume ?? 0)}</span></span>
      </div>
      {/* Mini chart */}
      <div style={{ flex: 1, marginTop: 6, minHeight: 0 }}>
        {data.loading
          ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5070", fontSize: 11 }}>Loading…</div>
          : cs.length < 2
            ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5070", fontSize: 11 }}>No data</div>
            : <MiniChart candles={cs} />}
      </div>
    </div>
  );
}

export function WatchlistGrid({ refreshKey = 0, timeframe = "D" }: { refreshKey?: number; timeframe?: string }) {
  const [symbols, setSymbols] = useState<string[]>([]);
  useEffect(() => { setSymbols(loadActiveSymbols()); }, [refreshKey]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#080910", padding: 12 }}>
      {symbols.length === 0 ? (
        <div style={{ color: "#4A5070", fontSize: 13, textAlign: "center", marginTop: 40 }}>
          No symbols in this watchlist. Add some from the list panel.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 12,
        }}>
          {symbols.map(s => <Card key={s} sym={s} tf={timeframe} />)}
        </div>
      )}
    </div>
  );
}
