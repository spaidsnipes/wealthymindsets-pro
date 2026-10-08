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
 *     `readOnly` (no save, no ledger load, no SpaidBot door), the Personal
 *     Edge block is the pure view with a no-op compare;
 *   · shown only when the token is present and a trader is signed in
 *     (JournalRouteSwitch) — inert for guests.
 */
import React, { useMemo } from "react";
import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { FvgExamplesView } from "@/components/education/FvgLessonBody";
import { FvgContextSplitsView, FvgReviewQuestionsView, ManagementCounterfactualView } from "@/components/journal/FvgContextSplitsView";
import { additionalEvidenceComparison, fillTargetComparison, fillTargetSample, gapDecisionFrom } from "@/lib/journal/planFvgFillTargets";
import { JOURNAL_FIXTURE_BANNER, journalFixture } from "@/lib/journal/journalProofFixture";
import { fvgReferenceSentence } from "@/lib/journal/fvgDecisionReference";
import { behaviourCases } from "@/lib/journal/managementBehaviours";
import { managementWalkthroughs } from "@/lib/journal/managementWalkthrough";
import { journalRoundTrip } from "@/lib/journal/journalRoundTrip";

const GOLD = "#d4af37";

export function JournalProofScene(): React.ReactElement {
  const f = useMemo(() => journalFixture(), []);
  const shown = f.entries.slice(0, 6);
  const behaviours = useMemo(() => behaviourCases(), []);
  const walkthroughs = useMemo(() => managementWalkthroughs(), []);
  // Save → reload of one sample entry with its FVG reference, in a throwaway in-memory Storage
  // (the Journal's own writer and reader; the browser's storage is never touched).
  const roundTrip = useMemo(() => journalRoundTrip(f.entries[0].fvgRef), [f]);
  // §41: the 24 sample decisions (all targets 2R beyond the entry; references price-only) answer with
  // counts and INSUFFICIENT; a second synthetic set of 48 gap decisions shows the MEASURED form.
  const q41 = useMemo(() => {
    const book = f.entries.map(e => gapDecisionFrom({ id: e.id, fvgRef: e.fvgRef, plan: e.plan, entryPx: e.actuals.entry?.px ?? null, exitPx: e.actuals.exits[0]?.px ?? null, realizedR: e.realizedR }));
    const wide = fillTargetSample();
    return { book: { fill: fillTargetComparison(book), evidence: additionalEvidenceComparison(book) }, wide: { fill: fillTargetComparison(wide), evidence: additionalEvidenceComparison(wide) } };
  }, [f]);
  return (
    <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto" data-testid="journal-proof-scene" data-proof-scene="journal-fixture">
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
        {shown.map(e => (
          <div key={e.id} id={e.id} className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
            <div className="text-[11px] text-wm-text">{e.id} · {e.setup} · {e.symbol} · {e.date} · {e.result} {e.realizedR >= 0 ? "+" : ""}{e.realizedR}R</div>
            <div className="text-[10px] text-wm-text-muted mt-0.5">{fvgReferenceSentence(e.fvgRef)}</div>
            {/* The frozen sample plan + sample fills + sample path → the three columns, the management
                findings and the plan-alone line. No planDecisionId / planSymbol: no plan card (no amend /
                delete) and no price-path loader — read only. */}
            <StoryReviewRow storyKey={`proof-scene:${e.id}`} fvg={f.review[e.id] ?? null} fvgRef={e.fvgRef}
              plan={{ plan: e.plan, actuals: e.actuals, path: e.path }} readOnly defaultOpen />
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
