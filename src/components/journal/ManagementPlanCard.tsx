"use client";

/**
 * THE PLAN CARD — Garden 19 §27 on the existing ticket / decision surfaces.
 *
 * TICKET mode (live ticket on /charts, paper ticket on /paper): before the
 * trade, the trader writes the parts of the plan the ticket does not carry —
 * invalidation, management conditions, expected hold, context, session. It is
 * a DRAFT for the market in view until the Decision_ID becomes a trade (the
 * send / the first paper fill), when it is frozen with the ticket's stop and
 * target. Once frozen, the card shows the plan and takes dated AMENDMENTS
 * with a "new evidence" note — the frozen plan itself never changes.
 *
 * STORY mode (a story's Review): amendments, or — when nothing was frozen —
 * recording the plan now, marked as written after the trade.
 *
 * Nothing here touches an order. Amending the stop in the plan does not move
 * the stop at the broker; the card says so.
 */

import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import { traderClock } from "@/components/time/traderClock";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { LOOP_DOORS } from "@/lib/journal/planLoop";

import { freezePlanSnapshot, parseManagementCondition, planLine, type ManagementPlanSnapshot, type TraderPlanInput } from "@/lib/journal/managementPlan";
import { DRAFT_MAX_AGE_MS, latestPlanForSymbol, readDraft, writeDraft } from "@/lib/journal/managementPlanDraft";
import { draftWithDayRules, readDayRules, type ManagementDayRules } from "@/lib/journal/managementDayRules";
import { readTodaysIntention } from "@/lib/journal/morningPrepIntention";
import { erasePlanForDecision } from "@/lib/journal/managementPlanErase";
import { appendPlanAmendment, freezePlanOnce, readPlanForDecision } from "@/lib/journal/managementPlanStore";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";
const field: React.CSSProperties = { boxSizing: "border-box", minWidth: 0, width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: "4px 6px", borderRadius: 4, minHeight: 28 };

const store = (): Storage | null => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };
const numOrNull = (s: string) => { const x = Number(s.trim()); return s.trim() !== "" && Number.isFinite(x) && x > 0 ? x : null; };

interface DraftForm { invalidation: string; invalidationPx: string; conditions: string; expectedHoldMin: string; context: string; session: string }
const EMPTY_DRAFT: DraftForm = { invalidation: "", invalidationPx: "", conditions: "", expectedHoldMin: "", context: "", session: "" };

function toPlan(f: DraftForm): TraderPlanInput {
  return {
    invalidation: f.invalidation || null,
    invalidationPx: numOrNull(f.invalidationPx),
    conditions: f.conditions.split("\n").map(s => s.trim()).filter(Boolean),
    expectedHoldMin: numOrNull(f.expectedHoldMin),
    context: f.context || null,
    session: f.session || null,
  };
}

function fromPlan(p: TraderPlanInput): DraftForm {
  return {
    invalidation: p.invalidation ?? "", invalidationPx: p.invalidationPx != null ? String(p.invalidationPx) : "",
    conditions: (p.conditions ?? []).join("\n"), expectedHoldMin: p.expectedHoldMin != null ? String(p.expectedHoldMin) : "",
    context: p.context ?? "", session: p.session ?? "",
  };
}

/** What the trader's condition words will be checked as — said before the trade, not after. */
export function conditionReadback(text: string): string {
  const c = parseManagementCondition(text);
  if (!c) return "";
  switch (c.kind) {
    case "BREAKEVEN_AFTER_R": return `checked: stop to breakeven only after +${c.triggerR}R prints`;
    case "REDUCE_AT_TARGET": return `checked: reduce at target ${c.targetIndex}`;
    case "TIME_STOP": return `checked: exit after ${c.minutes} min`;
    case "TRAIL_STOP": return "checked: stop may trail toward the market";
    case "ADD_ALLOWED": return "kept: adding is part of the plan";
    case "WALK_AWAY_AFTER_PROTECTION": return "checked: no order changes after the stop is protected";
    default: return "kept in your words (WM cannot check it automatically)";
  }
}

