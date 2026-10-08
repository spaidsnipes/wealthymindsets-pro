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
import { FvgContextSplitsView, ManagementCounterfactualView } from "@/components/journal/FvgContextSplitsView";
import { JOURNAL_FIXTURE_BANNER, journalFixture } from "@/lib/journal/journalProofFixture";
import { fvgReferenceSentence } from "@/lib/journal/fvgDecisionReference";
import { behaviourCases } from "@/lib/journal/managementBehaviours";

const GOLD = "#d4af37";

export function JournalProofScene(): React.ReactElement {
  const f = useMemo(() => journalFixture(), []);
  const shown = f.entries.slice(0, 6);
  const behaviours = useMemo(() => behaviourCases(), []);
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
      </section>

      <section aria-label="Academy — my examples (sample)" data-testid="journal-proof-academy" className="rounded-lg border border-wm-border bg-wm-surface/40 p-3">
        <h2 className="text-sm font-bold text-wm-text mb-2">Academy · "Show me my examples" (sample)</h2>
        <FvgExamplesView examples={f.examples} heading={`Show me my examples · ${f.examples.length} sample decisions on gaps (proof scene)`} />
      </section>
    </div>
  );
}
