"use client";

/**
 * PROP DESK PARTS — the small pieces the Journal's prop desk and its session plan share: a fold with an
 * honest summary, a money box that parses to cents (never guesses), a labelled fact. No arithmetic and
 * no storage live here; propEvaluation.ts and propSessionPlan.ts own the numbers.
 */

import React, { useEffect, useState } from "react";

import { parseMoneyToCents, type Cents, type Known } from "@/lib/journal/propEvaluation";

export const GOLD = "#c9a55c", MUTED = "#9a927f", INK = "#ede6d3", LINE = "rgba(139,106,41,0.35)", AMBER = "#d9a441", RED = "#d97a6c", GREEN = "#7fbf8f";
export const FIELD: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: `1px solid ${LINE}`, borderRadius: 6, color: INK, fontSize: 13, padding: "6px 8px", minHeight: 44, width: "100%", boxSizing: "border-box", fontVariantNumeric: "tabular-nums" };
export const LABEL: React.CSSProperties = { display: "grid", gap: 3, fontSize: 11, color: MUTED, minWidth: 0 };
export const GRID: React.CSSProperties = { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
export const BTN: React.CSSProperties = { minHeight: 44, padding: "6px 12px", borderRadius: 6, border: `1px solid ${LINE}`, background: "none", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" };

/** One collapsible part of the desk; its summary says what it holds before it is opened. */
export function Fold({ id, title, summary, startOpen, tone, children }: { readonly id: string; readonly title: string; readonly summary: string; readonly startOpen: boolean; readonly tone?: string; readonly children: React.ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details data-testid="prop-fold" data-fold={id} open={open} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "4px 10px" }}>
      <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: tone ?? GOLD, fontWeight: 700 }}>
        {title} <span data-testid="prop-fold-summary" style={{ fontWeight: 400, color: MUTED, fontSize: 11, overflowWrap: "anywhere" }}>· {summary}</span>
      </summary>
      <div style={{ display: "grid", gap: 8, padding: "6px 0 8px" }}>{children}</div>
    </details>
  );
}

/** A money box: the trader's text, parsed to cents; anything that is not a plain amount is said, never guessed. */
export function MoneyField({ label, valueCents, onCommit, allowNegative = false, testId }: {
  readonly label: string; readonly valueCents: Cents | null; readonly onCommit: (c: Cents | null) => void; readonly allowNegative?: boolean; readonly testId?: string;
}) {
  const [text, setText] = useState(valueCents === null ? "" : (valueCents / 100).toFixed(2));
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(t => (parseMoneyToCents(t) === valueCents || (t.trim() === "" && valueCents === null) ? t : valueCents === null ? "" : (valueCents / 100).toFixed(2))); }, [valueCents]);
  return (
    <label style={LABEL}>
      <span>{label}</span>
      <input inputMode="decimal" data-testid={testId} value={text} aria-invalid={bad} placeholder="—"
        onChange={e => {
          const t = e.target.value; setText(t);
          if (t.trim() === "") { setBad(false); onCommit(null); return; }
          const c = parseMoneyToCents(t);
          const ok = c !== null && (allowNegative || c >= 0);
          setBad(!ok);
          if (ok) onCommit(c);
        }}
        style={{ ...FIELD, borderColor: bad ? RED : LINE }} />
      {bad ? <span role="alert" style={{ color: RED, fontSize: 11 }}>{allowNegative ? "Not a money amount." : "Not a money amount (no minus sign here)."}</span> : null}
    </label>
  );
}

export const say = <T,>(k: Known<T>, fmt: (v: T) => string): string => (k.known ? fmt(k.value) : k.why);

export function Fact({ label, value, tone, testId }: { readonly label: string; readonly value: string; readonly tone?: string; readonly testId?: string }) {
  return (
    <div data-testid={testId} style={{ display: "grid", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 13, color: tone ?? INK, overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