function DraftFields({ f, set }: { f: DraftForm; set: (f: DraftForm) => void }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 6 }}>
        <label style={{ color: MUTED, fontSize: 11 }}>Invalidation (words)
          <input data-testid="plan-invalidation" aria-label="Invalidation, in your words — what would prove the trade wrong" value={f.invalidation} onChange={e => set({ ...f, invalidation: e.target.value })} placeholder="e.g. loses the opening-range low" style={field} />
        </label>
        <label style={{ color: MUTED, fontSize: 11 }}>Invalidation price
          <input data-testid="plan-invalidation-px" aria-label="Invalidation price" inputMode="decimal" value={f.invalidationPx} onChange={e => set({ ...f, invalidationPx: e.target.value })} style={field} />
        </label>
      </div>
      <label style={{ color: MUTED, fontSize: 11 }}>Management conditions (one per line)
        <textarea data-testid="plan-conditions" aria-label="Management conditions, one per line (for example: move to breakeven after +1R)" rows={2} value={f.conditions} onChange={e => set({ ...f, conditions: e.target.value })}
          placeholder={"move to breakeven after +1R\nreduce at target 1"} style={field} />
      </label>
      {f.conditions.split("\n").map(s => s.trim()).filter(Boolean).map((s, i) => (
        <span key={i} data-testid="plan-condition-readback" style={{ fontSize: 10.5, color: MUTED }}>“{s}” — {conditionReadback(s)}</span>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 6 }}>
        <label style={{ color: MUTED, fontSize: 11 }}>Expected hold (min)
          <input data-testid="plan-hold" aria-label="Expected hold, in minutes" inputMode="numeric" value={f.expectedHoldMin} onChange={e => set({ ...f, expectedHoldMin: e.target.value })} style={field} />
        </label>
        <label style={{ color: MUTED, fontSize: 11 }}>Session
          <input data-testid="plan-session" aria-label="Session you plan to trade (for example: NY open)" value={f.session} onChange={e => set({ ...f, session: e.target.value })} placeholder="e.g. NY open" style={field} />
        </label>
        <label style={{ color: MUTED, fontSize: 11 }}>Context
          <input data-testid="plan-context" aria-label="Context you see (for example: above VWAP, trend day)" value={f.context} onChange={e => set({ ...f, context: e.target.value })} placeholder="e.g. above VWAP, trend day" style={field} />
        </label>
      </div>
    </div>
  );
}

function AmendForm({ snap, onSaved }: { snap: ManagementPlanSnapshot; onSaved: (s: ManagementPlanSnapshot) => void }) {
  const [a, setA] = useState({ stopPx: "", targetPx: "", invalidationPx: "", expectedHoldMin: "", newEvidence: "", note: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const save = () => {
    const r = appendPlanAmendment(store(), snap.base.decisionId, {
      atMs: Date.now(), stopPx: numOrNull(a.stopPx), targetPx: numOrNull(a.targetPx), invalidationPx: numOrNull(a.invalidationPx),
      expectedHoldMin: numOrNull(a.expectedHoldMin), newEvidence: a.newEvidence || null, note: a.note || null,
    });
    if (!r.ok) { setMsg(r.reason); return; }
    setMsg("Amendment recorded, dated now. The plan as frozen is unchanged.");
    setA({ stopPx: "", targetPx: "", invalidationPx: "", expectedHoldMin: "", newEvidence: "", note: "" });
    onSaved(r.snapshot);
  };
  return (
    <details data-testid="plan-amend" style={{ border: `1px dashed ${LINE}`, borderRadius: 6, padding: "4px 6px" }}>
      <summary style={{ cursor: "pointer", color: GOLD, fontSize: 11 }}>Amend the plan (dated now)</summary>
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 6 }}>
          {(["stopPx", "targetPx", "invalidationPx", "expectedHoldMin"] as const).map(k => (
            <label key={k} style={{ color: MUTED, fontSize: 11 }}>{k === "stopPx" ? "New stop" : k === "targetPx" ? "New target" : k === "invalidationPx" ? "New invalidation" : "New hold (min)"}
              <input data-testid={`plan-amend-${k}`} aria-label={k === "stopPx" ? "New stop price" : k === "targetPx" ? "New target price" : k === "invalidationPx" ? "New invalidation price" : "New expected hold, in minutes"} inputMode="decimal" value={a[k]} onChange={e => setA({ ...a, [k]: e.target.value })} style={field} />
            </label>
          ))}
        </div>
        <label style={{ color: MUTED, fontSize: 11 }}>New evidence — what changed in the market that the plan did not know?
          <textarea data-testid="plan-amend-evidence" aria-label="New evidence: what changed in the market that the plan did not know" rows={2} value={a.newEvidence} onChange={e => setA({ ...a, newEvidence: e.target.value })} style={field} />
        </label>
        <label style={{ color: MUTED, fontSize: 11 }}>Note (optional)
          <input data-testid="plan-amend-note" aria-label="Note on this change (optional)" value={a.note} onChange={e => setA({ ...a, note: e.target.value })} style={field} />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" data-testid="plan-amend-save" onClick={save} style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 10px", minHeight: 30, cursor: "pointer" }}>Record amendment</button>
          <span style={{ fontSize: 10.5, color: MUTED }}>Records your plan change only — it does not move any order at the broker.</span>
        </div>
        {msg ? <span role="status" style={{ fontSize: 11, color: INK }}>{msg}</span> : null}
      </div>
    </details>
  );
}

