"use client";

/**
 * MORNING PREP · "PROP EVALUATION · TODAY" (Founder order §7, Monday preparation; 2026-10-10).
 *
 * Owner-only, inside the existing /morning-prep room. It READS the same
 * device-local record the Journal's prop-evaluation desk keeps — through the
 * desk's own reader (`readPropStored`) and engine (`readPropEvaluation`); no
 * copy of a rule lives here — and states where the evaluation stands before
 * the bell: verified or not, what remains of the requirement, the best-day
 * share, the fewest further profitable days the arithmetic allows, and the
 * drawdown headroom (or UNKNOWN) — and, when the Journal holds one, today's risk plan read through
 * propSessionPlan.ts against that same reading (2026-10-21).
 *
 * It sets no goal for the day. One fixed sentence says so. No dollar amount is
 * phrased as something to make today (propEvaluationToday.sentinel).
 *
 * Silent for a member, a guest, or while the audience is unknown (the same
 * server answer the desk's gate asks). With nothing entered it says only where
 * the desk is. Writes nothing.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { PROP_EVALUATION_BASE_KEY } from "@/components/journal/PropEvaluationGate";
import { useAuth } from "@/contexts/AuthContext";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { memberKeyOf } from "@/lib/journal/managementOwner";
import { formatCents, pct, PROP_UNVERIFIED, readPropEvaluation, readPropStored, type Known, type PropStored } from "@/lib/journal/propEvaluation";
import { readSessionPlan, readStoredSessionRecord, sessionPlanKeyFor, SESSION_ATTEMPTS_LABEL, type SessionPlanRecord } from "@/lib/journal/propSessionPlan";

export const PROP_TODAY_RULES_LINE = "These are the rules, not a target for today. No trade is required." as const;
export const PROP_TODAY_EMPTY_LINE = "No evaluation entered — open the Journal's desk." as const;

const GOLD = "#d4af37", INK = "#ede6d3", MUTED = "#a89c80", LINE = "rgba(212,175,55,0.28)";
const say = <T,>(k: Known<T>, fmt: (v: T) => string): string => (k.known ? fmt(k.value) : k.why);
const when = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(ms));

/** Has the trader entered anything the engine can read? */
export function propDeskHasEntry(s: PropStored | null): boolean {
  if (!s) return false;
  const i = s.inputs;
  return i.days.length > 0 || i.startingBalanceCents !== null || i.currentBalanceCents !== null || i.profitTargetCents !== null;
}

