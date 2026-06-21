"use client";

/**
 * Copy Trading — Tier-based copy trading with Free, WM Pro, and Elite tiers.
 * Shows trader leaderboard, tier features, and simulated copy-trade setup.
 */

import React, { useState, useEffect } from "react";
import {
  Users, Crown, Star, Zap, TrendingUp, TrendingDown, Lock,
  CheckCircle2, Copy, ChevronRight, BarChart2, Shield, DollarSign,
  Activity, AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

/* ── Types ─────────────────────────────────────────────────── */
interface Trader {
  id:         string;
  name:       string;
  avatar:     string;
  tier:       "free" | "pro" | "elite";
  winRate:    number;
  monthPct:   number;
  allTimePct: number;
  followers:  number;
  risk:       "Low" | "Medium" | "High";
  instruments: string[];
  verified:   boolean;
  minTier:    "free" | "pro" | "elite"; // minimum tier to copy
}

/* ── Mock trader roster ────────────────────────────────────── */
const TRADERS: Trader[] = [
  {
    id: "spaid1", name: "DSpaid", avatar: "💎", tier: "elite",
    winRate: 74, monthPct: 18.4, allTimePct: 312,
    followers: 2841, risk: "Medium", instruments: ["NQ1!", "ES1!", "NVDA", "TSLA"],
    verified: true, minTier: "free",
  },
  {
    id: "flw1", name: "OrderFlowKing", avatar: "🦅", tier: "elite",
    winRate: 68, monthPct: 12.7, allTimePct: 185,
    followers: 1204, risk: "High", instruments: ["NQ1!", "ES1!", "CL1!"],
    verified: true, minTier: "pro",
  },
  {
    id: "flw2", name: "NQNinja", avatar: "🥷", tier: "pro",
    winRate: 63, monthPct: 9.1, allTimePct: 94,
    followers: 788, risk: "Medium", instruments: ["NQ1!", "QQQ", "AAPL"],
    verified: true, minTier: "pro",
  },
  {
    id: "flw3", name: "GoldenVWAP", avatar: "⚡", tier: "pro",
    winRate: 71, monthPct: 6.8, allTimePct: 127,
    followers: 542, risk: "Low", instruments: ["AAPL", "MSFT", "SPY", "QQQ"],
    verified: true, minTier: "free",
  },
  {
    id: "flw4", name: "WyckoffPro", avatar: "📊", tier: "elite",
    winRate: 66, monthPct: 14.2, allTimePct: 228,
    followers: 1678, risk: "Medium", instruments: ["ES1!", "BTC", "ETH"],
    verified: true, minTier: "elite",
  },
  {
    id: "flw5", name: "TapeReader99", avatar: "🎯", tier: "pro",
    winRate: 59, monthPct: 5.4, allTimePct: 67,
    followers: 319, risk: "Low", instruments: ["SPY", "QQQ", "TSLA"],
    verified: false, minTier: "free",
  },
];

/* ── Tier definitions ──────────────────────────────────────── */
const TIERS = [
  {
    id:       "free",
    label:    "Free",
    price:    "$0",
    period:   "forever",
    color:    "#8896BE",
    border:   "rgba(136,150,190,0.35)",
    bg:       "rgba(136,150,190,0.06)",
    icon:     <Star size={20} color="#8896BE" />,
    features: [
      "Copy up to 2 verified traders",
      "Max $1,000 paper allocation per trade",
      "Basic performance dashboard",
      "Public trader leaderboard access",
      "Weekly performance reports",
    ],
    limits: "Paper trading only · 2 traders · $1K max",
  },
  {
    id:       "pro",
    label:    "WM Pro",
    price:    "$49",
    period:   "per month",
    color:    "#4FA3E0",
    border:   "rgba(79,163,224,0.45)",
    bg:       "rgba(79,163,224,0.08)",
    badge:    "MOST POPULAR",
    icon:     <Zap size={20} color="#4FA3E0" />,
    features: [
      "Copy up to 10 traders simultaneously",
      "Max $25,000 allocation per trader",
      "Real-time trade mirroring with 0.5s delay",
      "Risk controls: max drawdown, position size",
      "Advanced analytics: Sharpe, Sortino, MAE/MFE",
      "Priority customer support",
      "Access to Pro tier exclusive traders",
    ],
    limits: "Paper + Live (broker required) · 10 traders · $25K max",
  },
  {
    id:       "elite",
    label:    "Elite",
    price:    "$199",
    period:   "per month",
    color:    "#F0B429",
    border:   "rgba(240,180,41,0.5)",
    bg:       "rgba(240,180,41,0.08)",
    badge:    "PRO TRADERS",
    icon:     <Crown size={20} color="#F0B429" />,
    features: [
      "Unlimited trader copying",
      "Unlimited allocation size",
      "Sub-100ms trade mirror latency",
      "Full API access for custom automation",
      "Exclusive access to Elite tier traders (incl. DSpaid)",
      "1-on-1 onboarding call with WM team",
      "Private Discord group with signals",
      "Portfolio rebalancing automation",
      "Multi-broker smart routing",
    ],
    limits: "Paper + Live · Unlimited · Sub-100ms latency",
  },
];

/* ── Components ────────────────────────────────────────────── */
function RiskBadge({ risk }: { risk: Trader["risk"] }) {
  const colors = { Low: "#00D4AA", Medium: "#F0B429", High: "#FF4D6A" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
      background: `${colors[risk]}22`, color: colors[risk], letterSpacing: 0.5,
    }}>{risk} Risk</span>
  );
}

