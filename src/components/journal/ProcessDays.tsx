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
import { behaviourTags } from "@/lib/journal/behaviorTags";
import { dayEvidence, loopProgress, parseRestoration, RESTORATION_KEY, RESTORATION_STEPS, type RestorationDay, type RestorationStep } from "@/lib/journal/restorationLoop";

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
  // §47/§52: the Restoration Loop for a red day, beside that day's facts.
  const [restore, setRestore] = useState<Record<string, RestorationDay>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  useEffect(() => { try { setRestore(parseRestoration(localStorage.getItem(RESTORATION_KEY))); } catch { /* none */ } }, []);
  const tagsByDay = useMemo(() => {
    const tags = behaviourTags(episodes);
    const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    const m = new Map<string, ReturnType<typeof behaviourTags> extends Map<string, infer T> ? T[] : never>();
    for (const e of episodes) { const t = tags.get(e.id); if (!t) continue; const d = nyDay(e.openedAt); (m.get(d) ?? m.set(d, []).get(d)!).push(t); }
    return m;
  }, [episodes]);
  const writeStep = (day: string, step: RestorationStep, text: string) => {
    setRestore(prev => {
      const next = { ...prev, [day]: { notes: { ...(prev[day]?.notes ?? {}), [step]: text.slice(0, 600) }, updatedAt: Date.now() } };
      try { localStorage.setItem(RESTORATION_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
      return next;
    });
  };
  if (!days.length) return null;

  return (
    <section data-testid="process-days" aria-label="Process before P&L" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, overflowX: "auto", scrollMarginTop: 40 }}>
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
            <th style={{ fontWeight: 500 }}>Process</th><th />
          </tr>
        </thead>
        <tbody>
          {days.slice(0, shown).map(d => {
            const s = scores[d.day] ?? {};
            const g = gradeDay(s);
            return (
              <React.Fragment key={d.day}>
              <tr data-day={d.day} style={{ borderTop: `1px solid ${LINE}`, color: INK }}>
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
                <td>
                  {d.net < 0 ? (
                    <button type="button" data-testid="restore-open" aria-expanded={openDay === d.day} onClick={() => setOpenDay(o => (o === d.day ? null : d.day))}
                      style={{ fontSize: 10, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 4, padding: "0 6px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Restore {(() => { const pr = loopProgress(restore[d.day]); return pr.done ? `${pr.done}/${pr.total}` : ""; })()}
                    </button>
                  ) : null}
                </td>
              </tr>
              {openDay === d.day ? (
                <tr key={`${d.day}-restore`}>
                  <td colSpan={PROCESS_CATEGORIES.length + 5} style={{ padding: "6px 0 10px" }}>
                    <div data-testid="restoration-loop" style={{ border: `1px dashed ${LINE}`, borderRadius: 6, padding: 8, display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>RECOVERY ROOM · ATH RESTORATION LOOP · {d.day}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>
                        The day in facts: {d.trades} {d.trades === 1 ? "trade" : "trades"}, Webull net {usd(d.net)}, fees paid ${d.fees.toFixed(2)}.
                        {dayEvidence(tagsByDay.get(d.day) ?? []).map(x => ` ${x.label}: ${x.count}.`).join("")}
                        {" "}A loss is data, not a verdict on you.
                      </div>
                      {RESTORATION_STEPS.map(st => (
                        <label key={st.id} style={{ fontSize: 11, color: MUTED, display: "grid", gap: 2 }}>
                          <span><b style={{ color: INK }}>{st.label}</b> — {st.prompt}</span>
                          <textarea rows={1} value={restore[d.day]?.notes[st.id] ?? ""} onChange={ev => writeStep(d.day, st.id, ev.target.value)}
                            style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 4, borderRadius: 4, resize: "vertical" }} />
                        </label>
                      ))}
                      <div style={{ fontSize: 10, color: MUTED }}>{loopProgress(restore[d.day]).complete ? "Loop walked — repeat it the next time the pattern shows up." : "Walk it in order; your words stay on this device."}</div>
                    </div>
                  </td>
                </tr>
              ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {days.length > shown ? <button type="button" onClick={() => setShown(n => n + 20)} style={{ marginTop: 6, fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Older days ({days.length - shown})</button> : null}
    </section>
  );
}
