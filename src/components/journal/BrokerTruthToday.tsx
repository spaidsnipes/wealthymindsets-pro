"use client";

/**
 * BROKER TRUTH · TODAY — Garden 18 §XC/§XCI in the Journal room.
 *
 * The machine facts of today's trading, read from the broker (never browser
 * memory): orders in their WM order states and fills with price, quantity and
 * fees. Grouped into ONE story per Decision_ID for orders WM sent; orders placed
 * elsewhere are grouped as "placed outside WM". Fills carry tastytrade's own
 * transaction id, so a reload never tells a story twice. The human's lesson is
 * written in the journal below — this section never writes on the trader's
 * behalf.
 */

import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import { REVIEW_DIMENSIONS, REVIEW_QUESTION, cycleMark, readStoryReviews, reviewSummary, writeStoryReview, type ReviewDimension, type StoryReview } from "@/lib/journal/storyReview";
import type { ReviewEvidenceLine } from "@/lib/journal/captureReviewEvidence";
import { planLine } from "@/lib/journal/managementPlan";
import { composePlanReview, planReviewInputForBrokerStory, type PlanReviewInput } from "@/lib/journal/planReview";
import type { ManagementPlanSnapshot } from "@/lib/journal/managementPlan";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { pathWindowFor } from "@/lib/journal/planPricePath";
import { loadPlanPricePath } from "@/lib/journal/planPricePathLoader";
import type { PricePath } from "@/lib/journal/planVsActual";
import { ManagementPlanCard } from "@/components/journal/ManagementPlanCard";
import { formatMoney } from "@/lib/marketData/contractEconomics";
import { fvgAnswersFromReference, fvgContextFromLedger, fvgContextGroup, fvgReviewAnswersAt, type FvgReviewAnswers } from "@/lib/journal/planFvgContext";
import { loadFvgLedgerFor } from "@/lib/journal/planFvgLoader";
import { lessonForFinding } from "@/lib/journal/planLoop";
import { WEBULL_NOT_AUTO_CAPTURED } from "@/lib/journal/planActualsFromWebull";
import { fvgReferenceSentence, type JournalFvgReference } from "@/lib/journal/fvgDecisionReference";
import { AskSpaidbotButton } from "@/components/ai/AskSpaidbotButton";
import { reviewDecisionAsk } from "@/lib/ai/spaidbotAsk";
import { formatPlanContextLine } from "@/lib/ai/spaidbotPlanReview";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

interface FeedOrder { id: string; state: string; status: string; symbol: string | null; action: string | null; quantity: number | null; filled: number | null; price: string | null; externalId: string | null; decisionId: string | null; sentFromWm: boolean; orderType?: string | null; stopTrigger?: string | null; receivedAt?: string | null }
interface FeedFill { id: string; orderId: string | null; symbol: string | null; action: string | null; quantity: number | null; price: number | null; value: number | null; fees: number; executedAt: string | null; feesReported?: boolean; decisionId?: string | null; legCount?: number | null }
interface FeedAccount { tail: string; broker: string; state: string; reason?: string; orders: FeedOrder[]; fills: FeedFill[] }

interface Story { key: string; broker: string; decisionId: string | null; accountTail: string; orders: FeedOrder[]; fills: FeedFill[] }

/** Said in Review when a story has no Decision_ID from a WM ticket (§ empty states). */
export const PLAN_ABSENT_OUTSIDE_WM = "Placed outside WM, so no plan was frozen with this order. Send from the ticket's plan card next time and Review will compare the plan with what happened.";
export const PLAN_ABSENT_JOURNAL = "This entry did not come from a WM ticket, so there is no frozen plan to compare. Trades sent from the ticket's plan card carry one.";

/**
 * §XCI + §J — the trader's half of one story: ten separate marks, a note per
 * dimension, and their own words. `evidence` (from a captured fill) sets the
 * machine facts beside the dimension they inform; they are never edited here.
 */
