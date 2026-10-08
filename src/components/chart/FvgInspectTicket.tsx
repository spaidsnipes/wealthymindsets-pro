"use client";

/**
 * INSPECT · FVG / IMBALANCE — Garden 19 FVG lane D (2026-10-07).
 *
 * The selected GAP_FVG object's truth microscope: every number the glass
 * withholds (definition, boundaries, creation, size in ticks / points / pips,
 * age, lifecycle, penetration, remaining territory, each interaction, the
 * time-to-return horizon, evidence per sense with provenance) plus the Academy
 * lesson. Rows are `fvgInspectRows` — one owner's words; this file only lays
 * them out. The object is the one the chart painted from the camera's scene
 * (live, or as of the replay cursor), so Inspect cannot see a different past
 * than the glass.
 */

import React from "react";
import Link from "next/link";
import { Crosshair, X } from "lucide-react";
import { fvgInspectRows, type FvgObject } from "@/lib/chart/fvgGlass";
import { CONCEPT_EDUCATION } from "@/lib/chart/inventionEducation";
import { AskSpaidbotButton } from "@/components/ai/AskSpaidbotButton";
import { fvgInspectAsk } from "@/lib/ai/spaidbotAsk";
import type { FvgRelationshipReading } from "@/lib/marketData/fvg/fvgRelationships";
import { fvgInspectLayerOf, FVG_TRUTH_LAYERS } from "@/lib/chart/fvgTruthLayers";

const GOLD = "#d4af37";

export function FvgInspectTicket({ o, fmt, clock, evidence, firstTouch, relationships = null, priceDp = null, onClose }: {
  o: FvgObject;
  fmt: (p: number) => string;
  clock: (ms: number) => string;
  /** The room's evidence-completeness line (feed-capped), rendered by the ticket. */
  evidence?: React.ReactNode;
  firstTouch?: React.ReactNode;
  /** Relationships BY REFERENCE (fvgInspectRelationships): price-ordered rows, then what is silent. */
  relationships?: { readonly rows: readonly string[]; readonly silences: readonly string[]; readonly reading?: FvgRelationshipReading } | null;
  /** The chart's display decimals, for the SpaidBot fact block (Garden 19 §30). */
  priceDp?: number | null;
  onClose: () => void;
}) {
  const rows = fvgInspectRows(o, fmt, clock);
  const academy = CONCEPT_EDUCATION.FVG_IMBALANCE.academy;
  const bull = o.direction === "BULLISH";
  return (
    <section
      className="absolute top-16 left-2 z-[75] w-[268px] max-w-[calc(100%-1rem)] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
      data-testid="chart-inspect-ticket"
      data-inspect-fvg={o.objectId}
      data-inspect-fvg-state={o.state}
      aria-label={`Inspect ${bull ? "bullish" : "bearish"} fair value gap`}
    >
      <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
        <Crosshair size={11} /> FVG · {bull ? "BULLISH" : "BEARISH"} · {o.timeframe}
        <button className="wm-tap ml-auto inline-flex items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold" aria-label="Close the gap's inspect ticket" onClick={onClose}><X size={12} aria-hidden="true" /></button>
      </div>
      {firstTouch}
      {evidence}
      {/* Garden 19 §42: MARKET / CONTEXT / TRADER / EDUCATION truth, visibly separate. */}
      {FVG_TRUTH_LAYERS.map(layer => {
        const own = rows.filter(r => fvgInspectLayerOf(r.id) === layer.id);
        const rel = layer.id === "CONTEXT" && relationships && (relationships.rows.length > 0 || relationships.silences.length > 0) ? relationships : null;
        if (!own.length && !rel && layer.id !== "TRADER") return null;
        return (
          <section key={layer.id} data-inspect-fvg-layer={layer.id} className="mt-2 border-t border-wm-border pt-1.5">
            <div className="text-[9.5px] max-sm:text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>{layer.title}</div>
            <div className="text-[9.5px] max-sm:text-[11px] text-wm-muted leading-snug">{layer.means}</div>
            {own.length ? (
              <dl className="mt-1 text-[11px] break-words space-y-1.5" style={{ color: "#C8C0AE" }}>
                {own.map(r => (
                  <div key={r.id} data-inspect-fvg-row={r.id}>
                    <dt className="text-[9.5px] max-sm:text-[11px] font-bold uppercase tracking-[0.12em] text-wm-muted">{r.label}</dt>
                    <dd className="text-white leading-snug">{r.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {rel ? (
              <div className="mt-1 text-[11px] leading-snug" data-inspect-fvg-relationships data-inspect-fvg-relationship-count={rel.rows.length}>
                <div className="text-[9.5px] max-sm:text-[11px] font-bold uppercase tracking-[0.12em] text-wm-muted">Relationships (by reference)</div>
                {rel.rows.map((r, i) => <div key={`r${i}`} className="pt-0.5 text-white">{r}</div>)}
                {rel.silences.map((r, i) => <div key={`s${i}`} className="pt-0.5 text-wm-muted">{r}</div>)}
              </div>
            ) : null}
            {layer.id === "TRADER" ? (
              <div className="mt-1 text-[11px] text-white leading-snug" data-inspect-fvg-trader>
                No decision of yours is recorded on this gap here.{" "}
                <Link href={`/journal?${new URLSearchParams({ new: "1", symbol: o.symbolId, fvg: o.objectId }).toString()}`} prefetch={false} className="wm-tap inline-flex items-center underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold" style={{ color: GOLD }}>
                  Journal it with its state at your decision time ›
                </Link>
              </div>
            ) : null}
          </section>
        );
      })}
      <AskSpaidbotButton testId="inspect-fvg-ask-spaidbot" label="Ask SpaidBot: what am I looking at?" ask={() => {
        // Phone (serving 390, 2026-10-07 night): the ticket stood over the SpaidBot
        // panel it had just opened. On a phone the ticket steps aside for the answer;
        // the selection stays, so Inspect reopens on the same gap.
        const a = fvgInspectAsk(o, priceDp, relationships?.reading ?? null);
        if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 639px)").matches) onClose();
        return a;
      }} />
      <br />
      <a href={academy.href} data-testid="inspect-fvg-academy"
        className="wm-tap mt-2 inline-flex items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold text-[11px] font-semibold underline" style={{ color: GOLD }}>
        Academy · {academy.title} ›
      </a>
    </section>
  );
}
