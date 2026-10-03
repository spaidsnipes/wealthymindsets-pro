"use client";

/**
 * TRADER DIAGNOSTIC CLINIC on one broker episode — Body of Market, Body of
 * Student, Pattern Pathology chain (Garden 18 v2 §43–§46). The trader's words
 * only; nothing inferred; private to this device. Collapsed until opened.
 */

import React, { useEffect, useState } from "react";

import { CLINIC_KEY, clinicProgress, MARKET_FIELDS, parseClinic, PATHOLOGY_CHAIN, STUDENT_FIELDS, type ClinicNotes } from "@/lib/journal/clinic";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

export function DiagnosticClinic({ episodeId }: { readonly episodeId: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<ClinicNotes>({});
  useEffect(() => { try { setNotes(parseClinic(localStorage.getItem(CLINIC_KEY))[episodeId] ?? {}); } catch { /* none */ } }, [episodeId]);
  const write = (id: string, text: string) => {
    const next = { ...notes, [id]: text.slice(0, 500) } as ClinicNotes;
    setNotes(next);
    try {
      const all = parseClinic(localStorage.getItem(CLINIC_KEY));
      all[episodeId] = next;
      localStorage.setItem(CLINIC_KEY, JSON.stringify(all));
    } catch { /* this visit only */ }
  };
  const p = clinicProgress(notes);
  const field = (f: { id: string; label: string; prompt?: string }) => (
    <label key={f.id} style={{ display: "grid", gap: 2, fontSize: 11, color: MUTED }}>
      <span><b style={{ color: INK }}>{f.label}</b>{f.prompt ? ` — ${f.prompt}` : ""}</span>
      <input value={(notes as Record<string, string>)[f.id] ?? ""} onChange={ev => write(f.id, ev.target.value)}
        style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: "2px 6px", borderRadius: 4 }} />
    </label>
  );
  return (
    <div data-testid="diagnostic-clinic" style={{ margin: "6px 0" }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", padding: 0 }}>
        {open ? "▾" : "▸"} Diagnostic Clinic · market {p.market}/{MARKET_FIELDS.length} · student {p.student}/{STUDENT_FIELDS.length} · chain {p.chain}/{PATHOLOGY_CHAIN.length}
      </button>
      {open ? (
        <div style={{ display: "grid", gap: 8, marginTop: 6, border: `1px dashed ${LINE}`, borderRadius: 6, padding: 8 }}>
          <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>Your words only — WM infers none of this. An educational map of process, not a medical diagnosis. Private to this device.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 10 }}>
            <div style={{ display: "grid", gap: 4 }}><div style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>BODY OF MARKET</div>{MARKET_FIELDS.map(field)}</div>
            <div style={{ display: "grid", gap: 4 }}><div style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>BODY OF STUDENT</div>{STUDENT_FIELDS.map(field)}</div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>PATTERN PATHOLOGY MAP · LOCATE → INTERRUPT → REPLACE → MEASURE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))", gap: 6 }}>{PATHOLOGY_CHAIN.map(field)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
