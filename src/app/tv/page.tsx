"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Tv, Hash, Video, MonitorUp,
  Radio, Send, Eye, Podcast, Brain, Dumbbell, Timer, Sparkles, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

// Real multi-user broadcast room (LiveKit SFU). ssr:false — it touches
// browser media APIs and must never render on the server.
const LiveRoom = dynamic(() => import("@/components/lounge/LiveRoom"), { ssr: false });

/* ── Channel model ──────────────────────────────────────── */
type TextChannel  = { id: string; name: string; topic: string };
type StageChannel = { id: string; name: string; kind: "live" | "podcast" };

const STAGE_CHANNELS: StageChannel[] = [
  { id: "live-room",     name: "Live Room",      kind: "live"    },
  { id: "podcast-stage", name: "Podcast Stage",  kind: "podcast" },
];

const BRAIN_FITNESS_ID = "brain-fitness";

const TEXT_CHANNELS: TextChannel[] = [
  { id: "general",          name: "general",           topic: "Community hub — say hi 👋" },
  { id: "live-chat",        name: "live-chat",         topic: "Chat alongside the Live Room" },
  { id: "spy-analysis",     name: "spy-analysis",      topic: "SPY / ES levels, setups & reviews" },
  { id: "tsla-analysis",    name: "tsla-analysis",     topic: "TSLA structure, catalysts & flow" },
  { id: "futures",          name: "futures",           topic: "ES · NQ · CL · GC futures desk" },
  { id: "swing-trades",     name: "swing-trades",      topic: "Multi-day swing ideas & journals" },
  { id: "learning-videos",  name: "learning-videos",   topic: "Recorded lessons & breakdowns" },
  { id: "scripts-and-bots", name: "scripts-and-bots",  topic: "Pine scripts, bots & automation" },
  { id: "earnings-calendar",name: "earnings-calendar", topic: "Upcoming reports & report schedule" },
];

type ChatMsg = { id: string; author: string; color: string; body: string; ts: number };

const SEED: Record<string, ChatMsg[]> = {
  "spy-analysis": [
    { id: "s1", author: "SpaidSnipes", color: "#4FA3E0", body: "SPY holding the VWAP reclaim from the open — watching 548 as the pivot.", ts: Date.now() - 1000 * 60 * 42 },
    { id: "s2", author: "TapeReader",  color: "#F0B429", body: "Big buy imbalance on the last 5m. Delta flipped green.", ts: Date.now() - 1000 * 60 * 30 },
  ],
  general: [
    { id: "g1", author: "WealthyMindsets", color: "#00D4AA", body: "Welcome to Wealthy Mindsets TV 📺 — jump into the Live Room to screen share or start a podcast.", ts: Date.now() - 1000 * 60 * 120 },
  ],
};

