"use client";

/**
 * Where a journaled trade was taken, and how the Journal knows it (Megazord order §5, 2026-10-21).
 * All words and rules live in tradeVenue.ts; this file only draws them.
 */
import React from "react";

import { entryProvenance, TRADE_VENUE_ASK, TRADE_VENUE_NOT_SAID, TRADE_VENUES, readTradeVenue, type TradeVenue } from "@/lib/journal/tradeVenue";

/** The new-trade form's optional question. Shown only when no broker facts are attached. */
export function TradeVenueField({ value, onChange }: { readonly value: TradeVenue | undefined; readonly onChange: (v: TradeVenue | undefined) => void }): React.ReactElement {
  return (
    <div className="mb-4" data-testid="journal-venue-field">
      <label htmlFor="journal-venue" className="text-[10px] text-wm-text-dim uppercase mb-1 block">{TRADE_VENUE_ASK}</label>
      <select id="journal-venue" aria-label={TRADE_VENUE_ASK} value={value ?? ""} onChange={e => onChange(readTradeVenue(e.target.value))}
        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50 min-h-[44px]">
        <option value="">{TRADE_VENUE_NOT_SAID}</option>
        {TRADE_VENUES.map(v => <option key={v.id} value={v.id}>{v.words}</option>)}
      </select>
      <p className="text-[10px] text-wm-text-dim mt-1">Traded somewhere else? Journal it anyway. It is reviewed and learned from like any trade, and marked as typed by you.</p>
    </div>
  );
}

/** One line on the entry: broker-confirmed, or self-reported and where. */
export function EntryProvenanceLine({ venue, hasBrokerCapture }: { readonly venue?: TradeVenue; readonly hasBrokerCapture: boolean }): React.ReactElement {
  const p = entryProvenance({ venue, hasBrokerCapture });
  return (
    <p data-testid="journal-entry-provenance" data-kind={p.kind} className="mb-3 text-[11px] text-wm-text-muted">
      <span className="font-bold uppercase tracking-wider text-[9px] mr-1">{p.label}</span>
      {p.detail}
    </p>
  );
}
