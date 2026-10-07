"use client";

/**
 * SCANNER — FVG CONDITIONS STRIP (Garden 19 §22).
 *
 * Reads the scanner's universe on DAILY closed bars (the scanner's own bar
 * timeframe) through the one engine (`fvgScanConditions`) — on request, not on
 * every refresh. A refused symbol is listed with its plain reason; the read
 * count always carries its denominator. Selecting a result opens the chart
 * with that exact FVG object selected (`select=fvg:<OBJECT_ID>`).
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { fetchFvgBars } from "@/lib/marketData/fvg/fvgBarSource";
import {
  FVG_CONVERGENCE_CONDITIONS,
  FVG_CONVERGENCE_LABEL,
  FVG_SCAN_CONDITIONS,
  FVG_SCAN_CONDITION_LABEL,
  fvgScanConditions,
  fvgScanCoverage,
  type FvgConvergenceCondition,
  type FvgScanCondition,
  type FvgScanReading,
} from "@/lib/scanner/fvgScanConditions";

const TF = "1D";
const BARS = 160;
const CONCURRENCY = 3;

export function FvgScanStrip({ symbols, onOpenSymbol }: { symbols: readonly string[]; onOpenSymbol?: (symbol: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [readings, setReadings] = useState<readonly FvgScanReading[]>([]);
  const [only, setOnly] = useState<FvgScanCondition | FvgConvergenceCondition | "ALL">("ALL");

  const run = async () => {
    setRunning(true);
    const out: FvgScanReading[] = [];
    const queue = [...symbols];
    const worker = async () => {
      for (let s = queue.shift(); s !== undefined; s = queue.shift()) {
        const nowMs = Date.now();
        const fetch = await fetchFvgBars({ symbol: s, timeframe: TF, bars: BARS, nowMs });
        out.push(fvgScanConditions({ symbol: s, timeframe: TF, fetch, nowMs }));
        setReadings([...out]);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  };

  const cov = fvgScanCoverage(readings);
  const isConv = (c: string): c is FvgConvergenceCondition => (FVG_CONVERGENCE_CONDITIONS as readonly string[]).includes(c);
  const hits = isConv(only) ? [] : readings.flatMap(r => (r.status === "READ" ? r.hits : [])).filter(h => only === "ALL" || h.condition === only);
  const conv = readings.flatMap(r => (r.status === "READ" ? r.convergence : [])).filter(h => only === "ALL" || h.condition === only);
  const label = (c: FvgScanCondition | FvgConvergenceCondition) => (isConv(c) ? FVG_CONVERGENCE_LABEL[c] : FVG_SCAN_CONDITION_LABEL[c]);
  const refused = readings.filter((r): r is Extract<FvgScanReading, { status: "REFUSED" }> => r.status === "REFUSED");

  return (
    <div className="shrink-0 border-b border-wm-border bg-wm-dark/60" data-testid="scanner-fvg">
      <div className="flex flex-wrap items-center gap-2 px-4 py-1.5">
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className={clsx("wm-tap px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
            open ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
          FVG conditions
        </button>
        {open && (
          <>
            <button onClick={() => { void run(); }} disabled={running} data-testid="scanner-fvg-run"
              className="wm-tap px-2.5 py-1 rounded-lg text-[10px] font-bold border border-wm-blue/40 bg-wm-blue/10 text-wm-blue disabled:opacity-40">
              {running ? `Reading… ${readings.length} of ${symbols.length}` : readings.length ? "Read again" : `Read ${symbols.length} symbols (daily, closed bars)`}
            </button>
            <div className="flex flex-wrap gap-1" role="group" aria-label="FVG condition">
              {(["ALL", ...FVG_SCAN_CONDITIONS, ...FVG_CONVERGENCE_CONDITIONS] as const).map(c => (
                <button key={c} onClick={() => setOnly(c)} aria-pressed={only === c}
                  className={clsx("wm-tap px-2 py-0.5 rounded text-[10px] border",
                    only === c ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-transparent hover:border-wm-border")}>
                  {c === "ALL" ? "All" : label(c)}
                </button>
              ))}
            </div>
            {readings.length > 0 && (
              <span data-testid="scanner-fvg-coverage" className="text-[10px] text-wm-text-dim">
                read {cov.read} of {cov.of} symbols · {cov.refused} refused · definition FVG_3C v1 · observed lifecycle facts, not signals
              </span>
            )}
          </>
        )}
      </div>
      {open && readings.length > 0 && (
        <div className="px-4 pb-2 max-h-56 overflow-y-auto">
          {hits.length === 0 && conv.length === 0 ? (
            <p className="text-[11px] text-wm-text-muted py-1">
              {only === "ALL" ? "No FVG condition on the newest closed daily bar among the symbols read." : `No "${label(only)}" on the newest closed daily bar among the symbols read.`}
            </p>
          ) : (
            <ul className="divide-y divide-wm-border/30">
              {hits.map(h => (
                <li key={`${h.condition}:${h.objectId}`}>
                  <button onClick={() => { onOpenSymbol?.(h.symbol); router.push(h.href); }} data-testid="scanner-fvg-hit"
                    className="wm-tap w-full flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5 text-left text-[11px] hover:bg-wm-surface/40">
                    <span className="font-bold text-wm-text w-16">{h.symbol}</span>
                    <span className="text-wm-gold">{FVG_SCAN_CONDITION_LABEL[h.condition]}</span>
                    <span className={h.direction === "BULLISH" ? "text-wm-green" : "text-wm-red"}>{h.direction.toLowerCase()}</span>
                    <span className="font-mono text-wm-text-muted">{h.bottom.toFixed(h.priceDp)} – {h.top.toFixed(h.priceDp)}</span>
                    <span className="text-wm-text-dim">{h.state.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="ml-auto text-wm-blue">Open on the chart →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {conv.length > 0 && (
            <ul className="mt-1 divide-y divide-wm-border/30" data-testid="scanner-fvg-convergence">
              {conv.map(h => (
                <li key={`${h.condition}:${h.objectId}`}>
                  <button onClick={() => { onOpenSymbol?.(h.symbol); router.push(h.href); }} data-testid="scanner-fvg-convergence-hit"
                    className="wm-tap w-full text-left py-1.5 text-[11px] hover:bg-wm-surface/40">
                    <span className="flex flex-wrap items-center gap-x-3">
                      <span className="font-bold text-wm-text w-16">{h.symbol}</span>
                      <span className="text-wm-gold">{FVG_CONVERGENCE_LABEL[h.condition]}</span>
                      <span className="text-wm-text-dim">with {h.with.map(c => FVG_SCAN_CONDITION_LABEL[c].toLowerCase()).join(", ")}</span>
                      <span className="font-mono text-wm-text-muted">{h.bottom.toFixed(h.priceDp)} – {h.top.toFixed(h.priceDp)}</span>
                      <span className="ml-auto text-wm-blue">Open on the chart →</span>
                    </span>
                    {h.relationships.map(line => <span key={line} className="block pl-16 text-[10px] text-wm-text-dim">{line}</span>)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {refused.length > 0 && (
            <details className="mt-1">
              <summary className="text-[10px] text-wm-text-dim cursor-pointer">{refused.length} symbols not read — why</summary>
              <ul className="mt-1 space-y-0.5">
                {refused.map(r => (
                  <li key={r.symbol} className="text-[10px] text-wm-text-dim"><span className="font-bold text-wm-text-muted">{r.symbol}</span> — {r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