/* ── Page ───────────────────────────────────────────────── */
export default function WMTVPage() {
  const [activeId, setActiveId] = useState<string>("live-room");
  const activeStage = STAGE_CHANNELS.find(c => c.id === activeId) || null;
  const activeText  = TEXT_CHANNELS.find(c => c.id === activeId) || null;

  return (
    <div className="flex h-full bg-wm-black overflow-hidden">
      {/* ── Channel sidebar ─────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-wm-border bg-wm-dark flex flex-col">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-wm-border">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #FF4D6A 100%)" }}
          >
            <Tv size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-wm-text truncate">Wealthy Mindsets TV</p>
            <p className="text-[9px] text-wm-text-muted flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-wm-red animate-pulse" /> ON AIR · Channel Guide
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Live / Voice */}
          <p className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-wm-text-muted">📺 On Air</p>
          {STAGE_CHANNELS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                activeId === c.id ? "bg-wm-black text-wm-text" : "text-wm-text-muted hover:bg-wm-black/50"
              }`}
            >
              {c.kind === "live" ? <Radio size={13} className="text-wm-red shrink-0" /> : <Podcast size={13} className="text-wm-purple shrink-0" />}
              <span className="text-xs font-bold truncate">{c.name}</span>
              {c.kind === "live" && <span className="ml-auto text-[8px] font-black text-wm-red">LIVE</span>}
            </button>
          ))}

          {/* Brain Fitness */}
          <p className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-wider text-wm-text-muted">🧠 Brain Fitness</p>
          <button
            onClick={() => setActiveId(BRAIN_FITNESS_ID)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              activeId === BRAIN_FITNESS_ID ? "bg-wm-black text-wm-text" : "text-wm-text-muted hover:bg-wm-black/50"
            }`}
          >
            <Brain size={13} className="text-wm-green shrink-0" />
            <span className="text-xs font-bold truncate">Brain Fitness</span>
            <span className="ml-auto text-[8px] font-black text-wm-green">NEW</span>
          </button>

          {/* Text */}
          <p className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-wider text-wm-text-muted">💬 Channels</p>
          {TEXT_CHANNELS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                activeId === c.id ? "bg-wm-black text-wm-text" : "text-wm-text-muted hover:bg-wm-black/50"
              }`}
            >
              <Hash size={13} className="shrink-0" />
              <span className="text-xs font-medium truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeId === BRAIN_FITNESS_ID ? <BrainFitnessChannel />
          : activeStage ? <LiveStage key={activeStage.id} channel={activeStage} />
          : activeText ? <ChatChannel key={activeText.id} channel={activeText} /> : null}
      </div>
    </div>
  );
}

/* ── Live Room / Podcast Stage — REAL multi-user broadcast (LiveKit SFU) ──
   Anyone can "Go Live" as host (camera + mic + screen share) or "Watch" as a
   viewer. Viewers can raise a hand to join video; the host approves. All of
   this runs through the shared LiveRoom component + /api/livekit token server,
   so streams reach every other person in the same room across the internet. */
function LiveStage({ channel }: { channel: StageChannel }) {
  const { user } = useAuth();
  const userName = user?.displayName || user?.handle || user?.email?.split("@")[0] || "Guest";
  const [role, setRole] = useState<"host" | "viewer" | null>(null);

  // Stable, shared room name per channel so everyone lands in the SAME room.
  const roomName  = `wmtv-${channel.id}`;
  const roomLabel = channel.name;
  const color     = channel.kind === "live" ? "#FF4D6A" : "#8B5CF6";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-wm-border bg-wm-dark shrink-0">
        {channel.kind === "live" ? <Radio size={15} className="text-wm-red" /> : <Podcast size={15} className="text-wm-purple" />}
        <div>
          <h2 className="text-sm font-black text-wm-text">{channel.name}</h2>
          <p className="text-[10px] text-wm-text-muted">
            {channel.kind === "live"
              ? "Go live with your screen, camera & mic — the whole community can watch"
              : "Host a live audio room — viewers raise a hand to speak"}
          </p>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto">
        {role ? (
          <LiveRoom
            key={role}
            roomName={roomName}
            roomLabel={roomLabel}
            color={color}
            userName={userName}
            isHost={role === "host"}
            onClose={() => setRole(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
            {/* Cinematic cultural backdrop — heritage gold + emerald + royal purple
                glows over a deep base, with faint soundwave grooves at the floor. */}
            <div className="pointer-events-none absolute inset-0" style={{
              background:
                "radial-gradient(58% 52% at 50% 30%, rgba(232,185,35,0.15) 0%, transparent 62%)," +
                "radial-gradient(66% 58% at 82% 82%, rgba(5,150,105,0.13) 0%, transparent 62%)," +
                "radial-gradient(60% 52% at 14% 78%, rgba(139,92,246,0.13) 0%, transparent 62%)",
            }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-[0.07]" style={{
              backgroundImage: "repeating-linear-gradient(90deg, #E8B923 0 2px, transparent 2px 10px)",
              WebkitMaskImage: "linear-gradient(to top, black, transparent)",
              maskImage: "linear-gradient(to top, black, transparent)",
            }} />
            <div className="relative z-10 flex flex-col items-center">
              {/* Studio-ready badge (honest — no fake "live" until someone goes on air) */}
              <motion.div
                className="flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                style={{ background: "rgba(232,185,35,0.10)", border: "1px solid rgba(232,185,35,0.45)" }}
                animate={{ boxShadow: ["0 0 14px rgba(232,185,35,0.16)", "0 0 26px rgba(232,185,35,0.36)", "0 0 14px rgba(232,185,35,0.16)"] }}
                transition={{ duration: 2.6, repeat: Infinity }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#059669" }} />
                <span className="text-[10px] font-black tracking-widest" style={{ color: "#E8B923" }}>STUDIO · READY</span>
              </motion.div>
              <motion.div
                className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #E8B923 0%, #059669 100%)", boxShadow: "0 12px 32px rgba(232,185,35,0.30)" }}
                animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}
              >
                {channel.kind === "live" ? <MonitorUp size={28} className="text-black" /> : <Podcast size={28} className="text-black" />}
              </motion.div>
              <p className="text-lg font-black text-wm-text mb-1">
                {channel.kind === "live" ? "Live Room" : "Podcast Stage"}
              </p>
              <p className="text-[11px] font-semibold mb-1" style={{ color: "#C9A227" }}>Trading minds · Creative voices · For the culture</p>
              <p className="text-[11px] text-wm-text-muted max-w-md mx-auto mb-6">
                {channel.kind === "live"
                  ? "Broadcast your charts and voice to the community, or drop in to watch — Black excellence on air since the 1900s. Up to 4 on video at once."
                  : "Open the mic to the community, or join to listen. Raise a hand to jump on the stage."}
              </p>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setRole("host")} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 px-6 h-11 rounded-xl text-black text-xs font-black"
                  style={{ background: "linear-gradient(135deg, #E8B923 0%, #059669 100%)", boxShadow: "0 8px 24px rgba(232,185,35,0.30)" }}
                >
                  <Video size={15} /> Join Stream
                </motion.button>
                <motion.button
                  onClick={() => setRole("viewer")} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 px-6 h-11 rounded-xl text-wm-text text-xs font-black"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(232,185,35,0.30)" }}
                >
                  <Eye size={15} /> Watch
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Text channel chat ──────────────────────────────────── */
function ChatChannel({ channel }: { channel: TextChannel }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`wm_tv_chat_${channel.id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return SEED[channel.id] || [];
  });
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    try { localStorage.setItem(`wm_tv_chat_${channel.id}`, JSON.stringify(msgs.slice(-100))); } catch {}
  }, [msgs, channel.id]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMsgs(m => [...m, { id: `${Date.now()}`, author: "You", color: "#00D4AA", body, ts: Date.now() }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-wm-border bg-wm-dark shrink-0">
        <Hash size={15} className="text-wm-text-muted" />
        <div>
          <h2 className="text-sm font-black text-wm-text">{channel.name}</h2>
          <p className="text-[10px] text-wm-text-muted">{channel.topic}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Hash size={32} className="text-wm-text-muted mb-2" />
            <p className="text-sm font-black text-wm-text">Welcome to #{channel.name}</p>
            <p className="text-[11px] text-wm-text-muted">{channel.topic}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map(m => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-black" style={{ background: m.color }}>
                {m.author.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-black" style={{ color: m.color }}>{m.author}</span>
                  <span className="text-[9px] text-wm-text-muted">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-[12px] text-wm-text leading-snug break-words">{m.body}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-wm-border bg-wm-dark">
        <div className="flex items-center gap-2 rounded-xl bg-wm-black border border-wm-border px-3 py-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message #${channel.name}`}
            className="flex-1 bg-transparent text-xs text-wm-text placeholder:text-wm-text-muted outline-none"
          />
          <button onClick={send} className="text-wm-blue hover:opacity-80 disabled:opacity-40 active:scale-90 transition-all" disabled={!draft.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Brain Fitness channel — mindset & focus training for traders ── */
type Drill = { icon: React.ReactNode; title: string; time: string; desc: string; color: string };
const BRAIN_DRILLS: Drill[] = [
  { icon: <Timer size={18} />,    title: "Box Breathing Reset",  time: "4 min", color: "#00D4AA",
    desc: "Inhale 4s · hold 4s · exhale 4s · hold 4s. Regulate your nervous system before the open so fear and FOMO don't drive your clicks." },
  { icon: <Target size={18} />,   title: "Single-Task Focus",    time: "10 min", color: "#4FA3E0",
    desc: "Pick ONE setup. Watch only that. Train the discipline to sit on your hands until your edge appears — the hardest skill in trading." },
  { icon: <Sparkles size={18} />, title: "Visualization Rep",    time: "5 min", color: "#F0B429",
    desc: "Rehearse taking the perfect trade AND the perfect loss. Emotional reps build the calm to execute your plan under real pressure." },
  { icon: <Dumbbell size={18} />, title: "Working-Memory Drill", time: "6 min", color: "#8B5CF6",
    desc: "Recall the last 5 price levels without looking. Sharpen the mental RAM you use to track order flow and multi-timeframe context." },
  { icon: <Brain size={18} />,    title: "Post-Session Review",  time: "8 min", color: "#FF4D6A",
    desc: "Write one lesson, one win, one mistake. Neuroplasticity turns reflection into instinct — this is how good traders compound." },
  { icon: <Target size={18} />,   title: "Gratitude + Intention", time: "3 min", color: "#06B6D4",
    desc: "Name 3 things you're grateful for and 1 intention for the day. Positive priming measurably improves decision quality under stress." },
];

function BrainFitnessChannel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-wm-border bg-wm-dark shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#00D4AA,#8B5CF6)" }}>
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-black text-wm-text">Brain Fitness</h2>
          <p className="text-[11px] text-wm-text-muted">Mindset, focus & discipline training — the inner game that separates profitable traders.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {BRAIN_DRILLS.map(d => (
            <div key={d.title} className="rounded-2xl p-4 flex flex-col"
              style={{ background: "#0D1117", border: "1px solid #1E2030" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${d.color}1E`, color: d.color, border: `1px solid ${d.color}44` }}>
                  {d.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-wm-text">{d.title}</div>
                  <div className="text-[10px] font-bold" style={{ color: d.color }}>{d.time} drill</div>
                </div>
              </div>
              <p className="text-[12px] text-wm-text-muted leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-wm-text-muted mt-6">
          More guided sessions & live Brain Fitness broadcasts coming to WM TV.
        </p>
      </div>
    </div>
  );
}
