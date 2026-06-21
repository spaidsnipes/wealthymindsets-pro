"use client";

import { useEffect, useRef, useState } from "react";

interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Simulates a live WebSocket feed with realistic tick-by-tick price movement
export function useMarketData(symbol: string, timeframe: string) {
  const [liveCandle, setLiveCandle] = useState<OHLCVBar | null>(null);
  const priceRef = useRef(
    symbol.startsWith("NQ") ? 21_847.5 :
    symbol.startsWith("ES") ? 5_892.75 :
    symbol.startsWith("AAPL") ? 228.5 :
    symbol.startsWith("BTC") ? 104_280 : 21_847.5
  );
  const candleRef = useRef<OHLCVBar | null>(null);

  useEffect(() => {
    priceRef.current =
      symbol.startsWith("NQ") ? 21_847.5 :
      symbol.startsWith("ES") ? 5_892.75 :
      symbol.startsWith("AAPL") ? 228.5 :
      symbol.startsWith("BTC") ? 104_280 : 21_847.5;
    candleRef.current = null;

    // Simulate tick interval (250ms for realistic feel)
    const interval = setInterval(() => {
      const price = priceRef.current;
      const tick = (Math.random() - 0.49) * (price * 0.0003);
      const newPrice = +(price + tick).toFixed(2);
      priceRef.current = newPrice;

      const now = Math.floor(Date.now() / 1000);
      const intervalSec =
        timeframe === "1t" ? 1 :
        timeframe === "5t" ? 5 :
        timeframe === "30t" ? 30 :
        timeframe === "1m" ? 60 :
        timeframe === "5m" ? 300 :
        timeframe === "15m" ? 900 :
        timeframe === "1h" ? 3600 : 60;

      const barTime = Math.floor(now / intervalSec) * intervalSec;

      if (!candleRef.current || candleRef.current.time !== barTime) {
        // New candle
        const newBar: OHLCVBar = {
          time: barTime,
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: Math.floor(Math.random() * 50),
        };
        candleRef.current = newBar;
      } else {
        // Update existing candle
        const c = candleRef.current;
        candleRef.current = {
          ...c,
          high: Math.max(c.high, newPrice),
          low: Math.min(c.low, newPrice),
          close: newPrice,
          volume: c.volume + Math.floor(Math.random() * 20),
        };
      }

      setLiveCandle({ ...candleRef.current });
    }, 250);

    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  return { liveCandle };
}
