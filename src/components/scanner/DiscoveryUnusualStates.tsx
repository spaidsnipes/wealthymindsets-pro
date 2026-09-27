"use client";

/**
 * DISCOVERY · UNUSUAL STATES — F14 "Heat lands same camera": the chart room's
 * Heat · Discovery lens, on the left wall beside the live chart (Garden 16 §29).
 *
 * Composition taken from the plate, not invented:
 *   left     the state grid — one cell per measured state, heat = how unusual
 *            it is today (discoveryStates), a gold ring on the selected cell,
 *            and the LOW → HIGH intensity scale under it
 *   card     SELECTED STATE — symbol, the state's name, its measured value and
 *            its rank across the universe (a percentile, never a "confidence")
 *   landing  "Heat ↔ Chart" lands on the EXISTING Market Camera
 *            (heatCellCameraHref) — no second chart engine here
 *
 * Every cell is a button (keyboard + screen reader), and the heat never
 * carries meaning by colour alone: the value is printed in the cell.
 */

import React, { useEffect, useMemo, useState } from "react";

import { WM } from "@/lib/design/wmTokens";
import {
  INTENSITY_STOPS, STATE_KEYS, STATE_LABEL, STATE_MEANING, formatState, intensityColor,
  type DiscoveryRow, type StateKey,
} from "@/lib/marketData/discoveryStates";

interface DiscoveryAnswer {
  readonly rows: DiscoveryRow[];
  readonly observedAt: number | null;
  readonly asked: number;
  readonly answered: number;
  readonly missing: string[];
  readonly retained: boolean;
}

export const DISCOVERY_ROWS_SHOWN = 24;
const GOLD = "#C9A55C";

