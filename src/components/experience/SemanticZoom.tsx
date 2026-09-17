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

/**
 * THE STAGE-CHANGE DECISION, LIFTED OUT WHERE A TEST CAN WATCH IT.
 *
 * Returns the level the view should snap to because the CALLER asked for a new
 * starting depth, or `null` to leave the trader's current choice alone.
 *
 * This is a separate function for one reason: there is no jsdom in this repo,
 * so component tests use `renderToStaticMarkup`, which mounts fresh on every
 * call and is therefore structurally incapable of observing a prop that CHANGED
 * BETWEEN RENDERS. That blindness is not hypothetical — it is exactly how the
 * live "ENTER is only a resize" defect got past a green test file. A pure
 * function takes the previous request as an argument instead of reading it from
 * a ref, so a test can play a sequence of renders by hand and assert on each
 * step, which is the thing the rendering path cannot do here.
 *
 * The three refusals, in the order they matter:
 *   - no `requested` at all → the caller is not steering; never move.
 *   - `requested` unchanged since last time → this is an ordinary parent
 *     re-render, NOT a stage change. Moving here would spring the zoom control
 *     back on top of the trader's own tab press and make it unusable.
 *   - `requested` not among the supplied levels → the caller is asking for a
 *     depth this content does not have; showing some other level would be
 *     answering a question that was not asked.
 */
export function stageChangeLevel(args: {
  readonly requested: SemanticZoomLevel | undefined;
  readonly lastRequested: SemanticZoomLevel | undefined;
  readonly available: readonly SemanticZoomLevel[];
}): SemanticZoomLevel | null {
  const { requested, lastRequested, available } = args;
  if (requested === undefined) return null;
  if (requested === lastRequested) return null;
  if (!available.includes(requested)) return null;
  return requested;
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

  /**
   * A CHANGED `defaultLevel` IS A STAGE CHANGE, AND IT MUST MOVE THE VIEW.
   *
   * `defaultLevel` above is the initial value of `useState`, which means it is
   * read exactly once per MOUNT. That is correct for every caller that passes a
   * constant. It was silently wrong for the first caller that changes it while
   * the component stays mounted.
   *
   * FOUND IN THE LIVE PRODUCT, NOT IN A TEST. The WORKSPACE grammar's sixth
   * tenant opens the learning genome docked at L1 and passes `defaultLevel={3}`
   * when the trader presses ENTER. The panel is not remounted between those two
   * stages, so the prop changed and nothing happened: ENTER went full-screen
   * still showing L1. That is precisely the "ENTER is only a resize" failure the
   * grammar exists to prevent, arriving through the one door that was not a
   * source scan. A `renderToStaticMarkup` test cannot catch it, because that
   * mounts fresh on every render and so can never observe the second one.
   *
   * WHY A REF AND NOT A PLAIN EFFECT ON `defaultLevel`. Snapping whenever the
   * prop is merely PRESENT would overwrite the trader's own tab press on every
   * parent re-render — the zoom control would spring back and the manual choice
   * would be unusable. This fires only on the EDGE: the value the caller asks
   * for actually changed since last time. Inside a stage the trader is free to
   * pick any level and keep it; crossing into another stage moves them, which is
   * the caller stating a new starting depth rather than fighting the user for
   * the current one.
   *
   * Callers passing a constant are unaffected — the ref never differs, so this
   * effect never runs a second time for them.
   */
  const lastRequested = React.useRef(defaultLevel);
  React.useEffect(() => {
    const next = stageChangeLevel({
      requested: defaultLevel,
      lastRequested: lastRequested.current,
      available,
    });
    // The request is RECORDED even when it is refused, so a depth this content
    // does not carry is asked for once and then stops being an edge.
    if (defaultLevel !== undefined) lastRequested.current = defaultLevel;
    if (next === null) return;
    setLevel(next);
    onLevelChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLevel]);

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
