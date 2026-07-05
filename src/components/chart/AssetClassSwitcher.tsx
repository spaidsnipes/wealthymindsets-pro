"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, TrendingUp, Bitcoin, BarChart3, DollarSign, LineChart, Gem } from "lucide-react";

/* Asset classes → representative symbols. Picking one loads that symbol. */
const ASSET_CLASSES: { id: string; label: string; icon: React.ReactNode; symbols: { sym: string; name: string }[] }[] = [
  { id: "stocks", label: "Stocks", icon: <TrendingUp size={13} />, symbols: [
    { sym: "AAPL", name: "Apple" }, { sym: "TSLA", name: "Tesla" }, { sym: "NVDA", name: "NVIDIA" },
    { sym: "MSFT", name: "Microsoft" }, { sym: "AMZN", name: "Amazon" }, { sym: "META", name: "Meta" },
    { sym: "GOOG", name: "Alphabet" }, { sym: "ROKU", name: "Roku" }, { sym: "AMD", name: "AMD" },
  ]},
  { id: "crypto", label: "Crypto", icon: <Bitcoin size={13} />, symbols: [
    { sym: "BTC", name: "Bitcoin" }, { sym: "ETH", name: "Ethereum" }, { sym: "SOL", name: "Solana" },
    { sym: "XRP", name: "XRP" }, { sym: "ADA", name: "Cardano" }, { sym: "LINK", name: "Chainlink" },
  ]},
  { id: "futures", label: "Futures", icon: <BarChart3 size={13} />, symbols: [
    { sym: "ES1!", name: "E-mini S&P 500" }, { sym: "NQ1!", name: "E-mini Nasdaq" }, { sym: "RTY1!", name: "E-mini Russell" },
    { sym: "YM1!", name: "E-mini Dow" }, { sym: "CL1!", name: "Crude Oil" }, { sym: "NG1!", name: "Natural Gas" },
  ]},
  { id: "forex", label: "Forex", icon: <DollarSign size={13} />, symbols: [
    { sym: "EUR/USD", name: "Euro / Dollar" }, { sym: "GBP/USD", name: "Pound / Dollar" }, { sym: "USD/JPY", name: "Dollar / Yen" },
    { sym: "AUD/USD", name: "Aussie / Dollar" }, { sym: "USD/CAD", name: "Dollar / Loonie" },
  ]},
  { id: "indices", label: "Indices", icon: <LineChart size={13} />, symbols: [
    { sym: "SPY", name: "S&P 500 ETF" }, { sym: "QQQ", name: "Nasdaq 100 ETF" }, { sym: "IWM", name: "Russell 2000 ETF" },
    { sym: "DIA", name: "Dow Jones ETF" }, { sym: "VIX", name: "Volatility Index" },
  ]},
  { id: "metals", label: "Metals", icon: <Gem size={13} />, symbols: [
    { sym: "GC1!", name: "Gold" }, { sym: "SI1!", name: "Silver" }, { sym: "HG1!", name: "Copper" },
    { sym: "PL1!", name: "Platinum" }, { sym: "GLD", name: "Gold ETF" },
  ]},
];

/** Which asset class does the current symbol belong to? */
function classOf(sym: string): string {
  const u = sym.toUpperCase();
  if (u.includes("/")) return "forex";
  if (["BTC","ETH","SOL","XRP","ADA","LINK","DOGE","BNB","AVAX","DOT","LTC","MATIC"].some(c => u === c || u.startsWith(c + "."))) return "crypto";
  if (["GC1!","SI1!","HG1!","PL1!","PA1!","GLD","SLV"].includes(u)) return "metals";
  if (["SPY","QQQ","IWM","DIA","VIX"].includes(u)) return "indices";
  if (u.endsWith("1!") || u.includes("=F")) return "futures";
  return "stocks";
}

export function AssetClassSwitcher({ symbol, onSelect }: { symbol: string; onSelect: (sym: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState(() => classOf(symbol));
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => { setTab(classOf(symbol)); }, [symbol]);
  // Anchor the portal dropdown to the trigger with fixed coords so it escapes
  // the toolbar's overflow clipping (previously the symbol list was cut off).
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 6 });
    }
  }, [open]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = ASSET_CLASSES.find(c => c.id === classOf(symbol)) ?? ASSET_CLASSES[0];
  const activeClass = ASSET_CLASSES.find(c => c.id === tab) ?? ASSET_CLASSES[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0, marginRight: 12 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Asset class — switch between Stocks, Crypto, Futures, Forex, Indices and Metals"
        style={{
          display: "flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px",
          borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          background: open ? "rgba(47,128,237,0.18)" : "#131520",
          border: `1px solid ${open ? "rgba(47,128,237,0.5)" : "#252a3a"}`,
          color: "#cdd6e8",
        }}
      >
        <span style={{ color: "#4FA3E0", display: "inline-flex" }}>{current.icon}</span>
        {current.label}
        <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, width: 320,
          background: "#0C0F1A", border: "1px solid #252a3a", borderRadius: 10,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7)", overflow: "hidden",
          display: "flex", flexDirection: "column", maxHeight: 420,
        }}>
          {/* class tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 8, borderBottom: "1px solid #1c2030" }}>
            {ASSET_CLASSES.map(c => (
              <button key={c.id} onClick={() => setTab(c.id)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6,
                fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                background: tab === c.id ? "rgba(47,128,237,0.2)" : "transparent",
                border: `1px solid ${tab === c.id ? "rgba(47,128,237,0.45)" : "transparent"}`,
                color: tab === c.id ? "#4FA3E0" : "#8B8FA8",
              }}>{c.icon}{c.label}</button>
            ))}
          </div>
          {/* symbols in the active class */}
          <div style={{ overflowY: "auto", padding: 6 }}>
            {activeClass.symbols.map(s => (
              <button key={s.sym}
                onClick={() => { onSelect(s.sym); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  padding: "8px 10px", borderRadius: 6, cursor: "pointer", border: "none", textAlign: "left",
                  background: s.sym === symbol ? "rgba(0,212,170,0.12)" : "transparent",
                }}
                onMouseEnter={e => { if (s.sym !== symbol) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (s.sym !== symbol) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: s.sym === symbol ? "#00D4AA" : "#E2E8F0" }}>{s.sym}</span>
                <span style={{ fontSize: 11, color: "#6A7290" }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>, document.body)}
    </div>
  );
}
