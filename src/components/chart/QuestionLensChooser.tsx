/**
 * THE ASK — the Question Lens's chooser (Auto · Absorbed? · … · Show raw).
 *
 * The Founder's correction names the questions a trader asks of the camera
 * (continuation healthy? · trap? · hold?). The lens owner compiles the answer
 * and refuses what it cannot ask; this row only chooses.
 *
 * ONE markup, TWO placements, never both on screen (UI-04, 2026-09-26):
 *
 *   "rail"     — inside the decision rail's lens card. UI-04 puts no question
 *                controls on the price surface; with the rail mounted (desktop,
 *                Options closed) the chooser lives with the lens reading.
 *   "floating" — over the pane's bottom-left, ONLY where there is no rail
 *                (narrow glass / Options). It holds the only way to change the
 *                question and the only Show raw, so it stays inside the pane at
 *                every height and renders on phones too.
 *
 * The room owns the state and the handlers and builds ONE element; which
 * placement it lands in is decided in one place (ChartsDashboard).
 */

import * as React from "react";
import { QUESTION_CHOICES, type QuestionChoice } from "@/lib/marketData/viewModels/selectQuestionLens";

export type QuestionLensChooserPlacement = "rail" | "floating";

export interface QuestionLensChooserProps {
  readonly placement: QuestionLensChooserPlacement;
  readonly choice: QuestionChoice;
  readonly onChoose: (choice: QuestionChoice) => void;
  readonly rawOn: boolean;
  readonly onToggleRaw: () => void;
}

/**
 * Under the lens column where the pane is tall enough, but never below the
 * pane's floor: the pane clips overflow. Pinned by
 * questionLensContinuity.sentinel.test.ts.
 */
const FLOATING_STYLE: React.CSSProperties = {
  left: 12,
  top: "min(532px, calc(100% - 96px))",
  width: "min(300px, calc(100% - 24px))",
  background: "rgba(11,10,8,0.92)",
};

export function QuestionLensChooser({ placement, choice, onChoose, rawOn, onToggleRaw }: QuestionLensChooserProps) {
  const floating = placement === "floating";
  return (
    <div
      role="radiogroup"
      aria-label="Ask the chart a question"
      data-testid="question-lens-chooser"
      data-placement={placement}
      className={
        floating
          ? "absolute z-[60] flex flex-wrap items-center gap-1 rounded-md border border-wm-gold/40 px-1.5 py-1"
          : "flex flex-wrap items-center gap-1"
      }
      style={floating ? FLOATING_STYLE : undefined}
    >
      <span className="px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-wm-text-dim">Ask</span>
      {QUESTION_CHOICES.map(c => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={choice === c.id}
          data-question-choice={c.id}
          onClick={() => onChoose(c.id)}
          className={`min-h-7 rounded px-2 text-[10px] font-semibold ${choice === c.id ? "bg-wm-gold/20 text-wm-gold" : "text-wm-text-muted hover:text-wm-text"}`}
        >
          {c.label}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={rawOn}
        data-testid="show-raw"
        onClick={onToggleRaw}
        className={`min-h-7 rounded border px-2 text-[10px] font-semibold ${rawOn ? "border-wm-gold/60 bg-wm-gold/20 text-wm-gold" : "border-wm-border text-wm-text-muted hover:text-wm-text"}`}
      >
        {rawOn ? "Raw · restore" : "Show raw"}
      </button>
    </div>
  );
}
