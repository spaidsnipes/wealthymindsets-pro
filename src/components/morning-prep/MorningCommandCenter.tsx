"use client";

/**
 * MORNING COMMAND CENTER (Founder brief 2026-10-20) — the daily launchpad: wake target and the time to the open, the
 * passage and anchor, the market-data check, the top-down doors, the trade plan, readiness, the 10-second trigger
 * play and its log, and today's Student-of-the-Game lesson. One component in the existing Morning Prep room; the
 * protocol and today's record are the trader's own, saved to their account (/api/morning-prep/protocol).
 *
 * It decides nothing about the market. The data check is the trader's own pass/fail against the chart's badge — and
 * a FAIL is said at the top of this room in plain words, and the live order route refuses every NEW position while it
 * stands (dataCheckRefusal) — closing orders and cancels always go.
 */
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DAY_STEPS, DEFAULT_PROTOCOL, READINESS_CHECKS, TOP_DOWN_TFS, emptyDay, minutesToNyOpen, prepPace, protocolDate,
  triggerPattern, type DayRecord, type DayStepId, type MorningProtocol, type TriggerEntry,
} from "@/lib/morningProtocol/protocol";

const GOLD = "#d4af37", INK = "#ede6d3", MUTED = "#a69d89", LINE = "rgba(212,175,55,0.28)", RED = "#ff8a80", GREEN = "#7fd7a8";
const card: React.CSSProperties = { border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px", background: "rgba(14,12,9,0.72)" };
const h3: React.CSSProperties = { margin: "0 0 8px", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, fontWeight: 800 };
const field: React.CSSProperties = { width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, borderRadius: 6, padding: "8px 10px", fontSize: 14 };
const btn = (on = false): React.CSSProperties => ({ minHeight: 44, padding: "0 14px", borderRadius: 8, border: `1px solid ${on ? GOLD : LINE}`, background: on ? `${GOLD}22` : "transparent", color: on ? GOLD : INK, fontSize: 14, fontWeight: 700, cursor: "pointer" });

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`);
const fmtLocal = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };

export default function MorningCommandCenter() {
  const [protocol, setProtocol] = useState<MorningProtocol>(DEFAULT_PROTOCOL);
  const [day, setDay] = useState<DayRecord>(() => emptyDay(protocolDate(Date.now())));
  const [triggers, setTriggers] = useState<TriggerEntry[]>([]);
  const [status, setStatus] = useState<{ kind: "loading" | "ok" | "unsaved" | "error"; words: string }>({ kind: "loading", words: "Reading your protocol…" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MorningProtocol>(DEFAULT_PROTOCOL);
  const [now, setNow] = useState(() => Date.now());
  const [tEntry, setTEntry] = useState({ trigger: "", intensity: 5, action: "", interrupted: false, followedRules: false });
  const [playOpen, setPlayOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/morning-prep/protocol", { credentials: "include", cache: "no-store" })
      .then(async r => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
      .then(({ ok, status: st, body }) => {
        if (!alive) return;
        if (!ok || !body) { setStatus({ kind: "error", words: st === 401 ? "Sign in to keep your protocol — showing the founder defaults." : "Your protocol could not be read — showing the defaults; nothing you change here is saved until it can be." }); return; }
        setProtocol(body.protocol); setDraft(body.protocol); setDay(body.day); setTriggers(body.triggers ?? []);
        setStatus(body.stored ? { kind: "ok", words: body.isDefault ? "Founder defaults — Edit to make them yours. Saved to your account." : "Your protocol · saved to your account." } : { kind: "unsaved", words: body.why });
      })
      .catch(() => alive && setStatus({ kind: "error", words: "Offline — showing the defaults; nothing is saved." }));
    return () => { alive = false; };
  }, []);

  const putDay = useCallback((next: DayRecord) => {
    setDay(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/morning-prep/protocol", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ day: next }) })
        .then(r => setStatus(s => (r.ok ? { kind: "ok", words: `Today saved · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` } : { ...s, kind: "error", words: "Today's changes were not saved — check your connection." })))
        .catch(() => setStatus({ kind: "error", words: "Today's changes were not saved — offline." }));
    }, 600);
  }, []);

  const toggleStep = (id: DayStepId) => putDay({ ...day, done: day.done.includes(id) ? day.done.filter(x => x !== id) : [...day.done, id] });

  const saveProtocol = async () => {
    const r = await fetch("/api/morning-prep/protocol", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ protocol: draft }) }).catch(() => null);
    const body = r ? await r.json().catch(() => null) : null;
    if (r?.ok && body?.protocol) { setProtocol(body.protocol); setDraft(body.protocol); setEditing(false); setStatus({ kind: "ok", words: "Your protocol · saved to your account." }); }
    else setStatus({ kind: "error", words: "Your protocol was not saved." });
  };

  const logTrigger = async () => {
    const r = await fetch("/api/morning-prep/triggers", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(tEntry) }).catch(() => null);
    const body = r ? await r.json().catch(() => null) : null;
    if (r?.ok && body?.triggers) { setTriggers(body.triggers); setTEntry({ trigger: "", intensity: 5, action: "", interrupted: false, followedRules: false }); setStatus({ kind: "ok", words: "Trigger logged to your journal." }); }
    else setStatus({ kind: "error", words: body?.error ?? "The trigger was not logged." });
  };

  // ── the clock ────────────────────────────────────────────────────────────
  const d = new Date(now);
  const nowLocalMin = d.getHours() * 60 + d.getMinutes();
  const toOpen = minutesToNyOpen(now);
  const openLocal = new Date(now + toOpen * 60_000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const pace = prepPace({ wakeMinutesLocal: toMin(protocol.wakeTime), nowMinutesLocal: nowLocalMin, minutesToOpen: toOpen, stepsDone: day.done.length, stepsTotal: DAY_STEPS.length });
  const pressure = READINESS_CHECKS.filter(c => day.readiness[c.id] === true);
  const pattern = useMemo(() => triggerPattern(triggers), [triggers]);
  const firstSym = protocol.watchlist[0] ?? "NQ1!";
  const chartHref = (tf: string) => `/charts?symbol=${encodeURIComponent(firstSym)}&tf=${tf}`;
  const blocked = day.health === "FAIL";

  return (
    <section aria-label="Morning Command Center" data-testid="morning-command-center" style={{ display: "grid", gap: 14, margin: "8px 0 22px", color: INK }}>
      {/* the room's headline: time, pace, and a failed data check before anything else */}
      <div style={{ ...card, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 16px" }}>
          <span style={{ fontSize: 13, letterSpacing: "0.16em", color: GOLD, fontWeight: 800 }}>MORNING COMMAND CENTER</span>
          <span data-testid="mcc-clock" style={{ fontSize: 14, color: INK }}>
            Wake {fmtLocal(protocol.wakeTime)} · NY open {openLocal} your time {toOpen > 0 ? `· in ${fmtDur(toOpen)}` : "· the session is open"}
          </span>
          <span data-testid="mcc-pace" style={{ fontSize: 13, fontWeight: 800, color: pace === "BEHIND" ? RED : pace === "ON_PACE" ? GREEN : MUTED }}>
            {pace === "BEHIND" ? "RUNNING BEHIND — nothing is skipped; the risk checks still come first" : pace === "ON_PACE" ? `ON PACE · ${day.done.length}/${DAY_STEPS.length} done` : pace === "OPEN" ? `SESSION OPEN · ${day.done.length}/${DAY_STEPS.length} done` : "Before your wake time"}
          </span>
        </div>
        {blocked ? (
          <p role="alert" data-testid="mcc-blocked" style={{ margin: 0, padding: "8px 10px", borderRadius: 8, background: "rgba(122,42,34,.35)", color: "#F3EBDD", fontSize: 14, fontWeight: 600 }}>
            DATA CHECK FAILED — WM refuses every new position (tastytrade) until the chart&apos;s feed is resolved and the check is passed. Closing orders and
            cancels still go. A moving price or P&amp;L does not prove the candles are current.
          </p>
        ) : null}
        <p data-testid="mcc-status" style={{ margin: 0, fontSize: 13, color: status.kind === "error" ? RED : MUTED }}>{status.words}</p>
      </div>

      {/* the day's sequence */}
      <div style={card}>
        <h3 style={h3}>Today&apos;s sequence</h3>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {DAY_STEPS.map((s, i) => {
            const done = day.done.includes(s.id);
            return (
              <li key={s.id}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer" }}>
                  <input type="checkbox" checked={done} onChange={() => toggleStep(s.id)} data-testid={`mcc-step-${s.id}`} style={{ width: 20, height: 20, accentColor: GOLD }} />
                  {/* Name over hint (iPhone 2026-10-20: side by side, "1. Wake and reset" was squeezed into a narrow column). */}
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: done ? MUTED : INK, textDecoration: done ? "line-through" : "none" }}>{i + 1}. {s.name}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{s.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
      </div>

      {/* faith and mindset */}
      <div style={card} data-testid="mcc-faith">
        <h3 style={h3}>Scripture · mindset</h3>
        <p style={{ margin: "0 0 4px", fontSize: 16, lineHeight: 1.5 }}>&ldquo;{protocol.scripture.text}&rdquo;</p>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED }}>{protocol.scripture.ref} ({protocol.scripture.version})</p>
        {protocol.reflection ? <p style={{ margin: "0 0 6px", fontSize: 14 }}><b style={{ color: GOLD }}>Reflection · </b>{protocol.reflection}</p> : null}
        {protocol.prayer ? <p style={{ margin: "0 0 6px", fontSize: 14 }}><b style={{ color: GOLD }}>Prayer · </b>{protocol.prayer}</p> : null}
        <p data-testid="mcc-anchor" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: GOLD }}>{protocol.anchor}</p>
      </div>

      {/* market briefing — the rooms that hold it; WM has no economic-calendar feed and says so */}
      <div style={card} data-testid="mcc-briefing">
        <h3 style={h3}>Market briefing</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href="/news" prefetch={false} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>News · macro headlines →</Link>
          {protocol.watchlist.map(sym => (
            <Link key={sym} href={`/charts?symbol=${encodeURIComponent(sym)}&tf=15m`} prefetch={false} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>{sym} →</Link>
          ))}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED }}>WM has no economic-calendar feed yet — check today&apos;s scheduled releases at your broker or a calendar you trust before the open.</p>
      </div>

      {/* market-data health */}
      <div style={card} data-testid="mcc-health">
        <h3 style={h3}>Market-data health check</h3>
        <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.5 }}>
          Open <Link href={chartHref("1m")} style={{ color: GOLD }}>{firstSym} 1m</Link>. Pass only if the badge reads <b>LIVE — CERTIFIED QUOTE</b>, the bar
          clock reads <b>OPENED …</b> or <b>NEW BAR · AWAITING FIRST PRINT</b> (never <b>BARS BEHIND</b>), and the last candle&apos;s close moves with the price. A moving
          P&amp;L or quote alone is not proof.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" data-testid="mcc-health-pass" aria-pressed={day.health === "PASS"} onClick={() => putDay({ ...day, health: "PASS", done: day.done.includes("health") ? day.done : [...day.done, "health"] })} style={btn(day.health === "PASS")}>Pass — the chart is current</button>
          <button type="button" data-testid="mcc-health-fail" aria-pressed={day.health === "FAIL"} onClick={() => putDay({ ...day, health: "FAIL", done: day.done.filter(x => x !== "health") })} style={{ ...btn(day.health === "FAIL"), color: RED, borderColor: day.health === "FAIL" ? RED : LINE }}>Fail — something disagrees</button>
        </div>
      </div>

      {/* top-down */}
      <div style={card} data-testid="mcc-topdown">
        <h3 style={h3}>Top-down · {firstSym}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TOP_DOWN_TFS.map(tf => {
            const seen = day.tfDone.includes(tf);
            return (
              <span key={tf} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Link href={chartHref(tf)} prefetch={false} style={{ ...btn(seen), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>{tf.toUpperCase()}</Link>
                <label style={{ display: "inline-flex", alignItems: "center", minHeight: 44, minWidth: 44, justifyContent: "center", cursor: "pointer" }} title={`Mark ${tf} read`}>
                  <input type="checkbox" aria-label={`${tf} read`} checked={seen} onChange={() => putDay({ ...day, tfDone: seen ? day.tfDone.filter(x => x !== tf) : [...day.tfDone, tf] })} style={{ width: 18, height: 18, accentColor: GOLD }} />
                </label>
              </span>
            );
          })}
        </div>
      </div>

      {/* the plan */}
      <div style={card} data-testid="mcc-plan">
        <h3 style={h3}>Trade plan</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {([["regime", "Regime"], ["direction", "Direction"], ["structure", "External structure"], ["location", "Location"], ["orderFlow", "Order flow / CVD"], ["confirmation", "Confirmation"], ["invalidation", "Invalidation"], ["availableR", "Available R"]] as const).map(([k, label]) => (
            <label key={k} style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>{label}
              <input value={day.plan[k]} onChange={e => putDay({ ...day, plan: { ...day.plan, [k]: e.target.value } })} style={field} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {(["TRADE", "WAIT", "NO_TRADE"] as const).map(v => (
            <button key={v} type="button" aria-pressed={day.plan.decision === v} disabled={v === "TRADE" && blocked}
              onClick={() => putDay({ ...day, plan: { ...day.plan, decision: v } })} style={{ ...btn(day.plan.decision === v), opacity: v === "TRADE" && blocked ? 0.45 : 1 }}>
              {v === "NO_TRADE" ? "No trade" : v === "TRADE" ? "Trade" : "Wait"}
            </button>
          ))}
          {blocked ? <span style={{ alignSelf: "center", fontSize: 13, color: RED }}>Trade is closed while the data check has failed.</span> : null}
        </div>
      </div>

      {/* readiness */}
      <div style={card} data-testid="mcc-readiness">
        <h3 style={h3}>Mental readiness</h3>
        <div style={{ display: "grid", gap: 6 }}>
          {READINESS_CHECKS.map(c => (
            <div key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, flex: "1 1 220px" }}>{c.q}</span>
              <button type="button" aria-pressed={day.readiness[c.id] === true} onClick={() => putDay({ ...day, readiness: { ...day.readiness, [c.id]: true } })} style={btn(day.readiness[c.id] === true)}>Yes</button>
              <button type="button" aria-pressed={day.readiness[c.id] === false} onClick={() => putDay({ ...day, readiness: { ...day.readiness, [c.id]: false } })} style={btn(day.readiness[c.id] === false)}>No</button>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, flex: "1 1 220px" }}>Will I respect my risk limit{protocol.dailyRiskUsd != null ? ` ($${protocol.dailyRiskUsd})` : " (not set — Edit to set it)"}?</span>
            <button type="button" aria-pressed={day.respectRisk === true} onClick={() => putDay({ ...day, respectRisk: true })} style={btn(day.respectRisk === true)}>Yes</button>
            <button type="button" aria-pressed={day.respectRisk === false} onClick={() => putDay({ ...day, respectRisk: false })} style={btn(day.respectRisk === false)}>No</button>
          </div>
        </div>
        {pressure.length > 0 || day.respectRisk === false ? (
          <p data-testid="mcc-pressure" style={{ margin: "10px 0 0", fontSize: 14, color: RED, fontWeight: 600 }}>
            Pressure is here today ({[...pressure.map(p => p.id), ...(day.respectRisk === false ? ["risk"] : [])].join(", ")}). Run the 10-second interruption below before any order.
          </p>
        ) : null}
      </div>

      {/* trigger play + log */}
      <div style={card} data-testid="mcc-triggers">
        <h3 style={h3}>The 10-second interruption</h3>
        <ol style={{ margin: "0 0 10px 18px", padding: 0, fontSize: 14, lineHeight: 1.6 }}>
          <li><b>Catch it</b> — name the thought.</li>
          <li><b>Name it</b> — &ldquo;This is pressure, not market information.&rdquo;</li>
          <li><b>Pause</b> — hands off the order controls; one slow breath.</li>
          <li><b>Check the evidence</b> — higher timeframes, structure, location, order flow, actual risk.</li>
          <li><b>Choose</b> — trade only if the setup meets your written rules and the data is verified; otherwise wait or stop.</li>
        </ol>
        <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: GOLD }}>{protocol.anchor}</p>
        <button type="button" onClick={() => setPlayOpen(o => !o)} style={btn(playOpen)} aria-expanded={playOpen} data-testid="mcc-log-open">{playOpen ? "Close the log" : "Log a trigger"}</button>
        {playOpen ? (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {protocol.triggers.map(t => <button key={t} type="button" aria-pressed={tEntry.trigger === t} onClick={() => setTEntry({ ...tEntry, trigger: t })} style={{ ...btn(tEntry.trigger === t), fontWeight: 600 }}>{t}</button>)}
            </div>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Trigger (your words)
              <input value={tEntry.trigger} onChange={e => setTEntry({ ...tEntry, trigger: e.target.value })} style={field} data-testid="mcc-trigger-text" />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Intensity — {tEntry.intensity} / 10
              <input type="range" min={1} max={10} value={tEntry.intensity} onChange={e => setTEntry({ ...tEntry, intensity: Number(e.target.value) })} style={{ accentColor: GOLD, minHeight: 44 }} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>What I actually did
              <input value={tEntry.action} onChange={e => setTEntry({ ...tEntry, action: e.target.value })} style={field} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}><input type="checkbox" checked={tEntry.interrupted} onChange={e => setTEntry({ ...tEntry, interrupted: e.target.checked })} style={{ width: 18, height: 18, accentColor: GOLD }} /> I used my anchor and paused</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}><input type="checkbox" checked={tEntry.followedRules} onChange={e => setTEntry({ ...tEntry, followedRules: e.target.checked })} style={{ width: 18, height: 18, accentColor: GOLD }} /> I followed my rules (whatever the P&amp;L)</label>
            <button type="button" onClick={logTrigger} disabled={!tEntry.trigger.trim()} style={{ ...btn(true), opacity: tEntry.trigger.trim() ? 1 : 0.5 }} data-testid="mcc-log-save">Save to my trigger journal</button>
          </div>
        ) : null}
        <p data-testid="mcc-pattern" style={{ margin: "12px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          {pattern.n === 0 ? "No triggers logged yet. Your own log is what this room reads — it never guesses." :
            `From your own log (${pattern.n}): most often “${pattern.topTrigger}” (${pattern.topCount}×) · average intensity ${pattern.avgIntensity}/10 · paused ${pattern.interruptedPct}% · followed rules ${pattern.followedPct}%.`}
        </p>
      </div>

      {/* student of the game + review */}
      <div style={card} data-testid="mcc-student">
        <h3 style={h3}>Student of the Game · review</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>One lesson (a backtest, a replay or a past trade)
            <input value={day.lesson} onChange={e => putDay({ ...day, lesson: e.target.value })} style={field} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>One skill to practise today
            <input value={day.skill} onChange={e => putDay({ ...day, skill: e.target.value })} style={field} />
          </label>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 14 }}>After the session — did I follow my process (separate from the money)?</span>
          <button type="button" aria-pressed={day.followedRules === true} onClick={() => putDay({ ...day, followedRules: true })} style={btn(day.followedRules === true)}>Yes</button>
          <button type="button" aria-pressed={day.followedRules === false} onClick={() => putDay({ ...day, followedRules: false })} style={btn(day.followedRules === false)}>No</button>
        </div>
        <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED, marginTop: 10 }}>Review note
          <textarea value={day.reviewNote} onChange={e => putDay({ ...day, reviewNote: e.target.value })} rows={2} style={field} />
        </label>
        <p style={{ margin: "8px 0 0", fontSize: 13 }}>
          <Link href="/journal" style={{ color: GOLD }}>Journal →</Link>{" · "}<Link href="/backtesting" style={{ color: GOLD }}>Backtest lab →</Link>
        </p>
      </div>

      {/* settings */}
      <div style={card} data-testid="mcc-settings">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ ...h3, margin: 0 }}>Your protocol</h3>
          <button type="button" onClick={() => { setDraft(protocol); setEditing(e => !e); }} style={btn(editing)} data-testid="mcc-edit">{editing ? "Cancel" : "Edit"}</button>
        </div>
        {editing ? (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Wake target
              <input type="time" value={draft.wakeTime} onChange={e => setDraft({ ...draft, wakeTime: e.target.value })} style={{ ...field, maxWidth: 160 }} data-testid="mcc-wake" />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Passage reference
              <input value={draft.scripture.ref} onChange={e => setDraft({ ...draft, scripture: { ...draft.scripture, ref: e.target.value } })} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Passage text (and version)
              <textarea rows={2} value={draft.scripture.text} onChange={e => setDraft({ ...draft, scripture: { ...draft.scripture, text: e.target.value } })} style={field} />
              <input value={draft.scripture.version} onChange={e => setDraft({ ...draft, scripture: { ...draft.scripture, version: e.target.value } })} style={{ ...field, maxWidth: 160 }} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Reflection
              <textarea rows={2} value={draft.reflection} onChange={e => setDraft({ ...draft, reflection: e.target.value })} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Prayer prompt
              <textarea rows={2} value={draft.prayer} onChange={e => setDraft({ ...draft, prayer: e.target.value })} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Anchor phrase
              <input value={draft.anchor} onChange={e => setDraft({ ...draft, anchor: e.target.value })} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Trigger phrases (one per line)
              <textarea rows={5} value={draft.triggers.join("\n")} onChange={e => setDraft({ ...draft, triggers: e.target.value.split("\n") })} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Watchlist (comma separated — the first is the top-down symbol)
              <input value={draft.watchlist.join(", ")} onChange={e => setDraft({ ...draft, watchlist: e.target.value.split(",").map(s => s.trim()) })} style={field} />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Daily risk limit ($)
                <input inputMode="decimal" value={draft.dailyRiskUsd ?? ""} onChange={e => setDraft({ ...draft, dailyRiskUsd: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...field, maxWidth: 160 }} />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13, color: MUTED }}>Max trades today
                <input inputMode="numeric" value={draft.maxTrades ?? ""} onChange={e => setDraft({ ...draft, maxTrades: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...field, maxWidth: 160 }} />
              </label>
            </div>
            <button type="button" onClick={saveProtocol} style={btn(true)} data-testid="mcc-save">Save my protocol</button>
            <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Reminders and notifications are not built yet — this room shows your schedule; it does not send alerts.</p>
          </div>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED }}>
            Wake {fmtLocal(protocol.wakeTime)} · watchlist {protocol.watchlist.join(", ")} · risk limit {protocol.dailyRiskUsd != null ? `$${protocol.dailyRiskUsd}` : "not set"} · max trades {protocol.maxTrades ?? "not set"} · {protocol.triggers.length} trigger phrases
          </p>
        )}
      </div>
    </section>
  );
}
