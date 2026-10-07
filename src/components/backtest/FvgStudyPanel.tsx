"use client";

/**
 * BACKTEST LAB — FVG STUDY (Garden 19 §20–§21).
 *
 * The room's view of `runFvgStudy`: the ONE engine's gaps on this backtest's
 * bar history, read as of a clock the trader can step back (no future leak),
 * tallied by the ONE descriptive tally. Every number prints its count / of;
 * the block is labelled DESCRIPTIVE EVIDENCE and names the definition id and
 * version it was read under. Nothing here predicts, grades or says a gap
 * "has to" fill.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { SymbolSearch } from "@/components/ui/SymbolSearch";
import { displayPrecisionFor } from "@/lib/chart/pricePrecision";
import { fetchFvgBars } from "@/lib/marketData/fvg/fvgBarSource";
import { fvgChartHref } from "@/lib/marketData/fvg/fvgChartLink";
import { FVG_HORIZONS } from "@/lib/marketData/fvg/fvgDefinition";
import type { FvgOutcomeStats } from "@/lib/marketData/fvg/fvgStats";
import {
  FVG_DISPLACEMENT_BAND_LABEL,
  fvgDurationText,
  fvgMedianText,
  fvgShareText,
  fvgStudyClockAt,
  runFvgStudy,
  type FvgStudyFacet,
  type FvgStudyFilters,
  type FvgStudySeries,
} from "@/lib/backtest/fvgStudy";

const HORIZON_LABEL: Record<(typeof FVG_HORIZONS)[number], string> = {
  IMMEDIATE: "Within 3 bars, same session",
  SAME_SESSION: "Later the same session",
  NEXT_SESSION: "Next session",
  LATER_SESSION: "2–4 sessions later",
  MULTI_DAY: "5+ sessions later",
  STILL_OPEN_WITHIN_HORIZON: "Not revisited (as of the reading)",
  SESSION_UNKNOWN: "Revisited, session not known",
};

const FACET_LABEL: Record<FvgStudyFacet, string> = {
  instrument: "Instrument",
  timeframe: "Timeframe",
  session: "Session",
  regime: "Regime",
  direction: "Direction",
  displacement: "Displacement context",
  crossesSession: "Opening gap",
  structure: "Structure (swing broken / reclaimed / inside)",
  profile: "Prior-range profile level at the gap",
};

const FILTER_FACETS: readonly FvgStudyFacet[] = ["instrument", "timeframe", "session", "regime", "direction", "displacement", "crossesSession", "structure", "profile"];

const RELATIONSHIP_VALUE_LABEL: Readonly<Record<string, string>> = {
  WITH_STRUCTURE: "With a structure relationship",
  NO_STRUCTURE: "No structure relationship",
  WITH_PROFILE: "POC / VAH / VAL inside or near",
  NO_PROFILE: "No profile level at the gap",
};

/** Session-window keys (lib/marketData/sessionWindow) in a trader's words.
 *  The keys stay the filter values; only the printed label changes. */
const SESSION_VALUE_LABEL: Readonly<Record<string, string>> = {
  US_EQUITY_RTH: "US regular hours",
  US_EQUITY_ETH: "US extended hours",
  GLOBEX_DAY: "CME Globex day (18:00–17:00 ET)",
  CBOT_GRAINS_DAY: "CBOT grains day",
  CME_LIVESTOCK_DAY: "CME livestock day",
  FX_DAY: "FX day (rolls 17:00 ET)",
  CONTINUOUS_ET_DAY: "Continuous market · ET calendar day",
  CRYPTO_UTC_DAY: "Crypto · UTC calendar day",
  DAILY_WINDOW: "Daily bars",
  NO_CLOCK: "No session clock",
};
const REGIME_VALUE_LABEL: Readonly<Record<string, string>> = { UNTAGGED: "Not tagged (no tape on these bars)" };

export function facetValueLabel(facet: FvgStudyFacet, v: string): string {
  if (facet === "session") return SESSION_VALUE_LABEL[v] ?? v;
  if (facet === "regime") return REGIME_VALUE_LABEL[v] ?? v;
  if (facet === "displacement") return FVG_DISPLACEMENT_BAND_LABEL[v as keyof typeof FVG_DISPLACEMENT_BAND_LABEL] ?? v;
  if (facet === "crossesSession") return v === "CROSSES_SESSION" ? "Crosses a session boundary" : "Within one session";
  if (facet === "structure" || facet === "profile") return RELATIONSHIP_VALUE_LABEL[v] ?? v;
  return v;
}

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 border-b border-wm-border/30" data-testid={testId}>
      <span className="text-[11px] text-wm-text-muted">{label}</span>
      <span className="text-[11px] font-mono text-wm-text text-right">{value}</span>
    </div>
  );
}

