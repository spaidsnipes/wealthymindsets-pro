"use client";

/**
 * Backtesting Engine
 * Run strategy simulations over historical OHLCV data with
 * realistic entry/exit logic, drawdown, and full performance metrics.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Play, Square, RotateCcw, TrendingUp, TrendingDown, BarChart2, Zap, Download, ChevronDown, BookOpen, ChevronRight, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { SymbolSearch } from "@/components/ui/SymbolSearch";
import { fetchBars, runRealBacktest, type BTTrade, type BTResult } from "@/lib/backtest/engine";

/* ── Types ──────────────────────────────────────────────── */
type Trade = BTTrade;
type BacktestResult = BTResult;

const SYMBOLS = ["NQ1!", "ES1!", "AAPL", "TSLA", "NVDA", "BTC", "SPY", "GC1!"];
const STRATEGIES = [
  { id: "clc",        label: "CLC Rule — Order Flow",      desc: "Context + Location + Confirmation" },
  { id: "vwap",       label: "VWAP Deviation Fade",        desc: "Mean reversion at ±2σ" },
  { id: "wyckoff",    label: "Wyckoff Spring / UTAD",      desc: "Phase C accumulation/distribution" },
  { id: "momentum",   label: "Breakout Momentum",          desc: "Volume-confirmed range breaks" },
  { id: "cvd",        label: "CVD Divergence",             desc: "Price/volume divergence signals" },
  { id: "darkpool",   label: "Dark Pool Accumulation",     desc: "Off-exchange block trade direction" },
];
const TIMEFRAMES = ["1m","3m","5m","15m","30m","1h","4h","D"];
const DATE_RANGES = [
  { label: "1 Month",  days: 30  },
  { label: "3 Months", days: 90  },
  { label: "6 Months", days: 180 },
  { label: "1 Year",   days: 365 },
];

