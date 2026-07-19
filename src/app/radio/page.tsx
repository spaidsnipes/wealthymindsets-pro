"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Radio, Mic, Music2,
  Search, ChevronRight, Users, Star,
  TrendingUp, Flame, Plus, Signal,
  CheckCircle, X, Upload,
  Heart, Headphones, Volume2, VolumeX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useRadio } from "@/contexts/RadioContext";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
type ContentTab = "radio" | "music" | "podcasts" | "artists";

interface Station {
  id:       string;
  name:     string;
  genre:    string;
  host:     string;
  desc:     string;
  color:    string;
  live:     boolean;
  listeners:number;
  avatar:   string;
  tags:     string[];
}

interface Track {
  id:       number;
  title:    string;
  artist:   string;
  album:    string;
  genre:    string;
  duration: number;
  plays:    string;
  color:    string;
  liked:    boolean;
  verified: boolean;
  new:      boolean;
}

interface Episode {
  id:       number;
  title:    string;
  show:     string;
  host:     string;
  desc:     string;
  duration: number;
  date:     string;
  plays:    string;
  color:    string;
  tags:     string[];
}

interface Artist {
  id:       number;
  name:     string;
  handle:   string;
  genre:    string;
  tracks:   number;
  followers:string;
  color:    string;
  avatar:   string;
  verified: boolean;
  wm_team:  boolean;
  bio:      string;
}

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const STATIONS: Station[] = [
  {
    id:"wm-main", name:"WM Radio", genre:"All Genres", host:"SpaidFX",
    desc:"The official WealthyMindsets station — trading vibes, hip-hop, R&B, and more. Live 24/7.",
    color:"#00D4AA", live:true, listeners:1842, avatar:"W",
    tags:["#Trading","#HipHop","#RnB","#Lofi"],
  },
  {
    id:"wm-hiphop", name:"WM Hip-Hop", genre:"Hip-Hop / Rap", host:"TradeMuse",
    desc:"The hardest bars from the WM community. Trading culture meets street culture.",
    color:"#F0B429", live:true, listeners:934, avatar:"H",
    tags:["#HipHop","#Rap","#Drill","#Trap"],
  },
  {
    id:"wm-lofi", name:"WM Lo-Fi", genre:"Lo-Fi / Chill", host:"WealthQueen",
    desc:"Study beats, chart sessions, late-night lofi. Perfect focus music for traders.",
    color:"#8B5CF6", live:true, listeners:1207, avatar:"L",
    tags:["#Lofi","#Chill","#Study","#Beats"],
  },
  {
    id:"wm-rnb", name:"WM R&B", genre:"R&B / Soul", host:"GoldRush",
    desc:"Smooth R&B from WM creators. Vibes for the winners.",
    color:"#FF6B9D", live:false, listeners:621, avatar:"R",
    tags:["#RnB","#Soul","#Vibes"],
  },
  {
    id:"wm-beats", name:"WM Beats", genre:"Beats / Instrumentals", host:"ChartFanatics",
    desc:"Pure instrumentals, sample packs, and production from WM producers.",
    color:"#4FA3E0", live:false, listeners:445, avatar:"B",
    tags:["#Beats","#Instrumental","#Production"],
  },
  {
    id:"wm-global", name:"WM Global", genre:"World / Afro", host:"Various",
    desc:"International sounds from creators worldwide. Afrobeats, dancehall, reggaeton and more.",
    color:"#00C853", live:false, listeners:388, avatar:"G",
    tags:["#Afrobeats","#Dancehall","#World"],
  },
];

const TRACKS: Track[] = [
  { id:1,  title:"Green Candles",     artist:"TradeMuse",    album:"Market Hours",  genre:"Hip-Hop", duration:178, plays:"124K", color:"#00D4AA", liked:true,  verified:true,  new:false },
  { id:2,  title:"Paper Hands",       artist:"WealthQueen",  album:"Diamond Mind",  genre:"R&B",     duration:222, plays:"98K",  color:"#8B5CF6", liked:false, verified:true,  new:false },
  { id:3,  title:"Wyckoff Dreams",    artist:"SpaidFX",      album:"Order Flow",    genre:"Trap",    duration:252, plays:"87K",  color:"#4FA3E0", liked:true,  verified:true,  new:false },
  { id:4,  title:"Diamond Hands",     artist:"NQ_Sniper",    album:"Conviction",    genre:"Drill",   duration:201, plays:"76K",  color:"#F0B429", liked:false, verified:true,  new:true  },
  { id:5,  title:"Order Flow",        artist:"ChartFanatics",album:"The Setup",     genre:"Lo-fi",   duration:245, plays:"64K",  color:"#FF4D6A", liked:false, verified:false, new:false },
  { id:6,  title:"Smart Money Moves", artist:"WealthQueen",  album:"Diamond Mind",  genre:"R&B",     duration:198, plays:"59K",  color:"#8B5CF6", liked:true,  verified:true,  new:false },
  { id:7,  title:"Conviction",        artist:"SpaidFX",      album:"Order Flow",    genre:"Hip-Hop", duration:215, plays:"52K",  color:"#4FA3E0", liked:false, verified:true,  new:true  },
];

