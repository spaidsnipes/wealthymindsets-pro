"use client";

/**
 * PROCESS BEFORE P&L — each trading day, graded by the trader on five 0–2
 * categories, beside that day's broker P&L (Garden 18 v2 §54). The grade is
 * the trader's alone; nothing is inferred. Grade words stay neutral in colour
 * (§9: a verdict may not choose its own green). Kept on this device.
 */

import React, { useEffect, useMemo, useState } from "react";

import type { Episode } from "@/lib/broker/webullLedger";
import { gradeDay, parseProcessDays, PROCESS_CATEGORIES, PROCESS_DAYS_KEY, processVsPnl, tradingDays, type ProcessCategory, type ProcessScores } from "@/lib/journal/processDay";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const UP = "#7fd1a8";
const DOWN = "#e0786b";
const usd = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ProcessDays({ episodes }: { readonly episodes: readonly Episode[] }) {
  const days = useMemo(() => tradingDays(episodes), [episodes]);
  const [scores, setScores] = useState<Record<string, ProcessScores>>({});
  const [shown, setShown] = useState(10);
  useEffect(() => { try { setScores(parseProcessDays(localStorage.getItem(PROCESS_DAYS_KEY))); } catch { /* none */ } }, []);
  const set = (day: string, cat: ProcessCategory, v: 0 | 1 | 2 | null) => {
    setScores(prev => {
      const cur = { ...(prev[day] ?? {}) };
      if (v == null) delete cur[cat]; else cur[cat] = v;
      const next = { ...prev, [day]: cur };
      try { localStorage.setItem(PROCESS_DAYS_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
      return next;
    });
  };
  const matrix = processVsPnl(days, scores);
  if (!days.length) return null;

  return (
    <section data-testid="process-days" aria-label="Process before P&L" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, overflowX: "auto" }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PROCESS BEFORE P&amp;L · GRADE YOUR DAYS</div>
      <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
        Five categories, 0–2 each, set by you. 8–10 A PROCESS DAY · 6–7 B · 4–5 C · 0–3 PROCESS FAILURE / REVIEW. The P&amp;L beside it is Webull&apos;s.
        A red P&amp;L day can be an A process day; a green day can be a process failure.
      </p>
      <p data-testid="process-days-matrix" style={{ fontSize: 12, color: INK, margin: "0 0 8px" }}>
        {matrix.graded === 0 ? "No day graded yet." : <>Graded {matrix.graded} days · A/B process on a red day: <b>{matrix.aRed}</b> · A/B on a green day: <b>{matrix.aGreen}</b> · C/failure on a green day: <b>{matrix.failGreen}</b> · C/failure on a red day: <b>{matrix.failRed}</b></>}
      </p>
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr style={{ color: MUTED, textAlign: "left" }}>
            <th style={{ fontWeight: 500 }}>Day</th><th style={{ fontWeight: 500, textAlign: "right" }}>Trades</th><th style={{ fontWeight: 500, textAlign: "right" }}>Webull net</th>
            {PROCESS_CATEGORIES.map(c => <th key={c.id} style={{ fontWeight: 500, textAlign: "center" }} title={c.label}>{c.label.split(" ")[0]}</th>)}
            <th style={{ fontWeight: 500 }}>Process</th>
          </tr>
        </thead>
        <tbody>
          {days.slice(0, shown).map(d => {
            const s = scores[d.day] ?? {};
            const g = gradeDay(s);
            return (
              <tr key={d.day} data-day={d.day} style={{ borderTop: `1px solid ${LINE}`, color: INK }}>
                <td style={{ padding: "3px 0" }}>{d.day}</td>
                <td style={{ textAlign: "right" }}>{d.trades}</td>
                <td style={{ textAlign: "right", color: d.net > 0 ? UP : d.net < 0 ? DOWN : INK }}>{usd(d.net)}</td>
                {PROCESS_CATEGORIES.map(c => (
                  <td key={c.id} style={{ textAlign: "center" }}>
                    <select aria-label={`${c.label} on ${d.day}`} value={s[c.id] ?? ""} onChange={ev => set(d.day, c.id, ev.target.value === "" ? null : (Number(ev.target.value) as 0 | 1 | 2))}
                      style={{ background: "#0b0a08", color: INK, border: `1px solid ${LINE}`, borderRadius: 4, fontSize: 11 }}>
                      <option value="">–</option><option value="0">0</option><option value="1">1</option><option value="2">2</option>
                    </select>
                  </td>
                ))}
                <td style={{ color: g ? INK : MUTED, whiteSpace: "nowrap" }}>{g ? `${g.total} · ${g.grade}` : "not graded"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {days.length > shown ? <button type="button" onClick={() => setShown(n => n + 20)} style={{ marginTop: 6, fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Older days ({days.length - shown})</button> : null}
    </section>
  );
}
