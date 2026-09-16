"use client";

/**
 * useMarketStory — the OWNER of market-story CONTINUITY.
 *
 * A MARKET STORY WITHOUT MEMORY IS A STILL PHOTOGRAPH THAT CALLS ITSELF A FILM.
 *
 * WHAT WAS WRONG. `selectMarketStory(state, history, priorChapters)` is pure,
 * and its third argument is where every temporal fact lives:
 *
 *   - `enteredAt` — when the market ENTERED the chapter it is in now. On a
 *     re-render with no priorChapters the selector has no entry to retain, so
 *     it MINTS A NEW ONE with `enteredAt = state.capturedAt`. StoryRibbon then
 *     renders `durationMs = capturedAt - enteredAt`, which is therefore ALWAYS
 *     ZERO. The chapter clock on /command-deck read "just entered" forever.
 *   - `recent` — the chapter history. Without priorChapters it is derived from
 *     priorChapters, so it is ALWAYS EMPTY. The /command-deck disclosure is
 *     literally labelled "Market chapter history" and could never contain one.
 *   - the freshness window — when no guard fires at this instant but the prior
 *     chapter is younger than `freshnessMaxMs`, the selector is supposed to
 *     PRESERVE it and report PARTIAL. With nothing to preserve it fell all the
 *     way to UNKNOWN, so a momentary gap in evidence read as "no story".
 *
 * The selector was never broken. It was called without the argument that makes
 * it a story. THE BANS CANNOT SEE AN ARGUMENT THAT WAS NEVER PASSED.
 *
 * WHY A HOOK AND NOT A REF INSIDE A COMPONENT. Continuity has to be owned in
 * exactly one place, or two surfaces on one screen will disagree about which
 * chapter the market is in and how long it has been there. This hook is that
 * place; callers pass its result to every consumer rather than recompiling.
 *
 * HOW THE FEEDBACK LOOP TERMINATES. `recent` is committed back as the next
 * `priorChapters` only when it actually CHANGES, compared by chapter identity
 * (`chapter` + `enteredAt` + `exitedAt`). `selectMarketStory` is idempotent
 * under that feedback — re-running it with its own `recent` retains the same
 * current entry and returns the same list — so the guard rejects the second
 * commit and the render settles. Without that guard this would be an infinite
 * render, which is the single most expensive class of bug this repo has
 * already paid for.
 *
 * NOTHING IS PERSISTED. Chapters live for the life of the mount. Durable
 * history is reserved for the rights-gated memory layer per Founder doctrine,
 * so this hook must never be described as "remembering" across sessions.
 */

import * as React from "react";
import type { CanonicalMarketState } from "../canonicalMarketState";
import {
  selectMarketStory,
  type ChapterEntry,
  type StoryVM,
} from "./selectMarketStory";

/** Default chapter-history depth. Matches selectMarketStory's own historyCap. */
export const STORY_CHAPTER_CAP = 6;

/**
 * Chapter-identity equality. Deliberately NOT a deep compare: `evidence` and
 * `contradictions` are rebuilt on every guard pass and would never compare
 * equal, which would defeat the commit guard and spin the render loop.
 */
export function sameChapterList(
  a: readonly ChapterEntry[],
  b: readonly ChapterEntry[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].chapter !== b[i].chapter ||
      a[i].enteredAt !== b[i].enteredAt ||
      a[i].exitedAt !== b[i].exitedAt
    ) {
      return false;
    }
  }
  return true;
}

export interface UseMarketStoryOptions {
  /** Chapter-history depth. Default STORY_CHAPTER_CAP. */
  readonly cap?: number;
}

/**
 * Compile the market story WITH continuity. Returns the same StoryVM shape
 * `selectMarketStory` returns, so every existing consumer reads unchanged.
 *
 * `state === null` yields the honest UNKNOWN vm and — importantly — does NOT
 * discard accumulated chapters: a dropped snapshot is not evidence that the
 * chapters before it never happened.
 */
export function useMarketStory(
  state: CanonicalMarketState | null,
  history: readonly CanonicalMarketState[] = [],
  options?: UseMarketStoryOptions,
): StoryVM {
  const cap = options?.cap ?? STORY_CHAPTER_CAP;
  const [priorChapters, setPriorChapters] = React.useState<readonly ChapterEntry[]>([]);

  const vm: StoryVM = React.useMemo(() => {
    if (!state) {
      return {
        current: null,
        recent: priorChapters.slice(-cap),
        resolution: "UNKNOWN",
        reason: "Canonical Market State snapshot unavailable",
      };
    }
    return selectMarketStory(state, history, priorChapters);
  }, [state, history, priorChapters, cap]);

  // Commit-if-changed. The identity guard is what makes this terminate; see
  // the docblock. Effect, not render — a render-phase setState here would be
  // the same class of defect as reading a clock at render.
  React.useEffect(() => {
    const next = vm.recent.slice(-cap);
    setPriorChapters((prev) => (sameChapterList(prev, next) ? prev : next));
  }, [vm, cap]);

  return vm;
}

export default useMarketStory;
