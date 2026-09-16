/**
 * × A MARKET STORY WITHOUT MEMORY IS A STILL PHOTOGRAPH THAT CALLS ITSELF A FILM.
 *
 * `selectMarketStory(state, history, priorChapters)` is pure, and its THIRD
 * argument is where every temporal fact lives. /command-deck passed it neither
 * of the two times it called the selector, so:
 *
 *   - `enteredAt` was re-minted as `state.capturedAt` on every snapshot, and
 *     StoryRibbon renders `durationMs = capturedAt - enteredAt`. The chapter
 *     clock read "just entered" FOREVER.
 *   - `recent` could never accumulate past the single current entry, while the
 *     disclosure wrapping it is literally labelled "Market chapter history".
 *   - the freshness window (preserve prior chapter → PARTIAL) had nothing to
 *     preserve, so a momentary evidence gap fell all the way to UNKNOWN.
 *
 * The selector was never broken. THE BANS CANNOT SEE AN ARGUMENT THAT WAS
 * NEVER PASSED — so this file measures the argument, and the wiring that
 * supplies it, instead of the selector.
 *
 * Pure / source-level ONLY: @testing-library/react is not installed here.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectMarketStory, type ChapterEntry } from "./selectMarketStory";
import { sameChapterList, STORY_CHAPTER_CAP } from "./useMarketStory";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";

const dim = (value: string | null): MarketStateDimension => ({
  resolution: "RESOLVED",
  value,
  confidence: 0.8,
  evidence: [
    { eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" },
  ],
  contradictions: [],
  unknowns: [],
});
const UNK: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [],
};

const mkState = (capturedAt: number, over: Partial<CanonicalMarketState> = {}): CanonicalMarketState =>
  ({
    schemaVersion: "wm.market-state.v1",
    snapshotId: `s-${capturedAt}`,
    capturedAt,
    instrumentId: "TSLA:NASDAQ",
    normalizedSymbol: "TSLA",
    executableIdentity: null,
    assetClass: "equity",
    exchange: "NASDAQ",
    session: "REGULAR",
    timeframeContext: ["15m"],
    price: { last: 100, bid: null, ask: null, eventAt: capturedAt },
    qualityState: "LIVE",
    qualityStateEvidence: [],
    freshnessMs: 100,
    coverage: [],
    direction: UNK,
    location: UNK,
    aggression: UNK,
    regime: UNK,
    structure: UNK,
    volatility: UNK,
    profile: UNK,
    orderFlow: UNK,
    contradictions: [],
    unknowns: [],
    ...over,
  }) as unknown as CanonicalMarketState;

/** Resolves the BALANCE guard. */
const balanceAt = (t: number) => mkState(t, { regime: dim("balance"), volatility: dim("low") });
/** Resolves the SWEEP guard — a genuine chapter TRANSITION away from BALANCE. */
const sweepAt = (t: number) => mkState(t, { structure: dim("sweep") });

/** What StoryRibbon actually renders for the active chapter's clock. */
const renderedDurationMs = (vm: { current: ChapterEntry | null }, state: CanonicalMarketState) =>
  vm.current ? Math.max(0, state.capturedAt - vm.current.enteredAt) : null;

const MINUTE = 60_000;

describe("× the defect — a selector called without its memory", () => {
  it("re-mints enteredAt on every snapshot, so the chapter clock is PINNED AT ZERO", () => {
    const observed: number[] = [];
    for (const t of [1_000, 1_000 + MINUTE, 1_000 + 2 * MINUTE]) {
      const state = balanceAt(t);
      // The bug, exactly: the third argument is never supplied.
      const vm = selectMarketStory(state, []);
      observed.push(renderedDurationMs(vm, state)!);
    }
    expect(
      observed,
      "three snapshots two minutes apart and the market has 'just entered' all three times",
    ).toEqual([0, 0, 0]);
  });

  it("cannot accumulate a history, under a disclosure labelled 'Market chapter history'", () => {
    // BALANCE, then a real transition to SWEEP, then back. With no memory the
    // selector has no prior to close, so `recent` never grows past the one
    // entry it just minted.
    const lengths = [balanceAt(1_000), sweepAt(2_000), balanceAt(3_000)].map(
      (s) => selectMarketStory(s, []).recent.length,
    );
    expect(lengths).toEqual([1, 1, 1]);
  });

  it("falls to UNKNOWN on a momentary evidence gap instead of PARTIAL", () => {
    // Nothing resolves at this instant. Without a prior chapter inside the
    // freshness window there is nothing to preserve.
    const vm = selectMarketStory(mkState(1_000 + MINUTE), []);
    expect(vm.resolution).toBe("UNKNOWN");
  });
});

