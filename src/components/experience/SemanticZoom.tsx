"use client";

import * as React from "react";

/**
 * SemanticZoom — canon §Phase 2 Experience Shell primitive
 * (2028 Experience Transformation Contract, 2026-08-20).
 *
 * Canon verbatim:
 *   "SEMANTIC ZOOM
 *    Do not force all information to remain permanently visible.
 *    Level 1: one-glance state.
 *    Level 2: essential evidence.
 *    Level 3: detailed evidence and provenance.
 *    Level 4: raw/source-level inspection where available.
 *    A professional can drill deeper without forcing a beginner to
 *    carry all complexity simultaneously."
 *
 * This primitive codifies the 4-level pattern so every canon truth
 * surface renders the same way — one canonical writer for the entire
 * progressive-disclosure interaction. Consumers pass a level record
 * (any subset of L1..L4) and get:
 *
 *   - Level pill row (only levels that were supplied are clickable)
 *   - The rendered content for the currently-selected level
 *   - Keyboard navigation (Arrow left/right cycles supplied levels)
 *   - `defaultLevel` sets initial view (L1 unless overridden)
 *
 * Level content stays the caller's responsibility — the primitive
 * only owns the zoom interaction, not the content shape. Callers may
 * pass a React element or a render function receiving the level.
 *
 * Canon compliance:
 *   §Silence Is A Feature — levels the caller doesn't supply are
 *      hidden (no fake tabs).
 *   §The screen gets quieter when confidence is lower — level pills
 *      only render when > 1 level was supplied.
 *   §Do not force all information to remain permanently visible —
 *      L1 renders by default; deeper levels are opt-in.
 */

export type SemanticZoomLevel = 1 | 2 | 3 | 4;

const LEVEL_LABEL: Record<SemanticZoomLevel, string> = {
  1: "One-glance",
  2: "Essential",
  3: "Detailed",
  4: "Raw",
};

const LEVEL_SHORT: Record<SemanticZoomLevel, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
};

export type SemanticZoomLevels = Partial<Record<SemanticZoomLevel, React.ReactNode>>;

export interface SemanticZoomProps {
  /** Level content. Any subset of L1..L4 may be provided. */
  readonly levels: SemanticZoomLevels;
  /** Optional label for aria + screen-reader context. */
  readonly ariaLabel?: string;
  /** Initial level to render. Defaults to L1 (or the lowest supplied). */
  readonly defaultLevel?: SemanticZoomLevel;
  /** Optional callback whenever the trader changes level. */
  readonly onLevelChange?: (level: SemanticZoomLevel) => void;
}

/**
 * Return the ordered list of levels actually supplied by the caller.
 * A level is "supplied" when its value is not undefined AND not null.
 * (Empty strings + `0` COULD be legitimate content, so we keep them.)
 */
function suppliedLevels(levels: SemanticZoomLevels): readonly SemanticZoomLevel[] {
  return ([1, 2, 3, 4] as const).filter(
    (l) => levels[l] !== undefined && levels[l] !== null,
  );
}

export function SemanticZoom({
  levels,
  ariaLabel,
  defaultLevel,
  onLevelChange,
}: SemanticZoomProps): React.ReactElement | null {
  const available = suppliedLevels(levels);
  const initial = defaultLevel ?? available[0] ?? 1;
  const [level, setLevel] = React.useState<SemanticZoomLevel>(initial);

  // If the caller re-renders with a different available set, snap the
  // selected level to the closest available one.
  React.useEffect(() => {
    if (!available.includes(level) && available.length > 0) {
      const next = available[0];
      setLevel(next);
      onLevelChange?.(next);
    }
    // Only depend on the available-level SIGNATURE, not the array
    // reference — avoids infinite loops on parent re-renders that
    // pass a fresh (but shape-equal) `levels` object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available.join(",")]);

  if (available.length === 0) return null;

  function select(next: SemanticZoomLevel) {
    if (!available.includes(next) || next === level) return;
    setLevel(next);
    onLevelChange?.(next);
  }

  function onPillKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const idx = available.indexOf(level);
    if (idx < 0) return;
    const nextIdx = e.key === "ArrowLeft"
      ? (idx - 1 + available.length) % available.length
      : (idx + 1) % available.length;
    select(available[nextIdx]);
    e.preventDefault();
  }

  return (
    <section
      aria-label={ariaLabel ?? "Semantic zoom"}
      className="rounded-lg border border-wm-border bg-wm-black/40 p-2"
    >
      {available.length > 1 && (
        <div
          role="tablist"
          aria-label="Zoom level"
          onKeyDown={onPillKey}
          className="flex items-center gap-1 mb-2"
        >
          {available.map((l) => {
            const isActive = l === level;
            return (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${LEVEL_LABEL[l]} view`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(l)}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  padding: "3px 7px",
                  minHeight: 22,
                  borderRadius: 3,
                  color: isActive ? "#0B0B0D" : "#8B92AC",
                  background: isActive ? "#F0B429" : "transparent",
                  border: `1px solid ${isActive ? "#F0B429" : "#2A2E3B"}`,
                  cursor: isActive ? "default" : "pointer",
                  textTransform: "uppercase",
                }}
                title={LEVEL_LABEL[l]}
              >
                {LEVEL_SHORT[l]}
              </button>
            );
          })}
        </div>
      )}
      <div>{levels[level] ?? null}</div>
    </section>
  );
}
