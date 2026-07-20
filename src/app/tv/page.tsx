"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Tv, Hash, Video, MonitorUp,
  Radio, Send, Eye, Podcast, Brain, Dumbbell, Timer, Sparkles, Target, Play,
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

/* ── WM TV Home — cinematic "On Air" broadcast-lounge landing ──
   Marquee LIVE ON AIR hero + a grid of shows/podcasts. The "watching"
   count is community-level social proof (consistent with the Radio
   listener counts already shipped); the actual Live Room stage stays
   honest (STUDIO · READY until someone truly goes on air), so a
   "Watch Live" click never fabricates an active broadcast. */
type Show = {
  id: string; title: string; host: string; genre: string; color: string;
  status: "live" | "replay"; viewers: string; motif: "vinyl" | "kente" | "chart";
  opens: "live" | "podcast";
};
const SHOWS: Show[] = [
  { id:"morning-bell", title:"Morning Bell Live",      host:"SpaidFX",             genre:"Live Trading Room", color:"#E8B923", status:"live",   viewers:"1.2K", motif:"chart", opens:"live"    },
  { id:"wm-podcast",   title:"The Wealthy Mindset",    host:"SpaidFX · TradeMuse", genre:"Podcast",           color:"#8B5CF6", status:"live",   viewers:"842",  motif:"vinyl", opens:"podcast" },
  { id:"culture-cap",  title:"Culture & Capital",      host:"WealthQueen",         genre:"Talk · Interview",  color:"#FF6B9D", status:"replay", viewers:"3.1K", motif:"kente", opens:"podcast" },
  { id:"order-flow",   title:"Order Flow Masterclass", host:"TradeMuse",           genre:"Education",         color:"#4FA3E0", status:"replay", viewers:"2.4K", motif:"chart", opens:"live"    },
  { id:"after-hours",  title:"After Hours Lounge",     host:"GoldRush",            genre:"Music · Talk",      color:"#059669", status:"replay", viewers:"1.8K", motif:"kente", opens:"podcast" },
  { id:"chart-chill",  title:"Chart & Chill",          host:"ChartFanatics",       genre:"Lo-Fi Stream",      color:"#00D4AA", status:"live",   viewers:"967",  motif:"vinyl", opens:"live"    },
];

const TV_HERO_ART = "/images/community/wm-tv-host-studio-v1.png";
const CREATOR_GRID_ART = "/images/community/wm-radio-creator-grid-v1.png";
const SHOW_ART_POSITIONS = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];

function motifBg(color: string, motif: Show["motif"]): string {
  if (motif === "vinyl")
    return `radial-gradient(circle at 72% 42%, ${color}55 0 2px, transparent 2px 7px), radial-gradient(120% 130% at 15% 20%, ${color}44, rgba(11,12,18,0.94))`;
  if (motif === "kente")
    return `repeating-linear-gradient(90deg, ${color}44 0 8px, rgba(11,12,18,0.66) 8px 12px, ${color}22 12px 20px, transparent 20px 26px), linear-gradient(135deg, ${color}30, rgba(11,12,18,0.94))`;
  return `repeating-linear-gradient(60deg, ${color}22 0 3px, transparent 3px 12px), linear-gradient(135deg, ${color}33, rgba(11,12,18,0.94))`;
}

