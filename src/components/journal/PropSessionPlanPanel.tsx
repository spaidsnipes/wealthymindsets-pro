"use client";

/**
 * TODAY'S RISK PLAN — one session sized against the evaluation's own rules (Megazord order §6, 2026-10-20).
 * Mounted inside the Prop Evaluation desk (owner only, through PropEvaluationGate), beside ACCOUNT TRUTH.
 *
 * The desk hands over what it already knows — drawdown headroom, contract limit, whether the figures were
 * read back from the firm. The trader adds the instrument, stop in ticks, risk per trade, fees, daily loss
 * limit, today's result and how many attempts. All arithmetic is propSessionPlan.ts. Nothing is sent
 * anywhere; the plan is kept on this device only, beside the desk record, and never in a proof scene.
 */

import React, { useEffect, useMemo, useState } from "react";

import { AMBER, BTN, FIELD, Fact, Fold, GOLD, GREEN, GRID, INK, LABEL, LINE, MUTED, MoneyField, RED, say } from "@/components/journal/propDeskParts";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { hydrateJournalEntries } from "@/lib/journal/hydrateJournalEntries";
import { marketDayKey } from "@/lib/journal/localDayKey";
import { liveJournalRecords } from "@/lib/journal/paperEntry";
import { JOURNAL_UPDATED_EVENT, readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { formatCents } from "@/lib/journal/propEvaluation";
import {
  EMPTY_SESSION_RECORD, SESSION_ATTEMPTS, SESSION_ATTEMPTS_LABEL, SESSION_ATTEMPTS_LINE, SESSION_FIELD_LABEL, SESSION_ILLUSTRATION_LABEL, SESSION_TEXT_MAX,
  editSessionPlan, lockSessionPlan, readSessionAgainstDay, readSessionPlan, readStoredSessionRecord, sessionPlanKeyFor, sessionSamplePlan, startNewSessionPlan, storedSessionRecord,
  type JournaledTrade, type SessionAccountContext, type SessionPlanInputs, type SessionPlanRecord,
} from "@/lib/journal/propSessionPlan";

const wholeOrNull = (v: string, prev: number | null): number | null => {
  const t = v.trim();
  return t === "" ? null : /^\d{1,4}$/.test(t) && Number(t) > 0 ? Number(t) : prev;
};

export function PropSessionPlanPanel({ storageKey, sample = false, account }: {
  /** The desk's owner-scoped key, or null (sample / no owner). */
  readonly storageKey: string | null;
  readonly sample?: boolean;
  readonly account: SessionAccountContext;
}): React.ReactElement {
  const [rec, setRec] = useState<SessionPlanRecord>(sample ? { ...EMPTY_SESSION_RECORD, plan: sessionSamplePlan() } : EMPTY_SESSION_RECORD);
  const p = rec.plan;
  const [loaded, setLoaded] = useState(sample);
  const key = storageKey ? sessionPlanKeyFor(storageKey) : null;
  useEffect(() => {
    if (sample) return;
    let stored: SessionPlanRecord | null = null;
    try { stored = key ? readStoredSessionRecord(JSON.parse(window.localStorage.getItem(key) ?? "null")) : null; } catch { stored = null; }
    setRec(stored ?? EMPTY_SESSION_RECORD);
    setLoaded(true);
  }, [key, sample]);
  useEffect(() => {
    if (sample || !loaded || !key || proofSceneHoldsWrites()) return;
    try { window.localStorage.setItem(key, JSON.stringify(storedSessionRecord(rec))); } catch { /* blocked: the plan still works for this visit */ }
  }, [rec, loaded, key, sample]);

  // After the session: today's journal entries, read through the Journal's own reader (never in a sample).
  const [trades, setTrades] = useState<readonly JournaledTrade[]>([]);
  useEffect(() => {
    if (sample) return;
    const read = () => {
      try {
        const r = readJournalStorage(window.localStorage);
        // Paper is never mixed into live results (paperEntry.ts): only live records count against the day.
        setTrades(hydrateJournalEntries(liveJournalRecords(r.records)).entries.map(e => ({ date: e.date, pnl: e.pnl, dayModel: e.dayModel, brokerConfirmed: !!e.capture })));
      } catch { setTrades([]); }
    };
    read();
    window.addEventListener(JOURNAL_UPDATED_EVENT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(JOURNAL_UPDATED_EVENT, read); window.removeEventListener("storage", read); };
  }, [sample]);
  const edit = (patch: Partial<SessionPlanInputs>) => setRec(prev => editSessionPlan(prev, patch, Date.now()));
  const lockedAt = rec.lockedAtMs === null ? null : new Date(rec.lockedAtMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  // Today's loss is the larger of what is typed and what the journal holds for the market day — the
  // daily room never ignores a loss the trader has already journaled.
  const journaledNet = useMemo(() => (sample ? null : readSessionAgainstDay(rec, trades, marketDayKey(), account).dayNetCents), [sample, rec, trades, account]);
  const usesJournal = journaledNet !== null && journaledNet < (p.netTodayCents ?? 0);
  const plan = useMemo(() => readSessionPlan(usesJournal ? { ...p, netTodayCents: journaledNet } : p, account), [p, account, usesJournal, journaledNet]);
  const entered = p.setup.trim() !== "" || p.symbol.trim() !== "" || p.stopTicks !== null || p.riskPerTradeCents !== null || p.dailyLossLimitCents !== null;
  const summary = plan.status === "SIZED"
    ? `${plan.contracts} ${plan.root} · ${formatCents(plan.tradeRiskCents)} a trade · ${SESSION_ATTEMPTS_LABEL[plan.attempts].toLowerCase()}`
    : entered ? "not sized yet" : "not entered";
  const tone = plan.status !== "SIZED" ? MUTED : plan.verdict === "WITHIN_LIMITS" ? GREEN : plan.verdict === "BREAKS_A_LIMIT" ? RED : AMBER;

  return (
    <div data-testid="prop-session" data-verdict={plan.status === "SIZED" ? plan.verdict : "NOT_SIZED"}
      style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "rgba(11,11,13,0.9)", padding: 12, display: "grid", gap: 10 }}>
      <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD, fontWeight: 800 }}>TODAY&apos;S RISK PLAN · sized against the rules above</span>
      <Fold key={`session-${loaded}`} id="session" title="Setup, stop and risk" summary={summary} startOpen={entered}>
        <div style={GRID}>
          <label style={{ ...LABEL, gridColumn: "1 / -1" }}><span>Setup you are waiting for (your words)</span>
            <input value={p.setup} maxLength={SESSION_TEXT_MAX} data-testid="prop-session-setup" onChange={e => edit({ setup: e.target.value })} style={FIELD} autoComplete="off" /></label>
          <label style={{ ...LABEL, gridColumn: "1 / -1" }}><span>Where the idea is wrong (invalidation)</span>
            <input value={p.invalidation} maxLength={SESSION_TEXT_MAX} data-testid="prop-session-invalidation" onChange={e => edit({ invalidation: e.target.value })} style={FIELD} autoComplete="off" /></label>
          <label style={LABEL}><span>Instrument (e.g. MNQ1!, /MES)</span>
            <input value={p.symbol} maxLength={16} data-testid="prop-session-symbol" onChange={e => edit({ symbol: e.target.value.toUpperCase() })} style={FIELD} autoComplete="off" /></label>
          <label style={LABEL}><span>Stop distance in ticks</span>
            <input inputMode="numeric" value={p.stopTicks ?? ""} data-testid="prop-session-ticks" onChange={e => edit({ stopTicks: wholeOrNull(e.target.value, p.stopTicks) })} style={FIELD} /></label>
          <MoneyField label="Most you choose to risk on one trade (fees included)" valueCents={p.riskPerTradeCents} onCommit={c => edit({ riskPerTradeCents: c })} testId="prop-session-risk" />
          <MoneyField label="Round-trip fees per contract" valueCents={p.feesPerContractCents} onCommit={c => edit({ feesPerContractCents: c })} />
          <MoneyField label="Daily loss limit (the firm's, or yours if tighter)" valueCents={p.dailyLossLimitCents} onCommit={c => edit({ dailyLossLimitCents: c })} testId="prop-session-daily" />
          <div style={{ display: "grid", gap: 3 }}>
            <MoneyField label="Today's result so far (a loss with a minus sign)" allowNegative valueCents={p.netTodayCents} onCommit={c => edit({ netTodayCents: c })} />
            {usesJournal ? <span data-testid="prop-session-uses-journal" style={{ fontSize: 11, color: AMBER }}>Your journal holds {formatCents(journaledNet!)} for today, a larger loss than typed — the daily room uses it.</span> : null}
          </div>
          <label style={LABEL}><span>Your maximum trades today (optional)</span>
            <input inputMode="numeric" value={p.maxTradesPerDay ?? ""} onChange={e => edit({ maxTradesPerDay: wholeOrNull(e.target.value, p.maxTradesPerDay) })} style={FIELD} /></label>
        </div>
        <div role="group" aria-label="Attempts today" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SESSION_ATTEMPTS.map(a => (
            <button key={a} type="button" aria-pressed={p.attempts === a} data-testid="prop-session-attempts" data-attempts={a} onClick={() => edit({ attempts: a })}
              style={{ ...BTN, color: p.attempts === a ? INK : GOLD, background: p.attempts === a ? "rgba(201,165,92,0.18)" : "none" }}>{SESSION_ATTEMPTS_LABEL[a]}</button>
          ))}
        </div>
        <span data-testid="prop-session-attempts-line" style={{ fontSize: 11, color: MUTED }}>{SESSION_ATTEMPTS_LINE}</span>
      </Fold>

      {plan.status === "SIZED" ? (
        <>
          <div style={GRID} data-testid="prop-session-reading">
            <Fact testId="prop-session-contracts" label={`Contracts (whole, rounded down${plan.cappedByContractLimit ? " — capped by the contract limit" : ""})`} value={`${plan.contracts} ${plan.root}`} />
            <Fact label="One contract at the stop, with fees" value={formatCents(plan.perContractRiskCents)} />
            <Fact testId="prop-session-trade-risk" label="One trade carries" value={`${formatCents(plan.tradeRiskCents)}${plan.unusedRiskCents ? ` (${formatCents(plan.unusedRiskCents)} of your risk unused)` : ""}`} />
            <Fact testId="prop-session-day" label={`${SESSION_ATTEMPTS_LABEL[plan.attempts]} — the most the day can cost`} value={formatCents(plan.dayExposureCents)} />
            <Fact label="Daily loss room left" value={say(plan.dailyRemainingCents, formatCents)} />
            <Fact label="Drawdown headroom (from the account above)" value={say(plan.drawdownHeadroomCents, formatCents)} />
          </div>
          <div style={{ border: `1px dashed ${AMBER}`, borderRadius: 8, padding: 8, display: "grid", gap: 4 }} data-testid="prop-session-illustration">
            <span style={{ fontSize: 10, letterSpacing: 0.8, color: AMBER, fontWeight: 800 }}>{SESSION_ILLUSTRATION_LABEL}</span>
            <span style={{ fontSize: 12, color: INK }}>Before the daily limit: {say(plan.lossesToDailyLimit, n => `${n} such loss${n === 1 ? "" : "es"}`)} · before the drawdown floor: {say(plan.lossesToDrawdownFloor, n => `${n} such loss${n === 1 ? "" : "es"}`)}</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {plan.checks.map(c => (
              <li key={c.id} data-testid="prop-session-check" data-check={c.id} data-state={c.state} style={{ fontSize: 12, color: c.state === "OK" ? INK : c.state === "BREAKS" ? RED : MUTED, overflowWrap: "anywhere" }}>
                <b style={{ fontWeight: 700 }}>{c.label}:</b> {c.words}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span data-testid="prop-session-why" style={{ fontSize: 12, color: MUTED, overflowWrap: "anywhere" }}>{plan.why}</span>
      )}
      {/* Lock before the bell: the plan as locked is kept; later changes are listed, never written over it. */}
      {plan.status === "SIZED" && rec.lockedAtMs === null ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button type="button" data-testid="prop-session-lock" disabled={sample} onClick={() => setRec(prev => lockSessionPlan(prev, Date.now()))}
            style={{ ...BTN, opacity: sample ? 0.5 : 1 }}>Lock plan before the session</button>
          <span style={{ fontSize: 11, color: MUTED }}>Locking keeps this plan as it is now. You can still change it later; each change is listed beside the lock.</span>
        </div>
      ) : null}
      {rec.lockedAtMs !== null ? (
        <div data-testid="prop-session-locked" data-amendments={rec.amendments.length} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: rec.amendments.length ? AMBER : GREEN }}>
            LOCKED {lockedAt}{rec.amendments.length ? ` · ${rec.amendments.length} change${rec.amendments.length === 1 ? "" : "s"} after the lock` : " · as planned"}
          </span>
          {rec.amendments.length ? (
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 2 }}>
              {rec.amendments.map((a, i) => (
                <li key={i} data-testid="prop-session-amendment" style={{ fontSize: 11, color: INK, overflowWrap: "anywhere" }}>
                  {new Date(a.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {SESSION_FIELD_LABEL[a.field]}: {a.from} → {a.to}
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" data-testid="prop-session-new-day" onClick={() => setRec(prev => startNewSessionPlan(prev))} style={{ ...BTN, justifySelf: "start" }}>Start a new day&apos;s plan</button>
        </div>
      ) : null}
      {!sample && plan.status === "SIZED" ? (() => {
        const v = readSessionAgainstDay(rec, trades, marketDayKey(), account);
        return (
          <div data-testid="prop-session-after" data-differences={v.differences.length} style={{ borderTop: `1px dashed ${LINE}`, paddingTop: 8, display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD, fontWeight: 800 }}>AFTER THE SESSION · the day as journaled, beside the {v.basis === "LOCKED" ? "locked" : "draft (not locked)"} plan</span>
            <div style={GRID}>
              <Fact label="Trades journaled · attempts planned" value={`${v.tradesJournaled} · ${v.tradesPlanned}`} />
              <Fact label="Largest loss · planned for one trade" value={`${formatCents(v.largestLossCents)} · ${v.plannedTradeRiskCents === null ? "—" : formatCents(v.plannedTradeRiskCents)}`} />
              <Fact label="The day so far" value={formatCents(v.dayNetCents)} />
            </div>
            {v.differences.map(d => <span key={d.id} data-testid="prop-session-difference" data-difference={d.id} style={{ fontSize: 12, color: AMBER, overflowWrap: "anywhere" }}>{d.words}</span>)}
            <span style={{ fontSize: 12, color: INK }}>{v.line}</span>
            <span style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>From your journal entries for {v.day} (New York market day){v.tradesJournaled ? ` — ${v.brokerConfirmed} broker-confirmed, the rest as you typed them` : ""}. The plan above is not changed by this.</span>
          </div>
        );
      })() : null}
      <p role="status" data-testid="prop-session-verdict" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tone, overflowWrap: "anywhere" }}>
        {plan.status === "SIZED" ? plan.verdictLine : "No plan sized yet."}
      </p>
    </div>
  );
}

export default PropSessionPlanPanel;
