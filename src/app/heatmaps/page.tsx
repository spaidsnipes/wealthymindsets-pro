"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";

/* ═══════════════════════════════════════════════════════════
   DATA MODEL
═══════════════════════════════════════════════════════════ */
interface Stock {
  sym:   string;
  name:  string;
  mcap:  number; // billions — determines tile size
  price: number;
}

interface Industry {
  name:    string;
  stocks:  Stock[];
}

interface Sector {
  label:      string;
  industries: Industry[];
  weight:     number; // % of total map area
}

const SECTORS: Sector[] = [
  {
    label: "TECHNOLOGY", weight: 29,
    industries: [
      { name: "SOFTWARE - INFRASTRUCTURE", stocks: [
        { sym:"MSFT",  name:"Microsoft",      mcap:2950, price:415 },
        { sym:"ORCL",  name:"Oracle",         mcap:380,  price:145 },
        { sym:"SNOW",  name:"Snowflake",      mcap:55,   price:155 },
        { sym:"MDB",   name:"MongoDB",        mcap:22,   price:310 },
      ]},
      { name: "SEMICONDUCTORS", stocks: [
        { sym:"NVDA",  name:"NVIDIA",         mcap:3100, price:135 },
        { sym:"AVGO",  name:"Broadcom",       mcap:860,  price:210 },
        { sym:"AMD",   name:"AMD",            mcap:240,  price:148 },
        { sym:"INTC",  name:"Intel",          mcap:95,   price:22  },
        { sym:"QCOM",  name:"Qualcomm",       mcap:175,  price:155 },
        { sym:"TXN",   name:"Texas Instr.",   mcap:165,  price:178 },
        { sym:"AMAT",  name:"Applied Mat.",   mcap:145,  price:165 },
        { sym:"LRCX",  name:"Lam Research",  mcap:90,   price:72  },
      ]},
      { name: "SOFTWARE - APPLICATION", stocks: [
        { sym:"CRM",   name:"Salesforce",     mcap:280,  price:285 },
        { sym:"ADBE",  name:"Adobe",          mcap:210,  price:480 },
        { sym:"NOW",   name:"ServiceNow",     mcap:195,  price:985 },
        { sym:"INTU",  name:"Intuit",         mcap:175,  price:625 },
        { sym:"TEAM",  name:"Atlassian",      mcap:48,   price:188 },
        { sym:"WDAY",  name:"Workday",        mcap:62,   price:246 },
        { sym:"DDOG",  name:"Datadog",        mcap:38,   price:118 },
      ]},
      { name: "INTERNET CONTENT & INFO", stocks: [
        { sym:"GOOG",  name:"Alphabet",       mcap:2100, price:178 },
        { sym:"META",  name:"Meta",           mcap:1400, price:545 },
      ]},
      { name: "CONSUMER ELECTRONICS", stocks: [
        { sym:"AAPL",  name:"Apple",          mcap:3000, price:228 },
      ]},
    ],
  },
  {
    label: "COMMUNICATION SERVICES", weight: 8.5,
    industries: [
      { name: "INTERNET CONTENT", stocks: [
        { sym:"NFLX",  name:"Netflix",        mcap:295,  price:710 },
        { sym:"SNAP",  name:"Snap",           mcap:18,   price:11  },
        { sym:"PINS",  name:"Pinterest",      mcap:19,   price:28  },
      ]},
      { name: "TELECOM SERVICES", stocks: [
        { sym:"T",     name:"AT&T",           mcap:175,  price:22  },
        { sym:"VZ",    name:"Verizon",        mcap:165,  price:42  },
        { sym:"TMUS",  name:"T-Mobile",       mcap:210,  price:180 },
        { sym:"CMCSA", name:"Comcast",        mcap:145,  price:38  },
        { sym:"CHTR",  name:"Charter",        mcap:52,   price:370 },
      ]},
    ],
  },
  {
    label: "CONSUMER CYCLICAL", weight: 10.8,
    industries: [
      { name: "INTERNET RETAIL", stocks: [
        { sym:"AMZN",  name:"Amazon",         mcap:2000, price:218 },
        { sym:"BKNG",  name:"Booking",        mcap:145,  price:4100},
        { sym:"EBAY",  name:"eBay",           mcap:28,   price:52  },
      ]},
      { name: "AUTO MANUFACTURERS", stocks: [
        { sym:"TSLA",  name:"Tesla",          mcap:650,  price:205 },
        { sym:"GM",    name:"General Motors", mcap:55,   price:45  },
        { sym:"F",     name:"Ford",           mcap:45,   price:12  },
        { sym:"RIVN",  name:"Rivian",         mcap:12,   price:13  },
      ]},
      { name: "HOME IMPROVEMENT", stocks: [
        { sym:"HD",    name:"Home Depot",     mcap:330,  price:340 },
        { sym:"LOW",   name:"Lowe's",         mcap:140,  price:235 },
      ]},
      { name: "RESTAURANTS", stocks: [
        { sym:"MCD",   name:"McDonald's",     mcap:205,  price:278 },
        { sym:"SBUX",  name:"Starbucks",      mcap:100,  price:88  },
        { sym:"CMG",   name:"Chipotle",       mcap:82,   price:57  },
      ]},
    ],
  },
  {
    label: "CONSUMER DEFENSIVE", weight: 6.2,
    industries: [
      { name: "DISCOUNT STORES", stocks: [
        { sym:"WMT",   name:"Walmart",        mcap:645,  price:80  },
        { sym:"COST",  name:"Costco",         mcap:355,  price:800 },
        { sym:"TGT",   name:"Target",         mcap:65,   price:142 },
      ]},
      { name: "BEVERAGES - NON-ALC", stocks: [
        { sym:"KO",    name:"Coca-Cola",      mcap:265,  price:62  },
        { sym:"PEP",   name:"PepsiCo",        mcap:215,  price:155 },
        { sym:"KDP",   name:"Keurig Dr Pep.", mcap:48,   price:35  },
      ]},
      { name: "PACKAGED FOODS", stocks: [
        { sym:"GIS",   name:"General Mills",  mcap:38,   price:65  },
        { sym:"CPB",   name:"Campbell Soup",  mcap:12,   price:40  },
      ]},
    ],
  },
  {
    label: "FINANCIALS", weight: 12.8,
    industries: [
      { name: "CREDIT SERVICES", stocks: [
        { sym:"V",     name:"Visa",           mcap:540,  price:275 },
        { sym:"MA",    name:"Mastercard",     mcap:450,  price:480 },
        { sym:"AXP",   name:"Amex",           mcap:195,  price:242 },
        { sym:"PYPL",  name:"PayPal",         mcap:68,   price:62  },
      ]},
      { name: "BANKS - DIVERSIFIED", stocks: [
        { sym:"JPM",   name:"JPMorgan",       mcap:595,  price:205 },
        { sym:"BAC",   name:"Bank of America",mcap:310,  price:38  },
        { sym:"WFC",   name:"Wells Fargo",    mcap:215,  price:60  },
        { sym:"C",     name:"Citigroup",      mcap:118,  price:62  },
        { sym:"GS",    name:"Goldman Sachs",  mcap:155,  price:510 },
      ]},
      { name: "CAPITAL MARKETS", stocks: [
        { sym:"BRK-B", name:"Berkshire",      mcap:950,  price:440 },
        { sym:"SCHW",  name:"Schwab",         mcap:130,  price:72  },
        { sym:"MS",    name:"Morgan Stanley", mcap:155,  price:105 },
        { sym:"BLK",   name:"BlackRock",      mcap:115,  price:948 },
      ]},
    ],
  },
  {
    label: "HEALTHCARE", weight: 12.5,
    industries: [
      { name: "DRUG MANUFACTURERS - GENERAL", stocks: [
        { sym:"LLY",   name:"Eli Lilly",      mcap:755,  price:795 },
        { sym:"JNJ",   name:"J&J",            mcap:380,  price:158 },
        { sym:"ABBV",  name:"AbbVie",         mcap:315,  price:178 },
        { sym:"MRK",   name:"Merck",          mcap:255,  price:100 },
        { sym:"PFE",   name:"Pfizer",         mcap:148,  price:26  },
        { sym:"BMY",   name:"Bristol-Myers",  mcap:118,  price:57  },
        { sym:"AZN",   name:"AstraZeneca",    mcap:245,  price:82  },
      ]},
      { name: "HEALTHCARE PLANS", stocks: [
        { sym:"UNH",   name:"UnitedHealth",   mcap:455,  price:488 },
        { sym:"CVS",   name:"CVS Health",     mcap:68,   price:52  },
        { sym:"CI",    name:"Cigna",          mcap:82,   price:335 },
        { sym:"HUM",   name:"Humana",         mcap:38,   price:315 },
      ]},
      { name: "BIOTECHNOLOGY", stocks: [
        { sym:"AMGN",  name:"Amgen",          mcap:155,  price:290 },
        { sym:"GILD",  name:"Gilead",         mcap:112,  price:90  },
        { sym:"REGN",  name:"Regeneron",      mcap:95,   price:930 },
        { sym:"BIIB",  name:"Biogen",         mcap:28,   price:190 },
      ]},
    ],
  },
  {
    label: "INDUSTRIALS", weight: 8.5,
    industries: [
      { name: "AEROSPACE & DEFENSE", stocks: [
        { sym:"RTX",   name:"RTX Corp",       mcap:145,  price:118 },
        { sym:"LMT",   name:"Lockheed",       mcap:118,  price:462 },
        { sym:"BA",    name:"Boeing",         mcap:95,   price:158 },
        { sym:"NOC",   name:"Northrop",       mcap:72,   price:480 },
        { sym:"GD",    name:"General Dyn.",   mcap:78,   price:280 },
      ]},
      { name: "SPECIALTY INDUSTRIAL", stocks: [
        { sym:"HON",   name:"Honeywell",      mcap:130,  price:205 },
        { sym:"MMM",   name:"3M",             mcap:68,   price:118 },
        { sym:"EMR",   name:"Emerson",        mcap:55,   price:95  },
        { sym:"ITW",   name:"Ill. Tool",      mcap:68,   price:235 },
      ]},
      { name: "STAFFING & EMPLOYMENT", stocks: [
        { sym:"ADP",   name:"ADP",            mcap:102,  price:248 },
        { sym:"PAYX",  name:"Paychex",        mcap:48,   price:135 },
      ]},
    ],
  },
  {
    label: "ENERGY", weight: 3.8,
    industries: [
      { name: "OIL & GAS INTEGRATED", stocks: [
        { sym:"XOM",   name:"ExxonMobil",     mcap:465,  price:115 },
        { sym:"CVX",   name:"Chevron",        mcap:272,  price:148 },
        { sym:"COP",   name:"ConocoPhillips", mcap:128,  price:100 },
        { sym:"EOG",   name:"EOG Resources",  mcap:65,   price:118 },
        { sym:"OXY",   name:"Occidental",     mcap:42,   price:48  },
      ]},
    ],
  },
  {
    label: "REAL ESTATE", weight: 2.4,
    industries: [
      { name: "REIT - SPECIALTY", stocks: [
        { sym:"AMT",   name:"American Tower", mcap:88,   price:188 },
        { sym:"EQIX",  name:"Equinix",        mcap:72,   price:775 },
        { sym:"PLD",   name:"Prologis",       mcap:92,   price:110 },
      ]},
      { name: "REIT - RESIDENTIAL", stocks: [
        { sym:"EQR",   name:"Equity Resi.",   mcap:28,   price:68  },
        { sym:"AVB",   name:"AvalonBay",      mcap:30,   price:215 },
      ]},
    ],
  },
  {
    label: "UTILITIES", weight: 2.3,
    industries: [
      { name: "UTILITIES - REGULATED ELECTRIC", stocks: [
        { sym:"NEE",   name:"NextEra Energy", mcap:145,  price:72  },
        { sym:"SO",    name:"Southern Co.",   mcap:82,   price:88  },
        { sym:"DUK",   name:"Duke Energy",    mcap:78,   price:112 },
        { sym:"SRE",   name:"Sempra",         mcap:48,   price:75  },
      ]},
    ],
  },
  {
    label: "BASIC MATERIALS", weight: 2.2,
    industries: [
      { name: "SPECIALTY CHEMICALS", stocks: [
        { sym:"LIN",   name:"Linde",          mcap:198,  price:440 },
        { sym:"APD",   name:"Air Products",   mcap:52,   price:238 },
        { sym:"SHW",   name:"Sherwin-Will.",  mcap:82,   price:320 },
        { sym:"ECL",   name:"Ecolab",         mcap:62,   price:218 },
      ]},
    ],
  },
];

