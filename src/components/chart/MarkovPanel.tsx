"use client";

/**
 * MarkovPanel — exact Markov Pro v2 layout
 * Matches the TradingView "Master Strategy - Markov Pro v2" panel:
 *  header row | data rows | matrix table | TODAY row | MARKETS table | LONG-RUN section
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Activity } from "lucide-react";

type Regime = "BULL" | "BEAR" | "SIDE";
type WyckoffPhase = "ACCUM" | "MARKUP" | "DIST" | "MKDN" | "REACCUM";

interface MarkovState {
  regime:    Regime;
  phase:     WyckoffPhase;
  ema:       number;
  pdh:       number;
  pdl:       number;
  dayRet:    number;
  edge:      number;
  calcStr:   string;
  signal:    "LONG" | "SHORT" | "FLAT";
  // matrix: from state → [bull%, bear%, side%]
  matrix: {
    BULL: [number, number, number];
    BEAR: [number, number, number];
    SIDE: [number, number, number];
  };
  today: [number, number, number]; // current state probabilities
  markets: { sym: string; ret: number; edge: number; state: Regime }[];
  longRun: [number, number, number];
  calcStem: [number, number, number];
  edgeVals: [number, number, number];
}

const SEEDS: Record<string, number> = {
  "NQ1!": 21847, "ES1!": 5892, "RTY1!": 2184, "YM1!": 43210,
  "AAPL": 228,   "TSLA": 412,  "NVDA":  875,  "QQQ":  513,
  "SPY":  589,   "IWM":  210,  "BTC":   104280,"ETH":  3890,
};

function seeded(seed: number, offset: number) {
  return Math.abs(Math.sin(seed * 9301 + offset * 49297 + 233720)) % 1;
}

function computeState(symbol: string): MarkovState {
  const s = SEEDS[symbol.toUpperCase()] ?? symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 42);
  const t = Math.floor(Date.now() / 3000); // changes every 3s

  const r = (o: number) => seeded(s + t, o);

  const base = SEEDS[symbol.toUpperCase()] ?? 100;
  const ema  = +(base * (1 + (r(1) - 0.5) * 0.01)).toFixed(2);
  const pdh  = +(base * (1 + r(2) * 0.015)).toFixed(2);
  const pdl  = +(base * (1 - r(3) * 0.015)).toFixed(2);

  const dayRet = +((r(4) - 0.45) * 7).toFixed(2);
  const bullEdge = r(5);
  const bearEdge = r(6) * (1 - bullEdge);
  const sideEdge = 1 - bullEdge - bearEdge;

  const edge = +(bullEdge * 100 - bearEdge * 100).toFixed(0);

  const regime: Regime = dayRet > 1.5 ? "BULL" : dayRet < -1.5 ? "BEAR" : "SIDE";
  const phase: WyckoffPhase =
    regime === "BULL" && dayRet > 3 ? "MARKUP" :
    regime === "BULL"               ? "ACCUM"  :
    regime === "BEAR" && dayRet < -3? "MKDN"   :
    regime === "BEAR"               ? "DIST"   : "REACCUM";

  const signal: "LONG" | "SHORT" | "FLAT" =
    edge > 5 ? "LONG" : edge < -5 ? "SHORT" : "FLAT";

  const calcStr = `${(bullEdge * 100).toFixed(0)}%-${(bearEdge * 100).toFixed(0)}%=${edge > 0 ? "+" : ""}${edge}%`;

  // Matrix rows: BULL→, BEAR→, SIDE→ each [bull%, bear%, side%]
  const bTob = 55 + Math.round(r(10) * 20);
  const bToa = 100 - bTob - Math.round(r(11) * 10 + 5);
  const bearTob = 12 + Math.round(r(12) * 10);
  const bearToa = 52 + Math.round(r(13) * 15);
  const sideTob = 28 + Math.round(r(14) * 8);
  const sideToa = 100 - sideTob - (35 + Math.round(r(15) * 12));

  const matrix = {
    BULL: [bTob,  bToa,  100 - bTob - bToa]  as [number, number, number],
    BEAR: [bearTob, bearToa, 100 - bearTob - bearToa] as [number, number, number],
    SIDE: [sideTob, 100 - sideTob - (35 + Math.round(r(15)*12)), 35 + Math.round(r(15)*12)] as [number, number, number],
  };

  const todayB = Math.round(bullEdge * 100);
  const todayBear = Math.round(bearEdge * 100);
  const today: [number, number, number] = [todayB, todayBear, 100 - todayB - todayBear];

  const markets = [
    { sym: "SPY", ret: +((r(20) - 0.48) * 2).toFixed(2), edge: Math.round((r(21) - 0.3) * 25), state: (r(22) > 0.55 ? "BULL" : r(22) > 0.35 ? "SIDE" : "BEAR") as Regime },
    { sym: "QQQ", ret: +((r(23) - 0.48) * 3).toFixed(2), edge: Math.round((r(24) - 0.3) * 28), state: (r(25) > 0.55 ? "BULL" : r(25) > 0.35 ? "SIDE" : "BEAR") as Regime },
    { sym: "IWM", ret: +((r(26) - 0.5)  * 2).toFixed(2), edge: Math.round((r(27) - 0.45) * 20), state: (r(28) > 0.55 ? "BULL" : r(28) > 0.35 ? "SIDE" : "BEAR") as Regime },
    { sym: "VTI", ret: +((r(29) - 0.48) * 2).toFixed(2), edge: Math.round((r(30) - 0.3) * 22), state: (r(31) > 0.55 ? "BULL" : r(31) > 0.35 ? "SIDE" : "BEAR") as Regime },
  ];

  const longRun: [number, number, number] = [
    29 + Math.round(r(40) * 8),
    42 + Math.round(r(41) * 8),
    29 + Math.round(r(42) * 8),
  ];
  const calcStem: [number, number, number] = [
    Math.round(r(43) * 40),
    Math.round(r(44) * 40),
    Math.round(r(45) * 40),
  ];
  const edgeVals: [number, number, number] = [
    Math.round(bullEdge * 100),
    Math.round(bearEdge * 100),
    Math.round(sideEdge * 100),
  ];

  return { regime, phase, ema, pdh, pdl, dayRet, edge, calcStr, signal, matrix, today, markets, longRun, calcStem, edgeVals };
}

/* ── tiny helpers ─────────────────────────────────────────── */
const RC: Record<Regime, string> = { BULL: "#00D4AA", BEAR: "#FF4D6A", SIDE: "#F0B429" };

