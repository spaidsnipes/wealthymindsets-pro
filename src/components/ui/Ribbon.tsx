"use client";
import * as React from "react";

/**
 * Ribbon — Story Ribbon chapter strip.
 *
 * Renders an ordered strip of chapters with one "active" chapter highlighted.
 * The Ribbon is a display primitive — chapter derivation lives in the pure
 * selector `selectMarketStory(state, history, config)` and MUST be passed in.
 *
 * Truth contract:
 *  - `activeIndex === null` renders the strip fully dim with an UNKNOWN note.
 *    Never assume an active chapter when the selector could not resolve one.
 *  - Each chapter carries its own resolution — dim chapters that are UNKNOWN.
 *  - Narrative below the strip is optional; renders only if supplied.
 *
 * Accessibility:
 *  - `role="tablist"` for the chapter row.
 *  - Active chapter is `aria-current="step"`.
 *  - Each chapter has an aria-label combining name + resolution + reason.
 */
export type MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";

export interface RibbonChapter {
  id: string;
  name: string;
  glyph: string;
  resolution?: MarketStateResolution;
  /** Reason surfaced to a11y when resolution !== RESOLVED. */
  reason?: string;
}

export interface RibbonProps {
  chapters: readonly RibbonChapter[];
  /** null when no active chapter can be resolved from evidence. */
  activeIndex: number | null;
  /** Optional narrative line rendered below the strip (evidence-derived). */
  narrative?: string | null;
  /** Ariaa label for the whole ribbon. */
  ariaLabel?: string;
  /** Called when a chapter is clicked (for evidence drilldown). */
  onChapterClick?: (chapter: RibbonChapter, index: number) => void;
  className?: string;
}

export function Ribbon({
  chapters,
  activeIndex,
  narrative,
  ariaLabel = "Market story ribbon",
  onChapterClick,
  className,
}: RibbonProps) {
  return (
    <div className={["wm-ribbon", className ?? ""].join(" ")}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="grid grid-flow-col auto-cols-fr gap-1.5 mb-3.5"
      >
        {chapters.map((c, i) => {
          const active = i === activeIndex;
          const resolution = c.resolution ?? "RESOLVED";
          const dim = resolution === "UNKNOWN";
          const partial = resolution === "PARTIAL";
          const label = [
            c.name,
            active ? "active" : "past/future",
            resolution.toLowerCase(),
            c.reason,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              aria-current={active ? "step" : undefined}
              aria-label={label}
              onClick={onChapterClick ? () => onChapterClick(c, i) : undefined}
              className="text-center bg-transparent border-0 p-0 cursor-pointer disabled:cursor-default"
              disabled={!onChapterClick}
            >
              <div
                className="mx-auto mb-1.5 flex items-center justify-center rounded-full border"
                style={{
                  width: 34,
                  height: 34,
                  borderColor: active
                    ? "var(--wm-gold-hero, #d4af37)"
                    : "var(--wm-gold-hair, #6d5220)",
                  color: dim
                    ? "var(--wm-text-3, #55503f)"
                    : active
                    ? "var(--wm-gold-hero, #d4af37)"
                    : "var(--wm-gold-mark, #c9a55c)",
                  boxShadow: active ? "0 0 16px -4px var(--wm-gold-halo, #ffd76a)" : "none",
                  opacity: dim ? 0.5 : partial ? 0.75 : 1,
                }}
              >
                <span aria-hidden="true" className="text-sm">
                  {c.glyph}
                </span>
              </div>
              <div
                className="text-[9px] tracking-[0.16em] uppercase leading-tight"
                style={{
                  color: active
                    ? "var(--wm-text-1, #ede6d3)"
                    : "var(--wm-text-2, #8a8271)",
                }}
              >
                {c.name}
              </div>
            </button>
          );
        })}
      </div>
      {activeIndex === null ? (
        <div
          className="text-[12px] text-[color:var(--wm-text-2,#8a8271)] italic pt-3 border-t"
          style={{ borderColor: "rgba(139,106,41,0.15)" }}
        >
          Market state cannot be resolved yet.
        </div>
      ) : narrative ? (
        <div
          className="text-[13px] text-[color:var(--wm-text-1,#ede6d3)] leading-6 pt-3 border-t italic"
          style={{ borderColor: "rgba(139,106,41,0.15)" }}
        >
          {narrative}
        </div>
      ) : null}
    </div>
  );
}

export default Ribbon;
