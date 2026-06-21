"use client";

/**
 * Education — Lesson library with per-lesson note-taking + 10-question adaptive MCQ quizzes
 * Notes auto-save to localStorage. Quizzes shuffle questions on every retake.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Play, BookOpen, CheckCircle2, Lock, Star,
  ChevronRight, ChevronDown, ChevronUp, Pencil,
  RotateCcw, Trophy, Clock, GraduationCap, FileText,
  CheckCircle, XCircle, HelpCircle, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

/* ── Types ───────────────────────────────────────────────── */
interface Lesson {
  id: string; title: string; duration: string; completed: boolean;
}
interface Module {
  id: number; title: string; duration: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Pro";
  locked: boolean; completed: boolean; color: string; lessons: Lesson[];
}
interface QQ { q: string; choices: string[]; correct: number; explain: string; }

/* ── Quiz banks ──────────────────────────────────────────── */
const BANK_OF: QQ[] = [
  { q:"What does 'aggressive order flow' mean?", correct:0, explain:"Aggressive orders are market orders that immediately execute against resting limit orders.",
    choices:["Orders placed at market price hitting the bid or ask","Limit orders resting on the book","Hidden iceberg orders","Orders placed after hours"] },
  { q:"The DOM (Depth of Market) shows:", correct:1, explain:"DOM displays pending limit orders across price levels, showing supply and demand.",
    choices:["Historical OHLCV bars","Resting bid and ask limit orders at each price level","Options chain data","Futures basis spread"] },
  { q:"Which metric measures cumulative net aggression between buyers and sellers?", correct:2, explain:"CVD is the running sum of buy volume − sell volume, revealing directional conviction.",
    choices:["RSI","VWAP","CVD (Cumulative Volume Delta)","Bollinger Bands"] },
  { q:"An 'absorption' pattern occurs when:", correct:1, explain:"Absorption = large passive orders soaking up aggression. Price stays flat while volume surges.",
    choices:["Price breaks through a key level on high volume","Large passive players absorb aggressive selling without price moving lower","Volume collapses near a moving average","Bid-ask spread widens dramatically"] },
  { q:"What is a 'tape read' in trading?", correct:1, explain:"Tape reading involves interpreting the live Time & Sales feed — size, pace, and price of each print.",
    choices:["Reading the ticker tape of news headlines","Analyzing the Time & Sales stream for order flow clues","Measuring market breadth via advance/decline","Scanning for gap openings"] },
  { q:"A 'stop run' typically causes:", correct:0, explain:"Smart money moves price toward liquidity pools (stop clusters), harvesting that liquidity before reversing.",
    choices:["Price to move toward clustered stop orders, triggering them, then reversing","Volume to disappear suddenly","The bid-ask spread to compress","A sustained trend in the original direction"] },
  { q:"In footprint charts, a 'delta' value represents:", correct:1, explain:"Delta = buys − sells. Positive delta = more buyer aggression; negative = sellers dominate.",
    choices:["The price range of the candle","Buy volume minus sell volume at a price level","The VWAP deviation","Open interest change"] },
  { q:"A 'trapped seller' setup occurs when:", correct:0, explain:"Trapped sellers sold the breakdown but price snapped back. They are underwater and forced to cover, fueling the rally.",
    choices:["Sellers push price below support but price quickly reverses above it","Volume is below average on a down move","Price consolidates for more than 10 bars","The bid queue is 5× the ask queue"] },
  { q:"The Value Area in a Volume Profile represents:", correct:1, explain:"By convention, the Value Area (VAH to VAL) contains approximately 70% of the session's traded volume.",
    choices:["The top 10% of volume nodes","The range containing ~70% of total traded volume","The POC ± 2 standard deviations","All price levels above VWAP"] },
  { q:"Which order type is most likely involved in 'spoofing'?", correct:1, explain:"Spoofing = flashing large fake limit orders to mislead traders, then cancelling before execution.",
    choices:["Market orders","Large limit orders placed and quickly cancelled to mislead other traders","Stop-limit orders","IOC (Immediate-or-Cancel) orders"] },
];

