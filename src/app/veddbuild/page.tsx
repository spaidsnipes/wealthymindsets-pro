"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Globe, BookOpen, TrendingUp, Heart, Play, Star, Users, Youtube, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";

const DEVOTIONS = [
  {
    id: 1,
    title: "Trading with Purpose: Why Discipline Beats Talent",
    verse: "\"For God has not given us a spirit of fear, but of power and of love and of a sound mind.\" — 2 Timothy 1:7",
    body: "Every trade you take is a reflection of your mindset. When fear drives your decisions, you abandon your plan. When faith in your process drives you, you execute with precision. Today's devotion is about replacing reactive trading with intentional action.",
    category: "Discipline",
    readTime: "3 min",
    date: "Today",
    color: "#8B5CF6",
  },
  {
    id: 2,
    title: "Patience at the Right Location: The CLC Mindset",
    verse: "\"Wait for the LORD; be strong and take heart and wait for the LORD.\" — Psalm 27:14",
    body: "Context. Location. Confirmation. The CLC Rule isn't just a trading strategy — it's a spiritual discipline. Waiting for the right location means trusting that the setup will come to you. Chasing trades is the opposite of faith.",
    category: "Strategy",
    readTime: "4 min",
    date: "Yesterday",
    color: "#4FA3E0",
  },
  {
    id: 3,
    title: "When You Take a Loss: Staying Grounded in Your Process",
    verse: "\"Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds.\" — James 1:2",
    body: "Losses are inevitable. How you respond to them defines your trajectory. A loss is not a failure of character — it is data. Journal it, learn from it, and return tomorrow with the same conviction.",
    category: "Psychology",
    readTime: "5 min",
    date: "2 days ago",
    color: "#FF4D6A",
  },
];

const FOREX_SETUPS = [
  { pair: "EUR/USD", bias: "Bullish", timeframe: "4H", setup: "VWAP Reclaim + OB", confluence: 4, pips: "+42", active: true },
  { pair: "GBP/USD", bias: "Bearish", timeframe: "1H", setup: "Break of Structure", confluence: 3, pips: "-28", active: true },
  { pair: "USD/JPY", bias: "Bullish", timeframe: "D",  setup: "Wyckoff Spring",     confluence: 5, pips: "+87", active: false },
  { pair: "AUD/USD", bias: "Neutral", timeframe: "4H", setup: "Range Compression",  confluence: 2, pips: "—",   active: false },
];

const COMMUNITY_STATS = [
  { label: "Members",     value: "2,847",  icon: Users,      color: "#00D4AA" },
  { label: "Devotions",   value: "312",    icon: BookOpen,   color: "#8B5CF6" },
  { label: "Setups Live", value: "8",      icon: TrendingUp, color: "#F0B429" },
  { label: "Win Rate",    value: "73%",    icon: Flame,      color: "#FF4D6A" },
];