export function StoryReviewRow({ storyKey, evidence, plan: planIn, planDecisionId, planSymbol, fvg: fvgIn, fvgRef, planAbsent, brokerNote, readOnly = false, defaultOpen = false }: {
  storyKey: string;
  evidence?: Readonly<Record<ReviewDimension, readonly ReviewEvidenceLine[]>>;
  /** Garden 19 §27/§28: the frozen plan + this trade's actuals, when the story has a Decision_ID. */
  plan?: PlanReviewInput | null;
  /** The story's Decision_ID — the plan card amends (or records, after the trade) the plan on it. */
  planDecisionId?: string | null;
  /** The traded symbol, for loading the hold's price path from the candle owner. */
  planSymbol?: string | null;
  /** Garden 19 §23/§41: the trade's FVG answers, when the journal ties it to one FVG object. */
  fvg?: FvgReviewAnswers | null;
  /** The journal's FVG reference (fvgDecisionReference): answered as of the decision, and from the ledger on request. */
  fvgRef?: JournalFvgReference | null;
  /** Why this story has no plan to compare (no Decision_ID from a WM ticket), said instead of an empty block. */
  planAbsent?: string | null;
  /** A plain line about what this broker's readback does (e.g. Webull fills are not auto-captured). */
  brokerNote?: string | null;
  /**
   * PROOF SCENE ONLY (/journal?scene=journal-fixture): nothing is saved, loaded
   * or asked — no storage write, no network read, no SpaidBot door. Every
   * control is inert and says so.
   */
  readOnly?: boolean;
  defaultOpen?: boolean;
}) {
  const [fvgLoaded, setFvgLoaded] = useState<FvgReviewAnswers | null>(null);
  const [fvgNote, setFvgNote] = useState<string | null>(null);
  const fvg = fvgLoaded ?? fvgIn ?? (fvgRef ? fvgAnswersFromReference(fvgRef) : null);
  const loadFvg = () => {
    if (!fvgRef) return;
    setFvgNote("Reading the FVG's history from the one engine…");
    void loadFvgLedgerFor(fvgRef.objectId, Date.now()).then(r => {
      if ("reason" in r) { setFvgNote(`FVG history unavailable — ${r.reason}.`); return; }
      const ctx = fvgContextFromLedger(r.ledger, fvgRef.objectId);
      if (!ctx) { setFvgNote("The bars on hand no longer hold this gap — nothing is answered rather than a guess."); return; }
      const a = planIn?.actuals ?? null;
      const exits = (a?.exits ?? []).map(e => e.atMs);
      // The reference's decision instant stands in for an entry time the journal did not report — said in the note below.
      setFvgLoaded(fvgReviewAnswersAt(ctx, a?.entry?.atMs ?? fvgRef.decisionAtMs, exits.length && exits.every(t => t != null) ? Math.max(...(exits as number[])) : null));
      setFvgNote(`Read from ${r.ledger.barCount} ${r.ledger.timeframe} bars (as of ${new Date(r.ledger.asOf ?? Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}); entry time = the reference's decision time where the journal reported none.`);
    });
  };
  /** undefined = no change this visit; null = the trader erased the plan here. */
  const [planOverride, setPlanOverride] = useState<ManagementPlanSnapshot | null | undefined>(undefined);
  const [path, setPath] = useState<PricePath | null>(null);
  const [pathNote, setPathNote] = useState<string | null>(null);
  const plan = useMemo<PlanReviewInput | null>(() => (planIn ? { ...planIn, plan: planOverride !== undefined ? planOverride : planIn.plan, path: path ?? planIn.path ?? null } : null), [planIn, planOverride, path]);
  const pathWin = useMemo(() => (planIn?.actuals ? pathWindowFor(planIn.actuals, Date.now()) : null), [planIn]);
  const loadPath = () => {
    if (!pathWin?.ok || !planSymbol) return;
    setPathNote("Loading the hold's 1-minute bars from tastytrade…");
    void loadPlanPricePath(planSymbol, pathWin.window).then(r => {
      if ("path" in r) { setPath(r.path); setPathNote(`Price path: ${r.path.bars.length} bars · ${r.path.source}.`); }
      else setPathNote(`Price path unavailable — ${r.reason}.`);
    });
  };
  const [all, setAll] = useState<Readonly<Record<string, StoryReview>>>({});
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setAll(readStoryReviews()); }, []);
  const r: StoryReview = all[storyKey] ?? { marks: {}, lesson: "", repeat: "", updatedAt: 0 };
  const planWhy = r.planWhy;
  const composed = useMemo(() => (plan ? composePlanReview(plan, planWhy) : null), [plan, planWhy]);
  // Garden 19 §30: "Ask SpaidBot about this decision" — the plan question
  // (formatPlanReviewQuestion, via composePlanReview) + the trader's own FVG
  // reference sentence; pre-filled in the existing panel, never sent for them.
  const askDecision = () => reviewDecisionAsk({
    question: composed?.question ?? "What should I look at in this decision?",
    fvgReferenceSentence: fvgRef ? fvgReferenceSentence(fvgRef) : null,
    symbol: planSymbol ?? fvgRef?.symbol ?? null,
    decisionId: planDecisionId ?? null,
    planLine: formatPlanContextLine(plan?.plan ?? null),
  });
  // Garden 19 §42: the FVG block keeps TRADER (what you recorded), MARKET × TRADER
  // (what the gap did around your actions) and EDUCATION apart, each labelled.
  const fvgBlock = fvg ? (
    <div data-testid="plan-fvg" data-group={fvgContextGroup(fvg)} style={{ display: "grid", gap: 2, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px" }}>
                  <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD, overflowWrap: "anywhere" }}>FVG · {fvg.objectId}</span>
                  {fvgRef ? (
                    <span data-layer="TRADER TRUTH" style={{ fontSize: 11, color: INK, overflowWrap: "anywhere" }}><span style={{ color: MUTED, fontSize: 9.5, letterSpacing: ".08em" }}>TRADER TRUTH · your journal reference</span> {fvgReferenceSentence(fvgRef)}</span>
                  ) : null}
                  <span data-layer="MARKET TRUTH" style={{ color: MUTED, fontSize: 9.5, letterSpacing: ".08em" }}>MARKET TRUTH · what the gap did around your actions</span>
                  {[["First touch or later?", fvg.touch.sentence], ["Acted before the territory was reached?", fvg.actedBeforeCondition.sentence], ["Held after it was traded through?", fvg.heldAfterTradedThrough.sentence]].map(([q, a]) => (
                    <span key={q} data-layer="MARKET TRUTH" style={{ fontSize: 11, color: INK, overflowWrap: "anywhere" }}><span style={{ color: MUTED }}>{q}</span> {a}</span>
                  ))}
                  <span data-layer="EDUCATION TRUTH" style={{ color: MUTED, fontSize: 10.5 }}>EDUCATION TRUTH · A gap is a record of where price moved fast, not a target — price does not have to return to it.</span>
                  {fvgRef && !fvgLoaded && !readOnly ? (
                    <button type="button" data-testid="plan-fvg-load" onClick={loadFvg}
                      style={{ justifySelf: "start", fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>
                      Read what happened to this gap after the decision
                    </button>
                  ) : null}
                  {fvgNote ? <span role="status" style={{ fontSize: 10.5, color: MUTED }}>{fvgNote}</span> : null}
    </div>
  ) : null;
  const save = (next: StoryReview) => { if (readOnly) return; setAll(writeStoryReview(storyKey, { ...next, updatedAt: Date.now() })); };
  return (
    <div data-testid="story-review" style={{ marginTop: 8, borderTop: `1px dashed ${LINE}`, paddingTop: 6 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", padding: 0 }}>
        {open ? "▾" : "▸"} Review · {reviewSummary(all[storyKey])}
      </button>
      {open ? (
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          <div data-testid="review-dimensions" style={{ display: "grid", gap: 6 }}>
            {REVIEW_DIMENSIONS.map(d => {
              const m = r.marks[d];
              const facts = evidence?.[d] ?? [];
              return (
                <div key={d} data-testid={`review-dimension-${d}`} style={{ display: "grid", gap: 3, borderLeft: `2px solid ${m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : LINE}`, paddingLeft: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" disabled={readOnly} data-testid={`review-${d}`} data-mark={m ?? "OPEN"} title={REVIEW_QUESTION[d]} aria-label={`${d}: ${m ?? "not judged"}. ${REVIEW_QUESTION[d]}`}
                      onClick={() => save({ ...r, marks: { ...r.marks, [d]: cycleMark(m) } })}
                      style={{ fontSize: 10, letterSpacing: 0.8, padding: "3px 7px", minHeight: 24, borderRadius: 999, cursor: "pointer", background: "transparent",
                        border: `1px solid ${m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : LINE}`, color: m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : MUTED }}>
                      {m === "HELD" ? "✓ " : m === "BROKE" ? "✗ " : ""}{d}
                    </button>
                    <span style={{ fontSize: 11, color: MUTED }}>{REVIEW_QUESTION[d]}</span>
                  </div>
                  {facts.length ? (
                    <div data-testid={`review-evidence-${d}`} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
                      {facts.map(f => (
                        <span key={f.label} data-provenance={f.provenance} style={{ color: f.provenance === "UNREPORTED" ? MUTED : INK }}>
                          {f.label} {f.text} <span style={{ color: MUTED, fontSize: 9, letterSpacing: ".06em" }}>{f.provenance}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(composed?.byDimension[d] ?? []).map((f, i) => (
                    <div key={`${f.id}-${i}`} data-testid={`plan-finding-${d}`} data-finding={f.id} style={{ fontSize: 11, color: INK, display: "grid", gap: 2, overflowWrap: "anywhere", minWidth: 0 }}>
                      <span><b style={{ color: GOLD, fontWeight: 600, letterSpacing: ".04em" }}>{f.label.toUpperCase()}</b> · {f.sentence}</span>
                      {f.facts.map((x, j) => (
                        <span key={j} data-layer={x.layer} style={{ color: MUTED, fontSize: 10.5 }}>{x.layer} · {x.text}</span>
                      ))}
                      {f.rule ? <span data-layer="EDUCATION TRUTH" style={{ color: MUTED, fontSize: 10.5 }}>EDUCATION TRUTH · {f.rule}</span> : null}
                      <span data-testid="plan-finding-reason" style={{ color: MUTED, fontSize: 10.5 }}>
                        {composed?.result.emotionalReasonSource === "TRADER RECORDED" ? `Reason (your words): ${f.emotionalReason}` : "Reason: unknown — only you can record it below."}
                      </span>
                    </div>
                  ))}
                  <input readOnly={readOnly} aria-label={`${d} note`} data-testid={`review-note-${d}`} value={r.notes?.[d] ?? ""} placeholder="note (optional)"
                    onChange={e => save({ ...r, notes: { ...(r.notes ?? {}), [d]: e.target.value } })}
                    style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: "3px 6px", borderRadius: 4, minHeight: 26 }} />
                </div>
              );
            })}
          </div>
          {composed ? (
            <div data-testid="plan-vs-actual" data-primary={composed.result.primary} style={{ display: "grid", gap: 4, borderTop: `1px dashed ${LINE}`, paddingTop: 6 }}>
              <span style={{ fontSize: 10.5, letterSpacing: 1, color: GOLD, overflowWrap: "anywhere" }}>PLAN vs ACTUAL · Decision_ID {composed.result.decisionId ?? "—"}</span>
              <div data-testid="plan-sheriff" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 8 }}>
                {([["market", "WHAT THE MARKET DID", composed.sheriff.market], ["planned", "WHAT YOU PLANNED", composed.sheriff.planned], ["actual", "WHAT YOU ACTUALLY DID", composed.sheriff.actual]] as const).map(([id, title, lines]) => (
                  <div key={id} data-testid={`plan-sheriff-${id}`} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px", minWidth: 0, display: "grid", gap: 3, alignContent: "start" }}>
                    <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>{title}</span>
                    {lines.map((l, i) => <span key={i} style={{ fontSize: 11, color: INK, overflowWrap: "anywhere" }}>{l}</span>)}
                  </div>
                ))}
              </div>
              {fvgBlock}
              {composed.result.findings.length ? (
                <div data-testid="plan-deviations" style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 10, letterSpacing: 1, color: GOLD }}>PLAN vs WHAT HAPPENED</span>
                  {composed.result.findings.map((f, i) => {
                    const study = lessonForFinding(f.id, !!fvg);
                    return (
                      <span key={i} data-finding={f.id} style={{ fontSize: 11.5, color: INK, overflowWrap: "anywhere" }}><b style={{ fontWeight: 600 }}>{f.label}</b> — {f.sentence}
                        {study ? <> <Link href={study.href} prefetch={false} data-testid="plan-finding-study" style={{ color: GOLD, fontSize: 11, whiteSpace: "nowrap" }}>Study: {study.label} →</Link></> : null}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <span data-testid="plan-alone" style={{ fontSize: 11, color: MUTED, overflowWrap: "anywhere" }}>{composed.planAlone.sentence}</span>
              {pathWin && planSymbol ? (
                <span data-testid="plan-path" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: MUTED }}>
                  {pathWin.ok && !path && !planIn?.path ? (
                    <button type="button" data-testid="plan-path-load" onClick={loadPath}
                      style={{ fontSize: 11, color: GOLD, background: "none", border: `1px solid ${LINE}`, borderRadius: 6, padding: "3px 10px", minHeight: 28, cursor: "pointer" }}>
                      Load the price path for this hold (tastytrade 1m)
                    </button>
                  ) : null}
                  {!pathWin.ok ? <span>Price path cannot be loaded — {pathWin.reason}.</span> : null}
                  {pathNote ? <span role="status">{pathNote}</span> : null}
                </span>
              ) : null}
              {planDecisionId ? <ManagementPlanCard mode="story" decisionId={planDecisionId} symbol={planSymbol ?? null} initial={plan?.plan ?? null} onPlanChange={s => { setPlanOverride(s); if (s === null) setAll(readStoryReviews()); }} /> : null}
              <span data-testid="plan-question" style={{ fontSize: 12, color: INK, overflowWrap: "anywhere" }}>SpaidBot asks: {composed.question}</span>
              {readOnly ? null : <AskSpaidbotButton testId="review-ask-spaidbot" label="Ask SpaidBot about this decision" ask={askDecision} />}
              <label style={{ fontSize: 11, color: MUTED }}>Why did the plan change? (your words — WM never fills this in)
                <textarea readOnly={readOnly} data-testid="plan-why" value={r.planWhy ?? ""} onChange={e => save({ ...r, planWhy: e.target.value })} rows={2}
                  style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 6, borderRadius: 4 }} />
              </label>
            </div>
          ) : null}
          {brokerNote ? <p data-testid="broker-note" style={{ margin: 0, fontSize: 11, color: MUTED }}>{brokerNote}</p> : null}
          {planIn?.actualsRefusal ? <p data-testid="plan-actuals-refusal" style={{ margin: 0, fontSize: 11, color: MUTED }}>{planIn.actualsRefusal}</p> : null}
          {!composed && planAbsent ? <p data-testid="plan-absent" style={{ margin: 0, fontSize: 11, color: MUTED }}>{planAbsent}</p> : null}
          {!composed ? fvgBlock : null}
          {!composed && fvg && !readOnly ? <AskSpaidbotButton testId="review-ask-spaidbot" label="Ask SpaidBot about this decision" ask={askDecision} /> : null}
          <label style={{ fontSize: 11, color: MUTED }}>The lesson, in my words
            <textarea readOnly={readOnly} value={r.lesson} onChange={e => save({ ...r, lesson: e.target.value })} rows={2}
              style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 6, borderRadius: 4 }} />
          </label>
          <label style={{ fontSize: 11, color: MUTED }}>What I would repeat
            <textarea readOnly={readOnly} value={r.repeat} onChange={e => save({ ...r, repeat: e.target.value })} rows={2}
              style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 6, borderRadius: 4 }} />
          </label>
          <p style={{ fontSize: 10.5, color: MUTED, margin: 0 }}>Kept on this device. The broker&apos;s facts above are never edited by a review.</p>
        </div>
      ) : null}
    </div>
  );
}

/** Money through the one shared formatter (contractEconomics.formatMoney). */
const money = (v: number) => formatMoney(v);
// A broker price is printed at least to the cent: Webull states an option fill
// as 0.2 and the row read "@ 0.2" beside "@ 0.14" (sheriff sweep 2026-10-07).
const fillPx = (v: number | null) => (v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 }));
// F2 (2026-10-07): every time the trader reads names its zone.
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" }) : "—");

