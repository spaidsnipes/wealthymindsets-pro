"use client";

/**
 * §29 — the trader labels his own decision. The chips are NOT on the glass until he asks for them
 * ("Label it yourself"); nothing is pre-selected; every press is his. WM never chooses a label and never
 * reads one from a price or a result. The words come from the one owner (selfReport.ts); this view holds
 * none of them.
 */

import React, { useState } from "react";

import { SELF_REPORT_ASK, SELF_REPORT_LABELS, SELF_REPORT_RULE, selfReportLine, toggleSelfReport, type SelfReportId } from "@/lib/journal/selfReport";

const GOLD = "#C9A55C", INK = "#ede6d3", MUTED = "#8a8271", LINE = "rgba(139,106,41,0.35)";

export function SelfReportChooser({ labels, onChange, readOnly = false, startOpen = false }: {
  readonly labels: readonly SelfReportId[] | undefined;
  /** Called only from a chip the trader pressed. */
  readonly onChange: (next: readonly SelfReportId[]) => void;
  readonly readOnly?: boolean;
  /** Proof scenes may show the chooser open; the real Review always starts closed. */
  readonly startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const line = selfReportLine(labels);
  return (
    <div data-testid="self-report" data-open={open ? "yes" : "no"} style={{ display: "grid", gap: 4 }}>
      {line ? <span data-testid="self-report-line" style={{ fontSize: 11.5, color: INK }}>{line}</span> : null}
      {!open ? (
        readOnly ? null : (
          <button type="button" data-testid="self-report-open" onClick={() => setOpen(true)}
            style={{ justifySelf: "start", minHeight: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${LINE}`, background: "transparent", color: MUTED, fontSize: 11, cursor: "pointer" }}>
            {SELF_REPORT_ASK}
          </button>
        )
      ) : (
        <fieldset data-testid="self-report-chips" disabled={readOnly} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px", margin: 0, display: "grid", gap: 6 }}>
          <legend style={{ fontSize: 10, letterSpacing: 0.8, color: MUTED, padding: "0 4px" }}>YOUR OWN LABELS</legend>
          <span style={{ fontSize: 10.5, color: MUTED }}>{SELF_REPORT_RULE}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SELF_REPORT_LABELS.map(l => {
              const on = (labels ?? []).includes(l.id);
              return (
                <button key={l.id} type="button" data-testid="self-report-chip" data-label={l.id} aria-pressed={on}
                  onClick={() => onChange(toggleSelfReport(labels, l.id))}
                  style={{ minHeight: 30, padding: "0 10px", borderRadius: 999, border: `1px solid ${on ? GOLD : LINE}`, background: on ? `${GOLD}22` : "transparent", color: on ? GOLD : INK, fontSize: 11.5, cursor: readOnly ? "default" : "pointer" }}>
                  {l.words}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