/** The card itself — pure (the stored record in, markup out). */
export function PropEvaluationTodayView({ stored, sessionPlan = null }: { readonly stored: PropStored | null; readonly sessionPlan?: SessionPlanRecord | null }): React.ReactElement {
  const box = { border: `1px solid ${LINE}`, borderRadius: 12, padding: "12px 14px", background: "rgba(212,175,55,0.04)", color: INK } as const;
  if (!propDeskHasEntry(stored)) {
    return (
      <section data-testid="prop-today" data-state="EMPTY" aria-label="Prop evaluation today" style={box}>
        <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: ".06em" }}>PROP EVALUATION · TODAY</div>
        <p style={{ margin: "6px 0 0", fontSize: 13 }}>
          {PROP_TODAY_EMPTY_LINE} <Link href="/journal" style={{ color: GOLD }}>Journal →</Link>
        </p>
      </section>
    );
  }
  const x = stored!.inputs;
  const r = readPropEvaluation(x);
  const verified = x.verifiedAtMs !== null ? `Read back from the firm's dashboard · ${when(x.verifiedAtMs)}` : `${PROP_UNVERIFIED} — not yet read back from the firm's dashboard`;
  const rows: [string, string, string][] = [
    ["Remaining requirement", say(r.remainingCents, formatCents), "prop-today-remaining"],
    ["Best-day share", say(r.bestDayShare, v => `${pct(v)} (limit ${pct(x.consistencyLimit)})`), "prop-today-share"],
    ["Fewest further profitable days the arithmetic allows", say(r.minimumFurtherProfitableDays, n => `${n}`), "prop-today-days"],
    ["Drawdown headroom", say(r.drawdownHeadroomCents, formatCents), "prop-today-headroom"],
  ];
  // The Journal's risk plan, read through its own engine against the same account reading — never a copy.
  const plan = sessionPlan ? readSessionPlan(sessionPlan.plan, { drawdownHeadroomCents: r.drawdownHeadroomCents, contractLimit: x.contractLimit, verified: r.verified }) : null;
  if (plan?.status === "SIZED") rows.push(
    ["Risk plan", `${plan.contracts} ${plan.root} · ${SESSION_ATTEMPTS_LABEL[plan.attempts].toLowerCase()}`, "prop-today-plan"],
    ["One trade carries · the day at most", `${formatCents(plan.tradeRiskCents)} · ${formatCents(plan.dayExposureCents)}`, "prop-today-plan-risk"],
    ["Plan against the limits", plan.verdict === "WITHIN_LIMITS" ? "Within the limits entered" : plan.verdict === "BREAKS_A_LIMIT" ? `Breaks ${plan.checks.filter(c => c.state === "BREAKS").length} — open the desk` : "Cannot say yet", "prop-today-plan-verdict"],
    ["Plan locked", sessionPlan!.lockedAtMs === null ? "Not locked yet — lock it on the desk before the session" : `${when(sessionPlan!.lockedAtMs)}${sessionPlan!.amendments.length ? ` · ${sessionPlan!.amendments.length} change${sessionPlan!.amendments.length === 1 ? "" : "s"} after the lock` : " · as planned"}`, "prop-today-plan-lock"],
  );
  return (
    <section data-testid="prop-today" data-state={x.verifiedAtMs !== null ? "VERIFIED" : "UNVERIFIED"} aria-label="Prop evaluation today" style={box}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: ".06em" }}>PROP EVALUATION · TODAY{x.nickname ? ` · ${x.nickname}` : ""}</div>
      <p data-testid="prop-today-verified" style={{ margin: "4px 0 8px", fontSize: 12, color: x.verifiedAtMs !== null ? INK : "#e0786b" }}>{verified}</p>
      <dl style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "4px 12px", margin: 0, fontSize: 13 }}>
        {rows.map(([k, v, id]) => (
          <React.Fragment key={k}>
            <dt style={{ color: MUTED }}>{k}</dt>
            <dd data-testid={id} style={{ margin: 0, textAlign: "right", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p data-testid="prop-today-rules" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 600 }}>{PROP_TODAY_RULES_LINE}</p>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED }}>
        Kept on this device only. Your prep checklist on this page holds the levels (support, resistance, VWAP, POC), the opening range and the order-flow read. <Link href="/journal" style={{ color: GOLD }}>Open the desk →</Link>
      </p>
    </section>
  );
}

/** The door: owner only (the server's answer), reads the desk's own record, writes nothing. */
export function PropEvaluationToday(): React.ReactElement | null {
  const { user } = useAuth();
  const audience = useBrokerAudience();
  const [stored, setStored] = useState<PropStored | null | undefined>(undefined);
  const [sessionPlan, setSessionPlan] = useState<SessionPlanRecord | null>(null);
  useEffect(() => {
    if (audience !== "OWNER" || !user?.id) { setStored(undefined); return; }
    const deskKey = memberKeyOf(PROP_EVALUATION_BASE_KEY, user.id);
    try { setStored(readPropStored(JSON.parse(window.localStorage.getItem(deskKey) ?? "null"))); }
    catch { setStored(null); }
    try { setSessionPlan(readStoredSessionRecord(JSON.parse(window.localStorage.getItem(sessionPlanKeyFor(deskKey)) ?? "null"))); }
    catch { setSessionPlan(null); }
  }, [audience, user?.id]);
  if (audience !== "OWNER" || !user?.id || stored === undefined) return null;
  return <PropEvaluationTodayView stored={stored} sessionPlan={sessionPlan} />;
}

export default PropEvaluationToday;