function StatsBlock({ s }: { s: FvgOutcomeStats }) {
  const touched = s.touched.count;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
      <div>
        <Row label="Gaps counted" value={`${s.detected} (${s.bullish} bullish · ${s.bearish} bearish)`} testId="fvg-study-detected" />
        <Row label="Revisited (touched)" value={fvgShareText(s.touched)} testId="fvg-study-touched" />
        {FVG_HORIZONS.map(h => (
          <Row key={h} label={`· ${HORIZON_LABEL[h]}`} value={fvgShareText(s.revisitByHorizon[h])} />
        ))}
        <Row label="Time to first touch" value={fvgMedianText(s.medianBarsToFirstTouch, touched, "bars")} />
        <Row label="Time to first touch (clock)" value={fvgDurationText(s.medianMsToFirstTouch) ? `${fvgDurationText(s.medianMsToFirstTouch)} (median of ${touched})` : `none touched (0 of ${s.detected})`} />
      </div>
      <div>
        <Row label="Deepest reach · partial (<50%)" value={fvgShareText(s.partialMitigation)} />
        <Row label="Deepest reach · deep (50–99%)" value={fvgShareText(s.deepMitigation)} />
        <Row label="Deepest reach · full (100%)" value={fvgShareText(s.fullMitigation)} />
        <Row label="Rejected after a touch" value={fvgShareText(s.rejectionAfterTouch)} />
        <Row label="Accepted inside" value={fvgShareText(s.acceptance)} />
        <Row label="Closed through the far edge" value={fvgShareText(s.tradeThrough)} />
        <Row label="Still open" value={fvgShareText(s.stillOpen)} testId="fvg-study-still-open" />
        <Row label={`· of those, younger than ${s.stillOpenYoungerThan.bars} bars (too young to judge)`} value={`${s.stillOpenYoungerThan.count} of ${s.stillOpen.count}`} />
        <Row label="Average deepest penetration" value={s.avgMaxPenetration === null ? `none touched (0 of ${s.detected})` : `${Math.round(s.avgMaxPenetration * 100)}% of size (mean of ${touched})`} />
        <Row label="Post-touch move away (ATR)" value={s.avgPostTouchDisplacementAtr === null ? `no complete window (0 of ${touched})` : `${s.avgPostTouchDisplacementAtr.toFixed(2)}× ATR (mean of ${s.postTouchDisplacementSample} of ${touched})`} />
      </div>
    </div>
  );
}

interface PoolEntry { readonly key: string; readonly series: FvgStudySeries; readonly unpaired: number; readonly forming: number; readonly provenance: string | null }

