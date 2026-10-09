"use client";

/**
 * One lesson of the Academy's FVG / Imbalance & Patience course (Garden 19
 * §32–36), rendered inside the Academy's own lesson pane. Content comes from
 * src/lib/academy/fvgCourse.ts — this component only lays it out.
 */
import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FVG_EXAMPLES_EMPTY_LINE, FVG_MYTH_CARD, FVG_MYTH_LESSONS, fvgChartLink, fvgReplayPractice, fvgReferencedExamples,
  type FvgJournalExample, type FvgLesson,
} from "@/lib/academy/fvgCourse";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { hydrateJournalEntries } from "@/lib/journal/hydrateJournalEntries";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { DEPARTURES } from "@/lib/journal/planAdherence";
import { composePlanReview, planReviewInputForJournalEntry } from "@/lib/journal/planReview";
import { FvgDiagram } from "./FvgDiagram";
import { learnYourselfLinks } from "@/lib/journal/planLoop";
import { useAuth } from "@/contexts/AuthContext";
import { proofFixtureScene } from "@/lib/chart/proofScene";
import { JOURNAL_FIXTURE_BANNER, journalFixture } from "@/lib/journal/journalProofFixture";

/** The page-level words of the Academy proof scene (quiz results are shown, never saved). */
export const EDUCATION_FIXTURE_BANNER = "PROOF SCENE — sample data, not your Academy progress";
export const EDUCATION_FIXTURE_NOTE =
  "Take any quiz here: the result and the verified mark appear on this page only. Nothing is saved, and your own progress and notes are not read or changed. Drop ?scene=education-fixture to return to your Academy.";
export const EDUCATION_FIXTURE_PASS_LINE = "Marked verified on this page only — not saved (proof scene).";

/** `/education?scene=education-fixture` — sample examples for a signed-in trader; false for a guest or without the token. */
export function educationFixtureOn(search: string, signedIn: boolean): boolean {
  return signedIn && proofFixtureScene(search) === "education-fixture";
}

export function FvgMythCard() {
  return (
    <div data-testid="fvg-myth-card" className="rounded-xl border p-3" style={{ borderColor: "rgba(201,165,92,0.45)", background: "rgba(201,165,92,0.06)" }}>
      <div className="text-[11px] font-bold text-wm-text"><s className="decoration-wm-text-dim">{FVG_MYTH_CARD.myth}</s></div>
      <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "#e3cf9c" }}>{FVG_MYTH_CARD.better}</div>
    </div>
  );
}

/** Plan adherence words for each journal entry with a frozen plan (plan-vs-actual), read only. */
function adherenceById(records: readonly unknown[]): Map<string, string> {
  const st = window.localStorage;
  const out = new Map<string, string>();
  for (const e of hydrateJournalEntries(records).entries) {
    const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id));
    if (!input) continue;
    if (!input.plan) { out.set(e.id, "no plan frozen"); continue; }
    const r = composePlanReview(input).result;
    const departed = r.findings.find(f => DEPARTURES.includes(f.id));
    out.set(e.id, !r.exitDecidable ? "plan comparison not decided" : departed ? `departed: ${departed.label.toLowerCase()}` : "plan followed");
  }
  return out;
}

/** §36 — the trader's own decisions on gaps (journal FVG references), or one plain line until there are some. */
function MyExamples() {
  const [examples, setExamples] = useState<FvgJournalExample[] | null>(null);
  const [sample, setSample] = useState(false);
  const ownerVersion = useManagementOwnerVersion();
  const { user } = useAuth();
  useEffect(() => {
    // PROOF SCENE (education-fixture): the journal fixture's SAMPLE decisions through the
    // same selector — the member's journal is NOT read, and nothing is written.
    if (educationFixtureOn(window.location.search, !!user)) {
      setSample(true);
      setExamples([...journalFixture().examples]);
      return;
    }
    setSample(false);
    try {
      const read = readJournalStorage(window.localStorage);
      const adh = adherenceById(read.records);
      setExamples(fvgReferencedExamples(read.records, id => adh.get(id) ?? null));
    } catch { setExamples([]); }
  }, [ownerVersion, user]);
  if (examples === null) return null;
  if (sample) {
    return (
      <div data-testid="fvg-examples-sample" data-proof-scene="education-fixture">
        <div role="status" data-testid="education-proof-banner" className="mb-2 rounded-lg border px-3 py-2 text-[12px] font-black tracking-wider"
          style={{ borderColor: "#d4af37", color: "#d4af37", background: "rgba(212,175,55,0.08)" }}>
          {JOURNAL_FIXTURE_BANNER}
          <span className="block text-[11px] font-normal tracking-normal text-wm-text-muted">
            Synthetic decisions (SAMPLE-FVG) through the lesson&apos;s own examples list. Nothing here is read from or saved to your journal;
            each door opens the journal proof scene.
          </span>
        </div>
        <FvgExamplesView examples={examples} heading={`Show me my examples · SAMPLE · ${examples.length} synthetic decisions on gaps`} />
      </div>
    );
  }
  return <FvgExamplesView examples={examples} />;
}