describe("✓ the fix — continuity fed back through priorChapters", () => {
  /** The exact loop useMarketStory runs: commit vm.recent, feed it back. */
  const drive = (states: readonly CanonicalMarketState[]) => {
    let priors: readonly ChapterEntry[] = [];
    return states.map((state) => {
      const vm = selectMarketStory(state, [], priors);
      priors = vm.recent.slice(-STORY_CHAPTER_CAP);
      return { state, vm };
    });
  };

  it("holds enteredAt across snapshots, so the clock ADVANCES", () => {
    const run = drive([balanceAt(1_000), balanceAt(1_000 + MINUTE), balanceAt(1_000 + 2 * MINUTE)]);
    const durations = run.map((r) => renderedDurationMs(r.vm, r.state));
    expect(durations).toEqual([0, MINUTE, 2 * MINUTE]);
    // Same chapter, same entry — not a new one wearing the same name.
    expect(new Set(run.map((r) => r.vm.current!.enteredAt)).size).toBe(1);
  });

  it("accumulates chapters and stamps exitedAt on the one it left", () => {
    const run = drive([balanceAt(1_000), sweepAt(2_000)]);
    const last = run[run.length - 1].vm;
    expect(last.current?.chapter).toBe("SWEEP");
    expect(last.recent.length).toBe(2);
    const balance = last.recent.find((c) => c.chapter === "BALANCE");
    expect(balance?.exitedAt, "the chapter it left must record WHEN it left").toBe(2_000);
  });

  it("preserves the prior chapter as PARTIAL through a momentary gap", () => {
    const run = drive([balanceAt(1_000), mkState(1_000 + MINUTE)]);
    const gap = run[1].vm;
    expect(gap.resolution).toBe("PARTIAL");
    expect(gap.current?.chapter).toBe("BALANCE");
  });

  it("never grows past the cap — memory is bounded, nothing is persisted", () => {
    const states = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? balanceAt(1_000 + i * MINUTE) : sweepAt(1_000 + i * MINUTE),
    );
    for (const { vm } of drive(states)) {
      expect(vm.recent.length).toBeLessThanOrEqual(STORY_CHAPTER_CAP);
    }
  });
});

describe("✓ the feedback loop TERMINATES — the most expensive bug class this repo has paid for", () => {
  it("re-running the selector with its own recent[] is idempotent under chapter identity", () => {
    const state = balanceAt(1_000);
    const first = selectMarketStory(state, [], []);
    const second = selectMarketStory(state, [], first.recent);
    expect(
      sameChapterList(first.recent, second.recent),
      "if this ever differs, useMarketStory's commit guard never settles and the page spins",
    ).toBe(true);
  });

  it("sameChapterList compares IDENTITY, not the rebuilt evidence arrays", () => {
    const base: ChapterEntry = {
      chapter: "BALANCE",
      enteredAt: 1_000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // Same identity, freshly-built evidence — a deep compare would call these
    // different on every pass and defeat the guard.
    const rebuilt: ChapterEntry = {
      ...base,
      evidence: [{ eventId: "x", observedAt: 1, availableAt: 2, source: "t", fidelity: "OBSERVED", basis: "t" }],
    } as ChapterEntry;
    expect(sameChapterList([base], [rebuilt])).toBe(true);

    expect(sameChapterList([base], [{ ...base, enteredAt: 2_000 }])).toBe(false);
    expect(sameChapterList([base], [{ ...base, exitedAt: 2_000 }])).toBe(false);
    expect(sameChapterList([base], [{ ...base, chapter: "SWEEP" }])).toBe(false);
    expect(sameChapterList([base], [])).toBe(false);
  });
});

describe("✓ /command-deck compiles the story ONCE — one fact, one owner", () => {
  const PAGE = resolve(__dirname, "../../../app/command-deck/page.tsx");
  const src = () => readFileSync(PAGE, "utf8");
  const codeOnly = () =>
    src()
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

  it("the stripper really strips, so every count below is a count of CODE", () => {
    expect(src()).toContain("THE STORY IS COMPILED EXACTLY ONCE");
    expect(codeOnly()).not.toContain("THE STORY IS COMPILED EXACTLY ONCE");
  });

  it("calls the continuity-owning hook exactly once", () => {
    const calls = codeOnly().match(/\buseMarketStory\s*\(/g) ?? [];
    expect(calls.length, "two hooks means two chapter clocks on one screen").toBe(1);
  });

  it("does NOT call the raw selector — that call is the one that loses the memory", () => {
    const calls = codeOnly().match(/\bselectMarketStory\s*\(/g) ?? [];
    expect(calls.length, "a bare selectMarketStory() here is the defect returning").toBe(0);
  });

  it("hands the compiled story to StoryRibbon rather than letting it compile a second", () => {
    expect(codeOnly()).toMatch(/<StoryRibbon[^>]*\bstory=\{marketStory\}/);
  });
});

describe("✓ StoryRibbon renders the caller's story when given one", () => {
  const RIBBON = resolve(__dirname, "../../../components/chart/StoryRibbon.tsx");
  const src = () => readFileSync(RIBBON, "utf8");

  it("accepts a compiled story", () => {
    expect(src()).toMatch(/story\?:\s*StoryVM/);
  });

  it("SHORT-CIRCUITS on it — an accepted prop that is never read is a lie", () => {
    // The early return must come before any selectMarketStory call in the memo.
    const body = src();
    const shortCircuit = body.indexOf("if (story) return story;");
    const compile = body.indexOf("return selectMarketStory(");
    expect(shortCircuit).toBeGreaterThan(-1);
    expect(compile).toBeGreaterThan(shortCircuit);
  });

  it("keeps `story` in the memo deps — a stale story is a frozen clock again", () => {
    expect(src()).toMatch(/\}, \[story, state, history, priorChapters\]\)/);
  });
});