export function BrokerTruthToday() {
  useManagementOwnerVersion();   // re-render when the member is resolved: story plans are read at render
  const [feed, setFeed] = useState<{ state: string; reason?: string; accounts: FeedAccount[]; asOf?: string; decisionLinks?: string } | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    // Seven days of fills (a story from yesterday is still today's lesson);
    // working orders are tastytrade's current-day list.
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const pull = () => fetch(`/api/broker/journal-feed?since=${since}`, { cache: "no-store" })
      .then(async r => { const j = await r.json().catch(() => null); if (live) { setStatus(r.status); setFeed(j); } })
      .catch(() => { if (live) setFeed({ state: "NO_ANSWER", accounts: [] }); });
    void pull();
    const t = setInterval(pull, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const stories = useMemo<Story[]>(() => {
    const out: Story[] = [];
    for (const a of feed?.accounts ?? []) {
      const byDecision = new Map<string, Story>();
      const orderToStory = new Map<string, Story>();
      for (const o of a.orders) {
        const key = `${a.broker}|${a.tail}|${o.decisionId ?? "outside"}`;
        const st = byDecision.get(key) ?? { key, broker: a.broker, decisionId: o.decisionId, accountTail: a.tail, orders: [], fills: [] };
        st.orders.push(o);
        byDecision.set(key, st);
        orderToStory.set(o.id, st);
      }
      for (const f of a.fills) {
        // A Webull fill carries its own decision (looked up by its client order id).
        const st = (f.orderId && orderToStory.get(f.orderId)) || (() => {
          const d = f.decisionId ?? null;
          const key = `${a.broker}|${a.tail}|${d ?? "outside"}`;
          const s = byDecision.get(key) ?? { key, broker: a.broker, decisionId: d, accountTail: a.tail, orders: [], fills: [] };
          byDecision.set(key, s);
          return s;
        })();
        st.fills.push(f);
      }
      out.push(...byDecision.values());
    }
    // WM decisions first, then outside orders.
    return out.sort((x, y) => Number(!!y.decisionId) - Number(!!x.decisionId));
  }, [feed]);

  // Not the broker owner (403) or not signed in (401): this section has nothing
  // that belongs to them, so it is not drawn at all — and it stays undrawn until
  // the first answer says who is asking, so a guest never sees "Asking your
  // brokers…" flash up over brokers that are not theirs.
  if (status === 401 || status === 403) return null;
  if (!feed) return null;

  return (
    <section data-testid="broker-truth-today" aria-label="Broker truth today" style={{ padding: "12px 16px", borderBottom: `1px solid ${LINE}`, color: INK }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, fontWeight: 400 }}>Broker truth · last 7 days</h2>
        <span style={{ color: MUTED, fontSize: 11 }}>
          Read from your brokers{feed?.asOf ? ` · as of ${time(feed.asOf)}` : ""} — orders and fills as the broker states them, never this browser&apos;s memory.
        </span>
      </div>
      {feed.state === "NOT_CONFIGURED" ? (
        <p style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>tastytrade is not connected on this deployment, so there are no broker facts to show.</p>
      ) : feed.state !== "OK" ? (
        <p title={feed.reason ?? feed.state} style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>The brokers did not answer just now. Your journal entries below are unaffected; this section retries every 30 seconds.</p>
      ) : stories.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>No orders or fills at tastytrade or Webull in the last 7 days. Completed decision stories will appear here as the broker records them.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {stories.map(st => {
            const fees = st.fills.reduce((n, f) => n + f.fees, 0);
            const cash = st.fills.reduce((n, f) => n + (f.value ?? 0), 0);
            // A partial sum is not the broker's figure (super order §7: missing
            // fees remain unknown, never zero by convenience).
            const feesKnown = st.fills.every(f => f.feesReported !== false);
            const cashKnown = st.fills.every(f => f.value != null);
            return (
              <article key={st.key} data-decision={st.decisionId ?? "outside"} style={{ border: `1px solid ${LINE}`, borderRadius: 4, padding: 10 }}>
                <header style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ color: st.decisionId ? GOLD : MUTED, fontSize: 12 }}>
                    {st.decisionId ? `Decision ${st.decisionId}` : "Placed outside WM"}
                  </strong>
                  <span style={{ color: MUTED, fontSize: 11 }}>{st.broker === "webull" ? "Webull" : "tastytrade"} · …{st.accountTail}</span>
                  {st.decisionId ? (
                    <Link href={`/journal?decisions=${encodeURIComponent(st.decisionId)}`} style={{ color: GOLD, fontSize: 11, marginLeft: "auto" }}>Open this decision&apos;s journal →</Link>
                  ) : null}
                </header>
                {st.orders.length ? (
                  <ul style={{ marginTop: 6, display: "grid", gap: 2, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {st.orders.map(o => (
                      <li key={o.id}>
                        <span style={{ color: o.state === "FILLED" ? "#7fd1a8" : o.state === "REJECTED" ? "#e0786b" : GOLD }}>{o.state.replace(/_/g, " ")}</span>
                        {" · "}{o.action} {o.filled != null && o.quantity != null ? `${o.filled}/${o.quantity}` : o.quantity ?? ""} {o.symbol} {o.price ? `@ ${o.price}` : ""}
                        <span style={{ color: MUTED }}> · order #{o.id}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {st.fills.length ? (
                  <ul style={{ marginTop: 6, display: "grid", gap: 2, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {st.fills.map(f => (
                      <li key={f.id}>
                        <span style={{ color: "#7fd1a8" }}>FILL</span> · {time(f.executedAt)} · {f.action} {f.quantity} {f.symbol} @ {fillPx(f.price)}
                        <span style={{ color: MUTED }}> · {f.feesReported === false ? "fees not reported" : `fees ${money(f.fees)}`}</span>
                      </li>
                    ))}
                    {st.broker === "webull" ? (
                      // The rows above print Webull's fees where Webull states them
                      // (webullFills: feesReported); this footnote said "no fees"
                      // beneath "fees $0.05" on every row (sheriff sweep 2026-10-07).
                      <li style={{ color: MUTED }}>{st.fills.every(f => f.feesReported === false)
                        ? <>Prices and quantities as Webull states them; Webull&apos;s executions carry no fees or cash, so none are claimed here.</>
                        : <>Prices, quantities and fees as Webull states them; Webull&apos;s executions carry no cash amount, so none is claimed here.</>}</li>
                    ) : (
                      <li style={{ color: MUTED }}>Net cash {cashKnown ? money(cash) : "not stated for every fill"} · fees {feesKnown ? money(fees) : "not reported for every fill"} — as tastytrade states it; P/L on open positions is not claimed here.</li>
                    )}
                  </ul>
                ) : st.orders.length ? <p style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>No fill yet.</p> : null}
                {(() => {
                  // Garden 19 §26/§28: the frozen plan against tastytrade's own fills and stop / target orders.
                  const pin = planReviewInputForBrokerStory(st, id => readPlanForDecision(typeof window === "undefined" ? null : window.localStorage, id));
                  return <StoryReviewRow storyKey={st.decisionId ?? st.key} plan={pin} planDecisionId={pin?.decisionId ?? null} planSymbol={pin?.symbol ?? null} planAbsent={pin ? null : PLAN_ABSENT_OUTSIDE_WM} brokerNote={st.broker === "webull" ? WEBULL_NOT_AUTO_CAPTURED : null} />;
                })()}
              </article>
            );
          })}
        </div>
      )}
      {feed?.state === "OK" && feed.decisionLinks !== "KV" ? (
        <p style={{ color: GOLD, fontSize: 11, marginTop: 6 }}>Decision links are unavailable on this host, so WM orders show as placed outside WM.</p>
      ) : null}
    </section>
  );
}
