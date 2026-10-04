"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { selectHeatmapFeedObservation } from "@/lib/os/selectHeatmapFeedObservation";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { HEATMAP_TF_ORDER } from "@/lib/timeframes";
import { QualityBadge } from "@/components/ui/DataHealth";
import type { ContextDataState } from "@/lib/marketData/contextDataTruth";
import { useProvenSessionClosure } from "@/lib/marketData/useProvenSessionClosure";
import { readObservedChange, summarizeObservedChange } from "@/lib/heatmapAggregateTruth";
import { WM } from "@/lib/design/wmTokens";
import { heatCellCameraHref } from "@/lib/routing/opportunityMap";
import { ScannerDeckViewSwitch } from "@/components/scanner/ScannerDeckViewSwitch";
import { saveHeatSnapshot } from "@/lib/research/heatArchive";

/**
 * ── WHY THIS IS NO LONGER A ROOM ────────────────────────────────────────────
 *
 * This board used to be `/heatmaps`, its own "Heatmaps" ROOM in the Rooms
 * door. Current authority rejects that shape. The Complete Invention Registry
 * (F14 DISCOVERY / HEAT): "multi-symbol opportunity/discovery heat belongs to
 * scanning/research job, not a live Heatmaps Room". The Command Center's
 * HOUSE PLAN bolt-on: "DO NOT PUT IN ROOMS: … live Heatmaps Room" and
 * "ROOMS BUTTON ≠ HEATMAPS ROOM."
 *
 * So it is now the Scanner Deck's Opportunity Map — the survey-many-
 * instruments job — and a cell opens the EXISTING market camera
 * (`heatCellCameraHref`), never a second market app. `/heatmaps` is an edge
 * alias to this route (`@/lib/legacyRouteAliases`). Every truth law below —
 * feed observation, quality badge, observed-change honesty — moved with it
 * unchanged.
 */

/**
 * ── Why this room's colours moved ────────────────────────────────────────────
 *
 * /heatmaps is an OS-framed room: `MainLayout` mounts it inside
 * `WMExperienceShell`, the near-black / ivory / brass sanctuary. It was
 * nonetheless painted in a private slate-blue palette it minted for itself —
 * #070A0F, #0A0E14, #0D1117, #161B22 surfaces, #1A2030 / #2D3748 borders,
 * #8892A0 / #8B95A5 / #5A6575 / #E8EDF3 text — 39 hex values the design system
 * did not own, against zero references to it. The room did not match the room
 * it was in, which is SCENE_FRAGMENTATION at the material level: the same slate
 * palette just retired from /login was still living in here.
 *
 * `#4FA3E0` was doing something worse. It was not describing data — it was the
 * active-view chip background, the section heading, and the current-price
 * marker. That is an IDENTITY accent, and §9 is explicit that GOLD is identity
 * metal only. A second identity metal in a second room is a second visual
 * brain. It now uses brass, like every other room's identity.
 *
 * ── What deliberately did NOT move ───────────────────────────────────────────
 *
 * Two families of colour survive untouched, because they carry INFORMATION and
 * replacing them would destroy meaning rather than unify style:
 *
 *   1. **The eleven sector hues** (XLK, XLY, XLI, XLE, …). Telling eleven
 *      categories apart genuinely requires hue. Flattening them to brass would
 *      make the map unreadable in exchange for looking tidier.
 *
 *   2. **Direction semantics** — the bull/bear greens and reds. §9 permits
 *      green for DIRECTION; what it forbids is green as a SAFETY claim. These
 *      say "up", not "safe", and the existing green sentinel already draws that
 *      line. Relitigating direction colour is a separate decision with its own
 *      evidence, and it is not smuggled in here.
 *
 * This commit moves CHROME. It changes no number, no threshold, no data path.
 */

/* ═══════════════════════════════════════════════════════════
   DATA MODEL
═══════════════════════════════════════════════════════════ */
import { SECTORS, type Industry } from "@/lib/marketData/sp500Board";

