/**
 * THE CAP MUST MEAN ONE THING IN BOTH PLACES THAT DRAW IT.
 *
 * Two defects are pinned here.
 *
 * (1) A CONTROL THAT DID NOT MOVE ITS OWN PIXELS. "Levels shown" lives inside
 *     the WM DELTA BUBBLES card; the strip directly beneath it rendered the
 *     UNCAPPED partition. The chart canvas obeyed the setting, the card hosting
 *     the setting did not, and the "N LEVELS" chip counted the uncapped list.
 *
 * (2) AN ALLOW-LIST SPELLED FOUR TIMES IN TWO FILES. `[5, 7, 10, 15]` in the
 *     panel's initial read, its cross-tab sync, MainChart, and the button row.
 *     Four copies that agree until one is edited.
 *
 * The behavioural tests below pin the MEANING of the cap (rank by |delta|,
 * render by price, fail closed, disclose truncation). The Sentinels pin that
 * neither consumer re-spells the domain — they read COMMENT-STRIPPED source,
 * because a rule quoted in a docblock is not a render.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  capDeltaLevels,
  DELTA_LEVEL_CAP_CHOICES,
  DELTA_LEVEL_CAP_DEFAULT,
  DELTA_LEVEL_CAP_EVENT,
  DELTA_LEVEL_CAP_STORAGE_KEY,
  normalizeDeltaLevelCap,
} from "./deltaLevelCap";

const lvl = (price: number, delta: number) => ({ price, delta });

describe("normalizeDeltaLevelCap — fails closed to a value the UI marks", () => {
  it("accepts every legal choice, as a number and as a stored string", () => {
    for (const c of DELTA_LEVEL_CAP_CHOICES) {
      expect(normalizeDeltaLevelCap(c)).toBe(c);
      expect(normalizeDeltaLevelCap(String(c))).toBe(c);
    }
  });

  it("THE LOAD-BEARING ASSERTION — an illegal value does NOT clamp to a neighbour", () => {
    // A stored 12 becoming 10 is how a surface ends up showing a number nobody
    // chose, with the button row highlighting a different one. It becomes the
    // default, which is at least a value the trader can see selected.
    expect(normalizeDeltaLevelCap(12)).toBe(DELTA_LEVEL_CAP_DEFAULT);
    expect(normalizeDeltaLevelCap(99)).toBe(DELTA_LEVEL_CAP_DEFAULT);
    expect(normalizeDeltaLevelCap(1)).toBe(DELTA_LEVEL_CAP_DEFAULT);
    expect(normalizeDeltaLevelCap(-5)).toBe(DELTA_LEVEL_CAP_DEFAULT);
  });

  it("survives every shape localStorage can hand back", () => {
    for (const raw of [null, undefined, "", "   ", "abc", "NaN", "7.9", "0"]) {
      expect(DELTA_LEVEL_CAP_CHOICES).toContain(normalizeDeltaLevelCap(raw));
    }
    // parseInt("7.9") is 7 — a legal choice, and the nearest honest reading.
    expect(normalizeDeltaLevelCap("7.9")).toBe(7);
  });

  it("the default is itself a legal choice", () => {
    expect(DELTA_LEVEL_CAP_CHOICES).toContain(DELTA_LEVEL_CAP_DEFAULT);
  });

  it("the domain cannot be quietly extended by a caller", () => {
    expect(Object.isFrozen(DELTA_LEVEL_CAP_CHOICES)).toBe(true);
  });
});

describe("capDeltaLevels — rank by |delta|, render by price", () => {
  it("passes a short list through untouched and reports no truncation", () => {
    const all = [lvl(3, 5), lvl(2, -9), lvl(1, 1)];
    const r = capDeltaLevels(all, 7);
    expect(r.levels).toEqual(all);
    expect(r.shown).toBe(3);
    expect(r.total).toBe(3);
    expect(r.truncated).toBe(false);
  });

  it("keeps the LARGEST |delta|, not the first N in the list", () => {
    const r = capDeltaLevels([lvl(5, 1), lvl(4, 2), lvl(3, -50), lvl(2, 3), lvl(1, 40)], 2);
    expect(r.levels.map(l => l.price)).toEqual([3, 1]);
    expect(r.shown).toBe(2);
    expect(r.total).toBe(5);
    expect(r.truncated).toBe(true);
  });

  it("ranks on MAGNITUDE — a large sell level outranks a small buy one", () => {
    const r = capDeltaLevels([lvl(2, 4), lvl(1, -900)], 1);
    expect(r.levels.map(l => l.price)).toEqual([1]);
  });

  it("A LADDER STAYS A LADDER — survivors come back high price first", () => {
    // Ranking is by magnitude, but a strip sorted by magnitude has prices that
    // jump around and is no longer readable as a price ladder.
    const r = capDeltaLevels([lvl(1, 100), lvl(9, 50), lvl(5, 70), lvl(2, 1)], 3);
    expect(r.levels.map(l => l.price)).toEqual([9, 5, 1]);
  });

  it("breaks ties by price ASCENDING — the same comparator the canvas uses", () => {
    // computeDeltaBubbleLevels sorts
    //   Math.abs(z.delta) - Math.abs(a.delta) || a.priceLevel - z.priceLevel
    // Without the identical second key the panel and the canvas could resolve
    // two equal deltas differently and draw different levels for one bar.
    const r = capDeltaLevels([lvl(10, 5), lvl(20, 5), lvl(30, 5)], 2);
    expect(r.levels.map(l => l.price)).toEqual([20, 10]);
  });

  it("reports TOTAL, not just SHOWN — the hidden levels are a fact owed", () => {
    // Reporting only `shown` is how "5 LEVELS" came to mean two different
    // things on one screen.
    const r = capDeltaLevels(Array.from({ length: 11 }, (_, i) => lvl(i, i)), 5);
    expect(r.shown).toBe(5);
    expect(r.total).toBe(11);
    expect(r.truncated).toBe(true);
  });

  it("never truncates when the list exactly fills the cap", () => {
    const r = capDeltaLevels([lvl(2, 1), lvl(1, 2)], 2);
    expect(r.truncated).toBe(false);
    expect(r.levels).toHaveLength(2);
  });

  it("does not mutate its input", () => {
    const all = [lvl(1, 1), lvl(2, 9), lvl(3, 5)];
    const copy = all.map(l => ({ ...l }));
    capDeltaLevels(all, 1);
    expect(all).toEqual(copy);
  });

  it("treats a missing tape as an empty ladder, never as a throw", () => {
    for (const empty of [null, undefined, []]) {
      const r = capDeltaLevels(empty, 7);
      expect(r.levels).toEqual([]);
      expect(r.total).toBe(0);
      expect(r.truncated).toBe(false);
    }
  });

  it("a nonsense cap still renders at least one level", () => {
    const all = [lvl(3, 1), lvl(2, 9), lvl(1, 5)];
    // 0 is unreadable as a cap, so it falls back to the default (7) — wider
    // than this 3-level ladder, so nothing is hidden.
    expect(capDeltaLevels(all, 0).shown).toBe(3);
    expect(capDeltaLevels(all, 0).truncated).toBe(false);
    // A negative cap still cannot render a ladder of zero rows.
    expect(capDeltaLevels(all, -4).shown).toBeGreaterThanOrEqual(1);
    expect(capDeltaLevels(all, 2.7).shown).toBe(2);
  });

  it("every legal choice produces at most that many levels", () => {
    const all = Array.from({ length: 40 }, (_, i) => lvl(i, (i % 7) - 3));
    for (const c of DELTA_LEVEL_CAP_CHOICES) {
      const r = capDeltaLevels(all, c);
      expect(r.shown).toBe(c);
      expect(r.levels).toHaveLength(c);
      // still a ladder at every cap
      const prices = r.levels.map(l => l.price);
      expect([...prices].sort((a, z) => z - a)).toEqual(prices);
    }
  });
});

/**
 * SENTINELS — pinned to MEANING, not spelling.
 *
 * NEVER DELETE THESE — re-pin them, with stronger assertions than they had.
 */