const EPISODES: Episode[] = [
  { id:1, title:"How I Turned $5K Into $50K Trading NQ Futures",    show:"WM Podcast",      host:"SpaidFX",            desc:"Full breakdown of the exact strategy, risk management, and psychology that drove a 10x return in 11 months trading the E-mini NASDAQ-100.", duration:4920, date:"Jun 14, 2026", plays:"42.3K", color:"#00D4AA", tags:["#NQ","#Futures","#Risk","#Psychology"] },
  { id:2, title:"The CLC Rule: Finding High-Conviction Entries",     show:"WM Podcast",      host:"SpaidFX & TradeMuse", desc:"We break down the Context-Location-Confirmation rule that separates amateur entries from professional setups. Real trade examples included.",           duration:3780, date:"Jun 10, 2026", plays:"38.7K", color:"#F0B429", tags:["#CLC","#EntryModel","#SmartMoney"] },
  { id:3, title:"Music & Markets: Building a Brand as a Creator",    show:"Creator Sessions", host:"WealthQueen",         desc:"How I built a 6-figure creator business combining my love of music and trading. The blueprint for other trader-creators.",                          duration:3240, date:"Jun 7, 2026",  plays:"31.2K", color:"#8B5CF6", tags:["#Creator","#Music","#Brand","#Business"] },
  { id:4, title:"Wyckoff Method Deep Dive: Phases A Through E",      show:"WM Podcast",      host:"NQ_Sniper",           desc:"A masterclass on the Wyckoff Method with real NQ examples. Spring, upthrust, and markup — all explained with chart context.",                    duration:5100, date:"Jun 3, 2026",  plays:"28.4K", color:"#FF4D6A", tags:["#Wyckoff","#Accumulation","#Distribution"] },
  { id:5, title:"Order Flow 101: Reading Footprint Charts Like a Pro",show:"WM Podcast",     host:"TradeMuse",           desc:"Everything you need to know about order flow — delta, CVD, passive vs aggressive orders, and how to use them for better timing.",                  duration:4320, date:"May 28, 2026", plays:"25.1K", color:"#4FA3E0", tags:["#OrderFlow","#Footprint","#CVD","#Delta"] },
  { id:6, title:"Beat Making for Traders: Production While You Chart",show:"Creator Sessions",host:"WealthQueen & GoldRush",desc:"We link up in the studio and talk about making music that captures the energy of trading. Tools, workflow, and the creative process.",          duration:2880, date:"May 22, 2026", plays:"19.8K", color:"#FF6B9D", tags:["#Music","#Production","#Creator"] },
  { id:7, title:"Smart Money Concepts: The Full Breakdown",          show:"WM Podcast",      host:"SpaidFX",            desc:"ICT concepts, order blocks, fair value gaps, and breaker blocks — the complete guide to trading like the institutions.",                          duration:3600, date:"May 15, 2026", plays:"17.2K", color:"#00C853", tags:["#SMC","#ICT","#OrderBlocks","#FVG"] },
];

const ARTISTS: Artist[] = [
  { id:1, name:"SpaidFX",      handle:"@spaidedfx",     genre:"Hip-Hop / Trap",  tracks:24, followers:"18.4K", color:"#00D4AA", avatar:"S", verified:true,  wm_team:true,  bio:"CEO of WealthyMindsets. Trader, artist, educator. NQ futures specialist." },
  { id:2, name:"WealthQueen",  handle:"@wealthqueenfx", genre:"R&B / Soul",      tracks:18, followers:"14.2K", color:"#8B5CF6", avatar:"W", verified:true,  wm_team:true,  bio:"R&B singer, trader, and creator. Building wealth through music and markets." },
  { id:3, name:"TradeMuse",    handle:"@trademuse",     genre:"Lo-fi / Hip-Hop", tracks:31, followers:"12.7K", color:"#4FA3E0", avatar:"T", verified:true,  wm_team:true,  bio:"Lo-fi producer and Hip-Hop artist. Market hours are studio hours." },
  { id:4, name:"NQ_Sniper",    handle:"@nqsniper",      genre:"Drill / Trap",    tracks:15, followers:"9.8K",  color:"#F0B429", avatar:"N", verified:true,  wm_team:false, bio:"Precision trader and drill artist. I don't miss entries and I don't miss bars." },
  { id:5, name:"GoldRush",     handle:"@goldrushfx",    genre:"Trap / Afrobeats",tracks:22, followers:"7.3K",  color:"#FF6B9D", avatar:"G", verified:false, wm_team:false, bio:"Gold market trader by day, Afrobeats producer by night. Both are rhythm games." },
  { id:6, name:"ChartFanatics",handle:"@chartfanatics", genre:"Lo-fi / Ambient", tracks:11, followers:"5.9K",  color:"#FF4D6A", avatar:"C", verified:false, wm_team:false, bio:"Ambient and Lo-fi beats for late-night chart sessions. All original production." },
  { id:7, name:"CryptoKing",   handle:"@cryptoking",    genre:"Hip-Hop",         tracks:9,  followers:"4.4K",  color:"#00C853", avatar:"K", verified:false, wm_team:false, bio:"BTC maxi and Hip-Hop head. Rapping about the blockchain since 2018." },
];

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