export default function VeddBuildPage() {
  const [activeTab, setActiveTab] = useState<"devotions" | "forex" | "community">("devotions");
  const [selectedDevo, setSelectedDevo] = useState(DEVOTIONS[0]);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col h-full bg-wm-black overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-wm-border bg-wm-dark shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #4FA3E0 0%, #8B5CF6 100%)" }}
        >
          <Globe size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-wm-text tracking-wide">VeddBuild</h1>
          <p className="text-[10px] text-wm-text-muted">Faith · Forex · Mindset · Community</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://veddbuild.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #4FA3E0 0%, #8B5CF6 100%)", boxShadow: "0 0 12px rgba(79,163,224,0.35)" }}
          >
            <ExternalLink size={11} />
            Visit veddbuild.com
          </a>
          <span className={`w-2 h-2 rounded-full ${pulse ? "bg-wm-green" : "bg-wm-green/50"} transition-colors`} />
          <span className="text-[10px] text-wm-green font-semibold">COMMUNITY LIVE</span>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────── */}
      <div className="grid grid-cols-4 border-b border-wm-border shrink-0">
        {COMMUNITY_STATS.map(s => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2 border-r border-wm-border last:border-r-0">
            <s.icon size={13} style={{ color: s.color }} />
            <div>
              <div className="text-xs font-black text-wm-text">{s.value}</div>
              <div className="text-[9px] text-wm-text-dim">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex border-b border-wm-border shrink-0">
        {(["devotions", "forex", "community"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-all border-b-2 ${
              activeTab === tab
                ? "border-wm-blue text-wm-blue bg-wm-blue/5"
                : "border-transparent text-wm-text-muted hover:text-wm-text"
            }`}
          >
            {tab === "devotions" ? "📖 Daily Devotions" : tab === "forex" ? "📈 Forex Setups" : "🙏 Community"}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "devotions" && (
          <div className="flex h-full">
            {/* Devotion list */}
            <div className="w-72 shrink-0 border-r border-wm-border overflow-y-auto">
              {DEVOTIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevo(d)}
                  className={`w-full text-left p-3 border-b border-wm-border/50 transition-all ${
                    selectedDevo.id === d.id ? "bg-wm-surface" : "hover:bg-wm-surface/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${d.color}20`, color: d.color }}
                    >
                      {d.category}
                    </span>
                    <span className="text-[9px] text-wm-text-dim">{d.date}</span>
                  </div>
                  <p className="text-xs font-semibold text-wm-text leading-snug line-clamp-2">{d.title}</p>
                  <p className="text-[10px] text-wm-text-dim mt-1">{d.readTime} read</p>
                </button>
              ))}
              <div className="p-3 border-t border-wm-border text-center">
                <button
                  onClick={() => window.open("https://www.youtube.com/@VeddBuild", "_blank", "noopener,noreferrer")}
                  className="text-xs text-wm-blue hover:text-wm-text transition-colors">
                  View all devotions on YouTube →
                </button>
              </div>
            </div>

            {/* Devotion reader */}
            <div className="flex-1 overflow-y-auto p-6">
              <motion.div
                key={selectedDevo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="px-2 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: `${selectedDevo.color}20`, color: selectedDevo.color }}
                  >
                    {selectedDevo.category}
                  </span>
                  <span className="text-xs text-wm-text-dim">{selectedDevo.readTime} read · {selectedDevo.date}</span>
                </div>

                <h2 className="text-xl font-black text-wm-text mb-4 leading-snug">{selectedDevo.title}</h2>

                <blockquote
                  className="border-l-2 pl-4 py-1 mb-5 italic text-sm text-wm-text-muted leading-relaxed"
                  style={{ borderColor: selectedDevo.color }}
                >
                  {selectedDevo.verse}
                </blockquote>

                <p className="text-sm text-wm-text leading-relaxed mb-6">{selectedDevo.body}</p>

                {/* Reflection prompt */}
                <div className="rounded-xl p-4 bg-wm-surface border border-wm-border">
                  <p className="text-xs font-semibold text-wm-text-muted uppercase tracking-wider mb-2">Today's Reflection</p>
                  <p className="text-sm text-wm-text">
                    In your next session, identify one moment where emotion overrode your plan. Write it in your journal — that is where growth begins.
                  </p>
                </div>

                {/* YouTube embed placeholder */}
                <div
                  onClick={() => window.open("https://www.youtube.com/@VeddBuild", "_blank", "noopener,noreferrer")}
                  className="mt-4 rounded-xl border border-wm-border flex items-center justify-center cursor-pointer hover:border-wm-red/50 transition-all group"
                  style={{ height: 160, background: "linear-gradient(135deg, #0D1117, #1C2128)" }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-wm-red/20 border border-wm-red/40 flex items-center justify-center group-hover:bg-wm-red/30 transition-all">
                      <Play size={20} className="text-wm-red ml-0.5" />
                    </div>
                    <span className="text-xs text-wm-text-muted">Watch on YouTube</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === "forex" && (
          <div className="overflow-y-auto h-full p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-wm-text">Live Forex Setups</h2>
              <span className="text-[10px] text-wm-text-dim">Updated every 15m</span>
            </div>
            {FOREX_SETUPS.map(s => (
              <div key={s.pair} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-wm-text font-mono">{s.pair}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        s.bias === "Bullish" ? "bg-wm-green/15 text-wm-green" :
                        s.bias === "Bearish" ? "bg-wm-red/15 text-wm-red" :
                        "bg-wm-surface text-wm-text-muted"
                      }`}>{s.bias}</span>
                      <span className="px-1.5 py-0.5 bg-wm-surface rounded text-[9px] text-wm-text-dim">{s.timeframe}</span>
                      {s.active && <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse" />}
                    </div>
                    <p className="text-xs text-wm-text-muted">{s.setup}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-wm-text-dim">Confluence: </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-3 h-1.5 rounded-sm ${i < s.confluence ? "bg-wm-green" : "bg-wm-surface"}`} />
                        ))}
                      </div>
                      <span className="text-[9px] text-wm-text-dim">{s.confluence}/5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black ${
                      s.pips.startsWith("+") ? "text-wm-green" : s.pips.startsWith("-") ? "text-wm-red" : "text-wm-text-muted"
                    }`}>{s.pips}</div>
                    <div className="text-[9px] text-wm-text-dim">pips target</div>
                  </div>
                </div>
              </div>
            ))}

            {/* YouTube channel promo */}
            <div
              onClick={() => window.open("https://www.youtube.com/@VeddBuild", "_blank", "noopener,noreferrer")}
              className="rounded-xl border border-wm-red/30 p-4 flex items-center gap-3 cursor-pointer hover:border-wm-red/60 transition-all"
              style={{ background: "linear-gradient(135deg, rgba(255,77,106,0.05), transparent)" }}
            >
              <Youtube size={24} className="text-wm-red shrink-0" />
              <div>
                <p className="text-xs font-bold text-wm-text">VeddBuild YouTube Channel</p>
                <p className="text-[10px] text-wm-text-dim">Daily live streams, trade recaps, and faith-based mindset content</p>
              </div>
              <ChevronRight size={14} className="text-wm-text-dim ml-auto shrink-0" />
            </div>
          </div>
        )}

        {activeTab === "community" && (
          <div className="overflow-y-auto h-full p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Weekly Challenge", desc: "Paper trade the CLC Rule setup on NQ this week. Post your journal entry.", reward: "🏆 +50 XP", color: "#F0B429" },
                { label: "Prayer Circle", desc: "Daily morning prayer for discipline, clarity, and profitable sessions.", reward: "🙏 Daily", color: "#8B5CF6" },
                { label: "Trade Review", desc: "Share your best and worst trade this week for community feedback.", reward: "📊 Feedback", color: "#4FA3E0" },
                { label: "Faith & Finance", desc: "Monthly book club: This month — 'The Psychology of Money'", reward: "📚 Monthly", color: "#00D4AA" },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={() => window.open("https://www.youtube.com/@VeddBuild/community", "_blank", "noopener,noreferrer")}
                  className="glass rounded-xl p-3 cursor-pointer hover:border-wm-border/80 transition-all"
                >
                  <div className="text-xs font-bold text-wm-text mb-1">{item.label}</div>
                  <p className="text-[10px] text-wm-text-muted leading-relaxed mb-2">{item.desc}</p>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: `${item.color}20`, color: item.color }}
                  >
                    {item.reward}
                  </span>
                </div>
              ))}
            </div>

            {/* Top members */}
            <h3 className="text-xs font-bold text-wm-text mb-2">🔥 Top This Week</h3>
            <div className="space-y-1.5">
              {[
                { rank: 1, name: "Spade_CLC",   xp: 1420, badge: "👑" },
                { rank: 2, name: "FaithTrader", xp: 1188, badge: "⚡" },
                { rank: 3, name: "GodsPips",    xp: 1047, badge: "🔥" },
                { rank: 4, name: "VeddVault",   xp: 924,  badge: "💎" },
                { rank: 5, name: "NQKing21",    xp: 810,  badge: "🎯" },
              ].map(m => (
                <div key={m.rank} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-wm-surface/50 hover:bg-wm-surface transition-all">
                  <span className="text-xs font-black text-wm-text-dim w-5">#{m.rank}</span>
                  <span className="text-base">{m.badge}</span>
                  <span className="flex-1 text-xs font-semibold text-wm-text">{m.name}</span>
                  <span className="text-xs text-wm-gold font-bold">{m.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
