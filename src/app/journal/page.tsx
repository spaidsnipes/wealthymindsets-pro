"use client";

/**
 * Personal Trade Journal — Enhanced
 * • Real MediaRecorder voice memos (waveform playback)
 * • Screenshot / image upload with FileReader preview
 * • Emoji picker panel (40 trading emojis)
 * • Inline image thumbnails on entries
 * • Full entry detail with attachments viewer
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWMS } from "@/contexts/WMSContext";
import {
  Plus, Search, Tag, Calendar, Download, Mic, MicOff,
  TrendingUp, TrendingDown, Image as ImageIcon, Trash2,
  FileText, X, Star, BarChart2, Smile, Play, Pause,
  StopCircle, Paperclip, CheckCircle, Camera, Video,
  Brain, AlertTriangle, ChevronUp, ChevronDown, RefreshCw, Zap,
  Music, Sparkles, Copy, Trash2 as Trash2Icon, Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

/* ── Emoji palette ───────────────────────────────────────── */
const EMOJIS = [
  "🔥","💎","🚀","📈","📉","💰","🎯","⚡","💪","🧘",
  "😤","😰","😐","🤑","🏆","⚠️","✅","❌","💡","🔑",
  "📊","🕯️","⚖️","🩸","🐂","🐻","🌊","🌙","☀️","🎲",
  "💸","🔮","🏹","🧊","🦅","🐆","🎰","🔴","🟢","⭐",
];

/* ── Types ───────────────────────────────────────────────── */
type Mood = "confident" | "anxious" | "neutral" | "fomo" | "disciplined";
type TradeResult = "win" | "loss" | "be";

interface VoiceMemo {
  blob: Blob;
  url:  string;
  sec:  number;
}

interface JournalEntry {
  id:        string;
  date:      string;
  symbol:    string;
  side:      "long" | "short";
  entry:     number;
  exit:      number;
  size:      number;
  pnl:       number;
  pct:       number;
  tags:      string[];
  notes:     string;
  mood:      Mood;
  result:    TradeResult;
  starred:   boolean;
  images:    string[];   // base64 data URLs
  voiceSec:  number;     // 0 = no memo
  setup:     string;
  mistakes:  string;
  lessons:   string;
  emojis:    string[];
}

/* ── Seed data ───────────────────────────────────────────── */
const SEED: JournalEntry[] = [
  {
    id: "1", date: "2025-06-14", symbol: "NQ1!", side: "long",
    entry: 21_820, exit: 21_894, size: 2, pnl: 2960, pct: 0.34,
    tags: ["CLC","VWAP reclaim","morning session"],
    notes: "Waited for VWAP reclaim after gap up. Clean absorption at 21,820. Aggressive buy prints — did NOT wait for candle close per CLC Rule. Held through 1st target, exited at PDH.",
    mood: "confident", result: "win", starred: true, images: [], voiceSec: 47,
    setup: "CLC Long — VWAP Reclaim",
    mistakes: "None — followed the plan exactly.",
    lessons: "Patience at key levels pays. Aggressive tape entry gave +12 ticks better than candle close.",
    emojis: ["🔥","✅","🎯"],
  },
  {
    id: "2", date: "2025-06-14", symbol: "TSLA", side: "long",
    entry: 415.20, exit: 409.80, size: 100, pnl: -540, pct: -1.30,
    tags: ["chased","FOMO","overextended"],
    notes: "Chased the breakout above $415 after it already ran 3 points. No absorption signal, just FOMO. Stopped out at HOD break.",
    mood: "fomo", result: "loss", starred: false, images: [], voiceSec: 0,
    setup: "Momentum breakout (no confirmation)",
    mistakes: "Entered without order flow confirmation. Violated rule #1: wait for passive buyers.",
    lessons: "Never chase. If you missed the move, the next setup is coming.",
    emojis: ["😤","❌"],
  },
  {
    id: "3", date: "2025-06-13", symbol: "ES1!", side: "short",
    entry: 5_896.50, exit: 5_881.00, size: 1, pnl: 775, pct: 0.26,
    tags: ["Wyckoff distribution","supply rejection","EOD"],
    notes: "Wyckoff distribution Phase C UTAD confirmed. Supply zone 5,897–5,900. Entered on trapped buyers signal. Covered at 5,881 (prior support).",
    mood: "disciplined", result: "win", starred: true, images: [], voiceSec: 92,
    setup: "Wyckoff Phase C — Supply Rejection",
    mistakes: "Covered early — left 10 handles on table.",
    lessons: "When Wyckoff pattern is clear, hold for full measured move.",
    emojis: ["💎","📉","🏆"],
  },
];

const ALL_TAGS = ["CLC","VWAP reclaim","Wyckoff","dark pool","CVD","absorption","chased","FOMO","breakeven","morning session","supply rejection","EOD","momentum"];
const SETUPS   = ["CLC Long","CLC Short","VWAP Reclaim","Wyckoff","Dark Pool","CVD Divergence","Absorption","Stop Run","Imbalance","Momentum","Breakout","Reversal"];
const MOODS: { val: Mood; emoji: string; label: string }[] = [
  { val: "confident",   emoji: "🔥", label: "Confident"  },
  { val: "disciplined", emoji: "🧘", label: "Disciplined" },
  { val: "neutral",     emoji: "😐", label: "Neutral"     },
  { val: "anxious",     emoji: "😰", label: "Anxious"     },
  { val: "fomo",        emoji: "😤", label: "FOMO"        },
];

function fmtPnl(n: number) {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}
function uid() { return Math.random().toString(36).slice(2); }
function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/* ── Waveform bars (visual only) ──────────────────────────── */
function WaveformBars({ n = 20, color = "#00D4AA" }: { n?: number; color?: string }) {
  const bars = Array.from({ length: n }, (_, i) => 10 + Math.sin(i * 0.8) * 8 + Math.random() * 6);
  return (
    <svg width={n * 4} height={24} className="shrink-0">
      {bars.map((h, i) => (
        <rect key={i} x={i * 4} y={(24 - h) / 2} width={2.5} height={h} fill={color} rx={1} opacity={0.7} />
      ))}
    </svg>
  );
}

