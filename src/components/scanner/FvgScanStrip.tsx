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

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { fetchFvgBars } from "@/lib/marketData/fvg/fvgBarSource";
import {
  FVG_CONVERGENCE_CONDITIONS,
  FVG_SCAN_FEED_NOTE,
  FVG_SCAN_ORDER_FLOW_UNAVAILABLE,
  FVG_CONVERGENCE_LABEL,
  FVG_SCAN_CONDITIONS,
  FVG_SCAN_CONDITION_LABEL,
  fvgScanConditions,
  fvgScanCoverage,
  type FvgConvergenceCondition,
  type FvgScanCondition,
  type FvgScanReading,
} from "@/lib/scanner/fvgScanConditions";
import { fvgScanUniverses, type FvgScanUniverseId } from "@/lib/scanner/fvgScanUniverse";
import { loadFvgScanWalls } from "@/lib/scanner/fvgScanWalls";
import { readStoredActiveWatchlist } from "@/lib/watchlist/activeWatchlist";
import { proofFixtureScene } from "@/lib/chart/proofScene";
import { useAuth } from "@/contexts/AuthContext";
import { SCANNER_FIXTURE_BANNER, SCANNER_FIXTURE_LINE, SCANNER_FIXTURE_SYMBOLS, SCANNER_FIXTURE_WALLS, scannerFixtureBars, scannerFixtureLabel } from "@/lib/scanner/scannerFixture";

const TF = "1D";
const BARS = 160;
const CONCURRENCY = 3;