function RegimeChip({ r }: { r: Regime }) {
  return (
    <span className="font-black text-[11px]" style={{ color: RC[r] }}>{r}</span>
  );
}

function pctColor(v: number) {
  return v > 50 ? "#00D4AA" : v > 30 ? "#4FA3E0" : "#F0B429";
}

/* ── rows ─────────────────────────────────────────────────── */
function KVRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-[3px] border-b border-wm-border/30">
      <span className="text-[11px] text-wm-text-muted font-semibold">{left}</span>
      <span className="text-[11px] font-mono font-bold text-wm-text">{right}</span>
    </div>
  );
}

function SplitRow({ leftLabel, leftVal, rightLabel, rightVal }: {
  leftLabel: string; leftVal: React.ReactNode;
  rightLabel: string; rightVal: React.ReactNode;
}) {
  return (
    <div className="flex border-b border-wm-border/30">
      <div className="flex-1 flex justify-between items-center py-[3px] pr-2">
        <span className="text-[10px] text-wm-text-dim uppercase tracking-wide">{leftLabel}</span>
        <span className="text-[11px] font-mono font-bold text-wm-text">{leftVal}</span>
      </div>
      <div className="w-px bg-wm-border/30" />
      <div className="flex-1 flex justify-between items-center py-[3px] pl-2">
        <span className="text-[10px] text-wm-text-dim uppercase tracking-wide">{rightLabel}</span>
        <span className="text-[11px] font-mono font-bold text-wm-text">{rightVal}</span>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export function MarkovPanel({ symbol, dayRet: realDayRet, onClose }: { symbol: string; dayRet?: number | null; onClose: () => void }) {
  const [st, setSt] = useState<MarkovState>(() => computeState(symbol));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSt(computeState(symbol));
    timer.current = setInterval(() => setSt(computeState(symbol)), 30_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [symbol]);

  // ── Real market data overrides the model's placeholder day-return ──────────
  // When the live ticker has a price, REGIME + DAY RET + PHASE reflect the ACTUAL
  // tape (real % move). The transition matrix, edge, markets and signal remain an
  // illustrative statistical model — surfaced honestly via the MODEL badge +
  // disclaimer below, never presented as a live prediction.
  const hasRealRet = typeof realDayRet === "number" && Number.isFinite(realDayRet);
  const dayRet  = hasRealRet ? +(realDayRet as number).toFixed(2) : st.dayRet;
  const regime: Regime = hasRealRet
    ? (dayRet > 1.5 ? "BULL" : dayRet < -1.5 ? "BEAR" : "SIDE")
    : st.regime;
  const phase: WyckoffPhase = hasRealRet
    ? (regime === "BULL" && dayRet > 3  ? "MARKUP" :
       regime === "BULL"                ? "ACCUM"  :
       regime === "BEAR" && dayRet < -3 ? "MKDN"   :
       regime === "BEAR"                ? "DIST"   : "REACCUM")
    : st.phase;

  const priceStr = (v: number) => v > 1000
    ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(2);

  const signalColor = st.signal === "LONG" ? "#00D4AA" : st.signal === "SHORT" ? "#FF4D6A" : "#8B95A5";

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 270, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
      style={{ minWidth: 0 }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-2.5 shrink-0 border-b border-wm-border"
        style={{ height: 34 }}
      >
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-wm-purple" />
          <span className="text-[11px] font-black text-wm-text tracking-wide">Markov Pro v2</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-black border"
            style={{ background: "rgba(240,180,41,0.13)", color: "#F0B429", borderColor: "rgba(240,180,41,0.35)" }}
            title="Transition matrix, edge & signal are an illustrative statistical model — not a live data feed"
          >MODEL</span>
        </div>
        <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text transition-colors p-0.5">
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

        {/* ── Honesty note: what's live vs modeled ──────── */}
        <div className="px-2.5 py-1.5 border-b border-wm-border" style={{ background: "rgba(240,180,41,0.06)" }}>
          <p className="text-[9px] leading-snug" style={{ color: "#B08A3C" }}>
            <span className="font-black" style={{ color: "#F0B429" }}>MODEL · </span>
            {hasRealRet
              ? "REGIME & DAY RET are live from the tape. Transition matrix, edge, markets & signal are an illustrative statistical model — not live predictions."
              : "Illustrative statistical model — not live predictions. Live tape not yet connected for this symbol."}
          </p>
        </div>

        {/* ── REGIME header block ───────────────────────── */}
        <div className="px-2.5 pt-2 pb-1.5 border-b border-wm-border bg-wm-surface/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-wm-text-dim font-semibold uppercase tracking-widest">REGIME:</span>
              <RegimeChip r={regime} />
              <span className="text-wm-border">│</span>
              <span className="text-[11px] font-black" style={{ color: "#F0B429" }}>{phase}</span>
            </div>
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded"
              style={{ background: `${signalColor}18`, color: signalColor, border: `1px solid ${signalColor}40` }}
            >
              {st.signal}
            </span>
          </div>
        </div>

        {/* ── Data rows (EMA / PDH / PDL / DAY RET / EDGE / CALC) */}
        <div className="px-2.5 py-1 border-b border-wm-border">
          <SplitRow
            leftLabel="EMA"   leftVal={priceStr(st.ema)}
            rightLabel="PDH"  rightVal={priceStr(st.pdh)}
          />
          <SplitRow
            leftLabel="PDL"   leftVal={priceStr(st.pdl)}
            rightLabel={symbol} rightVal={<RegimeChip r={regime} />}
          />
          <SplitRow
            leftLabel="DAY RET"  leftVal={
              <span style={{ color: dayRet >= 0 ? "#00D4AA" : "#FF4D6A" }}>
                {dayRet >= 0 ? "+" : ""}{dayRet}%{hasRealRet ? "" : " ·model"}
              </span>
            }
            rightLabel="EDGE"   rightVal={
              <span style={{ color: st.edge >= 0 ? "#00D4AA" : "#FF4D6A" }}>
                {st.edge >= 0 ? "+" : ""}{st.edge}%
              </span>
            }
          />
          <div className="flex justify-between items-center py-[3px]">
            <span className="text-[10px] text-wm-text-dim uppercase tracking-wide">CALC</span>
            <span className="text-[10px] font-mono text-wm-text-muted">{st.calcStr}</span>
          </div>
        </div>

        {/* ── Markov Matrix ─────────────────────────────── */}
        <div className="px-2.5 py-1.5 border-b border-wm-border">
          <div className="text-[9px] text-wm-text-dim uppercase tracking-widest mb-1.5">Transition Matrix</div>

          {/* Column headers */}
          <div className="grid mb-1" style={{ gridTemplateColumns: "36px 1fr 1fr 1fr" }}>
            <div />
            {(["BULL", "BEAR", "SIDE"] as Regime[]).map(r => (
              <div key={r} className="text-center text-[10px] font-black" style={{ color: RC[r] }}>
                &gt;{r}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {(["BULL", "BEAR", "SIDE"] as Regime[]).map((row, ri) => (
            <div key={row} className="grid items-center mb-0.5" style={{ gridTemplateColumns: "36px 1fr 1fr 1fr" }}>
              <span className="text-[10px] font-black" style={{ color: RC[row] }}>{row}</span>
              {st.matrix[row].map((val, ci) => {
                const cols: Regime[] = ["BULL", "BEAR", "SIDE"];
                const c = RC[cols[ci]];
                const bg = `${c}${Math.round(val * 0.6 + 10).toString(16).padStart(2, "0")}`;
                return (
                  <div
                    key={ci}
                    className="mx-0.5 flex items-center justify-center rounded text-[10px] font-mono font-black"
                    style={{ height: 20, background: bg, color: c }}
                  >
                    {val}%
                  </div>
                );
              })}
            </div>
          ))}

          {/* TODAY row */}
          <div className="grid items-center mt-1 rounded" style={{ gridTemplateColumns: "36px 1fr 1fr 1fr", background: "rgba(79,163,224,0.07)", border: "1px solid rgba(79,163,224,0.2)" }}>
            <span className="text-[10px] font-black text-wm-blue pl-1">NOW</span>
            {st.today.map((val, i) => {
              const cols: Regime[] = ["BULL", "BEAR", "SIDE"];
              return (
                <div key={i} className="flex items-center justify-center text-[10px] font-mono font-black py-1"
                  style={{ color: RC[cols[i]] }}>
                  {val}%
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MARKETS table ─────────────────────────────── */}
        <div className="px-2.5 py-1.5 border-b border-wm-border">
          <div className="text-[9px] text-wm-text-dim uppercase tracking-widest mb-1.5">Markets</div>

          {/* Header */}
          <div className="grid text-[9px] text-wm-text-dim mb-1" style={{ gridTemplateColumns: "32px 1fr 1fr 40px" }}>
            <span></span>
            <span className="text-center">RETURN</span>
            <span className="text-center">EDGE</span>
            <span className="text-center">STATE</span>
          </div>

          {st.markets.map(m => (
            <div key={m.sym} className="grid items-center py-[3px] border-b border-wm-border/20"
              style={{ gridTemplateColumns: "32px 1fr 1fr 40px" }}>
              <span className="text-[10px] font-black text-wm-text">{m.sym}</span>
              <span className="text-center text-[10px] font-mono font-bold"
                style={{ color: m.ret >= 0 ? "#00D4AA" : "#FF4D6A" }}>
                {m.ret >= 0 ? "+" : ""}{m.ret}%
              </span>
              <span className="text-center text-[10px] font-mono font-bold"
                style={{ color: m.edge >= 0 ? "#00D4AA" : "#FF4D6A" }}>
                {m.edge >= 0 ? "+" : ""}{m.edge}%
              </span>
              <div className="flex justify-center">
                <RegimeChip r={m.state} />
              </div>
            </div>
          ))}
        </div>

        {/* ── LONG-RUN / CALC STEM / EDGE / CALC ────────── */}
        <div className="px-2.5 py-1.5">
          <div className="text-[9px] text-wm-text-dim uppercase tracking-widest mb-1.5">Long-Run Probabilities</div>

          {/* LONG-RUN row */}
          <div className="grid items-center mb-0.5" style={{ gridTemplateColumns: "58px 1fr 1fr 1fr" }}>
            <span className="text-[10px] text-wm-text-dim font-semibold">LONG-RUN</span>
            {st.longRun.map((v, i) => {
              const cols: Regime[] = ["BULL", "BEAR", "SIDE"];
              return (
                <div key={i} className="text-center text-[10px] font-mono font-bold" style={{ color: RC[cols[i]] }}>
                  {v}%
                </div>
              );
            })}
          </div>

          {/* CALC STEM */}
          <div className="grid items-center mb-0.5" style={{ gridTemplateColumns: "58px 1fr 1fr 1fr" }}>
            <span className="text-[10px] text-wm-text-dim font-semibold">STEM</span>
            {st.calcStem.map((v, i) => {
              const cols: Regime[] = ["BULL", "BEAR", "SIDE"];
              return (
                <div key={i} className="text-center text-[10px] font-mono" style={{ color: RC[cols[i]] }}>
                  {v}%
                </div>
              );
            })}
          </div>

          {/* EDGE row */}
          <div className="grid items-center mb-0.5" style={{ gridTemplateColumns: "58px 1fr 1fr 1fr" }}>
            <span className="text-[10px] text-wm-text-dim font-semibold">EDGE</span>
            {st.edgeVals.map((v, i) => {
              const cols: Regime[] = ["BULL", "BEAR", "SIDE"];
              return (
                <div key={i} className="text-center text-[10px] font-mono font-bold" style={{ color: RC[cols[i]] }}>
                  {v}%
                </div>
              );
            })}
          </div>

          {/* CALC */}
          <div className="flex justify-between items-center mt-1 pt-1 border-t border-wm-border/30">
            <span className="text-[10px] text-wm-text-dim font-semibold">CALC</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-wm-text-muted">{st.calcStr}</span>
              <span
                className="text-[11px] font-black px-1.5 py-0.5 rounded"
                style={{ background: `${signalColor}18`, color: signalColor, border: `1px solid ${signalColor}35` }}
              >
                {st.signal}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="px-2.5 py-1 border-t border-wm-border shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-wm-text-dim">Markov Pro v2 · model · {symbol}</span>
        <span className="text-[9px] text-wm-text-dim">recompute 30s</span>
      </div>
    </motion.div>
  );
}
