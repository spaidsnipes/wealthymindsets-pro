"use client";

/**
 * Journal ↔ FVG (Garden 19 §40): attach ONE canonical FVG object to the entry
 * being written, as a reference plus its state AT DECISION TIME. The state is
 * read through the one engine and the one as-of accessor; the trader sees the
 * sentence that will be saved, and nothing is saved until the entry is.
 */

import React, { useEffect, useRef, useState } from "react";
import { fetchFvgBars } from "@/lib/marketData/fvg/fvgBarSource";
import {
  fvgReferenceAtDecision,
  fvgReferenceSentence,
  parseFvgObjectId,
  type JournalFvgReference,
} from "@/lib/journal/fvgDecisionReference";

function toLocalInput(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JournalFvgReferenceField({ value, onChange, initialObjectId, initialDecisionAtMs }: {
  value: JournalFvgReference | undefined;
  onChange: (ref: JournalFvgReference | undefined) => void;
  initialObjectId?: string | null;
  /** The fill time when the entry came from a broker capture; else the trader sets it. */
  initialDecisionAtMs?: number | null;
}) {
  const [objectId, setObjectId] = useState(initialObjectId ?? "");
  const [when, setWhen] = useState(toLocalInput(initialDecisionAtMs ?? null));
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  if (value) {
    return (
      <div data-testid="journal-fvg-ref" className="mb-4 rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-1">FVG referenced — its state at decision time</div>
        <p className="text-[11px] text-wm-text">{fvgReferenceSentence(value)}</p>
        <p className="mt-1 text-[10px] font-mono text-wm-text-dim break-all">{value.objectId}</p>
        <button type="button" onClick={() => onChange(undefined)} className="wm-tap mt-1 text-[10px] underline text-wm-text-muted">Remove the reference</button>
      </div>
    );
  }

  // §58: a read in flight stops with the field — no state set after unmount.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const read = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRefusal(null);
    const id = parseFvgObjectId(objectId);
    if (!id) { setRefusal("Paste an FVG object id (it starts with FVG|)."); return; }
    const at = Date.parse(when);
    if (!Number.isFinite(at)) { setRefusal("Set the decision time first."); return; }
    setBusy(true);
    const bars = await fetchFvgBars({ symbol: id.symbol, timeframe: id.timeframe, bars: 3000, nowMs: Date.now(), signal: ac.signal });
    if (ac.signal.aborted) return;
    setBusy(false);
    if (!bars.ok) { setRefusal(bars.reason); return; }
    const r = fvgReferenceAtDecision({ objectId: objectId.trim(), decisionAtMs: at, bars: bars.bars });
    if (!r.ok) { setRefusal(r.reason); return; }
    onChange(r.ref);
  };

  return (
    <details className="mb-4" open={!!initialObjectId}>
      <summary className="text-[10px] text-wm-text-dim uppercase tracking-wider cursor-pointer">Reference an FVG (optional)</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] items-end">
        <label className="text-[10px] text-wm-text-dim">FVG object id
          <input value={objectId} onChange={e => setObjectId(e.target.value)} placeholder="FVG|NQ1!|5m|…|BULLISH|v1" aria-label="FVG object id"
            className="mt-0.5 w-full bg-wm-surface border border-wm-border rounded px-2 py-1.5 text-[11px] font-mono text-wm-text" />
        </label>
        <label className="text-[10px] text-wm-text-dim">Decision time
          <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} aria-label="Decision time"
            className="mt-0.5 bg-wm-surface border border-wm-border rounded px-2 py-1.5 text-[11px] text-wm-text" />
        </label>
        <button type="button" onClick={() => { void read(); }} disabled={busy} data-testid="journal-fvg-read"
          className="wm-tap px-3 py-1.5 rounded-lg text-[11px] font-bold border border-wm-blue/40 bg-wm-blue/10 text-wm-blue disabled:opacity-40">
          {busy ? "Reading…" : "Read its state then"}
        </button>
      </div>
      {refusal && <p className="mt-1 text-[11px] text-wm-gold">Nothing attached: {refusal}</p>}
      <p className="mt-1 text-[10px] text-wm-text-dim">Saved as a reference and the facts at that moment — not a yes/no, and not a forecast.</p>
    </details>
  );
}