/** §47–51: delete the plan (its amendments and the "why did the plan change?" answer go with it). Two presses, no dialog. */
function ErasePlan({ decisionId, onErased }: { decisionId: string; onErased: () => void }) {
  const [armed, setArmed] = useState(false);
  // An armed delete that waits forever is a trap for the next tap (sheriff
  // sweep 2026-10-07, phone): it stands down on its own after 6 s, and says so.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6_000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} aria-live="polite">
      <button type="button" data-testid={armed ? "plan-erase-confirm" : "plan-erase"} onClick={() => {
        if (!armed) { setArmed(true); return; }
        erasePlanForDecision(store(), decisionId);
        setArmed(false);
        onErased();
      }} style={{ fontSize: 11, color: armed ? "#e0786b" : MUTED, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>
        {armed ? "Press again within 6 s to delete this plan and its amendments" : "Delete this plan"}
      </button>
      {armed ? <button type="button" onClick={() => setArmed(false)} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>Keep it</button> : null}
    </span>
  );
}

function FrozenPlan({ snap, onAmended }: { snap: ManagementPlanSnapshot; onAmended: (s: ManagementPlanSnapshot) => void }) {
  const at = snap.frozenAt === "TICKET_SEND" ? "at the ticket's send" : snap.frozenAt === "PAPER_FILL" ? "at the paper fill" : "after the trade (journal)";
  return (
    <div data-testid="plan-card-frozen" data-frozen-at={snap.frozenAt} style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: INK }}>Frozen {at} · Decision_ID {snap.base.decisionId}</span>
      <span style={{ fontSize: 11, color: MUTED }}>{planLine(snap)}</span>
      {snap.amendments.map((a, i) => (
        <span key={i} data-testid="plan-card-amendment" style={{ fontSize: 10.5, color: MUTED }}>
          {traderClock(a.atMs, { seconds: false })} amendment
          {a.stopPx != null ? ` · stop ${a.stopPx}` : ""}{a.targetPx != null ? ` · target ${a.targetPx}` : ""}{a.invalidationPx != null ? ` · invalidation ${a.invalidationPx}` : ""}{a.expectedHoldMin != null ? ` · hold ${a.expectedHoldMin} min` : ""}
          {a.newEvidence ? ` · new evidence: ${a.newEvidence}` : " · no new evidence recorded"}{a.note ? ` · ${a.note}` : ""}
        </span>
      ))}
      <AmendForm snap={snap} onSaved={onAmended} />
    </div>
  );
}

