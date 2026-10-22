"use client";

/**
 * Where a journaled trade was taken, and how the Journal knows it (Megazord order §5, 2026-10-21).
 * All words and rules live in tradeVenue.ts; this file only draws them.
 */
import React, { useEffect, useState } from "react";

import { entryCompleteness } from "@/lib/journal/entryCompleteness";
import { AMENDMENT_MAX_CHARS, ENTRY_AMENDMENTS_STORAGE_KEY, PROCESS_NOTE_VALUES, amendmentLine, appendAmendment, readAmendmentBook,
  type AmendmentBook, type AmendmentField } from "@/lib/journal/entryAmendments";
import { managementKey } from "@/lib/journal/managementOwner";
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

/** What the entry still lacks for the Journal's reads (entryCompleteness.ts), each with the read that needs it. A complete entry says so too. */
export function EntryCompletenessLine({ entry }: { readonly entry: Parameters<typeof entryCompleteness>[0] }): React.ReactElement {
  const c = entryCompleteness(entry);
  return (
    <div data-testid="journal-entry-completeness" data-complete={c.complete ? "yes" : "no"} className="mb-3 text-[11px] text-wm-text-muted">
      <p>{c.line}</p>
      {c.gaps.length ? (
        <ul className="mt-1 list-disc pl-4 text-[10px] text-wm-text-dim">
          {c.gaps.map(g => <li key={g.id}><b className="text-wm-text-muted">{g.field}</b> — needed for {g.neededFor}.</li>)}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Add what was missing (entryAmendments.ts): a dated note beside the saved entry, for a field it lacks. The entry
 * itself never changes and the reads keep counting only what was recorded at the time. Stored under the signed-in
 * member's own key; a guest sees the notes form disabled rather than writing under a guess.
 */
export function EntryAmendments({ entry, entryKey }: { readonly entry: Parameters<typeof entryCompleteness>[0]; readonly entryKey: string }): React.ReactElement | null {
  const gaps = entryCompleteness(entry).gaps;
  const [book, setBook] = useState<AmendmentBook>({});
  const [field, setField] = useState<AmendmentField | "">("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  // Resolved after mount, so the server render and the first client render agree (no hydration mismatch).
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    const k = managementKey(ENTRY_AMENDMENTS_STORAGE_KEY);
    setKey(k);
    if (!k) return;
    try { setBook(readAmendmentBook(window.localStorage.getItem(k))); } catch { setBook({}); }
  }, []);
  const notes = book[entryKey] ?? [];
  if (!gaps.length && !notes.length) return null;
  const nameOf = (f: AmendmentField) => gaps.find(g => g.id === f)?.field ?? ({ PROCESS: "Process quality", PLANNED_RISK: "Planned R (1R = $)", MFE: "MFE (R)", SETUP: "Setup", LESSON: "Lessons Learned" } as const)[f];
  const add = () => {
    if (!key || !field) return;
    const r = appendAmendment(book, entryKey, gaps.map(g => g.id), field, value, Date.now());
    if (!r.ok) { setMsg(r.reason === "EMPTY" ? "Write the note first." : r.reason === "TOO_LONG" ? `Keep it under ${AMENDMENT_MAX_CHARS} characters.` : r.reason === "FULL" ? "This entry has as many notes as it can hold." : "That field was recorded when the trade was saved."); return; }
    try { window.localStorage.setItem(key, JSON.stringify(r.book)); } catch { setMsg("The browser refused to save the note."); return; }
    setBook(r.book); setValue(""); setField(""); setMsg("Added. The entry itself is unchanged.");
  };
  return (
    <section data-testid="journal-entry-amendments" aria-label="Added after the outcome" className="mb-3 rounded-lg border border-wm-border bg-wm-surface/40 p-3">
      <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Added after the outcome · notes beside the saved entry, never a rewrite</div>
      {notes.length ? (
        <ul className="mt-1 text-[11px] text-wm-text">
          {notes.map((n, i) => <li key={i} data-testid="journal-entry-amendment">{amendmentLine(n, nameOf(n.field), new Date(n.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</li>)}
        </ul>
      ) : null}
      {gaps.length ? (
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <select aria-label="Missing field" value={field} disabled={!key} onChange={e => { setField(e.target.value as AmendmentField | ""); setValue(""); setMsg(""); }}
            className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-[12px] text-wm-text min-h-[40px]">
            <option value="">Add what was missing…</option>
            {gaps.map(g => <option key={g.id} value={g.id}>{g.field}</option>)}
          </select>
          {field === "PROCESS" ? (
            <select aria-label="Process note" value={value} onChange={e => setValue(e.target.value)} className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-[12px] text-wm-text min-h-[40px]">
              <option value="">Choose…</option>
              {PROCESS_NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : field ? (
            <input aria-label="Note" value={value} maxLength={AMENDMENT_MAX_CHARS} onChange={e => setValue(e.target.value)} placeholder="What you know now"
              className="flex-1 min-w-[160px] bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-[12px] text-wm-text min-h-[40px]" />
          ) : null}
          {field ? <button type="button" onClick={add} className="rounded-lg border border-wm-border px-3 py-1 text-[12px] text-wm-text min-h-[40px]">Add note</button> : null}
        </div>
      ) : null}
      <p className="mt-1 text-[10px] text-wm-text-dim" role="status">{!key ? "Sign in to add notes to your own Journal." : msg || "Dated and kept beside the original. The Journal's reads count only what was recorded when the trade was saved."}</p>
    </section>
  );
}
