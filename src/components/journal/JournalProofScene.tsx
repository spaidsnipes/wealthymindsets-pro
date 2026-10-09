"use client";

/**
 * /journal?scene=journal-fixture — PROOF SCENE (Garden 19, coordinator order
 * 2026-10-07 night). Renders the Review's FVG answers, the first counterfactual
 * slice, Personal Edge's FVG study list and the Academy's "my examples" from a
 * deterministic SAMPLE book (journalProofFixture) so they can be read on
 * serving without one record on anyone's account.
 *
 * HARD LIMITS (pinned by journalProofScene.sentinel.test.ts):
 *   · a banner that says it is sample data, always on screen;
 *   · ZERO storage writes and ZERO network writes — the Review rows are
 *     `readOnly` (no save, no ledger load), the Personal Edge block is the
 *     pure view with a no-op compare;
 *   · ONE labelled row (the first sample decision) shows the Review's
 *     "Ask SpaidBot about this decision" door (2026-10-09). It only PRE-FILLS
 *     the existing panel's question box: no request is made and nothing is
 *     sent — the trader would have to press Send himself;
 *   · shown only when the token is present and a trader is signed in
 *     (JournalRouteSwitch) — inert for guests.
 */
import React, { useEffect, useMemo, useState } from "react";
import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { FvgExamplesView } from "@/components/education/FvgLessonBody";
import { FvgContextSplitsView, FvgReviewQuestionsView, ManagementCounterfactualView } from "@/components/journal/FvgContextSplitsView";
import { additionalEvidenceComparison, fillTargetComparison, fillTargetSample, gapDecisionFrom } from "@/lib/journal/planFvgFillTargets";
import { fixtureAnchorId, JOURNAL_FIXTURE_BANNER, journalFixture, journalFixtureBars, shownFixtureEntries } from "@/lib/journal/journalProofFixture";
import { fvgContextAtDecision } from "@/lib/journal/fvgDecisionContext";
import { fvgReferenceSentence } from "@/lib/journal/fvgDecisionReference";
import { behaviourCases } from "@/lib/journal/managementBehaviours";
import { managementWalkthroughs } from "@/lib/journal/managementWalkthrough";
import { journalRoundTrip } from "@/lib/journal/journalRoundTrip";
import { brokerStoryFixtures, captureFixture, LIFECYCLE_BANNER, planLifecycleRoundTrip } from "@/lib/journal/journalLifecycleFixture";
import { CapturedFacts } from "@/components/journal/CapturedFacts";
import { SelfReportChooser } from "@/components/journal/SelfReportChooser";
import { SELF_REPORT_LABELS, selfReportByDeparture } from "@/lib/journal/selfReport";

const GOLD = "#d4af37";

