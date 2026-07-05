"use client";

/**
 * Custom Indicator Builder
 * Full Pine Script v6 editor with:
 *  - Live preview (runs interpreter on chart data)
 *  - Save / Load / Share / Delete
 *  - Community library of starter templates
 *  - One-click "Add to Chart"
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Save, FolderOpen, Share2, Plus, Trash2,
  ChevronDown, ChevronRight, Zap, BookOpen, Check,
  AlertTriangle, RefreshCw, Code2, Library,
} from "lucide-react";
import { clsx } from "clsx";
import { PineEditor } from "./PineEditor";
import { interpretPine, validatePine } from "@/lib/pine/interpreter";
import type { OHLCVBar, PineOutput } from "@/lib/pine/types";

/* ── Starter templates ─────────────────────────────────────── */
const TEMPLATES: { name: string; desc: string; category: string; code: string }[] = [
  {
    name: "Triple EMA Ribbon",
    desc: "Three EMAs forming a trend ribbon — fast, mid, slow",
    category: "Trend",
    code: `//@version=6
indicator("Triple EMA Ribbon", overlay=true)

fast = input.int(8,  "Fast EMA")
mid  = input.int(21, "Mid EMA")
slow = input.int(55, "Slow EMA")

emaFast = ta.ema(close, fast)
emaMid  = ta.ema(close, mid)
emaSlow = ta.ema(close, slow)

plot(emaFast, "Fast EMA",  color=color.green,  linewidth=1)
plot(emaMid,  "Mid EMA",   color=color.yellow, linewidth=1)
plot(emaSlow, "Slow EMA",  color=color.red,    linewidth=2)

// Bull/bear background
isBull = emaFast > emaSlow
bgcolor(isBull ? color.new(color.green, 95) : color.new(color.red, 95))`,
  },
  {
    name: "RSI + Divergence",
    desc: "RSI with overbought/oversold signals",
    category: "Momentum",
    code: `//@version=6
indicator("RSI + Divergence", overlay=false)

len = input.int(14, "RSI Length")
ob  = input.float(70, "Overbought")
os  = input.float(30, "Oversold")

rsiVal = ta.rsi(close, len)

plot(rsiVal,       "RSI",        color=color.blue,   linewidth=2)
hline(ob,          "Overbought", color=color.red,    linestyle=line.style_dashed)
hline(os,          "Oversold",   color=color.green,  linestyle=line.style_dashed)
hline(50,          "Mid",        color=color.gray,   linestyle=line.style_dotted)

// Color RSI line
rsiColor = rsiVal > ob ? color.red : rsiVal < os ? color.green : color.blue
plot(rsiVal, "RSI Colored", color=rsiColor, linewidth=2)

// OB/OS signals
plotshape(ta.crossunder(rsiVal, ob) and rsiVal > 60, "OB Signal", shape.triangledown, location.top,    color.red)
plotshape(ta.crossover(rsiVal,  os) and rsiVal < 40, "OS Signal", shape.triangleup,   location.bottom, color.green)`,
  },
  {
    name: "VWAP + Bands",
    desc: "VWAP with 1σ and 2σ standard deviation bands",
    category: "Volume",
    code: `//@version=6
indicator("VWAP + Bands", overlay=true)

mult1 = input.float(1.0, "Band 1 Mult")
mult2 = input.float(2.0, "Band 2 Mult")

vwapVal = ta.vwap
dev     = ta.stdev(close, 20)

plot(vwapVal,            "VWAP",   color=color.yellow, linewidth=2)
plot(vwapVal + mult1 * dev, "+1σ", color=color.green,  linewidth=1)
plot(vwapVal - mult1 * dev, "-1σ", color=color.green,  linewidth=1)
plot(vwapVal + mult2 * dev, "+2σ", color=color.blue,   linewidth=1)
plot(vwapVal - mult2 * dev, "-2σ", color=color.blue,   linewidth=1)`,
  },
  {
    name: "Supertrend",
    desc: "ATR-based dynamic support/resistance",
    category: "Trend",
    code: `//@version=6
indicator("Supertrend", overlay=true)

factor    = input.float(3.0, "Factor")
atrLength = input.int(10,   "ATR Length")

atrVal = ta.atr(atrLength)
hl2Val = hl2

upperBand = hl2Val + factor * atrVal
lowerBand = hl2Val - factor * atrVal

var float trend   = na
var int   dir     = 1

trend := close > nz(trend) ? math.max(lowerBand, nz(trend)) : math.min(upperBand, nz(trend))
dir   := close > nz(trend) ? 1 : -1

trendColor = dir == 1 ? color.green : color.red
plot(trend, "Supertrend", color=trendColor, linewidth=2)

// Signals
plotshape(dir == 1 and dir[1] == -1, "Buy",  shape.triangleup,   location.belowbar, color.green)
plotshape(dir == -1 and dir[1] == 1, "Sell", shape.triangledown, location.abovebar, color.red)`,
  },
  {
    name: "Bollinger Band Squeeze",
    desc: "Detect BB squeeze and expansion — Momentum signal",
    category: "Volatility",
    code: `//@version=6
indicator("BB Squeeze", overlay=false)

length = input.int(20,  "BB Length")
mult   = input.float(2.0, "BB Mult")
klen   = input.int(20,  "KC Length")
kmult  = input.float(1.5, "KC Mult")

bbUpper = ta.sma(close, length) + mult * ta.stdev(close, length)
bbLower = ta.sma(close, length) - mult * ta.stdev(close, length)
kcUpper = ta.ema(close, klen)   + kmult * ta.atr(klen)
kcLower = ta.ema(close, klen)   - kmult * ta.atr(klen)

sqz = bbUpper < kcUpper and bbLower > kcLower

mom = ta.mom(close, length)
plot(mom, "Momentum", color=mom > 0 ? color.green : color.red, style=plot.style_histogram, linewidth=3)

plotshape(sqz,  "Squeeze On",  shape.circle, location.top,    color.red,   size=0.5)
plotshape(!sqz, "Squeeze Off", shape.circle, location.bottom, color.green, size=0.5)
hline(0, "Zero", color.gray, linestyle=line.style_dashed)`,
  },
  {
    name: "MACD Signal",
    desc: "Classic MACD histogram with cross signals",
    category: "Momentum",
    code: `//@version=6
indicator("MACD Signal", overlay=false)

fast   = input.int(12, "Fast")
slow   = input.int(26, "Slow")
signal = input.int(9,  "Signal")

[macdLine, sigLine, hist] = ta.macd(close, fast, slow, signal)

plot(macdLine, "MACD",       color=color.blue,  linewidth=2)
plot(sigLine,  "Signal",     color=color.orange, linewidth=2)
plot(hist,     "Histogram",  color=hist > 0 ? color.green : color.red, style=plot.style_histogram, linewidth=3)

hline(0, "Zero", color.gray, linestyle=line.style_dashed)

plotshape(ta.crossover(macdLine,  sigLine), "Buy",  shape.triangleup,   location.belowbar, color.green)
plotshape(ta.crossunder(macdLine, sigLine), "Sell", shape.triangledown, location.abovebar, color.red)`,
  },
  {
    name: "Smart Money Zones",
    desc: "Detects potential order blocks and fair value gaps",
    category: "Smart Money",
    code: `//@version=6
indicator("Smart Money Zones", overlay=true)

obLen  = input.int(3, "OB Lookback")
fvgMin = input.float(0.1, "FVG Min % Gap")

// Order block: large bearish/bullish candle before reversal
bodySize   = math.abs(close - open)
avgBody    = ta.sma(bodySize, 20)
bigCandle  = bodySize > avgBody * 1.8
bullOB     = bigCandle and close < open and close[1] > close
bearOB     = bigCandle and close > open and close[1] < close

// Fair Value Gap: gap between candle[2].high and candle[0].low (bullish)
bullFVG = low > high[2]
bearFVG = high < low[2]

plotshape(bullOB, "Bull OB", shape.labelup,   location.belowbar, color.new(color.green, 50))
plotshape(bearOB, "Bear OB", shape.labeldown, location.abovebar, color.new(color.red, 50))
bgcolor(bullFVG ? color.new(color.green, 90) : bearFVG ? color.new(color.red, 90) : na)`,
  },
  {
    name: "CLC Rule Signal",
    desc: "Context + Location + Confirmation entry signal",
    category: "Smart Money",
    code: `//@version=6
indicator("CLC Rule Signal", overlay=true)

// Context: trending above VWAP
vwapVal  = ta.vwap
aboveVWAP = close > vwapVal

// Location: at previous structure (simple: near 20-bar low)
lowest20 = ta.lowest(low, 20)
atSupport = low <= lowest20 * 1.002

// Confirmation: aggressive buy prints (CVD proxy: up close, high volume)
avgVol    = ta.sma(volume, 20)
highVol   = volume > avgVol * 1.5
agg       = highVol and close > open

// CLC Long signal
clcLong = aboveVWAP and atSupport and agg

plotshape(clcLong, "CLC Long", shape.triangleup, location.belowbar, color.green)
plot(vwapVal, "VWAP", color=color.yellow, linewidth=2)
plot(lowest20, "Support", color=color.blue, linewidth=1)`,
  },
];

