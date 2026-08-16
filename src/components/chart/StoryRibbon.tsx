"use client";
import * as React from "react";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import Panel from "@/components/ui/Panel";
import Ribbon from "@/components/ui/Ribbon";
import {
  selectMarketStory,
  type StoryVM,
  type ChapterEntry,
  type StoryChapter,
} from "@/lib/marketData/viewModels/selectMarketStory";

/**
 * StoryRibbon — first non-test UI consumer of CanonicalMarketState.
 *
 * Closes the P00290 "publisher without consumer" adoption gap from the
 * Nectar authority doc. Composes:
 *
 *   CanonicalMarketState  →  selectMarketStory (pure selector)
 *                        →  Ribbon primitive (pure display)
 *                        →  Panel primitive (obsidian glass shell)
 *
 * Pure display: takes state + optional history/priorChapters as props. When
 * the local clone catches up to production and the canonicalMarketStateStore
 * lands, a 1-line hook-based wrapper subscribes and forwards to this
 * component. Keeping the display pure means every future consumer path
 * (chart, mobile, replay, journal drill-down) reuses the same rendering
 * without a store dependency.
 *
 * UNKNOWN handling flows through untouched — Ribbon primitive renders the
 * "Market state cannot be resolved yet." fallback when activeIndex is null.
 */

// Glyph vocabulary — non-authoritative, extensible via props if callers want
// to override to match an updated visual system.
const DEFAULT_GLYPHS: Record<StoryChapter, string> = {
  OPENING_AUCTION: "◈",
  BALANCE: "⟢",
  COMPRESSION: "◆",
  LIQUIDITY_PROBE: "✧",
  SWEEP: "⟢",
  ABSORPTION: "✦",
  RECLAIM: "◇",
  BREAKOUT: "◈",
  ACCEPTANCE: "⧫",
  TREND_EXPANSION: "✦",
  ROTATION: "◇",
  VALUE_MIGRATION: "⧫",
  EXHAUSTION: "✧",
  CLOSING_AUCTION: "◈",
};

const DEFAULT_NAMES: Record<StoryChapter, string> = {
  OPENING_AUCTION: "Open",
  BALANCE: "Balance",
  COMPRESSION: "Compression",
  LIQUIDITY_PROBE: "Liquidity Probe",
  SWEEP: "Sweep",
  ABSORPTION: "Absorption",
  RECLAIM: "Reclaim",
  BREAKOUT: "Breakout",
  ACCEPTANCE: "Acceptance",
  TREND_EXPANSION: "Trend Expansion",
  ROTATION: "Rotation",
  VALUE_MIGRATION: "Value Migration",
  EXHAUSTION: "Exhaustion",
  CLOSING_AUCTION: "Close",
};

export interface StoryRibbonProps {
  /** Current market state snapshot. When null → renders UNKNOWN placeholder. */
  state: CanonicalMarketState | null;
  /** Rolling window of prior snapshots — needed by guards like ABSORPTION. */
  history?: readonly CanonicalMarketState[];
  /** Previously observed chapter transitions — enables continuity. */
  priorChapters?: readonly ChapterEntry[];
  /** Optional per-chapter glyph override. */
  glyphs?: Partial<Record<StoryChapter, string>>;
  /** Optional per-chapter display name override. */
  names?: Partial<Record<StoryChapter, string>>;
  /** Called when user clicks a chapter for evidence drill-down. */
  onChapterClick?: (chapter: ChapterEntry) => void;
  className?: string;
}

export function StoryRibbon({
  state,
  history = [],
  priorChapters = [],
  glyphs,
  names,
  onChapterClick,
  className,
}: StoryRibbonProps) {
  const vm: StoryVM = React.useMemo(() => {
    if (!state) {
      return {
        current: null,
        recent: priorChapters.slice(-6),
        resolution: "UNKNOWN",
        reason: "Canonical Market State snapshot unavailable",
      };
    }
    return selectMarketStory(state, history, priorChapters);
  }, [state, history, priorChapters]);

  const combinedGlyphs = { ...DEFAULT_GLYPHS, ...(glyphs ?? {}) };
  const combinedNames = { ...DEFAULT_NAMES, ...(names ?? {}) };

  // Merge current chapter into recent for display continuity
  const chaptersToRender = React.useMemo(() => {
    const base = vm.recent.length > 0 ? vm.recent : priorChapters;
    if (vm.current && !base.some((c) => c.chapter === vm.current!.chapter && c.enteredAt === vm.current!.enteredAt)) {
      return [...base, vm.current].slice(-6);
    }
    return base.slice(-6);
  }, [vm, priorChapters]);

  const activeIndex = vm.current
    ? chaptersToRender.findIndex(
        (c) => c.chapter === vm.current!.chapter && c.enteredAt === vm.current!.enteredAt,
      )
    : null;

  const nowMs = state?.capturedAt ?? Date.now();
  const ribbonChapters = chaptersToRender.map((c) => {
    const isActive = vm.current && c.chapter === vm.current.chapter && c.enteredAt === vm.current.enteredAt;
    return {
      id: `${c.chapter}-${c.enteredAt}`,
      name: combinedNames[c.chapter],
      glyph: combinedGlyphs[c.chapter],
      resolution: c.resolution,
      reason: c.reason,
      durationMs: isActive ? Math.max(0, nowMs - c.enteredAt) : undefined,
      evidenceCount: c.evidence.length,
    };
  });

  // Narrative — if the current chapter has a reason, use it; otherwise omit.
  // Never fabricate a story sentence when evidence is thin.
  const narrative =
    vm.current && vm.resolution === "RESOLVED"
      ? null
      : vm.reason ?? null;

  return (
    <Panel label="Story Ribbon · Market Narrative" className={className}>
      <Ribbon
        chapters={ribbonChapters}
        activeIndex={activeIndex === -1 ? null : activeIndex}
        narrative={narrative}
        onChapterClick={
          onChapterClick
            ? (rc) => {
                const entry = chaptersToRender.find((e) => `${e.chapter}-${e.enteredAt}` === rc.id);
                if (entry) onChapterClick(entry);
              }
            : undefined
        }
      />
    </Panel>
  );
}

export default StoryRibbon;
