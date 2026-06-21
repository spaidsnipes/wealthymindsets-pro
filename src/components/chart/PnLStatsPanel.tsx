"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";

export function PnLStatsPanel({ onClose }: { onClose: () => void }) {
  const [netPnl,   setNetPnl]   = useState(0);
  const [winRate,  setWinRate]  = useState(0);
  const [avgWin,   setAvgWin]   = useState(0);
  const [avgLoss,  setAvgLoss]  = useState(0);
  const [trades,   setTrades]   = useState(0);
  const [profFact, setProfFact] = useState(0);

  // Read from journal + paper trading
  useEffect(() => {
    const loadStats = () => {
      try {
        // Journal trades
        const journalRaw = JSON.parse(localStorage.getItem("wm_journal_entries") ?? "[]");
        const today = new Date().toISOString().slice(0, 10);
        const todayTrades = journalRaw.filter((e: any) => e.date === today);
        const allTrades   = journalRaw;

        const wins   = allTrades.filter((e: any) => e.pnl > 0);
        const losses = allTrades.filter((e: any) => e.pnl < 0);
        const totalPnl   = allTrades.reduce((s: number, e: any) => s + (e.pnl ?? 0), 0);
        const wr = allTrades.length > 0 ? (wins.length / allTrades.length * 100) : 0;
        const aw = wins.length > 0 ? wins.reduce((s: number, e: any) => s + e.pnl, 0) / wins.length : 0;
        const al = losses.length > 0 ? Math.abs(losses.reduce((s: number, e: any) => s + e.pnl, 0) / losses.length) : 0;
        const pf = al > 0 ? (wins.reduce((s: number, e: any) => s + e.pnl, 0) / losses.reduce((s: number, e: any) => s + Math.abs(e.pnl), 0)) : 0;

        setNetPnl(totalPnl);
        setWinRate(wr);
        setAvgWin(aw);
        setAvgLoss(al);
        setTrades(allTrades.length);
        setProfFact(Math.abs(pf));
      } catch {}
    };
    loadStats();
    const iv = setInterval(loadStats, 5000);
    return () => clearInterval(iv);
  }, []);

  const isPos = netPnl >= 0;
  const rMultiple = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "—";

  const stats = [
    { label: "Net P&L",       val: `${isPos?"+":""}$${Math.abs(netPnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: isPos ? "#00D4AA" : "#FF4D6A", large: true },
    { label: "Total Trades",  val: `${trades}`,          color: "#E8EDF3" },
    { label: "Win Rate",      val: `${winRate.toFixed(1)}%`, color: winRate >= 60 ? "#00D4AA" : winRate >= 50 ? "#F0B429" : "#FF4D6A" },
    { label: "Avg Win",       val: `$${avgWin.toFixed(0)}`,  color: "#00D4AA" },
    { label: "Avg Loss",      val: `$${avgLoss.toFixed(0)}`, color: "#FF4D6A" },
    { label: "R-Multiple",    val: `${rMultiple}R`,          color: "#F0B429" },
    { label: "Profit Factor", val: profFact > 0 ? profFact.toFixed(2) : "—", color: profFact >= 1.5 ? "#00D4AA" : profFact >= 1 ? "#F0B429" : "#FF4D6A" },
  ];

  return (
    <div className="border-t border-wm-border bg-wm-dark shrink-0">
      <div className="flex items-center px-3 h-7 border-b border-wm-border">
        <span className="text-[10px] font-semibold text-wm-text-muted uppercase tracking-wider">P&L Stats</span>
        <div className="flex items-center gap-1 ml-3">
          <span className={`w-1.5 h-1.5 rounded-full ${isPos ? "bg-wm-green animate-pulse" : "bg-wm-red animate-pulse"}`} />
          <span className={`text-xs font-bold font-mono ${isPos ? "text-wm-green" : "text-wm-red"}`}>
            {isPos ? <TrendingUp size={11} className="inline mr-0.5" /> : <TrendingDown size={11} className="inline mr-0.5" />}
            {isPos ? "+" : ""}${Math.abs(netPnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </span>
        </div>
        <span className="ml-2 text-[9px] text-wm-text-dim">from journal</span>
        <button onClick={onClose} className="ml-auto p-1 hover:text-wm-text text-wm-text-dim transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto px-3 py-1.5">
        {stats.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center px-3 shrink-0">
              <span className="text-[9px] text-wm-text-dim uppercase tracking-wider whitespace-nowrap">{s.label}</span>
              <span className="font-bold font-mono mt-0.5" style={{ color: s.color, fontSize: s.large ? 15 : 11 }}>
                {s.val}
              </span>
            </div>
            {i < stats.length - 1 && <div className="w-px h-8 bg-wm-border/50 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