const strip = (p: string) =>
  fs
    .readFileSync(path.join(process.cwd(), p), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PANEL = strip("src/components/smart-money/SmartMoneyPanel.tsx");
const CHART = strip("src/components/chart/MainChart.tsx");

describe("SENTINEL — one owner for the cap's domain", () => {
  it("neither consumer re-spells the allow-list", () => {
    // Four copies that agree until someone edits one, at which point a value
    // the panel accepts is a value the chart silently rewrites to 7.
    expect(PANEL).not.toMatch(/\[\s*5\s*,\s*7\s*,\s*10\s*,\s*15\s*\]/);
    expect(CHART).not.toMatch(/\[\s*5\s*,\s*7\s*,\s*10\s*,\s*15\s*\]/);
    expect(PANEL).toContain("DELTA_LEVEL_CAP_CHOICES");
  });

  it("neither consumer retypes the storage key or the event name", () => {
    expect(PANEL).not.toContain('"wm_delta_levels"');
    expect(CHART).not.toContain('"wm_delta_levels"');
    expect(PANEL).not.toContain('"wm-delta-levels"');
    expect(CHART).not.toContain('"wm-delta-levels"');
    for (const src of [PANEL, CHART]) {
      expect(src).toContain("DELTA_LEVEL_CAP_STORAGE_KEY");
      expect(src).toContain("DELTA_LEVEL_CAP_EVENT");
    }
  });

  it("neither consumer re-derives the fallback with its own parseInt guard", () => {
    for (const src of [PANEL, CHART]) {
      expect(src).toContain("normalizeDeltaLevelCap");
      expect(src).toContain("DELTA_LEVEL_CAP_DEFAULT");
    }
  });
});

describe("SENTINEL — the control moves the pixels it sits on", () => {
  it("the panel applies the cap rather than rendering the raw partition", () => {
    expect(PANEL).toContain("capDeltaLevels");
    expect(PANEL).toContain("deltaCapped");
    // The rendered strip must read the capped list, not selectDeltaLevels' own.
    expect(PANEL).toMatch(/const\s+deltaLevels\s*=\s*deltaCapped\.levels/);
  });

  it("the bubble SCALE stays uncapped, so a level is the same size at 5 and 15", () => {
    // Recomputing maxAbsDelta over the survivors would make the drawn size of a
    // level depend on how many other levels the trader chose to see.
    expect(PANEL).toMatch(/maxAbsDelta\s*=\s*deltaVM\.maxAbsDelta/);
  });

  it("the chip discloses SHOWN OF TOTAL, not a single ambiguous number", () => {
    expect(PANEL).toContain("deltaCapped.truncated");
    expect(PANEL).toContain("deltaCapped.total");
    expect(PANEL).toContain("data-delta-levels-shown");
    expect(PANEL).toContain("data-delta-levels-total");
    expect(PANEL).toMatch(/OF \$\{|\bOF\b/);
  });
});