// Only the periods our /api/heatmap endpoint actually supports
const TIMEFRAMES = ["1D","1W","1M","3M","6M","1Y","5Y"];
// Only expose universes we can currently populate with observed free data.
// "World" and "Full" previously repeated the S&P dataset under a different label,
// so they stay out. "Markov" is restored: it's an honest regime proxy derived from
// each sector ETF's REAL period return (see computeMarkovState), not a synthetic model.
const VIEWS = ["S&P 500", "Markov", "VP"];

/* ═══════════════════════════════════════════════════════════
   MARKOV REGIME HEATMAP
═══════════════════════════════════════════════════════════ */
const MARKOV_SECTORS = [
  { label: "Technology",   sym: "XLK",  color: "#4FA3E0" },
  { label: "Financials",   sym: "XLF",  color: "#F0B429" },
  { label: "Health Care",  sym: "XLV",  color: "#00D4AA" },
  { label: "Cons. Disc.",  sym: "XLY",  color: "#8B5CF6" },
  { label: "Industrials",  sym: "XLI",  color: "#06B6D4" },
  { label: "Energy",       sym: "XLE",  color: "#F97316" },
  { label: "Materials",    sym: "XLB",  color: "#84CC16" },
  { label: "Utilities",    sym: "XLU",  color: "#A78BFA" },
  { label: "Real Estate",  sym: "XLRE", color: "#FB7185" },
  { label: "Cons. Staples",sym: "XLP",  color: "#22D3EE" },
  { label: "Comm. Svcs",   sym: "XLC",  color: "#FCD34D" },
  { label: "SPY",          sym: "SPY",  color: "#E8EDF3" },
  { label: "QQQ",          sym: "QQQ",  color: "#4FA3E0" },
  { label: "IWM",          sym: "IWM",  color: "#F0B429" },
];