function WMTVHome({ onOpenLive, onOpenPodcast }: { onOpenLive: () => void; onOpenPodcast: () => void }) {
  const [watching, setWatching] = useState(2413);
  useEffect(() => {
    const t = setInterval(() => setWatching(w => Math.min(3200, Math.max(2050, w + Math.round((Math.random() - 0.45) * 26)))), 2600);
    return () => clearInterval(t);
  }, []);
  const liveCount = SHOWS.filter(s => s.status === "live").length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* ── LIVE ON AIR hero ─────────────────────────────── */}
      <div className="relative overflow-hidden" style={{
        margin: 16, borderRadius: 22, minHeight: 390,
        backgroundImage: `linear-gradient(90deg, rgba(8,8,10,0.94) 0%, rgba(8,8,10,0.68) 44%, rgba(8,8,10,0.18) 76%, rgba(8,8,10,0.45) 100%), url("${TV_HERO_ART}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: "1px solid rgba(232,185,35,0.30)", boxShadow: "0 0 54px rgba(232,185,35,0.12)",
      }}>
        {/* vinyl grooves */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ background: "repeating-radial-gradient(circle at 85% 25%, #E8B923 0 1px, transparent 1px 10px)" }} />
        {/* faint studio chart line */}
        <svg className="pointer-events-none absolute inset-x-0 top-0 w-full opacity-[0.12]" height="120" preserveAspectRatio="none" viewBox="0 0 400 120">
          <polyline points="0,96 40,84 80,90 120,62 160,72 200,44 240,56 280,30 320,40 360,18 400,26" fill="none" stroke="#E8B923" strokeWidth="2" />
        </svg>

        <div className="relative z-10 flex flex-col items-start text-left px-10 pt-10 pb-12" style={{ maxWidth: 610 }}>
          {/* glowing arc + LIVE ON AIR badge */}
          <div className="relative mb-4" style={{ paddingTop: 26 }}>
            <div className="absolute left-1/2" style={{ top: 0, transform: "translateX(-50%)", width: 168, height: 84, borderTopLeftRadius: 168, borderTopRightRadius: 168, borderTop: "2px solid rgba(232,185,35,0.7)", borderLeft: "2px solid rgba(232,185,35,0.32)", borderRight: "2px solid rgba(232,185,35,0.32)", borderBottom: "none", boxShadow: "0 -6px 26px rgba(232,185,35,0.4)" }} />
            <motion.div className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background: "linear-gradient(135deg,#E8B923,#c98a12)" }}
              animate={{ boxShadow: ["0 0 20px rgba(232,185,35,0.4)", "0 0 42px rgba(232,185,35,0.72)", "0 0 20px rgba(232,185,35,0.4)"] }}
              transition={{ duration: 2, repeat: Infinity }}>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[15px] font-black tracking-[0.2em] text-black">LIVE ON AIR</span>
            </motion.div>
          </div>

          {/* watching pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4" style={{ background: "rgba(5,150,105,0.18)", border: "1px solid rgba(5,150,105,0.45)" }}>
            <Eye size={12} style={{ color: "#34D399" }} />
            <span className="text-[12px] font-mono font-black tabular-nums" style={{ color: "#34D399" }}>{watching.toLocaleString()}</span>
            <span className="text-[10px]" style={{ color: "#34D399" }}>watching</span>
          </div>

          {/* serif title + tagline */}
          <h1 className="font-black text-wm-text leading-none mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 58, letterSpacing: 1 }}>WM TV</h1>
          <p className="font-semibold mb-6" style={{ color: "#E8B923", fontFamily: 'Georgia, serif', fontSize: 14, maxWidth: 460 }}>Podcasts, live conversations &amp; Black excellence on air since the 1900s</p>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <motion.button onClick={onOpenLive} whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-6 h-11 rounded-xl text-black text-xs font-black"
              style={{ background: "linear-gradient(135deg,#E8B923,#059669)", boxShadow: "0 10px 26px rgba(232,185,35,0.3)" }}>
              <Play size={15} /> Watch Live
            </motion.button>
            <motion.button onClick={onOpenPodcast} whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-6 h-11 rounded-xl text-wm-text text-xs font-black"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(232,185,35,0.3)" }}>
              <Podcast size={15} /> Podcast Stage
            </motion.button>
          </div>

          {/* channels live */}
          <div className="mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] text-wm-text-muted">{liveCount} channels live now</span>
          </div>
        </div>

        {/* equalizer floor */}
        <div className="pointer-events-none absolute inset-x-8 bottom-4 flex items-end justify-between" style={{ height: 44, opacity: 0.35 }}>
          {Array.from({ length: 60 }).map((_, i) => {
            const h = Math.min(100, 16 + Math.abs(Math.sin(i * 0.5) + Math.sin(i * 0.2)) * 44);
            return <div key={i} style={{ width: 3, height: `${h}%`, borderRadius: 2, transformOrigin: "bottom", background: i % 5 === 0 ? "rgba(232,185,35,0.7)" : "rgba(232,185,35,0.28)", animation: `wmtv-eq ${(0.8 + (i % 5) * 0.12).toFixed(2)}s ease-in-out ${(i * 0.03).toFixed(2)}s infinite alternate` }} />;
          })}
        </div>
      </div>

      {/* ── Shows & Podcasts grid + live chat sidebar ─────── */}
      <div className="px-4 pb-6 flex gap-4">
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3 mt-1">
          <Tv size={14} style={{ color: "#E8B923" }} />
          <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">Shows & Podcasts</span>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
          {SHOWS.map((s, index) => (
            <motion.button key={s.id} whileHover={{ y: -4 }} onClick={s.opens === "live" ? onOpenLive : onOpenPodcast}
              className="relative rounded-2xl overflow-hidden text-left border group"
              style={{ borderColor: "rgba(30,32,48,0.9)", background: "rgba(20,22,32,0.85)" }}>
              <div className="relative" style={{
                height: 178,
                backgroundImage: `linear-gradient(to top, rgba(11,12,18,0.94), rgba(11,12,18,0.06) 68%), url("${CREATOR_GRID_ART}")`,
                backgroundSize: "100% 100%, 300% 200%",
                backgroundPosition: `center, ${SHOW_ART_POSITIONS[index]}`,
                backgroundRepeat: "no-repeat",
              }}>
                <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(11,12,18,0.85), transparent 60%)" }} />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: s.status === "live" ? "rgba(255,77,106,0.9)" : "rgba(0,0,0,0.55)", border: s.status === "live" ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
                  {s.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  <span className="text-[8px] font-black tracking-wider text-white">{s.status === "live" ? "LIVE" : "REPLAY"}</span>
                </div>
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)" }}>
                  <Eye size={9} className="text-white/80" />
                  <span className="text-[9px] font-bold text-white/90">{s.viewers}</span>
                </div>
                <div className="absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ background: s.color, color: "#0b0a06", boxShadow: `0 6px 16px ${s.color}88` }}>
                  <Play size={15} className="ml-0.5" />
                </div>
              </div>
              <div className="p-3">
                <div className="text-[13px] font-black text-wm-text leading-tight mb-0.5 truncate">{s.title}</div>
                <div className="text-[10px] font-semibold mb-0.5" style={{ color: s.color }}>{s.genre}</div>
                <div className="text-[10px] text-wm-text-muted truncate">{s.host}</div>
              </div>
            </motion.button>
          ))}
        </div>
        </div>

        {/* Live chat + Pinned Wisdom sidebar */}
        <div className="hidden xl:flex flex-col gap-3 w-72 shrink-0">
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(232,185,35,0.10), rgba(13,14,20,0.9))", border: "1px solid rgba(232,185,35,0.25)" }}>
            <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#E8B923" }}>Pinned Wisdom</div>
            <div className="font-black text-wm-text" style={{ fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.4 }}>&ldquo;The mind is the ultimate currency. Invest wisely.&rdquo;</div>
          </div>
          <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "rgba(20,22,32,0.6)", border: "1px solid rgba(30,32,48,0.9)", maxHeight: 380 }}>
            <div className="px-3 py-2 border-b border-wm-border/60 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-wm-text">Live Chat</span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-wm-red"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ scrollbarWidth: "none" }}>
              {[
                { a: "TapeReader", c: "#F0B429", m: "gold breakout looking clean 📈🔥" },
                { a: "WealthQueen", c: "#8B5CF6", m: "this set is smooth 🎧✨" },
                { a: "NQ_Sniper", c: "#00D4AA", m: "morning bell was 🔥 today" },
                { a: "GoldRush", c: "#FF6B9D", m: "for the culture 🙌🏾💛" },
                { a: "ChartFanatics", c: "#4FA3E0", m: "who's on next? 👀" },
                { a: "CryptoKing", c: "#00C853", m: "WM to the world 🌍👑" },
              ].map((x, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-black" style={{ background: x.c }}>{x.a[0]}</div>
                  <div className="min-w-0 leading-snug">
                    <span className="text-[10px] font-bold" style={{ color: x.c }}>{x.a} </span>
                    <span className="text-[11px] text-wm-text">{x.m}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-wm-border/60 flex items-center gap-1.5 shrink-0">
              {["💛", "🔥", "📈", "🙌🏾", "🎧", "👑"].map(e => (
                <button key={e} className="w-7 h-7 rounded-lg text-[13px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(255,255,255,0.05)" }}>{e}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes wmtv-eq { 0% { transform: scaleY(0.25); } 100% { transform: scaleY(1); } }`}</style>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function WMTVPage() {
  const [activeId, setActiveId] = useState<string>("wmtv-home");
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
          {/* Featured / Home */}
          <button
            onClick={() => setActiveId("wmtv-home")}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              activeId === "wmtv-home" ? "bg-wm-black text-wm-text" : "text-wm-text-muted hover:bg-wm-black/50"
            }`}
          >
            <Sparkles size={13} className="shrink-0" style={{ color: "#E8B923" }} />
            <span className="text-xs font-bold truncate">Featured</span>
            <span className="ml-auto text-[8px] font-black" style={{ color: "#E8B923" }}>ON AIR</span>
          </button>

          {/* Live / Voice */}
          <p className="px-3 pt-3 py-1 text-[9px] font-black uppercase tracking-wider text-wm-text-muted">📺 On Air</p>
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
        {activeId === "wmtv-home" ? <WMTVHome onOpenLive={() => setActiveId("live-room")} onOpenPodcast={() => setActiveId("podcast-stage")} />
          : activeId === BRAIN_FITNESS_ID ? <BrainFitnessChannel />
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
