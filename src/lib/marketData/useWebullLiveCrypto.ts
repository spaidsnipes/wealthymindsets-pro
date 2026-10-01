"use client";

/**
 * WEBULL, LIVE, FOR THE CHART'S CRYPTO SYMBOL.
 *
 * Measured on serving 2026-09-27 04:14Z through /api/market-data/webull/stream:
 * Webull's real-time broker ACCEPTS WM Pro's App Key; US_CRYPTO QUOTE and
 * SNAPSHOT stream (32 quotes in 12 s on BTCUSD); US_STOCK (TSLA) and
 * US_FUTURES (ESZ6) are refused 403 MARKET_DATA_NOT_SUBSCRIBED. So this hook
 * runs only for USD crypto symbols — the lane Webull answers today — and
 * reports a refusal as a refusal if Webull ever gives one.
 *
 * It decodes Webull's own frames (webullQuotePayload), keeps only the latest
 * price / bid / ask and Webull's timestamp, and stores nothing (GP12 §21).
 */

import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { useEffect, useState } from "react";

import { decodeWebullFrame } from "@/lib/marketData/webullQuotePayload";

export type WebullLivePhase = "CONNECTING" | "LIVE" | "REFUSED" | "RETRYING";

export interface WebullLiveReading {
  readonly symbol: string;
  readonly phase: WebullLivePhase;
  readonly price: number | null;
  readonly bid: number | null;
  readonly ask: number | null;
  /** Webull's own timestamp on the newest frame, epoch ms. */
  readonly providerAtMs: number | null;
  /** Frames decoded in the last minute. */
  readonly framesPerMin: number;
  /** Webull's refusal code, verbatim, when phase is REFUSED. */
  readonly refusal: string | null;
}

/** The Webull crypto symbol for a chart symbol, or null. USD quote only: BTCUSD / BTC-USD / BTC/USD → "BTCUSD". PURE. */
export function webullCryptoSymbolForChart(symbol: string): string | null {
  // Spot FX (EURUSD, GBPUSD, XAUUSD) also ends in USD — it is not a coin, and
  // Webull answers it INVALID_SYMBOL (serving, 2026-10-01). Ask the classifier.
  if (classifySymbol(symbol) !== "CRYPTO") return null;
  const s = symbol.toUpperCase().replace(/[-/\s]/g, "");
  return /^[A-Z0-9]{2,10}USD$/.test(s) ? s : null;
}

const PUBLISH_MS = 500;

export function useWebullLiveCrypto(chartSymbol: string, enabled = true): WebullLiveReading | null {
  const wbSym = enabled ? webullCryptoSymbolForChart(chartSymbol) : null;
  const [reading, setReading] = useState<WebullLiveReading | null>(null);

  useEffect(() => {
    setReading(null);
    if (!wbSym || typeof fetch === "undefined") return;
    let stopped = false;
    let ctl: AbortController | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let backoff = 3_000;
    const state = {
      phase: "CONNECTING" as WebullLivePhase, price: null as number | null, bid: null as number | null, ask: null as number | null,
      providerAtMs: null as number | null, refusal: null as string | null, stamps: [] as number[],
    };

    const open = async () => {
      if (stopped) return;
      ctl = new AbortController();
      let buf = "";
      try {
        const r = await fetch(`/api/market-data/webull/stream?symbols=${encodeURIComponent(wbSym)}&category=US_CRYPTO&subTypes=SNAPSHOT,QUOTE`, { signal: ctl.signal, cache: "no-store" });
        if (!r.ok || !r.body) throw new Error(String(r.status));
        const rd = r.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let cut: number;
          while ((cut = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, cut);
            buf = buf.slice(cut + 2);
            const line = block.split("\n").find(l => l.startsWith("data: "));
            if (!line) continue;
            let ev: { kind?: string; topic?: string; payload?: string; subscribed?: boolean; providerCode?: string | null; status?: number };
            try { ev = JSON.parse(line.slice(6)); } catch { continue; }
            if (ev.kind === "subscribe" && ev.subscribed === false) {
              state.phase = "REFUSED";
              state.refusal = ev.providerCode ?? `HTTP ${ev.status ?? "?"}`;
            } else if (ev.kind === "quote" && typeof ev.topic === "string" && typeof ev.payload === "string") {
              const f = decodeWebullFrame(ev.topic, ev.payload);
              if (!f || f.basic.symbol !== wbSym) continue;
              if (f.kind === "SNAPSHOT" && f.price != null) state.price = f.price;
              if (f.kind === "QUOTE") { state.bid = f.bid?.price ?? state.bid; state.ask = f.ask?.price ?? state.ask; }
              if (f.basic.atMs != null) state.providerAtMs = f.basic.atMs;
              state.phase = "LIVE";
              state.stamps.push(Date.now());
              backoff = 3_000;
            }
          }
        }
      } catch {
        /* aborted or dropped — the retry below decides */
      }
      if (stopped || state.phase === "REFUSED") return;
      state.phase = "RETRYING";
      retry = setTimeout(open, backoff);
      backoff = Math.min(30_000, backoff * 2);
    };
    void open();

    const publish = setInterval(() => {
      const now = Date.now();
      state.stamps = state.stamps.filter(t => now - t <= 60_000);
      setReading({
        symbol: wbSym, phase: state.phase, price: state.price, bid: state.bid, ask: state.ask,
        providerAtMs: state.providerAtMs, framesPerMin: state.stamps.length, refusal: state.refusal,
      });
    }, PUBLISH_MS);

    return () => {
      stopped = true;
      clearInterval(publish);
      if (retry) clearTimeout(retry);
      ctl?.abort();
    };
  }, [wbSym]);

  return wbSym ? reading : null;
}