type RegimeState = "BULL" | "BEAR" | "SIDE";

function computeMarkovState(sym: string, periodReturn: number): {
  state: RegimeState; edge: number; bullP: number; bearP: number; sideP: number;
  trans: number[][]; trend: string; vol: "HIGH" | "MED" | "LOW";
} {
  // Honest regime proxy derived from the selected period's real return. This is
  // intentionally not presented as a trained predictive model: without a stored
  // return history there is no defensible empirical transition matrix.
  const score = Math.max(-1, Math.min(1, periodReturn / 5));
  const bullRaw = Math.max(0.05, 0.55 + score);
  const bearRaw = Math.max(0.05, 0.55 - score);
  const sideRaw = Math.max(0.10, 1 - Math.abs(score));
  const total = bullRaw + bearRaw + sideRaw;
  const bullP = bullRaw / total;
  const bearP = bearRaw / total;
  const sideP = sideRaw / total;
  const state: RegimeState = bullP >= bearP && bullP >= sideP ? "BULL" : bearP >= sideP ? "BEAR" : "SIDE";
  const edge = Math.abs((bullP - bearP) * 100);
  // Scenario matrix, not a fitted transition model. Rows retain state persistence
  // and distribute the remainder using the live regime probabilities.
  const trans = [
    [0.55 + bullP * 0.3, bearP * 0.2, 0],
    [bullP * 0.2, 0.55 + bearP * 0.3, 0],
    [bullP * 0.35, bearP * 0.35, 0],
  ].map(row => { const s = row[0]+row[1]; row[2]=Math.max(0,1-s); return row; });
  const absReturn = Math.abs(periodReturn);
  const vol: "HIGH"|"MED"|"LOW" = absReturn >= 3 ? "HIGH" : absReturn >= 1 ? "MED" : "LOW";
  const trend = periodReturn > 0.35 ? "UP" : periodReturn < -0.35 ? "DOWN" : "FLAT";
  return { state, edge, bullP: bullP*100, bearP: bearP*100, sideP: sideP*100, trans, trend, vol };
}

