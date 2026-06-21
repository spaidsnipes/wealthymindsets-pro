"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { FootprintType } from "./ChartsDashboard";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  candles: Candle[];
  footprintType: FootprintType;
}

// Generate synthetic order flow data matching each candle
function generateOrderFlow(candle: Candle) {
  const up = candle.close >= candle.open;
  const aggVol = Math.floor(candle.volume * (0.3 + Math.random() * 0.4));
  const passVol = candle.volume - aggVol;
  const delta = up ? aggVol - Math.floor(passVol * 0.4) : -aggVol + Math.floor(passVol * 0.4);
  const imbalance = aggVol / Math.max(passVol, 1);
  const isImbalance = imbalance > 3; // >300%

  return {
    aggressiveBuy: up ? aggVol : Math.floor(aggVol * 0.2),
    aggressiveSell: !up ? aggVol : Math.floor(aggVol * 0.2),
    passiveBid: Math.floor(passVol * 0.6),
    passiveAsk: Math.floor(passVol * 0.4),
    delta,
    imbalance,
    isImbalance,
    absorption: Math.random() > 0.85,
  };
}

// This overlay renders ChartFanatics-style bubbles + imbalance lines
// positioned absolutely over the chart canvas.
// In production, these would be positioned using chart coordinate transformations.
// Here we render a sample "last 5 candles" overlay panel for demo.
export function OrderFlowOverlay({ candles, footprintType }: Props) {
  const recent = candles.slice(-8);
  const [flows, setFlows] = useState<{ c: Candle; flow: ReturnType<typeof generateOrderFlow> }[]>([]);
  useEffect(() => {
    setFlows(recent.map(c => ({ c, flow: generateOrderFlow(c) })));
  }, [recent.length, footprintType]);

  if (footprintType === "volume-profile") return null;

  return (
    <div className="absolute bottom-24 left-2 z-10 pointer-events-none">
      {/* est. label — bid/ask split derived from OHLC direction, not real tape */}
      <div style={{ fontSize: 7, color: "rgba(74,80,112,0.6)", marginBottom: 2, letterSpacing: 0.4 }}>
        order flow · est.
      </div>
      <div className="flex items-end gap-1">
        {flows.map(({ c, flow }, i) => {
          const up = c.close >= c.open;
          const isLast = i === flows.length - 1;

          if (footprintType === "aggressive-passive" || footprintType === "bid-ask") {
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 opacity-90">
                {/* Aggressive sell bubble at high */}
                {flow.aggressiveSell > 100 && (
                  <div className="of-bubble-sell" style={{ fontSize: 9 }}>
                    {flow.aggressiveSell > 999 ? `${(flow.aggressiveSell/1000).toFixed(1)}k` : flow.aggressiveSell}
                  </div>
                )}

                {/* Passive limit line */}
                <div
                  className="w-8 border-t border-dashed"
                  style={{ borderColor: up ? "rgba(0,212,170,0.5)" : "rgba(255,77,106,0.5)" }}
                />

                {/* Aggressive buy bubble at low */}
                {flow.aggressiveBuy > 100 && (
                  <div className="of-bubble-buy" style={{ fontSize: 9 }}>
                    {flow.aggressiveBuy > 999 ? `${(flow.aggressiveBuy/1000).toFixed(1)}k` : flow.aggressiveBuy}
                  </div>
                )}

                {/* Imbalance highlight */}
                {flow.isImbalance && (
                  <div
                    className="text-[8px] font-bold px-1 rounded"
                    style={{
                      background: up ? "rgba(0,212,170,0.2)" : "rgba(255,77,106,0.2)",
                      color: up ? "#00D4AA" : "#FF4D6A",
                      border: `1px solid ${up ? "rgba(0,212,170,0.4)" : "rgba(255,77,106,0.4)"}`,
                    }}
                  >
                    {flow.imbalance.toFixed(0)}x
                  </div>
                )}
              </div>
            );
          }

          if (footprintType === "delta") {
            const pos = flow.delta >= 0;
            return (
              <div
                key={i}
                className="text-[9px] font-mono px-1 py-0.5 rounded"
                style={{
                  background: pos ? "rgba(0,212,170,0.15)" : "rgba(255,77,106,0.15)",
                  color: pos ? "#00D4AA" : "#FF4D6A",
                  border: `1px solid ${pos ? "rgba(0,212,170,0.3)" : "rgba(255,77,106,0.3)"}`,
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {pos ? "+" : ""}{flow.delta > 999 ? `${(flow.delta/1000).toFixed(1)}k` : flow.delta}
              </div>
            );
          }

          if (footprintType === "imbalance" && flow.isImbalance) {
            return (
              <div
                key={i}
                className="text-[9px] font-bold px-1.5 py-1 rounded-md animate-pulse"
                style={{
                  background: up ? "rgba(0,212,170,0.25)" : "rgba(255,77,106,0.25)",
                  color: up ? "#00D4AA" : "#FF4D6A",
                  border: `1px solid ${up ? "#00D4AA" : "#FF4D6A"}`,
                  boxShadow: `0 0 8px ${up ? "rgba(0,212,170,0.3)" : "rgba(255,77,106,0.3)"}`,
                }}
              >
                ⚡ {(flow.imbalance * 100).toFixed(0)}%
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