// Only the periods our /api/heatmap endpoint actually supports. Sourced from the
// canonical timeframe module (WM-CHART-P0-01) — the heatmap already used the
// canonical "1D"/"1W"/"1M" form, so emitted values are unchanged by this swap.
const TIMEFRAMES: readonly string[] = HEATMAP_TF_ORDER;
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
  { label: "Financials",   sym: "XLF",  color: WM.gold.mark },
  { label: "Health Care",  sym: "XLV",  color: "#00D4AA" },
  { label: "Cons. Disc.",  sym: "XLY",  color: "#8B5CF6" },
  { label: "Industrials",  sym: "XLI",  color: "#06B6D4" },
  { label: "Energy",       sym: "XLE",  color: "#F97316" },
  { label: "Materials",    sym: "XLB",  color: "#84CC16" },
  { label: "Utilities",    sym: "XLU",  color: "#A78BFA" },
  { label: "Real Estate",  sym: "XLRE", color: "#FB7185" },
  { label: "Cons. Staples",sym: "XLP",  color: "#22D3EE" },
  { label: "Comm. Svcs",   sym: "XLC",  color: "#FCD34D" },
  { label: "SPY",          sym: "SPY",  color: WM.text.hero },
  { label: "QQQ",          sym: "QQQ",  color: "#4FA3E0" },
  { label: "IWM",          sym: "IWM",  color: WM.gold.mark },
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
  const router = useRouter();
  const regimeColor: Record<RegimeState, string> = {
    // BULL/BEAR are DIRECTION and keep their hue (§9 permits it). SIDE is the
    // absence of direction, so it takes the neutral `unknown` slot rather than
    // a third invented colour.
    BULL: "#00A86B", BEAR: "#CC1414", SIDE: WM.state.unknown,
  };
  const regimeBg: Record<RegimeState, string> = {
    BULL: "rgba(0,168,107,0.15)", BEAR: "rgba(204,20,20,0.15)", SIDE: "rgba(45,55,72,0.3)",
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: WM.gold.mark, letterSpacing: 1 }}>MARKOV REGIME PROXY</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["BULL","BEAR","SIDE"] as RegimeState[]).map(r => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: regimeColor[r] }} />
              <span style={{ fontSize: 9, color: WM.text.muted, fontWeight: 700 }}>{r}</span>
            </div>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 9, color: WM.text.muted }}>TF: {tf} · Selected-period observed-return heuristic · Not predictive</span>
      </div>

      {/* Grid of sector cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
        {MARKOV_SECTORS.map(ms => {
          const observedReturn = readObservedChange(pcts, ms.sym);
          const d = observedReturn === null ? null : computeMarkovState(ms.sym, observedReturn);
          return (
            <div key={ms.sym} style={{
              background: d ? regimeBg[d.state] : "rgba(45,55,72,0.18)",
              border: d ? `1px solid ${regimeColor[d.state]}40` : `1px solid ${WM.border.line}`,
              borderRadius: 8, padding: "10px 12px",
              position: "relative",
            }}>
              {/* Market handoff — preserves symbol context per Founder
                  Aug-14 §15 'A trader should not lose context moving between
                  tools.' It lands the ONE market camera (/charts), not the
                  legacy deck: a heat cell selects an instrument; the camera
                  shows it. */}
              <button
                type="button"
                className="wm-markov-deck-action"
                aria-label={`Open ${ms.sym} on the market`}
                title="Open on the market camera"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(heatCellCameraHref(ms.sym));
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  minWidth: 44,
                  minHeight: 44,
                  padding: "8px",
                  fontSize: 9,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: WM.gold.mark,
                  background: "rgba(11,11,13,0.7)",
                  border: "1px solid rgba(139,106,41,0.35)",
                  borderRadius: 3,
                  cursor: "pointer",
                  touchAction: "manipulation",
                  zIndex: 2,
                }}
              >
                Market →
              </button>
              {/* Top row */}
              {/* The Market → door is ~80 px wide; a 52 px reserve let it sit on the
                  regime chip and its word (serving 1568, 2026-10-04). */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, minHeight: 44, paddingRight: 92 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ms.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 900, color: WM.text.hero }}>{ms.sym}</span>
                <span style={{ fontSize: 9, color: WM.text.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ms.label}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {d ? <>
                    <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                    background: regimeColor[d.state], color: WM.text.hero, letterSpacing: 0.5,
                  }}>{d.state}</span>
                  <span style={{ fontSize: 9, color: WM.text.muted }}>{d.vol}</span>
                  </> : <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
                    background: WM.surface.raised, color: WM.text.body, letterSpacing: 0.5,
                  }}>UNKNOWN</span>}
                </div>
              </div>

              {d ? <>
              {/* Probability bars */}
              <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ flex: d.bullP, background: "#00A86B", transition: "flex 0.8s ease" }} />
                <div style={{ flex: d.bearP, background: "#CC1414", transition: "flex 0.8s ease" }} />
                <div style={{ flex: d.sideP, background: WM.surface.raised, transition: "flex 0.8s ease" }} />
              </div>

              {/* Probability labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: "#00A86B", fontWeight: 700 }}>BULL {d.bullP.toFixed(0)}%</span>
                <span style={{ fontSize: 9, color: "#CC1414", fontWeight: 700 }}>BEAR {d.bearP.toFixed(0)}%</span>
                <span style={{ fontSize: 9, color: WM.text.muted, fontWeight: 700 }}>SIDE {d.sideP.toFixed(0)}%</span>
              </div>

              {/* 3x3 Transition matrix mini */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 2, fontSize: 9, fontFamily: "monospace" }}>
                <div style={{ color: WM.text.muted }} />
                {["→BULL","→BEAR","→SIDE"].map(h => (
                  <div key={h} style={{ color: WM.text.muted, textAlign: "center" }}>{h}</div>
                ))}
                {(["BULL","BEAR","SIDE"] as RegimeState[]).map((from, ri) => (
                  <React.Fragment key={from}>
                    <div style={{ color: regimeColor[from], fontWeight: 700 }}>{from[0]}</div>
                    {[0,1,2].map(ci => (
                      <div key={ci} style={{
                        textAlign: "center", fontWeight: 700, padding: "1px 0",
                        color: ci === 0 ? "#00A86B" : ci === 1 ? "#CC1414" : WM.text.muted,
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
                <span style={{ fontSize: 9, color: WM.gold.mark, fontWeight: 700 }}>EDGE {d.edge.toFixed(1)}%</span>
                <span style={{ fontSize: 9, color: WM.text.muted }}>TREND {d.trend}</span>
                <span style={{ fontSize: 9, color: WM.text.body }}>{tf}</span>
              </div>
              </> : <div
                role="status"
                aria-label={`${ms.sym} ${tf} return unavailable; regime scenario not computed`}
                style={{
                  minHeight: 84,
                  display: "grid",
                  placeItems: "center",
                  color: WM.text.muted,
                  fontSize: 10,
                  textAlign: "center",
                }}
              >
                Return unavailable · scenario not computed
              </div>}
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
  // Bin i spans [low + i·step, low + (i+1)·step]; its label is its midpoint.
  // (Until 2026-10-04 the label was `high - i·step` — mirrored: SPY's top row
  // printed 759.66 beside the bin nearest the high, 772.65 at the bottom.)
  const binMid = (i: number) => low + (i + 0.5) * step;
  // Value area: 70 % of the profile's volume, grown out from the POC one bin
  // at a time toward the heavier neighbour — the standard construction.
  const totalVol = vols.reduce((a, v) => a + v, 0);
  let vaLo = pocIdx, vaHi = pocIdx, vaVol = maxVol;
  while (totalVol > 0 && vaVol < totalVol * 0.7 && (vaLo > 0 || vaHi < levels - 1)) {
    const down = vaLo > 0 ? vols[vaLo - 1] : -1;
    const up = vaHi < levels - 1 ? vols[vaHi + 1] : -1;
    if (up >= down) { vaHi++; vaVol += up; } else { vaLo--; vaVol += down; }
  }
  const vah = low + (vaHi + 1) * step, val = low + vaLo * step;
  const where = currentPrice > vah ? "above value" : currentPrice < val ? "below value" : "inside value";

  return (
    <div style={{ background: WM.surface.deep, border: `1px solid ${WM.border.hair}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: WM.text.hero }}>{sym}</span>
        <span style={{ fontSize: 9, color: WM.text.muted }}>{currentPrice ? `$${currentPrice.toFixed(2)}` : "Price not yet observed"}</span>
        {usable.length > 0 && <span style={{ marginLeft: "auto", fontSize: 9, color: WM.gold.mark, fontWeight: 700, fontFamily: "monospace" }}>POC {binMid(pocIdx).toFixed(2)}</span>}
      </div>

      {/* VP bars from top (high) to bottom (low) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {(loading || !usable.length) && (
          <div style={{ minHeight:176, display:"grid", placeItems:"center", fontSize:9, color:WM.text.muted }}>
            {loading ? "Loading observed OHLCV…" : "Observed OHLCV unavailable"}
          </div>
        )}
        {!loading && usable.length > 0 &&
        Array.from({ length: levels }, (_, i) => {
          const revI    = levels - 1 - i;
          const price   = binMid(revI);
          const vol     = vols[revI];
          const widthPct= (vol / maxVol) * 100;
          const isPOC   = revI === pocIdx;
          const isCur   = revI === currentIdx;
          const isAbove = revI > currentIdx;
          const barColor = isPOC ? WM.gold.mark
                         : isAbove ? "rgba(255,77,106,0.55)"
                         : "rgba(0,212,170,0.55)";
          return (
            <div key={revI} style={{ display: "flex", alignItems: "center", gap: 4, height: 10 }}>
              <span style={{ width: 58, fontSize: 9, color: isPOC ? WM.gold.mark : WM.text.muted, textAlign: "right", flexShrink: 0, fontFamily: "monospace" }}>
                {price.toFixed(2)}
              </span>
              <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.03)", borderRadius: 1, overflow: "hidden", position: "relative" }}>
                <div style={{
                  width: `${widthPct}%`, height: "100%",
                  background: barColor,
                  transition: "width 0.6s ease",
                }} />
                {isPOC && <div style={{ position: "absolute", inset: 0, border: `1px solid ${WM.gold.mark}`, borderRadius: 1 }} />}
                {/* Where price actually IS outranks where volume was traded, so
                    the current marker takes the brightest brass and POC the
                    quieter one. Two weights of one metal, not two metals. */}
                {isCur && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 1.5, background: WM.gold.hero }} />}
              </div>
              <span style={{ width: 30, fontSize: 9, color: WM.text.muted, textAlign: "right", flexShrink: 0 }}>
                {vol >= 1_000_000 ? `${(vol/1_000_000).toFixed(1)}m` : vol >= 1_000 ? `${(vol/1_000).toFixed(0)}k` : vol.toFixed(0)}
              </span>
            </div>
          );
        })
        }
      </div>

      {/* Value Area — the card's own reading. The bar-derived caveat is said
          once, in the panel header, not twelve times. */}
      {usable.length > 0 && (
        <div data-testid="vp-value-area" style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 9, color: WM.text.muted, fontFamily: "monospace" }}>
          <span>VA {val.toFixed(2)} – {vah.toFixed(2)}</span>
          <span style={{ marginLeft: "auto", color: where === "inside value" ? WM.text.muted : WM.gold.mark }}>{where}</span>
        </div>
      )}
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
        <span style={{ fontSize: 11, fontWeight: 900, color: WM.gold.mark, letterSpacing: 1 }}>VOLUME PROFILE HEATMAP</span>
        <div style={{ display: "flex", gap: 8, fontSize: 9, color: WM.text.muted }}>
          <span style={{ color: WM.gold.mark }}>▬ POC</span>
          <span style={{ color: "#FF4D6A" }}>■ Above</span>
          <span style={{ color: "#00D4AA" }}>■ Below</span>
          <span style={{ color: WM.gold.hero }}>| Current</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 9, color: WM.text.muted }}>TF: {tf} · bar-derived, not exchange tick profile</span>
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
  // HYDRATION-SAFE: initialize deterministically (empty) so SSR and the
  // first client paint agree. The localStorage cache is folded in by
  // the after-mount effect below. Reading localStorage in the
  // initializer used to cause a React #418 shape mismatch (SSR: no
  // receivedAt → the "received" span is not rendered; client: cache
  // hit → span renders → tree diverges).
  const [pcts, setPcts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  // The PROVIDER'S observation epoch for the round on screen, or null. Held
  // separately from `receivedAt` because that one is receipt chronology and
  // /api/heatmap disclaims it in its own source. Only this may be published
  // upward as `lastObservedAtMs`.
  const [observedAt, setObservedAt] = useState<number | null>(null);
  const [qualityState, setQualityState] = useState<ContextDataState>("UNKNOWN");
  const [fidelityReason, setFidelityReason] = useState("Market-data fidelity has not been established.");
  const [resolvedTf, setResolvedTf] = useState(tf);
  const [retainedSnapshot, setRetainedSnapshot] = useState(false);
  const retainedRowsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HM_CACHE_PREFIX + tf);
      if (!raw) {
        setPcts({});
        retainedRowsRef.current = {};
        setReceivedAt(null);
        setObservedAt(null);
        setQualityState("UNKNOWN");
        setFidelityReason("No retained heat-map data is available.");
        setRetainedSnapshot(false);
        setLoading(true);
        setResolvedTf(tf);
        return;
      }
      const cached = JSON.parse(raw) as { data?: Record<string, number>; ts?: number; observedAt?: number | null };
      const cachedRows = cached.data ?? {};
      setPcts(cachedRows);
      retainedRowsRef.current = cachedRows;
      setReceivedAt(cached.ts ?? null);
      // A retained browser snapshot carries a RECEIPT, not an observation.
      // Reading `cached.ts` into this field would promote transport time to
      // provider time on every reload — the exact swap this field exists to
      // prevent. Until the live refresh answers, the honest value is null.
      setObservedAt(cached.observedAt ?? null);
      setQualityState(Object.keys(cached.data ?? {}).length ? "DEGRADED" : "UNKNOWN");
      setFidelityReason(Object.keys(cached.data ?? {}).length
        ? "Retained browser snapshot; current refresh is not yet confirmed."
        : "No retained heat-map data is available.");
      setRetainedSnapshot(Object.keys(cachedRows).length > 0);
      setLoading(Object.keys(cachedRows).length === 0);
      setResolvedTf(tf);
    } catch {
      setPcts({});
      retainedRowsRef.current = {};
      setReceivedAt(null);
      setObservedAt(null);
      setQualityState("UNKNOWN");
      setFidelityReason("Retained heat-map data could not be read.");
      setRetainedSnapshot(false);
      setLoading(true);
      setResolvedTf(tf);
    }
  }, [tf]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let requestController: AbortController | null = null;
    const refreshInterval = tf === "1D" ? 30_000 : 120_000;

    async function load() {
      if (cancelled) return;
      requestController?.abort();
      requestController = new AbortController();
      // Only show spinner if we have no data at all
      if (Object.keys(retainedRowsRef.current).length === 0) setLoading(true);
      try {
        const syms = getAllSymbols();
        const res  = await fetch(
          `/api/heatmap?period=${encodeURIComponent(tf)}&syms=${encodeURIComponent(syms.join(","))}`,
          { cache: "no-store", signal: requestController.signal }
        );
        if (!res.ok) throw new Error(`Heat map HTTP ${res.status}`);
        const json = await res.json() as {
          results?: Record<string, number>;
          qualityState?: "HISTORICAL" | "DEGRADED" | "UNKNOWN";
          fidelityReason?: string;
          receiveTimestamp?: string;
          observedAt?: number | null;
          cacheHit?: boolean;
        };
        if (!cancelled && json.results) {
          const receivedAt = json.receiveTimestamp ? Date.parse(json.receiveTimestamp) : Date.now();
          setPcts(json.results);
          retainedRowsRef.current = json.results;
          setReceivedAt(receivedAt);
          setObservedAt(typeof json.observedAt === "number" && Number.isFinite(json.observedAt) ? json.observedAt : null);
          setQualityState(json.qualityState ?? "UNKNOWN");
          setFidelityReason(json.fidelityReason ?? "Market-data fidelity has not been established.");
          // A successful HTTP response can still be a retained server cache.
          // Keep the calm primary label bound to the route's explicit cache
          // receipt so it cannot contradict the detailed fidelity reason.
          setRetainedSnapshot(json.cacheHit === true);
          setResolvedTf(tf);
          // Cache to localStorage for instant re-load
          try { localStorage.setItem(HM_CACHE_PREFIX + tf, JSON.stringify({ data: json.results, ts: receivedAt, observedAt: json.observedAt ?? null })); } catch {}
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // A retained snapshot may remain useful, but it must not stay labelled current.
        if (!cancelled) {
          const hasRetainedRows = Object.keys(retainedRowsRef.current).length > 0;
          setQualityState(hasRetainedRows ? "DEGRADED" : "UNKNOWN");
          setFidelityReason(hasRetainedRows
            ? "Refresh failed; showing a retained browser snapshot."
            : "Heat-map data is unavailable and fidelity is unknown.");
          setRetainedSnapshot(hasRetainedRows);
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
          // Schedule from completion instead of using setInterval. A slow
          // provider refresh can never overlap the next refresh.
          refreshTimer = setTimeout(load, refreshInterval);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      requestController?.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [tf]); // eslint-disable-line react-hooks/exhaustive-deps

  if (resolvedTf !== tf) {
    return {
      pcts: {},
      loading: true,
      receivedAt: null,
      observedAt: null,
      qualityState: "UNKNOWN" as const,
      fidelityReason: "Checking the selected timeframe; fidelity is not established yet.",
      retainedSnapshot: false,
    };
  }

  return { pcts, loading, receivedAt, observedAt, qualityState, fidelityReason, retainedSnapshot };
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
  return Math.abs(pct) > 0.5 ? WM.text.hero : WM.text.body;
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
  const rows = industry.stocks
    .map((stock, index) => ({ stock, index, value: readObservedChange(pcts, stock.sym) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });
  const topRow = rows.find(row => row.value !== null) ?? null;

  // Position tooltip to stay on screen (guard for SSR where window is undefined)
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1024;
  const tooltipWidth = Math.min(320, Math.max(0, winW - 24));
  const left = Math.min(Math.max(12, x + 16), Math.max(12, winW - tooltipWidth - 12));
  const top = Math.min(Math.max(12, y), Math.max(12, winH - 420 - 12));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{
        position: "fixed", left, top,
        zIndex: 9999, pointerEvents: "none",
        width: tooltipWidth,
        background: WM.surface.deep,
        border: `1px solid ${WM.border.line}`,
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ background: WM.surface.mid, padding: "10px 14px", borderBottom: `1px solid ${WM.border.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: WM.text.muted, textTransform: "uppercase", letterSpacing: 1 }}>
          {industry.name}
        </div>
        {topRow ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: WM.text.hero }}>{topRow.stock.sym}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: WM.text.muted }}>
              {topRow.stock.name}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: topRow.value! >= 0 ? "#00D4AA" : "#FF4D6A" }}>
              {topRow.value! >= 0 ? "+" : ""}{topRow.value!.toFixed(2)}%
            </span>
          </div>
        ) : <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: WM.text.muted }}>
          Observed change unavailable
        </div>}
      </div>

      {/* Stock list */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {rows.map(({ stock: st, value: p }) => {
          return (
            <div key={st.sym} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 14px",
              borderBottom: `1px solid ${WM.border.hair}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: WM.text.hero, width: 52 }}>{st.sym}</span>
              <span style={{ fontSize: 11, color: WM.text.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {st.name}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: 12, fontWeight: 700, minWidth: 88, textAlign: "right",
                color: p === null ? WM.text.muted : p >= 0 ? "#00D4AA" : "#FF4D6A",
              }}>
                {p === null ? "— unavailable" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`}
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
export default function OpportunityMapPage() {
  const [activeView, setActiveView] = useState("S&P 500");
  const [activeTF,   setActiveTF]   = useState("1D");
  const [hovered,    setHovered]    = useState<{ industry: Industry; x: number; y: number } | null>(null);
  const [search,     setSearch]     = useState("");
  const { pcts, loading: heatLoading, receivedAt, observedAt, qualityState, fidelityReason, retainedSnapshot } = useLivePct(activeTF);
  // CLOSED IS NOT DELAYED (2026-10-04, weekend serving: "? UNKNOWN" beside a
  // full board). With the US session proven closed, a 1-day board that holds
  // rows is the last session's final figures — historical, not unknown.
  const usSessionOpen = useProvenSessionClosure("SPY");
  const shownQuality: ContextDataState =
    usSessionOpen === false && qualityState === "UNKNOWN" && Object.keys(pcts).length > 0 ? "HISTORICAL" : qualityState;
  // Research Heat Archive (§XCII): the trader keeps THIS moment's heat.
  const [savedHeat, setSavedHeat] = useState<"IDLE" | "SAVED" | "FAILED">("IDLE");
  useEffect(() => { setSavedHeat("IDLE"); }, [activeTF, activeView]);
  const saveHeat = () => {
    const snap = saveHeatSnapshot({ observedAt, period: activeTF, universe: activeView, quality: retainedSnapshot ? "RETAINED" : qualityState, note: "", pcts });
    setSavedHeat(snap ? "SAVED" : "FAILED");
  };

  /**
   * THIS BOARD PAINTS THE WHOLE INDEX. IT HAD TO SAY WHEN IT LOOKED.
   *
   * Measured live 2026-09-17 on production: eight real session moves on
   * screen (-1.37% … +4.03%) under a masthead reading FEED UNKNOWN and a
   * footer reading SOURCE UNKNOWN. The room published nothing upward, and the
   * frame's correct default for a silent room rendered as an open question.
   *
   * It could not simply start publishing: until this change it held no
   * observation epoch at all, only a receipt. `/api/heatmap` now asks Yahoo
   * for `regularMarketTime` and hands it over.
   */
  usePublishOsStanding({
    surface: "Opportunity Map",
    feed: selectHeatmapFeedObservation({ observedAt }),
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();

  const goToChart = useCallback((sym: string) => {
    setActiveSymbol(sym);
    router.push(heatCellCameraHref(sym));
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: WM.surface.deepest, overflow: "hidden" }}>

      {/* ── Top control bar ──
           minHeight 52 accommodates 44px hit-target buttons (Founder Cycle 12 §D). */}
      <div style={{
        minHeight: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "4px 14px", borderBottom: `1px solid ${WM.border.hair}`, background: WM.surface.deep,
      }}>
        <ScannerDeckViewSwitch />
        <div style={{ width: 1, height: 18, background: WM.border.line }} />
        <div role="group" aria-label="Heatmap view" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: WM.text.muted, fontWeight: 700 }}>VIEW</span>
          {VIEWS.map(v => (
            <button
              key={v}
              type="button"
              aria-pressed={activeView === v}
              aria-label={`View: ${v}${activeView === v ? " (selected)" : ""}`}
              onClick={() => setActiveView(v)}
              className="wm-heatmap-btn"
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "10px 14px",
                minHeight: 44,
                minWidth: 44,
                borderRadius: 6,
                cursor: "pointer",
                border: activeView === v ? `1px solid ${WM.gold.line}` : "1px solid transparent",
                background: activeView === v ? WM.gold.mark : "transparent",
                // Ivory on brass is a weak pair. The selected chip inverts to
                // the deepest surface, the same contract the primary action on
                // the front door uses.
                color: activeView === v ? WM.surface.deepest : WM.text.muted,
                outlineOffset: 2,
              }}
            >{v}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: WM.border.line, marginLeft: 4 }} />
        <label htmlFor="heatmap-timeframe" style={{ fontSize: 10, color: WM.text.muted, fontWeight: 700 }}>
          TIMEFRAME
        </label>
        <select
          id="heatmap-timeframe"
          aria-label="Heatmap timeframe"
          value={activeTF}
          onChange={event => setActiveTF(event.target.value)}
          style={{
            minHeight: 44,
            minWidth: 76,
            borderRadius: 6,
            border: `1px solid ${WM.border.line}`,
            background: WM.surface.mid,
            color: WM.text.hero,
            fontSize: 12,
            fontWeight: 700,
            padding: "0 10px",
          }}
        >
          {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        {heatLoading && (
          <span
            role="status"
            aria-live="polite"
            style={{ fontSize: 10, color: WM.text.muted, marginLeft: 4 }}
          >Loading…</span>
        )}
        {/* Calm primary truth: stale retained rows are named before the trader
            reaches the map. Provenance and receipt chronology remain one
            deliberate disclosure away; receipt time never masquerades as
            market-observation freshness. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <QualityBadge
            state={shownQuality}
          />
          {Object.keys(pcts).length > 0 ? (
            savedHeat === "SAVED" ? (
              <Link href="/research-heat" data-testid="heat-saved" style={{ fontSize: 11, color: WM.gold.hero, fontWeight: 700, whiteSpace: "nowrap" }}>Saved — open the Archive →</Link>
            ) : (
              <button type="button" data-testid="heat-save" onClick={saveHeat}
                title="Keep this moment's heat in the Research Heat Archive (this browser)"
                style={{ minHeight: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${WM.border.strong}`, background: "transparent", color: WM.gold.hero, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {savedHeat === "FAILED" ? "Could not save — browser storage refused" : "Save this heat"}
              </button>
            )
          ) : null}
          <span
            style={{
              fontSize: 10,
              color: retainedSnapshot ? WM.gold.mark : WM.text.muted,
              fontWeight: 800,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {retainedSnapshot
              ? "RETAINED SNAPSHOT"
              : Object.keys(pcts).length > 0
                ? "OBSERVED SNAPSHOT"
                : "NO MAP DATA"}
          </span>
        </div>
        <details className="wm-heatmap-receipt-details">
          <summary
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
              color: WM.text.muted,
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Data receipt
          </summary>
          <div
            role="note"
            style={{
              position: "absolute",
              zIndex: 30,
              maxWidth: 320,
              padding: "10px 12px",
              border: `1px solid ${WM.border.line}`,
              borderRadius: 8,
              background: WM.surface.mid,
              color: WM.text.body,
              fontSize: 10,
              lineHeight: 1.5,
              boxShadow: "0 12px 30px rgba(0,0,0,.45)",
            }}
          >
            <div>{fidelityReason}</div>
            {receivedAt && (
              <div style={{ marginTop: 4, color: WM.text.muted }}>
                Received {new Date(receivedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · receipt time only
              </div>
            )}
          </div>
        </details>
        <div style={{ flex: 1 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Quick search ticker…"
          style={{
            background: WM.surface.mid, border: `1px solid ${WM.border.line}`, borderRadius: 6,
            color: WM.text.hero, fontSize: 11, padding: "3px 10px", width: 160, minHeight: 44, outline: "none",
          }}
        />
        <span style={{ fontSize: 10, color: WM.text.muted }}>
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
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-start",
          gap: 2,
          padding: 4,
        }}
      >
        {visibleSectors.map(sector => {
          const sectorPct = sector.weight / totalWeight;
          // Compute a representative sector avg pct
          const allStocks = sector.industries.flatMap(i => i.stocks);
          const sectorChange = summarizeObservedChange(allStocks, pcts);
          const avgPct = sectorChange.value;
          const sectorCoverage = `${sectorChange.observedCount}/${sectorChange.totalCount} rows`;

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
              <div
                aria-label={`${sector.label}: equal-weight observed average ${avgPct === null ? "unavailable" : `${avgPct >= 0 ? "+" : ""}${avgPct.toFixed(2)}%`}; ${sectorCoverage}`}
                title={`Equal-weight average of finite observed rows · ${sectorCoverage}`}
                style={{
                fontSize: 10, fontWeight: 900, color: WM.text.muted,
                textTransform: "uppercase", letterSpacing: 0.8,
                display: "flex", alignItems: "center", gap: 6, padding: "2px 4px", flexWrap: "wrap",
              }}>
                <span>{sector.label}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: avgPct === null ? WM.text.muted : avgPct >= 0 ? "#00D4AA" : "#FF4D6A",
                }}>
                  EW {avgPct === null ? "—" : `${avgPct >= 0 ? "+" : ""}${avgPct.toFixed(2)}%`}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: WM.text.muted }}>
                  {sectorCoverage}{sectorChange.observedCount < sectorChange.totalCount
                    ? sectorChange.observedCount === 0 ? " · unavailable" : " · partial"
                    : ""}
                </span>
              </div>

              {/* Industries */}
              {sector.industries.map(industry => {
                const industryStocks = industry.stocks;
                const totalMcap = industryStocks.reduce((s, st) => s + st.mcap, 0);

                return (
                  <div
                    key={industry.name}
                    onMouseEnter={e => handleMouseEnter(e, industry)}
                    onMouseMove={e => handleMouseMove(e, industry)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: "relative",
                      border: hovered?.industry.name === industry.name
                        ? `1px solid ${WM.gold.mark}`
                        : `1px solid ${WM.border.hair}`,
                      borderRadius: 3,
                      overflow: "hidden",
                      minHeight: 60,
                      cursor: "default",
                    }}
                  >
                    {/* Industry sub-label */}
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: WM.text.muted,
                      textTransform: "uppercase", letterSpacing: 0.5,
                      padding: "3px 5px 1px", background: "rgba(0,0,0,0.45)",
                      borderBottom: `1px solid ${WM.border.hair}`,
                    }}>
                      {industry.name}
                    </div>

                    {/* Stock tiles grid */}
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 1, padding: 1,
                    }}>
                      {industryStocks.map(st => {
                        const p = readObservedChange(pcts, st.sym);
                        const tileWeight = st.mcap / totalMcap;
                        const minW = tileWeight > 0.35 ? "100%" : tileWeight > 0.2 ? "48%" : tileWeight > 0.1 ? "32%" : "auto";
                        const bg = p === null ? WM.surface.raised : pctColor(p);
                        const tc = p === null ? WM.text.body : pctTextColor(p);
                        const changeText = p === null
                          ? "change unavailable"
                          : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

                        return (
                          <button
                            key={st.sym}
                            type="button"
                            className="wm-heatmap-stock-tile"
                            aria-label={`${st.name}, ${st.sym}, ${activeTF} ${changeText}. Open chart`}
                            title={`${st.name}: ${activeTF} ${changeText} — Open chart`}
                            onClick={() => goToChart(st.sym)}
                            style={{
                              flex: `0 0 ${minW}`,
                              minWidth: tileWeight < 0.05 ? 44 : 52,
                              minHeight: tileWeight > 0.35 ? 80 : tileWeight > 0.15 ? 56 : 44,
                              background: bg,
                              border: 0,
                              borderRadius: 2,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px 4px",
                              cursor: "pointer",
                              appearance: "none",
                              WebkitAppearance: "none",
                              touchAction: "manipulation",
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
                            <span style={{
                              fontSize: tileWeight > 0.25 ? 13 : 10,
                              fontWeight: 700, color: tc,
                              lineHeight: 1.2, marginTop: 2,
                            }}>
                              {p === null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`}
                            </span>
                          </button>
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
      <style jsx global>{`
        .wm-markov-deck-action:focus-visible,
        .wm-heatmap-stock-tile:focus-visible {
          outline: 3px solid ${WM.gold.mark};
          outline-offset: 2px;
          position: relative;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