function MarkovHeatmap({ tf, pcts }: { tf: string; pcts: Record<string, number> }) {
  const regimeColor: Record<RegimeState, string> = {
    BULL: "#00A86B", BEAR: "#CC1414", SIDE: "#2D3748",
  };
  const regimeBg: Record<RegimeState, string> = {
    BULL: "rgba(0,168,107,0.15)", BEAR: "rgba(204,20,20,0.15)", SIDE: "rgba(45,55,72,0.3)",
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#F0B429", letterSpacing: 1 }}>MARKOV REGIME PROXY</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["BULL","BEAR","SIDE"] as RegimeState[]).map(r => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: regimeColor[r] }} />
              <span style={{ fontSize: 9, color: "#8B95A5", fontWeight: 700 }}>{r}</span>
            </div>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#5A6575" }}>TF: {tf} · Live return heuristic · Not predictive</span>
      </div>

      {/* Grid of sector cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
        {MARKOV_SECTORS.map(ms => {
          const d = computeMarkovState(ms.sym, pcts[ms.sym] ?? 0);
          return (
            <div key={ms.sym} style={{
              background: regimeBg[d.state],
              border: `1px solid ${regimeColor[d.state]}40`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ms.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 900, color: "#E8EDF3" }}>{ms.sym}</span>
                <span style={{ fontSize: 9, color: "#8B95A5" }}>{ms.label}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                    background: regimeColor[d.state], color: "#fff", letterSpacing: 0.5,
                  }}>{d.state}</span>
                  <span style={{ fontSize: 9, color: "#8B95A5" }}>{d.vol}</span>
                </div>
              </div>

              {/* Probability bars */}
              <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ flex: d.bullP, background: "#00A86B", transition: "flex 0.8s ease" }} />
                <div style={{ flex: d.bearP, background: "#CC1414", transition: "flex 0.8s ease" }} />
                <div style={{ flex: d.sideP, background: "#2D3748", transition: "flex 0.8s ease" }} />
              </div>

              {/* Probability labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 8, color: "#00A86B", fontWeight: 700 }}>BULL {d.bullP.toFixed(0)}%</span>
                <span style={{ fontSize: 8, color: "#CC1414", fontWeight: 700 }}>BEAR {d.bearP.toFixed(0)}%</span>
                <span style={{ fontSize: 8, color: "#8B95A5", fontWeight: 700 }}>SIDE {d.sideP.toFixed(0)}%</span>
              </div>

              {/* 3x3 Transition matrix mini */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 2, fontSize: 7, fontFamily: "monospace" }}>
                <div style={{ color: "#5A6575" }} />
                {["→BULL","→BEAR","→SIDE"].map(h => (
                  <div key={h} style={{ color: "#5A6575", textAlign: "center" }}>{h}</div>
                ))}
                {(["BULL","BEAR","SIDE"] as RegimeState[]).map((from, ri) => (
                  <React.Fragment key={from}>
                    <div style={{ color: regimeColor[from], fontWeight: 700 }}>{from[0]}</div>
                    {[0,1,2].map(ci => (
                      <div key={ci} style={{
                        textAlign: "center", fontWeight: 700, padding: "1px 0",
                        color: ci === 0 ? "#00A86B" : ci === 1 ? "#CC1414" : "#8B95A5",
                        background: ri === ci ? "rgba(255,255,255,0.04)" : "transparent",
                        borderRadius: 2,
                      }}>
                        {(d.trans[ri][ci] * 100).toFixed(0)}%
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              {/* Bottom: edge + trend */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 8, color: "#F0B429", fontWeight: 700 }}>EDGE {d.edge.toFixed(1)}%</span>
                <span style={{ fontSize: 8, color: "#8B95A5" }}>TREND {d.trend}</span>
                <span style={{ fontSize: 8, color: "#4FA3E0" }}>{tf}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VOLUME PROFILE HEATMAP
═══════════════════════════════════════════════════════════ */
const VP_SYMBOLS = ["SPY","QQQ","IWM","AAPL","NVDA","TSLA","MSFT","META","AMZN","GOOG","AMD","NFLX"];
interface VPCandle { high:number; low:number; close:number; volume:number }

function VolumeProfileBar({ sym, candles, loading }: { sym: string; candles: VPCandle[]; loading: boolean }) {
  const levels = 16;
  const usable = candles.filter(c => c.high >= c.low && c.close > 0 && c.volume > 0);
  const low = usable.length ? Math.min(...usable.map(c => c.low)) : 0;
  const high = usable.length ? Math.max(...usable.map(c => c.high)) : 0;
  const step = high > low ? (high - low) / levels : 1;
  // Bar-derived approximation: distribute each observed bar's reported volume
  // equally across the price bins touched by its high/low range.
  const vols = Array.from({ length: levels }, () => 0);
  usable.forEach(c => {
    const from = Math.max(0, Math.min(levels - 1, Math.floor((c.low - low) / step)));
    const to = Math.max(from, Math.min(levels - 1, Math.floor((c.high - low) / step)));
    const share = c.volume / (to - from + 1);
    for (let i = from; i <= to; i++) vols[i] += share;
  });
  const maxVol = Math.max(...vols);
  const pocIdx = vols.indexOf(maxVol);
  const currentPrice = usable.at(-1)?.close ?? 0;
  const currentIdx = Math.max(0, Math.min(levels - 1, Math.floor((currentPrice - low) / step)));

  return (
    <div style={{ background: "#0A0E14", border: "1px solid #1A2030", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#E8EDF3" }}>{sym}</span>
        <span style={{ fontSize: 9, color: "#8B95A5" }}>{currentPrice ? `$${currentPrice.toFixed(2)}` : "No data"}</span>
        <span style={{ marginLeft: "auto", fontSize: 8, color: "#F0B429", fontWeight: 700 }}>POC</span>
      </div>

      {/* VP bars from top (high) to bottom (low) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {(loading || !usable.length) && (
          <div style={{ minHeight:176, display:"grid", placeItems:"center", fontSize:9, color:"#5A6575" }}>
            {loading ? "Loading observed OHLCV…" : "Observed OHLCV unavailable"}
          </div>
        )}
        {!loading && usable.length > 0 &&
        Array.from({ length: levels }, (_, i) => {
          const revI    = levels - 1 - i;
          const price   = high - revI * step;
          const vol     = vols[revI];
          const widthPct= (vol / maxVol) * 100;
          const isPOC   = revI === pocIdx;
          const isCur   = revI === currentIdx;
          const isAbove = revI > currentIdx;
          const barColor = isPOC ? "#F0B429"
                         : isAbove ? "rgba(255,77,106,0.55)"
                         : "rgba(0,212,170,0.55)";
          return (
            <div key={revI} style={{ display: "flex", alignItems: "center", gap: 4, height: 10 }}>
              <span style={{ width: 44, fontSize: 6.5, color: isPOC ? "#F0B429" : "#5A6575", textAlign: "right", flexShrink: 0, fontFamily: "monospace" }}>
                {price.toFixed(2)}
              </span>
              <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.03)", borderRadius: 1, overflow: "hidden", position: "relative" }}>
                <div style={{
                  width: `${widthPct}%`, height: "100%",
                  background: barColor,
                  transition: "width 0.6s ease",
                }} />
                {isPOC && <div style={{ position: "absolute", inset: 0, border: "1px solid #F0B429", borderRadius: 1 }} />}
                {isCur && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 1.5, background: "#4FA3E0" }} />}
              </div>
              <span style={{ width: 22, fontSize: 6, color: "#5A6575", textAlign: "right", flexShrink: 0 }}>
                {vol >= 1_000_000 ? `${(vol/1_000_000).toFixed(1)}m` : vol >= 1_000 ? `${(vol/1_000).toFixed(0)}k` : vol.toFixed(0)}
              </span>
            </div>
          );
        })
        }
      </div>

      {/* Value Area */}
      <div style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 7, color: "#8B95A5" }}>
        <span>Bar-derived profile</span>
        <span>Observed OHLCV</span>
        <span>Not tick-at-price</span>
      </div>
    </div>
  );
}

function VPHeatmap({ tf }: { tf: string }) {
  const [profiles, setProfiles] = useState<Record<string,VPCandle[]>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const chartTF = tf === "1D" ? "5m" : tf === "1W" ? "30m" : tf === "1M" ? "1h" : "D";
    setLoading(true);
    Promise.all(VP_SYMBOLS.map(async sym => {
      try {
        const res = await fetch(`/api/yahoo?sym=${sym}&type=candles&tf=${chartTF}&bars=300`, { cache:"no-store" });
        const json = await res.json() as { candles?:VPCandle[] };
        return [sym, json.candles ?? []] as const;
      } catch { return [sym, []] as const; }
    })).then(entries => {
      if (!cancelled) setProfiles(Object.fromEntries(entries));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tf]);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#4FA3E0", letterSpacing: 1 }}>VOLUME PROFILE HEATMAP</span>
        <div style={{ display: "flex", gap: 8, fontSize: 8, color: "#8B95A5" }}>
          <span style={{ color: "#F0B429" }}>▬ POC</span>
          <span style={{ color: "#FF4D6A" }}>■ Above</span>
          <span style={{ color: "#00D4AA" }}>■ Below</span>
          <span style={{ color: "#4FA3E0" }}>| Current</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#5A6575" }}>TF: {tf} · bar-derived, not exchange tick profile</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
        {VP_SYMBOLS.map(sym => (
          <VolumeProfileBar key={sym} sym={sym} candles={profiles[sym] ?? []} loading={loading} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════ */

// Collect all unique symbols from SECTORS
function getAllSymbols(): string[] {
  const syms: string[] = [];
  SECTORS.forEach(s => s.industries.forEach(ind => ind.stocks.forEach(st => {
    if (!syms.includes(st.sym)) syms.push(st.sym);
  })));
  MARKOV_SECTORS.forEach(({ sym }) => {
    if (!syms.includes(sym)) syms.push(sym);
  });
  return syms;
}

const HM_CACHE_PREFIX = "wm_heatmap_";
const HM_CACHE_TTL = { "1D": 60_000, "1W": 300_000, "1M": 600_000, "3M": 900_000, "6M": 900_000, "YTD": 900_000, "1Y": 900_000, "5Y": 1_800_000 } as Record<string, number>;

function useLivePct(tf: string) {
  // Initialize from localStorage cache so we never show blank zeros on revisit
  const [pcts, setPcts] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(HM_CACHE_PREFIX + tf);
      if (!raw) return {};
      const { data, ts } = JSON.parse(raw) as { data: Record<string, number>; ts: number };
      const ttl = HM_CACHE_TTL[tf] ?? 120_000;
      if (Date.now() - ts < ttl * 5) return data; // show stale data while refreshing
    } catch {}
    return {};
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Only show spinner if we have no data at all
      if (Object.keys(pcts).length === 0) setLoading(true);
      try {
        const syms = getAllSymbols();
        const res  = await fetch(
          `/api/heatmap?period=${encodeURIComponent(tf)}&syms=${encodeURIComponent(syms.join(","))}`,
          { cache: "no-store" }
        );
        const json = await res.json() as { results?: Record<string, number> };
        if (!cancelled && json.results) {
          setPcts(json.results);
          // Cache to localStorage for instant re-load
          try { localStorage.setItem(HM_CACHE_PREFIX + tf, JSON.stringify({ data: json.results, ts: Date.now() })); } catch {}
        }
      } catch { /* network hiccup — keep previous data */ }
      finally { if (!cancelled) setLoading(false); }
    }

    load();
    // 1D refreshes every 30s; historical every 2 min
    const interval = tf === "1D" ? 30_000 : 120_000;
    const id = setInterval(load, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [tf]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pcts, loading };
}

/* ═══════════════════════════════════════════════════════════
   COLOR HELPERS
═══════════════════════════════════════════════════════════ */
function pctColor(pct: number): string {
  if (pct >=  5) return "#00A86B";
  if (pct >=  3) return "#00C07A";
  if (pct >=  1) return "#1A9950";
  if (pct >=  0) return "#145C38";
  if (pct >= -1) return "#7B2020";
  if (pct >= -3) return "#B22222";
  if (pct >= -5) return "#CC1414";
  return "#E00000";
}

function pctTextColor(pct: number): string {
  return Math.abs(pct) > 0.5 ? "#ffffff" : "#cccccc";
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP — FINVIZ STYLE SECTOR BREAKDOWN LIST
═══════════════════════════════════════════════════════════ */
interface TooltipProps {
  industry: Industry;
  pcts: Record<string, number>;
  x: number; y: number;
}
function IndustryTooltip({ industry, pcts, x, y }: TooltipProps) {
  const sorted = [...industry.stocks].sort((a, b) => (pcts[b.sym] ?? 0) - (pcts[a.sym] ?? 0));
  const topStock = sorted[0];
  const topPct = pcts[topStock?.sym] ?? 0;

  // Position tooltip to stay on screen (guard for SSR where window is undefined)
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = x + 16;
  const top = Math.min(y, winH - 420);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{
        position: "fixed", left, top,
        zIndex: 9999, pointerEvents: "none",
        width: 320,
        background: "#0D1117",
        border: "1px solid #2D3748",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ background: "#161B22", padding: "10px 14px", borderBottom: "1px solid #2D3748" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A0", textTransform: "uppercase", letterSpacing: 1 }}>
          {industry.name}
        </div>
        {topStock && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{topStock.sym}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#8892A0", marginLeft: "auto" }}>
              ${topStock.price.toFixed(2)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: topPct >= 0 ? "#00D4AA" : "#FF4D6A" }}>
              {topPct >= 0 ? "+" : ""}{topPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Stock list */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {sorted.map(st => {
          const p = pcts[st.sym] ?? 0;
          return (
            <div key={st.sym} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 14px",
              borderBottom: "1px solid #1A2030",
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", width: 52 }}>{st.sym}</span>
              <span style={{ fontSize: 12, color: "#8892A0", marginLeft: "auto" }}>
                ${st.price.toFixed(2)}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, width: 60, textAlign: "right",
                color: p >= 0 ? "#00D4AA" : "#FF4D6A",
              }}>
                {p >= 0 ? "+" : ""}{p.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function HeatmapsPage() {
  const [activeView, setActiveView] = useState("S&P 500");
  const [activeTF,   setActiveTF]   = useState("1D");
  const [hovered,    setHovered]    = useState<{ industry: Industry; x: number; y: number } | null>(null);
  const [search,     setSearch]     = useState("");
  const { pcts, loading: heatLoading } = useLivePct(activeTF);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();

  const goToChart = useCallback((sym: string) => {
    setActiveSymbol(sym);
    router.push("/charts");
  }, [setActiveSymbol, router]);

  const totalWeight = SECTORS.reduce((s, sec) => s + sec.weight, 0);

  const handleMouseEnter = useCallback((e: React.MouseEvent, industry: Industry) => {
    setHovered({ industry, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent, industry: Industry) => {
    setHovered({ industry, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  // Filter by search
  const searchLower = search.toLowerCase();
  const visibleSectors = SECTORS.map(sec => ({
    ...sec,
    industries: sec.industries.map(ind => ({
      ...ind,
      stocks: ind.stocks.filter(st =>
        !searchLower || st.sym.toLowerCase().includes(searchLower) || st.name.toLowerCase().includes(searchLower)
      ),
    })).filter(ind => ind.stocks.length > 0),
  })).filter(sec => sec.industries.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#070A0F", overflow: "hidden" }}>

      {/* ── Top control bar ── */}
      <div style={{
        height: 38, flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
        padding: "0 14px", borderBottom: "1px solid #1A2030", background: "#0A0E14",
      }}>
        <span style={{ fontSize: 11, color: "#8892A0", fontWeight: 700 }}>VIEW</span>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setActiveView(v)} style={{
            fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 4, cursor: "pointer", border: "none",
            background: activeView === v ? "#4FA3E0" : "transparent",
            color: activeView === v ? "#fff" : "#8892A0",
          }}>{v}</button>
        ))}
        <div style={{ width: 1, height: 18, background: "#2D3748", marginLeft: 4 }} />
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setActiveTF(tf)} style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, cursor: "pointer", border: "none",
            background: activeTF === tf ? "#2D3748" : "transparent",
            color: activeTF === tf ? "#fff" : "#8892A0",
          }}>{tf}</button>
        ))}
        {heatLoading && (
          <span style={{ fontSize: 10, color: "#4FA3E0", marginLeft: 4 }}>Loading…</span>
        )}
        <div style={{ flex: 1 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Quick search ticker…"
          style={{
            background: "#161B22", border: "1px solid #2D3748", borderRadius: 6,
            color: "#fff", fontSize: 11, padding: "3px 10px", width: 160, outline: "none",
          }}
        />
        <span style={{ fontSize: 10, color: "#8892A0" }}>
          S&amp;P 500 index stocks · Size = market cap · {activeTF} performance
        </span>
      </div>

      {/* ── Markov view ── */}
      {activeView === "Markov" && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <MarkovHeatmap tf={activeTF} pcts={pcts} />
        </div>
      )}

      {/* ── VP view ── */}
      {activeView === "VP" && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <VPHeatmap tf={activeTF} />
        </div>
      )}

      {/* ── Main stock heatmap area ── */}
      {activeView !== "Markov" && activeView !== "VP" && (
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 2, padding: 4 }}>
        {visibleSectors.map(sector => {
          const sectorPct = sector.weight / totalWeight;
          // Compute a representative sector avg pct
          const allStocks = sector.industries.flatMap(i => i.stocks);
          const avgPct = allStocks.length
            ? allStocks.reduce((sum, st) => sum + (pcts[st.sym] ?? 0), 0) / allStocks.length
            : 0;

          return (
            <div
              key={sector.label}
              style={{
                flex: `0 0 calc(${sectorPct * 100}% - 4px)`,
                minWidth: 120,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* Sector header */}
              <div style={{
                fontSize: 10, fontWeight: 900, color: "#8892A0",
                textTransform: "uppercase", letterSpacing: 0.8,
                display: "flex", alignItems: "center", gap: 6, padding: "2px 4px",
              }}>
                <span>{sector.label}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: avgPct >= 0 ? "#00D4AA" : "#FF4D6A",
                }}>
                  {avgPct >= 0 ? "+" : ""}{avgPct.toFixed(2)}%
                </span>
              </div>

              {/* Industries */}
              {sector.industries.map(industry => {
                const industryStocks = industry.stocks;
                const totalMcap = industryStocks.reduce((s, st) => s + st.mcap, 0);
                const industryPct = industryStocks.length
                  ? industryStocks.reduce((sum, st) => sum + (pcts[st.sym] ?? 0), 0) / industryStocks.length
                  : 0;

                return (
                  <div
                    key={industry.name}
                    onMouseEnter={e => handleMouseEnter(e, industry)}
                    onMouseMove={e => handleMouseMove(e, industry)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: "relative",
                      border: hovered?.industry.name === industry.name
                        ? "1px solid #F0B429"
                        : "1px solid #1A2030",
                      borderRadius: 3,
                      overflow: "hidden",
                      minHeight: 60,
                      cursor: "pointer",
                    }}
                  >
                    {/* Industry sub-label */}
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "#8892A0",
                      textTransform: "uppercase", letterSpacing: 0.5,
                      padding: "3px 5px 1px", background: "rgba(0,0,0,0.45)",
                      borderBottom: "1px solid #1A2030",
                    }}>
                      {industry.name}
                    </div>

                    {/* Stock tiles grid */}
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 1, padding: 1,
                    }}>
                      {industryStocks.map(st => {
                        const p = pcts[st.sym] ?? 0;
                        const tileWeight = st.mcap / totalMcap;
                        const minW = tileWeight > 0.35 ? "100%" : tileWeight > 0.2 ? "48%" : tileWeight > 0.1 ? "32%" : "auto";
                        const bg = pctColor(p);
                        const tc = pctTextColor(p);

                        return (
                          <div
                            key={st.sym}
                            title={`${st.name}: ${p >= 0 ? "+" : ""}${p.toFixed(2)}% — Click to open chart`}
                            onClick={() => goToChart(st.sym)}
                            style={{
                              flex: `0 0 ${minW}`,
                              minWidth: tileWeight < 0.05 ? 32 : 52,
                              minHeight: tileWeight > 0.35 ? 80 : tileWeight > 0.15 ? 56 : 36,
                              background: bg,
                              borderRadius: 2,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px 4px",
                              cursor: "pointer",
                              transition: "filter 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.25)"}
                            onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
                          >
                            <span style={{
                              fontSize: tileWeight > 0.25 ? 16 : tileWeight > 0.1 ? 12 : 9,
                              fontWeight: 900, color: tc,
                              lineHeight: 1, letterSpacing: -0.3,
                            }}>
                              {st.sym}
                            </span>
                            {tileWeight > 0.08 && (
                              <span style={{
                                fontSize: tileWeight > 0.25 ? 13 : 10,
                                fontWeight: 700, color: tc,
                                lineHeight: 1.2, marginTop: 2,
                              }}>
                                {p >= 0 ? "+" : ""}{p.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      )}

      {/* ── Tooltip ── */}
      {activeView !== "Markov" && activeView !== "VP" && (
        <AnimatePresence>
          {hovered && (
            <IndustryTooltip
              industry={hovered.industry}
              pcts={pcts}
              x={hovered.x}
              y={hovered.y}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
