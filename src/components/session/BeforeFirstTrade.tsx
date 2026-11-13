"use client";

/**
 * BEFORE THE FIRST TRADE (Founder 2026-11-13, after a rough session: "Session Desk / Emergency Corner / morning routine
 * front and center on login before the first trade"). On the chart, once per market day, until he has set today's
 * target and max loss AND done the belief check before the bell — or said "not today". Three doors, nothing more:
 * Morning Prep · Session Desk (target / max loss / belief chain) · Emergency Corner. It never blocks the chart.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { memberKeyOf } from "@/lib/journal/managementOwner";
import { marketDayKey } from "@/lib/journal/localDayKey";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { BELIEF_BASE_KEY, chainReading, readBeliefDay } from "@/lib/session/beliefChain";
import { useSessionDay } from "./useSessionDay";

export const BEFORE_FIRST_TRADE_KEY = "wm_before_first_trade_v1";
const GOLD = "#d4a94a";

export function BeforeFirstTrade() {
  const { user } = useAuth();
  const { day } = useSessionDay();
  const [state, setState] = useState<{ belief: boolean; dismissed: boolean } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const today = marketDayKey();
    let belief = false, dismissed = false;
    try { belief = chainReading(readBeliefDay(JSON.parse(localStorage.getItem(memberKeyOf(BELIEF_BASE_KEY, user.id)) ?? "null"), today).pre).answered > 0; } catch { /* none */ }
    try { dismissed = localStorage.getItem(memberKeyOf(BEFORE_FIRST_TRADE_KEY, user.id)) === today; } catch { /* none */ }
    setState({ belief, dismissed });
  }, [user?.id]);
  // Proof scenes (scene=clean / capture) measure the chart alone.
  if (!user?.id || !day || !state || state.dismissed || proofSceneHoldsWrites()) return null;
  const limitsSet = day.targetCents != null && day.maxLossCents != null;
  if (limitsSet && state.belief) return null;
  const dismiss = () => {
    try { if (!proofSceneHoldsWrites()) localStorage.setItem(memberKeyOf(BEFORE_FIRST_TRADE_KEY, user.id), marketDayKey()); } catch { /* page only */ }
    setState(s => (s ? { ...s, dismissed: true } : s));
  };
  const door: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: `1px solid ${GOLD}`, color: GOLD, fontWeight: 800, fontSize: 11.5, letterSpacing: ".06em", textDecoration: "none", whiteSpace: "nowrap" };
  return (
    <div role="region" aria-label="Before the first trade" data-testid="before-first-trade"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", margin: "6px 8px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.55)", background: "rgba(12,11,9,0.96)", color: "#ede6d3" }}>
      <span style={{ font: "600 11px Inter, system-ui", letterSpacing: ".2em", color: GOLD }}>BEFORE THE FIRST TRADE</span>
      <span style={{ fontSize: 12.5, color: "#c8c0ae", flex: "1 1 220px" }}>
        {!limitsSet ? "Set today's target and max loss" : "Target set"}{" · "}{state.belief ? "belief check done" : "do the belief check"} — then trade the plan.
      </span>
      <Link href="/morning-prep" prefetch={false} style={door}>MORNING PREP</Link>
      <Link href="/session" prefetch={false} style={door}>SESSION DESK</Link>
      <Link href="/session#emergency" prefetch={false} style={{ ...door, borderColor: "#e5546b", color: "#f2a3a1" }}>EMERGENCY CORNER</Link>
      <button type="button" onClick={dismiss} style={{ minHeight: 30, padding: "0 10px", borderRadius: 6, border: "1px solid #3a3326", background: "transparent", color: "#9a927f", cursor: "pointer", fontSize: 11 }}>Not today</button>
    </div>
  );
}
