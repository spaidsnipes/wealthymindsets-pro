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
import { useRouter, useSearchParams } from "next/navigation";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { useAuth as useAuthCtx } from "@/contexts/AuthContext";
import { useJournalSnapshots } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import { useTodayPrep } from "@/lib/traderMemory/adapters/useTodayPrep";
import { evaluateShutdown, DAY_MODEL_LABELS, type DayModel } from "@/lib/proofLane/proofLaneR";
import { computeJournalPnl, computeJournalRealizedR } from "@/lib/journal/computePnl";
import { journalToCsv } from "@/lib/journal/journalToCsv";
import { journalToJson } from "@/lib/journal/journalToJson";
import {
  buildLearningGenomeBundle,
  learningGenomeToJson,
} from "@/lib/learningGenome/learningGenomeToJson";
import {
  JOURNAL_STORAGE_KEY,
  migrateLegacyJournal,
  notifyCanonicalJournalChanged,
  readJournalStorage,
  type JournalStorageRead,
} from "@/lib/traderMemory/adapters/journalStorage";
import { captureEfficiency } from "@/lib/proofLane/captureEfficiency";
import { selectSessionEdge } from "@/lib/proofLane/selectSessionEdge";
import { selectLearningGenome } from "@/lib/learningGenome/selectLearningGenome";
import { prescribeDrill } from "@/lib/learningGenome/prescribeDrill";
import { selectMisreadMap, classifyMisread, type MisreadEntry } from "@/lib/learningGenome/selectMisreadMap";
import { genomeTrend } from "@/lib/learningGenome/genomeTrend";
import { LearningGenomeInspector } from "@/components/learningGenome/LearningGenomeInspector";
import { selectFocusStreak } from "@/lib/learningGenome/selectFocusStreak";
import { selectSetupGrade, summarizeSetupGrades } from "@/lib/learningGenome/selectSetupGrade";
import { selectDailyScore } from "@/lib/learningGenome/selectDailyScore";
import { selectMentalGate } from "@/lib/learningGenome/selectMentalGate";
import { selectRuleAdherenceStreak } from "@/lib/learningGenome/selectRuleAdherenceStreak";
import { selectSetupGradeReasons } from "@/lib/learningGenome/selectSetupGradeReasons";
import { selectDayModelCoverage } from "@/lib/learningGenome/selectDayModelCoverage";
import { selectEdgeQualityIndex } from "@/lib/learningGenome/selectEdgeQualityIndex";
import { selectRecoveryTradeDetector } from "@/lib/learningGenome/selectRecoveryTradeDetector";
import { selectShutdownAdvice } from "@/lib/learningGenome/selectShutdownAdvice";
import { selectStewardshipVerdict } from "@/lib/learningGenome/selectStewardshipVerdict";
import PersonalEdgeChip from "@/components/journal/PersonalEdgeChip";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import WmWordmark from "@/components/brand/WmWordmark";
import { useWMS } from "@/contexts/WMSContext";
import { getKnownSessionSymbols } from "@/lib/marketData/sessionSymbolStore";
import {
  Plus, Search, Tag, Calendar, Download, Mic, MicOff,
  TrendingUp, TrendingDown, Image as ImageIcon, Trash2,
  FileText, X, Star, BarChart2, Smile, Play, Pause,
  StopCircle, Paperclip, CheckCircle, Camera, Video,
  Brain, AlertTriangle, ChevronUp, ChevronDown, RefreshCw, Zap,
  Music, Sparkles, Copy, Trash2 as Trash2Icon, Headphones, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { hasJournalCoachEvidence, JOURNAL_COACH_MIN_SAMPLE } from "@/lib/journalEvidence";
import { classifyFinancialOutcome } from "@/lib/journalOutcome";
import {
  classifyProcessOutcome,
  PROCESS_OUTCOME_LABELS,
  type ProcessOutcome,
  type ProcessQuality,
} from "@/lib/journalProcess";
import { FabioInsights } from "@/components/fabio/FabioInsights";
import {
  filterLinkedDecisionEntries,
  parseLinkedDecisionIds,
  withoutLinkedDecisions,
} from "@/lib/journalDecisionFilter";

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

/**
 * NectarSnapshot — REMEMBER→REFLECT bridge.
 *
 * Captured from the canonical sessionSymbolStore at the moment a
 * journal entry is created, so the trader can review not just what
 * happened but WHAT WM ACTUALLY OBSERVED about that symbol at
 * journal-creation time. Optional: pre-existing entries have no
 * snapshot; new entries capture one when Nectar had any trades for
 * the entry's symbol. Zero fabrication — if nothing was observed,
 * the snapshot is null and the review says so honestly.
 */
export interface NectarSnapshot {
  readonly capturedAtMs: number;
  readonly channels: number;       // count of tape sources for this symbol at capture
  readonly tradeCount: number;
  readonly delta: number;
  readonly buyVol: number;
  readonly sellVol: number;
  readonly bigTradeCount: number;
  readonly horizonSec: number | null;      // first observation
  readonly lastTradeAtMs: number | null;   // most recent observation (real freshness)
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
  processQuality: ProcessQuality;
  processOutcome: ProcessOutcome;
  starred:   boolean;
  images:    string[];   // base64 data URLs
  voiceSec:  number;     // 0 = no memo
  setup:     string;
  mistakes:  string;
  lessons:   string;
  emojis:    string[];
  nectarSnapshot?: NectarSnapshot | null;
  // Proof Lane §21 launch fields (2026-08-24). Optional / additive so
  // pre-existing entries keep loading. §3 day model + §4 planned R
  // dollars + §24 realized R (computed as pnl / plannedRDollars).
  dayModel?: DayModel;
  plannedRDollars?: number;
  realizedR?: number;
  // Contract lens (canon §6). Multiplier is required for options: a
  // $1.00→$1.20 option with 1 contract is +$20 P&L, not +$0.20.
  // "stock" default keeps legacy entries computing exactly as before.
  contractType?: "stock" | "option";
  // Management Studio (canon §7). Trader-observed maximum favorable
  // excursion (best unrealized R the trade printed while open) and
  // maximum adverse excursion (worst unrealized R). Used with
  // realizedR to compute capture efficiency = realizedR / mfeR.
  // Optional; absent for legacy entries and skipped for M0 no-trade days.
  mfeR?: number;
  maeR?: number;
}

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
  const bars = Array.from({ length: n }, (_, i) => 10 + Math.sin(i * 0.8) * 8 + ((i * 17) % 7));
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
  const [error,    setError]    = useState("");
  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);

  const start = useCallback(async () => {
    setError("");
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
      setState("idle");
      setError("Microphone permission is required to record a real voice memo.");
    }
  }, [sec]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
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
    setState("idle"); setSec(0); setMemo(null); setPlaying(false); setError("");
  }, [memo]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { state, sec, memo, playing, error, start, stop, togglePlay, reset };
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
  const { state, sec, memo, playing, error, start, stop, togglePlay, reset } = recorder;

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
      {error && <span role="alert" className="text-[10px] text-wm-red">{error}</span>}
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
  if (!hasJournalCoachEvidence(entries.length)) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-wm-purple" />
          <span className="text-sm font-black text-wm-text">Strategy Evidence Coach</span>
          <span className="text-[10px] text-wm-text-dim">{entries.length} of {JOURNAL_COACH_MIN_SAMPLE} trades</span>
        </div>
        <div className="glass rounded-xl p-5 border border-wm-gold/25">
          <div className="text-xs font-bold text-wm-gold mb-2">INSUFFICIENT EVIDENCE</div>
          <p className="text-[11px] text-wm-text-dim leading-relaxed">
            WM needs at least {JOURNAL_COACH_MIN_SAMPLE} completed, consistently tagged journal entries before comparing
            win rate, reward-to-risk, setups, or behavior patterns. No performance or mindset conclusion is made yet.
          </p>
          <p className="text-[10px] text-wm-text-dim mt-3">
            Next useful action: journal the process, evidence, invalidation, management, and outcome of each decision.
            WAIT and NO TRADE decisions count as evidence when recorded truthfully.
          </p>
        </div>
      </div>
    );
  }

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
    type: "warning",
    title: "Observed outcome distribution",
    body: `${wins.length} wins and ${losses.length} losses are recorded in this ${entries.length}-trade journal sample (${wr.toFixed(0)}% wins). This describes the sample; it does not prove the strategy, process quality, or what should be traded next.`,
  });
  else if (wr < 50) alerts.push({
    type: "warning",
    title: "Observed outcome distribution",
    body: `${wins.length} wins and ${losses.length} losses are recorded (${wr.toFixed(0)}% wins). The sample's average win-to-loss ratio is ${rr.toFixed(1)}:1; fees, slippage, setup version, and out-of-sample stability still need separate review.`,
  });
  else alerts.push({
    type: "warning",
    title: "Observed outcome distribution",
    body: `${wins.length} wins and ${losses.length} losses are recorded (${wr.toFixed(0)}% wins), with a ${rr.toFixed(1)}:1 average win-to-loss ratio and ${pf.toFixed(2)} sample profit factor. These are journal observations, not permission to increase risk.`,
  });

  if (worstMood && worstMood[1] >= 1) alerts.push({
    type: "warning",
    title: `Recorded context: ${worstMood[0]}`,
    body: `${worstMood[1]} recorded losses include the self-reported state “${worstMood[0]}.” This is an association in your journal, not proof that the state caused the outcomes. Review the linked decisions and process evidence.`,
  });

  const fomoTrades = entries.filter(e => e.tags.includes("FOMO") || e.tags.includes("chased"));
  if (fomoTrades.length > 0) {
    const fomoWR = fomoTrades.filter(e => e.result === "win").length / fomoTrades.length * 100;
    alerts.push({
      type: "warning",
      title: "📈 FOMO/Chased entries detected",
      body: `${fomoTrades.length} entries were explicitly tagged FOMO/chased, with ${fomoWR.toFixed(0)}% wins versus ${wr.toFixed(0)}% for the full sample. This is an observed association; inspect process adherence before drawing a conclusion.`,
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
        <span className="text-sm font-black text-wm-text">Journal Evidence Coach</span>
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
          `📊 This ${entries.length}-trade sample is descriptive. Live-trading permission still requires your account rules, validated strategy version, risk limits, costs, and out-of-sample evidence.`,
          rr < 1  ? "⚖️ The recorded average loss is larger than the recorded average win. Review entries, invalidations, exits, fees, and setup versions; WM does not prescribe wider stops from this aggregate alone."
                  : `📐 The recorded average win-to-loss ratio is ${rr.toFixed(1)}:1. Verify whether it remains stable by setup, regime, instrument, and costs.`,
          fomoTrades.length > 0 ? "🧭 FOMO/chased tags are present. Compare those decisions with your timestamped thesis and declared invalidation."
                                : "🧭 No FOMO/chased tag is recorded. Missing tags do not prove the behavior was absent; keep self-reporting consistent.",
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
const LEGACY_DEMO_TRADES = new Set([
  "1|2025-06-14|NQ1!",
  "2|2025-06-14|TSLA",
  "3|2025-06-13|ES1!",
]);

function ProcessOutcomeStrip({
  entries,
  selected,
  onSelect,
}: {
  entries: JournalEntry[];
  selected?: ProcessOutcome | null;
  onSelect?: (bucket: ProcessOutcome | null) => void;
}) {
  const buckets = React.useMemo(() => {
    const counts = { EARNED_WIN: 0, PROFESSIONAL_LOSS: 0, DANGEROUS_WIN: 0, PREVENTABLE_LOSS: 0, UNRESOLVED: 0 };
    for (const e of entries) {
      const key = (e.processOutcome ?? "UNRESOLVED") as keyof typeof counts;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const resolved = buckets.EARNED_WIN + buckets.PROFESSIONAL_LOSS + buckets.DANGEROUS_WIN + buckets.PREVENTABLE_LOSS;
  // Silent when no entry has a resolved process outcome — never lecture
  // the trader with a fake "0/0/0/0" quadrant.
  if (resolved === 0) return null;

  const rows = [
    { key: "EARNED_WIN"        as ProcessOutcome, label: "Earned wins",       tone: "#5cb85c", desc: "good process + win"  },
    { key: "PROFESSIONAL_LOSS" as ProcessOutcome, label: "Professional losses",tone: "#c9a55c",desc: "good process + loss" },
    { key: "DANGEROUS_WIN"     as ProcessOutcome, label: "Dangerous wins",    tone: "#c05a4a", desc: "bad process + win"   },
    { key: "PREVENTABLE_LOSS"  as ProcessOutcome, label: "Preventable losses",tone: "#c05a4a", desc: "bad process + loss"  },
  ];

  const handleClick = (bucket: ProcessOutcome) => {
    if (!onSelect) return;
    onSelect(selected === bucket ? null : bucket);
  };

  return (
    <div
      role="region"
      aria-label="Process-outcome quadrant summary"
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(139,106,41,0.15)",
        background: "linear-gradient(90deg, rgba(139,106,41,0.04), rgba(139,106,41,0))",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700 }}>
          Process × Outcome
        </span>
        <span style={{ fontSize: 10, color: "#8a8271" }}>
          {resolved} resolved · {buckets.UNRESOLVED} unresolved
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            style={{ fontSize: 9, color: "#c9a55c", background: "transparent", border: "none", cursor: "pointer", letterSpacing: 0.3, textTransform: "uppercase" }}
            aria-label="Clear process-outcome filter"
          >
            clear filter ×
          </button>
        )}
        <span style={{ fontSize: 10, color: "#55503f", fontStyle: "italic", marginLeft: "auto" }}>
          P&amp;L never grades process
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {rows.map((r) => {
          const n = buckets[r.key];
          const pct = resolved > 0 ? Math.round((n / resolved) * 100) : 0;
          const dim = n === 0;
          const isSelected = selected === r.key;
          const clickable = onSelect != null && n > 0;
          const Tile = clickable ? "button" : "div";
          return (
            <Tile
              key={r.key}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => handleClick(r.key) : undefined}
              aria-pressed={clickable ? isSelected : undefined}
              title={`${r.label} — ${r.desc}${clickable ? " (click to filter journal to this bucket)" : ""}`}
              style={{
                padding: "6px 10px",
                background: isSelected ? `${r.tone}18` : "rgba(19,19,23,0.5)",
                border: `1px solid ${isSelected ? r.tone + "80" : dim ? "rgba(139,106,41,0.15)" : r.tone + "40"}`,
                borderRadius: 4,
                opacity: dim ? 0.5 : 1,
                cursor: clickable ? "pointer" : "default",
                textAlign: "left",
                fontFamily: "inherit",
                minHeight: clickable ? 44 : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: r.tone, fontVariantNumeric: "tabular-nums" }}>
                  {n}
                </span>
                <span style={{ fontSize: 9, color: "#8a8271" }}>· {pct}%</span>
              </div>
              <div style={{ fontSize: 9, letterSpacing: 0.28, textTransform: "uppercase", color: dim ? "#55503f" : "#c0b8a0", marginTop: 2 }}>
                {r.label}
              </div>
              <div style={{ fontSize: 9, color: "#55503f", marginTop: 1, fontStyle: "italic" }}>
                {r.desc}
              </div>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}

function TodayIntentStrip({ userId }: { userId: string | null }) {
  const prep = useTodayPrep(userId);
  if (!prep.hasEntry) return null;
  const routine = prep.routine ?? "(no intention recorded)";
  const done = prep.checklistDone;
  const total = prep.checklistTotal;
  return (
    <div
      role="region"
      aria-label="Today's morning intention"
      style={{
        padding: "8px 16px",
        borderBottom: "1px solid rgba(139,106,41,0.15)",
        background: "linear-gradient(90deg, rgba(139,106,41,0.06), rgba(139,106,41,0))",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700 }}>
        Today's intent
      </span>
      {prep.mood && <span aria-hidden="true" style={{ fontSize: 14 }}>{prep.mood}</span>}
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 12,
          color: "#ede6d3",
          maxWidth: 620,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: 0.2,
        }}
        title={routine}
      >
        {routine}
      </span>
      {total > 0 && (
        <span style={{ fontSize: 10, color: done === total ? "#7fbf7f" : "#8a8271", letterSpacing: 0.2 }}>
          checklist {done}/{total}
        </span>
      )}
      <a
        href="/morning-prep"
        style={{
          marginLeft: "auto",
          fontSize: 9,
          fontFamily: "Georgia, 'Times New Roman', serif",
          letterSpacing: 0.32,
          textTransform: "uppercase",
          color: "#c9a55c",
          textDecoration: "none",
        }}
      >
        Open Prep →
      </a>
    </div>
  );
}

export default function JournalPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-wm-black" />}>
      <JournalPageInner />
    </React.Suspense>
  );
}

function JournalPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedFilterActive = searchParams.has("decisions");
  const linkedDecisionIds = useMemo(
    () => parseLinkedDecisionIds(searchParams.get("decisions")),
    [searchParams],
  );
  const { earnWMS } = useWMS();
  const hydrationRef = useRef<JournalStorageRead | null>(null);
  const persistenceAllowedRef = useRef(false);
  const persistenceArmedRef = useRef(false);
  const [entries, setEntriesState] = useState<JournalEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const read = readJournalStorage(localStorage);
    hydrationRef.current = read;
    persistenceAllowedRef.current = read.status === "RESOLVED_CANONICAL" || read.status === "ABSENT";
    const saved = read.status === "RESOLVED_CANONICAL" || read.status === "RESOLVED_LEGACY"
      ? read.records as JournalEntry[]
      : [];
    return saved.filter((e: JournalEntry) => !LEGACY_DEMO_TRADES.has(`${e.id}|${e.date}|${e.symbol}`));
  });
  const setEntries = useCallback<React.Dispatch<React.SetStateAction<JournalEntry[]>>>((update) => {
    persistenceArmedRef.current = true;
    setEntriesState(update);
  }, []);
  useEffect(() => {
    const read = hydrationRef.current;
    if (!read || read.status !== "RESOLVED_LEGACY") return;
    persistenceAllowedRef.current = migrateLegacyJournal(localStorage, read).status === "MIGRATED";
  }, []);
  // Persist journal to localStorage whenever entries changes + notify
  // subscribers on other surfaces (Profile Growth, Command Deck) via
  // the custom 'wm-journal-updated' event so their MirrorPanels /
  // ProcessLandscape update in lockstep.
  useEffect(() => {
    if (!persistenceArmedRef.current || !persistenceAllowedRef.current) return;
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
      notifyCanonicalJournalChanged();
    } catch {
      // Browser-local persistence is unavailable; do not claim a successful save.
    }
  }, [entries]);

  // Live Mirror surface — reads existing journal via adapter, feeds
  // selectMirror. Zero fabrication: when no patterns detected, the
  // panel renders NOTHING (silence-is-a-feature §14).
  const authCtx = useAuthCtx();
  const journalSnapshots = useJournalSnapshots(authCtx?.user?.id ?? null);
  const mirrorNowMs = useMemo(() => Date.now(), [journalSnapshots.length]);
  const mirrorVm = useMemo(
    () =>
      selectMirror({
        ownerId: authCtx?.user?.id ?? "",
        decisions: journalSnapshots,
        nowMs: mirrorNowMs,
      }),
    [authCtx?.user?.id, journalSnapshots, mirrorNowMs],
  );

  const personalEdgeVm = useMemo(
    () =>
      selectPersonalEdge({
        ownerId: authCtx?.user?.id ?? "",
        decisions: journalSnapshots,
        nowMs: mirrorNowMs,
      }),
    [authCtx?.user?.id, journalSnapshots, mirrorNowMs],
  );

  const [selected,  setSelected]  = useState<JournalEntry | null>(null);
  const [newMode,   setNewMode]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterRes, setFilterRes] = useState<"all"|TradeResult>("all");
  // Process-outcome filter — companion to filterRes. Lets the trader
  // isolate a specific quadrant (e.g. 'DANGEROUS_WIN' — bad process +
  // lucky win) from the ProcessOutcomeStrip. 'all' means no filter.
  const [filterProcessOutcome, setFilterProcessOutcome] = useState<"all"|ProcessOutcome>("all");
  // I-Bkt 7: filter by canon §3 day model. Founder's Week-One review
  // will want "show only my M1 days last week" to isolate a class of
  // sessions. 'all' = no filter; entries without dayModel are excluded
  // from a specific-Mx filter (canon: unclassified never counted as Mx).
  const [filterDayModel, setFilterDayModel] = useState<"all"|"M0"|"M1"|"M2">("all");
  // I-Bkt 14: filter by canon §6 contract type. Founder review will
  // want to isolate all option trades or all stock trades separately.
  const [filterContract, setFilterContract] = useState<"all"|"stock"|"option">("all");
  // J-Bkt 9: starred-only filter. One-click "show me my best trades" review.
  const [filterStarred, setFilterStarred] = useState(false);
  // Canon §9 Trader Misread Map filter — click the MISREAD chip in the
  // header to isolate all trades that fell into that misread bucket
  // (drill-in from diagnostic to specific entries). "all" = no filter.
  const [filterMisread, setFilterMisread] = useState<
    "all" | "MISSED_SETUP" | "BROKE_PROCESS" | "POOR_MANAGEMENT" | "FULL_STOP_LOSS" | "UNRESOLVED_PROCESS" | "CLEAN"
  >("all");
  // Canon §17 Mental Gate — trader answers 4 boolean self-checks
  // before submitting a New Trade. undefined = unanswered. Reset on
  // every fresh newMode entry (below in useEffect).
  const [mentalGate, setMentalGate] = useState<{
    calmAndClear?: boolean;
    takenIfAlreadyAhead?: boolean;
    skippedIfClcFailed?: boolean;
    drivenByEvidenceNotNeed?: boolean;
  }>({});
  const mentalGateResult = selectMentalGate(mentalGate);
  // Canon §9: expand toggle for the full LearningGenomeInspector panel.
  // Diagnostic chip is always visible; full panel is a click away.
  const [showGenomePanel, setShowGenomePanel] = useState(false);
  const [lightbox,  setLightbox]  = useState<string | null>(null);
  const [mainTab,   setMainTab]   = useState<"journal"|"coach"|"songs">("journal");

  // Local strategy lyric-template state (no AI service is called).
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
    symbol: "", side: "long", entry: 0, exit: 0, size: 1,
    pnl: 0, pct: 0, tags: [], notes: "", mood: "neutral",
    result: "be", processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED",
    starred: false, images: [], voiceSec: 0,
    setup: "", mistakes: "", lessons: "", emojis: [],
    // Proof Lane defaults — start unset so the trader must consciously
    // pick a Model and Planned R per canon §3 / §4. Empty ≠ zero.
    dayModel: undefined,
    plannedRDollars: undefined,
    realizedR: undefined,
    contractType: "stock",
  });
  const [form, setForm]   = useState<Partial<JournalEntry>>(emptyForm());
  const voiceRec          = useVoiceRecorder();

  const linkedEntries = filterLinkedDecisionEntries(entries, linkedDecisionIds, linkedFilterActive);
  const filtered = linkedEntries.filter(e => {
    const q = search.toLowerCase();
    return (
      (!q || e.symbol.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q) || e.setup.toLowerCase().includes(q)) &&
      (!filterTag || e.tags.includes(filterTag)) &&
      (filterRes === "all" || e.result === filterRes) &&
      (filterProcessOutcome === "all" || e.processOutcome === filterProcessOutcome) &&
      (filterDayModel === "all" || e.dayModel === filterDayModel) &&
      (filterContract === "all" || (e.contractType ?? "stock") === filterContract) &&
      (!filterStarred || e.starred) &&
      (filterMisread === "all" || classifyMisread({
        date: e.date,
        result: e.result,
        realizedR: e.realizedR,
        processQuality: e.processQuality,
        mfeR: e.mfeR,
        maeR: e.maeR,
        dayModel: e.dayModel,
      }) === filterMisread)
    );
  });
  const linkedMatchCount = linkedFilterActive ? linkedEntries.length : 0;

  const wins     = entries.filter(e => e.result === "win").length;
  const losses   = entries.filter(e => e.result === "loss").length;
  const totalPnl = entries.reduce((s, e) => s + e.pnl, 0);
  const winRate  = entries.length ? ((wins / entries.length) * 100).toFixed(0) : "0";

  // Proof Lane §21 launch — today's session R evaluation. Composes the
  // canon §4 shutdown gate over TODAY's entries only. Founder sees
  // cumulative R + shutdown state at a glance so a live-session
  // journal review immediately tells him "session open" / "hard stop
  // reached" / "+3R baseline objective — stewardship decision".
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.date === todayIso);
  const todayRs = todayEntries
    .map(e => e.realizedR)
    .filter((r): r is number => typeof r === "number" && Number.isFinite(r));
  const sessionShutdown = evaluateShutdown({ closedRs: todayRs });
  const todayModelCounts = todayEntries.reduce(
    (acc, e) => {
      if (e.dayModel) acc[e.dayModel] = (acc[e.dayModel] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Proof Lane §21 Week-One + §11 Personal Edge Lab — this-week edge.
  // 7-day rolling window ending today. Composes the tested
  // selectSessionEdge selector; silent when no R-tagged entries this
  // week (nothing to summarize honestly yet).
  const weekStartMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = entries.filter(e => {
    const t = Date.parse(e.date);
    return Number.isFinite(t) && t >= weekStartMs;
  });
  const weekEdgeEntries = weekEntries.map(e => ({
    date: e.date,
    result: e.result,
    realizedR: e.realizedR,
    processQuality: e.processQuality,
    mfeR: e.mfeR,
    maeR: e.maeR,
  }));
  const weekEdge = selectSessionEdge(weekEdgeEntries);
  // Canon §9 Learning Genome — four-dimension diagnostic over the same
  // rolling 7-day window. Silent when fewer than 2 dimensions are
  // measurable OR when the top and bottom scores tie (no fabrication).
  const weekGenome = selectLearningGenome(weekEdgeEntries);
  // Adaptive Academy bridge — canon-defined drill for the weakest
  // dimension. Undefined when the Genome has no weakest (same silence
  // policy as the chip). No prescription from insufficient signal.
  const weekDrill = prescribeDrill(weekGenome);
  // Canon §9 Trader Misread Map — deterministic single-bucket
  // classification per trade. Dominant category surfaces the shape
  // of the trader's most-common mistake; undefined on ties.
  const weekMisreadEntries: MisreadEntry[] = weekEntries.map(e => ({
    date: e.date,
    result: e.result,
    realizedR: e.realizedR,
    processQuality: e.processQuality,
    mfeR: e.mfeR,
    maeR: e.maeR,
    dayModel: e.dayModel,
  }));
  const weekMisread = selectMisreadMap(weekMisreadEntries);
  // Genome trend — canon §9 "distinguish skill from luck". Compare
  // current 7-day window to the prior 7-day window (days -14 to -7)
  // and surface most_improved / most_degraded. Silent when no
  // dimension moved past the noise threshold.
  const priorWeekStartMs = weekStartMs - 7 * 24 * 60 * 60 * 1000;
  const priorWeekEntries = entries.filter(e => {
    const t = Date.parse(e.date);
    return Number.isFinite(t) && t >= priorWeekStartMs && t < weekStartMs;
  });
  const priorGenome = selectLearningGenome(
    priorWeekEntries.map(e => ({
      date: e.date,
      result: e.result,
      realizedR: e.realizedR,
      processQuality: e.processQuality,
      mfeR: e.mfeR,
      maeR: e.maeR,
    })),
  );
  const weekTrend = genomeTrend(weekGenome, priorGenome);
  // Canon §Public Blessing — consecutive plan-followed streak.
  // The blessing users can see; the recipe (which trades qualified,
  // in what order) stays in the Journal detail. Entries are
  // stored newest-first in the array as loaded.
  const focusStreak = selectFocusStreak(weekEdgeEntries);
  // Canon §Loss-as-Data — consecutive clean-DAY streak (day-level
  // discipline, complements trade-level focusStreak).
  const dayStreak = selectRuleAdherenceStreak(weekEdgeEntries);
  // Canon §Personal Edge — one 0-100 index composed from the four
  // measured §9 dimensions + classification discipline. UNDEFINED
  // until at least one component measures.
  const weekCoverage = selectDayModelCoverage(weekMisreadEntries);
  const edgeQuality = selectEdgeQualityIndex(weekGenome, weekCoverage);
  // Today Edge entries — shared shape used by process-score,
  // recovery detector, and stewardship verdict.
  const todayEdgeEntries = todayEntries.map(e => ({
    date: e.date,
    result: e.result,
    realizedR: e.realizedR,
    processQuality: e.processQuality,
    mfeR: e.mfeR,
    maeR: e.maeR,
  }));
  // Canon §14 today's Process Grade — 5-category score. Must be
  // computed BEFORE stewardship (which reads its grade).
  const todayProcessScore = selectDailyScore({
    entries: todayEntries.map(e => ({
      date: e.date,
      result: e.result,
      realizedR: e.realizedR,
      processQuality: e.processQuality,
      mfeR: e.mfeR,
      maeR: e.maeR,
      dayModel: e.dayModel,
    })),
    // hadMorningPrep not observable from journal storage yet.
  });
  // Canon §Daily Risk — same-day recovery-trade signature detection.
  const todayRecovery = selectRecoveryTradeDetector(todayEdgeEntries);
  const todayShutdownAdvice = selectShutdownAdvice(todayRs);
  // Canon §Stewardship — one end-of-day verdict composed from
  // process grade + shutdown state + recovery detection.
  const todayStewardship = selectStewardshipVerdict({
    process_grade: todayProcessScore.grade,
    shutdown_state: todayShutdownAdvice.state,
    recovery_candidate_count: todayRecovery.candidates.length,
  });
  // Canon §A-Setup-Only Doctrine — post-hoc weekly A/A+ grade summary.
  const weekSetupGrades = weekEntries.map(e =>
    selectSetupGrade({ dayModel: e.dayModel, plannedR: e.realizedR, processQuality: e.processQuality })
  );
  const setupGradeSummary = summarizeSetupGrades(weekSetupGrades);

  const saveEntry = () => {
    const e = { ...(form as JournalEntry) };
    e.id       = uid();
    // Canon §6 Contract Lens: options carry a 100x standard multiplier.
    // Delegating to computeJournalPnl (pure, state-matrix-tested) so the
    // 16-branch coverage in computePnl.test.ts protects the shipped path.
    e.pnl      = computeJournalPnl({ entry: e.entry, exit: e.exit, size: e.size, side: e.side, contractType: e.contractType });
    e.pct      = e.entry > 0 ? ((e.exit - e.entry) / e.entry * 100) * (e.side === "short" ? -1 : 1) : 0;
    e.result   = classifyFinancialOutcome(e.pnl);
    e.processQuality = e.processQuality ?? "UNRESOLVED";
    e.processOutcome = classifyProcessOutcome(e.processQuality, e.pnl);
    e.voiceSec = voiceRec.memo?.sec ?? (voiceRec.state === "done" ? voiceRec.sec : 0);

    // Proof Lane §21 — realized R via the same state-matrix-tested pure
    // selector the live modal tile uses. Never fabricated when
    // plannedRDollars is missing / zero (canon §4).
    e.realizedR = computeJournalRealizedR({
      entry: e.entry, exit: e.exit, size: e.size, side: e.side,
      contractType: e.contractType, plannedRDollars: e.plannedRDollars,
    });

    // Nectar snapshot — REMEMBER→REFLECT bridge (Founder OVERRIDE §10
    // loop closure). Capture what WM actually observed about this
    // symbol at journal-creation time, from the canonical
    // sessionSymbolStore. Null-safe: no observations → null snapshot
    // → detail view says so honestly (no fabrication).
    try {
      const upper = e.symbol.toUpperCase();
      const rows = getKnownSessionSymbols().filter(s => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0);
      if (rows.length > 0) {
        const merged = rows.reduce(
          (acc, r) => {
            acc.tradeCount    += r.slot.stats.tradeCount;
            acc.delta         += r.slot.stats.delta;
            acc.buyVol        += r.slot.stats.buyVol;
            acc.sellVol       += r.slot.stats.sellVol;
            acc.bigTradeCount += r.slot.stats.bigTradeCount;
            const hSec = r.slot.horizon?.startedAtSec ?? null;
            if (hSec != null) acc.horizonSec = acc.horizonSec == null ? hSec : Math.min(acc.horizonSec, hSec);
            const l = r.slot.lastTradeAtMs ?? null;
            if (l != null) acc.lastTradeAtMs = acc.lastTradeAtMs == null ? l : Math.max(acc.lastTradeAtMs, l);
            return acc;
          },
          { tradeCount: 0, delta: 0, buyVol: 0, sellVol: 0, bigTradeCount: 0, horizonSec: null as number | null, lastTradeAtMs: null as number | null },
        );
        e.nectarSnapshot = {
          capturedAtMs: Date.now(),
          channels: rows.length,
          ...merged,
        };
      } else {
        e.nectarSnapshot = null;
      }
    } catch { e.nectarSnapshot = null; }

    setEntries(prev => [e, ...prev]);
    setNewMode(false);
    setForm(emptyForm());
    setMentalGate({}); // canon §17: fresh gate for the next trade
    voiceRec.reset();
    // Reward WM$ for journaling
    earnWMS(50, "📕 Journaled a completed decision");
  };

  // ── AI Song Generator ────────────────────────────────────
  const SONG_TEMPLATES: Record<string, (topic: string, custom: string) => string> = {
    "hip-hop": (topic, custom) => `🎤 **[Strategy Lyric Template — Hip-Hop]**
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
Local practice points and honest tools too
The discipline compounding — that's the vision coming true 🚀`,

    "r&b": (topic, custom) => `🎵 **[Strategy Lyric Template — R&B]**
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
Practice points track the work I do each day
${topic} is the game and I know how to play

[Bridge]
They said the market's random but I see the pattern
Wyckoff told the truth even when it mattered
Accumulation phase — I'm buying in the range
Distribution coming — I know when to arrange my exit

[Outro]
Wealthy mindset, wealthy lifestyle
Growing slow and steady, running my own mile 🌟`,

    "trap": (topic, custom) => `🔊 **[Strategy Lyric Template — Trap]**
**"${topic.toUpperCase()} SZNS"**

[Intro - Ad libs]
Slatt, WM, aye, yeah

[Verse 1]
${custom || `Charts on the screen, I see the ${topic}
Trappin' on the exchange, no cap I been goated
Order flow confirmed, hit the bid with precision
No revenge trading, every move a decision
Stop hunt activated, I knew that was coming
While they panic selling I was calm and running`}

[Chorus]
${topic} szns, we up every season 📈
Practice points stacking, discipline the reason
Creators keep building, the whole team winning
Wealthy Mindsets Pro — we been always winning

[Verse 2]
Journaled every loss so I don't repeat it
Backtested the setup so when live I beat it
Risk management first, that's the only rule
Emotional traders just my liquidity pool 😤

[Outro]
WM community, disciplined lane
Truth in the product, no fabricated chain 🔥`,

    "motivational": (topic, custom) => `💪 **[Strategy Lyric Template — Motivational]**
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
Wealth isn't a token, it's disciplined life
Wealthy Mindsets Pro — sharpening the knife 🔪`,

    "drill": (topic, custom) => `😤 **[Strategy Lyric Template — Drill]**
**"${topic} Drill"**

[Verse 1]
${custom || `On the chart looking for ${topic}, don't play with my time
Order block respected, now I'm ready to climb
They faded the level, I doubled down right
Smart money confirmation, I was on tonight`}

[Chorus]
${topic} drill, we don't miss the fill
Patience at the level till we get our thrill
WM moving, execution stays real
Wealthy Mindsets Pro — this is how we feel

[Verse 2]
Stopped out twice before I learned the game
Now my entries precise, never the same mistake
Risk reward locked, minimum 1 to 2
Anything less and I'm passing through 🎯

[Outro]
Journal the trade, review the tape
Practice points stacking while others escape
Honest execution coming real soon
WealthyMindsets Pro taking over the room 🌙`,

    "pop": (topic, custom) => `🎶 **[Strategy Lyric Template — Pop]**
**"${topic} (Up Only)"**

[Verse 1]
${custom || `Started with a hundred K, paper trading every day
Learning all the ${topic}, finding my own way
Green candles, red candles, I studied them all
Practiced the discipline so I'd never fall`}

[Pre-Chorus]
And now I'm ready, I've put in the time
My discipline growing, about to climb

[Chorus]
Up only in my mindset, up only in my growth 📈
Up only in my discipline, up only in my hope
Wealthy Mindsets Pro — we taking off tonight
${topic} in my heart, I know I've got it right

[Verse 2]
Creators keep building, the community's live
Every lesson practiced helps the mindset thrive
Momentum growing stronger as more creators join
Truth is the backbone, discipline refined 💎

[Outro]
Up only, up only, that's the Wealthy Mindset way
Trade the system, trust the process, winners every day 🚀`,
  };

  const generateSong = async () => {
    setSongGenerating(true);
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
    earnWMS(100, `🎵 Created local lyric template "${title}"`);
  };

  const exportCSV = () => {
    // I-Bkt 4: delegates to journalToCsv (pure, RFC 4180 escaping,
    // 20 columns including all Proof Lane fields per canon §3/§4/§6/§24).
    // Prior inline version dropped dayModel / plannedR / realizedR /
    // contractType / processQuality — Founder's Week-One review would
    // have been silently wrong.
    const csv = journalToCsv(entries);
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "wm-journal.csv",
    });
    a.click();
  };
  const exportJSON = () => {
    // I-Bkt 13: JSON companion to CSV. Machine-readable, versioned,
    // drops undefined for a clean archive. Suitable for backup or
    // migration into a future authoritative store.
    const json = journalToJson(entries, new Date().toISOString());
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([json], { type: "application/json" })),
      download: "wm-journal.json",
    });
    a.click();
  };
  const exportGenome = () => {
    // Canon §9 Learning Genome bundle — Public Blessing exporter.
    // Trader pulls their own four-dimension diagnostic + drill +
    // misread map + trend as one JSON payload. Private Recipe
    // (thresholds, priority order) stays behind the WM boundary.
    const bundle = buildLearningGenomeBundle({
      currentEntries: weekMisreadEntries,
      priorEntries: priorWeekEntries.map(e => ({
        date: e.date,
        result: e.result,
        realizedR: e.realizedR,
        processQuality: e.processQuality,
        mfeR: e.mfeR,
        maeR: e.maeR,
        dayModel: e.dayModel,
      })),
      currentDays: 7,
      priorDays: 7,
      exportedAt: new Date().toISOString(),
    });
    const json = learningGenomeToJson(bundle);
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([json], { type: "application/json" })),
      download: "wm-learning-genome.json",
    });
    a.click();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden" }}
         className="bg-wm-black">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="wm-journal-header flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ minHeight:44 }}>
        <WmWordmark size="compact" subtitle="LEGACY JOURNAL" />
        <div style={{ height: 18, width: 1, background: "rgba(139,106,41,0.3)", margin: "0 4px" }} aria-hidden="true" />
        <FileText size={15} className="text-wm-purple shrink-0" />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, fontWeight: 400, color: "#ede6d3" }}>Trade Journal</h1>
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
        {/* flex-wrap so the WR/PnL/Session-R/Week-Edge/GENOME/TREND/MISREAD
            chip stack reflows on narrow viewports (390px mobile) instead
            of overflowing the header. Canon §Cross-device Continuity. */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-wm-green/15 text-wm-green border border-wm-green/30">{winRate}% WR</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${totalPnl >= 0 ? "bg-wm-green/10 text-wm-green border-wm-green/25" : "bg-wm-red/10 text-wm-red border-wm-red/25"}`}>{fmtPnl(totalPnl)}</span>
          <span className="text-[10px] text-wm-text-dim">{wins}W / {losses}L</span>
          {/* Proof Lane §21 — today's Session R gate. Silent when the
              trader hasn't logged any R for today (empty proof-lane
              day; no fabrication). Live once first R lands. Canon §4:
              -2R hard stop, +3R baseline objective (not a quota). */}
          {todayRs.length > 0 && (
            <span
              title={`${sessionShutdown.reason} · ${todayModelCounts.M0 ?? 0}·M0 / ${todayModelCounts.M1 ?? 0}·M1 / ${todayModelCounts.M2 ?? 0}·M2`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                sessionShutdown.state === "AT_TWO_R_STOP" && "bg-wm-red/15 text-wm-red border-wm-red/40",
                sessionShutdown.state === "AT_THREE_R_TARGET" && "bg-wm-gold/15 text-wm-gold border-wm-gold/40",
                sessionShutdown.state === "OPEN" && "bg-wm-surface text-wm-text border-wm-border",
              )}
            >
              {sessionShutdown.cumulativeR >= 0 ? "+" : ""}{sessionShutdown.cumulativeR.toFixed(2)}R
              {sessionShutdown.state === "AT_TWO_R_STOP" && " · HARD STOP"}
              {sessionShutdown.state === "AT_THREE_R_TARGET" && " · +3R OBJECTIVE"}
              {sessionShutdown.state === "OPEN" && " · session open"}
            </span>
          )}
          {/* Week Edge chip — I-Bkt 3, canon §11 + §21 Week-One. Silent
              when no R-tagged entries this week (nothing to summarize). */}
          {weekEdge.rTaggedEntries > 0 && (
            <span
              title={`Last 7 days · ${weekEdge.rTaggedEntries} R-tagged / ${weekEdge.totalEntries} total · expectancy ${weekEdge.expectancyR?.toFixed(2)}R · max drawdown ${weekEdge.maxDrawdownR.toFixed(2)}R${
                weekEdge.rulesAdheredPct != null ? ` · rules ${(weekEdge.rulesAdheredPct * 100).toFixed(0)}%` : ""
              }`}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-gold/40 bg-wm-gold/10 text-wm-gold"
            >
              WEEK EDGE {weekEdge.expectancyR != null ? `${weekEdge.expectancyR >= 0 ? "+" : ""}${weekEdge.expectancyR.toFixed(2)}R/trade` : "—"}
            </span>
          )}
          {/* Learning Genome chip — canon §9 (Final Helicopter, 2026-08-24).
              Emits a comparative diagnostic only when at least two of the
              four dimensions are measured AND their scores differ. Never
              fabricates a "your weakest area is X" from a single data
              point. Tooltip enumerates the four per-dimension labels. */}
          {weekGenome.headlineWeakness && (
            <button
              type="button"
              onClick={() => setShowGenomePanel(v => !v)}
              aria-pressed={showGenomePanel}
              aria-expanded={showGenomePanel}
              title={showGenomePanel ? "Collapse Learning Genome panel" : `Expand Learning Genome panel. ${[weekGenome.perception.label ?? "perception · not enough data", weekGenome.reasoning.label ?? "reasoning · not enough data", weekGenome.process.label ?? "process · not enough data", weekGenome.transfer.label ?? "transfer · not enough data", ...(weekDrill ? [`DRILL (${weekDrill.stage}): ${weekDrill.drill}`] : [])].join(" · ")}`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                showGenomePanel
                  ? "bg-wm-gold/15 text-wm-gold border-wm-gold/60"
                  : "bg-wm-gold/5 text-wm-gold border-wm-gold/40 hover:bg-wm-gold/10",
              )}
              aria-label={`Learning Genome: ${weekGenome.headlineWeakness}${weekDrill ? `. Prescribed drill: ${weekDrill.drill}` : ""}`}
            >
              GENOME · {weekGenome.headlineWeakness}
              {weekDrill && (
                <span className="ml-1 opacity-75">· {weekDrill.stage}</span>
              )}
              <span className="ml-1">{showGenomePanel ? "▾" : "▸"}</span>
            </button>
          )}
          {/* Misread Map chip — canon §9 Trader Misread Map. Silent when
              no dominant misread (empty week or tie). Dominant surfaces
              the most-common single mistake shape across the 7-day window
              — actionable teach signal that pairs with the Genome chip. */}
          {/* STEWARDSHIP verdict chip — canon §Stewardship. One
              end-of-day answer: HELD / MIXED / BROKEN / (silent
              when INSUFFICIENT_EVIDENCE). Highest-signal chip on
              the header — canon: "Win condition = faithful execution
              and stewardship, not P&L alone." */}
          {todayStewardship.verdict !== "INSUFFICIENT_EVIDENCE" && (
            <span
              title={todayStewardship.reasons.map(r => `${r.message} [${r.canon}]`).join(" · ")}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                todayStewardship.verdict === "HELD" && "bg-wm-green/15 text-wm-green border-wm-green/40",
                todayStewardship.verdict === "MIXED" && "bg-wm-surface text-wm-text border-wm-border",
                todayStewardship.verdict === "BROKEN" && "bg-wm-red/15 text-wm-red border-wm-red/50",
              )}
              aria-label={`Today's stewardship verdict: ${todayStewardship.verdict.toLowerCase()}`}
            >
              STEWARD · {todayStewardship.verdict === "HELD" ? "✓ HELD" : todayStewardship.verdict === "BROKEN" ? "✕ BROKEN" : "MIXED"}
            </span>
          )}
          {/* Recovery-trade tell (canon §Daily Risk): highlights when
              a same-day recovery signature is detected. Silent when 0. */}
          {todayRecovery.candidates.length > 0 && (
            <span
              title={`${todayRecovery.candidates.length} recovery-trade signature${todayRecovery.candidates.length === 1 ? "" : "s"} detected today · canon §Daily Risk: a loss does not create permission for a recovery trade`}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-red/50 bg-wm-red/15 text-wm-red"
              aria-label={`Recovery trade detected: ${todayRecovery.candidates.length} candidate${todayRecovery.candidates.length === 1 ? "" : "s"}`}
            >
              RECOVERY · {todayRecovery.candidates.length}
            </span>
          )}
          {/* PROCESS grade chip — canon §14 Process before P&L.
              Silent until >=3 categories measured today. Color-coded
              by canon grade thresholds. */}
          {todayProcessScore.grade !== "INSUFFICIENT_EVIDENCE" && todayProcessScore.total !== undefined && (
            <span
              title={`Today's Process Score · ${todayProcessScore.total}/${todayProcessScore.measured_categories * 2} across ${todayProcessScore.measured_categories} measured categories · preparation ${todayProcessScore.preparation ?? "—"} · classification ${todayProcessScore.classification ?? "—"} · authorization ${todayProcessScore.authorization ?? "—"} · risk ${todayProcessScore.risk_management ?? "—"} · journal ${todayProcessScore.journal_completion ?? "—"}`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                todayProcessScore.grade === "A_PROCESS" && "bg-wm-gold/15 text-wm-gold border-wm-gold/40",
                todayProcessScore.grade === "B_PROCESS" && "bg-wm-blue/10 text-wm-blue border-wm-blue/30",
                todayProcessScore.grade === "C_PROCESS" && "bg-wm-surface text-wm-text border-wm-border",
                todayProcessScore.grade === "PROCESS_FAILURE" && "bg-wm-red/10 text-wm-red border-wm-red/30",
              )}
              aria-label={`Today's process grade: ${todayProcessScore.grade.replaceAll("_", " ").toLowerCase()}`}
            >
              PROCESS · {todayProcessScore.grade.replace("_PROCESS", "").replace("PROCESS_FAILURE", "FAIL")}
              <span className="ml-1 opacity-75">
                {todayProcessScore.total}/{todayProcessScore.measured_categories * 2}
              </span>
            </span>
          )}
          {/* A-SETUP chip — canon §A-Setup-Only Doctrine. Shows
              "N of M authorized" where N = A/A+ trades and M = non-M0
              live-capital-eligible entries this week. Silent when
              nothing tradeable was logged. */}
          {setupGradeSummary.live_capital_rate !== undefined && (
            <span
              title={`Last 7 days · ${setupGradeSummary.live_capital_qualified} of ${setupGradeSummary.a_plus + setupGradeSummary.a + setupGradeSummary.b_plus + setupGradeSummary.b} non-M0 trades met the A/A+ live-capital threshold · A+ ${setupGradeSummary.a_plus} · A ${setupGradeSummary.a} · B+ ${setupGradeSummary.b_plus} · B ${setupGradeSummary.b} · NO_TRADE ${setupGradeSummary.no_trade}`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                setupGradeSummary.live_capital_rate >= 0.75 && "bg-wm-gold/15 text-wm-gold border-wm-gold/40",
                setupGradeSummary.live_capital_rate < 0.75 && setupGradeSummary.live_capital_rate >= 0.4 && "bg-wm-surface text-wm-text border-wm-border",
                setupGradeSummary.live_capital_rate < 0.4 && "bg-wm-red/10 text-wm-red border-wm-red/30",
              )}
              aria-label={`A-setup rate: ${Math.round(setupGradeSummary.live_capital_rate * 100)}% of tradeable entries met live-capital grade`}
            >
              A-SETUP · {setupGradeSummary.live_capital_qualified}/{setupGradeSummary.a_plus + setupGradeSummary.a + setupGradeSummary.b_plus + setupGradeSummary.b}
              <span className="ml-1 opacity-75">
                ({Math.round(setupGradeSummary.live_capital_rate * 100)}%)
              </span>
            </span>
          )}
          {/* EDGE QUALITY chip — canon §Personal Edge Lab 0-100 composite.
              Silent when index is undefined (no measurable evidence yet).
              Color-graded: ≥70 gold, 40-70 muted, <40 red. */}
          {typeof edgeQuality.index === "number" && (
            <span
              title={`Edge Quality Index · ${edgeQuality.index.toFixed(1)}/100 · measured over ${edgeQuality.sample_size} trades · ${[
                edgeQuality.components.plan_adherence && `plan ${edgeQuality.components.plan_adherence.points.toFixed(1)}/${edgeQuality.components.plan_adherence.max}`,
                edgeQuality.components.capture_efficiency && `capture ${edgeQuality.components.capture_efficiency.points.toFixed(1)}/${edgeQuality.components.capture_efficiency.max}`,
                edgeQuality.components.live_r_capture && `R ${edgeQuality.components.live_r_capture.points.toFixed(1)}/${edgeQuality.components.live_r_capture.max}`,
                edgeQuality.components.classification && `class ${edgeQuality.components.classification.points.toFixed(1)}/${edgeQuality.components.classification.max}`,
              ].filter(Boolean).join(" · ")}`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                edgeQuality.index >= 70 && "bg-wm-gold/15 text-wm-gold border-wm-gold/40",
                edgeQuality.index < 70 && edgeQuality.index >= 40 && "bg-wm-surface text-wm-text border-wm-border",
                edgeQuality.index < 40 && "bg-wm-red/10 text-wm-red border-wm-red/30",
              )}
              aria-label={`Personal Edge Quality Index: ${edgeQuality.index.toFixed(0)} out of 100 over ${edgeQuality.sample_size} trades`}
            >
              EDGE · {edgeQuality.index.toFixed(0)}
              <span className="ml-1 opacity-75">/100</span>
            </span>
          )}
          {/* DAY streak chip — canon §Loss-as-Data. Consecutive
              clean-day count (day-level discipline, complements FOCUS).
              Silent when current is 0. */}
          {dayStreak.current >= 2 && (
            <span
              title={`${dayStreak.current} consecutive clean days · best ${dayStreak.best} · ${dayStreak.days_measured} days measured`}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-green/40 bg-wm-green/5 text-wm-green"
              aria-label={`Rule-adherence day streak: ${dayStreak.current} clean days in a row`}
            >
              DAYS · {dayStreak.current}
              {dayStreak.best > dayStreak.current && (
                <span className="ml-1 opacity-75">/ best {dayStreak.best}</span>
              )}
            </span>
          )}
          {/* FOCUS streak chip — canon §Public Blessing. Silent when
              the current streak is 0 (no fabricated encouragement). */}
          {focusStreak.current >= 3 && (
            <span
              title={`${focusStreak.current} consecutive plan-followed trades this week (best ${focusStreak.best})`}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-green/40 bg-wm-green/10 text-wm-green"
              aria-label={`Focus streak: ${focusStreak.current} plan-followed trades in a row`}
            >
              FOCUS · {focusStreak.current}
              {focusStreak.best > focusStreak.current && (
                <span className="ml-1 opacity-75">/ best {focusStreak.best}</span>
              )}
            </span>
          )}
          {/* Genome trend chip — canon §9 "distinguish skill from luck".
              Two arrows: ▲ most_improved (green) + ▼ most_degraded (red).
              Silent when neither moved past the noise threshold. */}
          {(weekTrend.most_improved || weekTrend.most_degraded) && (
            <span
              title={[
                weekTrend.perception.delta != null ? `perception ${weekTrend.perception.delta >= 0 ? "+" : ""}${(weekTrend.perception.delta * 100).toFixed(0)}%` : `perception ${weekTrend.perception.direction.toLowerCase()}`,
                weekTrend.reasoning.delta != null ? `reasoning ${weekTrend.reasoning.delta >= 0 ? "+" : ""}${(weekTrend.reasoning.delta * 100).toFixed(0)}%` : `reasoning ${weekTrend.reasoning.direction.toLowerCase()}`,
                weekTrend.process.delta != null ? `process ${weekTrend.process.delta >= 0 ? "+" : ""}${(weekTrend.process.delta * 100).toFixed(0)}%` : `process ${weekTrend.process.direction.toLowerCase()}`,
                weekTrend.transfer.delta != null ? `transfer ${weekTrend.transfer.delta >= 0 ? "+" : ""}${weekTrend.transfer.delta.toFixed(2)}R` : `transfer ${weekTrend.transfer.direction.toLowerCase()}`,
              ].join(" · ")}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-border bg-wm-surface text-wm-text-muted"
              aria-label={`Week-over-week: ${weekTrend.most_improved ? `${weekTrend.most_improved.toLowerCase()} improving` : ""}${weekTrend.most_improved && weekTrend.most_degraded ? ", " : ""}${weekTrend.most_degraded ? `${weekTrend.most_degraded.toLowerCase()} degrading` : ""}`}
            >
              TREND
              {weekTrend.most_improved && (
                <span className="ml-1 text-wm-green">▲ {weekTrend.most_improved}</span>
              )}
              {weekTrend.most_degraded && (
                <span className="ml-1 text-wm-red">▼ {weekTrend.most_degraded}</span>
              )}
            </span>
          )}
          {weekMisread.dominant && weekMisread.dominant !== "CLEAN" && (
            <button
              type="button"
              onClick={() => setFilterMisread(prev => prev === weekMisread.dominant ? "all" : (weekMisread.dominant ?? "all"))}
              aria-pressed={filterMisread === weekMisread.dominant}
              title={`Click to filter journal to ${weekMisread.dominant.replaceAll("_", " ").toLowerCase()} trades only. Last 7 days · ${weekMisread.sample_size} trades · MISSED_SETUP ${weekMisread.counts.MISSED_SETUP} · BROKE_PROCESS ${weekMisread.counts.BROKE_PROCESS} · POOR_MANAGEMENT ${weekMisread.counts.POOR_MANAGEMENT} · FULL_STOP_LOSS ${weekMisread.counts.FULL_STOP_LOSS} · UNRESOLVED ${weekMisread.counts.UNRESOLVED_PROCESS} · CLEAN ${weekMisread.counts.CLEAN}`}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                filterMisread === weekMisread.dominant
                  ? "bg-wm-red/25 text-wm-red border-wm-red/60"
                  : "bg-wm-red/10 text-wm-red border-wm-red/40 hover:bg-wm-red/20",
              )}
            >
              MISREAD · {weekMisread.dominant.replaceAll("_", " ")}
              <span className="ml-1 opacity-75">
                {weekMisread.counts[weekMisread.dominant]}/{weekMisread.sample_size}
              </span>
              {filterMisread === weekMisread.dominant && <span className="ml-1">✕</span>}
            </button>
          )}
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
          {/* I-Bkt 7: day-model filter chips per canon §3. Silent
              on-screen when a specific Mx is selected + no entries
              match — the existing "No entries found" empty state
              handles the message. */}
          {(["all", "M0", "M1", "M2"] as const).map(m => (
            <button
              key={m}
              onClick={() => setFilterDayModel(m)}
              aria-pressed={filterDayModel === m}
              className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                filterDayModel === m && m !== "all" && "bg-wm-gold/20 text-wm-gold border-wm-gold/40",
                filterDayModel === m && m === "all" && "bg-wm-surface text-wm-text border-wm-border",
                filterDayModel !== m && "text-wm-text-muted border-transparent hover:border-wm-border",
              )}
              title={m === "all" ? "Show all days" : m === "M0" ? "Show no-trade days" : m === "M1" ? "Show trend-expansion days" : "Show chop-rotation days"}
            >
              {m === "all" ? "All Models" : m}
            </button>
          ))}
          {/* J-Bkt 9: starred-only filter chip. */}
          <button
            onClick={() => setFilterStarred(v => !v)}
            aria-pressed={filterStarred}
            title={filterStarred ? "Show all entries" : "Show only starred entries"}
            className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
              filterStarred ? "bg-wm-gold/25 text-wm-gold border-wm-gold/50" : "text-wm-text-muted border-transparent hover:border-wm-border",
            )}
          >
            ★ Starred
          </button>
          {/* I-Bkt 14: contract-type filter chips (canon §6 Contract Lens). */}
          {(["all", "stock", "option"] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterContract(c)}
              aria-pressed={filterContract === c}
              className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                filterContract === c && c === "option" && "bg-wm-purple/20 text-wm-purple border-wm-purple/40",
                filterContract === c && c === "stock" && "bg-wm-surface text-wm-text border-wm-border",
                filterContract === c && c === "all" && "bg-wm-surface text-wm-text border-wm-border",
                filterContract !== c && "text-wm-text-muted border-transparent hover:border-wm-border",
              )}
              title={c === "all" ? "Stock + option entries" : c === "stock" ? "Only stock entries" : "Only option entries (100x multiplier)"}
            >
              {c === "all" ? "All Contracts" : c === "option" ? "OPT" : "STK"}
            </button>
          ))}
          {/* J-Bkt 11: reset filters — hidden when nothing is filtered. */}
          {(filterRes !== "all" || filterProcessOutcome !== "all" || filterDayModel !== "all" || filterContract !== "all" || filterStarred || filterTag) && (
            <button
              onClick={() => {
                setFilterRes("all");
                setFilterProcessOutcome("all");
                setFilterDayModel("all");
                setFilterContract("all");
                setFilterStarred(false);
                setFilterTag("");
              }}
              title="Clear every active filter"
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-wm-red/40 bg-wm-red/10 text-wm-red hover:bg-wm-red/20 transition-colors"
            >
              ✕ Reset filters
            </button>
          )}
          <button onClick={exportCSV}
            title="Export all journal entries as CSV (22 columns incl. all Proof Lane fields)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border border-wm-border transition-colors">
            <Download size={11} /> CSV
          </button>
          <button onClick={exportJSON}
            title="Export all journal entries as versioned JSON (machine-readable backup)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border border-wm-border transition-colors">
            <Download size={11} /> JSON
          </button>
          <button onClick={exportGenome}
            title="Export your Learning Genome bundle — dimensions, drill, misread map, trend — as versioned JSON (canon §9 Public Blessing)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-wm-gold hover:bg-wm-gold/10 border border-wm-gold/40 transition-colors">
            <Download size={11} /> Genome
          </button>
          <button onClick={() => { setNewMode(true); setSelected(null); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-wm-black transition-all hover:opacity-90"
            style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}>
            <Plus size={12} /> New Entry
          </button>
        </div>
      </div>

      {/* Learning Genome full-view panel — expanded via the GENOME chip.
          Silent until the trader clicks the chip; then the four-dim
          breakdown, drill card, and misread map render in one look. */}
      {mainTab === "journal" && showGenomePanel && weekGenome.headlineWeakness && (
        <div className="px-4 pt-3 pb-2 border-b border-wm-border bg-wm-dark/40">
          <LearningGenomeInspector
            genome={weekGenome}
            drill={weekDrill}
            misread={weekMisread}
            trend={weekTrend}
          />
        </div>
      )}

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
                <div className="text-xs font-black text-wm-text">Strategy Lyric Templates</div>
                <div className="text-[9px] text-wm-text-dim">Generated locally from fixed templates — no AI service is called.</div>
                <div className="text-[9px] text-[#7C3AED] font-bold">+100 WM$ per song generated</div>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1.5 font-bold">Trading Topic</label>
              <div className="grid grid-cols-2 gap-1">
                {["smart money","order flow","wyckoff","NQ futures","risk management","discipline","trading journal","creator mindset"].map(t => (
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

      {/* Personal Edge chip — one-line summary of where this trader
          performs well. Renders nothing when no decisions yet. */}
      {mainTab === "journal" && journalSnapshots.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(139,106,41,0.15)" }}>
          <PersonalEdgeChip vm={personalEdgeVm} />
        </div>
      )}

      {/* Today's intention — closes the Prep → Decision → Review loop.
          When today's morning-prep entry exists, we show what the trader
          set out to do BEFORE the day started. When none exists, this
          renders nothing (silence-is-a-feature; never a fabricated
          "no plan" scold). Founder Aug-14 §14 explicit ask. */}
      {mainTab === "journal" && <TodayIntentStrip userId={authCtx?.user?.id ?? null} />}

      {/* Process-outcome quadrant strip — the founder-canon separation of
          'GOOD PROCESS + LOSING OUTCOME' from 'BAD PROCESS + WINNING
          OUTCOME'. classifyProcessOutcome() has produced these four
          buckets per entry for a while, but the aggregate distribution
          was never surfaced above the entry list. Now the trader can
          see the discipline pattern (e.g. '3 DANGEROUS WINS this week
          — those wins are luck, not edge') at a glance. Silent when
          no entries have a resolved process outcome (never fabricates). */}
      {mainTab === "journal" && entries.length > 0 && (
        <ProcessOutcomeStrip
          entries={entries}
          selected={filterProcessOutcome === "all" ? null : filterProcessOutcome}
          onSelect={(bucket) => setFilterProcessOutcome(bucket ?? "all")}
        />
      )}

      {/* Mirror — retrospective behavioral patterns from the journal.
          Renders NOTHING when no patterns detected (silence-is-a-feature).
          Populates automatically as journal entries accumulate. */}
      {mainTab === "journal" && mirrorVm.patterns.length > 0 && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(139,106,41,0.25)" }}>
          <MirrorPanel vm={mirrorVm} />
        </div>
      )}

      {/* ── Journal body ─────────────────────────────────────── */}
      {mainTab === "journal" && <div className="wm-journal-body" style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Left: list */}
        <div className={clsx(
          "wm-journal-list w-80 border-r border-wm-border flex flex-col shrink-0 overflow-hidden",
          (selected || newMode) && "wm-mobile-hidden",
        )}>
          <div className="wm-mobile-only border-b border-wm-border p-2">
            <button
              type="button"
              onClick={() => { setNewMode(true); setSelected(null); }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-wm-green text-xs font-bold text-wm-black"
            >
              <Plus size={15} aria-hidden="true" /> New journal entry
            </button>
          </div>
          {linkedFilterActive && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-2 border-b border-wm-border px-2 py-2"
            >
              <span className="text-[10px] font-semibold text-wm-gold">
                Linked decisions · {linkedMatchCount} found
              </span>
              <button
                type="button"
                onClick={() => router.replace(withoutLinkedDecisions(searchParams.toString()))}
                className="min-h-11 rounded-lg border border-wm-border px-3 text-[10px] font-bold text-wm-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
              >
                Clear linked filter
              </button>
            </div>
          )}
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
                <span className="text-xs">
                  {linkedFilterActive ? "No linked decisions found" : "No entries found"}
                </span>
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
                    {/* Proof Lane §21 read-side (H-Bkt 6): render Model + R
                        + option-multiplier chips when the entry carries them
                        so a review scan shows canon-shaped truth, not just
                        dollar P&L. Silent when the entry pre-dates the
                        Proof Lane fields (legacy entries look identical). */}
                    {(e.dayModel || typeof e.realizedR === "number" || e.contractType === "option") && (
                      <div className="flex items-center gap-1 mt-1">
                        {e.dayModel && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border border-wm-gold/40 bg-wm-gold/10 text-wm-gold">{e.dayModel}</span>
                        )}
                        {typeof e.realizedR === "number" && Number.isFinite(e.realizedR) && (
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border",
                            e.realizedR >= 0 ? "text-wm-green border-wm-green/40 bg-wm-green/10" : "text-wm-red border-wm-red/40 bg-wm-red/10",
                          )}>
                            {e.realizedR >= 0 ? "+" : ""}{e.realizedR.toFixed(2)}R
                          </span>
                        )}
                        {e.contractType === "option" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border border-wm-purple/40 bg-wm-purple/10 text-wm-purple">OPT</span>
                        )}
                      </div>
                    )}
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
        <div className={clsx(
          "wm-journal-detail flex-1 overflow-y-auto p-4",
          !selected && !newMode && "wm-mobile-hidden",
        )} style={{ scrollbarWidth:"thin" }}>
          <button
            type="button"
            onClick={() => { setSelected(null); setNewMode(false); }}
            className="wm-mobile-only mb-3 min-h-11 items-center gap-2 rounded-lg border border-wm-border px-3 text-xs font-bold text-wm-text-muted"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Back to journal
          </button>

          {/* Placeholder */}
          {!selected && !newMode && (
            <div className="flex min-h-full flex-col items-center justify-center gap-4 py-6 text-wm-text-muted">
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
              <div style={{ width: "100%", maxWidth: 460, marginTop: 8 }}>
                <FabioInsights variant="inline" surface="journal" title="WM Playbook — Before You Trade" limit={3} />
              </div>
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
                  <div className="mt-1 text-[10px] font-semibold text-wm-gold">
                    {PROCESS_OUTCOME_LABELS[selected.processOutcome ?? "UNRESOLVED"]}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={clsx("text-xl font-black", selected.pnl >= 0 ? "text-wm-green" : "text-wm-red")}>
                    {fmtPnl(selected.pnl)}
                  </div>
                  <button
                    onClick={() => setEntries(e => e.map(x => x.id === selected.id ? { ...x, starred:!x.starred } : x))}
                    aria-label={selected.starred ? `Unstar ${selected.symbol} entry` : `Star ${selected.symbol} entry`}
                    aria-pressed={selected.starred}
                    className="inline-flex items-center justify-center rounded hover:bg-wm-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Star size={16} className={selected.starred ? "text-wm-gold fill-wm-gold" : "text-wm-text-muted"} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => {
                      // Journal entries are the durable record of a real trade.
                      // Deletion is irreversible (no server tier + no undo). The
                      // trash icon sits right next to Star with a 22px hit box —
                      // require an explicit confirmation naming what will be lost.
                      const label = `${selected.date} · ${selected.symbol} ${selected.side.toUpperCase()} (${fmtPnl(selected.pnl)})`;
                      if (!window.confirm(`Permanently delete this journal entry?\n\n${label}\n\nThis cannot be undone.`)) return;
                      setEntries(e => e.filter(x => x.id !== selected.id));
                      setSelected(null);
                    }}
                    aria-label={`Delete ${selected.symbol} journal entry (requires confirmation)`}
                    className="inline-flex items-center justify-center rounded hover:bg-wm-surface transition-colors text-wm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
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

              {/* Proof Lane detail block — I-Bkt 1 (+J-Bkt 10 MFE/MAE/Capture): mirrors the modal's Proof
                  Lane strip in read-only form so a pro-trader review sees
                  Model / Planned R $ / Realized R / Contract type / MFE /
                  MAE / Capture % together with the standard OHLCV stats.
                  Silent for legacy entries. */}
              {(selected.dayModel || typeof selected.plannedRDollars === "number" || selected.contractType === "option" || typeof selected.mfeR === "number") && (
                <div className="mb-4 rounded-xl border border-wm-gold/40 bg-gradient-to-br from-wm-surface/50 to-transparent p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wm-gold">Proof Lane · Trade R Truth</div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-wm-text-dim">CANON §3 / §4 / §6 / §7 / §24</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selected.dayModel && (
                      <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Model</div>
                        <div className="text-sm font-mono font-bold text-wm-gold mt-0.5">{selected.dayModel}</div>
                      </div>
                    )}
                    {typeof selected.plannedRDollars === "number" && selected.plannedRDollars > 0 && (
                      <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Planned R</div>
                        <div className="text-sm font-mono font-bold text-wm-text mt-0.5">
                          ${selected.plannedRDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                    {typeof selected.realizedR === "number" && Number.isFinite(selected.realizedR) && (
                      <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Realized R</div>
                        <div className={clsx(
                          "text-sm font-mono font-bold mt-0.5",
                          selected.realizedR >= 0 ? "text-wm-green" : "text-wm-red",
                        )}>
                          {selected.realizedR >= 0 ? "+" : ""}{selected.realizedR.toFixed(2)}R
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                      <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Contract</div>
                      <div className={clsx(
                        "text-sm font-mono font-bold mt-0.5",
                        selected.contractType === "option" ? "text-wm-purple" : "text-wm-text",
                      )}>
                        {selected.contractType === "option" ? "OPTION · 100x" : "STOCK"}
                      </div>
                    </div>
                  </div>
                  {(typeof selected.mfeR === "number" || typeof selected.maeR === "number") && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {typeof selected.mfeR === "number" && Number.isFinite(selected.mfeR) && (
                        <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                          <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">MFE</div>
                          <div className="text-sm font-mono font-bold text-wm-green mt-0.5">
                            +{selected.mfeR.toFixed(2)}R
                          </div>
                        </div>
                      )}
                      {typeof selected.maeR === "number" && Number.isFinite(selected.maeR) && (
                        <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                          <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">MAE</div>
                          <div className="text-sm font-mono font-bold text-wm-red mt-0.5">
                            {selected.maeR.toFixed(2)}R
                          </div>
                        </div>
                      )}
                      {(() => {
                        const cap = captureEfficiency({ realizedR: selected.realizedR, mfeR: selected.mfeR });
                        if (cap === undefined) return null;
                        return (
                          <div className="rounded-lg border border-wm-border bg-wm-surface/60 p-2 text-center">
                            <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Capture %</div>
                            <div className={clsx(
                              "text-sm font-mono font-bold mt-0.5",
                              cap >= 0 ? "text-wm-gold" : "text-wm-red",
                            )}>
                              {(cap * 100).toFixed(0)}%
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <p className="mt-2 text-[9px] text-wm-text-dim">
                    R and contract-return % are separate measurements. Capture % = realizedR / MFE (canon §7). See {selected.contractType === "option" ? "canon §6 Contract Lens + §7 Management Studio + §24 R math" : "canon §4 + §7"}.
                  </p>
                  {/* Setup Grade WHY-layer — canon §A-Setup + §WHY?.
                      Renders the specific canonical reasons the grade
                      landed where it did, each with severity color. */}
                  {(() => {
                    const explained = selectSetupGradeReasons({
                      dayModel: selected.dayModel,
                      plannedR: selected.realizedR,
                      processQuality: selected.processQuality,
                    });
                    if (explained.reasons.length === 0) return null;
                    return (
                      <div className="mt-3 rounded-lg border border-wm-gold/30 bg-wm-black/40 p-2">
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-wm-gold">
                            Setup Grade · {explained.grade.replace("_PLUS", "+").replace("_", " ")}
                          </div>
                          <div className="text-[9px] font-mono text-wm-text-dim">canon §A-Setup / §WHY?</div>
                        </div>
                        <ul className="space-y-1">
                          {explained.reasons.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-[10px] leading-snug">
                              <span className={clsx(
                                "shrink-0 mt-[3px] inline-block w-1.5 h-1.5 rounded-full",
                                r.severity === "PASS" && "bg-wm-green",
                                r.severity === "WARN" && "bg-wm-gold",
                                r.severity === "FAIL" && "bg-wm-red",
                              )} aria-hidden="true" />
                              <span className="text-wm-text">
                                {r.message}
                                <span className="ml-1 text-wm-text-dim font-mono">[{r.canon}]</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              )}

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

              {/* ── Nectar snapshot @ journal — REMEMBER→REFLECT bridge ───
                  Founder OVERRIDE §10: closes the loop hop between what WM
                  observed (Nectar) and what the trader reflects on (Journal).
                  Only rendered for entries CREATED after this ships (older
                  entries have no snapshot). Zero fabrication — null means
                  nothing observed at journal-creation, and we say so. */}
              {selected.nectarSnapshot === null && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-wm-text-muted mb-1.5">Market Evidence at Journal Time</div>
                  <div className="rounded-lg border border-wm-border/60 bg-wm-surface/40 p-3 text-xs text-wm-text-dim italic">
                    No market observations for {selected.symbol} were available when this entry was logged.
                  </div>
                </div>
              )}
              {selected.nectarSnapshot && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-wm-text-muted mb-1.5 flex items-center gap-2">
                    Market Evidence at Journal Time
                    <span className="text-[9px] text-wm-text-dim font-normal">captured {new Date(selected.nectarSnapshot.capturedAtMs).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).toLowerCase()}</span>
                  </div>
                  <div className="rounded-lg border border-wm-gold/25 bg-wm-gold/5 p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Trades</div>
                        <div className="text-sm font-mono font-bold text-wm-text" style={{ fontVariantNumeric: "tabular-nums" }}>{selected.nectarSnapshot.tradeCount.toLocaleString("en-US")}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Δ</div>
                        <div className={clsx("text-sm font-mono font-bold", selected.nectarSnapshot.delta >= 0 ? "text-wm-green" : "text-wm-red")} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {selected.nectarSnapshot.delta >= 0 ? "+" : ""}{Math.round(selected.nectarSnapshot.delta).toLocaleString("en-US")}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Big Trades</div>
                        <div className="text-sm font-mono font-bold text-wm-text" style={{ fontVariantNumeric: "tabular-nums" }}>{selected.nectarSnapshot.bigTradeCount.toLocaleString("en-US")}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Channels</div>
                        <div className="text-sm font-mono font-bold text-wm-text" style={{ fontVariantNumeric: "tabular-nums" }}>{selected.nectarSnapshot.channels}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-wm-gold/15 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-wm-text-muted">
                      {selected.nectarSnapshot.horizonSec && (
                        <span>Observed since {new Date(selected.nectarSnapshot.horizonSec * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      )}
                      {selected.nectarSnapshot.lastTradeAtMs && (
                        <span>Last trade {new Date(selected.nectarSnapshot.lastTradeAtMs).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      )}
                    </div>
                    {/* Return to the canonical public workspace while the
                        private snapshot owner remains unchanged. */}
                    <div className="mt-3 pt-2 border-t border-wm-gold/15 flex flex-wrap items-center gap-2">
                      <a
                        href={`/command-deck?symbol=${encodeURIComponent(selected.symbol)}`}
                        aria-label={`Open current market evidence for ${selected.symbol}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-wm-gold hover:text-wm-gold/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold rounded px-2 py-1"
                        style={{ minHeight: 44 }}
                      >
                        Open current evidence →
                      </a>
                    </div>
                  </div>
                </div>
              )}
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
                {/* I-Bkt 5: canon §3 M0 = NO TRADE. When the trader
                    classifies today as M0, hide the order fields and
                    label them clearly disabled. Founder can still log a
                    reflective "no-trade day" record with notes + mood
                    without fabricating an entry/exit/size that never
                    happened. */}
                {form.dayModel === "M0" ? (
                  <div className="col-span-2 rounded-lg border border-wm-gold/25 bg-wm-gold/5 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wm-gold mb-1">M0 · No Trade</div>
                    <p className="text-[11px] text-wm-text leading-snug">
                      Entry / Exit / Size / Planned R are not applicable — canon §3 M0 is capital preservation.
                      Use the notes below to record what you observed and why no setup was authorized. Realized R will be recorded as undefined.
                    </p>
                  </div>
                ) : (
                  ([
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
                  ))
                )}
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

              {/* Proof Lane §21 — Day Model + Planned R. Founder canon §3/§4.
                  Optional so old entries load, but presented prominently so
                  the live-launch trader is nudged to classify + define 1R
                  before saving. Live-computed R shown for feedback. */}
              <div className="mb-4 rounded-xl border border-wm-gold/40 bg-gradient-to-br from-wm-surface/50 to-transparent p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-wm-gold">Proof Lane · Day Model + R</div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-wm-text-dim">CANON §3 / §4 / §6 / §24</span>
                </div>
                {/* Contract type — canon §6 Contract Lens. Options carry a
                    100x multiplier. Wrong multiplier = wrong P&L = wrong R. */}
                <div className="mb-3">
                  <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Contract Type</label>
                  <div className="flex gap-2">
                    {(["stock", "option"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, contractType: t }))}
                        aria-pressed={form.contractType === t}
                        className={clsx(
                          "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                          form.contractType === t
                            ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40"
                            : "bg-wm-surface border-wm-border text-wm-text-muted",
                        )}
                      >
                        {t.toUpperCase()}{t === "option" && " · 100x"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3">
                  {(["M0", "M1", "M2"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(current => ({ ...current, dayModel: m }))}
                      aria-pressed={form.dayModel === m}
                      className={clsx(
                        "min-h-11 rounded-lg border p-2 text-left transition-colors",
                        form.dayModel === m
                          ? "border-wm-gold/60 bg-wm-gold/10"
                          : "border-wm-border bg-wm-surface hover:border-wm-gold/30",
                      )}
                    >
                      <span className="block text-[11px] font-bold text-wm-text">{m}</span>
                      <span className="block text-[9px] leading-snug text-wm-text-dim">{DAY_MODEL_LABELS[m]}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Planned R (1R = $)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.plannedRDollars ?? ""}
                      onChange={e => setForm(f => ({ ...f, plannedRDollars: parseFloat(e.target.value) || undefined }))}
                      placeholder="Define 1R BEFORE entry"
                      className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-gold/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">Realized R (auto)</label>
                    <div className="w-full bg-wm-surface/60 border border-wm-border rounded-lg px-3 py-2 text-sm font-mono min-h-[38px] flex items-center">
                      {(() => {
                        const p = form.plannedRDollars;
                        const entryV = form.entry ?? 0;
                        const exitV = form.exit ?? 0;
                        const sizeV = form.size ?? 0;
                        if (!(p && p > 0)) return <span className="text-wm-text-dim text-[10px]">R undefined — set Planned R first</span>;
                        if (!(entryV > 0 && exitV > 0 && sizeV > 0)) return <span className="text-wm-text-dim text-[10px]">Awaiting entry/exit/size</span>;
                        // Same state-matrix-tested pure selector as saveEntry.
                        const r = computeJournalRealizedR({
                          entry: entryV, exit: exitV, size: sizeV,
                          side: form.side ?? "long", contractType: form.contractType,
                          plannedRDollars: p,
                        });
                        if (r === undefined) return <span className="text-wm-text-dim text-[10px]">R undefined</span>;
                        return (
                          <span className={clsx("font-bold", r >= 0 ? "text-wm-green" : "text-wm-red")}>
                            {r >= 0 ? "+" : ""}{r.toFixed(2)}R
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[9px] text-wm-text-dim">
                  R is separate from contract-return %. Canon §24 example: $100 contract with $20 Planned R and +$100 P&amp;L = +5R AND +100% contract return — record both, conflate neither.
                </p>
                {/* J-Bkt 6: MFE / MAE (canon §7 Management Studio).
                    Optional — the trader observes the max favorable /
                    max adverse excursion during the trade in R units.
                    Enables capture-efficiency review across a sample. */}
                {form.dayModel !== "M0" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">MFE (R)  — max favorable</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 2.0"
                        value={form.mfeR ?? ""}
                        onChange={e => setForm(f => ({ ...f, mfeR: parseFloat(e.target.value) || undefined }))}
                        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-gold/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-wm-text-dim uppercase mb-1 block">MAE (R) — max adverse</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. -0.4"
                        value={form.maeR ?? ""}
                        onChange={e => setForm(f => ({ ...f, maeR: parseFloat(e.target.value) || undefined }))}
                        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-red/50 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Canon §17 MENTAL GATE — 4 pre-trade self-checks.
                  Not gated (canon: the trader is authoritative), but
                  the verdict is visible so a WAIT answer is honest.
                  Silent when M0 (no trade to gate). */}
              {form.dayModel !== "M0" && (
                <div className={clsx(
                  "mb-4 rounded-xl border p-3",
                  mentalGateResult.verdict === "PASS" && "border-wm-green/40 bg-wm-green/5",
                  mentalGateResult.verdict === "WAIT" && "border-wm-red/40 bg-wm-red/5",
                  mentalGateResult.verdict === "INSUFFICIENT_INPUT" && "border-wm-border bg-wm-surface/40",
                )}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wm-text-dim">
                      Mental Gate · canon §17
                    </div>
                    <div className={clsx(
                      "text-[10px] font-bold",
                      mentalGateResult.verdict === "PASS" && "text-wm-green",
                      mentalGateResult.verdict === "WAIT" && "text-wm-red",
                      mentalGateResult.verdict === "INSUFFICIENT_INPUT" && "text-wm-text-dim",
                    )}>
                      {mentalGateResult.verdict === "PASS" && "✓ ACTION AUTHORIZED"}
                      {mentalGateResult.verdict === "WAIT" && "✕ WAIT"}
                      {mentalGateResult.verdict === "INSUFFICIENT_INPUT" && `${4 - mentalGateResult.unanswered.length}/4 answered`}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {([
                      ["calmAndClear", "Am I calm and clear enough to follow the plan?"],
                      ["takenIfAlreadyAhead", "Would I take this same setup if I were already ahead today?"],
                      ["skippedIfClcFailed", "Would I still skip it if CLC failed?"],
                      ["drivenByEvidenceNotNeed", "Is this evidence, not need?"],
                    ] as const).map(([key, prompt]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[10px] text-wm-text flex-1">{prompt}</span>
                        <button
                          type="button"
                          onClick={() => setMentalGate(g => ({ ...g, [key]: true }))}
                          aria-pressed={mentalGate[key] === true}
                          className={clsx(
                            "min-h-8 min-w-11 rounded-md border px-2 text-[10px] font-bold transition-colors",
                            mentalGate[key] === true
                              ? "border-wm-green/50 bg-wm-green/15 text-wm-green"
                              : "border-wm-border bg-wm-surface text-wm-text-muted hover:border-wm-green/30",
                          )}
                        >Yes</button>
                        <button
                          type="button"
                          onClick={() => setMentalGate(g => ({ ...g, [key]: false }))}
                          aria-pressed={mentalGate[key] === false}
                          className={clsx(
                            "min-h-8 min-w-11 rounded-md border px-2 text-[10px] font-bold transition-colors",
                            mentalGate[key] === false
                              ? "border-wm-red/50 bg-wm-red/15 text-wm-red"
                              : "border-wm-border bg-wm-surface text-wm-text-muted hover:border-wm-red/30",
                          )}
                        >No</button>
                      </div>
                    ))}
                  </div>
                  {mentalGateResult.reason && mentalGateResult.verdict !== "PASS" && (
                    <p className="mt-2 text-[10px] text-wm-text-muted italic leading-snug">{mentalGateResult.reason}</p>
                  )}
                </div>
              )}
              <div className="mb-4 rounded-xl border border-wm-border bg-wm-surface/40 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-wm-text-dim">Process quality — separate from P&amp;L</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    ["FOLLOWED_PLAN", "Followed plan", "Rules, risk, and management were honored."],
                    ["BROKE_RULES", "Broke rules", "A declared process rule was not followed."],
                    ["UNRESOLVED", "Unresolved", "Not enough evidence to grade process yet."],
                  ] as const).map(([value, label, detail]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(current => ({ ...current, processQuality: value }))}
                      aria-pressed={form.processQuality === value}
                      className={clsx(
                        "min-h-11 rounded-lg border p-2 text-left transition-colors",
                        form.processQuality === value
                          ? "border-wm-gold/60 bg-wm-gold/10"
                          : "border-wm-border bg-wm-surface hover:border-wm-gold/30",
                      )}
                    >
                      <span className="block text-[11px] font-bold text-wm-text">{label}</span>
                      <span className="block text-[9px] leading-snug text-wm-text-dim">{detail}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-wm-text-dim">Profit does not prove good execution. Loss does not prove bad execution.</p>
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
