"use client";

/**
 * MORNING PREP · TODAY'S MANAGEMENT RULES — Garden 19 §55.
 *
 * Patience and management are prepared before the bell, in the trader's own
 * words. Saved for today's market day only; offered to the plan card as
 * defaults (the trader confirms them there), and the session-plan line rides
 * onto the next decision frozen today. No score, no streak, no verdict.
 */

import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import { traderClock } from "@/components/time/traderClock";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { LOOP_DOORS } from "@/lib/journal/planLoop";

import { dayRulesSession, dayRulesSummaryLine, readDayRules, writeDayRules, type DayRulesSession, type ManagementDayRules } from "@/lib/journal/managementDayRules";
import { conditionReadback } from "@/components/journal/ManagementPlanCard";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";
const field: React.CSSProperties = { boxSizing: "border-box", minWidth: 0, width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 13, padding: "6px 8px", borderRadius: 6, minHeight: 36 };
const store = (): Storage | null => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };

export function TodayManagementRules(props: { readonly nowMs?: number }) {
  const nowMs = props.nowMs;
  const [session, setSession] = useState<DayRulesSession | null>(() => (nowMs != null ? dayRulesSession(nowMs) : null));
  const [conditions, setConditions] = useState("");
  const [hold, setHold] = useState("");
  const [sessionPlan, setSessionPlan] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ownerVersion = useManagementOwnerVersion();
  useEffect(() => {
    setSession(dayRulesSession(nowMs ?? Date.now()));
    const r = readDayRules(store(), Date.now());
    if (!r) return;
    setConditions(r.conditions.join("\n"));
    setHold(r.expectedHoldMin != null ? String(r.expectedHoldMin) : "");
    setSessionPlan(r.sessionPlan ?? "");
    setSavedAt(r.updatedAtMs);
  }, [ownerVersion]);
  const save = () => {
    const h = Number(hold.trim());
    const r = writeDayRules(store(), { conditions: conditions.split("\n"), expectedHoldMin: hold.trim() && Number.isFinite(h) && h > 0 ? h : null, sessionPlan: sessionPlan || null }, Date.now());
    setSavedAt(r?.updatedAtMs ?? null);
  };
  const lines = conditions.split("\n").map(s => s.trim()).filter(Boolean);
  return (
    <section data-testid="today-management-rules" aria-label="Today's management rules" className="rounded-2xl p-5" style={{ border: `1px solid ${LINE}`, display: "grid", gap: 8 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 800, color: GOLD, margin: 0 }}>Today&apos;s management rules</p>
        <p style={{ fontSize: 13, color: MUTED, margin: "4px 0 0" }}>How you intend to manage trades today, before the bell. The plan card on your ticket offers these as defaults — they join a plan only when you confirm them there.</p>
      </div>
      {session ? (
        <p data-testid="day-rules-session-clock" data-closed={session.allClosed ? "CLOSED" : "OPEN_SOMEWHERE"} style={{ margin: 0, fontSize: 12, color: session.allClosed ? GOLD : MUTED, overflowWrap: "anywhere" }}>
          {session.line}
        </p>
      ) : null}
      <label style={{ color: MUTED, fontSize: 12 }}>Management rules (one per line)
        <textarea data-testid="day-rules-conditions" rows={3} value={conditions} onChange={e => setConditions(e.target.value)} placeholder={"move to breakeven after +1R\nreduce at target 1"} style={field} />
      </label>
      {lines.map((s, i) => <span key={i} style={{ fontSize: 11, color: MUTED }}>“{s}” — {conditionReadback(s)}</span>)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <label style={{ color: MUTED, fontSize: 12 }}>Default expected hold (min)
          <input data-testid="day-rules-hold" inputMode="numeric" value={hold} onChange={e => setHold(e.target.value)} style={field} />
        </label>
        <label style={{ color: MUTED, fontSize: 12 }}>Session plan (one line)
          <input data-testid="day-rules-session" value={sessionPlan} onChange={e => setSessionPlan(e.target.value)} placeholder="e.g. NY open only; flat by 11:00 ET" style={field} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" data-testid="day-rules-save" onClick={save} style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: `1px solid ${LINE}`, background: "none", color: GOLD, fontWeight: 700, cursor: "pointer" }}>Save today&apos;s rules</button>
        <span role="status" style={{ fontSize: 12, color: MUTED }}>
          {savedAt != null ? `Kept for today (${traderClock(savedAt, { seconds: false })}). The session plan rides onto each decision frozen today unless its card names another session.` : "Nothing saved for today. Write one rule above and press Save — blank stays blank, WM never fills it in."}
        </span>
        <Link href={LOOP_DOORS.CHART} prefetch={false} data-testid="day-rules-to-chart" style={{ fontSize: 12, color: GOLD }}>Open the chart — your ticket&apos;s plan card offers these →</Link>
      </div>
    </section>
  );
}

/**
 * THE JOURNAL'S READ-ONLY LINE — §55 residency. Today's management rules are
 * written in ONE place (Morning Prep, above); every other room shows them read
 * only, with the door back to that editor. No second editor exists.
 */
export function TodayRulesLine(props: { readonly rules?: ManagementDayRules | null }) {
  const [rules, setRules] = useState<ManagementDayRules | null | undefined>(props.rules);
  const ownerVersion = useManagementOwnerVersion();
  useEffect(() => { if (props.rules === undefined) setRules(readDayRules(store(), Date.now())); }, [props.rules, ownerVersion]);
  if (rules === undefined) return null;
  return (
    <div role="region" aria-label="Today's management rules" data-testid="journal-day-rules" data-saved={rules ? "YES" : "NO"}
      style={{ padding: "6px 16px", borderBottom: "1px solid rgba(139,106,41,0.15)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
      <span style={{ fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Today&apos;s rules</span>
      <span style={{ color: rules ? INK : MUTED, overflowWrap: "anywhere", minWidth: 0 }}>{dayRulesSummaryLine(rules)}</span>
      <Link href={LOOP_DOORS.MORNING_PREP} prefetch={false} data-testid="journal-day-rules-edit" className="wm-tap" style={{ color: GOLD, display: "inline-flex", alignItems: "center" }}>
        {rules ? "Edit in Morning Prep →" : "Set them in Morning Prep →"}
      </Link>
    </div>
  );
}