type SavedScript = { id: string; name: string; code: string; createdAt: number };

const STORAGE_KEY = "wm-pine-scripts";

function loadSaved(): SavedScript[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveSaved(scripts: SavedScript[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts)); } catch {}
}

/* ── Main component ─────────────────────────────────────────── */
interface Props {
  onClose:    () => void;
  bars:       OHLCVBar[];
  onAddToChart: (output: PineOutput, code: string) => void;
  activeCode?: string;
}

export function CustomIndicatorBuilder({ onClose, bars, onAddToChart, activeCode }: Props) {
  const [code,       setCode]       = useState(activeCode || TEMPLATES[0].code);
  const [output,     setOutput]     = useState<PineOutput | null>(null);
  const [errors,     setErrors]     = useState<{ line: number; msg: string }[]>([]);
  const [scriptName, setScriptName] = useState("My Indicator");
  const [saved,      setSaved]      = useState<SavedScript[]>([]);
  const [tab,        setTab]        = useState<"editor"|"templates"|"saved">("editor");
  const [running,    setRunning]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [expandedCat,setExpandedCat] = useState<string>("Trend");
  const runRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setSaved(loadSaved()); }, []);

  // Auto-validate as user types
  useEffect(() => {
    clearTimeout(runRef.current);
    runRef.current = setTimeout(() => {
      const errs = validatePine(code);
      setErrors(errs);
    }, 400);
    return () => clearTimeout(runRef.current);
  }, [code]);

  const runScript = useCallback(() => {
    if (!bars.length) return;
    setRunning(true);
    setTimeout(() => {
      try {
        const result = interpretPine(code, bars);
        setOutput(result);
        setErrors(result.errors);
      } catch (e: any) {
        setErrors([{ line: 0, msg: String(e?.message || e) }]);
      } finally {
        setRunning(false);
      }
    }, 50);
  }, [code, bars]);

  const saveScript = () => {
    const newScript: SavedScript = { id: Date.now().toString(), name: scriptName, code, createdAt: Date.now() };
    const next = [newScript, ...saved.filter(s => s.name !== scriptName)];
    setSaved(next);
    saveSaved(next);
  };

  const deleteScript = (id: string) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    saveSaved(next);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const addToChart = () => {
    if (!output) { runScript(); return; }
    onAddToChart(output, code);
    onClose();
  };

  const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{   opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-5xl bg-wm-dark border border-wm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-wm-border shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-wm-blue to-wm-purple flex items-center justify-center">
            <Code2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-wm-text">Custom Indicator Builder</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-wm-green/20 text-wm-green border border-wm-green/30 font-semibold">
            Pine Script v6
          </span>

          <div className="flex gap-1 ml-4">
            {(["editor","templates","saved"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx("px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                  tab === t ? "bg-wm-surface text-wm-text" : "text-wm-text-muted hover:text-wm-text"
                )}>
                {t === "templates" && <Library size={11} className="inline mr-1" />}
                {t === "editor" && <Code2 size={11} className="inline mr-1" />}
                {t === "saved" && <FolderOpen size={11} className="inline mr-1" />}
                {t === "saved" ? `Saved (${saved.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Script name */}
            {tab === "editor" && (
              <input
                value={scriptName} onChange={e => setScriptName(e.target.value)}
                className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none focus:border-wm-blue/50 w-40"
                placeholder="Script name..."
              />
            )}
            <button onClick={onClose}>
              <X size={16} className="text-wm-text-muted hover:text-wm-text transition-colors" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">

          {/* ── Editor tab ──────────────────────────────── */}
          {tab === "editor" && (
            <>
              {/* Code editor area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <PineEditor
                  value={code}
                  onChange={setCode}
                  errors={errors}
                  height={99999}
                />
              </div>

              {/* Right panel: output / actions */}
              <div className="w-72 border-l border-wm-border flex flex-col shrink-0 overflow-hidden">
                {/* Action buttons */}
                <div className="p-3 border-b border-wm-border space-y-2 shrink-0">
                  <button
                    onClick={runScript}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-wm-black transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#00D4AA,#4FA3E0)" }}
                  >
                    {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                    {running ? "Running..." : "Run Preview"}
                  </button>
                  <div className="flex gap-1.5">
                    <button onClick={saveScript}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border border-wm-border bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
                      <Save size={11} /> Save
                    </button>
                    <button onClick={copyScript}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border border-wm-border bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
                      {copied ? <Check size={11} className="text-wm-green" /> : <Share2 size={11} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={addToChart}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border border-wm-gold/40 bg-wm-gold/10 text-wm-gold hover:bg-wm-gold/20 transition-all"
                  >
                    <Zap size={13} className="fill-wm-gold" />
                    Add to Chart
                  </button>
                </div>

                {/* Output preview */}
                <div className="flex-1 overflow-y-auto p-3">
                  {errors.length > 0 && (
                    <div className="mb-3 p-2 rounded-lg bg-wm-red/10 border border-wm-red/25">
                      <div className="flex items-center gap-1 text-[10px] text-wm-red font-semibold mb-1">
                        <AlertTriangle size={10} /> {errors.length} Error{errors.length > 1 ? "s" : ""}
                      </div>
                      {errors.slice(0, 3).map((e, i) => (
                        <div key={i} className="text-[9px] text-wm-red/80 font-mono">Line {e.line}: {e.msg}</div>
                      ))}
                    </div>
                  )}

                  {output && (
                    <>
                      <div className="text-[10px] text-wm-text-muted font-semibold uppercase tracking-wider mb-2">
                        Output ({output.title})
                      </div>
                      {output.plots.map(p => (
                        <div key={p.id} className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-0.5 rounded-full shrink-0" style={{ background: p.color }} />
                          <span className="text-[10px] text-wm-text truncate">{p.title}</span>
                          <span className="text-[9px] text-wm-text-dim ml-auto">
                            {p.values.filter(v => v != null).length} bars
                          </span>
                        </div>
                      ))}
                      {output.hlines.map(h => (
                        <div key={h.title} className="flex items-center gap-2 mb-1.5">
                          <div className="w-3 h-0.5 shrink-0" style={{ borderTop: `1.5px ${h.style} ${h.color}` }} />
                          <span className="text-[10px] text-wm-text">{h.title || `hline(${h.price})`}</span>
                          <span className="text-[9px] font-mono text-wm-text-dim ml-auto">{h.price}</span>
                        </div>
                      ))}
                      {output.shapes.map(s => (
                        <div key={s.title} className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-[10px] text-wm-text">{s.title}</span>
                          <span className="text-[9px] text-wm-text-dim ml-auto">{s.bars.length} signals</span>
                        </div>
                      ))}
                      {output.errors.length === 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-wm-green">
                          <Check size={11} /> No errors
                        </div>
                      )}
                    </>
                  )}

                  {/* Quick reference */}
                  <div className="mt-4 border-t border-wm-border pt-3">
                    <div className="text-[9px] text-wm-text-dim uppercase tracking-wider font-semibold mb-2">Quick Reference</div>
                    {[
                      { label: "Close", code: "close" },
                      { label: "SMA 20", code: "ta.sma(close, 20)" },
                      { label: "EMA 9", code: "ta.ema(close, 9)" },
                      { label: "RSI 14", code: "ta.rsi(close, 14)" },
                      { label: "ATR 14", code: "ta.atr(14)" },
                      { label: "VWAP", code: "ta.vwap" },
                    ].map(({ label, code: c }) => (
                      <button key={c}
                        onClick={() => setCode(prev => prev + `\n${c}`)}
                        className="flex items-center justify-between w-full px-2 py-0.5 rounded hover:bg-wm-surface transition-colors group">
                        <span className="text-[9px] text-wm-text-dim group-hover:text-wm-text">{label}</span>
                        <span className="text-[9px] font-mono text-wm-blue">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Templates tab ───────────────────────────── */}
          {tab === "templates" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs text-wm-text-dim mb-4">
                Click any template to load it in the editor. {TEMPLATES.length} built-in scripts.
              </div>
              {categories.map(cat => (
                <div key={cat} className="mb-4">
                  <button
                    onClick={() => setExpandedCat(c => c === cat ? "" : cat)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedCat === cat ? <ChevronDown size={13} className="text-wm-text-muted" /> : <ChevronRight size={13} className="text-wm-text-muted" />}
                    <span className="text-xs font-bold text-wm-text">{cat}</span>
                    <span className="text-[10px] text-wm-text-dim">({TEMPLATES.filter(t => t.category === cat).length})</span>
                  </button>
                  {expandedCat === cat && (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {TEMPLATES.filter(t => t.category === cat).map(tmpl => (
                        <button
                          key={tmpl.name}
                          onClick={() => { setCode(tmpl.code); setScriptName(tmpl.name); setTab("editor"); }}
                          className="text-left p-3 rounded-xl glass border border-wm-border hover:border-wm-blue/40 transition-all group"
                        >
                          <div className="text-xs font-bold text-wm-text group-hover:text-wm-blue transition-colors">{tmpl.name}</div>
                          <div className="text-[10px] text-wm-text-dim mt-0.5">{tmpl.desc}</div>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-wm-surface border border-wm-border text-wm-text-dim">
                              {tmpl.category}
                            </span>
                            <span className="text-[9px] text-wm-blue ml-auto opacity-0 group-hover:opacity-100 transition-opacity">Load →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Saved tab ───────────────────────────────── */}
          {tab === "saved" && (
            <div className="flex-1 overflow-y-auto p-4">
              {saved.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-wm-text-muted">
                  <FolderOpen size={32} className="opacity-20" />
                  <div className="text-sm">No saved scripts yet</div>
                  <div className="text-xs">Build one in the Editor tab and click Save</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {saved.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl glass border border-wm-border hover:border-wm-blue/30 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wm-blue/30 to-wm-purple/30 flex items-center justify-center shrink-0">
                        <Code2 size={14} className="text-wm-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-wm-text">{s.name}</div>
                        <div className="text-[10px] text-wm-text-dim">
                          {new Date(s.createdAt).toLocaleDateString()} · {s.code.split("\n").length} lines
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setCode(s.code); setScriptName(s.name); setTab("editor"); }}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-wm-blue/15 text-wm-blue hover:bg-wm-blue/25 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteScript(s.id)}
                          className="p-1 rounded text-wm-red/60 hover:text-wm-red hover:bg-wm-red/10 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
