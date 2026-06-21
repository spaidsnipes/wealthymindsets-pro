"use client";

import React from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

const SYMBOL_DETAILS: Record<string, {
  exchange: string;
  fullName: string;
  tickValue: string;
  sessionNote: string;
}> = {
  "ES1!":  { exchange:"CME GLOBEX", fullName:"E-mini S&P 500 Futures",     tickValue:"$12.50/tick", sessionNote:"23hrs" },
  "NQ1!":  { exchange:"CME GLOBEX", fullName:"E-mini NASDAQ-100 Futures",   tickValue:"$5.00/tick",  sessionNote:"23hrs" },
  "RTY1!": { exchange:"CME GLOBEX", fullName:"E-mini Russell 2000 Futures", tickValue:"$5.00/tick",  sessionNote:"23hrs" },
  "YM1!":  { exchange:"CBOT",       fullName:"E-mini Dow Jones Futures",    tickValue:"$5.00/tick",  sessionNote:"23hrs" },
  "GC1!":  { exchange:"COMEX",      fullName:"Gold Futures",                tickValue:"$10.00/tick", sessionNote:"23hrs" },
  "CL1!":  { exchange:"NYMEX",      fullName:"Crude Oil WTI Futures",       tickValue:"$10.00/tick", sessionNote:"23hrs" },
  "SPY":   { exchange:"NYSE Arca",  fullName:"SPDR S&P 500 ETF Trust",      tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "QQQ":   { exchange:"NASDAQ",     fullName:"Invesco QQQ Trust",           tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "AAPL":  { exchange:"NASDAQ",     fullName:"Apple Inc. Common Stock",     tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "TSLA":  { exchange:"NASDAQ",     fullName:"Tesla, Inc. Common Stock",    tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "NVDA":  { exchange:"NASDAQ",     fullName:"NVIDIA Corporation",          tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "AMZN":  { exchange:"NASDAQ",     fullName:"Amazon.com, Inc.",            tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "META":  { exchange:"NASDAQ",     fullName:"Meta Platforms, Inc.",        tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "MSFT":  { exchange:"NASDAQ",     fullName:"Microsoft Corporation",       tickValue:"$0.01/share", sessionNote:"6.5hrs" },
  "BTC":   { exchange:"CRYPTO",     fullName:"Bitcoin / US Dollar",         tickValue:"Variable",    sessionNote:"24hrs" },
  "ETH":   { exchange:"CRYPTO",     fullName:"Ethereum / US Dollar",        tickValue:"Variable",    sessionNote:"24hrs" },
};

function getSessionStatus(): { label: string; color: string } {
  const now = new Date();
  const etOffset = -5; // ET (simplified, ignoring DST)
  const etHour = (now.getUTCHours() + etOffset + 24) % 24;
  const etMin = now.getUTCMinutes();
  const etTime = etHour + etMin / 60;

  if (etTime >= 9.5 && etTime < 16)   return { label: "REGULAR",    color: "#00C076" };
  if (etTime >= 4 && etTime < 9.5)    return { label: "PRE-MARKET", color: "#F5A623" };
  if (etTime >= 16 && etTime < 20)    return { label: "AFTER-HOURS",color: "#8B5CF6" };
  return { label: "CLOSED", color: "#4A5580" };
}

interface Props {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
}

export function SymbolInfoHeader({ symbol, timeframe, currentPrice, dayHigh, dayLow }: Props) {
  const info = SYMBOL_DETAILS[symbol.toUpperCase()] ?? {
    exchange: "N/A", fullName: symbol, tickValue: "N/A", sessionNote: ""
  };
  const session = getSessionStatus();
  const { ticker } = useWebSocket({ symbol, timeframe });
  const price = ticker.price > 0 ? ticker.price : currentPrice;
  const high  = Math.max(dayHigh,  price);
  const low   = Math.min(dayLow > 0 ? dayLow : price, price);
  const range = high - low || 1;
  const pct   = Math.max(0, Math.min(1, (price - low) / range));
  const dp    = price > 100 ? 2 : price > 10 ? 3 : 4;
  const up    = ticker.change >= 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      height: 32, padding: "0 12px",
      background: "#0B0E1A",
      borderBottom: "1px solid #263050",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Exchange + session */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#4A5580", background: "#141824", border: "1px solid #263050", borderRadius: 3, padding: "2px 5px", letterSpacing: "0.06em" }}>
          {info.exchange}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: session.color, background: `${session.color}18`, border: `1px solid ${session.color}40`, borderRadius: 3, padding: "2px 5px", letterSpacing: "0.04em" }}>
          {session.label}
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 14, background: "#263050" }} />

      {/* Full name */}
      <span style={{ fontSize: 11, color: "#8896BE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
        {info.fullName}
      </span>

      {/* Separator */}
      <div style={{ width: 1, height: 14, background: "#263050" }} />

      {/* Tick value */}
      <span style={{ fontSize: 10, color: "#4A5580", whiteSpace: "nowrap", flexShrink: 0 }}>
        Tick: <span style={{ color: "#8896BE" }}>{info.tickValue}</span>
      </span>

      {/* Separator */}
      <div style={{ width: 1, height: 14, background: "#263050" }} />

      {/* Daily range bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "#FF4D67", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {low.toFixed(dp)}
        </span>
        <div style={{ width: 80, height: 4, background: "#141824", border: "1px solid #263050", borderRadius: 2, position: "relative" }}>
          {/* Filled portion */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 2,
            width: `${pct * 100}%`,
            background: "linear-gradient(90deg, #FF4D67, #F5A623, #00C076)",
          }} />
          {/* Current price indicator */}
          <div style={{
            position: "absolute", top: -3, bottom: -3, width: 2, borderRadius: 1,
            left: `${pct * 100}%`, transform: "translateX(-50%)",
            background: "#E2E8FF",
          }} />
        </div>
        <span style={{ fontSize: 10, color: "#00C076", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {high.toFixed(dp)}
        </span>
      </div>

      {/* Change */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace" }}>
          {up ? "+" : ""}{ticker.changePct?.toFixed(2) ?? "0.00"}%
        </span>
        <span style={{ fontSize: 10, color: "#4A5580" }}>{info.sessionNote}</span>
      </div>
    </div>
  );
}