function fmtMins(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

/* ══════════════════════════════════════════════════════════════
   WAVEFORM ANIMATION
══════════════════════════════════════════════════════════════ */
function LiveWave({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 16 }}>
      {[1,2,3,4,5].map(i => (
        <div
          key={i}
          style={{
            width: 2, background: color, borderRadius: 1,
            animation: `wm-wave-bar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STREAM URL CONFIG
   Replace values with your real Icecast / Radio.co / Cloudflare
   Stream URLs. Empty string = "Coming Soon" placeholder.
══════════════════════════════════════════════════════════════ */
const STATION_STREAMS: Record<string, string> = {
  "wm-main":   "",  // e.g. "https://stream.radio.co/s1234567890/listen"
  "wm-hiphop": "",
  "wm-lofi":   "",
  "wm-rnb":    "",
  "wm-beats":  "",
  "wm-global": "",
};

// Track audio URLs — royalty-free instrumentals from archive.org (CC licensed)
const TRACK_URLS: Record<number, string> = {
  // 1 Green Candles — Hip-Hop beat (Randy Music Beat)
  1: "https://archive.org/download/jamendo-312532/01-1665360-RandyMusicBeat-Free%20Beat%20Download%20-%20Randy%20Music%20Beat%20-%20China%20-.mp3",
  // 2 Paper Hands — R&B/Sad Hip Hop piano (Adi Rambo)
  2: "https://archive.org/download/jamendo-395770/01-1698982-Adi%20Rambo-FREE%20Piano%20Instrumental%20_%20Sad%20Hip%20Hop%20Beat%20_%20RnB%20Beat.mp3",
  // 3 Wyckoff Dreams — Lo-fi chill (Dontcry & Nokiaa)
  3: "https://archive.org/download/3-dontcry-nokiaa-garden-flower/3%20Dontcry%20_%20Nokiaa%20-%20Garden%20Flower.mp3",
  // 4 Diamond Hands — Dark Trap (Adi Rambo Post Malone type)
  4: "https://archive.org/download/jamendo-383701/01-1543123-Adi%20Rambo-FREE%20Post%20Malone%20Type%20Instrumental%20_%20Dark%20Hip%20Hop%20Trap%20Beat.mp3",
  // 5 Order Flow — Atmospheric chill (Brentin Davis)
  5: "https://archive.org/download/jamendo-630205/01-2311211-Brentin%20Davis-Watch%20The%20Sky.mp3",
  // 6 Smart Money Moves — Smooth R&B (Brentin Davis)
  6: "https://archive.org/download/jamendo-630617/01-2311138-Brentin%20Davis-Send%20Her%20In%20Gold.mp3",
  // 7 Conviction — Hip-Hop beat (Randy Music Beat Ghost House)
  7: "https://archive.org/download/jamendo-300587/01-1660122-RandyMusicBeat-Free%20Beat%20Download%20-%20Randy%20Music%20Beat%20-%20Ghost%20House%20-.mp3",
};

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */
function StationCard({ station, active, onPlay }: {
  station: Station;
  active: boolean;
  onPlay: () => void;
}) {
  const c = station.color;
  // Per-bar heights (px) for the equalizer waveform — varied for an organic look.
  const bars = [12, 22, 30, 17, 34, 25, 14, 28, 20, 32, 18, 26, 15, 23];
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 14px 36px ${c}33` }}
      onClick={onPlay}
      className="wm-station-card relative rounded-2xl border cursor-pointer overflow-hidden group"
      style={{
        background: active
          ? `linear-gradient(135deg, ${c}22, ${c}0a)`
          : "rgba(20,22,32,0.85)",
        borderColor: active ? c : "rgba(30,32,48,0.8)",
        boxShadow: active ? `0 0 26px ${c}30` : undefined,
        transition: "border-color 0.35s ease",
      }}
    >
      {/* ── Genre art strip — spinning vinyl + waveform ─────────── */}
      <div className="relative overflow-hidden" style={{ height: 90,
        background: `radial-gradient(130% 150% at 12% 15%, ${c}40 0%, transparent 62%), linear-gradient(135deg, ${c}22, rgba(11,12,18,0.92))` }}>
        {/* faint vinyl grooves — cultural texture, low opacity */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{ background: `repeating-radial-gradient(circle at 84% 44%, ${c} 0 1px, transparent 1px 7px)` }} />

        {/* Spinning vinyl disc — slow idle, quick when tuned in, medium on hover */}
        <div className={`absolute -right-6 -top-5 w-[104px] h-[104px] rounded-full ${active ? "animate-[spin_3.6s_linear_infinite]" : "animate-[spin_18s_linear_infinite] group-hover:animate-[spin_7s_linear_infinite]"}`}
          style={{ background: "repeating-radial-gradient(circle, #14130c 0 2px, #0a0a06 2px 4px)", border: `1px solid ${c}55`, boxShadow: "0 8px 22px rgba(0,0,0,0.5)" }}>
          <div className="absolute inset-0 m-auto rounded-full" style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${c}, ${c}77)`, boxShadow: `0 0 12px ${c}66` }} />
          <div className="absolute inset-0 m-auto rounded-full bg-black/85" style={{ width: 6, height: 6 }} />
        </div>

        {/* Avatar chip */}
        <div className="absolute left-4 top-3 w-9 h-9 rounded-xl flex items-center justify-center font-black text-[15px] z-10"
          style={{ background: `linear-gradient(135deg, ${c}66, ${c}22)`, color: "#fff", border: `1px solid ${c}66`, textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>
          {station.avatar}
        </div>

        {/* Live pill */}
        {station.live && (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full z-10"
            style={{ background: "rgba(255,77,106,0.22)", border: "1px solid rgba(255,77,106,0.55)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span style={{ fontSize: 8, fontWeight: 800, color: "#FF4D6A", letterSpacing: 1 }}>LIVE</span>
          </div>
        )}

        {/* Equalizer waveform — frozen when idle, dances when tuned in / on hover */}
        <div className="absolute left-4 bottom-2.5 flex items-end gap-[3px] z-10" style={{ height: 34 }}>
          {bars.map((h, i) => (
            <div key={i} data-eq style={{
              width: 3, height: h, borderRadius: 2, transformOrigin: "bottom",
              background: c, opacity: active ? 0.92 : 0.5,
              animation: `wm-eq ${(0.9 + (i % 5) * 0.12).toFixed(2)}s ease-in-out ${(i * 0.06).toFixed(2)}s infinite alternate`,
              animationPlayState: active ? "running" : "paused",
            }} />
          ))}
        </div>

        {/* Play / Pause — brightens & scales on hover */}
        <div
          className="absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 z-10"
          style={{ background: c, color: "#0b0a06", boxShadow: `0 6px 18px ${c}77`, opacity: active ? 1 : 0.9 }}>
          {active ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="p-4 pt-3">
        <div className="text-[13px] font-black text-wm-text mb-0.5">{station.name}</div>
        <div className="text-[10px] font-semibold mb-2" style={{ color: c }}>{station.genre} · {station.host}</div>
        <div className="text-[10px] text-wm-text-dim leading-relaxed mb-3 line-clamp-2">{station.desc}</div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {station.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: `${c}18`, color: c, border: `1px solid ${c}2a` }}>
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users size={10} className="text-wm-text-dim" />
            <span className="text-[10px] font-mono text-wm-text-muted">
              {station.listeners.toLocaleString()}
            </span>
          </div>
          {active ? (
            <div className="flex items-center gap-1.5">
              <LiveWave color={c} />
              <span style={{ fontSize: 9, color: c, fontWeight: 800, letterSpacing: 0.5 }}>TUNED IN</span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: c }}>
              <Play size={9} className="ml-0.5" /> Tune In
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TrackRow({ track, idx, active, playing, onPlay, liked, onToggleLike }: {
  track: Track;
  idx: number;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  liked: boolean;
  onToggleLike: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className={clsx(
        "group relative flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all overflow-hidden",
        active ? "border-wm-green/50 bg-wm-surface" : "border-wm-border/40 bg-wm-card/50 hover:bg-wm-surface/50 hover:border-wm-border"
      )}
    >
      {/* colored side tab */}
      <div className="shrink-0 rounded-full" style={{ width: 4, height: 42, background: track.color, boxShadow: `0 0 10px ${track.color}66` }} />

      {/* Album art */}
      <div className="w-12 h-12 rounded-xl shrink-0 relative overflow-hidden flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${track.color}66, ${track.color}22)`, border: `1px solid ${track.color}33` }}>
        {active && playing ? <LiveWave color={track.color} /> : <Music2 size={18} style={{ color: track.color }} />}
      </div>

      {/* Title + sub */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={clsx("text-[13px] font-bold truncate", active ? "text-wm-green" : "text-wm-text")}>{track.title}</span>
          {track.new && (
            <span className="shrink-0 text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(0,200,118,0.15)", color: "#00C876" }}>NEW</span>
          )}
          {track.verified && <CheckCircle size={10} className="shrink-0 text-wm-green" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${track.color}20`, color: track.color }}>{track.genre}</span>
          <span className="text-[10px] text-wm-text-muted truncate">{track.artist} · {track.plays} plays</span>
        </div>
      </div>

      {/* Duration */}
      <span className="hidden sm:block text-[10px] font-mono text-wm-text-dim shrink-0">{fmt(track.duration)}</span>

      {/* Like */}
      <button onClick={e => { e.stopPropagation(); onToggleLike(); }} className="p-1.5 shrink-0 transition-colors">
        <Heart size={13} className={liked ? "text-red-500 fill-red-500" : "text-wm-text-dim hover:text-red-500"} />
      </button>

      {/* Gold play button */}
      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all group-hover:scale-110"
        style={{ background: active ? "linear-gradient(135deg,#E8B923,#059669)" : "rgba(232,185,35,0.16)", border: "1px solid rgba(232,185,35,0.45)" }}>
        {active && playing
          ? <Pause size={16} style={{ color: "#0b0a06" }} />
          : <Play size={16} className="ml-0.5" style={{ color: active ? "#0b0a06" : "#E8B923" }} />}
      </div>
    </div>
  );
}

function EpisodeCard({ ep, active, playing, onPlay }: {
  ep: Episode;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className={clsx(
        "group relative p-4 rounded-2xl border cursor-pointer transition-all overflow-hidden",
        active ? "border-wm-green bg-wm-surface" : "border-wm-border/50 hover:border-wm-border bg-wm-card/60 hover:bg-wm-surface/40"
      )}
    >
      {/* colored left accent */}
      <div className="absolute left-0 top-4 bottom-4 rounded-full" style={{ width: 3, background: ep.color, opacity: active ? 1 : 0.55 }} />
      <div className="flex gap-3">
        {/* Artwork + gold play overlay */}
        <div className="w-14 h-14 rounded-xl flex-shrink-0 relative flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${ep.color}44, ${ep.color}18)`, border: `1px solid ${ep.color}30` }}>
          {active && playing ? (
            <LiveWave color={ep.color} />
          ) : (
            <Mic size={22} style={{ color: ep.color }} />
          )}
          <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: "linear-gradient(135deg,#E8B923,#059669)", boxShadow: "0 3px 10px rgba(232,185,35,0.4)" }}>
            {active && playing ? <Pause size={12} className="text-black" /> : <Play size={12} className="text-black ml-0.5" />}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: ep.color }}>{ep.show}</span>
            <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(232,185,35,0.14)", color: "#E8B923", border: "1px solid rgba(232,185,35,0.3)" }}>{fmtMins(ep.duration)}</span>
          </div>
          <div className={clsx("text-[12px] font-bold leading-snug mb-1 line-clamp-2",
            active ? "text-wm-green" : "text-wm-text")}>
            {ep.title}
          </div>
          <div className="text-[10px] text-wm-text-muted mb-2 line-clamp-2 leading-relaxed">{ep.desc}</div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <Mic size={9} className="text-wm-text-dim" />
              <span className="text-[10px] text-wm-text-dim">{ep.host}</span>
            </div>
            <div className="flex items-center gap-1">
              <Headphones size={9} className="text-wm-text-dim" />
              <span className="text-[10px] text-wm-text-dim">{ep.plays}</span>
            </div>
            <span className="text-[10px] text-wm-text-dim">{ep.date}</span>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {ep.tags.map(t => (
              <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${ep.color}15`, color: ep.color }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistCard({ artist }: { artist: Artist }) {
  const [following, setFollowing] = useState(false);
  return (
    <motion.div whileHover={{ y:-4 }} className="relative p-4 rounded-2xl border border-wm-border/50 bg-wm-card/60 hover:border-wm-border hover:bg-wm-surface/40 transition-all overflow-hidden">
      {/* colored glow */}
      <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full" style={{ background: `radial-gradient(circle, ${artist.color}30, transparent 70%)` }} />
      {/* Avatar — color ring */}
      <div className="relative flex items-start gap-3 mb-3">
        <div className="rounded-2xl p-[2px] shrink-0" style={{ background: `linear-gradient(135deg, ${artist.color}, ${artist.color}55)`, boxShadow: `0 0 14px ${artist.color}44` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl"
            style={{ background: `linear-gradient(135deg, ${artist.color}66, ${artist.color}22)`, color: "#fff", border: "2px solid #0D0E14" }}>
            {artist.avatar}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-wm-text truncate">{artist.name}</span>
            {artist.verified && <CheckCircle size={11} className="shrink-0 text-wm-green" />}
            {artist.wm_team && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                style={{ background:"rgba(0,212,170,0.15)", color:"#00D4AA", border:"1px solid rgba(0,212,170,0.3)" }}>
                WM TEAM
              </span>
            )}
          </div>
          <div className="text-[10px] text-wm-text-muted">{artist.handle}</div>
          <div className="text-[10px]" style={{ color: artist.color }}>{artist.genre}</div>
        </div>
      </div>

      <p className="text-[10px] text-wm-text-dim leading-relaxed mb-3 line-clamp-2">{artist.bio}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[12px] font-black text-wm-text">{artist.tracks}</div>
            <div className="text-[8px] text-wm-text-dim uppercase tracking-wide">Tracks</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-black text-wm-text">{artist.followers}</div>
            <div className="text-[8px] text-wm-text-dim uppercase tracking-wide">Fans</div>
          </div>
        </div>
        <button
          onClick={() => setFollowing(f => !f)}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
          style={following
            ? { background:"rgba(0,212,170,0.12)", color:"#00D4AA", border:"1px solid rgba(0,212,170,0.3)" }
            : { background:`${artist.color}22`, color: artist.color, border:`1px solid ${artist.color}40` }
          }
        >
          {following ? "Following ✓" : "Follow"}
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MINI PLAYER (persistent at bottom of radio page)
══════════════════════════════════════════════════════════════ */
interface NowPlaying {
  title: string;
  artist: string;
  duration: number;
  color: string;
  type: "track" | "station" | "episode";
}

function RadioPlayer({ now, playing, onToggle, progress, onSeek, volume, onVolume }:{
  now: NowPlaying | null;
  playing: boolean;
  onToggle: () => void;
  progress: number;
  onSeek: (p: number) => void;
  volume: number;
  onVolume: (v: number) => void;
}) {
  const [muted, setMuted] = useState(false);
  if (!now) return null;
  const pct = now.type === "station" ? 0 : (progress / now.duration) * 100;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 mx-4 mb-2 rounded-2xl border border-wm-border"
      style={{ background: "rgba(13,14,20,0.97)", backdropFilter:"blur(20px)", boxShadow:`0 -4px 40px ${now.color}22` }}>
      <div className="flex items-center gap-4 px-5 py-3">
        {/* Art — spinning vinyl */}
        <div className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center ${playing ? "animate-[spin_3.4s_linear_infinite]" : ""}`}
          style={{ background:"repeating-radial-gradient(circle, #141310 0 1.5px, #08080c 1.5px 3.5px)", border:"1px solid rgba(232,185,35,0.4)", boxShadow:"0 3px 12px rgba(0,0,0,0.5)" }}>
          <div className="rounded-full flex items-center justify-center" style={{ width:15, height:15, background:"linear-gradient(135deg,#E8B923,#c98a12)" }}>
            {now.type === "station" ? <Radio size={8} style={{ color:"#0b0a06" }} /> :
             now.type === "episode" ? <Mic size={8} style={{ color:"#0b0a06" }} /> :
             <Music2 size={8} style={{ color:"#0b0a06" }} />}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {playing && now.type === "station" && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background:"rgba(255,77,106,0.2)", border:"1px solid rgba(255,77,106,0.4)" }}>
                <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                <span style={{ fontSize:7, fontWeight:800, color:"#FF4D6A", letterSpacing:1 }}>LIVE</span>
              </div>
            )}
            <span className="text-[12px] font-bold text-wm-text truncate">{now.title}</span>
          </div>
          <span className="text-[10px] text-wm-text-muted">{now.artist}</span>
        </div>

        {/* Progress (for tracks/episodes) */}
        {now.type !== "station" && (
          <div className="flex-1 min-w-0 hidden sm:flex items-center gap-2">
            <span className="text-[9px] font-mono text-wm-text-dim shrink-0">{fmt(progress)}</span>
            <div className="flex-1 h-1 rounded-full bg-wm-muted relative cursor-pointer"
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect();
                onSeek(Math.floor(((e.clientX - r.left) / r.width) * now.duration));
              }}>
              <div className="h-full rounded-full" style={{ width:`${pct}%`, background:"linear-gradient(90deg,#E8B923,#059669)" }} />
            </div>
            <span className="text-[9px] font-mono text-wm-text-dim shrink-0">{fmt(now.duration)}</span>
          </div>
        )}
        {now.type === "station" && (
          <div className="flex-1 min-w-0 hidden sm:flex items-center justify-center gap-1">
            <LiveWave color={now.color} />
            <span style={{ fontSize:10, color:now.color, fontWeight:700, marginLeft:6 }}>STREAMING LIVE</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onToggle}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background:`linear-gradient(135deg, ${now.color}, ${now.color}88)` }}>
            {playing ? <Pause size={14} className="text-black" /> : <Play size={14} className="text-black ml-0.5" />}
          </button>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
          <button onClick={() => setMuted(m=>!m)} className="text-wm-text-dim hover:text-wm-text transition-colors">
            {muted ? <VolumeX size={13}/> : <Volume2 size={13}/>}
          </button>
          <input type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => { onVolume(+e.target.value); setMuted(false); }}
            className="flex-1" style={{ accentColor:now.color }} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   UPLOAD MODAL — real file picker + URL paste