const BANK_WY: QQ[] = [
  { q:"In Wyckoff theory, a 'Spring' represents:", correct:1, explain:"The Spring is a false breakdown below the accumulation range — smart money buys while retail panics, then price surges.",
    choices:["A breakout above resistance","A brief dip below support that shakes out weak hands before markup","A volume surge at the POC","Three consecutive higher lows"] },
  { q:"Wyckoff Phase B in accumulation is characterized by:", correct:1, explain:"Phase B is the longest phase: institutions build position over weeks/months via buying dips.",
    choices:["A sudden price surge above resistance","Ranging/consolidating with large volume oscillations as institutions accumulate","A straight drop to new lows","Declining volume with tightening range"] },
  { q:"A 'UTAD' (Upthrust After Distribution) is:", correct:1, explain:"UTAD mirrors the Spring but in distribution. Price briefly breaks above resistance to trap buyers before markdown.",
    choices:["A bullish breakout confirmed by volume","A false breakout above a distribution range, designed to trap late buyers","The final low before a new bull trend","A Wyckoff term for gap-and-go setups"] },
  { q:"In the Markov Regime model, a 'Bullish' state is triggered when daily return exceeds:", correct:1, explain:"Per the Markov Pro v2 Pine Script, daily return > 2.5% (with volatility confirmation) defines the Bullish regime.",
    choices:["1%","2.5%","5%","10%"] },
  { q:"Which phase follows 'Distribution' in a Wyckoff cycle?", correct:2, explain:"After distribution, the Markdown phase begins — price falls as excess supply overwhelms demand.",
    choices:["Accumulation","Markup","Markdown","Re-accumulation"] },
  { q:"The 'Effort vs Result' principle states:", correct:0, explain:"If high volume (effort) produces little price movement (poor result), it reveals absorption — a potential turning point.",
    choices:["High volume should produce large price moves; divergence signals weakness","Price always follows volume with a one-bar lag","Volume should decline in trending markets","Effort = number of candles; Result = total volume"] },
  { q:"Re-accumulation differs from distribution because:", correct:1, explain:"Re-accumulation = consolidation mid-trend where strong hands hold. Distribution = smart money selling to retail.",
    choices:["Re-accumulation breaks below the range; distribution breaks above","Re-accumulation is a pause in an uptrend with institutions holding; distribution is smart money selling","Re-accumulation always occurs on lower timeframes","Distribution always involves more volume"] },
  { q:"A 'Sign of Strength' (SOS) in Wyckoff accumulation is:", correct:1, explain:"SOS confirms institutional commitment — price moves up decisively on expanding volume after the Spring.",
    choices:["Three consecutive red candles","A strong advance on increasing volume after a Spring","An RSI reading above 70","A gap opening above VWAP"] },
  { q:"In a Wyckoff markup phase, what typically happens to volume?", correct:1, explain:"Healthy markup: advancing waves show volume expansion (buying), corrective pullbacks show volume contraction.",
    choices:["Volume is flat and irrelevant","Volume expands on advancing waves and contracts on pullbacks","Volume is highest at the very top","Volume declines throughout the markup"] },
  { q:"The 'Last Point of Support' (LPS) represents:", correct:1, explain:"LPS is a pullback after SOS on diminishing volume — a low-risk re-entry before the major uptrend begins.",
    choices:["The lowest price ever traded","A higher low after SOS, offering a low-risk entry before the full markup","The session VWAP","The VAL of the volume profile"] },
];