/** The examples list itself — pure, so a proof scene can show it from sample data. */
export function FvgExamplesView({ examples, heading }: { examples: readonly FvgJournalExample[]; heading?: string }) {
  if (examples.length === 0) {
    return <p data-testid="fvg-examples-empty" className="text-[11px] text-wm-text-dim">{FVG_EXAMPLES_EMPTY_LINE}</p>;
  }
  return (
    <div data-testid="fvg-examples">
      <div className="text-[10px] font-black uppercase tracking-wider text-wm-text-muted">{heading ?? `Show me my examples · ${examples.length} decision${examples.length === 1 ? "" : "s"} on gaps from your Journal (this browser)`}</div>
      <ul className="mt-1.5 space-y-1.5">
        {examples.slice(0, 8).map(e => (
          <li key={e.id} className="text-[11px] text-wm-text leading-snug" style={{ overflowWrap: "anywhere" }}>
            <Link href={e.href} prefetch={false} data-testid="fvg-example-link" className="inline-flex min-h-11 items-center rounded font-semibold text-wm-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">{e.symbol} · {e.date || "undated"} →</Link>
            <span className="block text-wm-text-muted">As of the decision: {e.stateLine}</span>
            <span className="block text-wm-text-dim">{e.result ? `Result: ${e.result}` : "Result: not recorded"} · {e.adherence ? `Plan: ${e.adherence}` : "Plan: no frozen plan"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FvgLessonBody({ lesson, color }: { lesson: FvgLesson; color: string }) {
  const chart = fvgChartLink(lesson);
  const replay = fvgReplayPractice(lesson, chart.shipped);
  return (
    <div data-testid="fvg-lesson" data-fvg-lesson={lesson.id} className="px-4 py-4 space-y-4">
      <div>
        <div className="text-[10px] max-sm:text-[11px] font-black uppercase tracking-wider" style={{ color }}>Lesson {lesson.n} of 21 · FVG / Imbalance & Patience</div>
        <h2 className="mt-1 text-base font-bold text-wm-text" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}>{lesson.title}</h2>
        <p className="mt-1 text-[13px] text-wm-text leading-relaxed">{lesson.lede}</p>
      </div>

      <figure className="m-0">
        <FvgDiagram kind={lesson.diagram} title={lesson.title} />
        <figcaption className="mt-1 text-[9px] max-sm:text-[11px] text-wm-text-dim">Schematic drawing — not market data. Hollow bar: closed up · filled bar: closed down · hatched: the territory.</figcaption>
      </figure>

      <div className="space-y-2">
        {lesson.body.map((p, i) => <p key={i} className="text-[12px] text-wm-text-muted leading-relaxed">{p}</p>)}
      </div>

      <div className="p-3 rounded-xl border border-wm-border bg-wm-surface/20">
        <div className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color }}>What to look for</div>
        <ul className="space-y-1.5">
          {lesson.look.map((t, i) => <li key={i} className="text-[11px] text-wm-text leading-snug">· {t}</li>)}
        </ul>
      </div>

      {FVG_MYTH_LESSONS.includes(lesson.n) ? <FvgMythCard /> : null}

      <div className="p-3 rounded-xl border border-wm-border bg-wm-surface/20 space-y-2">
        <Link
          href={chart.href}
          prefetch={false}
          data-testid="fvg-show-on-chart"
          data-fvg-layer={chart.shipped ? "SHIPPED" : "PENDING"}
          className="inline-flex min-h-11 items-center rounded-lg border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold text-[11px] font-semibold text-wm-text hover:text-wm-gold"
          style={{ borderColor: "rgba(201,165,92,0.45)" }}
        >
          Show me on a chart →
        </Link>
        {chart.note ? <p data-testid="fvg-layer-pending" className="text-[10px] text-amber-200">{chart.note}</p> : null}
        {replay ? (
          <div data-testid="fvg-replay-practice">
            <Link
              href={replay.href}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-lg border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold text-[11px] font-semibold text-wm-text hover:text-wm-gold"
              style={{ borderColor: "rgba(201,165,92,0.45)" }}
            >
              {replay.label} →
            </Link>
            <p className="mt-1 text-[10px] text-wm-text-dim leading-relaxed">{replay.steps}</p>
          </div>
        ) : null}
        <MyExamples />
        {/* Garden 19 §56: LEARN → LEARN YOURSELF — from the lesson back into your own record. */}
        {learnYourselfLinks(lesson.id).length ? (
          <div data-testid="fvg-learn-yourself" className="flex flex-wrap gap-2">
            {learnYourselfLinks(lesson.id).map(l => (
              <Link key={l.href} href={l.href} prefetch={false} className="inline-flex min-h-11 items-center rounded-lg border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold text-[11px] font-semibold text-wm-text hover:text-wm-gold" style={{ borderColor: "rgba(201,165,92,0.45)" }}>{l.label} →</Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
