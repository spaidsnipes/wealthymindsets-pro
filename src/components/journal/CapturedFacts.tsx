"use client";

/**
 * CAPTURED FACTS — §J 2026-10-07. The machine facts of a broker-confirmed
 * fill, each printed with its provenance (BROKER-REPORTED / TICKET-INTENT /
 * DERIVED / UNREPORTED). An unreported field reads "unreported", never 0.
 * Read-only: the broker's facts are never edited in the Journal.
 */

import React from "react";

import { CAPTURE_FIELD_LABELS, type CaptureProvenance, type CapturedField, type JournalCaptureDraft } from "@/lib/journal/journalCaptureFromFill";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

export const PROVENANCE_INK: Readonly<Record<CaptureProvenance, string>> = {
  "BROKER-REPORTED": "#7fd1a8",
  "TICKET-INTENT": GOLD,
  DERIVED: "#9fb8d9",
  UNREPORTED: MUTED,
};

export function ProvenanceTag({ p }: { p: CaptureProvenance }) {
  return (
    <span data-provenance={p} style={{ fontSize: 9, letterSpacing: ".08em", color: PROVENANCE_INK[p], border: `1px solid ${PROVENANCE_INK[p]}55`, borderRadius: 3, padding: "0 4px", whiteSpace: "nowrap" }}>
      {p}
    </span>
  );
}

const show = (f: CapturedField<string | number>) =>
  f.value == null ? "unreported" : typeof f.value === "number" ? f.value.toLocaleString("en-US", { maximumFractionDigits: 6 }) : f.value;

export function CapturedFacts({ capture, title = "Captured from the broker" }: { capture: JournalCaptureDraft; title?: string }) {
  return (
    <section data-testid="captured-facts" aria-label={title} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
      <strong style={{ color: GOLD, fontSize: 11, letterSpacing: ".08em" }}>{title.toUpperCase()}</strong>
      <dl style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) auto", gap: "2px 8px", margin: 0, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        {CAPTURE_FIELD_LABELS.map(([k, label]) => {
          const f = capture[k] as CapturedField<string | number>;
          return (
            <React.Fragment key={k}>
              <dt style={{ color: MUTED, overflowWrap: "anywhere" }}>{label}</dt>
              <dd data-testid={`capture-${k}`} data-provenance={f.provenance} title={f.source} style={{ margin: 0, color: f.value == null ? MUTED : INK, overflowWrap: "anywhere" }}>{show(f)}</dd>
              <dd style={{ margin: 0 }}><ProvenanceTag p={f.provenance} /></dd>
            </React.Fragment>
          );
        })}
      </dl>
      <details style={{ fontSize: 10.5, color: MUTED }}>
        <summary style={{ cursor: "pointer", minHeight: 24 }}>Where each value came from</summary>
        <ul style={{ margin: "4px 0 0", paddingLeft: 14 }}>
          {CAPTURE_FIELD_LABELS.map(([k, label]) => <li key={k}>{label} — {(capture[k] as CapturedField<string | number>).source}</li>)}
        </ul>
      </details>
      <p style={{ margin: 0, fontSize: 10.5, color: MUTED }}>Unreported stays unreported — it is never filled with 0.</p>
    </section>
  );
}