const BANK_GEN: QQ[] = [
  { q:"What does VWAP stand for?", correct:0, explain:"VWAP = Volume Weighted Average Price — the average price paid, weighted by volume traded at each level.",
    choices:["Volume-Weighted Average Price","Volatility-Weighted Auction Point","Volume With Adjusted Parameters","Vertical Weighted Average Position"] },
  { q:"A 'golden cross' occurs when:", correct:1, explain:"A golden cross is a bullish signal where the 50-day MA crosses above the 200-day MA.",
    choices:["RSI crosses 50 from below","The 50-day MA crosses above the 200-day MA","Price breaks above VWAP","Volume exceeds 2× the 20-day average"] },
  { q:"Which candlestick pattern signals potential reversal after a downtrend?", correct:1, explain:"A Hammer has a small body and long lower wick, showing buyers rejected lower prices — bullish reversal signal.",
    choices:["Doji","Hammer","Shooting Star","Bearish Engulfing"] },
  { q:"RSI above 70 generally indicates:", correct:2, explain:"RSI > 70 signals overbought territory — price may be due for a pullback, though overbought can persist in strong trends.",
    choices:["Strong buy signal","Oversold condition","Overbought condition","Neutral market"] },
  { q:"What is a 'head and shoulders' pattern?", correct:0, explain:"Head and shoulders: left shoulder, higher head, right shoulder — forms as uptrend momentum weakens before reversal.",
    choices:["Three peaks with the middle highest, signaling potential bearish reversal","Three troughs signaling accumulation","A double-top with equal highs","A continuation pattern in trending markets"] },
  { q:"Market breadth measures:", correct:1, explain:"Market breadth assesses the overall health of a move by counting how many stocks participate (advance/decline ratio).",
    choices:["The spread between highest and lowest prices","How many stocks advance vs decline across an index","The volatility of a single security","Options implied volatility"] },
  { q:"A 'liquidity grab' typically:", correct:1, explain:"Liquidity grabs = engineered moves to trigger clustered stop orders. The cascade provides liquidity for large players to fill.",
    choices:["Adds volume to the market organically","Sweeps stop orders below support or above resistance before reversing","Signals institutional accumulation over weeks","Refers to dark pool prints appearing on tape"] },
  { q:"What does 'open interest' measure in futures?", correct:1, explain:"Open interest = total number of active/open futures contracts. Rising OI in an uptrend confirms new money entering.",
    choices:["Total volume traded in a session","Number of outstanding contracts not yet settled","The bid-ask spread in ticks","Daily P&L of all participants"] },
  { q:"The 'fear and greed index' measures:", correct:1, explain:"Fear & Greed Index combines VIX, put/call ratio, momentum, breadth, and safe haven demand into a single sentiment gauge.",
    choices:["Insider trading activity","Composite market sentiment using volatility, momentum, breadth, and other signals","Government economic data","Corporate earnings surprises"] },
  { q:"In CLC (Context + Location + Confirmation), 'Confirmation' refers to:", correct:1, explain:"CLC Confirmation = reading live tape/order flow to time entry without waiting for candle close, gaining +5-15 ticks advantage.",
    choices:["Waiting for the next day's price action","Entering on order flow signals, NOT waiting for candle close","Getting confirmation from another trader","Checking news before entry"] },
];

function getBank(title: string): QQ[] {
  const t = title.toLowerCase();
  if (t.includes("wyckoff") || t.includes("markov")) return BANK_WY;
  if (t.includes("order flow") || t.includes("footprint") || t.includes("cvd") || t.includes("delta")
    || t.includes("dom") || t.includes("tape") || t.includes("absorption") || t.includes("trap")
    || t.includes("dark pool") || t.includes("iceberg") || t.includes("stop run"))
    return BANK_OF;
  return BANK_GEN;
}

function shufflePick(bank: QQ[], n = 10): QQ[] {
  return [...bank].sort(() => Math.random() - 0.5).slice(0, Math.min(n, bank.length));
}

