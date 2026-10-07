"use client";

/**
 * MORNING PREP · TODAY'S MANAGEMENT RULES — Garden 19 §55.
 *
 * Patience and management are prepared before the bell, in the trader's own
 * words. Saved for today's market day only; offered to the plan card as
 * defaults (the trader confirms them there), and the session-plan line rides
 * onto the next decision frozen today. No score, no streak, no verdict.
 */

import { traderClock } from "@/components/time/traderClock";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { LOOP_DOORS } from "@/lib/journal/planLoop";

import { readDayRules, writeDayRules } from "@/lib/journal/managementDayRules";
import { conditionReadback } from "@/components/journal/ManagementPlanCard";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";
const field: React.CSSProperties = { boxSizing: "border-box", minWidth: 0, width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 13, padding: "6px 8px", borderRadius: 6, minHeight: 36 };
const store = (): Storage | null => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };

export function TodayManagementRules() {
  const [conditions, setConditions] = useState("");
  const [hold, setHold] = useState("");
  const [sessionPlan, setSessionPlan] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    const r = readDayRules(store(), Date.now());
    if (!r) return;
    setConditions(r.conditions.join("\n"));
    setHold(r.expectedHoldMin != null ? String(r.expectedHoldMin) : "");
    setSessionPlan(r.sessionPlan ?? "");
    setSavedAt(r.updatedAtMs);
  }, []);
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
          {savedAt != null ? `Kept for today (${traderClock(savedAt, { seconds: false })}). The session plan rides onto each decision frozen today unless its card names another session.` : "Nothing saved for today. Blank stays blank — WM never fills it in."}
        </span>
        <Link href={LOOP_DOORS.CHART} prefetch={false} data-testid="day-rules-to-chart" style={{ fontSize: 12, color: GOLD }}>Open the chart — your ticket&apos;s plan card offers these →</Link>
      </div>
    </section>
  );
}