export function FvgStudyPanel({ symbol, timeframe, rangeDays, timeframes, onSymbolChange, onTimeframeChange }: {
  symbol: string;
  timeframe: string;
  rangeDays: number;
  /** The room's shipped timeframes (the same list the Backtest tab offers). */
  timeframes: readonly string[];
  onSymbolChange: (s: string) => void;
  onTimeframeChange: (tf: string) => void;
}) {
  const [pool, setPool] = useState<readonly PoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [filters, setFilters] = useState<FvgStudyFilters>({});
  const [splitBy, setSplitBy] = useState<FvgStudyFacet>("direction");
  // The study clock, as a bar index into the first series (null = its newest closed bar).
  const [stepIdx, setStepIdx] = useState<number | null>(null);

  // §58: a read in flight stops with the panel — no state set after unmount.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setRefusal(null);
    const r = await fetchFvgBars({ symbol, timeframe, bars: 3000, nowMs: Date.now(), signal: ac.signal });
    if (ac.signal.aborted) return;
    setLoading(false);
    if (!r.ok) { setRefusal(r.reason); return; }
    if (r.bars.length < 20) { setRefusal(`Only ${r.bars.length} closed ${timeframe} bars for ${symbol} — ATR(14) needs more history before any gap can be read.`); return; }
    const key = `${symbol}|${timeframe}`;
    const entry: PoolEntry = { key, series: { symbolId: symbol, timeframe, bars: r.bars }, unpaired: r.unpaired, forming: r.forming, provenance: r.provenance };
    setPool(p => [...p.filter(e => e.key !== key), entry]);
    setStepIdx(null);
  };

  const first = pool[0]?.series ?? null;
  const lastIdx = first ? first.bars.length - 1 : 0;
  const clockMs = useMemo(() => {
    if (!pool.length) return null;
    if (stepIdx !== null && first) return fvgStudyClockAt(first, stepIdx);
    return Math.max(...pool.map(e => fvgStudyClockAt(e.series, e.series.bars.length - 1) ?? 0));
  }, [pool, stepIdx, first]);

  const study = useMemo(() => {
    if (!pool.length || clockMs === null) return null;
    const fromMs = clockMs - rangeDays * 86_400_000;
    return runFvgStudy({ series: pool.map(e => e.series), asOfMs: clockMs, fromMs, filters });
  }, [pool, clockMs, rangeDays, filters]);

  // How far back the bars actually held reach, at the study clock (days).
  const heldDays = useMemo(() => {
    if (!pool.length || clockMs === null) return null;
    const starts = pool.map(e => fvgStudyClockAt(e.series, 0)).filter((v): v is number => v != null);
    return starts.length ? Math.max(0, (clockMs - Math.min(...starts)) / 86_400_000) : null;
  }, [pool, clockMs]);

  const dpBySymbol = useMemo(() => new Map(pool.map(e => [e.series.symbolId, displayPrecisionFor(e.series.symbolId, e.series.bars)])), [pool]);
  const recent = study ? [...study.objects].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8) : [];

  return (
    <div className="p-4 max-w-5xl mx-auto" data-testid="fvg-study">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-sm font-black text-wm-text">FVG Study</h2>
        <span data-testid="fvg-study-label" className="text-[9px] font-black px-1.5 py-0.5 rounded border border-wm-gold/40 text-wm-gold">
          DESCRIPTIVE EVIDENCE · NOT A PREDICTION
        </span>
        {study && (
          <span data-testid="fvg-study-definition" className="text-[10px] font-mono text-wm-text-dim">
            definition {study.definition.id} v{study.definition.version}
          </span>
        )}
      </div>
      <p className="text-[11px] text-wm-text-dim mb-3 leading-relaxed">
        Counts of what past fair value gaps on {symbol} {timeframe} actually did — every share is shown with its count and denominator.
        No gap has to fill; this is a record of the past, read only from bars that had closed by the study clock.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div className="w-full sm:w-56">
          <span className="text-[10px] text-wm-text-dim uppercase tracking-wider block mb-1">Symbol</span>
          <SymbolSearch value={symbol} onChange={s => s && onSymbolChange(s)} placeholder="Search any symbol…" />
        </div>
        <label className="flex flex-col text-[10px] text-wm-text-dim uppercase tracking-wider">
          Timeframe
          <select value={timeframe} onChange={e => onTimeframeChange(e.target.value)} data-testid="fvg-study-tf"
            className="wm-tap mt-1 bg-wm-surface border border-wm-border rounded px-2 py-1.5 text-xs text-wm-text normal-case">
            {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button onClick={load} disabled={loading} data-testid="fvg-study-run"
          className="wm-tap px-3 py-2 rounded-lg text-xs font-bold border border-wm-blue/40 bg-wm-blue/10 text-wm-blue disabled:opacity-40">
          {loading ? "Reading bars…" : pool.some(e => e.key === `${symbol}|${timeframe}`) ? `Re-read ${symbol} ${timeframe}` : `Add ${symbol} ${timeframe} to the study`}
        </button>
        {pool.map(e => (
          <span key={e.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-wm-border text-wm-text-muted">
            {e.key.replace("|", " ")} · {e.series.bars.length} closed bars{e.unpaired ? ` · ${e.unpaired} refused (no identity)` : ""}
            <button aria-label={`Remove ${e.key.replace("|", " ")} from the study`} onClick={() => { setPool(p => p.filter(x => x.key !== e.key)); setStepIdx(null); }}
              className="wm-tap ml-1 text-wm-text-dim hover:text-wm-text">×</button>
          </span>
        ))}
      </div>

      {refusal && (
        <p data-testid="fvg-study-refusal" className="mb-4 text-[11px] text-wm-gold">Nothing was studied: {refusal}</p>
      )}

      {!study && !refusal && (
        <p className="text-xs text-wm-text-muted">Add a symbol and timeframe to read its gaps. Several can be pooled and split by instrument or timeframe.</p>
      )}

      {study && first && (
        <>
          <div className="glass rounded-xl p-3 mb-4">
            <label htmlFor="fvg-study-clock" className="text-[10px] text-wm-text-dim uppercase tracking-wider block mb-1">
              Study clock — step back to read the gaps exactly as they stood then
            </label>
            <input id="fvg-study-clock" type="range" min={20} max={lastIdx} value={stepIdx ?? lastIdx}
              onChange={e => setStepIdx(Number(e.target.value) >= lastIdx ? null : Number(e.target.value))}
              className="w-full" data-testid="fvg-study-clock" />
            <div className="text-[10px] font-mono text-wm-text-muted mt-1">
              as of {new Date(study.asOfMs).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })} · bar {(stepIdx ?? lastIdx) + 1} of {lastIdx + 1}
              {stepIdx !== null ? " · later bars are not read" : " · newest closed bar"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Filters">
            {FILTER_FACETS.map(f => (
              <label key={f} className="flex flex-col text-[10px] text-wm-text-dim">
                {FACET_LABEL[f]}
                <select value={(filters[f as keyof FvgStudyFilters] as string | undefined) ?? "ALL"}
                  onChange={e => setFilters(prev => ({ ...prev, [f]: e.target.value }))}
                  className="wm-tap mt-0.5 bg-wm-surface border border-wm-border rounded px-1.5 py-1 text-[11px] text-wm-text">
                  <option value="ALL">All ({study.detectedInWindow})</option>
                  {study.facets[f].map(v => (
                    <option key={v.value} value={v.value}>{facetValueLabel(f, v.value)} ({v.count})</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {study.regimeNote && <p className="text-[10px] text-wm-text-dim mb-3">{study.regimeNote}</p>}
          <p className="text-[10px] text-wm-text-dim mb-3" data-testid="fvg-study-relationship-note">
            Relationship filters read only bars from before each gap formed: structure = a confirmed swing it broke, reclaimed or contains;
            profile = a POC / VAH / VAL of the range profile of the 100 bars before it (candle-estimated, PARTIAL). Options and liquidity walls
            need a chain or a book, which historical bars do not carry, so they are not a filter here.
          </p>

          <div className="glass rounded-xl p-4 mb-4">
            <div className="text-xs font-bold text-wm-text mb-1">
              {study.filtered} of {study.detectedInWindow} gaps in the last {rangeDays} days pass the filters
              {/* Sheriff sweep 2026-10-07: "in the last 90 days" over 1024 closed
                  5m bars (≈3.5 days) implied a quarter of history that was never
                  read. The span the bars actually reach is stated beside it. */}
              {heldDays != null && heldDays < rangeDays ? (
                <span className="font-normal text-wm-text-muted"> — the bars read reach back only {heldDays < 10 ? heldDays.toFixed(1) : Math.round(heldDays)} days</span>
              ) : null}
            </div>
            <StatsBlock s={study.stats} />
          </div>

          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold text-wm-text">Split by</span>
              <select value={splitBy} onChange={e => setSplitBy(e.target.value as FvgStudyFacet)} aria-label="Split by"
                className="wm-tap bg-wm-surface border border-wm-border rounded px-1.5 py-1 text-[11px] text-wm-text">
                {FILTER_FACETS.map(f => <option key={f} value={f}>{FACET_LABEL[f]}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-wm-border">
                    {["Group", "Gaps", "Revisited", "Full reach", "Rejected after touch", "Closed through", "Still open"].map(h => (
                      <th key={h} className="text-left px-2 py-1.5 text-[10px] text-wm-text-muted uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(study.by[splitBy]).map(([k, s]) => (
                    <tr key={k} className="border-b border-wm-border/30">
                      <td className="px-2 py-1.5 text-wm-text">{facetValueLabel(splitBy, k)}</td>
                      <td className="px-2 py-1.5 font-mono">{s.detected}</td>
                      <td className="px-2 py-1.5 font-mono">{fvgShareText(s.touched)}</td>
                      <td className="px-2 py-1.5 font-mono">{fvgShareText(s.fullMitigation)}</td>
                      <td className="px-2 py-1.5 font-mono">{fvgShareText(s.rejectionAfterTouch)}</td>
                      <td className="px-2 py-1.5 font-mono">{fvgShareText(s.tradeThrough)}</td>
                      <td className="px-2 py-1.5 font-mono">{fvgShareText(s.stillOpen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {recent.length > 0 && (
            <div className="glass rounded-xl p-4">
              <div className="text-xs font-bold text-wm-text mb-2">Newest gaps in the study (as of the clock)</div>
              <ul className="space-y-1">
                {recent.map(o => (
                  <li key={o.objectId} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    <span className={clsx("font-bold", o.direction === "BULLISH" ? "text-wm-green" : "text-wm-red")}>{o.direction}</span>
                    <span className="font-mono text-wm-text-muted">{o.bottom.toFixed(dpBySymbol.get(o.symbolId) ?? 2)} – {o.top.toFixed(dpBySymbol.get(o.symbolId) ?? 2)}</span>
                    <span className="text-wm-text-dim">{o.state.replace(/_/g, " ").toLowerCase()}</span>
                    <Link href={fvgChartHref({ symbol: o.symbolId, timeframe: o.timeframe, objectId: o.objectId })}
                      className="wm-tap ml-auto text-wm-blue hover:underline">Open on the chart →</Link>
                    <Link href={`/journal?${new URLSearchParams({ new: "1", symbol: o.symbolId, fvg: o.objectId }).toString()}`}
                      className="wm-tap text-wm-text-muted hover:underline">Journal it</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
