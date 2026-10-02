"use client";

/**
 * TRADE REPLAY — one broker episode on the contract's own 1-minute bars
 * (Garden 18 v2 §34/§80, Journal → Replay). Bars come from tastytrade's dxFeed
 * candles for the exact contract traded; fills come from the broker ledger.
 * The cursor hides every later bar and every later fill (no look-ahead); play
 * steps a bar at a time. Read only.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import { requestTastyCandles } from "@/lib/broker/tastyQuoteStream";
import type { Episode } from "@/lib/broker/webullLedger";
import { tastyCandleSymbol, tastyCandlesToBars } from "@/lib/marketData/adapters/tastytradeCandles";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { barsInWindow, optionStreamerFor, replayFrame, replayMarkers, replayWindow } from "@/lib/journal/tradeReplay";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const UP = "#7fd1a8";
const DOWN = "#e0786b";

/** dxFeed answers from `fromTime` to now; a trade older than this would pull months of minutes. */
const MAX_AGE_DAYS = 45;

type Load = { state: "IDLE" } | { state: "LOADING" } | { state: "OK"; bars: LegacyOhlcvTuple[] } | { state: "NONE"; why: string };

export function TradeReplay({ e }: { readonly e: Episode }) {
  const streamer = useMemo(() => optionStreamerFor(e.instrumentKey), [e.instrumentKey]);
  const w = useMemo(() => replayWindow(e), [e]);
  const markers = useMemo(() => replayMarkers(e), [e]);
  const [load, setLoad] = useState<Load>({ state: "IDLE" });
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Drawn at its real pixel width so labels are never stretched.
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(760);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBoxW(Math.max(320, Math.round(el.clientWidth - 16))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [load.state]);
  const tooOld = Date.now() - w.from > MAX_AGE_DAYS * 86_400_000;

  // dxFeed echoes a 1-minute candle as `{=m}`; the request key must be that same
  // spelling (tastyCandleSymbol), or every reply misses it (measured 2026-10-02:
  // 287 bars of .TSLA261002C385 arrived under `{=m}` while `{=1m}` waited).
  const start = () => {
    if (!streamer) { setLoad({ state: "NONE", why: "This instrument has no streamer symbol WM can name." }); return; }
    setLoad({ state: "LOADING" });
    requestTastyCandles(tastyCandleSymbol(streamer, "1m") ?? `${streamer}{=m}`, streamer, w.from, 20_000).then(rows => {
      if (!rows) { setLoad({ state: "NONE", why: "tastytrade did not answer for this contract (the stream is owner-only and must be connected)." }); return; }
      const bars = barsInWindow(tastyCandlesToBars(rows, 100_000), w);
      if (!bars.length) { setLoad({ state: "NONE", why: "tastytrade returned no 1-minute bars for this contract in this window." }); return; }
      setLoad({ state: "OK", bars });
      // Open on the bar before the entry: the decision moment, nothing after it shown.
      const entryBar = bars.findIndex(b => b.time * 1000 + 60_000 > Date.parse(e.openedAt));
      setCursor(Math.max(0, entryBar - 1));
    }).catch(() => setLoad({ state: "NONE", why: "The replay request failed." }));
  };

  useEffect(() => {
    if (!playing || load.state !== "OK") return;
    const t = window.setInterval(() => setCursor(c => { if (c >= load.bars.length - 1) { setPlaying(false); return c; } return c + 1; }), 450);
    return () => window.clearInterval(t);
  }, [playing, load]);

  if (load.state === "IDLE") {
    return (
      <div style={{ margin: "6px 0" }}>
        <button type="button" data-testid="trade-replay-open" onClick={start} disabled={tooOld || !streamer}
          title={tooOld ? `Replay loads trades from the last ${MAX_AGE_DAYS} days` : undefined}
          style={{ fontSize: 11, color: tooOld ? MUTED : GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: tooOld ? "default" : "pointer" }}>
          {tooOld ? `Replay · trades from the last ${MAX_AGE_DAYS} days only` : "▶ Replay this trade on its own 1-minute bars"}
        </button>
      </div>
    );
  }
  if (load.state === "LOADING") return <p style={{ fontSize: 11, color: MUTED, margin: "6px 0" }}>Loading {streamer} 1-minute bars from tastytrade…</p>;
  if (load.state === "NONE") return <p data-testid="trade-replay-none" style={{ fontSize: 11, color: MUTED, margin: "6px 0" }}>Replay unavailable — {load.why}</p>;

  const { bars } = load;
  const frame = replayFrame(bars, markers, cursor);
  const W = boxW, H = 190, P = 10, AX = 46;
  const lo = Math.min(...bars.map(b => b.low), ...markers.map(m => m.price));
  const hi = Math.max(...bars.map(b => b.high), ...markers.map(m => m.price));
  const x = (i: number) => P + ((i + 0.5) / bars.length) * (W - P - AX);
  const y = (v: number) => P + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - 2 * P);
  const bw = Math.max(1, ((W - P - AX) / bars.length) * 0.6);
  const idxAt = (ms: number) => bars.findIndex(b => b.time * 1000 + 60_000 > ms);
  const at = bars[Math.min(cursor, bars.length - 1)];

  return (
    <div data-testid="trade-replay" ref={boxRef} style={{ margin: "8px 0", border: `1px solid ${LINE}`, borderRadius: 6, padding: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline", fontSize: 11 }}>
        <span style={{ color: GOLD, letterSpacing: 1 }}>REPLAY</span>
        <span style={{ color: INK }}>{e.instrumentKey} · 1-minute · tastytrade</span>
        <span style={{ color: MUTED }}>bars after the cursor are hidden — no look-ahead</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: INK, fontVariantNumeric: "tabular-nums" }} data-testid="trade-replay-clock">
          {new Date(at.time * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · close {at.close.toFixed(2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Replay of ${e.instrumentKey}`} style={{ display: "block" }}>
        {[hi, (hi + lo) / 2, lo].map(v => (
          <g key={v}>
            <line x1={P} x2={W - AX} y1={y(v)} y2={y(v)} stroke={LINE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={W - AX + 4} y={y(v) + 4} fontSize={10} fill={MUTED}>{v.toFixed(2)}</text>
          </g>
        ))}
        {frame.visible.map((b, i) => {
          const up = b.close >= b.open;
          return (
            <g key={b.time}>
              <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={up ? UP : DOWN} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <rect x={x(i) - bw / 2} y={y(Math.max(b.open, b.close))} width={bw} height={Math.max(1, Math.abs(y(b.open) - y(b.close)))} fill={up ? UP : DOWN} />
            </g>
          );
        })}
        {frame.markers.map(m => {
          const i = idxAt(m.at);
          if (i < 0) return null;
          const cy = y(m.price), cx = x(i), buy = m.side === "BUY";
          return (
            <g key={`${m.role}-${m.at}`}>
              <path d={buy ? `M${cx},${cy + 2} l-6,10 h12 z` : `M${cx},${cy - 2} l-6,-10 h12 z`} fill={buy ? UP : DOWN} stroke="#0b0a08" strokeWidth={1} />
              <text x={cx + 8} y={buy ? cy + 12 : cy - 6} fontSize={10} fill={INK} stroke="#0b0a08" strokeWidth={3} paintOrder="stroke" style={{ fontWeight: 600 }}>{m.role} {m.side} {m.quantity} @ {m.price.toFixed(2)}</text>
            </g>
          );
        })}
        <line x1={x(cursor) + bw} x2={x(cursor) + bw} y1={P} y2={H - P} stroke={GOLD} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
        <button type="button" aria-label="Back one bar" onClick={() => { setPlaying(false); setCursor(c => Math.max(0, c - 1)); }} style={btn}>◀</button>
        <button type="button" data-testid="trade-replay-play" onClick={() => setPlaying(p => !p)} style={btn}>{playing ? "Pause" : "Play"}</button>
        <button type="button" aria-label="Forward one bar" onClick={() => { setPlaying(false); setCursor(c => Math.min(bars.length - 1, c + 1)); }} style={btn}>▶</button>
        <input type="range" min={0} max={bars.length - 1} value={cursor} onChange={ev => { setPlaying(false); setCursor(Number(ev.target.value)); }} aria-label="Replay cursor" style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{cursor + 1}/{bars.length}</span>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer" };
