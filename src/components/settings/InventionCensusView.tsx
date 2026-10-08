"use client";
/**
 * SETTINGS › MARKET INTELLIGENCE › EVERY INVENTION — Garden 18 §XXVI / §CV.
 * The census, readable by the person who invented these things: what exists,
 * where to find it, which plate it answers to, and — named, never hidden —
 * what is partial or not built yet.
 */
import React, { useState } from "react";

import { INVENTION_CENSUS, type CensusEntry, type CensusStatus } from "@/lib/canon/inventionCensus";

const TONE: Readonly<Record<CensusStatus, string>> = { BUILT: "#7fd1a8", PARTIAL: "#d4af37", NOT_BUILT: "#e0786b", INTERNAL: "#8a8271" };

function where(e: CensusEntry): string {
  const s = e.surface;
  return s.kind === "SWITCH" ? `Tools › ${s.id.replace(/_/g, " ").toLowerCase()}`
    : s.kind === "FOOTPRINT" ? `Tools › Order flow › ${s.mode}`
    : s.kind === "ROUTE" ? s.href
    : s.kind === "CONTEXT" ? s.how
    : s.kind === "INSTRUMENT" ? `Tools › ${s.id.replace(/_/g, " ").toLowerCase()}`
    : "—";
}

export function InventionCensusView() {
  const [open, setOpen] = useState<CensusStatus | null>(null);
  const counts = (["BUILT", "PARTIAL", "NOT_BUILT", "INTERNAL"] as const).map(st => [st, INVENTION_CENSUS.filter(e => e.status === st).length] as const);
  return (
    <section data-testid="invention-census" className="px-4 py-3">
      <div className="text-xs font-semibold text-wm-text">Every invention</div>
      <div className="text-[10px] text-wm-text-dim mt-0.5">From the Complete Invention Registry and the visual canon. Nothing is left off — what is not built yet is named.</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {counts.map(([st, n]) => (
          <button key={st} type="button" aria-pressed={open === st} onClick={() => setOpen(o => (o === st ? null : st))}
            className="min-h-8 rounded border px-2 text-[11px] font-semibold" style={{ borderColor: TONE[st], color: TONE[st] }}>
            {n} {st.replace("_", " ").toLowerCase()}
          </button>
        ))}
      </div>
      {open ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {INVENTION_CENSUS.filter(e => e.status === open).map(e => (
            <li key={e.id} className="text-[11px] leading-snug">
              <span className="font-semibold" style={{ color: TONE[e.status] }}>{e.name}</span>
              <span className="text-wm-text-dim"> · {e.family}</span>
              <div className="text-wm-text-dim">{e.gap ? `Missing: ${e.gap}` : `Find it: ${where(e)}`}</div>
              {e.plate ? <div className="text-[10px]" style={{ color: "#8a8271" }}>Plate: {e.plate}</div> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
