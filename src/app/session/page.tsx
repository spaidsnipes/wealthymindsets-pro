"use client";

/**
 * SESSION DESK (ATH mockup S-SD1, 2026-11-12) — the trader's own day in one room:
 *   · TODAY · TARGET LOCK   target, max loss, today's result as he reads it from his firm; the Giveback meter;
 *                           "I'm done" — locks every WM Pro screen until he signs back in. No orders are sent.
 *   · PROP · CONSISTENCY    the prop desk's own account: the max day that keeps the target, and "can I take the
 *                           whole target today?" (owner only, like the desk it reads).
 *   · CHECKPOINT            the MNQ → NQ guard on every symbol switch in the app.
 *   · TOE WHOOPER           the day's verdict from his numbers, and a share card.
 * Everything here is his typed numbers on this device. Nothing is estimated and nothing is sent anywhere.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { useBrokerAudience } from "@/lib/broker/useBrokerAudience";
import { memberKeyOf } from "@/lib/journal/managementOwner";
import { PROP_EVALUATION_BASE_KEY } from "@/components/journal/PropEvaluationGate";
import { formatCents, parseMoneyToCents, pct, readPropStored } from "@/lib/journal/propEvaluation";
import { readPropTodayCap, type PropTodayCap } from "@/lib/journal/propTodayCap";
import { enterResult, lockNow, LOCK_SENDS_NO_ORDERS, money, SESSION_DEVICE_LINE, type SessionDay } from "@/lib/session/sessionDay";
import { useSessionDay } from "@/components/session/useSessionDay";
import { GivebackMeter, ToeWhooperCard } from "@/components/session/SessionVerdict";
import { QuantumDayCard } from "@/components/session/QuantumDayCard";
import { BeliefChainCard } from "@/components/session/BeliefChainCard";
import { EmergencyCorner, flattenAskHref } from "@/components/session/EmergencyCorner";
import { RedZoneCard } from "@/components/session/RedZoneCard";

const GOLD = "#d4a94a", MUTED = "#9a927f", LINE = "#3a2f17";
const card: React.CSSProperties = { border: `1px solid ${LINE}`, background: "linear-gradient(#0e0d0b,#090908)", borderRadius: 10, padding: 16, minWidth: 0 };
const title: React.CSSProperties = { font: "600 11px Inter, system-ui", letterSpacing: ".22em", color: GOLD, textTransform: "uppercase", marginBottom: 10 };
const field: React.CSSProperties = { width: "100%", minHeight: 40, background: "#07080a", border: "1px solid #3a3326", borderRadius: 6, color: "#ede6d3", padding: "6px 10px", fontSize: 15 };

function MoneyField({ label, cents, onCents, testid, signed = false }: {
  readonly label: string; readonly cents: number | null; readonly onCents: (c: number | null) => void; readonly testid: string; readonly signed?: boolean;
}) {
  const [raw, setRaw] = useState(cents == null ? "" : (cents / 100).toFixed(2));
  useEffect(() => { setRaw(cents == null ? "" : (cents / 100).toFixed(2)); }, [cents]);
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12, color: MUTED }}>
      {label}
      <input data-testid={testid} inputMode="decimal" value={raw} style={field} placeholder={signed ? "e.g. 312.50 or -80" : "e.g. 300"}
        onChange={e => setRaw(e.target.value)}
        onBlur={() => {
          if (raw.trim() === "") { onCents(null); return; }
          const c = parseMoneyToCents(raw);
          if (c == null || (!signed && c <= 0)) { setRaw(cents == null ? "" : (cents / 100).toFixed(2)); return; }
          onCents(c);
        }} />
    </label>
  );
}

function PropCard({ cap }: { readonly cap: PropTodayCap | null }) {
  return (
    <section style={card} data-testid="session-prop" data-whole={cap?.known ? String(cap.wholeTargetToday) : "UNKNOWN"}>
      <div style={title}>Prop · consistency</div>
      {cap == null ? (
        <div style={{ color: MUTED, fontSize: 13 }}>No prop account on this device yet. Enter it once in <Link prefetch={false} href="/journal" style={{ color: GOLD }}>Journal › Prop Evaluation</Link>; this card reads that desk.</div>
      ) : !cap.known ? (
        <div style={{ color: MUTED, fontSize: 13 }}>{cap.why}</div>
      ) : (
        <>
          <div style={{ color: MUTED, fontSize: 12 }}>Required {formatCents(cap.requiredNetCents)} · net so far {formatCents(cap.netCents)} · best day {formatCents(cap.largestDayCents)} · rule {pct(cap.limit)}</div>
          <div style={{ font: "700 28px Georgia, serif", marginTop: 6 }} data-testid="session-max-day">{formatCents(cap.maxDayCents)}</div>
          <div style={{ color: MUTED, fontSize: 12 }}>largest day that keeps the requirement at {formatCents(cap.requiredNetCents)}</div>
          <div style={{ marginTop: 12, fontSize: 14 }}>Whole target today{cap.remainingCents > 0 ? ` (${formatCents(cap.remainingCents)})` : ""}? <b style={{ color: cap.wholeTargetToday ? "#2ec4a0" : "#e5546b" }}>{cap.wholeTargetToday ? "YES" : "NO"}</b></div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{cap.words}</div>
          <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>Arithmetic on the days in your prop desk — read your firm&apos;s rules back before you rely on it.</div>
        </>
      )}
    </section>
  );
}

export default function SessionDeskPage() {
  usePublishOsStanding({ surface: "Session", feed: FEEDLESS_SURFACE });
  const { user, loading } = useAuth();
  const audience = useBrokerAudience();
  const { day, update } = useSessionDay();
  const [cap, setCap] = useState<PropTodayCap | null>(null);

  useEffect(() => {
    if (audience !== "OWNER" || !user?.id) { setCap(null); return; }
    try {
      const stored = readPropStored(JSON.parse(window.localStorage.getItem(memberKeyOf(PROP_EVALUATION_BASE_KEY, user.id)) ?? "null"));
      setCap(stored ? readPropTodayCap(stored.inputs) : null);
    } catch { setCap(null); }
  }, [audience, user?.id]);

  if (loading) return null;
  if (!user) return <div style={{ padding: 24, color: MUTED }}>Sign in to open your Session Desk.</div>;
  if (!day) return null;
  const set = (patch: Partial<SessionDay>) => update(d => ({ ...d, ...patch }));

  return (
    <div data-testid="session-desk" style={{ height: "100%", overflowY: "auto", background: "#07080a", color: "#ede6d3", padding: "20px 16px 80px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <h1 style={{ font: "600 clamp(26px, 5vw, 34px) Georgia, serif", color: GOLD, margin: "0 0 4px", letterSpacing: ".04em" }}>SESSION DESK</h1>
        <div style={{ color: MUTED, letterSpacing: ".18em", fontSize: 11, textTransform: "uppercase", marginBottom: 18 }}>{day.day} · {SESSION_DEVICE_LINE}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <section style={card} data-testid="session-today">
            <div style={title}>Today · target lock</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <MoneyField label="Daily target ($)" testid="session-target" cents={day.targetCents} onCents={c => set({ targetCents: c })} />
              <MoneyField label="Max loss ($)" testid="session-maxloss" cents={day.maxLossCents} onCents={c => set({ maxLossCents: c })} />
            </div>
            <div style={{ marginTop: 10 }}>
              <MoneyField label="Today's result, from your firm's dashboard ($)" testid="session-result" signed cents={day.netCents} onCents={c => update(d => enterResult(d, c, Date.now()))} />
            </div>
            <div style={{ font: "700 28px Georgia, serif", marginTop: 10, color: day.netCents == null ? MUTED : day.netCents >= 0 ? "#2ec4a0" : "#e5546b" }}>{day.netCents == null ? "—" : money(day.netCents)}</div>
            <div style={{ color: MUTED, fontSize: 12 }}>Peak today {day.peakCents == null ? "—" : money(day.peakCents)}{day.updatedAtMs ? ` · typed ${new Date(day.updatedAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</div>
            <GivebackMeter day={day} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 8 }}>
              <input type="checkbox" checked={day.lockOnTarget} onChange={e => set({ lockOnTarget: e.target.checked })} data-testid="session-lock-on-target" />
              Lock the screen when I reach the target (and at max loss)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 6 }}>
              <input type="checkbox" checked={day.lockMode === "REST_OF_DAY"} onChange={e => set({ lockMode: e.target.checked ? "REST_OF_DAY" : "UNTIL_SIGN_IN" })} />
              Keep it locked for the rest of the day (signing back in won&apos;t lift it)
            </label>
            <Link prefetch={false} href={flattenAskHref()} data-testid="session-done-flatten"
              style={{ display: "block", textAlign: "center", marginTop: 14, padding: "12px 0", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, fontWeight: 800, letterSpacing: ".1em", textDecoration: "none" }}>
              I&apos;M DONE · 1 — CLOSE WHAT&apos;S OPEN
            </Link>
            <div style={{ color: MUTED, fontSize: 11.5, marginTop: 4 }}>Opens the ticket with FLATTEN loaded: you see the symbol, quantity, side and account, and nothing is sent until you confirm it there.</div>
            <button type="button" data-testid="session-done" onClick={() => update(d => lockNow(d, "DONE", Date.now()))}
              style={{ marginTop: 14, width: "100%", minHeight: 46, border: `1px solid ${GOLD}`, color: GOLD, background: "transparent", borderRadius: 8, fontWeight: 800, letterSpacing: ".12em", cursor: "pointer" }}>
              I&apos;M DONE · 2 — LOCK THE SCREEN
            </button>
            <div style={{ color: MUTED, fontSize: 11.5, marginTop: 6 }}>{LOCK_SENDS_NO_ORDERS}</div>
          </section>

          {audience === "OWNER" ? <PropCard cap={cap} /> : null}

          <section style={card} data-testid="session-checkpoint" data-armed={String(day.checkpointArmed)}>
            <div style={title}>Checkpoint guard</div>
            <div style={{ font: "700 26px Georgia, serif" }}>{day.checkpointArmed ? "Micros only" : "Off"}</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>While armed, switching MNQ → NQ (or MES → ES, MYM → YM, M2K → RTY, MGC → GC, MCL → CL) anywhere in WM Pro asks first, and &ldquo;switch anyway&rdquo; waits five seconds.</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 10 }}>
              <input type="checkbox" checked={day.checkpointArmed} onChange={e => set({ checkpointArmed: e.target.checked })} data-testid="session-checkpoint-armed" />
              Arm the checkpoint
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, color: MUTED, marginTop: 10 }}>
              Your checkpoint, in your words
              <input value={day.checkpointNote} maxLength={80} placeholder="e.g. 24,900 — no NQ" style={field} onChange={e => set({ checkpointNote: e.target.value })} />
            </label>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>Guards WM Pro only — TradingView and your firm&apos;s platform are not reached from here.</div>
            <div style={{ ...title, marginTop: 18 }}>Fight model · on the chart</div>
            <div style={{ color: MUTED, fontSize: 12 }}>Switch on <b>Bias &amp; Tape Regime — why</b> in Tools: the chip beside price reads KNOCKOUT (trend tape at its leading edge), BODY SHOTS (balance tape away from the middle — the middle is marked) or WAIT.</div>
          </section>

          <EmergencyCorner day={day} update={update} card={card} title={title} />
          <RedZoneCard card={card} title={title} />
          <BeliefChainCard card={card} title={title} />
          <QuantumDayCard card={card} title={title} />

          <section style={{ ...card, gridColumn: "1 / -1", borderColor: GOLD }} data-testid="session-complete">
            <div style={{ ...title, textAlign: "center" }}>Session complete</div>
            <ToeWhooperCard day={day} big />
          </section>
        </div>
      </div>
    </div>
  );
}