/* ── Modules ─────────────────────────────────────────────── */
const MODULES: Module[] = [
  { id:1, title:"Order Flow Foundations",              duration:"4h 20m", level:"Beginner",     locked:false, completed:true,  color:"#00D4AA",
    lessons:[
      { id:"of-1", title:"What is Order Flow? Market Mechanics Explained",  duration:"18m", completed:true  },
      { id:"of-2", title:"Tape Reading: Time & Sales Deep Dive",            duration:"22m", completed:true  },
      { id:"of-3", title:"DOM (Depth of Market) Explained",                 duration:"25m", completed:true  },
      { id:"of-4", title:"Bid, Ask, and Spread Dynamics",                   duration:"15m", completed:true  },
    ]},
  { id:2, title:"Footprint Charts Mastery",            duration:"5h 45m", level:"Intermediate", locked:false, completed:false, color:"#4FA3E0",
    lessons:[
      { id:"fp-1", title:"Footprint Chart Types: Bid×Ask vs Delta vs Vol Profile vs Imbalance", duration:"35m", completed:true  },
      { id:"fp-2", title:"Aggressive vs Passive Order Flow — Key Difference",                   duration:"28m", completed:true  },
      { id:"fp-3", title:"Imbalance Clusters: Identifying >300% Threshold",                     duration:"32m", completed:false },
      { id:"fp-4", title:"Volume Profile: POC, VAH, VAL, and How to Trade Them",               duration:"40m", completed:false },
      { id:"fp-5", title:"Delta & Cumulative Volume Delta (CVD) Analysis",                      duration:"38m", completed:false },
    ]},
  { id:3, title:"Smart Money Signals",                 duration:"6h 10m", level:"Intermediate", locked:false, completed:false, color:"#8B5CF6",
    lessons:[
      { id:"sm-1", title:"Absorption: When Large Players Absorb Selling",        duration:"30m", completed:false },
      { id:"sm-2", title:"Volume Tails & What They Mean for Reversals",           duration:"22m", completed:false },
      { id:"sm-3", title:"Bids Filling & Accumulation Patterns",                  duration:"35m", completed:false },
      { id:"sm-4", title:"Bids Supporting Previous Day Low — The Setup",          duration:"28m", completed:false },
      { id:"sm-5", title:"Conviction: Same Bids Re-Appear (3×+ same level)",     duration:"25m", completed:false },
      { id:"sm-6", title:"Passive vs Aggressive Buyers — Visual Guide",          duration:"20m", completed:false },
      { id:"sm-7", title:"Spoofing Detection: Large Bids Pulled Without Fill",   duration:"32m", completed:false },
      { id:"sm-8", title:"Stop Runs: How Smart Money Hunts Liquidity",           duration:"28m", completed:false },
      { id:"sm-9", title:"Trapped Sellers: Identifying & Exploiting",            duration:"25m", completed:false },
    ]},
  { id:4, title:"Iceberg Orders & Dark Pools",         duration:"3h 30m", level:"Advanced",     locked:false, completed:false, color:"#F0B429",
    lessons:[
      { id:"dp-1", title:"Iceberg Order Detection — Clip Size Patterns",       duration:"30m", completed:false },
      { id:"dp-2", title:"Dark Pool Prints: Reading Institutional Footprints", duration:"35m", completed:false },
      { id:"dp-3", title:"Block Trades & Their Directional Bias",              duration:"28m", completed:false },
    ]},
  { id:5, title:"CLC Rule — Context + Location + Confirmation", duration:"4h", level:"Advanced", locked:false, completed:false, color:"#FF4D6A",
    lessons:[
      { id:"clc-1", title:"The CLC Rule Explained — Foundation of Smart Entries",        duration:"45m", completed:false },
      { id:"clc-2", title:"Context: Reading Market Regime (Trend vs Range vs Reversal)", duration:"35m", completed:false },
      { id:"clc-3", title:"Location: Demand Zones, PDL, VWAP, Structure",               duration:"40m", completed:false },
      { id:"clc-4", title:"Confirmation: Entering on Order Flow, NOT Candle Closes",    duration:"30m", completed:false },
      { id:"clc-5", title:"Best Opportunity / Smallest Risk Setup Framework",           duration:"35m", completed:false },
      { id:"clc-6", title:"CLC in Action: Live Trade Walkthroughs",                    duration:"55m", completed:false },
    ]},
  { id:6, title:"Wyckoff Method & Market Regimes",     duration:"5h 20m", level:"Advanced",     locked:false, completed:false, color:"#00B4D8",
    lessons:[
      { id:"wy-1", title:"Wyckoff Phases: Accumulation, Markup, Distribution, Markdown", duration:"45m", completed:false },
      { id:"wy-2", title:"Wyckoff Schematics in Modern Markets",                          duration:"40m", completed:false },
      { id:"wy-3", title:"Wyckoff Switches: Phase Changes in Real Time",                  duration:"35m", completed:false },
      { id:"wy-4", title:"Lower Highs at Supply — Distribution Warning Signs",            duration:"25m", completed:false },
      { id:"wy-5", title:"Markov Regime Model: Quantifying Market State",                 duration:"40m", completed:false },
      { id:"wy-6", title:"Spring Pattern: The Shakeout Before the Rally",                 duration:"35m", completed:false },
    ]},
  { id:7, title:"VWAP Trading Strategies",             duration:"3h",     level:"Intermediate", locked:true,  completed:false, color:"#06D6A0",
    lessons:[
      { id:"vw-1", title:"VWAP Reclaim & Rejection Setups",    duration:"30m", completed:false },
      { id:"vw-2", title:"VWAP Bands (σ1, σ2, σ3) Strategy",  duration:"35m", completed:false },
      { id:"vw-3", title:"Anchored VWAP for Swing Traders",    duration:"28m", completed:false },
    ]},
  { id:8, title:"SpaidBot: AI-Assisted Trading",       duration:"2h",     level:"Pro",          locked:true,  completed:false, color:"#F97316",
    lessons:[
      { id:"ai-1", title:"SpaidBot Overview & Capabilities",                duration:"20m", completed:false },
      { id:"ai-2", title:"Setting Up Real-Time Alerts with SpaidBot",       duration:"25m", completed:false },
      { id:"ai-3", title:"AI Pattern Recognition: Reading SpaidBot Signals",duration:"30m", completed:false },
    ]},
];

const LEVEL_COLOR: Record<Module["level"],string> = {
  Beginner:"#00D4AA", Intermediate:"#4FA3E0", Advanced:"#F0B429", Pro:"#8B5CF6",
};