export function FvgScanStrip({ symbols: fixedSymbols, onOpenSymbol }: { symbols: readonly string[]; onOpenSymbol?: (symbol: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // WHICH LIST (2026-10-08): WM's fixed list, named with its date — or the
  // trader's own stored watchlist, read (never written) through its one owner
  // each time the strip opens.
  const [want, setWant] = useState<FvgScanUniverseId>("FIXED");
  const [watchlist, setWatchlist] = useState<{ name: string; symbols: string[] } | null>(null);
  // PROOF SCENE (scene=scanner-fixture, signed-in only): SAMPLE bar sets go
  // through the real engine in place of the bar fetch. Read from the address
  // after mount; nothing is stored, fetched or sent, and no chart door is offered.
  const { user } = useAuth();
  const [sceneAsked, setSceneAsked] = useState(false);
  useEffect(() => { setSceneAsked(proofFixtureScene(window.location.search) === "scanner-fixture"); }, []);
  const fixture = sceneAsked && !!user;
  useEffect(() => { if (fixture) setOpen(true); }, [fixture]);
  useEffect(() => {
    if (!open || fixture) return;
    try { setWatchlist(readStoredActiveWatchlist(window.localStorage)); } catch { setWatchlist(null); }
  }, [open, fixture]);
  const real = fvgScanUniverses({ fixed: fixedSymbols, watchlist, want });
  const sample = { id: "FIXED" as const, label: "SAMPLE list", line: SCANNER_FIXTURE_LINE, symbols: SCANNER_FIXTURE_SYMBOLS as readonly string[] };
  const { options: universes, active: universe } = fixture ? { options: [sample], active: sample } : real;
  const symbols = universe.symbols;
  const [running, setRunning] = useState(false);
  const [readings, setReadings] = useState<readonly FvgScanReading[]>([]);
  const [only, setOnly] = useState<FvgScanCondition | FvgConvergenceCondition | "ALL">("ALL");

  // §58: a read in flight stops with the strip — no state set after unmount.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const run = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    const out: FvgScanReading[] = [];
    const queue = [...symbols];
    const worker = async () => {
      for (let s = queue.shift(); s !== undefined && !ac.signal.aborted; s = queue.shift()) {
        const nowMs = Date.now();
        const fetch = fixture ? scannerFixtureBars(s, nowMs) : await fetchFvgBars({ symbol: s, timeframe: TF, bars: BARS, nowMs, signal: ac.signal });
        if (ac.signal.aborted) return;
        let reading = fvgScanConditions({ symbol: s, timeframe: TF, fetch, nowMs });
        // §39 FVG + options wall: the chain is asked for only when this symbol met a condition.
        if (reading.status === "READ" && reading.hits.length && fetch.ok) {
          const walls = fixture ? SCANNER_FIXTURE_WALLS : await loadFvgScanWalls({ symbol: s, bars: fetch.bars, nowMs, signal: ac.signal });
          if (ac.signal.aborted) return;
          reading = fvgScanConditions({ symbol: s, timeframe: TF, fetch, nowMs, walls });
        }
        out.push(reading);
        setReadings([...out]);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (!ac.signal.aborted) setRunning(false);
  };

  // A result belongs to the list it was read from: changing the list clears it.
  const chooseUniverse = (id: FvgScanUniverseId) => {
    if (id === universe.id) return;
    abortRef.current?.abort();
    setRunning(false);
    setReadings([]);
    setWant(id);
  };

  const cov = fvgScanCoverage(readings);
  // Whose bars, as of which bar — per symbol (two feeds are two truths; each names itself).
  const feedOf = new Map(readings.flatMap(r => (r.status === "READ" ? [[r.symbol, r.feed] as const] : [])));
  const barDay = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(new Date(ms));
  const feedWords = (symbol: string) => {
    const f = feedOf.get(symbol);
    return f ? `${f.label}${f.fidelity ? ` (${f.fidelity.toLowerCase()})` : ""} · as of the ${barDay(f.barOpenMs)} bar` : null;
  };
  const isConv = (c: string): c is FvgConvergenceCondition => (FVG_CONVERGENCE_CONDITIONS as readonly string[]).includes(c);
  const hits = isConv(only) ? [] : readings.flatMap(r => (r.status === "READ" ? r.hits : [])).filter(h => only === "ALL" || h.condition === only);
  const conv = readings.flatMap(r => (r.status === "READ" ? r.convergence : [])).filter(h => only === "ALL" || h.condition === only);
  const label = (c: FvgScanCondition | FvgConvergenceCondition) => (isConv(c) ? FVG_CONVERGENCE_LABEL[c] : FVG_SCAN_CONDITION_LABEL[c]);
  const refused = readings.filter((r): r is Extract<FvgScanReading, { status: "REFUSED" }> => r.status === "REFUSED");
  // A sample symbol is printed by its label (the spot-FX-shaped sample is never shown as the bare pair).
  const shown = (sym: string) => (fixture ? scannerFixtureLabel(sym) : sym);
  // §39: evidence conditions that could not be read, per symbol, with the reason — never silently absent.
  const unavailable = readings.flatMap(r => (r.status === "READ" ? r.unavailable.map(u => ({ ...u, symbol: r.symbol })) : []));
  const wallUnavailable = unavailable.filter(u => u.condition === "FVG_PLUS_WALL");
  const flowUnavailable = unavailable.filter(u => u.condition === "FVG_PLUS_ORDER_FLOW");
  const showWall = only === "ALL" || only === "FVG_PLUS_WALL";
  const showFlow = only === "ALL" || only === "FVG_PLUS_ORDER_FLOW";
  const effortUnavailable = unavailable.filter(u => u.condition === "FVG_PLUS_EFFORT");
  const showEffort = only === "ALL" || only === "FVG_PLUS_EFFORT";

  return (
    <div className="shrink-0 border-b border-wm-border bg-wm-dark/60" data-testid="scanner-fvg" data-proof-scene={fixture ? "scanner-fixture" : undefined}>
      {fixture ? (
        <div role="status" data-testid="scanner-proof-banner" className="mx-4 mt-1.5 rounded-lg border border-wm-gold/60 bg-wm-gold/10 px-3 py-1.5 text-[11px] font-black tracking-wider text-wm-gold">
          {SCANNER_FIXTURE_BANNER}
          <span className="block text-[10px] font-normal tracking-normal text-wm-text-muted">The FVG conditions strip below reads four synthetic symbols. The rest of this page is your real scanner.</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 px-4 py-1.5">
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className={clsx("wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
            open ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
          FVG conditions
        </button>
        {open && (
          <>
            <button onClick={() => { void run(); }} disabled={running} data-testid="scanner-fvg-run"
              className="wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold px-2.5 py-1 rounded-lg text-[10px] font-bold border border-wm-blue/40 bg-wm-blue/10 text-wm-blue disabled:opacity-40">
              {running ? `Reading… ${readings.length} of ${symbols.length}` : readings.length ? "Read again" : `Read ${symbols.length} symbols (daily, closed bars)`}
            </button>
            <div className="flex flex-wrap gap-1" role="group" aria-label="FVG condition">
              {(["ALL", ...FVG_SCAN_CONDITIONS, ...FVG_CONVERGENCE_CONDITIONS] as const).map(c => (
                <button key={c} onClick={() => setOnly(c)} aria-pressed={only === c}
                  className={clsx("wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold px-2 py-0.5 rounded text-[10px] border",
                    only === c ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "text-wm-text-muted border-transparent hover:border-wm-border")}>
                  {c === "ALL" ? "All" : label(c)}
                </button>
              ))}
            </div>
            {universes.length > 1 && (
              <div className="flex flex-wrap gap-1" role="group" aria-label="Symbols to read">
                {universes.map(u => (
                  <button key={u.id} onClick={() => chooseUniverse(u.id)} aria-pressed={universe.id === u.id} data-testid={`scanner-fvg-universe-${u.id.toLowerCase()}`}
                    className={clsx("wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold px-2 py-0.5 rounded text-[10px] border",
                      universe.id === u.id ? "bg-wm-blue/10 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
                    {u.label}
                  </button>
                ))}
              </div>
            )}
            <span data-testid="scanner-fvg-universe" className="basis-full text-[10px] text-wm-text-dim">{universe.line}</span>
            {readings.length > 0 && (
              <span data-testid="scanner-fvg-coverage" role="status" className="text-[10px] text-wm-text-dim">
                read {cov.read} of {cov.of} symbols · {cov.refused} refused · definition FVG_3C v1 · observed lifecycle facts, not signals · each row names the bars it read — {FVG_SCAN_FEED_NOTE}
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
                  <button onClick={() => { if (fixture) return; onOpenSymbol?.(h.symbol); router.push(h.href); }} disabled={fixture} data-testid="scanner-fvg-hit"
                    className="wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold w-full flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5 text-left text-[11px] hover:bg-wm-surface/40">
                    <span className={fixture ? "font-bold text-wm-text" : "font-bold text-wm-text w-16"}>{shown(h.symbol)}</span>
                    <span className="text-wm-gold">{FVG_SCAN_CONDITION_LABEL[h.condition]}</span>
                    <span className={h.direction === "BULLISH" ? "text-wm-green" : "text-wm-red"}>{h.direction.toLowerCase()}</span>
                    <span className="font-mono text-wm-text-muted">{h.bottom.toFixed(h.priceDp)} – {h.top.toFixed(h.priceDp)}</span>
                    <span className="text-wm-text-dim">{h.state.replace(/_/g, " ").toLowerCase()}</span>
                    {feedWords(h.symbol) ? <span data-testid="scanner-fvg-feed" className="text-[10px] text-wm-text-dim">{feedWords(h.symbol)}</span> : null}
                    <span className="ml-auto text-wm-blue">{fixture ? "Sample — no chart" : "Open on the chart →"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {conv.length > 0 && (
            <ul className="mt-1 divide-y divide-wm-border/30" data-testid="scanner-fvg-convergence">
              {conv.map(h => (
                <li key={`${h.condition}:${h.objectId}`}>
                  <button onClick={() => { if (fixture) return; onOpenSymbol?.(h.symbol); router.push(h.href); }} disabled={fixture} data-testid="scanner-fvg-convergence-hit"
                    className="wm-tap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold w-full text-left py-1.5 text-[11px] hover:bg-wm-surface/40">
                    <span className="flex flex-wrap items-center gap-x-3">
                      <span className={fixture ? "font-bold text-wm-text" : "font-bold text-wm-text w-16"}>{shown(h.symbol)}</span>
                      <span className="text-wm-gold">{FVG_CONVERGENCE_LABEL[h.condition]}</span>
                      <span className="text-wm-text-dim">with {h.with.map(c => FVG_SCAN_CONDITION_LABEL[c].toLowerCase()).join(", ")}</span>
                      <span className="font-mono text-wm-text-muted">{h.bottom.toFixed(h.priceDp)} – {h.top.toFixed(h.priceDp)}</span>
                      <span className="ml-auto text-wm-blue">{fixture ? "Sample — no chart" : "Open on the chart →"}</span>
                    </span>
                    {h.relationships.map(line => <span key={line} className="block pl-16 text-[10px] text-wm-text-dim">{line}</span>)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showFlow && flowUnavailable.length > 0 && (
            <p data-testid="scanner-fvg-unavailable-flow" className="mt-1 text-[10px] text-wm-text-dim">
              <span className="font-bold text-wm-text-muted">{FVG_CONVERGENCE_LABEL.FVG_PLUS_ORDER_FLOW}: UNAVAILABLE</span> for the {flowUnavailable.length} symbol{flowUnavailable.length === 1 ? "" : "s"} with a condition — {FVG_SCAN_ORDER_FLOW_UNAVAILABLE}.
            </p>
          )}
          {showEffort && effortUnavailable.length > 0 && (
            <details className="mt-1" data-testid="scanner-fvg-unavailable-effort">
              <summary className="text-[10px] text-wm-text-dim cursor-pointer">{FVG_CONVERGENCE_LABEL.FVG_PLUS_EFFORT}: UNAVAILABLE for {effortUnavailable.length} symbol{effortUnavailable.length === 1 ? "" : "s"} with a condition — why</summary>
              <ul className="mt-1 space-y-0.5">
                {effortUnavailable.map(u => (
                  <li key={u.symbol} className="text-[10px] text-wm-text-dim"><span className="font-bold text-wm-text-muted">{shown(u.symbol)}</span> — {u.reason}</li>
                ))}
              </ul>
            </details>
          )}
          {showWall && wallUnavailable.length > 0 && (
            <details className="mt-1" data-testid="scanner-fvg-unavailable-wall">
              <summary className="text-[10px] text-wm-text-dim cursor-pointer">{FVG_CONVERGENCE_LABEL.FVG_PLUS_WALL}: UNAVAILABLE for {wallUnavailable.length} of the {readings.filter(r => r.status === "READ" && r.hits.length).length} symbols with a condition — why</summary>
              <ul className="mt-1 space-y-0.5">
                {wallUnavailable.map(u => (
                  <li key={u.symbol} className="text-[10px] text-wm-text-dim"><span className="font-bold text-wm-text-muted">{shown(u.symbol)}</span> — {u.reason}</li>
                ))}
              </ul>
            </details>
          )}
          {refused.length > 0 && (
            <details className="mt-1">
              <summary className="text-[10px] text-wm-text-dim cursor-pointer">{refused.length} symbols not read — why</summary>
              <ul className="mt-1 space-y-0.5">
                {refused.map(r => (
                  <li key={r.symbol} className="text-[10px] text-wm-text-dim"><span className="font-bold text-wm-text-muted">{shown(r.symbol)}</span> — {r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