══════════════════════════════════════════════════════════════ */
const GENRES_LIST = ["Hip-Hop","R&B","Lo-Fi","Trap","Jazz","Pop","Electronic","Beats","Other"];

function UploadModal({ onClose, onAdd, uploader }: {
  onClose: () => void;
  onAdd: (track: Track, url: string) => void;
  uploader: string;
}) {
  const [mode, setMode]         = useState<"file"|"url">("file");
  const [title, setTitle]       = useState("");
  const [artist, setArtist]     = useState("");
  const [genre, setGenre]       = useState("Hip-Hop");
  const [pasteUrl, setPasteUrl] = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("audio/")) { setError("Please select an audio file (MP3, M4A, WAV, etc.)"); return; }
    if (f.size > 60 * 1024 * 1024) { setError("File too large. Max 60 MB."); return; }
    setFile(f);
    setError("");
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => { setDuration(Math.round(audio.duration)); URL.revokeObjectURL(url); });
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Please enter a track title"); return; }
    if (!artist.trim()) { setError("Please enter an artist name"); return; }

    setUploading(true);
    setError("");

    try {
      let finalUrl = "";
      let trackData: Track;

      if (mode === "url") {
        const url = pasteUrl.trim();
        if (!url) { setError("Please paste a URL"); setUploading(false); return; }
        // Directly add URL-based track (no server upload needed)
        trackData = {
          id: Date.now(),
          title: title.trim(), artist: artist.trim(),
          album: "WM Radio Uploads", genre,
          duration: duration || 180, plays: "0",
          color: "#00D4AA", liked: false, verified: false, new: true,
        };
        finalUrl = url;
        // Still save metadata to Supabase
        await supabase.from("radio_tracks").insert({
          title: trackData.title, artist: trackData.artist, genre, duration: trackData.duration,
          storage_path: "", public_url: url, uploader,
        });
      } else {
        if (!file) { setError("Please select a file"); setUploading(false); return; }

        // Upload directly browser → Supabase Storage (avoids Vercel 4.5MB body limit)
        const ext  = file.name.split(".").pop() ?? "mp3";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("radio")
          .upload(path, file, { contentType: file.type || "audio/mpeg", upsert: false });

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData } = supabase.storage.from("radio").getPublicUrl(path);
        finalUrl = urlData.publicUrl;

        // Save metadata to database
        const { data: dbTrack, error: dbErr } = await supabase
          .from("radio_tracks")
          .insert({ title: title.trim(), artist: artist.trim(), genre, duration, storage_path: path, public_url: finalUrl, uploader })
          .select()
          .single();

        if (dbErr) throw new Error(dbErr.message);

        trackData = {
          id: dbTrack.id,
          title: dbTrack.title, artist: dbTrack.artist,
          album: "WM Radio Uploads", genre: dbTrack.genre,
          duration: dbTrack.duration ?? duration, plays: "0",
          color: "#00D4AA", liked: false, verified: false, new: true,
        };
      }

      onAdd(trackData, finalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale:0.92, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.92, y:20 }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background:"#0D1017", border:"1px solid rgba(255,255,255,0.08)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wm-border/50">
          <div>
            <h2 className="text-[15px] font-black text-white">Upload Track</h2>
            <p className="text-[10px] text-wm-text-dim mt-0.5">Add music to WM Radio</p>
          </div>
          <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text p-1"><X size={16}/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:"rgba(255,255,255,0.04)" }}>
            {(["file","url"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                style={mode===m ? { background:"#00D4AA", color:"#000" } : { color:"#5A6575" }}>
                {m === "file" ? "Upload File" : "Paste URL"}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all"
              style={{ borderColor: dragging ? "#00D4AA" : "rgba(255,255,255,0.1)", background: dragging ? "rgba(0,212,170,0.05)" : "transparent" }}>
              <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {file ? (
                <>
                  <CheckCircle size={24} className="text-wm-green" />
                  <p className="text-[12px] text-white font-bold">{file.name}</p>
                  <p className="text-[10px] text-wm-text-dim">{(file.size/1024/1024).toFixed(1)} MB{duration ? ` · ${Math.floor(duration/60)}:${String(duration%60).padStart(2,"0")}` : ""}</p>
                </>
              ) : (
                <>
                  <Music2 size={28} className="text-wm-text-dim" />
                  <p className="text-[12px] text-wm-text-dim">Drop MP3, M4A, WAV here or <span className="text-wm-green">browse</span></p>
                  <p className="text-[10px] text-wm-text-dim">Max 60 MB · Plays locally in your browser</p>
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold text-wm-text-dim uppercase tracking-wider mb-1.5">Audio URL (MP3 / M4A / Stream)</label>
              <input value={pasteUrl} onChange={e => setPasteUrl(e.target.value)}
                placeholder="https://your-cdn.com/track.mp3"
                className="w-full px-3 py-2.5 rounded-xl text-[12px] text-white outline-none"
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
              <p className="text-[9px] text-wm-text-dim mt-1.5">Works with Cloudflare R2, AWS S3, Backblaze B2, Google Drive (direct link), or any public HTTPS URL.</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-wm-text-dim uppercase tracking-wider mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Track name"
                className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-wm-text-dim uppercase tracking-wider mb-1">Artist *</label>
              <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name"
                className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-wm-text-dim uppercase tracking-wider mb-1">Genre</label>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
              {GENRES_LIST.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-wm-red text-[11px]"
              style={{ background:"rgba(255,77,106,0.1)", border:"1px solid rgba(255,77,106,0.25)" }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={uploading}
            className="w-full py-3 rounded-xl font-black text-[13px] transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background:"linear-gradient(135deg,#00D4AA,#00A896)", color:"#000" }}>
            {uploading ? <><Upload size={14} className="animate-bounce" /> Uploading…</> : "Add to Library →"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function RadioPage() {
  const { user } = useAuth();
  const myHandle = user?.handle ?? user?.email?.split("@")[0] ?? "anonymous";
  const radio = useRadio();

  const [tab, setTab] = useState<ContentTab>("radio");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [liked, setLiked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("wm-radio-liked") || "[]") as string[]); } catch { return new Set<string>(); }
  });
  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("wm-radio-liked", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Track which item is "active" for UI highlighting (derived from global radio context)
  const activeStation = radio.nowPlaying?.type === "station" ? radio.nowPlaying.title : null;
  const activeTrackUrl = radio.nowPlaying?.type === "track" ? radio.nowPlaying.url : null;
  const activeEpTitle  = radio.nowPlaying?.type === "episode" ? radio.nowPlaying.title : null;

  const playing = radio.playing;

  const playStation = (id: string) => {
    const s = STATIONS.find(x => x.id === id)!;
    const url = STATION_STREAMS[id] ?? "";
    radio.play({ title: s.name, artist: `Hosted by ${s.host}`, duration: 0, color: s.color, type: "station", url });
  };

  const playTrack = (id: number) => {
    // Check uploaded (real) tracks first — their Supabase IDs can collide with demo IDs 1-7
    const t = userTracks.find(x => x.id === id) ?? TRACKS.find(x => x.id === id);
    if (!t) return;
    const url = uploadedUrls[id] ?? TRACK_URLS[id] ?? "";
    radio.play({ title: t.title, artist: t.artist, duration: t.duration, color: t.color, type: "track", url });
  };

  const playEpisode = (id: number) => {
    const e = EPISODES.find(x => x.id === id)!;
    radio.play({ title: e.title, artist: e.host, duration: e.duration, color: e.color, type: "episode", url: "" });
  };

  const togglePlay = () => radio.toggle();

  // ── Upload state ─────────────────────────────────────────────
  const [showUpload, setShowUpload]   = useState(false);
  const [userTracks, setUserTracks]   = useState<Track[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<Record<number, string>>({});

  // Load uploaded tracks from Supabase on mount
  useEffect(() => {
    supabase.from("radio_tracks").select("*").order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const tracks: Track[] = data.map(r => ({
          id: r.id, title: r.title, artist: r.artist,
          album: "WM Radio Uploads", genre: r.genre,
          duration: r.duration ?? 180, plays: r.plays?.toString() ?? "0",
          color: "#00D4AA", liked: false, verified: false, new: false,
        }));
        const urls: Record<number, string> = {};
        data.forEach(r => { urls[r.id] = r.public_url; });
        setUserTracks(tracks);
        setUploadedUrls(urls);
      });
  }, []);

  const addUserTrack = (track: Track, url: string) => {
    setUserTracks(prev => [track, ...prev]);
    setUploadedUrls(prev => ({ ...prev, [track.id]: url }));
  };

  // Merged track list for display
  const allTracks = [...TRACKS, ...userTracks];

  // Genres for music tab
  const allGenres = ["All", ...Array.from(new Set(allTracks.map(t => t.genre)))];
  const filteredTracks = allTracks.filter(t =>
    (genreFilter === "All" || t.genre === genreFilter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()))
  );

  const TABS: { id: ContentTab; label: string; icon: React.ReactNode }[] = [
    { id:"radio",    label:"Live Radio",  icon:<Radio size={13}/> },
    { id:"music",    label:"Music",       icon:<Music2 size={13}/> },
    { id:"podcasts", label:"Podcasts",    icon:<Mic size={13}/> },
    { id:"artists",  label:"Artists",     icon:<Users size={13}/> },
  ];

  return (
    <div className="flex flex-col h-full bg-wm-dark overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-6 pb-4" style={{ borderBottom:"1px solid rgba(30,32,48,0.8)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background:"linear-gradient(135deg, #00D4AA44, #00D4AA18)", border:"1px solid rgba(0,212,170,0.3)" }}>
            <Radio size={18} className="text-wm-green" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-wm-text tracking-tight">WM Radio</h1>
            <p className="text-[11px] text-wm-text-muted">Music, podcasts & live streams from the WM community</p>
          </div>

          {/* Live badge */}
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background:"rgba(255,77,106,0.12)", border:"1px solid rgba(255,77,106,0.35)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span style={{ fontSize:10, fontWeight:800, color:"#FF4D6A", letterSpacing:0.5 }}>
              {STATIONS.filter(s=>s.live).reduce((a,s)=>a+s.listeners,0).toLocaleString()} LIVE LISTENERS
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                tab === t.id
                  ? "bg-wm-green text-wm-black"
                  : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface"
              )}>
              {t.icon}{t.label}
            </button>
          ))}

          {/* Search */}
          {(tab === "music" || tab === "podcasts") && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-wm-surface border border-wm-border">
              <Search size={12} className="text-wm-text-dim" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === "music" ? "Search tracks, artists…" : "Search episodes…"}
                className="bg-transparent text-[11px] text-wm-text outline-none placeholder-wm-text-dim w-40"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth:"thin" }}>

        {/* ─ RADIO STATIONS ─ */}
        {tab === "radio" && (
          <div>
            {/* Featured Station */}
            <div className="mb-6">
              <div className="relative rounded-3xl overflow-hidden"
                style={{
                  background: "radial-gradient(95% 130% at 78% 50%, rgba(5,80,58,0.5) 0%, transparent 58%)," +
                              "radial-gradient(80% 120% at 10% 15%, rgba(232,185,35,0.14) 0%, transparent 55%)," +
                              "linear-gradient(135deg, #0a1512 0%, #0c0d13 55%, #0a0a06 100%)",
                  border: "1px solid rgba(232,185,35,0.30)", boxShadow: "0 0 54px rgba(232,185,35,0.12)",
                }}>
                {/* faint vinyl grooves */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{ background: "repeating-radial-gradient(circle at 80% 50%, #E8B923 0 1px, transparent 1px 10px)" }} />
                {/* big ambient gold waveform across the hero — thin crisp bars */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 flex items-center justify-between" style={{ height: 132, opacity: 0.45 }}>
                  {Array.from({ length: 68 }).map((_, i) => {
                    const on = activeStation === "WM Radio" && playing;
                    const h = Math.min(100, 14 + Math.abs(Math.sin(i * 0.55) + Math.sin(i * 0.17)) * 46 + (i % 4) * 6);
                    return <div key={i} style={{ width: 3, height: `${h}%`, borderRadius: 2, transformOrigin: "center",
                      background: i % 5 === 0 ? "rgba(232,185,35,0.75)" : "rgba(232,185,35,0.26)",
                      animation: `wm-eq ${(0.8 + (i % 5) * 0.13).toFixed(2)}s ease-in-out ${(i * 0.03).toFixed(2)}s infinite alternate`,
                      animationPlayState: on ? "running" : "paused" }} />;
                  })}
                </div>

                <div className="relative z-10 flex items-center justify-between gap-6 p-7 sm:p-9" style={{ minHeight: 244 }}>
                  {/* Left copy */}
                  <div style={{ maxWidth: 420 }}>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-3" style={{ background: "rgba(232,185,35,0.14)", border: "1px solid rgba(232,185,35,0.5)" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, color: "#E8B923" }}>LIVE</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-wm-text-muted mb-1">Featured Station</div>
                    <h2 className="font-black text-wm-text leading-none mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 40, letterSpacing: 0.5 }}>WM Radio</h2>
                    <p className="text-[12px] font-semibold mb-1" style={{ color: "#E8B923" }}>Jazz roots → hip-hop → future-forward</p>
                    <p className="text-[11px] text-wm-text-muted mb-4" style={{ maxWidth: 360 }}>Black excellence on air, 24/7 — trading culture, hip-hop, R&B, lo-fi and more.</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => activeStation === "WM Radio" ? togglePlay() : playStation("wm-main")}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[13px] transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #E8B923, #059669)", color: "#0b0a06", boxShadow: "0 10px 26px rgba(232,185,35,0.32)" }}>
                        {activeStation === "WM Radio" && playing ? <><Pause size={15}/> Pause</> : <><Play size={15} className="ml-0.5"/> Tune In</>}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-wm-text-dim" />
                        <span className="text-[11px] text-wm-text-muted font-mono">1,842 listening</span>
                      </div>
                    </div>
                  </div>

                  {/* Right — gold sunburst + spinning vinyl + play */}
                  <div className="relative shrink-0 hidden md:flex items-center justify-center" style={{ width: 196, height: 196 }}>
                    <div className="absolute inset-0 rounded-full animate-[spin_30s_linear_infinite]" style={{
                      background: "repeating-conic-gradient(from 0deg, rgba(232,185,35,0.55) 0deg 1.3deg, transparent 1.3deg 6deg)",
                      WebkitMaskImage: "radial-gradient(circle closest-side, transparent 72%, #000 76%, #000 96%, transparent 100%)",
                      maskImage: "radial-gradient(circle closest-side, transparent 72%, #000 76%, #000 96%, transparent 100%)",
                    }} />
                    <div className={`relative rounded-full ${activeStation === "WM Radio" && playing ? "animate-[spin_3.6s_linear_infinite]" : "animate-[spin_20s_linear_infinite]"}`}
                      style={{ width: 148, height: 148, background: "repeating-radial-gradient(circle, #141310 0 2px, #08080c 2px 5px)", border: "1px solid rgba(232,185,35,0.45)", boxShadow: "0 10px 34px rgba(0,0,0,0.6)" }} />
                    <button
                      onClick={() => activeStation === "WM Radio" ? togglePlay() : playStation("wm-main")}
                      className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ width: 56, height: 56, background: "rgba(11,10,6,0.72)", border: "2px solid #E8B923", boxShadow: "0 0 22px rgba(232,185,35,0.55)" }}>
                      {activeStation === "WM Radio" && playing ? <Pause size={22} style={{ color: "#E8B923" }} /> : <Play size={22} className="ml-0.5" style={{ color: "#E8B923" }} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Heritage Channels — bold genre tiles */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Signal size={13} className="text-wm-text-muted" />
                  <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">Heritage Channels</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: "#E8B923" }}>#E8B923</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {[
                  { name: "Hip-Hop",     station: "wm-hiphop", from: "#E8B923", to: "#8a6a12" },
                  { name: "R&B",         station: "wm-rnb",    from: "#8B5CF6", to: "#4c2d99" },
                  { name: "Smooth Jazz", station: "wm-main",   from: "#059669", to: "#053f31" },
                  { name: "Lo-Fi",       station: "wm-lofi",   from: "#4FA3E0", to: "#1e5f8f" },
                  { name: "Soul",        station: "wm-rnb",    from: "#FF6B9D", to: "#a03b62" },
                  { name: "Afrobeats",   station: "wm-global", from: "#00C853", to: "#067a34" },
                  { name: "Beats",       station: "wm-beats",  from: "#F0B429", to: "#96700f" },
                ].map(g => (
                  <button key={g.name} onClick={() => playStation(g.station)}
                    className="relative shrink-0 rounded-2xl overflow-hidden group transition-transform hover:scale-[1.03]"
                    style={{ width: 186, height: 110, background: `linear-gradient(140deg, ${g.from}, ${g.to})`, boxShadow: `0 8px 22px ${g.from}33` }}>
                    {/* white waveform */}
                    <div className="absolute inset-x-4 bottom-4 flex items-end gap-[2px]" style={{ height: 40, opacity: 0.9 }}>
                      {[10,20,32,18,40,26,44,22,36,16,30,24,38,20,28,14,34,18].map((h, j) => (
                        <div key={j} style={{ flex: 1, height: `${Math.min(100, h * 2.4)}%`, borderRadius: 2, background: "rgba(255,255,255,0.85)" }} />
                      ))}
                    </div>
                    <span className="absolute top-3 left-4 text-white font-black text-[16px]" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>{g.name}</span>
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.55)" }}>
                      <Play size={13} className="text-white ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* All Stations Grid */}
            <div className="flex items-center gap-2 mb-3">
              <Signal size={13} className="text-wm-text-muted" />
              <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">All Channels</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {STATIONS.map(s => (
                <StationCard key={s.id} station={s}
                  active={activeStation === s.name}
                  onPlay={() => activeStation === s.name ? togglePlay() : playStation(s.id)}
                />
              ))}
            </div>

            {/* Recent Tracks */}
            {userTracks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={13} className="text-wm-text-muted" />
                    <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">Latest Uploads</span>
                  </div>
                  <button onClick={() => setTab("music")} className="flex items-center gap-1 text-[10px] text-wm-green hover:underline">
                    See all <ChevronRight size={10}/>
                  </button>
                </div>
                <div className="space-y-2">
                  {userTracks.slice(0,5).map((t,i) => (
                    <TrackRow key={t.id} track={t} idx={i}
                      active={activeTrackUrl === (uploadedUrls[t.id] ?? TRACK_URLS[t.id] ?? "")}
                      playing={playing}
                      onPlay={() => activeTrackUrl === (uploadedUrls[t.id] ?? TRACK_URLS[t.id] ?? "") ? togglePlay() : playTrack(t.id)}
                      liked={liked.has(String(t.id))}
                      onToggleLike={() => toggleLike(String(t.id))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─ MUSIC ─ */}
        {tab === "music" && (
          <div>
            {/* Upload button for core team */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-wm-text-dim">{allTracks.length} tracks</span>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#00D4AA,#00A896)", color: "#000" }}
              >
                <Plus size={12} /> Upload Track
              </button>
            </div>
            {/* Genre filter */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
              {allGenres.map(g => (
                <button key={g} onClick={() => setGenreFilter(g)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all shrink-0",
                    genreFilter === g
                      ? "bg-wm-green text-wm-black"
                      : "bg-wm-surface text-wm-text-muted hover:text-wm-text border border-wm-border/50"
                  )}>
                  {g}
                </button>
              ))}
            </div>

            {/* Featured station card */}
            <div className="relative rounded-2xl overflow-hidden mb-4 p-4 flex items-center gap-4"
              style={{ background: "linear-gradient(135deg, rgba(232,185,35,0.10), rgba(13,14,20,0.9))", border: "1px solid rgba(232,185,35,0.25)" }}>
              <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center animate-[spin_5s_linear_infinite]"
                style={{ background: "repeating-radial-gradient(circle, #141310 0 1.5px, #08080c 1.5px 4px)", border: "1px solid rgba(232,185,35,0.4)" }}>
                <div className="w-4 h-4 rounded-full" style={{ background: "linear-gradient(135deg,#E8B923,#059669)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-black uppercase tracking-widest text-wm-text-muted">Station</div>
                <div className="text-[13px] font-black text-wm-text">WM Radio — All Genres</div>
              </div>
              <div className="hidden sm:flex items-center gap-[2px]" style={{ height: 30 }}>
                {Array.from({ length: 34 }).map((_, i) => { const h = Math.min(100, 20 + Math.abs(Math.sin(i * 0.6)) * 80); return <div key={i} style={{ width: 3, height: `${h}%`, borderRadius: 2, background: "rgba(232,185,35,0.6)" }} />; })}
              </div>
              <button onClick={() => playStation("wm-main")} className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: "linear-gradient(135deg,#E8B923,#059669)", boxShadow: "0 4px 14px rgba(232,185,35,0.4)" }}>
                <Play size={16} className="text-black ml-0.5" />
              </button>
            </div>

            {/* Track list */}
            <div className="space-y-2">
              {filteredTracks.length === 0 ? (
                <div className="py-12 text-center text-wm-text-dim text-[12px]">No tracks found</div>
              ) : filteredTracks.map((t,i) => (
                <TrackRow key={t.id} track={t} idx={i}
                  active={activeTrackUrl === (uploadedUrls[t.id] ?? TRACK_URLS[t.id] ?? "")}
                  playing={playing}
                  onPlay={() => activeTrackUrl === (uploadedUrls[t.id] ?? TRACK_URLS[t.id] ?? "") ? togglePlay() : playTrack(t.id)}
                  liked={liked.has(String(t.id))}
                  onToggleLike={() => toggleLike(String(t.id))}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─ PODCASTS ─ */}
        {tab === "podcasts" && (
          <div>
            <div className="space-y-3">
              {EPISODES
                .filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.host.toLowerCase().includes(search.toLowerCase()))
                .map(ep => (
                  <EpisodeCard key={ep.id} ep={ep}
                    active={activeEpTitle === ep.title}
                    playing={playing}
                    onPlay={() => activeEpTitle === ep.title ? togglePlay() : playEpisode(ep.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* ─ ARTISTS ─ */}
        {tab === "artists" && (
          <div>
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={13} className="text-wm-green" />
                <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">WM Team</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {ARTISTS.filter(a => a.wm_team).map(a => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={13} className="text-wm-text-muted" />
                <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">Community Artists</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {ARTISTS.filter(a => !a.wm_team).map(a => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onAdd={(track, url) => { addUserTrack(track, url); setShowUpload(false); }}
            uploader={myHandle}
          />
        )}
      </AnimatePresence>

      {/* ── CSS for wave animation ─────────────────────────────── */}
      <style>{`
        @keyframes wm-wave-bar {
          from { height: 4px; }
          to   { height: 18px; }
        }
        @keyframes wm-eq {
          0%   { transform: scaleY(0.26); }
          100% { transform: scaleY(1); }
        }
        /* Idle station-card waveforms are frozen; they come alive on hover */
        .wm-station-card:hover [data-eq] { animation-play-state: running !important; }
      `}</style>
    </div>
  );
}