/* ── Notes component ─────────────────────────────────────── */
function LessonNotes({ lessonId }: { lessonId: string }) {
  const KEY = `wm-notes-${lessonId}`;
  const [text,    setText]    = useState(() => (typeof window !== "undefined" ? localStorage.getItem(KEY) ?? "" : ""));
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (v: string) => {
    setText(v); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { localStorage.setItem(KEY, v); setSaved(true); }, 700);
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-[10px] text-wm-text-dim hover:text-wm-blue transition-colors">
        <Pencil size={10}/>
        {text ? <span className="italic">{text.slice(0,60)}{text.length>60?"…":""}</span> : "Add notes"}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-wm-text-muted uppercase flex items-center gap-1">
          <Pencil size={9}/> Notes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-wm-text-dim">{saved ? "✓ Saved" : "Saving…"}</span>
          <button onClick={() => setEditing(false)} className="text-[9px] text-wm-text-dim hover:text-wm-text">Close</button>
        </div>
      </div>
      <textarea value={text} onChange={e => onChange(e.target.value)} rows={4} autoFocus
        placeholder="Key takeaways, setups to remember, questions…"
        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none focus:border-wm-blue/50 resize-none placeholder-wm-text-dim leading-relaxed"/>
    </div>
  );
}

/* ── Quiz panel ──────────────────────────────────────────── */
function QuizPanel({ lesson, onClose }: { lesson: Lesson; onClose: (passed?: boolean) => void }) {
  const [qs,       setQs]       = useState<QQ[]>(() => shufflePick(getBank(lesson.title)));
  const [cur,      setCur]      = useState(0);
  const [sel,      setSel]      = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score,    setScore]    = useState(0);
  const [done,     setDone]     = useState(false);
  const [log,      setLog]      = useState<boolean[]>([]);

  const q = qs[cur];

  const pick = (i: number) => {
    if (answered) return;
    setSel(i); setAnswered(true);
    const ok = i === q.correct;
    if (ok) setScore(s => s + 1);
    setLog(l => [...l, ok]);
  };

  const next = () => {
    if (cur + 1 >= qs.length) { setDone(true); return; }
    setCur(c => c+1); setSel(null); setAnswered(false);
  };

  const retake = () => {
    setQs(shufflePick(getBank(lesson.title)));
    setCur(0); setSel(null); setAnswered(false); setScore(0); setDone(false); setLog([]);
  };

  const pct = Math.round((score / qs.length) * 100);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background:"rgba(7,10,15,0.88)", backdropFilter:"blur(6px)" }}>
      <motion.div initial={{ scale:0.92,y:16 }} animate={{ scale:1,y:0 }}
        className="relative bg-wm-dark border border-wm-border rounded-2xl shadow-2xl flex flex-col"
        style={{ width:600, maxHeight:"88vh", overflow:"hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-wm-border shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle size={15} className="text-wm-gold"/>
            <span className="text-sm font-black text-wm-text">Lesson Quiz</span>
          </div>
          <div className="flex items-center gap-3">
            {!done && <span className="text-xs text-wm-text-muted font-mono">{cur+1}/{qs.length}</span>}
            <button onClick={() => onClose()}><X size={14} className="text-wm-text-muted hover:text-wm-text"/></button>
          </div>
        </div>

        {/* Progress */}
        {!done && (
          <div className="h-0.5 bg-wm-surface">
            <div className="h-full bg-wm-gold transition-all"
              style={{ width:`${((cur+(answered?1:0))/qs.length)*100}%` }}/>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth:"thin" }}>
          {!done ? (
            <>
              <div className="text-[10px] text-wm-text-dim mb-3 truncate">📖 {lesson.title}</div>
              <div className="text-sm font-bold text-wm-text mb-5 leading-relaxed">{q.q}</div>

              <div className="space-y-2.5 mb-5">
                {q.choices.map((ch, i) => {
                  const isSel = sel === i;
                  const isOk  = i === q.correct;
                  let cls = "bg-wm-surface border-wm-border";
                  if (answered) {
                    if (isOk)                 cls = "bg-wm-green/10 border-wm-green/50";
                    else if (isSel && !isOk)  cls = "bg-wm-red/10 border-wm-red/40";
                    else                      cls = "bg-wm-surface/40 border-wm-border/40 opacity-50";
                  } else if (isSel) cls = "bg-wm-blue/10 border-wm-blue/50";

                  return (
                    <button key={i} onClick={() => pick(i)} disabled={answered}
                      className={clsx("w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                        cls, answered ? "cursor-default" : "hover:border-wm-blue/40")}>
                      <span className={clsx("shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black",
                        answered && isOk ? "bg-wm-green border-wm-green text-wm-black"
                        : answered && isSel && !isOk ? "bg-wm-red border-wm-red text-white"
                        : "border-wm-border/60 text-wm-text-dim")}>
                        {answered && isOk ? <CheckCircle size={12}/> : answered && isSel && !isOk ? <XCircle size={12}/> : String.fromCharCode(65+i)}
                      </span>
                      <span className="text-xs leading-relaxed text-wm-text">{ch}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {answered && (
                  <motion.div initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }}
                    className={clsx("rounded-xl p-3.5 mb-4 border text-xs leading-relaxed",
                      sel===q.correct ? "bg-wm-green/8 border-wm-green/25" : "bg-wm-red/8 border-wm-red/25")}>
                    <div className={clsx("font-bold mb-1", sel===q.correct?"text-wm-green":"text-wm-red")}>
                      {sel===q.correct ? "✅ Correct!" : "❌ Incorrect"}
                    </div>
                    <div className="text-wm-text">{q.explain}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 text-[10px] text-wm-text-dim">
                <span className="text-wm-green font-bold">{score} correct</span>·
                <span className="text-wm-red font-bold">{log.filter(r=>!r).length} wrong</span>·
                <span>{qs.length-cur-(answered?1:0)} remaining</span>
              </div>

              {answered && (
                <button onClick={next}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-wm-black hover:opacity-90 transition-all"
                  style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                  {cur+1>=qs.length ? "See Results" : "Next Question →"}
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                style={{ background:pct>=70?"rgba(0,212,170,0.15)":"rgba(255,77,106,0.15)",
                         border:`3px solid ${pct>=70?"#00D4AA":"#FF4D6A"}` }}>
                <span className="text-2xl font-black" style={{ color:pct>=70?"#00D4AA":"#FF4D6A" }}>{pct}%</span>
              </div>
              <div className="text-lg font-black text-wm-text mb-1">
                {pct>=90?"🏆 Outstanding!":pct>=70?"✅ Quiz Passed!":"📚 Keep Studying"}
              </div>
              <div className="text-xs text-wm-text-muted mb-6">
                {score}/{qs.length} correct · {pct>=70?"You passed!":"Score 70%+ to pass."}
              </div>
              <div className="flex gap-1.5 mb-6 flex-wrap justify-center">
                {log.map((r,i) => (
                  <div key={i} className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    r?"bg-wm-green/20 text-wm-green border border-wm-green/40":"bg-wm-red/20 text-wm-red border border-wm-red/40")}>
                    {i+1}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={retake}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-wm-border bg-wm-surface text-wm-text hover:bg-wm-surface/80 transition-all">
                  <RotateCcw size={13}/> Retake Quiz
                </button>
                <button onClick={() => onClose(pct >= 70)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-wm-black hover:opacity-90 transition-all"
                  style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                  {pct >= 70 ? "✓ Complete Lesson" : "Done"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Video player ────────────────────────────────────────── */
function VideoPlayer({ lesson, color, onClose, onComplete }: { lesson: Lesson; color: string; onClose: () => void; onComplete?: (id: string) => void }) {
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-wm-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Play size={12} style={{ color }}/>
          <span className="text-xs font-bold text-wm-text truncate">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowQuiz(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-wm-gold/15 text-wm-gold border border-wm-gold/30 hover:bg-wm-gold/25 transition-all">
            <HelpCircle size={10}/> Take Quiz
          </button>
          <button onClick={() => onClose()}><X size={13} className="text-wm-text-muted hover:text-wm-text"/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
        {/* Video — coming soon */}
        <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden"
          style={{ aspectRatio:"16/9", background:`${color}08`, border:`1px solid ${color}25` }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <svg width={200} height={36}>
              {Array.from({ length:40 }, (_,i) => {
                const h = 5 + Math.sin(i*0.7)*12 + (i%3)*3;
                return <rect key={i} x={i*5} y={(36-h)/2} width={3} height={h} fill={color} rx={1.5} opacity={0.35}/>;
              })}
            </svg>
            <div className="w-14 h-14 rounded-full flex items-center justify-center opacity-40"
              style={{ background:color }}>
              <Play size={22} className="text-wm-black ml-1"/>
            </div>
            <div className="text-center px-4">
              <div className="text-sm font-bold text-wm-text">{lesson.title}</div>
              <div className="text-xs text-wm-text-muted mt-1 flex items-center justify-center gap-2">
                <Clock size={10}/>{lesson.duration}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                style={{ background:`${color}18`, color, border:`1px solid ${color}35` }}>
                🎬 Video lesson coming soon
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Quiz CTA */}
        <div className="px-4 py-4 space-y-4">
          <div className="p-3 rounded-xl border border-wm-border bg-wm-surface/20">
            <div className="text-[10px] font-black text-wm-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileText size={10}/> Your Notes
            </div>
            <LessonNotes lessonId={lesson.id}/>
          </div>

          <div className="p-4 rounded-xl border bg-wm-gold/5 border-wm-gold/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-wm-gold/15 flex items-center justify-center shrink-0">
                <Trophy size={15} className="text-wm-gold"/>
              </div>
              <div>
                <div className="text-xs font-bold text-wm-text mb-0.5">Test Your Knowledge</div>
                <div className="text-[10px] text-wm-text-muted mb-2">
                  10 MCQ questions · Different questions every retake · Pass at 70%+
                </div>
                <button onClick={() => setShowQuiz(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-wm-gold/15 text-wm-gold border border-wm-gold/30 hover:bg-wm-gold/25 transition-all">
                  <HelpCircle size={11}/> Start Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQuiz && <QuizPanel lesson={lesson} onClose={(passed) => { setShowQuiz(false); if (passed) onComplete?.(lesson.id); }}/>}
      </AnimatePresence>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
const EDU_KEY = "wm_edu_progress";

export default function EducationPage() {
  const [mods, setMods] = useState<Module[]>(() => {
    if (typeof window === "undefined") return MODULES;
    try {
      const saved = JSON.parse(localStorage.getItem(EDU_KEY) ?? "null");
      if (!saved) return MODULES;
      // Merge saved completion state into MODULES (preserves content, restores progress)
      return MODULES.map(m => ({
        ...m,
        completed: saved[m.id]?.completed ?? m.completed,
        lessons: m.lessons.map(l => ({
          ...l,
          completed: saved[m.id]?.lessons?.[l.id] ?? l.completed,
        })),
      }));
    } catch { return MODULES; }
  });
  const [expandedId,   setExpandedId]   = useState<number | null>(1);
  const [activeLesson, setActiveLesson] = useState<{ lesson: Lesson; color: string } | null>(null);

  // Persist progress to localStorage whenever mods changes
  useEffect(() => {
    const toSave: Record<number, { completed: boolean; lessons: Record<string, boolean> }> = {};
    mods.forEach(m => {
      toSave[m.id] = {
        completed: m.completed,
        lessons: Object.fromEntries(m.lessons.map(l => [l.id, l.completed])),
      };
    });
    localStorage.setItem(EDU_KEY, JSON.stringify(toSave));
  }, [mods]);

  // Mark lesson as complete (called after quiz passed)
  const markLessonComplete = (lessonId: string) => {
    setMods(prev => prev.map(m => {
      const newLessons = m.lessons.map(l => l.id === lessonId ? { ...l, completed: true } : l);
      const allDone    = newLessons.every(l => l.completed);
      return { ...m, lessons: newLessons, completed: allDone };
    }));
  };

  const total     = mods.flatMap(m => m.lessons).length;
  const completed = mods.flatMap(m => m.lessons).filter(l => l.completed).length;
  const pct       = Math.round((completed / total) * 100);

  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%",overflow:"hidden" }}
         className="bg-wm-black">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ height:44 }}>
        <GraduationCap size={15} className="text-wm-gold shrink-0"/>
        <div>
          <h1 className="text-sm font-bold text-wm-text">Education</h1>
          <p className="text-[9px] text-wm-gold italic" style={{ letterSpacing:"0.02em" }}>
            Wealthy Mindsets: Change the way you think and you&apos;ll change the way you live
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-28 h-1.5 rounded-full bg-wm-surface">
            <div className="h-full rounded-full bg-gradient-to-r from-wm-green to-wm-blue transition-all"
              style={{ width:`${pct}%` }}/>
          </div>
          <span className="text-[10px] text-wm-text-muted font-mono">{completed}/{total} · {pct}%</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-wm-text-muted">
          <Star size={11} className="text-wm-gold"/>
          {mods.filter(m=>m.completed).length}/{mods.length} modules complete
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1,display:"flex",overflow:"hidden",minHeight:0 }}>

        {/* Module list */}
        <div className="w-80 border-r border-wm-border flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
            {mods.map(mod => {
              const isExp = expandedId === mod.id;
              const done  = mod.lessons.filter(l=>l.completed).length;
              return (
                <div key={mod.id} className="border-b border-wm-border/40">
                  <button
                    onClick={() => !mod.locked && setExpandedId(isExp ? null : mod.id)}
                    className={clsx("w-full flex items-center gap-2 px-3 py-3 transition-colors text-left",
                      mod.locked ? "opacity-50 cursor-not-allowed" : "hover:bg-wm-surface/40")}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:mod.color }}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-wm-text leading-snug">{mod.title}</span>
                        {mod.locked && <Lock size={10} className="text-wm-text-dim shrink-0"/>}
                        {mod.completed && <CheckCircle2 size={10} className="text-wm-green shrink-0"/>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold px-1 rounded"
                          style={{ background:`${LEVEL_COLOR[mod.level]}20`, color:LEVEL_COLOR[mod.level] }}>
                          {mod.level}
                        </span>
                        <span className="text-[9px] text-wm-text-dim">{mod.duration}</span>
                        <span className="text-[9px] text-wm-text-dim">{done}/{mod.lessons.length}</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-wm-surface w-full">
                        <div className="h-full rounded-full transition-all"
                          style={{ width:`${(done/mod.lessons.length)*100}%`, background:mod.color }}/>
                      </div>
                    </div>
                    {!mod.locked && (isExp
                      ? <ChevronUp size={12} className="text-wm-text-muted shrink-0"/>
                      : <ChevronRight size={12} className="text-wm-text-muted shrink-0"/>)}
                  </button>

                  <AnimatePresence>
                    {isExp && !mod.locked && (
                      <motion.div initial={{ height:0,opacity:0 }} animate={{ height:"auto",opacity:1 }} exit={{ height:0,opacity:0 }} className="overflow-hidden">
                        {mod.lessons.map((lesson, li) => {
                          const isActive = activeLesson?.lesson.id === lesson.id;
                          return (
                            <div key={lesson.id}
                              onClick={() => setActiveLesson({ lesson, color:mod.color })}
                              className={clsx("flex items-start gap-2 pl-6 pr-3 py-2 cursor-pointer transition-colors border-t border-wm-border/20",
                                isActive ? "bg-wm-surface" : "hover:bg-wm-surface/30")}>
                              {lesson.completed
                                ? <CheckCircle2 size={12} className="text-wm-green mt-0.5 shrink-0"/>
                                : <div className="w-3 h-3 rounded-full border border-wm-border mt-0.5 shrink-0"
                                    style={{ borderColor:isActive?mod.color:undefined }}/>}
                              <div className="flex-1 min-w-0">
                                <div className={clsx("text-[11px] leading-snug",
                                  isActive ? "font-bold text-wm-text" : "text-wm-text-muted")}>
                                  {li+1}. {lesson.title}
                                </div>
                                <div className="text-[9px] text-wm-text-dim mt-0.5 flex items-center gap-1">
                                  <Clock size={8}/>{lesson.duration}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {activeLesson ? (
            <VideoPlayer lesson={activeLesson.lesson} color={activeLesson.color} onClose={() => setActiveLesson(null)} onComplete={markLessonComplete}/>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-wm-text-muted">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label:"Lessons Done", value:completed, color:"#00D4AA", icon:<CheckCircle2 size={18}/> },
                  { label:"Modules",      value:`${mods.filter(m=>!m.locked&&!m.completed).length} active`, color:"#4FA3E0", icon:<BookOpen size={18}/> },
                  { label:"Total Time",   value:"40h+", color:"#F0B429", icon:<Clock size={18}/> },
                ].map(({label,value,color,icon})=>(
                  <div key={label} className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-wm-border bg-wm-surface/30 min-w-[120px]">
                    <div style={{ color }}>{icon}</div>
                    <div className="text-xl font-black" style={{ color }}>{value}</div>
                    <div className="text-[10px] text-wm-text-muted text-center">{label}</div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm mb-1">Select a lesson to begin</div>
                <div className="text-xs">Notes auto-save · 10-question quiz per lesson · Retake with different questions</div>
              </div>
              {/* Progress ring */}
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1f2e" strokeWidth="2.5"/>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00D4AA" strokeWidth="2.5"
                    strokeDasharray={`${pct} ${100-pct}`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-wm-text">{pct}%</span>
                  <span className="text-[9px] text-wm-text-dim">Done</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