export function JournalProofScene(): React.ReactElement {
  const f = useMemo(() => journalFixture(), []);
  // A link's fragment (`#SAMPLE-24`, from the Academy's sample door) names ONE decision: it is rendered even when
  // it is past the first six, scrolled into view and marked. Read from the URL only — nothing is stored.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  // `anchorSeq` re-runs the scroll when the SAME decision is asked for again.
  const [anchorSeq, setAnchorSeq] = useState(0);
  useEffect(() => {
    const read = () => { setAnchorId(fixtureAnchorId(window.location.hash, f.entries)); setAnchorSeq(n => n + 1); };
    read();
    // The app router sets the fragment after this mounts on a client navigation, and fires no hashchange:
    // read once more shortly after (measured on serving 0dd1130 — the in-page sample door did not land).
    const late = window.setTimeout(read, 400);
    window.addEventListener("hashchange", read);
    return () => { window.clearTimeout(late); window.removeEventListener("hashchange", read); };
  }, [f]);
  /** A sample door INSIDE the scene (an example link to `#SAMPLE-n`): land on it from the press itself. */
  const onDoor = (ev: React.MouseEvent) => {
    const a = (ev.target as HTMLElement | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
    const href = a?.getAttribute("href") ?? "";
    const id = fixtureAnchorId(href.slice(href.indexOf("#")), f.entries);
    if (id) { setAnchorId(id); setAnchorSeq(n => n + 1); }
  };
  useEffect(() => {
    if (!anchorId) return;
    const el = document.getElementById(anchorId);
    // block "start": a decision's Review is taller than the screen — its TOP (the "opened from a link" mark)
    // must be what the trader lands on, not its middle (measured on serving 0dd1130: "center" left the top off-screen).
    if (el) el.scrollIntoView({ block: "start" });
  }, [anchorId, anchorSeq]);
  const shown = shownFixtureEntries(f.entries, anchorId);
  const behaviours = useMemo(() => behaviourCases(), []);
  const walkthroughs = useMemo(() => managementWalkthroughs(), []);
  // Save → reload of one sample entry with its FVG reference, in a throwaway in-memory Storage
  // (the Journal's own writer and reader; the browser's storage is never touched).
  const roundTrip = useMemo(() => {
    // §40: the context read with the reference (same sample bars, as of the decision) travels with it.
    // §13: the first sample decision whose displacement bar the effort owner could READ (enough closed
    // bars behind it), so the saved line shows a real cell rather than the early-series SILENT.
    const bars = journalFixtureBars();
    for (const e of f.entries.slice(0, 40)) {
      const c = fvgContextAtDecision(e.fvgRef, bars);
      if (c.ok && c.context.effortCell !== "SILENT") return journalRoundTrip(e.fvgRef, "SAMPLE-ROUNDTRIP-1", c.context);
    }
    const ref = f.entries[0].fvgRef;
    const c = fvgContextAtDecision(ref, bars);
    return journalRoundTrip(ref, "SAMPLE-ROUNDTRIP-1", c.ok ? c.context : null);
  }, [f]);
  // Rows that need a Founder action on the real account, shown on a labelled SAMPLE through the same owners
  // and components: the plan's lifecycle (in memory), Review from a broker readback, auto-capture from a fill.
  const sampleLabels = useMemo(() => selfReportByDeparture(f.entries.map((e, i) => ({ result: f.planResults[e.id], labels: i % 3 === 0 ? [SELF_REPORT_LABELS[i % SELF_REPORT_LABELS.length].id] : [] }))), [f]);
  const lifecycle = useMemo(() => planLifecycleRoundTrip(), []);
  const brokerStories = useMemo(() => brokerStoryFixtures(), []);
  const capture = useMemo(() => captureFixture(), []);
  // §41: the 24 sample decisions (all targets 2R beyond the entry; references price-only) answer with
  // counts and INSUFFICIENT; a second synthetic set of 48 gap decisions shows the MEASURED form.
  const q41 = useMemo(() => {
    const book = f.entries.map(e => gapDecisionFrom({ id: e.id, fvgRef: e.fvgRef, plan: e.plan, entryPx: e.actuals.entry?.px ?? null, exitPx: e.actuals.exits[0]?.px ?? null, realizedR: e.realizedR }));
    const wide = fillTargetSample();
    return { book: { fill: fillTargetComparison(book), evidence: additionalEvidenceComparison(book) }, wide: { fill: fillTargetComparison(wide), evidence: additionalEvidenceComparison(wide) } };
  }, [f]);
  return (
    <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto" data-testid="journal-proof-scene" data-proof-scene="journal-fixture" onClickCapture={onDoor}>
      <div role="status" data-testid="journal-proof-banner"
        className="rounded-lg border px-3 py-2 text-[12px] font-black tracking-wider"
        style={{ borderColor: GOLD, color: GOLD, background: "rgba(212,175,55,0.08)" }}>
        {JOURNAL_FIXTURE_BANNER}
        <span className="block text-[11px] font-normal tracking-normal text-wm-text-muted">
          A synthetic instrument (SAMPLE-FVG, 5m) and {f.entries.length} synthetic decisions, each with a synthetic frozen plan, built in the page from the same FVG engine and plan owners.
          Nothing here is saved, fetched or sent — leave the page (or drop <code>?scene=journal-fixture</code>) to return to your journal.
        </span>
      </div>

      <section aria-label="Review — FVG answers (sample)" data-testid="journal-proof-review" className="space-y-3">
        <h2 className="text-sm font-bold text-wm-text">Review · FVG answers (sample decisions)</h2>
        {shown.map((e, i) => (
          <div key={e.id} id={e.id} data-testid="journal-proof-decision" data-anchored={e.id === anchorId ? "yes" : "no"} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3"
            style={e.id === anchorId ? { outline: `2px solid ${GOLD}`, outlineOffset: 2, scrollMarginTop: 96 } : { scrollMarginTop: 96 }}>
            {e.id === anchorId ? <div role="status" data-testid="journal-proof-anchored" className="text-[10px] font-bold tracking-wider" style={{ color: GOLD }}>OPENED FROM A LINK · this sample decision</div> : null}
            <div className="text-[11px] text-wm-text">{e.id} · {e.setup} · {e.symbol} · {e.date} · {e.result} {e.realizedR >= 0 ? "+" : ""}{e.realizedR}R</div>
            <div className="text-[10px] text-wm-text-muted mt-0.5">{fvgReferenceSentence(e.fvgRef)}</div>
            {/* The frozen sample plan + sample fills + sample path → the three columns, the management
                findings and the plan-alone line. No planDecisionId / planSymbol: no plan card (no amend /
                delete) and no price-path loader — read only. */}
            <StoryReviewRow storyKey={`proof-scene:${e.id}`} fvg={f.review[e.id] ?? null} fvgRef={e.fvgRef}
              plan={{ plan: e.plan, actuals: e.actuals, path: e.path }} readOnly sampleAskDoor={i === 0} defaultOpen />
          </div>
        ))}
      </section>

      <section aria-label="Journal save and reload (sample)" data-testid="journal-proof-roundtrip" data-verdict={roundTrip.verdict} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text">Journal · Reference an FVG → save → reload (one sample entry, in memory)</h2>
        <p className="text-[11px] text-wm-text-muted">
          The Journal&apos;s own writer and reader, run on a throwaway in-memory store under your member key — your saved journal is not read or written.
          Stored {roundTrip.bytes} bytes; read back as {roundTrip.readStatus}.
        </p>
        <div role="table" className="mt-2 grid gap-1 text-[11px]" style={{ overflowWrap: "anywhere" }}>
          {roundTrip.rows.map(r => (
            <div role="row" key={r.field} data-testid="journal-proof-roundtrip-row" data-same={r.same ? "yes" : "no"}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "2px 10px" }}>
              <b role="cell" className="text-wm-text">{r.field}</b>
              <span role="cell" className="text-wm-text-muted">before: {r.before}</span>
              <span role="cell" className="text-wm-text-muted">after: {r.after}{r.same ? " · same" : " · DIFFERENT"}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-bold" style={{ color: GOLD }}>
          {roundTrip.verdict}{roundTrip.secondSaveByteStable ? " · a second save → reload is byte-stable" : ""}
        </p>
      </section>

      <section aria-label="Plan lifecycle (sample)" data-testid="journal-proof-lifecycle" data-all-ok={lifecycle.allOk ? "yes" : "no"} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text">Plan · freeze → amend → reload → erase (one sample plan, in memory)</h2>
        <p className="text-[11px] text-wm-text-muted">{LIFECYCLE_BANNER}. The plan store&apos;s own functions, run on a throwaway in-memory store under your member key.</p>
        <ol className="mt-2 space-y-1 text-[11px]" style={{ overflowWrap: "anywhere" }}>
          {lifecycle.steps.map(s => (
            <li key={s.step} data-testid="journal-proof-lifecycle-step" data-ok={s.ok ? "yes" : "no"}>
              <b className="text-wm-text">{s.step}</b>
              <span className="block text-wm-text-muted">{s.outcome}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Review from a broker readback (sample)" data-testid="journal-proof-broker" className="space-y-3">
        <h2 className="text-sm font-bold text-wm-text">Review · plan vs actual from a broker readback (sample stories in the feed&apos;s own shapes)</h2>
        <p className="text-[11px] text-wm-text-muted">{LIFECYCLE_BANNER}.</p>
        {brokerStories.map(b => (
          <div key={b.broker} data-testid="journal-proof-broker-story" data-broker={b.broker} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
            <div className="text-[11px] text-wm-text">{b.title}</div>
            <StoryReviewRow storyKey={`proof-scene:broker:${b.broker}`} plan={b.input} readOnly defaultOpen />
          </div>
        ))}
      </section>

      <section aria-label="Auto-capture from a broker fill (sample)" data-testid="journal-proof-capture" data-ok={capture.ok ? "yes" : "no"} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text mb-1">Journal · auto-capture from a broker fill (one sample FILLED order)</h2>
        <p className="text-[11px] text-wm-text-muted mb-2">{LIFECYCLE_BANNER}. Every field names where it came from; what the broker did not report stays UNREPORTED.</p>
        {capture.ok ? <CapturedFacts capture={capture.draft} title="Captured from the broker (sample)" /> : <p className="text-[11px] text-wm-text-muted">{capture.reason}</p>}
      </section>

      <section aria-label="Management Sheriff walkthrough (sample)" data-testid="journal-proof-walkthrough" className="rounded-lg border border-wm-border bg-wm-surface/40 p-3 space-y-3">
        <h2 className="text-sm font-bold text-wm-text">Review · the management Sheriff, step by step (three sample decisions)</h2>
        <p className="text-[11px] text-wm-text-muted">What you planned, what you actually did and what the market did stay in separate steps. Each finding is a fact with its rule. The reason a plan changed is only ever your own words.</p>
        {walkthroughs.map(w => (
          <div key={w.id} data-testid="journal-proof-walk" data-walk={w.id} data-primary={w.review.result.primary} className="rounded border border-wm-border p-2" style={{ overflowWrap: "anywhere" }}>
            <h3 className="text-[12px] font-bold text-wm-text">{w.title}</h3>
            <ol className="mt-1 space-y-1.5">
              {w.steps.map(s => (
                <li key={s.step} data-testid="journal-proof-walk-step">
                  <span className="block text-[10px] tracking-wider" style={{ color: GOLD }}>{s.step}</span>
                  {s.lines.map((l, i) => <span key={i} className="block text-[11px] leading-relaxed text-wm-text-muted">{l}</span>)}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section aria-label="Management behaviours (sample)" data-testid="journal-proof-behaviours" className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text mb-2">Review · management behaviours, one sample trade each (read from fills, order changes and the frozen plan)</h2>
        <ul className="space-y-2">
          {behaviours.map(b => {
            const hit = b.result.findings.find(x => x.id === b.expect);
            return (
              <li key={b.expect} data-testid="journal-proof-behaviour" data-class={b.expect} data-found={hit ? "yes" : "no"} className="text-[11px] leading-relaxed" style={{ overflowWrap: "anywhere" }}>
                <b className="text-wm-text">{hit?.label ?? b.behaviour}</b>
                <span className="block text-wm-text-muted">{hit?.sentence ?? "not found in this sample"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Personal Edge — FVG (sample)" data-testid="journal-proof-edge" className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text mb-2">Personal Edge · plan adherence by setup, FVG study list, traded vs untraded touches (sample)</h2>
        <PlanAdherenceView rows={f.adherence} fvgRows={f.studyRows} edge={f.counterfactual} edgeNote="Read from the sample ledger in this page — nothing was fetched." showEdge onCompare={() => {}} />
        <FvgContextSplitsView rows={f.splits} />
        <ManagementCounterfactualView m={f.management} />
        {/* §29: a SAMPLE trader's own labels (synthetic — every third departure labelled), counted beside the departure. */}
        <div data-testid="journal-proof-self-report" className="mt-2 grid gap-1">
          <span className="text-[10px] tracking-wider" style={{ color: GOLD }}>YOUR OWN LABELS · sample labels a trader chose himself · beside each departure</span>
          {sampleLabels.map(r => <span key={r.departure} data-testid="self-report-row" data-state={r.state} className="text-[11px] text-wm-text-muted" style={{ overflowWrap: "anywhere" }}>{r.line}</span>)}
          <SelfReportChooser labels={["IMPATIENCE"]} readOnly startOpen onChange={() => {}} />
        </div>
        <div data-testid="journal-proof-q41-book"><FvgReviewQuestionsView fill={q41.book.fill} evidence={q41.book.evidence} /></div>
        <div data-testid="journal-proof-q41-wide" className="mt-2">
          <span className="block text-[10px] text-wm-text-muted">A second synthetic set — 48 sample gap decisions — so the measured form can be read:</span>
          <FvgReviewQuestionsView fill={q41.wide.fill} evidence={q41.wide.evidence} />
        </div>
      </section>

      <section aria-label="Academy — my examples (sample)" data-testid="journal-proof-academy" className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text mb-2">Academy · "Show me my examples" (sample)</h2>
        <FvgExamplesView examples={f.examples} heading={`Show me my examples · ${f.examples.length} sample decisions on gaps (proof scene)`} />
      </section>
    </div>
  );
}
