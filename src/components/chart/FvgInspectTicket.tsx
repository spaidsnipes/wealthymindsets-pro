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
import { Crosshair, X } from "lucide-react";
import { fvgInspectRows, type FvgObject } from "@/lib/chart/fvgGlass";
import { CONCEPT_EDUCATION } from "@/lib/chart/inventionEducation";

const GOLD = "#d4af37";

export function FvgInspectTicket({ o, fmt, clock, evidence, firstTouch, onClose }: {
  o: FvgObject;
  fmt: (p: number) => string;
  clock: (ms: number) => string;
  /** The room's evidence-completeness line (feed-capped), rendered by the ticket. */
  evidence?: React.ReactNode;
  firstTouch?: React.ReactNode;
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
        <button className="ml-auto" aria-label="Close the inspect ticket" onClick={onClose}><X size={12} /></button>
      </div>
      {firstTouch}
      {evidence}
      <dl className="mt-2 text-[11px] break-words space-y-1.5" style={{ color: "#C8C0AE" }}>
        {rows.map(r => (
          <div key={r.id} data-inspect-fvg-row={r.id}>
            <dt className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-wm-muted">{r.label}</dt>
            <dd className="text-white leading-snug">{r.value}</dd>
          </div>
        ))}
      </dl>
      <a href={academy.href} data-testid="inspect-fvg-academy"
        className="mt-2 inline-block text-[11px] font-semibold underline" style={{ color: GOLD }}>
        Academy · {academy.title} ›
      </a>
    </section>
  );
}
