"use client";
/**
 * WMS Balance Bar — shows your WM$ balance in the top nav.
 * Earns tokens for daily activity. Works pre-deployment.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, TrendingUp, Plus } from "lucide-react";
import { useWMS } from "@/contexts/WMSContext";
import { clsx } from "clsx";

export function WMSBar() {
  const { wmsBalance, earnWMS, recentEarnings } = useWMS();
  const [showEarn, setShowEarn] = useState(false);
  const [lastEarning, setLastEarning] = useState<{ amount: number; reason: string } | null>(null);

  // Daily login bonus
  useEffect(() => {
    const key = "wm_last_login";
    const last = localStorage.getItem(key);
    const today = new Date().toDateString();
    if (last !== today) {
      localStorage.setItem(key, today);
      setTimeout(() => earnWMS(10, "📅 Daily login bonus"), 2000);
    }
  }, []);

  // Show floating +WM$ notification on new earnings
  useEffect(() => {
    if (recentEarnings.length === 0) return;
    const latest = recentEarnings[0];
    if (Date.now() - latest.ts < 3000) {
      setLastEarning({ amount: latest.amount, reason: latest.reason });
      setTimeout(() => setLastEarning(null), 2500);
    }
  }, [recentEarnings]);

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Floating earn notification */}
      <AnimatePresence>
        {lastEarning && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.8 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-wm-green text-wm-black text-[9px] font-black px-2 py-0.5 rounded-full z-50 pointer-events-none"
          >
            +{lastEarning.amount} WM$
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowEarn(s => !s)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 hover:bg-[#7C3AED]/25 transition-all group"
      >
        <Coins size={11} className="text-[#7C3AED]"/>
        <span className="text-[11px] font-black text-wm-text font-mono">
          {wmsBalance.toLocaleString()} <span className="text-[#7C3AED]">WM$</span>
        </span>
      </button>

      {/* Earn WM$ popover */}
      <AnimatePresence>
        {showEarn && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            className="absolute top-8 right-0 z-50 w-56 rounded-xl border border-wm-border bg-wm-dark shadow-2xl p-3"
            style={{ boxShadow: "0 0 30px rgba(124,58,237,0.2)" }}
          >
            <div className="text-[10px] font-black text-wm-text mb-2 flex items-center gap-1.5">
              <Coins size={11} className="text-[#7C3AED]"/> Earn WM$ Tokens
            </div>
            <div className="text-[9px] text-wm-text-dim mb-3">
              Pre-deployment balance. Converts to real WM$ when contract goes live on Base. 🚀
            </div>
            {[
              { action: "Daily login",        reward: "+10 WM$" },
              { action: "Journal a trade",     reward: "+50 WM$" },
              { action: "Paper trade win",     reward: "+25 WM$" },
              { action: "Ask the AI",          reward: "+5 WM$"  },
              { action: "Share a strategy",    reward: "+100 WM$"},
              { action: "Launch Creator Coin", reward: "+500 WM$"},
              { action: "Leaderboard top 3",   reward: "+250 WM$"},
            ].map(({ action, reward }) => (
              <div key={action} className="flex justify-between text-[9px] py-1 border-b border-wm-border/30 last:border-0">
                <span className="text-wm-text-muted">{action}</span>
                <span className="font-black text-[#7C3AED]">{reward}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
