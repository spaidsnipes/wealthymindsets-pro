"use client";

/**
 * One lesson of the Academy's FVG / Imbalance & Patience course (Garden 19
 * §32–36), rendered inside the Academy's own lesson pane. Content comes from
 * src/lib/academy/fvgCourse.ts — this component only lays it out.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FVG_EXAMPLES_EMPTY_LINE, FVG_MYTH_CARD, FVG_MYTH_LESSONS, fvgChartLink, fvgTaggedExamples,
  type FvgJournalExample, type FvgLesson,
} from "@/lib/academy/fvgCourse";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { FvgDiagram } from "./FvgDiagram";

export function FvgMythCard() {
  return (
    <div data-testid="fvg-myth-card" className="rounded-xl border p-3" style={{ borderColor: "rgba(201,165,92,0.45)", background: "rgba(201,165,92,0.06)" }}>
      <div className="text-[11px] font-bold text-wm-text"><s className="decoration-wm-text-dim">{FVG_MYTH_CARD.myth}</s></div>
      <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "#e3cf9c" }}>{FVG_MYTH_CARD.better}</div>
    </div>
  );
}

/** §36 — the trader's own FVG-tagged trades, or one plain line until there are some. */
function MyExamples() {
  const [examples, setExamples] = useState<FvgJournalExample[] | null>(null);
  useEffect(() => {
    try {
      const read = readJournalStorage(window.localStorage);
      setExamples(fvgTaggedExamples(read.records));
    } catch { setExamples([]); }
  }, []);
  if (examples === null) return null;
  if (examples.length === 0) {
    return <p data-testid="fvg-examples-empty" className="text-[11px] text-wm-text-dim">{FVG_EXAMPLES_EMPTY_LINE}</p>;
  }
  return (
    <div data-testid="fvg-examples">
      <div className="text-[10px] font-black uppercase tracking-wider text-wm-text-muted">Show me my examples · {examples.length} from your Journal (this browser)</div>
      <ul className="mt-1.5 space-y-1">
        {examples.slice(0, 6).map(e => (
          <li key={e.id} className="text-[11px] text-wm-text">
            {e.symbol} · {e.date || "undated"}{e.result ? ` · ${e.result}` : ""}
          </li>
        ))}
      </ul>
      <Link href="/journal" className="mt-1.5 inline-flex min-h-9 items-center text-[11px] font-semibold text-wm-gold hover:underline">Open them in the Journal →</Link>
    </div>
  );
}

export function FvgLessonBody({ lesson, color }: { lesson: FvgLesson; color: string }) {
  const chart = fvgChartLink(lesson);
  return (
    <div data-testid="fvg-lesson" data-fvg-lesson={lesson.id} className="px-4 py-4 space-y-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>Lesson {lesson.n} of 21 · FVG / Imbalance & Patience</div>
        <h2 className="mt-1 text-base font-bold text-wm-text" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}>{lesson.title}</h2>
        <p className="mt-1 text-[13px] text-wm-text leading-relaxed">{lesson.lede}</p>
      </div>

      <figure className="m-0">
        <FvgDiagram kind={lesson.diagram} title={lesson.title} />
        <figcaption className="mt-1 text-[9px] text-wm-text-dim">Schematic drawing — not market data. Hollow bar: closed up · filled bar: closed down · hatched: the territory.</figcaption>
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
          className="inline-flex min-h-11 items-center rounded-lg border px-3 text-[11px] font-semibold text-wm-text hover:text-wm-gold"
          style={{ borderColor: "rgba(201,165,92,0.45)" }}
        >
          Show me on a chart →
        </Link>
        {chart.note ? <p data-testid="fvg-layer-pending" className="text-[10px] text-amber-200">{chart.note}</p> : null}
        <MyExamples />
      </div>
    </div>
  );
}