/* ── VoiceRecorder hook ──────────────────────────────────── */
function useVoiceRecorder() {
  const [state,    setState]    = useState<"idle"|"recording"|"done">("idle");
  const [sec,      setSec]      = useState(0);
  const [memo,     setMemo]     = useState<VoiceMemo | null>(null);
  const [playing,  setPlaying]  = useState(false);
  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url  = URL.createObjectURL(blob);
        setMemo({ blob, url, sec });
        setState("done");
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setState("recording");
      setSec(0);
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    } catch {
      // Mic denied — fall back to mock
      setState("recording");
      setSec(0);
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    }
  }, [sec]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    } else {
      // mock path
      setMemo({ blob: new Blob(), url: "", sec });
      setState("done");
    }
  }, [sec]);

  const togglePlay = useCallback(() => {
    if (!memo?.url) return;
    if (!audioRef.current) audioRef.current = new Audio(memo.url);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  }, [memo, playing]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (memo?.url) URL.revokeObjectURL(memo.url);
    setState("idle"); setSec(0); setMemo(null); setPlaying(false);
  }, [memo]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { state, sec, memo, playing, start, stop, togglePlay, reset };
}

/* ── EmojiPicker ─────────────────────────────────────────── */
function EmojiPicker({ onPick, onClose }: { onPick(e: string): void; onClose(): void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      className="absolute bottom-full mb-2 left-0 z-50 rounded-xl border border-wm-border bg-wm-dark shadow-2xl p-3"
      style={{ width: 240 }}
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map(e => (
          <button key={e}
            onClick={() => { onPick(e); onClose(); }}
            className="text-lg hover:bg-wm-surface rounded-lg p-0.5 transition-colors"
          >{e}</button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── ImageUpload ─────────────────────────────────────────── */
function ImageUpload({ images, onChange }: { images: string[]; onChange(imgs: string[]): void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const url = ev.target?.result as string;
        onChange([...images, url]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFile} />
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((src, i) => (
          <div key={i} className="relative group">
            <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-wm-border" />
            <button
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-wm-red text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >✕</button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-wm-border hover:border-wm-blue/50 text-wm-text-dim hover:text-wm-blue flex flex-col items-center justify-center gap-1 transition-all"
        >
          <Camera size={14} />
          <span className="text-[9px]">Add</span>
        </button>
      </div>
    </div>
  );
}

/* ── VoiceMemoRow ────────────────────────────────────────── */
function VoiceMemoRow({ recorder }: { recorder: ReturnType<typeof useVoiceRecorder> }) {
  const { state, sec, memo, playing, start, stop, togglePlay, reset } = recorder;

  return (
    <div className="flex items-center gap-2">
      {state === "idle" && (
        <button
          onClick={start}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-wm-border bg-wm-surface text-wm-text-muted hover:text-wm-purple hover:border-wm-purple/40 transition-all"
        >
          <Mic size={13} className="text-wm-purple" /> + Voice Memo
        </button>
      )}

      {state === "recording" && (
        <button
          onClick={stop}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-wm-red/40 bg-wm-red/10 text-wm-red animate-pulse"
        >
          <StopCircle size={13} /> Recording {fmtSec(sec)} — tap to stop
        </button>
      )}

      {state === "done" && memo && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-wm-purple/30 bg-wm-purple/5">
          <button onClick={togglePlay} className="text-wm-purple hover:opacity-80">
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <WaveformBars n={18} color="#8B5CF6" />
          <span className="text-[10px] text-wm-text-dim font-mono">{fmtSec(memo.sec || sec)}</span>
          <button onClick={reset} className="text-wm-text-dim hover:text-wm-red ml-1">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── NotesEditor ──────────────────────────────────────────── */
function NotesEditor({
  value, onChange, placeholder, label,
}: {
  value: string; onChange(v: string): void;
  placeholder: string; label: string;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertEmoji = (e: string) => {
    const ta = taRef.current;
    if (!ta) { onChange(value + e); return; }
    const s = ta.selectionStart, end = ta.selectionEnd;
    const next = value.slice(0, s) + e + value.slice(end);
    onChange(next);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + e.length; ta.focus(); }, 0);
  };

  return (
    <div className="mb-3">
      <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">{label}</label>
      <div className="relative">
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 pt-2 pb-8 text-xs text-wm-text outline-none focus:border-wm-green/50 resize-none placeholder-wm-text-dim leading-relaxed"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              className="p-1 rounded hover:bg-wm-surface text-wm-text-dim hover:text-wm-gold transition-colors"
            >
              <Smile size={13} />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
              )}
            </AnimatePresence>
          </div>
          <span className="text-[9px] text-wm-text-dim">{value.length} chars</span>
        </div>
      </div>
    </div>
  );
}

/* ── AI Strategy Coach ───────────────────────────────────── */
function StrategyCoach({ entries }: { entries: JournalEntry[] }) {
  const wins   = entries.filter(e => e.result === "win");
  const losses = entries.filter(e => e.result === "loss");
  const wr     = entries.length ? (wins.length / entries.length) * 100 : 0;
  const totalPnl = entries.reduce((s, e) => s + e.pnl, 0);
  const avgWin   = wins.length   ? wins.reduce((s, e) => s + e.pnl, 0) / wins.length : 0;
  const avgLoss  = losses.length ? Math.abs(losses.reduce((s, e) => s + e.pnl, 0) / losses.length) : 0;
  const rr       = avgLoss > 0 ? avgWin / avgLoss : 0;
  const pf       = losses.length && avgLoss ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

  // Per-setup breakdown
  const setupMap: Record<string, { wins: number; losses: number; pnl: number }> = {};
  entries.forEach(e => {
    if (!setupMap[e.setup]) setupMap[e.setup] = { wins: 0, losses: 0, pnl: 0 };
    if (e.result === "win") setupMap[e.setup].wins++;
    else if (e.result === "loss") setupMap[e.setup].losses++;
    setupMap[e.setup].pnl += e.pnl;
  });

  // Per-mood breakdown
  const moodLoss: Record<string, number> = {};
  losses.forEach(e => { moodLoss[e.mood] = (moodLoss[e.mood] || 0) + 1; });
  const worstMood = Object.entries(moodLoss).sort((a,b) => b[1]-a[1])[0];

  // AI insights
  const alerts: { type:"error"|"warning"|"success"; title: string; body: string }[] = [];

  if (wr < 40) alerts.push({
    type: "error",
    title: "🚨 Win rate critically low",
    body: `Your win rate is ${wr.toFixed(0)}% — below the 40% minimum for most strategies. Stop trading this setup until you review your rules. Common fixes: wait for full confirmation before entry, widen your stops, reduce position size.`,
  });
  else if (wr < 50) alerts.push({
    type: "warning",
    title: "⚠️ Win rate below 50%",
    body: `At ${wr.toFixed(0)}% win rate, you need a Reward:Risk ratio above ${(1 / (wr/100) - 1).toFixed(1)}:1 to be profitable. Your current R:R is ${rr.toFixed(1)}:1. ${rr >= (1/(wr/100)-1) ? "You're profitable — maintain discipline." : "You're losing money long-term. Increase R:R or wait for better setups."}`,
  });
  else alerts.push({
    type: "success",
    title: "✅ Win rate healthy",
    body: `${wr.toFixed(0)}% win rate with ${rr.toFixed(1)}:1 R:R = Profit Factor ${pf.toFixed(2)}. ${pf >= 1.5 ? "Excellent edge — scale up slowly." : "Profitable but borderline — focus on improving exit timing."}`,
  });

  if (worstMood && worstMood[1] >= 1) alerts.push({
    type: "warning",
    title: `😤 "${worstMood[0].charAt(0).toUpperCase() + worstMood[0].slice(1)}" mood causes most losses`,
    body: `${worstMood[1]} of your losses occurred when you were feeling ${worstMood[0]}. Consider this a hard rule: if you feel ${worstMood[0]}, reduce size by 50% or sit on hands.`,
  });

  const fomoTrades = entries.filter(e => e.tags.includes("FOMO") || e.tags.includes("chased"));
  if (fomoTrades.length > 0) {
    const fomoWR = fomoTrades.filter(e => e.result === "win").length / fomoTrades.length * 100;
    alerts.push({
      type: fomoWR < 40 ? "error" : "warning",
      title: "📈 FOMO/Chased entries detected",
      body: `${fomoTrades.length} trades tagged FOMO/chased with ${fomoWR.toFixed(0)}% win rate vs your overall ${wr.toFixed(0)}%. ${fomoWR < wr - 10 ? "These trades are dragging your results. Eliminate them." : "Minor impact — stay aware."}`,
    });
  }

  // Best and worst setups
  const sortedSetups = Object.entries(setupMap)
    .map(([name, data]) => ({
      name,
      wr: data.wins + data.losses > 0 ? data.wins / (data.wins + data.losses) * 100 : 0,
      ...data,
    }))
    .sort((a,b) => b.pnl - a.pnl);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Brain size={16} className="text-wm-purple" />
        <span className="text-sm font-black text-wm-text">AI Strategy Coach</span>
        <span className="text-[10px] text-wm-text-dim">Based on {entries.length} journaled trades</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { l:"Win Rate",   v:`${wr.toFixed(0)}%`,         good: wr >= 50 },
          { l:"Avg R:R",    v:`${rr.toFixed(1)}:1`,         good: rr >= 1.5 },
          { l:"Profit Fac.",v:`${pf.toFixed(2)}`,           good: pf >= 1.5 },
          { l:"Total P&L",  v:`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString("en-US",{maximumFractionDigits:0})}`, good: totalPnl >= 0 },
        ].map(m => (
          <div key={m.l} className="glass rounded-xl p-3 text-center">
            <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{m.l}</div>
            <div className={clsx("text-base font-black mt-1", m.good ? "text-wm-green" : "text-wm-red")}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* AI Alerts */}
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className={clsx(
            "rounded-xl p-3 border",
            a.type === "error"   ? "bg-wm-red/8 border-wm-red/30"
            : a.type === "warning" ? "bg-wm-gold/8 border-wm-gold/30"
            : "bg-wm-green/8 border-wm-green/30"
          )}>
            <div className={clsx("text-xs font-bold mb-1",
              a.type === "error" ? "text-wm-red" : a.type === "warning" ? "text-wm-gold" : "text-wm-green")}>
              {a.title}
            </div>
            <div className="text-[11px] text-wm-text-dim leading-relaxed">{a.body}</div>
          </div>
        ))}
      </div>

      {/* Setup performance */}
      {sortedSetups.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-wm-border">
            <span className="text-xs font-bold text-wm-text">Setup Performance</span>
          </div>
          <div className="divide-y divide-wm-border/30">
            {sortedSetups.map(s => (
              <div key={s.name} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-wm-text truncate">{s.name}</div>
                  <div className="text-[10px] text-wm-text-dim">{s.wins}W / {s.losses}L</div>
                </div>
                <div className="text-xs font-mono font-bold text-wm-text-muted">{s.wr.toFixed(0)}% WR</div>
                <div className={clsx("text-xs font-mono font-bold", s.pnl >= 0 ? "text-wm-green" : "text-wm-red")}>
                  {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}
                </div>
                {/* Mini win-rate bar */}
                <div className="w-16 h-1.5 bg-wm-surface rounded-full overflow-hidden">
                  <div className="h-full bg-wm-green rounded-full" style={{ width:`${s.wr}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Psychological tips */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={12} className="text-wm-gold" />
          <span className="text-xs font-bold text-wm-gold">Mindset Recommendations</span>
        </div>
        {[
          wr < 45 ? "🛑 Paper trade until you hit 50%+ win rate on 20+ trades before risking real capital."
                  : "✅ Win rate qualifies for real trading — maintain your rules strictly.",
          rr < 1  ? "⚖️ Your average loss exceeds your average win. Move your stops wider OR take profits earlier."
                  : `📐 R:R of ${rr.toFixed(1)}:1 is ${rr >= 2 ? "excellent" : "acceptable"} — ${rr >= 2 ? "don't lower your targets" : "try to push to 2:1"}.`,
          fomoTrades.length > 0 ? "🧘 Add a 3-minute pause rule: if you feel the urge to chase, set a timer. If the setup is still valid after 3 min, take it."
                                : "👌 No FOMO entries detected — great discipline.",
        ].map((tip, i) => (
          <div key={i} className="flex gap-2 mb-2 last:mb-0">
            <span className="text-xs text-wm-text-dim leading-relaxed">{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
const JOURNAL_KEY = "wm_journal_entries";

export default function JournalPage() {
  const { earnWMS } = useWMS();
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === "undefined") return SEED;
    try {
      const saved = JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? "null");
      return Array.isArray(saved) && saved.length > 0 ? saved : SEED;
    } catch { return SEED; }
  });
  // Persist journal to localStorage whenever entries changes
  useEffect(() => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  }, [entries]);

  const [selected,  setSelected]  = useState<JournalEntry | null>(null);
  const [newMode,   setNewMode]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterRes, setFilterRes] = useState<"all"|TradeResult>("all");
  const [lightbox,  setLightbox]  = useState<string | null>(null);
  const [mainTab,   setMainTab]   = useState<"journal"|"coach"|"songs">("journal");

  // AI Strategy Songs state
  const [songPrompt,   setSongPrompt]   = useState("");
  const [songStyle,    setSongStyle]    = useState<"hip-hop"|"r&b"|"trap"|"pop"|"motivational"|"drill">("hip-hop");
  const [songTopic,    setSongTopic]    = useState("smart money");
  const [songGenerating, setSongGenerating] = useState(false);
  const [songs,        setSongs]        = useState<{id:string; title:string; lyrics:string; style:string; topic:string; ts:number}[]>(() => {
    try { return JSON.parse(localStorage.getItem("wm_songs") ?? "[]"); } catch { return []; }
  });
  const [activeSong,   setActiveSong]   = useState<string|null>(null);

  // New-entry form
  const emptyForm = (): Partial<JournalEntry> => ({
    date: new Date().toISOString().slice(0, 10),
    symbol: "NQ1!", side: "long", entry: 0, exit: 0, size: 1,
    pnl: 0, pct: 0, tags: [], notes: "", mood: "neutral",
    result: "win", starred: false, images: [], voiceSec: 0,
    setup: "CLC Long", mistakes: "", lessons: "", emojis: [],
  });
  const [form, setForm]   = useState<Partial<JournalEntry>>(emptyForm());
  const voiceRec          = useVoiceRecorder();

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return (
      (!q || e.symbol.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q) || e.setup.toLowerCase().includes(q)) &&
      (!filterTag || e.tags.includes(filterTag)) &&
      (filterRes === "all" || e.result === filterRes)
    );
  });

  const wins     = entries.filter(e => e.result === "win").length;
  const losses   = entries.filter(e => e.result === "loss").length;
  const totalPnl = entries.reduce((s, e) => s + e.pnl, 0);
  const winRate  = entries.length ? ((wins / entries.length) * 100).toFixed(0) : "0";

  const saveEntry = () => {
    const e = { ...(form as JournalEntry) };
    e.id       = uid();
    e.pnl      = (e.exit - e.entry) * e.size * (e.side === "short" ? -1 : 1);
    e.pct      = e.entry > 0 ? ((e.exit - e.entry) / e.entry * 100) : 0;
    e.result   = e.pnl > 50 ? "win" : e.pnl < -50 ? "loss" : "be";
    e.voiceSec = voiceRec.memo?.sec ?? (voiceRec.state === "done" ? voiceRec.sec : 0);
    setEntries(prev => [e, ...prev]);
    setNewMode(false);
    setForm(emptyForm());
    voiceRec.reset();
    // Reward WM$ for journaling
    earnWMS(50, e.result === "win" ? "📗 Journaled a winning trade" : "📕 Journaled a trade");
  };

  // ── AI Song Generator ────────────────────────────────────
  const SONG_TEMPLATES: Record<string, (topic: string, custom: string) => string> = {
    "hip-hop": (topic, custom) => `🎤 **[AI Strategy Song — Hip-Hop]**
**"${topic.toUpperCase()} FLOW"**

[Intro]
WealthyMindsets Pro, we on a different level
Smart money moving, retail can never settle

[Verse 1]
${custom || `Watching the ${topic}, I study every move
Institutional footprints, I follow in the groove
Order blocks stacked up, fair value gaps aligned
Liquidity above the high, that's where they'll find
The real direction, stop running with the herd
Smart money left a breadcrumb, I read between the words`}

[Chorus]
WM$ rising, we trading with the best 🏆
${topic} mastered, putting greed to rest
Green candles only, discipline is key
Paper to live account — watch what I'll be

[Verse 2]
Journal every trade, review the replay
Win or lose I'm studying what the chart say
Risk one to make three, that's the only way
Compound the account, we eating every day 💰

[Bridge]
They chasing pumps and dumps, I'm reading tape
Smart money don't sleep, they set the escape
When retail FOMO in, I'm already out
That's the WealthyMindsets Pro way, no doubt

[Outro]
WM$ token, creator coins too
The flywheel spinning — that's the vision coming true 🚀`,

    "r&b": (topic, custom) => `🎵 **[AI Strategy Song — R&B]**
**"${topic} (Smooth Money)"**

[Verse 1]
${custom || `Baby I been watching how you move
${topic} got me in a different groove
Every level I've been patient, waiting for the right
Smart money confirmation before I take the flight`}

[Pre-Chorus]
I don't chase, I wait for price to come to me
That's the discipline, that's what sets me free

[Chorus]
Smooth money, smart money 💎
Trading with the tide and not against it, honey
WM$ in my pocket growing every day
${topic} is the game and I know how to play

[Bridge]
They said the market's random but I see the pattern
Wyckoff told the truth even when it mattered
Accumulation phase — I'm buying in the range
Distribution coming — I know when to arrange my exit

[Outro]
Wealthy mindset, wealthy lifestyle
Growing slow and steady, running my own mile 🌟`,

    "trap": (topic, custom) => `🔊 **[AI Strategy Song — Trap]**
**"${topic.toUpperCase()} SZNS"**

[Intro - Ad libs]
Slatt, WM$, aye, yeah

[Verse 1]
${custom || `Charts on the screen, I see the ${topic}
Trappin' on the exchange, no cap I been goated
Order flow confirmed, hit the bid with precision
No revenge trading, every move a decision
Stop hunt activated, I knew that was coming
While they panic selling I was calm and running`}

[Chorus]
${topic} szns, we up every season 📈
WM$ stacking, no need for a reason
Creator coins pumping, the flywheel spinning
Wealthy Mindsets Pro — we been always winning

[Verse 2]
Journaled every loss so I don't repeat it
Backtested the setup so when live I beat it
Risk management first, that's the only rule
Emotional traders just my liquidity pool 😤

[Outro]
WM$ gang, creator coin lane
Pre-deployment balance, soon it goes on-chain 🔥`,

    "motivational": (topic, custom) => `💪 **[AI Strategy Song — Motivational]**
**"${topic} — The Mindset Anthem"**

[Spoken Intro]
This one's for every trader who's lost a trade and came back stronger.
Every loss is a lesson. Every lesson is a deposit in your mental account.

[Verse 1]
${custom || `Wake up with a purpose, chart open by dawn
${topic} on my mind before the market's on
Reviewed last week's trades, identified the leak
Now I'm sharper, more focused, at my trading peak`}

[Chorus]
This is more than a trade, this is building a life 🌟
Every discipline now is cutting future strife
WealthyMindsets Pro — it's a movement, not a fad
The best trade you'll ever make is in the mind you have

[Verse 2]
The market tests your patience, your rules, and your nerve
Are you trading the system or letting fear swerve?
Position sized correctly, stop loss set and done
Now watch how the discipline compounds into a run

[Bridge]
One percent better, every single day
That's 37 times better in a year — hear what I say
The wealthy mindset isn't just about the money
It's showing up with discipline when the market ain't sunny ☀️

[Outro]
WM$ isn't just a token, it's a way of life
Wealthy Mindsets Pro — sharpening the knife 🔪`,

    "drill": (topic, custom) => `😤 **[AI Strategy Song — Drill]**
**"${topic} Drill"**

[Verse 1]
${custom || `On the chart looking for ${topic}, don't play with my time
Order block respected, now I'm ready to climb
They faded the level, I doubled down right
Smart money confirmation, I was on tonight`}

[Chorus]
${topic} drill, we don't miss the fill
Patience at the level till we get our thrill
WM$ moving, creator coins real
Wealthy Mindsets Pro — this is how we feel

[Verse 2]
Stopped out twice before I learned the game
Now my entries precise, never the same mistake
Risk reward locked, minimum 1 to 2
Anything less and I'm passing through 🎯

[Outro]
Journal the trade, review the tape
WM$ stacking while others escape
On-chain deployment coming real soon
WealthyMindsets Pro taking over the room 🌙`,

    "pop": (topic, custom) => `🎶 **[AI Strategy Song — Pop]**
**"${topic} (Up Only)"**

[Verse 1]
${custom || `Started with a hundred K, paper trading every day
Learning all the ${topic}, finding my own way
Green candles, red candles, I studied them all
Practiced the discipline so I'd never fall`}

[Pre-Chorus]
And now I'm ready, I've put in the time
WM$ growing, about to climb

[Chorus]
Up only in my mindset, up only in my growth 📈
Up only in my discipline, up only in my hope
Wealthy Mindsets Pro — we taking off tonight
${topic} in my heart, I know I've got it right

[Verse 2]
Creator coins launching, the ecosystem's live
Every fee collected helps the token thrive
Flywheel spinning faster as more creators join
WM$ the backbone, the one and only coin 💎

[Outro]
Up only, up only, that's the Wealthy Mindset way
Trade the system, trust the process, winners every day 🚀`,
  };

  const generateSong = async () => {
    setSongGenerating(true);
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));
    const template = SONG_TEMPLATES[songStyle] ?? SONG_TEMPLATES["hip-hop"];
    const lyrics = template(songTopic, songPrompt);
    const title = `${songTopic.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")} — ${songStyle.charAt(0).toUpperCase() + songStyle.slice(1)} Mix`;
    const newSong = { id: Math.random().toString(36).slice(2), title, lyrics, style: songStyle, topic: songTopic, ts: Date.now() };
    setSongs(prev => {
      const next = [newSong, ...prev].slice(0, 20);
      try { localStorage.setItem("wm_songs", JSON.stringify(next)); } catch {}
      return next;
    });
    setActiveSong(newSong.id);
    setSongGenerating(false);
    earnWMS(100, `🎵 Generated "${title}"`);
  };

  const exportCSV = () => {
    const h = "Date,Symbol,Side,Entry,Exit,Size,PnL,Result,Setup,Tags,Notes\n";
    const r = entries.map(e =>
      `${e.date},${e.symbol},${e.side},${e.entry},${e.exit},${e.size},${e.pnl},${e.result},"${e.setup}","${e.tags.join(";")}","${e.notes.replace(/"/g, "'")}"`
    ).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([h + r], { type: "text/csv" })),
      download: "wm-journal.csv",
    });
    a.click();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden" }}
         className="bg-wm-black">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ height:44 }}>
        <FileText size={15} className="text-wm-purple shrink-0" />
        <h1 className="text-sm font-bold text-wm-text">Trade Journal</h1>
        {/* Main tabs */}
        <div className="flex gap-1">
          {([
            { id:"journal" as const, label:"Journal",           icon:FileText },
            { id:"coach"   as const, label:"AI Strategy Coach", icon:Brain   },
            { id:"songs"   as const, label:"AI Songs",          icon:Music   },
          ]).map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                mainTab === t.id
                  ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
                  : "text-wm-text-muted border-transparent hover:border-wm-border hover:text-wm-text"
              )}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-wm-text-dim">{entries.length} entries</span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-wm-green/15 text-wm-green border border-wm-green/30">{winRate}% WR</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${totalPnl >= 0 ? "bg-wm-green/10 text-wm-green border-wm-green/25" : "bg-wm-red/10 text-wm-red border-wm-red/25"}`}>{fmtPnl(totalPnl)}</span>
          <span className="text-[10px] text-wm-text-dim">{wins}W / {losses}L</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1">
            <Search size={11} className="text-wm-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search journal..."
              className="bg-transparent text-xs text-wm-text outline-none w-32 placeholder-wm-text-dim" />
          </div>
          {(["all","win","loss","be"] as const).map(r => (
            <button key={r} onClick={() => setFilterRes(r)}
              className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                filterRes === r
                  ? r === "win" ? "bg-wm-green/20 text-wm-green border-wm-green/40"
                  : r === "loss" ? "bg-wm-red/20 text-wm-red border-wm-red/40"
                  : "bg-wm-surface text-wm-text border-wm-border"
                  : "text-wm-text-muted border-transparent hover:border-wm-border"
              )}>
              {r === "be" ? "BE" : r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <button onClick={exportCSV}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border border-wm-border transition-colors">
            <Download size={11} /> Export
          </button>
          <button onClick={() => { setNewMode(true); setSelected(null); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-wm-black transition-all hover:opacity-90"
            style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
            <Plus size={12} /> New Entry
          </button>
        </div>
      </div>

      {/* ── AI Coach tab ─────────────────────────────────────── */}
      {mainTab === "coach" && (
        <div className="flex-1 overflow-y-auto">
          <StrategyCoach entries={entries} />
        </div>
      )}

      {/* ── AI Songs tab ─────────────────────────────────────── */}
      {mainTab === "songs" && (
        <div className="flex-1 overflow-hidden flex" style={{ minHeight: 0 }}>

          {/* Left: generator */}
          <div className="w-72 border-r border-wm-border flex flex-col shrink-0 overflow-y-auto p-4 gap-3" style={{ scrollbarWidth:"thin" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center">
                <Music size={13} className="text-white"/>
              </div>
              <div>
                <div className="text-xs font-black text-wm-text">AI Strategy Songs</div>
                <div className="text-[9px] text-[#7C3AED] font-bold">+100 WM$ per song generated</div>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1.5 font-bold">Trading Topic</label>
              <div className="grid grid-cols-2 gap-1">
                {["smart money","order flow","wyckoff","NQ futures","risk management","discipline","WM$ token","creator coins"].map(t => (
                  <button key={t} onClick={() => setSongTopic(t)}
                    className={clsx("px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all text-left",
                      songTopic === t
                        ? "bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/40"
                        : "text-wm-text-muted border-wm-border hover:text-wm-text hover:border-[#7C3AED]/30")}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={songTopic} onChange={e => setSongTopic(e.target.value)}
                placeholder="or type your own topic..."
                className="mt-2 w-full bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1.5 text-[10px] text-wm-text outline-none focus:border-[#7C3AED]/50"/>
            </div>

            {/* Style */}
            <div>
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1.5 font-bold">Music Style</label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { id:"hip-hop",      emoji:"🎤", label:"Hip-Hop"    },
                  { id:"r&b",          emoji:"🎵", label:"R&B"        },
                  { id:"trap",         emoji:"🔊", label:"Trap"       },
                  { id:"motivational", emoji:"💪", label:"Motivate"   },
                  { id:"drill",        emoji:"😤", label:"Drill"      },
                  { id:"pop",          emoji:"🎶", label:"Pop"        },
                ] as const).map(s => (
                  <button key={s.id} onClick={() => setSongStyle(s.id as any)}
                    className={clsx("py-2 rounded-lg text-[9px] font-bold border transition-all flex flex-col items-center gap-0.5",
                      songStyle === s.id
                        ? "bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]/40"
                        : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom lines (optional) */}
            <div>
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1.5 font-bold">
                Custom Lines <span className="normal-case font-normal">(optional — weave into the song)</span>
              </label>
              <textarea
                value={songPrompt} onChange={e => setSongPrompt(e.target.value)}
                placeholder="e.g. 'I trade NQ futures, always respect the order block, never chase a breakout...'"
                rows={4}
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-2.5 py-2 text-[10px] text-wm-text outline-none focus:border-[#7C3AED]/50 resize-none"
              />
            </div>

            <button
              onClick={generateSong}
              disabled={songGenerating || !songTopic}
              className={clsx(
                "w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all",
                songGenerating || !songTopic
                  ? "bg-wm-surface text-wm-text-dim border border-wm-border"
                  : "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white hover:opacity-90 active:scale-[0.99]"
              )}
            >
              {songGenerating ? (
                <>
                  <span className="flex gap-1">
                    {[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{animationDelay:`${i*150}ms`}}/>)}
                  </span>
                  Writing your song...
                </>
              ) : (
                <><Sparkles size={13}/> Generate Song (+100 WM$)</>
              )}
            </button>

            {/* Song count */}
            {songs.length > 0 && (
              <div className="text-[9px] text-wm-text-dim text-center">{songs.length} songs in your library</div>
            )}
          </div>

          {/* Right: song library + viewer */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {activeSong ? (() => {
              const song = songs.find(s => s.id === activeSong);
              if (!song) return null;
              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Song header */}
                  <div className="shrink-0 px-5 py-3 border-b border-wm-border bg-gradient-to-r from-[#7C3AED]/10 to-[#EC4899]/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-wm-text flex items-center gap-2">
                        <Headphones size={14} className="text-[#EC4899]"/> {song.title}
                      </div>
                      <div className="text-[9px] text-wm-text-muted mt-0.5">
                        {song.style} · {song.topic} · {new Date(song.ts).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(song.lyrics.replace(/\*\*/g, "").replace(/\[.*?\]/g, s => s)); }}
                        className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-dim hover:text-wm-text transition-colors" title="Copy lyrics">
                        <Copy size={13}/>
                      </button>
                      <button onClick={() => setActiveSong(null)}
                        className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-dim hover:text-wm-text transition-colors">
                        <X size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Lyrics */}
                  <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth:"thin" }}>
                    <div className="max-w-xl mx-auto">
                      {song.lyrics.split("\n").map((line, i) => {
                        const isBold   = line.startsWith("**") && line.endsWith("**");
                        const isHeader = line.startsWith("[") && line.endsWith("]");
                        const isSection = isHeader || isBold;
                        return (
                          <div key={i} className={clsx(
                            "leading-relaxed",
                            isSection  ? "text-[#EC4899] font-black text-xs mt-4 mb-1 tracking-wider uppercase" :
                            line === "" ? "h-2" :
                                         "text-wm-text text-sm"
                          )}>
                            {line.replace(/\*\*/g, "")}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="flex-1 flex flex-col overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
                {songs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-wm-text-muted p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#EC4899]/20 flex items-center justify-center">
                      <Music size={28} className="opacity-40"/>
                    </div>
                    <div className="text-sm font-bold text-wm-text">No songs yet</div>
                    <div className="text-xs text-wm-text-muted max-w-xs">
                      Generate your first AI strategy song. Pick a topic like "smart money" or "order flow" and a style — the AI writes full lyrics inspired by your trading journey.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    <div className="text-[9px] text-wm-text-dim uppercase tracking-wider font-bold px-2 mb-3">Your Song Library</div>
                    {songs.map(song => (
                      <button key={song.id} onClick={() => setActiveSong(song.id)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-wm-border hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/5 transition-all group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center shrink-0">
                          <Music size={14} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-wm-text truncate">{song.title}</div>
                          <div className="text-[9px] text-wm-text-dim">{song.style} · {new Date(song.ts).toLocaleDateString()}</div>
                        </div>
                        <Play size={13} className="text-wm-text-dim group-hover:text-[#7C3AED] transition-colors shrink-0"/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Journal body ─────────────────────────────────────── */}
      {mainTab === "journal" && <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Left: list */}
        <div className="w-80 border-r border-wm-border flex flex-col shrink-0 overflow-hidden">
          <div className="px-2 py-1.5 border-b border-wm-border overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            <div className="flex gap-1 min-w-max">
              <button onClick={() => setFilterTag("")}
                className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                  !filterTag ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40" : "text-wm-text-muted border-transparent hover:border-wm-border")}>
                All
              </button>
              {ALL_TAGS.slice(0, 8).map(t => (
                <button key={t} onClick={() => setFilterTag(t === filterTag ? "" : t)}
                  className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap transition-all",
                    filterTag === t ? "bg-wm-gold/20 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-transparent hover:border-wm-border")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                <FileText size={24} className="opacity-30" />
                <span className="text-xs">No entries found</span>
              </div>
            )}
            {filtered.map(e => {
              const up = e.result === "win";
              return (
                <div key={e.id}
                  onClick={() => { setSelected(e); setNewMode(false); }}
                  className={clsx(
                    "flex items-start gap-2 px-3 py-2.5 border-b border-wm-border/40 cursor-pointer transition-colors hover:bg-wm-surface/50",
                    selected?.id === e.id ? "bg-wm-surface" : ""
                  )}
                >
                  <div className={clsx("w-1 rounded-full shrink-0 mt-1", up ? "bg-wm-green" : e.result === "loss" ? "bg-wm-red" : "bg-wm-text-dim")} style={{ minHeight:40 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-wm-text">{e.symbol}</span>
                      <span className={`text-[10px] font-mono font-bold ${up ? "text-wm-green" : e.result === "loss" ? "text-wm-red" : "text-wm-text-muted"}`}>
                        {fmtPnl(e.pnl)}
                      </span>
                    </div>
                    <div className="text-[10px] text-wm-text-dim truncate">{e.setup}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-wm-text-dim">{e.date}</span>
                      {e.starred && <Star size={9} className="text-wm-gold fill-wm-gold" />}
                      {e.voiceSec > 0 && <Mic size={9} className="text-wm-purple" />}
                      {e.images?.length > 0 && <ImageIcon size={9} className="text-wm-blue" />}
                      {e.emojis?.slice(0, 3).map((em, i) => <span key={i} className="text-[10px]">{em}</span>)}
                      <span className="text-[10px]">{MOODS.find(m => m.val === e.mood)?.emoji}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: detail / new entry */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth:"thin" }}>

          {/* Placeholder */}
          {!selected && !newMode && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-wm-text-muted">
              <BarChart2 size={40} className="opacity-20" />
              <div className="text-center">
                <div className="font-semibold text-sm">Select an entry or create a new one</div>
                <div className="text-xs mt-1">Track every trade — wins and losses both teach</div>
              </div>
              <button onClick={() => setNewMode(true)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-wm-black"
                style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                + Log New Trade
              </button>
            </div>
          )}

          {/* ── Entry detail ───────────────────────────────── */}
          {selected && !newMode && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} key={selected.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-black text-wm-text">{selected.symbol}</span>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold",
                      selected.side === "long" ? "bg-wm-green/20 text-wm-green" : "bg-wm-red/20 text-wm-red")}>
                      {selected.side.toUpperCase()}
                    </span>
                    <span className="text-xs text-wm-text-dim">{selected.date}</span>
                    {selected.emojis?.map((em, i) => <span key={i} className="text-base">{em}</span>)}
                  </div>
                  <div className="text-xs text-wm-text-dim mt-0.5">{selected.setup}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={clsx("text-xl font-black", selected.pnl >= 0 ? "text-wm-green" : "text-wm-red")}>
                    {fmtPnl(selected.pnl)}
                  </div>
                  <button onClick={() => setEntries(e => e.map(x => x.id === selected.id ? { ...x, starred:!x.starred } : x))}
                    className="p-1 hover:bg-wm-surface rounded transition-colors">
                    <Star size={14} className={selected.starred ? "text-wm-gold fill-wm-gold" : "text-wm-text-muted"} />
                  </button>
                  <button onClick={() => { setEntries(e => e.filter(x => x.id !== selected.id)); setSelected(null); }}
                    className="p-1 hover:bg-wm-surface rounded transition-colors text-wm-red">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { l:"Entry",  v: selected.entry.toLocaleString("en-US",{minimumFractionDigits:2}) },
                  { l:"Exit",   v: selected.exit.toLocaleString("en-US",{minimumFractionDigits:2}) },
                  { l:"Size",   v: String(selected.size) },
                  { l:"Change", v: `${selected.pct >= 0 ? "+" : ""}${selected.pct.toFixed(2)}%` },
                ].map(({ l, v }) => (
                  <div key={l} className="rounded-lg border border-wm-border bg-wm-surface p-3 text-center">
                    <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{l}</div>
                    <div className="text-sm font-mono font-bold text-wm-text mt-0.5">{v}</div>
                  </div>
                ))}
              </div>

              {/* Voice memo */}
              {selected.voiceSec > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-wm-purple/30 bg-wm-purple/5">
                  <Play size={13} className="text-wm-purple shrink-0" />
                  <WaveformBars n={24} color="#8B5CF6" />
                  <span className="text-[10px] text-wm-text-dim font-mono">{fmtSec(selected.voiceSec)}</span>
                  <span className="text-[9px] text-wm-text-dim ml-auto">Voice Memo</span>
                </div>
              )}

              {/* Images */}
              {selected.images?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selected.images.map((src, i) => (
                    <button key={i} onClick={() => setLightbox(src)} className="group relative">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-wm-border group-hover:border-wm-blue/50 transition-colors" />
                      <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={16} className="text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Mood */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-[10px] text-wm-text-dim mr-1">Mood:</span>
                {MOODS.map(m => (
                  <button key={m.val}
                    className={clsx("text-sm px-2 py-0.5 rounded-full transition-all border",
                      selected.mood === m.val ? "bg-wm-surface border-wm-border" : "border-transparent opacity-40 hover:opacity-70")}
                    title={m.label}>{m.emoji}
                  </button>
                ))}
                <span className="text-[10px] text-wm-text-dim ml-1">{MOODS.find(m => m.val === selected.mood)?.label}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-wm-gold/10 text-wm-gold border border-wm-gold/25">#{t}</span>
                ))}
              </div>

              {/* Note sections */}
              {[
                { label:"📝 Trade Notes",    val: selected.notes },
                { label:"❌ Mistakes Made",  val: selected.mistakes },
                { label:"💡 Lessons Learned",val: selected.lessons },
              ].map(({ label, val }) => val && (
                <div key={label} className="mb-4">
                  <div className="text-xs font-bold text-wm-text-muted mb-1.5">{label}</div>
                  <div className="rounded-lg border border-wm-border bg-wm-surface p-3 text-xs text-wm-text leading-relaxed whitespace-pre-wrap">{val}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── New entry form ──────────────────────────────── */}
          {newMode && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-wm-text">Log New Trade</h2>
                <button onClick={() => { setNewMode(false); voiceRec.reset(); }}><X size={14} className="text-wm-text-muted hover:text-wm-text" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Symbol</label>
                  <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50" />
                </div>
                <div>
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Side</label>
                  <div className="flex gap-2">
                    {(["long","short"] as const).map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
                        className={clsx("flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                          form.side === s
                            ? s === "long" ? "bg-wm-green/20 text-wm-green border-wm-green/40" : "bg-wm-red/20 text-wm-red border-wm-red/40"
                            : "bg-wm-surface border-wm-border text-wm-text-muted"
                        )}>{s.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Setup</label>
                  <select value={form.setup} onChange={e => setForm(f => ({ ...f, setup: e.target.value }))}
                    className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none focus:border-wm-green/50">
                    {SETUPS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {([
                  { k:"entry" as const, l:"Entry Price" },
                  { k:"exit"  as const, l:"Exit Price"  },
                  { k:"size"  as const, l:"Size / Contracts" },
                ]).map(({ k, l }) => (
                  <div key={k}>
                    <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">{l}</label>
                    <input type="number" value={form[k] || ""}
                      onChange={e => setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50 font-mono" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Mood</label>
                  <div className="flex gap-1">
                    {MOODS.map(m => (
                      <button key={m.val} onClick={() => setForm(f => ({ ...f, mood: m.val }))}
                        className={clsx("text-lg px-1 py-1 rounded transition-all",
                          form.mood === m.val ? "bg-wm-surface scale-110" : "opacity-40 hover:opacity-70")}
                        title={m.label}>{m.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes with emoji pickers */}
              <NotesEditor label="📝 Trade Notes" value={form.notes || ""} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Describe the setup, execution, and context..." />
              <NotesEditor label="❌ Mistakes (if any)" value={form.mistakes || ""} onChange={v => setForm(f => ({ ...f, mistakes: v }))} placeholder="What would you do differently?" />
              <NotesEditor label="💡 Lessons Learned" value={form.lessons || ""} onChange={v => setForm(f => ({ ...f, lessons: v }))} placeholder="Key takeaways for next time..." />

              {/* Quick emoji strip */}
              <div className="mb-3">
                <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Entry Emojis</label>
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.slice(0, 20).map(em => (
                    <button key={em}
                      onClick={() => setForm(f => {
                        const cur = f.emojis || [];
                        return { ...f, emojis: cur.includes(em) ? cur.filter(x => x !== em) : [...cur, em] };
                      })}
                      className={clsx("text-base px-1.5 py-0.5 rounded-lg border transition-all",
                        form.emojis?.includes(em)
                          ? "border-wm-gold/50 bg-wm-gold/10"
                          : "border-transparent hover:border-wm-border opacity-60 hover:opacity-100"
                      )}
                    >{em}</button>
                  ))}
                </div>
              </div>

              {/* Image upload */}
              <div className="mb-3">
                <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">📸 Screenshots / Charts</label>
                <ImageUpload
                  images={form.images || []}
                  onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
                />
              </div>

              {/* Voice memo */}
              <div className="mb-4">
                <label className="text-[10px] text-wm-text-dim uppercase mb-1.5 block">🎙 Voice Memo</label>
                <VoiceMemoRow recorder={voiceRec} />
              </div>

              <button onClick={saveEntry}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-wm-black transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
                Save Trade Entry
              </button>
            </motion.div>
          )}
        </div>
      </div>}

      {/* ── Lightbox ─────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ background:"rgba(7,10,15,0.92)" }}
            onClick={() => setLightbox(null)}
          >
            <img src={lightbox} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-wm-surface border border-wm-border text-wm-text-muted hover:text-wm-text transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
