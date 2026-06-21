"use client";

/**
 * WM Creator Program — Content creator & affiliate packages
 * Basic / PRO / ELITE tiers with revenue sharing and tooling
 */

import React, { useState, useEffect } from "react";
import {
  Rocket, Crown, Star, Zap, Users, DollarSign, BarChart2,
  CheckCircle2, Lock, ChevronRight, TrendingUp, Award,
  Sparkles, Globe, Video, Share2, Copy, X, Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import toast from "react-hot-toast";

/* ── Tier definitions ─────────────────────────────────────── */
interface Tier {
  id:       string;
  label:    string;
  price:    number;
  period:   string;
  color:    string;
  border:   string;
  bg:       string;
  icon:     React.ReactNode;
  badge?:   string;
  features: string[];
  commission: string;
  description: string;
}

const TIERS: Tier[] = [
  {
    id:    "basic",
    label: "Creator Basic",
    price: 0,
    period: "Free Forever",
    color: "#8896BE",
    border: "rgba(136,150,190,0.3)",
    bg:    "rgba(136,150,190,0.04)",
    icon:  <Star size={18} />,
    description: "Start building your audience with WM tools and earn referral commissions.",
    commission:  "10% per referral",
    features: [
      "Personal referral link + tracking dashboard",
      "10% commission on referred PRO subscriptions",
      "WM Creator badge on your profile",
      "Access to Creator Discord channel",
      "Monthly performance reports",
      "Basic marketing assets (banners, GIFs)",
    ],
  },
  {
    id:    "pro",
    label: "Creator PRO",
    price: 50,
    period: "per month",
    color: "#4FA3E0",
    border: "rgba(79,163,224,0.5)",
    bg:    "rgba(79,163,224,0.06)",
    icon:  <Zap size={18} />,
    badge: "POPULAR",
    description: "Serious creators who want higher commissions, co-branded content, and direct promotion.",
    commission:  "25% recurring per referral",
    features: [
      "Everything in Creator Basic",
      "25% recurring commission (monthly)",
      "Co-branded chart screenshot tool",
      "WM brand mentions in our content (monthly)",
      "Early access to new features to demo",
      "Priority support & dedicated account manager",
      "Custom referral landing page",
      "Weekly Creator calls (group)",
      "WM PRO subscription included ($50 value)",
    ],
  },
  {
    id:    "elite",
    label: "Creator ELITE",
    price: 150,
    period: "per month",
    color: "#F0B429",
    border: "rgba(240,180,41,0.6)",
    bg:    "rgba(240,180,41,0.06)",
    icon:  <Crown size={18} />,
    badge: "ELITE",
    description: "Top-tier creators and educators with established audiences. Maximum revenue & exposure.",
    commission:  "40% recurring + bonuses",
    features: [
      "Everything in Creator PRO",
      "40% recurring commission on all referrals",
      "Volume bonuses: extra 5% at 10+ subs/mo",
      "WM ELITE subscription included ($150 value)",
      "Featured in WM homepage spotlight",
      "Joint webinars & live trading sessions",
      "Custom white-label dashboard option",
      "Dedicated 1-on-1 strategy calls (bi-weekly)",
      "Revenue share on educational course sales",
      "First look at beta products",
      "Annual WM Creator Summit invite",
    ],
  },
];

/* ── Stats for social proof ───────────────────────────────── */
const STATS = [
  { label: "Active Creators",   val: "847",    icon: <Users size={16} /> },
  { label: "Total Paid Out",    val: "$284K",  icon: <DollarSign size={16} /> },
  { label: "Avg Monthly Earn",  val: "$1,240", icon: <TrendingUp size={16} /> },
  { label: "Countries",         val: "38",     icon: <Globe size={16} /> },
];

/* ── Top creators leaderboard (synthetic) ─────────────────── */
const CREATORS = [
  { rank:1, handle:"@TradingWithMarcus",  tier:"ELITE", earnings:"$4,820/mo",  subs:124, avatar:"🦅" },
  { rank:2, handle:"@NQFlowQueen",        tier:"ELITE", earnings:"$3,190/mo",  subs:82,  avatar:"👑" },
  { rank:3, handle:"@SmartMoneyKev",      tier:"PRO",   earnings:"$1,680/mo",  subs:67,  avatar:"🎯" },
  { rank:4, handle:"@FuturesWithJess",    tier:"PRO",   earnings:"$1,420/mo",  subs:57,  avatar:"⚡" },
  { rank:5, handle:"@WyckoffWatcher",     tier:"PRO",   earnings:"$990/mo",    subs:40,  avatar:"🌊" },
];

/* ── FAQ ──────────────────────────────────────────────────── */
const FAQ = [
  { q:"How do I get paid?", a:"Payouts are processed monthly via PayPal, Venmo, CashApp, or bank wire. Minimum payout threshold is $25." },
  { q:"When do commissions start?", a:"Commissions are credited 7 days after a referred user's payment clears. They're recurring — you earn every month they stay subscribed." },
  { q:"Can I promote on social media?", a:"Yes! You're encouraged to share on YouTube, TikTok, Twitter/X, Instagram, Discord, and any platform you use." },
  { q:"Is there a waitlist for ELITE?", a:"ELITE spots are limited to maintain quality. Join the waitlist below and we'll notify you when a slot opens." },
  { q:"Do I need to be a PRO subscriber?", a:"No — Creator Basic is free. PRO and ELITE tiers include a WM subscription so you get the product you're promoting." },
];

export default function CreatorPage() {
  const [selected,     setSelected]     = useState<string | null>(null);
  const [faqOpen,      setFaqOpen]      = useState<number | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistTier, setWaitlistTier] = useState("");
  const [email,        setEmail]        = useState("");
  const [handle,       setHandle]       = useState("");
  const [submitted,    setSubmitted]    = useState(false);
  const [refLink,      setRefLink]      = useState("https://wealthymindsets.pro/ref/YOUR-CODE");

  // Generate a stable ref link based on session
  useEffect(() => {
    const stored = localStorage.getItem("wm_creator_ref");
    if (stored) { setRefLink(stored); return; }
    const code = `WM-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const link = `https://wealthymindsets.pro/ref/${code}`;
    localStorage.setItem("wm_creator_ref", link);
    setRefLink(link);
  }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(refLink).then(() => toast.success("Referral link copied!"));
  };

  const openWaitlist = (tierId: string) => {
    setWaitlistTier(tierId);
    setWaitlistOpen(true);
    setSubmitted(false);
    setEmail(""); setHandle("");
  };

  const submitWaitlist = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSubmitted(true);
    localStorage.setItem("wm_creator_waitlist", JSON.stringify({ email, handle, tier: waitlistTier, ts: Date.now() }));
    toast.success("You're on the waitlist! We'll reach out soon.");
  };

  return (
    <div className="min-h-full bg-wm-black text-wm-text overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative border-b border-wm-border overflow-hidden" style={{ background: "linear-gradient(135deg, #070A14 0%, #0B0E1A 60%, #0D1022 100%)" }}>
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:"absolute", top:"20%", left:"20%", width:400, height:400, borderRadius:"50%", background:"rgba(240,180,41,0.04)", filter:"blur(80px)" }}/>
          <div style={{ position:"absolute", top:"30%", right:"15%", width:300, height:300, borderRadius:"50%", background:"rgba(0,212,170,0.04)", filter:"blur(60px)" }}/>
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-5 text-xs font-bold"
               style={{ borderColor:"rgba(240,180,41,0.4)", background:"rgba(240,180,41,0.08)", color:"#F0B429" }}>
            <Sparkles size={11}/> WealthyMindsets Creator Program
          </div>
          <h1 className="text-4xl font-black text-wm-text mb-4 leading-tight">
            Turn Your Audience Into<br/>
            <span style={{ color:"#F0B429" }}>Recurring Revenue</span>
          </h1>
          <p className="text-sm text-wm-text-muted max-w-xl mx-auto mb-8 leading-relaxed">
            Share WealthyMindsets Pro with your community and earn up to <strong className="text-wm-text">40% recurring commissions</strong> every month.
            Build a sustainable income stream teaching Smart Money concepts.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-10">
            {STATS.map(s => (
              <div key={s.label} className="rounded-xl border border-wm-border p-3 bg-wm-dark/50 text-center">
                <div className="flex justify-center text-wm-gold mb-1">{s.icon}</div>
                <div className="text-xl font-black text-wm-text">{s.val}</div>
                <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Your referral link */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-wm-dark/60 text-xs font-mono"
               style={{ borderColor:"rgba(79,163,224,0.3)" }}>
            <Globe size={11} className="text-wm-blue shrink-0"/>
            <span className="text-wm-text-muted truncate max-w-56">{refLink}</span>
            <button onClick={copyRef}
              className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold transition-all text-wm-blue hover:bg-wm-blue/10"
              style={{ borderColor:"rgba(79,163,224,0.4)" }}>
              <Copy size={9}/> Copy
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Tier cards ─────────────────────────────────────── */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-black text-wm-text">Choose Your Creator Tier</h2>
          <p className="text-xs text-wm-text-muted mt-1">Upgrade anytime. Downgrade anytime. No contracts.</p>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-12">
          {TIERS.map(tier => (
            <motion.div
              key={tier.id}
              whileHover={{ y: -3 }}
              onClick={() => setSelected(selected === tier.id ? null : tier.id)}
              className="relative rounded-2xl border cursor-pointer transition-all"
              style={{
                borderColor: selected === tier.id ? tier.color : tier.border,
                background:  selected === tier.id ? tier.bg : "rgba(20,24,36,0.6)",
                boxShadow:   selected === tier.id ? `0 0 24px ${tier.color}20` : "none",
              }}
            >
              {tier.badge && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-black"
                     style={{ background: tier.color, color: tier.id === "elite" ? "#000" : "#fff" }}>
                  {tier.badge}
                </div>
              )}

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3" style={{ color: tier.color }}>
                  {tier.icon}
                  <span className="text-sm font-black">{tier.label}</span>
                </div>

                <div className="mb-2">
                  {tier.price === 0 ? (
                    <span className="text-2xl font-black text-wm-text">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-wm-text">${tier.price}</span>
                      <span className="text-xs text-wm-text-dim ml-1">/mo</span>
                    </>
                  )}
                  <div className="text-[10px] text-wm-text-dim mt-0.5">{tier.period}</div>
                </div>

                <div className="text-[10px] text-wm-text-muted mb-3 leading-relaxed">{tier.description}</div>

                {/* Commission highlight */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3"
                     style={{ background: `${tier.color}12`, border: `1px solid ${tier.color}30` }}>
                  <DollarSign size={10} style={{ color: tier.color }} />
                  <span className="text-[10px] font-black" style={{ color: tier.color }}>{tier.commission}</span>
                </div>

                <div className="space-y-1.5 mb-4">
                  {tier.features.slice(0,5).map((f,i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 size={10} style={{ color: tier.color, marginTop:2, flexShrink:0 }} />
                      <span className="text-[10px] text-wm-text-muted">{f}</span>
                    </div>
                  ))}
                  {tier.features.length > 5 && (
                    <div className="text-[10px] text-wm-text-dim pl-4">+{tier.features.length - 5} more features</div>
                  )}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); openWaitlist(tier.id); }}
                  className="w-full py-2.5 rounded-xl text-xs font-black transition-all hover:opacity-90"
                  style={{ background: tier.id === "basic" ? "rgba(136,150,190,0.12)" : tier.color,
                           color: tier.id === "basic" ? "#8896BE" : tier.id === "elite" ? "#000" : "#fff",
                           border: tier.id === "basic" ? "1px solid rgba(136,150,190,0.3)" : "none" }}>
                  {tier.id === "basic" ? "Join Free" : `Join ${tier.label}`}
                </button>
              </div>

              {/* Expanded features */}
              <AnimatePresence>
                {selected === tier.id && (
                  <motion.div
                    initial={{ height:0, opacity:0 }}
                    animate={{ height:"auto", opacity:1 }}
                    exit={{ height:0, opacity:0 }}
                    className="overflow-hidden border-t"
                    style={{ borderColor: tier.border }}
                  >
                    <div className="p-5 pt-3 space-y-1.5">
                      <div className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: tier.color }}>
                        All Features
                      </div>
                      {tier.features.map((f,i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 size={10} style={{ color: tier.color, marginTop:2, flexShrink:0 }} />
                          <span className="text-[10px] text-wm-text-muted">{f}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* ── Leaderboard ────────────────────────────────────── */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Award size={16} className="text-wm-gold"/>
            <h2 className="text-base font-black text-wm-text">Top Creators This Month</h2>
          </div>
          <div className="rounded-2xl border border-wm-border overflow-hidden">
            <div className="grid text-[9px] font-black uppercase tracking-wider text-wm-text-dim border-b border-wm-border px-4 py-2 bg-wm-dark"
                 style={{ gridTemplateColumns:"40px 1fr 80px 80px 80px" }}>
              <span>#</span><span>Creator</span><span>Tier</span><span>Subscribers</span><span>Monthly Earn</span>
            </div>
            {CREATORS.map(c => (
              <div key={c.rank} className="grid items-center px-4 py-3 border-b border-wm-border/30 hover:bg-wm-surface/20 transition-colors"
                   style={{ gridTemplateColumns:"40px 1fr 80px 80px 80px" }}>
                <div className="text-sm font-black" style={{
                  color: c.rank === 1 ? "#F0B429" : c.rank === 2 ? "#C0C0C0" : c.rank === 3 ? "#CD7F32" : "#8896BE"
                }}>
                  {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : `#${c.rank}`}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.avatar}</span>
                  <span className="text-xs font-bold text-wm-text">{c.handle}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: c.tier === "ELITE" ? "rgba(240,180,41,0.15)" : "rgba(79,163,224,0.12)",
                                 color: c.tier === "ELITE" ? "#F0B429" : "#4FA3E0" }}>
                    {c.tier}
                  </span>
                </div>
                <span className="text-xs font-mono text-wm-text">{c.subs}</span>
                <span className="text-xs font-black font-mono text-wm-green">{c.earnings}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── How it works ───────────────────────────────────── */}
        <div className="mb-12">
          <h2 className="text-base font-black text-wm-text mb-5 text-center">How It Works</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { step:"01", title:"Join Free",        desc:"Sign up for Creator Basic — no credit card needed.", color:"#8896BE" },
              { step:"02", title:"Get Your Link",    desc:"Grab your unique referral link from your dashboard.", color:"#4FA3E0" },
              { step:"03", title:"Share & Promote",  desc:"Post on social, YouTube, Discord, or your community.", color:"#00D4AA" },
              { step:"04", title:"Earn Monthly",     desc:"Earn recurring commissions every month your referrals stay subscribed.", color:"#F0B429" },
            ].map(s => (
              <div key={s.step} className="rounded-xl border border-wm-border p-4 text-center bg-wm-dark/40">
                <div className="text-2xl font-black mb-2" style={{ color: s.color, opacity:0.6 }}>{s.step}</div>
                <div className="text-xs font-black text-wm-text mb-1">{s.title}</div>
                <div className="text-[10px] text-wm-text-muted leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <div className="mb-12">
          <h2 className="text-base font-black text-wm-text mb-5 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ.map((f,i) => (
              <div key={i} className="rounded-xl border border-wm-border overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-wm-surface/20 transition-colors"
                >
                  <span className="text-xs font-bold text-wm-text">{f.q}</span>
                  <ChevronRight size={13} className={`text-wm-text-dim transition-transform ${faqOpen === i ? "rotate-90" : ""}`}/>
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div initial={{ height:0 }} animate={{ height:"auto" }} exit={{ height:0 }}
                      className="overflow-hidden border-t border-wm-border/50">
                      <div className="px-4 py-3 text-[11px] text-wm-text-muted leading-relaxed">{f.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────────────── */}
        <div className="rounded-2xl border text-center p-8 mb-6"
             style={{ borderColor:"rgba(240,180,41,0.3)", background:"linear-gradient(135deg, rgba(240,180,41,0.06) 0%, rgba(0,212,170,0.04) 100%)" }}>
          <Crown size={28} className="text-wm-gold mx-auto mb-3"/>
          <h2 className="text-xl font-black text-wm-text mb-2">Ready to Build Your Empire?</h2>
          <p className="text-xs text-wm-text-muted mb-5 max-w-md mx-auto">
            Join over 800 creators already earning with WealthyMindsets Pro. Start free, scale to ELITE.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => openWaitlist("basic")}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-wm-green text-wm-black transition-all hover:opacity-90">
              Start Free Today
            </button>
            <button onClick={() => openWaitlist("elite")}
              className="px-6 py-2.5 rounded-xl text-xs font-black border transition-all hover:bg-wm-gold/10"
              style={{ borderColor:"rgba(240,180,41,0.5)", color:"#F0B429" }}>
              Join ELITE Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* ── Waitlist Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {waitlistOpen && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.75)" }}
            onClick={() => setWaitlistOpen(false)}
          >
            <motion.div
              initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              className="w-full max-w-sm rounded-2xl border border-wm-border p-6 bg-wm-dark"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-black text-wm-text capitalize">Join {waitlistTier} Waitlist</div>
                  <div className="text-[10px] text-wm-text-dim mt-0.5">We'll reach out within 24–48 hours</div>
                </div>
                <button onClick={() => setWaitlistOpen(false)} className="text-wm-text-dim hover:text-wm-text">
                  <X size={16}/>
                </button>
              </div>

              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={36} className="text-wm-green mx-auto mb-3"/>
                  <div className="text-sm font-black text-wm-text mb-1">You're on the list!</div>
                  <div className="text-[11px] text-wm-text-muted">We'll contact you at {email} soon.</div>
                  <button onClick={() => setWaitlistOpen(false)}
                    className="mt-4 px-6 py-2 rounded-xl text-xs font-black bg-wm-green text-wm-black">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-wm-text-dim block mb-1">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none focus:border-wm-green/50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-wm-text-dim block mb-1">
                        Social Handle <span className="text-wm-text-dim normal-case font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                        placeholder="@YourHandle"
                        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none focus:border-wm-blue/50"
                      />
                    </div>
                  </div>
                  <button onClick={submitWaitlist}
                    className="w-full py-2.5 rounded-xl text-xs font-black bg-wm-green text-wm-black hover:opacity-90 transition-all">
                    <Bell size={11} className="inline mr-1.5"/>
                    Join Waitlist
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