/* ── Mini equity chart ───────────────────────────────────── */
function EquityChart({ data }: { data: { t: number; v: number }[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data.map(d => d.v));
  const max = Math.max(...data.map(d => d.v));
  const range = max - min || 1;
  const W = 100, H = 60;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - ((d.v - min) / range) * H}`).join(" ");
  const fill = `0,${H} ${pts} ${W},${H}`;
  const up = data[data.length - 1].v >= data[0].v;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={up ? "#00D4AA" : "#FF4D6A"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={up ? "#00D4AA" : "#FF4D6A"} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#eq-grad)" />
      <polyline points={pts} fill="none" stroke={up ? "#00D4AA" : "#FF4D6A"} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Walk Forward Testing Guide ─────────────────────────── */
function WalkForwardGuide({ onSendToJournal }: { onSendToJournal: () => void }) {
  const [step, setStep] = useState(0);
  const STEPS = [
    {
      icon: "📊",
      title: "Step 1 — Choose Your In-Sample Window",
      body: "Select 60–70% of your historical data as the training period (In-Sample). Example: if you have 12 months of data, use months 1–8 to optimize your strategy parameters. This is where you find the best settings — but you can't trade these results live yet.",
      tip: "Typical split: 70% in-sample / 30% out-of-sample",
    },
    {
      icon: "🔬",
      title: "Step 2 — Optimize on In-Sample Data",
      body: "Run your backtest on the In-Sample window. Find the parameter combinations (entry triggers, stop levels, take-profit targets) that produce the best Profit Factor (>1.5) and lowest max drawdown. Record the top 3 parameter sets.",
      tip: "Avoid over-optimizing — if win rate > 80%, it's likely curve-fit",
    },
    {
      icon: "🧪",
      title: "Step 3 — Test on Out-of-Sample (Forward Test)",
      body: "Take your best parameters from Step 2 and run them on the remaining 30% of data (months 9–12 in our example) — data your strategy has never seen. This simulates real-world performance. If results hold up (Win Rate within ±10% of in-sample), the strategy is robust.",
      tip: "If Out-of-Sample results collapse, the strategy is curve-fit — go back to Step 1",
    },
    {
      icon: "🔄",
      title: "Step 4 — Roll Forward (Anchored Walk-Forward)",
      body: "Move your window forward by 1–3 months and repeat. Add month 9 to your training set, re-optimize, then test on month 10. Repeat this rolling process across all your data. Each iteration tells you if the strategy adapts or degrades over time.",
      tip: "Run at least 6 walk-forward iterations for statistical significance",
    },
    {
      icon: "📓",
      title: "Step 5 — Log Results to Your Journal",
      body: "Document every walk-forward iteration: the In-Sample parameters, Out-of-Sample results, Win Rate, Profit Factor, and Max Drawdown for each window. Track patterns — does the strategy perform better in trending or ranging markets? This is your live edge.",
      tip: "Set a minimum out-of-sample Win Rate threshold (e.g. 45%) before going live",
    },
    {
      icon: "🚦",
      title: "Step 6 — Go Live with Paper Trading First",
      body: "Before risking real capital, paper trade the validated strategy for 2–4 weeks with the exact parameters that passed walk-forward testing. Compare live paper results vs. your walk-forward out-of-sample results. If they match within ±15%, you have a deployable edge.",
      tip: "Use the Paper Trading section to run your validated strategy risk-free",
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <RefreshCw size={20} className="text-wm-blue" />
        <div>
          <h2 className="text-base font-black text-wm-text">Walk Forward Testing</h2>
          <p className="text-xs text-wm-text-dim">The gold standard for validating a strategy before going live</p>
        </div>
      </div>

      {/* What is WFT */}
      <div className="glass rounded-xl p-4 mb-5 border border-wm-blue/20">
        <div className="text-xs font-bold text-wm-blue mb-2">What is Walk Forward Testing?</div>
        <p className="text-xs text-wm-text-dim leading-relaxed">
          Walk Forward Testing (WFT) prevents <span className="text-wm-red font-semibold">curve-fitting</span> — the #1 reason backtests fail in live markets. Instead of optimizing on all your data (which always looks great on paper), you optimize on one portion and validate on another that the strategy has never seen. It's the closest thing to a real-world out-of-sample test you can run before risking capital.
        </p>
      </div>

      {/* Step navigator */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all shrink-0",
              step === i
                ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40"
                : "bg-wm-surface text-wm-text-muted border-wm-border hover:text-wm-text"
            )}>
            {s.icon} Step {i + 1}
          </button>
        ))}
      </div>

      {/* Step detail */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 mb-4"
      >
        <div className="flex items-start gap-4">
          <span className="text-3xl">{STEPS[step].icon}</span>
          <div className="flex-1">
            <h3 className="text-sm font-black text-wm-text mb-2">{STEPS[step].title}</h3>
            <p className="text-xs text-wm-text-dim leading-relaxed mb-3">{STEPS[step].body}</p>
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-wm-gold/5 border border-wm-gold/20">
              <AlertTriangle size={12} className="text-wm-gold shrink-0 mt-0.5" />
              <span className="text-[11px] text-wm-gold">{STEPS[step].tip}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-3 py-1.5 rounded-lg text-xs border border-wm-border text-wm-text-muted disabled:opacity-30 hover:text-wm-text transition-colors">
            ← Previous
          </button>
          <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}
            className="px-3 py-1.5 rounded-lg text-xs border border-wm-blue/40 bg-wm-blue/10 text-wm-blue disabled:opacity-30 transition-colors">
            Next →
          </button>
          <div className="ml-auto text-[10px] text-wm-text-dim">{step + 1} / {STEPS.length}</div>
        </div>
      </motion.div>

      {/* Walk-forward results template */}
      <div className="glass rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-wm-border">
          <div className="text-xs font-bold text-wm-text">Walk-Forward Results Template</div>
          <div className="text-[10px] text-wm-text-dim mt-0.5">Fill this in for each iteration — then send to Journal</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-wm-border">
                {["Window","In-Sample WR","In-Sample PF","OOS WR","OOS PF","Max DD","Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] text-wm-text-muted uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { w:"Jan–Aug",  isWR:"63%", isPF:"1.82", oosWR:"58%", oosPF:"1.61", dd:"7.2%", ok:true  },
                { w:"Feb–Sep",  isWR:"61%", isPF:"1.75", oosWR:"52%", oosPF:"1.43", dd:"9.8%", ok:true  },
                { w:"Mar–Oct",  isWR:"65%", isPF:"1.91", oosWR:"44%", oosPF:"0.97", dd:"14.1%",ok:false },
                { w:"Apr–Nov",  isWR:"60%", isPF:"1.68", oosWR:"55%", oosPF:"1.52", dd:"8.3%", ok:true  },
              ].map(r => (
                <tr key={r.w} className="border-b border-wm-border/30 hover:bg-wm-surface/20">
                  <td className="px-3 py-2 font-mono text-wm-text-dim">{r.w}</td>
                  <td className="px-3 py-2 text-wm-green font-mono">{r.isWR}</td>
                  <td className="px-3 py-2 text-wm-green font-mono">{r.isPF}</td>
                  <td className={clsx("px-3 py-2 font-mono font-bold", r.ok ? "text-wm-green" : "text-wm-red")}>{r.oosWR}</td>
                  <td className={clsx("px-3 py-2 font-mono", r.ok ? "text-wm-green" : "text-wm-red")}>{r.oosPF}</td>
                  <td className={clsx("px-3 py-2 font-mono", parseFloat(r.dd) > 10 ? "text-wm-red" : "text-wm-text-muted")}>{r.dd}</td>
                  <td className="px-3 py-2">
                    <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-black",
                      r.ok ? "bg-wm-green/15 text-wm-green" : "bg-wm-red/15 text-wm-red")}>
                      {r.ok ? "✓ PASS" : "✗ FAIL"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send to Journal CTA */}
      <button
        onClick={onSendToJournal}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-wm-black transition-all hover:opacity-90"
        style={{ background:"linear-gradient(135deg,#8B5CF6,#4FA3E0)" }}
      >
        <BookOpen size={15} /> Send Walk-Forward Results to Journal
      </button>
      <p className="text-center text-[10px] text-wm-text-dim mt-2">
        Opens a pre-filled journal entry with your WFT strategy notes
      </p>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function BacktestingPage() {
  const [symbol,    setSymbol]    = useState("NQ1!");
  const [strategy,  setStrategy]  = useState(STRATEGIES[0]);
  const [tf,        setTf]        = useState("5m");
  const [dateRange, setDateRange] = useState(DATE_RANGES[1]);
  const [running,   setRunning]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [result,    setResult]    = useState<BacktestResult | null>(null);
  const [tradeTab,  setTradeTab]  = useState<"all"|"wins"|"losses">("all");
  const [mainTab,   setMainTab]   = useState<"backtest"|"walkforward">("backtest");
  const [error,     setError]     = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);

    // Progress ticks while the real fetch + simulation run.
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 12;
      setProgress(Math.min(p, 92));
      if (p >= 92) clearInterval(iv);
    }, 90);

    try {
      const bars = await fetchBars(symbol, tf);
      if (bars.length < 50) {
        throw new Error(`Only ${bars.length} bars returned for ${symbol} @ ${tf}. Try a higher timeframe or a different symbol.`);
      }
      const r = runRealBacktest(bars, symbol, strategy.id, strategy.label);
      // Note when Yahoo's intraday window couldn't cover the requested range.
      const approxDaysCovered = (bars[bars.length - 1].time - bars[0].time) / 86_400;
      if (approxDaysCovered < dateRange.days * 0.6) {
        r.meta.rangeNote = `Yahoo intraday history is range-limited at ${tf}; covered ~${Math.round(approxDaysCovered)}d of the requested ${dateRange.days}d.`;
      }
      clearInterval(iv);
      setProgress(100);
      setResult(r);
    } catch (e) {
      clearInterval(iv);
      setError(e instanceof Error ? e.message : "Backtest failed — could not load data.");
    } finally {
      setRunning(false);
    }
  }, [symbol, strategy, tf, dateRange]);

  const shownTrades = result
    ? (tradeTab === "wins"   ? result.trades.filter(t => t.result === "win")
    :  tradeTab === "losses" ? result.trades.filter(t => t.result === "loss")
    :  result.trades)
    : [];

  const handleSendToJournal = () => {
    // Navigate to journal with a note (in production would pre-fill)
    window.location.href = "/journal?prefill=walkforward";
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden" }}
         className="bg-wm-black">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ height: 44 }}>
        <BarChart2 size={15} className="text-wm-blue shrink-0" />
        <h1 className="text-sm font-bold text-wm-text">Backtesting Engine</h1>
        {/* Main tabs */}
        <div className="flex gap-1 ml-2">
          {([
            { id:"backtest"   as const, label:"Backtest" },
            { id:"walkforward"as const, label:"Walk Forward" },
          ]).map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                mainTab === t.id
                  ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40"
                  : "text-wm-text-muted border-transparent hover:border-wm-border hover:text-wm-text"
              )}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-wm-text-dim">
          <Zap size={10} className="text-wm-green" /> Live data — real Yahoo OHLCV bars
        </div>
        {result && mainTab === "backtest" && (
          <button onClick={() => {
            const header = "id,date,symbol,side,entry,exit,pnl,pct,result,bars,signal";
            const rows = result.trades.map(t => [t.id,t.date,t.symbol,t.side,t.entry,t.exit,t.pnl,t.pct,t.result,t.bars,t.signal].join(","));
            const csv = [header, ...rows].join("\n");
            const blob = new Blob([csv], { type:"text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `backtest-${symbol}-${strategy.id}-${tf}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border transition-colors">
            <Download size={11} /> Export
          </button>
        )}
      </div>

      {/* Walk Forward tab */}
      {mainTab === "walkforward" && (
        <div className="flex-1 overflow-y-auto">
          <WalkForwardGuide onSendToJournal={handleSendToJournal} />
        </div>
      )}

      {mainTab === "backtest" && <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── Config sidebar ──────────────────────────────── */}
        <div className="w-72 border-r border-wm-border flex flex-col shrink-0 p-4 gap-4 overflow-y-auto">
          {/* Symbol */}
          <div>
            <label className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-1.5 block">Symbol</label>
            <SymbolSearch value={symbol} onChange={s => s && setSymbol(s)} placeholder="Search any symbol…" className="mb-1.5" />
            <div className="grid grid-cols-2 gap-1">
              {SYMBOLS.map(s => (
                <button key={s} onClick={() => setSymbol(s)}
                  className={clsx("py-1.5 rounded-lg text-xs font-bold border transition-all",
                    symbol === s ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-1.5 block">Strategy</label>
            <div className="space-y-1">
              {STRATEGIES.map(s => (
                <button key={s.id} onClick={() => setStrategy(s)}
                  className={clsx("w-full text-left px-3 py-2 rounded-lg border transition-all",
                    strategy.id === s.id ? "bg-wm-green/10 border-wm-green/30" : "bg-wm-surface border-wm-border hover:border-wm-border/80")}
                >
                  <div className={clsx("text-xs font-semibold", strategy.id === s.id ? "text-wm-green" : "text-wm-text")}>{s.label}</div>
                  <div className="text-[9px] text-wm-text-dim">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-1.5 block">Timeframe</label>
            <div className="flex flex-wrap gap-1">
              {TIMEFRAMES.map(t => (
                <button key={t} onClick={() => setTf(t)}
                  className={clsx("px-2 py-1 rounded text-xs font-mono transition-all",
                    tf === t ? "bg-wm-gold/20 text-wm-gold" : "bg-wm-surface text-wm-text-muted hover:text-wm-text")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-1.5 block">Date Range</label>
            <div className="grid grid-cols-2 gap-1">
              {DATE_RANGES.map(d => (
                <button key={d.label} onClick={() => setDateRange(d)}
                  className={clsx("py-1.5 rounded-lg text-xs border transition-all",
                    dateRange.days === d.days ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40" : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text")}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={run}
            disabled={running}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-wm-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)" }}
          >
            {running ? <Square size={14} /> : <Play size={14} />}
            {running ? "Running..." : "Run Backtest"}
          </button>

          {result && (
            <button onClick={() => { setResult(null); setProgress(0); setError(null); }}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-wm-text-muted hover:text-wm-text bg-wm-surface border border-wm-border transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* ── Results panel ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Progress bar */}
          {error && !running && (
            <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-wm-red/10 border border-wm-red/30">
              <AlertTriangle size={14} className="text-wm-red shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-wm-red">Backtest failed</div>
                <div className="text-[11px] text-wm-text-muted mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {running && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-wm-text-muted">Fetching real {tf} bars for {symbol} & running strategy...</span>
                <span className="text-xs font-mono text-wm-green">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-wm-surface rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#00D4AA,#4FA3E0)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}

          {!result && !running && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-wm-text-muted">
              <BarChart2 size={48} className="opacity-15" />
              <div className="text-center">
                <div className="font-semibold text-sm">Configure and run a backtest</div>
                <div className="text-xs mt-1">Select symbol, strategy, timeframe and date range</div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>

                {/* ── Data provenance ── */}
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-wm-surface/40 border border-wm-border text-[10px] text-wm-text-dim">
                  <span className="flex items-center gap-1 text-wm-green font-bold"><CheckCircle size={11} /> Real data</span>
                  <span><span className="text-wm-text-muted font-mono">{result.meta.barCount.toLocaleString()}</span> bars</span>
                  <span><span className="text-wm-text-muted font-mono">{result.meta.fromDate}</span> → <span className="text-wm-text-muted font-mono">{result.meta.toDate}</span></span>
                  <span>{symbol} · {tf} · {strategy.label}</span>
                  {result.meta.rangeNote && (
                    <span className="flex items-center gap-1 text-wm-gold w-full mt-0.5">
                      <AlertTriangle size={10} /> {result.meta.rangeNote}
                    </span>
                  )}
                </div>

                {/* ── Key metrics ── */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { l:"Total P&L",     v: `${result.totalPnl >= 0 ? "+" : "−"}$${Math.abs(result.totalPnl).toLocaleString()}`, good: result.totalPnl >= 0 },
                    { l:"Win Rate",      v: `${result.winRate}%`, good: result.winRate >= 50 },
                    { l:"Profit Factor", v: result.profitFactor.toFixed(2), good: result.profitFactor >= 1 },
                    { l:"Sharpe Ratio",  v: result.sharpe.toFixed(2), good: result.sharpe >= 1 },
                    { l:"Total Trades",  v: `${result.totalTrades}`, good: true },
                    { l:"Max Drawdown",  v: `-${result.maxDrawdownPct}%`, good: result.maxDrawdownPct < 10 },
                    { l:"Avg Win",       v: `+$${result.avgWin.toFixed(0)}`, good: true },
                    { l:"Avg Loss",      v: `-$${Math.abs(result.avgLoss).toFixed(0)}`, good: null },
                  ].map(({ l, v, good }) => (
                    <div key={l} className="glass rounded-xl p-3">
                      <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{l}</div>
                      <div className={clsx("text-base font-black mt-1", good === true ? "text-wm-green" : good === false ? "text-wm-red" : "text-wm-text")}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Equity curve ── */}
                <div className="glass rounded-xl p-4 mb-4">
                  <div className="text-xs font-bold text-wm-text mb-2">Equity Curve</div>
                  <EquityChart data={result.equity} />
                  <div className="flex justify-between text-[9px] text-wm-text-dim mt-1">
                    <span>$100,000 initial</span>
                    <span className={result.totalPnl >= 0 ? "text-wm-green font-bold" : "text-wm-red font-bold"}>
                      ${(100_000 + result.totalPnl).toLocaleString()} final
                    </span>
                  </div>
                </div>

                {/* ── Trade log ── */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-wm-border">
                    <span className="text-xs font-bold text-wm-text">Trade Log</span>
                    <div className="flex gap-1">
                      {(["all","wins","losses"] as const).map(t => (
                        <button key={t} onClick={() => setTradeTab(t)}
                          className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold transition-all",
                            tradeTab === t
                              ? t === "wins"   ? "bg-wm-green/20 text-wm-green"
                              : t === "losses" ? "bg-wm-red/20 text-wm-red"
                              : "bg-wm-surface text-wm-text"
                              : "text-wm-text-muted hover:text-wm-text")}>
                          {t.charAt(0).toUpperCase() + t.slice(1)} {t === "all" ? `(${result.totalTrades})` : t === "wins" ? `(${result.wins})` : `(${result.losses})`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-wm-border">
                          {["#","Date","Side","Entry","Exit","P&L","%","Bars","Signal"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[10px] text-wm-text-muted font-semibold uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shownTrades.slice(0, 50).map(t => {
                          const up = t.result === "win";
                          return (
                            <tr key={t.id} className="border-b border-wm-border/30 hover:bg-wm-surface/30">
                              <td className="px-3 py-2 text-wm-text-dim font-mono">{t.id}</td>
                              <td className="px-3 py-2 text-wm-text-muted">{t.date}</td>
                              <td className="px-3 py-2">
                                <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold", t.side === "long" ? "bg-wm-green/15 text-wm-green" : "bg-wm-red/15 text-wm-red")}>
                                  {t.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-wm-text">{t.entry.toFixed(2)}</td>
                              <td className="px-3 py-2 font-mono text-wm-text">{t.exit.toFixed(2)}</td>
                              <td className={clsx("px-3 py-2 font-mono font-bold", up ? "text-wm-green" : "text-wm-red")}>
                                {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
                              </td>
                              <td className={clsx("px-3 py-2 font-mono", up ? "text-wm-green" : "text-wm-red")}>
                                {t.pct >= 0 ? "+" : ""}{t.pct.toFixed(2)}%
                              </td>
                              <td className="px-3 py-2 text-wm-text-muted font-mono">{t.bars}</td>
                              <td className="px-3 py-2 text-wm-text-dim text-[10px]">{t.signal.split("—")[0].trim()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {shownTrades.length > 50 && (
                      <div className="px-4 py-2 text-xs text-wm-text-dim text-center">
                        Showing 50 of {shownTrades.length} trades — export for full list
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>}
    </div>
  );
}