export function DiscoveryUnusualStates({ symbols, onLand, landedSymbol = null, compact = false, unabridged = false }: {
  readonly symbols: readonly string[];
  readonly onLand: (symbol: string) => void;
  /** The symbol the chart beside this panel is showing (chart-room lens only). */
  readonly landedSymbol?: string | null;
  /** Left-wall lens: one column, fewer rows. */
  readonly compact?: boolean;
  /** The room's full depth: every ranked symbol, not the first rows. */
  readonly unabridged?: boolean;
}) {
  const [answer, setAnswer] = useState<DiscoveryAnswer | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<{ symbol: string; key: StateKey } | null>(null);
  const symsKey = symbols.join(",");

  useEffect(() => {
    let live = true;
    setFailed(false);
    fetch(`/api/discovery?syms=${encodeURIComponent(symsKey)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((a: DiscoveryAnswer) => { if (live) setAnswer(a); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [symsKey]);

  const rows = useMemo(() => (answer?.rows ?? []).slice(0, unabridged ? undefined : compact ? 14 : DISCOVERY_ROWS_SHOWN), [answer, compact, unabridged]);
  // The most unusual cell is selected first, so the card is never empty over a full grid.
  const selected = useMemo(() => {
    if (sel) {
      const r = rows.find(x => x.symbol === sel.symbol);
      if (r) return { row: r, key: sel.key };
    }
    const r = rows.find(x => x.lead);
    return r && r.lead ? { row: r, key: r.lead } : null;
  }, [rows, sel]);

  const gradient = `linear-gradient(90deg, ${INTENSITY_STOPS.map(([t, c]) => `rgb(${c.join(",")}) ${Math.round(t * 100)}%`).join(", ")})`;
  const observed = answer?.observedAt ? new Date(answer.observedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  return (
    <section
      aria-label="Discovery · unusual states"
      data-testid="discovery-unusual-states"
      style={{ display: "flex", flexDirection: compact ? "column" : "row", gap: compact ? 12 : 16, padding: compact ? 0 : 16, height: compact ? "auto" : "100%", minHeight: 0, overflow: compact ? "visible" : "auto", color: WM.text.body }}
    >
      <div style={{ width: compact ? "100%" : 460, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: WM.text.hero }}>DISCOVERY · UNUSUAL STATES</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: WM.text.muted }}>
            {failed
              ? "NO DISCOVERY DATA — the provider did not answer"
              : !answer
                ? "MEASURING…"
                : `${answer.answered} OF ${answer.asked} SYMBOLS · ${STATE_KEYS.length} STATES · DAILY BARS${observed ? ` · OBSERVED ${observed}` : ""}${answer.retained ? " · RETAINED" : ""}`}
          </div>
        </header>

        <div role="grid" aria-label="Unusual-state heat, most unusual symbols first" style={{ display: "grid", gridTemplateColumns: `56px repeat(${STATE_KEYS.length}, 1fr)`, gap: 3 }}>
          <div />
          {STATE_KEYS.map(k => (
            <div key={k} role="columnheader" title={STATE_MEANING[k]} style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: WM.text.muted, textAlign: "center", paddingBottom: 2 }}>{STATE_LABEL[k]}</div>
          ))}
          {rows.map(r => (
            <React.Fragment key={r.symbol}>
              <div role="rowheader" style={{ fontSize: 11, fontWeight: 800, color: WM.text.hero, display: "flex", alignItems: "center" }}>{r.symbol}</div>
              {STATE_KEYS.map(k => {
                const isSel = selected?.row.symbol === r.symbol && selected.key === k;
                const p = r.pct[k];
                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    aria-selected={isSel}
                    aria-label={`${r.symbol} ${STATE_LABEL[k]} ${formatState(k, r.values[k])}${p != null ? `, ${p}th percentile` : ", not measured"}`}
                    onClick={() => setSel({ symbol: r.symbol, key: k })}
                    style={{
                      height: 26, borderRadius: 3, cursor: "pointer",
                      background: intensityColor(p),
                      border: isSel ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.05)",
                      boxShadow: isSel ? `0 0 10px rgba(201,165,92,0.55)` : "none",
                      color: p != null && p >= 85 ? "#140f06" : "rgba(237,230,211,0.78)",
                      fontSize: 9, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatState(k, r.values[k])}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div aria-hidden="false">
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: WM.text.muted, marginBottom: 4 }}>UNUSUAL STATE INTENSITY · RANK ACROSS THE UNIVERSE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, fontWeight: 700, color: WM.text.muted }}>
            <span>LOW</span>
            <div style={{ flex: 1, height: 10, borderRadius: 2, background: gradient }} />
            <span>HIGH</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: compact ? 0 : 280, maxWidth: compact ? "none" : 520, display: "flex", flexDirection: "column", gap: 12 }}>
        {selected ? (
          <>
            <div data-testid="discovery-selected-state" style={{ border: `1px solid ${GOLD}`, borderRadius: 8, padding: "14px 16px", background: "linear-gradient(180deg, rgba(201,165,92,0.08), rgba(0,0,0,0))" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: WM.text.muted }}>SELECTED STATE</div>
              <div style={{ fontSize: compact ? 20 : 26, fontWeight: 800, letterSpacing: "0.04em", color: GOLD, marginTop: 4 }}>
                {selected.row.symbol} · {STATE_LABEL[selected.key]}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: WM.text.muted }}>MEASURED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: WM.text.hero, fontVariantNumeric: "tabular-nums" }}>{formatState(selected.key, selected.row.values[selected.key])}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: WM.text.muted }}>RANK</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: WM.text.hero }}>{selected.row.pct[selected.key] != null ? `${selected.row.pct[selected.key]}th pct` : "not measured"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: WM.text.muted }}>LEADS WITH</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: WM.text.hero }}>{selected.row.lead ? STATE_LABEL[selected.row.lead] : "—"}</div>
                </div>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: WM.text.body, marginTop: 10 }}>{STATE_MEANING[selected.key]}. Measured, not forecast.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", rowGap: 6, columnGap: 12, fontSize: 11 }}>
              {STATE_KEYS.map(k => (
                <React.Fragment key={k}>
                  <span style={{ color: WM.text.muted }}>{STATE_LABEL[k]}</span>
                  <span style={{ color: WM.text.hero, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatState(k, selected.row.values[k])}</span>
                  <span style={{ color: WM.text.muted, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{selected.row.pct[k] != null ? `${selected.row.pct[k]}th` : "—"}</span>
                </React.Fragment>
              ))}
            </div>

            {landedSymbol != null && landedSymbol.toUpperCase() === selected.row.symbol ? (
              <div data-testid="discovery-landed" role="status" style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: `1px solid ${GOLD}`, color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em" }}>
                ✓ LANDED · {selected.row.symbol} · SAME CAMERA · NO SECOND ENGINE
              </div>
            ) : (
              <button
                type="button"
                data-testid="discovery-land"
                onClick={() => onLand(selected.row.symbol)}
                style={{ minHeight: 44, borderRadius: 8, border: `1px solid ${GOLD}`, background: "rgba(201,165,92,0.1)", color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}
              >
                HEAT ↔ CHART · LAND {selected.row.symbol} {landedSymbol != null ? "ON THIS CHART" : "ON THE MARKET CAMERA"}
              </button>
            )}
            <div style={{ fontSize: 10, color: WM.text.muted, letterSpacing: "0.06em" }}>
              {landedSymbol != null ? "The chart beside this lens changes market; the camera stays." : "Lands on /charts — the one Market Camera. No second engine here."}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: WM.text.muted }}>{failed ? "Nothing measured, so nothing is selected." : "Select a state to read it."}</div>
        )}
        {answer && answer.missing.length > 0 && (
          <div style={{ fontSize: 10, color: WM.text.muted }}>Not answered by the provider: {answer.missing.length} symbol{answer.missing.length === 1 ? "" : "s"} — left out, not scored.</div>
        )}
      </div>
    </section>
  );
}