export function ManagementPlanCard(props:
  | { readonly mode: "ticket"; readonly symbol: string }
  | { readonly mode: "story"; readonly decisionId: string; readonly symbol?: string | null; readonly initial?: ManagementPlanSnapshot | null; readonly onPlanChange?: (s: ManagementPlanSnapshot | null) => void }) {
  const [frozen, setFrozen] = useState<ManagementPlanSnapshot | null>(props.mode === "story" ? props.initial ?? null : null);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [newPlan, setNewPlan] = useState(false);
  const [dayRules, setDayRules] = useState<ManagementDayRules | null>(null);
  // Morning Prep's own words for the day — read-only here, frozen with the plan at send (morningPrepIntention).
  const [intention, setIntention] = useState<string | null>(null);
  const symbol = props.symbol ?? null;
  const decisionId = props.mode === "story" ? props.decisionId : null;

  const refresh = useCallback(() => {
    const st = store();
    if (props.mode === "story") { const read = readPlanForDecision(st, decisionId); if (read) setFrozen(read); }
    else setFrozen(latestPlanForSymbol(st, symbol, Date.now() - DRAFT_MAX_AGE_MS));
    const d = props.mode === "ticket" ? readDraft(st, symbol) : null;
    setDraft(d ? fromPlan(d.plan) : EMPTY_DRAFT);
    setSavedAt(d?.updatedAtMs ?? null);
    setDayRules(props.mode === "ticket" ? readDayRules(st, Date.now()) : null);
    setIntention(props.mode === "ticket" ? readTodaysIntention(Date.now()) : null);
  }, [props.mode, decisionId, symbol]);
  const ownerVersion = useManagementOwnerVersion();   // re-read under the member AuthContext resolves
  useEffect(() => { refresh(); }, [refresh, ownerVersion]);

  const onAmended = (s: ManagementPlanSnapshot) => { setFrozen(s); if (props.mode === "story") props.onPlanChange?.(s); };
  const onErased = () => { setFrozen(null); if (props.mode === "story") props.onPlanChange?.(null); };

  if (props.mode === "story") {
    // The Review's "WHAT YOU PLANNED" column already states the frozen plan and its amendments; here, only the amend form.
    if (frozen) return <div data-testid="plan-card" data-mode="story" style={{ display: "grid", gap: 6 }}><AmendForm snap={frozen} onSaved={onAmended} /><ErasePlan decisionId={frozen.base.decisionId} onErased={onErased} /></div>;
    const record = () => {
      const snap = freezePlanSnapshot({ decisionId: props.decisionId, frozenAt: "JOURNAL_ENTRY", atMs: Date.now(), source: "written in Review after the trade", plan: { symbol, ...toPlan(draft) } });
      if (freezePlanOnce(store(), snap) === "FROZEN" && snap) { setFrozen(snap); props.onPlanChange?.(snap); }
    };
    return (
      <details data-testid="plan-card" data-mode="story" style={{ border: `1px dashed ${LINE}`, borderRadius: 6, padding: "4px 6px" }}>
        <summary style={{ cursor: "pointer", color: GOLD, fontSize: 11 }}>No plan was frozen for this decision — record it now (marked as written after the trade)</summary>
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          <DraftFields f={draft} set={setDraft} />
          <button type="button" data-testid="plan-record-after" onClick={record} style={{ justifySelf: "start", fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 10px", minHeight: 30, cursor: "pointer" }}>Record plan (after the trade)</button>
        </div>
      </details>
    );
  }

  const save = (f: DraftForm) => {
    setDraft(f);
    const d = writeDraft(store(), props.symbol, toPlan(f), Date.now());
    setSavedAt(d?.updatedAtMs ?? null);
  };
  return (
    <details data-testid="plan-card" data-mode="ticket" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }} open={!!frozen || savedAt != null}>
      <summary style={{ cursor: "pointer", color: GOLD, fontWeight: 600, fontSize: 12, lineHeight: 1.35, minHeight: 28 }}>Plan · {props.symbol} <span style={{ color: MUTED, fontWeight: 400 }}>invalidation, management, hold</span></summary>
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {frozen && !newPlan ? (
          <>
            <FrozenPlan snap={frozen} onAmended={onAmended} />
            <ErasePlan decisionId={frozen.base.decisionId} onErased={onErased} />
            <Link href={LOOP_DOORS.JOURNAL} prefetch={false} data-testid="plan-card-to-journal" style={{ fontSize: 11, color: GOLD }}>After the trade: review this decision in the Journal →</Link>
            <button type="button" onClick={() => setNewPlan(true)} style={{ justifySelf: "start", fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Write a plan for the next trade on {props.symbol} →</button>
          </>
        ) : (
          <>
            {intention ? (
              <p data-testid="plan-day-intention" style={{ margin: 0, fontSize: 10.5, color: MUTED, overflowWrap: "anywhere" }}>
                Today&apos;s intention (Morning Prep): <span style={{ color: INK }}>{intention}</span>
                {!draft.context ? " — joins this decision at its freeze." : " — your own context above is frozen instead."}
              </p>
            ) : null}
            {dayRules && (dayRules.conditions.length || dayRules.expectedHoldMin != null) ? (
              <div data-testid="plan-day-rules" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 10.5, color: MUTED }}>
                <span>Today&apos;s rules from Morning Prep: {[...dayRules.conditions, dayRules.expectedHoldMin != null ? `hold ${dayRules.expectedHoldMin} min` : ""].filter(Boolean).join(" · ")}</span>
                <button type="button" data-testid="plan-use-day-rules" onClick={() => save(fromPlan(draftWithDayRules(toPlan(draft), dayRules)))}
                  style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 8px", minHeight: 28, cursor: "pointer" }}>Use today&apos;s rules</button>
              </div>
            ) : null}
            {!dayRules ? <Link href={LOOP_DOORS.MORNING_PREP} prefetch={false} data-testid="plan-card-to-prep" style={{ fontSize: 10.5, color: MUTED }}>No management rules for today yet — set them in Morning Prep →</Link> : null}
            {dayRules?.sessionPlan ? <span data-testid="plan-day-session" style={{ fontSize: 10.5, color: MUTED }}>Session plan (Morning Prep): {dayRules.sessionPlan} — joins this decision at its freeze unless you name a session below.</span> : null}
            <DraftFields f={draft} set={save} />
            <span data-testid="plan-draft-state" style={{ fontSize: 10.5, color: MUTED }}>
              {savedAt != null ? "Draft kept on this device. It is frozen with the ticket's stop and target when this decision becomes a trade (the send, or the first paper fill) — after that, changes are dated amendments." : "Anything left blank stays UNRECORDED — WM never fills it in."}
            </span>
          </>
        )}
      </div>
    </details>
  );
}
