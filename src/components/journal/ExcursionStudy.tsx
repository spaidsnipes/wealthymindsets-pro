"use client";

/**
 * MFE / MAE ACROSS RECENT TRADES (Garden 18 v2 §36/§53) — each recent broker
 * episode measured on its own contract's dxFeed 1-minute bars, on the trader's
 * click (one request per contract, in sequence). dxFeed keeps an expired
 * option's minute bars only briefly, so the window is recent days; trades with
 * no bars are counted apart, never estimated.
 */

import React, { useState } from "react";

import { requestTastyCandles } from "@/lib/broker/tastyQuoteStream";
import type { Episode } from "@/lib/broker/webullLedger";
import { tastyCandleSymbol, tastyCandlesToBars } from "@/lib/marketData/adapters/tastytradeCandles";
import { excursions, optionStreamerFor, summarizeExcursions, type ExcursionSummary, type Excursions } from "@/lib/journal/tradeReplay";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const DAYS = 14;

const money = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`);

export function ExcursionStudy({ episodes }: { readonly episodes: readonly Episode[] }) {
  const [state, setState] = useState<{ phase: "IDLE" | "RUNNING" | "DONE"; note: string; summary: ExcursionSummary | null; noBars: number; total: number }>({ phase: "IDLE", note: "", summary: null, noBars: 0, total: 0 });
  const since = Date.now() - DAYS * 86_400_000;
  const recent = episodes.filter(e => e.label === "RECONSTRUCTED" && e.closedAt && Date.parse(e.openedAt) >= since);

  const run = async () => {
    const byContract = new Map<string, Episode[]>();
    for (const e of recent) (byContract.get(e.instrumentKey) ?? byContract.set(e.instrumentKey, []).get(e.instrumentKey)!).push(e);
    const rows: Excursions[] = [];
    let noBars = 0, k = 0;
    for (const [key, eps] of byContract) {
      k++;
      setState(s => ({ ...s, phase: "RUNNING", note: `Measuring ${key} (${k} of ${byContract.size} contracts)…` }));
      const streamer = optionStreamerFor(key);
      const from = Math.min(...eps.map(e => Date.parse(e.openedAt))) - 60_000;
      const raw = streamer ? await requestTastyCandles(tastyCandleSymbol(streamer, "1m") ?? `${streamer}{=m}`, streamer, from, 15_000).catch(() => null) : null;
      const bars = raw ? tastyCandlesToBars(raw, 100_000) : [];
      for (const e of eps) {
        const x = bars.length ? excursions(bars, e) : null;
        if (x) rows.push(x); else noBars++;
      }
    }
    setState({ phase: "DONE", note: "", summary: summarizeExcursions(rows), noBars, total: recent.length });
  };

  return (
    <div data-testid="edge-excursions" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>WHILE YOU HELD · MFE / MAE ACROSS THE LAST {DAYS} DAYS</div>
      <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
        Each of the {recent.length} recent trades measured on its own contract&apos;s 1-minute bars (tastytrade / dxFeed), per contract. MEASURED from bar extremes; trades whose bars are no longer kept are counted apart, never estimated.
      </p>
      {state.phase === "IDLE" ? (
        <button type="button" data-testid="edge-excursions-run" onClick={() => { void run(); }} disabled={!recent.length}
          style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: recent.length ? "pointer" : "default" }}>
          Measure {recent.length} trades on their own bars
        </button>
      ) : state.phase === "RUNNING" ? (
        <p role="status" style={{ fontSize: 11, color: MUTED, margin: 0 }}>{state.note}</p>
      ) : state.summary ? (
        <div data-testid="edge-excursions-result" style={{ fontSize: 12, color: INK, display: "grid", gap: 4 }}>
          <div>Measured <b>{state.summary.measured}</b> of {state.total} trades{state.noBars ? ` (${state.noBars} had no bars left to measure)` : ""}.</div>
          <div>Average best open profit (MFE) <b>{money(state.summary.avgMfe)}</b> · average worst open loss (MAE) <b>{money(state.summary.avgMae)}</b> per contract.</div>
          <div>Winners kept on average <b>{state.summary.avgCaptureWinners == null ? "—" : `${Math.round(state.summary.avgCaptureWinners * 100)}%`}</b> of their best move.</div>
          <div><b>{state.summary.losersGreenFirst}</b> of {state.summary.losers} losing trades were in profit at some point before closing red.</div>
        </div>
      ) : null}
    </div>
  );
}