function TierBadge({ tier }: { tier: Trader["tier"] | Trader["minTier"] }) {
  const cfg = { free: { label: "FREE", color: "#8896BE" }, pro: { label: "PRO", color: "#4FA3E0" }, elite: { label: "ELITE", color: "#F0B429" } };
  const c = cfg[tier];
  return (
    <span style={{
      fontSize: 8, fontWeight: 900, padding: "2px 5px", borderRadius: 3,
      background: `${c.color}22`, color: c.color, letterSpacing: 1,
    }}>{c.label}</span>
  );
}

function TraderCard({ trader, userTier, onCopy }: {
  trader: Trader;
  userTier: "free" | "pro" | "elite";
  onCopy: (t: Trader) => void;
}) {
  const tierRank = { free: 0, pro: 1, elite: 2 };
  const locked = tierRank[userTier] < tierRank[trader.minTier];
  const up = trader.monthPct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "#0D1117",
        border: `1px solid ${locked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 10, padding: "14px 16px",
        opacity: locked ? 0.6 : 1,
        cursor: locked ? "not-allowed" : "pointer",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "#1A2030", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>{trader.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF3" }}>{trader.name}</span>
            {trader.verified && <CheckCircle2 size={12} color="#00D4AA" />}
            <TierBadge tier={trader.tier} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Users size={10} color="#5A6575" />
            <span style={{ fontSize: 10, color: "#5A6575" }}>{trader.followers.toLocaleString()} followers</span>
            <RiskBadge risk={trader.risk} />
          </div>
        </div>
        {locked ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={13} color="#5A6575" />
            <TierBadge tier={trader.minTier} />
          </div>
        ) : (
          <button
            onClick={() => onCopy(trader)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
              background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.35)",
              borderRadius: 6, color: "#00D4AA", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Copy size={11} /> Copy
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, background: "#0A0E14", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 9, color: "#5A6575", marginBottom: 2 }}>WIN RATE</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: trader.winRate >= 65 ? "#00D4AA" : trader.winRate >= 55 ? "#F0B429" : "#FF4D6A" }}>
            {trader.winRate}%
          </div>
        </div>
        <div style={{ flex: 1, background: "#0A0E14", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 9, color: "#5A6575", marginBottom: 2 }}>THIS MONTH</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: up ? "#00D4AA" : "#FF4D6A", display: "flex", alignItems: "center", gap: 4 }}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? "+" : ""}{trader.monthPct}%
          </div>
        </div>
        <div style={{ flex: 1, background: "#0A0E14", borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ fontSize: 9, color: "#5A6575", marginBottom: 2 }}>ALL TIME</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: trader.allTimePct >= 0 ? "#00D4AA" : "#FF4D6A" }}>
            +{trader.allTimePct}%
          </div>
        </div>
      </div>

      {/* Instruments */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {trader.instruments.map(sym => (
          <span key={sym} style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 3,
            background: "rgba(79,163,224,0.1)", color: "#4FA3E0", fontFamily: "monospace", fontWeight: 700,
          }}>{sym}</span>
        ))}
      </div>
    </motion.div>
  );
}

function CopyModal({ trader, onClose }: { trader: Trader; onClose: () => void }) {
  const [allocation, setAllocation] = useState("1000");
  const [maxDD, setMaxDD] = useState("10");
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [done, setDone] = useState(false);

  const onSubmit = () => {
    localStorage.setItem("wm_copy_waitlist", JSON.stringify({
      trader: trader.name,
      joined: true,
      date: new Date().toISOString(),
    }));
    setDone(true);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          background: "#0D1117", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12, padding: 24, width: 380, maxWidth: "90vw",
        }}
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={40} color="#00D4AA" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF3" }}>You&apos;re on the list!</div>
            <div style={{ fontSize: 12, color: "#8B95A5", marginTop: 6 }}>
              Copy Trading is launching soon! You&apos;re on the priority list for {trader.name}. We&apos;ll notify you when live copy trading goes live.
            </div>
            <button onClick={onClose} style={{ marginTop: 16, padding: "8px 20px", background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.4)", borderRadius: 8, color: "#00D4AA", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>{trader.avatar}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF3" }}>Copy {trader.name}</div>
                <div style={{ fontSize: 11, color: "#8B95A5" }}>Configure your copy settings</div>
              </div>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#8B95A5", marginBottom: 6, fontWeight: 700 }}>TRADING MODE</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["paper", "live"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 6,
                    border: `1px solid ${mode === m ? "rgba(0,212,170,0.5)" : "rgba(255,255,255,0.08)"}`,
                    background: mode === m ? "rgba(0,212,170,0.12)" : "#0A0E14",
                    color: mode === m ? "#00D4AA" : "#8B95A5",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  }}>
                    {m === "paper" ? "📝 Paper" : "💰 Live"}
                  </button>
                ))}
              </div>
              {mode === "live" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "8px 10px", background: "rgba(240,180,41,0.1)", borderRadius: 6, border: "1px solid rgba(240,180,41,0.3)" }}>
                  <AlertCircle size={12} color="#F0B429" />
                  <span style={{ fontSize: 10, color: "#F0B429" }}>Live trading requires broker API connection</span>
                </div>
              )}
            </div>

            {/* Allocation */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#8B95A5", marginBottom: 6, fontWeight: 700 }}>ALLOCATION ($)</div>
              <input
                type="number"
                value={allocation}
                onChange={e => setAllocation(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", background: "#0A0E14",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                  color: "#E8EDF3", fontSize: 13, boxSizing: "border-box",
                }}
              />
            </div>

            {/* Max drawdown */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#8B95A5", marginBottom: 6, fontWeight: 700 }}>MAX DRAWDOWN STOP (%)</div>
              <input
                type="number"
                value={maxDD}
                onChange={e => setMaxDD(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", background: "#0A0E14",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                  color: "#E8EDF3", fontSize: 13, boxSizing: "border-box",
                }}
              />
            </div>

            <button onClick={onSubmit} style={{
              width: "100%", padding: "11px 0",
              background: "linear-gradient(90deg, #00D4AA, #00A886)",
              border: "none", borderRadius: 8,
              color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            }}>
              Start Copying
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function CopyTradingPage() {
  const [userTier, setUserTier] = useState<"free" | "pro" | "elite">("free");
  const [copyTarget, setCopyTarget] = useState<Trader | null>(null);
  const [tab, setTab] = useState<"traders" | "tiers">("traders");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#080B10", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px 12px",
        borderBottom: "1px solid #1A2030",
        background: "#0A0E14",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Copy size={16} color="#00D4AA" />
          <h1 style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF3", margin: 0 }}>Copy Trading</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 8px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", borderRadius: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00D4AA" }} className="animate-pulse" />
            <span style={{ fontSize: 9, color: "#00D4AA", fontWeight: 700 }}>BETA PREVIEW</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#5A6575" }}>Plan:</span>
            {(["free", "pro", "elite"] as const).map(t => (
              <button key={t} onClick={() => setUserTier(t)} style={{
                padding: "3px 10px", borderRadius: 4,
                background: userTier === t ? (t === "elite" ? "rgba(240,180,41,0.2)" : t === "pro" ? "rgba(79,163,224,0.2)" : "rgba(136,150,190,0.2)") : "transparent",
                border: `1px solid ${userTier === t ? (t === "elite" ? "#F0B429" : t === "pro" ? "#4FA3E0" : "#8896BE") : "rgba(255,255,255,0.08)"}`,
                color: userTier === t ? (t === "elite" ? "#F0B429" : t === "pro" ? "#4FA3E0" : "#8896BE") : "#5A6575",
                fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
          {([["traders", "👤 Top Traders"], ["tiers", "💎 Tier Plans"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === id ? "#00D4AA" : "transparent"}`,
              color: tab === id ? "#00D4AA" : "#5A6575",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "traders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <BarChart2 size={13} color="#4FA3E0" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8B95A5" }}>VERIFIED TRADER LEADERBOARD</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#5A6575" }}>{TRADERS.length} traders</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {TRADERS.map(t => (
                <TraderCard key={t.id} trader={t} userTier={userTier} onCopy={setCopyTarget} />
              ))}
            </div>
          </div>
        )}

        {tab === "tiers" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Shield size={13} color="#F0B429" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8B95A5" }}>CHOOSE YOUR COPY TRADING TIER</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {TIERS.map(tier => (
                <motion.div key={tier.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: tier.bg,
                    border: `1px solid ${tier.border}`,
                    borderRadius: 12, padding: "20px 20px 16px",
                    position: "relative",
                  }}
                >
                  {tier.badge && (
                    <div style={{
                      position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                      background: tier.color, color: "#000",
                      fontSize: 9, fontWeight: 900, padding: "3px 10px", borderRadius: 20, letterSpacing: 1,
                    }}>{tier.badge}</div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    {tier.icon}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: tier.color }}>{tier.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#E8EDF3", lineHeight: 1 }}>
                        {tier.price} <span style={{ fontSize: 11, fontWeight: 500, color: "#5A6575" }}>{tier.period}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    {tier.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <CheckCircle2 size={12} color={tier.color} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: "#C8D0E0", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 9, color: "#5A6575" }}>{tier.limits}</span>
                  </div>

                  <button
                    onClick={() => setUserTier(tier.id as "free" | "pro" | "elite")}
                    style={{
                      width: "100%", padding: "10px 0",
                      background: userTier === tier.id ? tier.color : "transparent",
                      border: `1px solid ${tier.border}`,
                      borderRadius: 7, cursor: "pointer",
                      color: userTier === tier.id ? "#000" : tier.color,
                      fontSize: 12, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {userTier === tier.id ? (
                      <><CheckCircle2 size={13} /> Current Tier</>
                    ) : (
                      <><ChevronRight size={13} /> {tier.id === "free" ? "Select Free" : `Upgrade to ${tier.label}`}</>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Copy modal */}
      {copyTarget && <CopyModal trader={copyTarget} onClose={() => setCopyTarget(null)} />}
    </div>
  );
}
