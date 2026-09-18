/**
 * selectMarketStory — truth-lock.
 *
 * First real UI consumer of CanonicalMarketState (P00290 gap closer).
 * Pure function — no I/O, no subscription. UNKNOWN inputs propagate to
 * UNKNOWN outputs; fabrication is forbidden.
 *
 * Locks:
 *   - Transition mechanics: same-chapter continuation, new-chapter
 *     transition closes prior with exitedAt
 *   - Freshness-window preservation of prior chapter
 *   - historyCap slicing (default 6)
 *   - First-match wins on multiple supporting guards
 *   - DEFAULT_GUARDS: BALANCE, TREND_EXPANSION, SWEEP, BREAKOUT,
 *     LIQUIDITY_PROBE, ABSORPTION, VALUE_MIGRATION, ROTATION
 *   - ABSORPTION requires >=3 history AND ATR extractor
 *   - Matcher synonyms (looseMatch normalization)
 *
 * Silent drift here silently changes every /command-deck story panel.
 */

import { describe, it, expect } from "vitest";
import { selectMarketStory, chapterName, CHAPTER_NAMES, DEFAULT_MATCHERS, DEFAULT_GUARDS, type ChapterEntry } from "./selectMarketStory";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";
// The dimension's NAME has one owner; `inSentence` owns how it reads mid-prose.
// Fixtures COMPOSE the same two rules the selector does.
import { dimensionName } from "../canonicalMarketState";
import { inSentence } from "./decisionPermissionCompiler";

const dim = (value: string | null): MarketStateDimension => ({
  resolution: "RESOLVED", value, confidence: 0.8,
  evidence: [{ eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" }],
  contradictions: [], unknowns: [],
});
const UNK: MarketStateDimension = { resolution: "UNKNOWN", value: null, confidence: null, evidence: [], contradictions: [], unknowns: [] };

const mkState = (capturedAt: number, over: Partial<CanonicalMarketState> = {}): CanonicalMarketState => ({
  schemaVersion: "wm.market-state.v1",
  snapshotId: "s1",
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
  direction: UNK, location: UNK, aggression: UNK,
  regime: UNK, structure: UNK, volatility: UNK, profile: UNK, orderFlow: UNK,
  contradictions: [], unknowns: [],
  ...over,
} as unknown as CanonicalMarketState);

describe("selectMarketStory — the no-chapter diagnosis must be measured, not asserted", () => {
  /**
   * The defect: ONE hardcoded sentence — "Insufficient dimensions resolved …
   * Review evidence/contradictions on state.direction/regime/structure" — was
   * emitted for EVERY no-chapter outcome, including when every dimension was
   * RESOLVED. It sent the trader to inspect evidence that was already
   * complete. A diagnosis that sounds specific and was never checked is a
   * fabricated diagnosis; §35 forbids that in the same breath as a fabricated
   * price. Observed live on /charts beside a chart badge showing a resolved
   * regime — two owners, one instrument, one moment.
   */

  // Every dimension RESOLVED, but deliberately no guard-matching combination:
  // regime BALANCE with HIGH volatility (so BALANCE needs lowVol and fails,
  // TREND needs a trend token, ROTATION needs rotation), and neutral tokens
  // everywhere else so SWEEP/BREAKOUT/LIQUIDITY_PROBE/VALUE_MIGRATION miss.
  const allResolvedNoGuard = () =>
    mkState(1000, {
      regime: dim("BALANCE"),
      volatility: dim("HIGH VOLATILITY"),
      direction: dim("UP"),
      location: dim("MIDRANGE"),
      aggression: dim("NEUTRAL"),
      structure: dim("INTACT"),
      profile: dim("STABLE"),
      orderFlow: dim("NEUTRAL"),
    });

  it("does NOT blame missing evidence when every dimension is resolved", () => {
    const vm = selectMarketStory(allResolvedNoGuard());
    expect(vm.current).toBeNull();
    expect(vm.resolution).toBe("UNKNOWN");
    // The specific lie: claiming dimensions are unresolved when none are.
    expect(vm.reason).not.toMatch(/insufficient/i);
    expect(vm.reason).not.toMatch(/unresolved:/i);
  });

  it("names a model gap as a model gap, and says waiting will not help", () => {
    // A trader who is told "insufficient evidence" waits. That is the wrong
    // action when the evidence is complete and the product simply has no
    // chapter for this market state — waiting cannot resolve it.
    const vm = selectMarketStory(allResolvedNoGuard());
    expect(vm.reason).toMatch(/model gap/i);
    expect(vm.reason).toMatch(/waiting will not resolve it/i);
  });

  it("names exactly which dimensions are unresolved when some are", () => {
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP") }),
    );
    // The wording moved from "Unresolved: …" to naming which CHAPTERS the
    // unresolved dimensions actually block. The intent is unchanged and is
    // still asserted below: name the missing evidence, accuse nothing that is
    // present. Only the sentence that carries it grew a second half.
    expect(vm.reason).toMatch(/could not be evaluated/i);
    // The resolved two must NOT be accused.
    expect(vm.reason).not.toMatch(/\bregime\b/);
    expect(vm.reason).not.toMatch(/\bdirection\b/);
    // The genuinely unresolved ones must be named.
    expect(vm.reason).toMatch(/volatility/);
    expect(vm.reason).toMatch(/structure/);
    expect(vm.reason).toMatch(/2\/8 dimensions resolved/);
  });

  it("does not tell the trader to wait for a chapter that was already decided", () => {
    // THE LIVE DEFECT, production /command-deck BTC. Five of eight dimensions
    // resolved; the three that did not are location, aggression and profile,
    // and that venue publishes no per-bar volume, so they never will. The old
    // sentence named those three and stopped — which reads as "wait for these".
    //
    // ROTATION reads only `regime`, which IS resolved here. Its verdict is in.
    // Filing it under missing evidence would send the trader to wait for a
    // question that has already been answered.
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP") }),
    );
    expect(vm.reason).toMatch(/more evidence will not change/i);
    // The DECIDED list is the one preceding "had every input …". Splitting on
    // the blocked clause instead would capture both lists — the first draft of
    // this test did exactly that and passed the wrong assertion for it.
    const decided = vm.reason?.split("had every input")[0] ?? "";
    // Asserted THROUGH chapterName, not against a hardcoded string. A guard
    // that spells the name itself is a second owner of the name — which is the
    // exact defect this atom removed.
    expect(decided).toContain(chapterName("ROTATION"));
    // …and the machine identifier must never reach the trader.
    expect(vm.reason).not.toMatch(/_/);
  });

  it("a chapter blocked by missing evidence is never reported as decided", () => {
    // The mirror guard. VALUE_MIGRATION reads `profile`, which is unresolved
    // in this fixture, so its verdict is genuinely NOT in — and claiming
    // "more evidence will not change it" would be the fabricated-certainty
    // twin of the defect above.
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP") }),
    );
    // The DECIDED list is the one preceding "had every input …". Splitting on
    // the blocked clause instead would capture both lists — the first draft of
    // this test did exactly that and passed the wrong assertion for it.
    const decided = vm.reason?.split("had every input")[0] ?? "";
    expect(decided).not.toContain(chapterName("VALUE_MIGRATION"));
    expect(vm.reason).toContain(chapterName("VALUE_MIGRATION"));
  });

  it("evaluating the guards a second time does not change the verdict", () => {
    // The diagnosis re-runs every guard against a recording proxy. If any
    // guard were impure — or the proxy perturbed one — the explanation could
    // contradict the chapter selection it is explaining, which is Canon
    // Weakness #1 inside a single function.
    const state = mkState(1000, { regime: dim("BALANCE"), direction: dim("UP") });
    expect(selectMarketStory(state).reason).toEqual(selectMarketStory(state).reason);
  });

  it("keeps the two no-chapter causes textually distinguishable", () => {
    // If these ever collapse to the same sentence the defect is back: the
    // trader cannot tell "wait for evidence" from "this product has no
    // chapter for what you are looking at".
    const missing = selectMarketStory(mkState(1000, { regime: dim("BALANCE") })).reason;
    const modelGap = selectMarketStory(allResolvedNoGuard()).reason;
    expect(missing).not.toEqual(modelGap);
  });

  /**
   * A MEASURED-BUT-PARTIAL DIMENSION IS NOT AN ABSENT ONE.
   *
   * MEASURED LIVE, production /charts?symbol=TSLA, 15m: the story read
   * "profile ... unresolved" while the chart beside it drew 120 candles
   * carrying real per-bar volume (header V 57,398, "64 BARS BEHIND"). Fed
   * those exact production bars, the profile chain returns PARTIAL /
   * "DEFINED VALUE" — POC 360.40, VAH 364.05, VAL 355.00 off 401 populated
   * buckets. The reading EXISTS and is drawn. Naming it "unresolved" is the
   * same two-owners-one-instant defect this whole block exists to refuse,
   * and it sends the trader to wait for a measurement already taken.
   *
   * The split is a WORD change only: PARTIAL still blocks, the resolved count
   * is untouched, and the blocked/decided partition is byte-identical.
   */
  const partialDim = (value: string): MarketStateDimension => ({
    resolution: "PARTIAL", value, confidence: 0.4,
    evidence: [{ eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" }],
    contradictions: [], unknowns: ["nodes withheld — candle-estimated"],
  });

  it("does not call a PARTIAL dimension unresolved", () => {
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP"), profile: partialDim("DEFINED VALUE") }),
    );
    // profile must still be NAMED — it is genuinely blocking chapters.
    expect(vm.reason).toMatch(/profile/);
    // But it must not appear in the list of things that were never measured.
    const unresolvedList = vm.reason?.match(/could not be evaluated: ([^.]*)/)?.[1] ?? "";
    const missingClause = unresolvedList.split(";")[0] ?? "";
    expect(missingClause).toMatch(/unresolved/);
    expect(missingClause).not.toMatch(/profile/);
    expect(vm.reason).toMatch(/profile measured but not decision-grade/);
  });

  it("still names genuinely-UNKNOWN dimensions as unresolved alongside a PARTIAL one", () => {
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP"), profile: partialDim("DEFINED VALUE") }),
    );
    expect(vm.reason).toMatch(/volatility/);
    expect(vm.reason).toMatch(/structure/);
    expect(vm.reason).toMatch(/unresolved;/);
  });

  it("a PARTIAL dimension still BLOCKS — a sharper sentence is not a stronger claim", () => {
    // VALUE_MIGRATION reads `profile`. With profile PARTIAL its verdict is
    // still not in, so it must stay out of the DECIDED list exactly as it was
    // when profile was UNKNOWN. If the wording change ever promoted PARTIAL to
    // usable, this turns red.
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP"), profile: partialDim("DEFINED VALUE") }),
    );
    const decided = vm.reason?.split("had every input")[0] ?? "";
    expect(decided).not.toContain(chapterName("VALUE_MIGRATION"));
    expect(vm.reason).toContain(chapterName("VALUE_MIGRATION"));
    // And the resolved COUNT is unchanged: PARTIAL is not resolved.
    expect(vm.reason).toMatch(/2\/8 dimensions resolved/);
  });

  it("omits the partial clause entirely when nothing is PARTIAL", () => {
    // Over-correction guard: the old sentence must survive byte-for-byte in
    // the all-UNKNOWN case, or every existing reader breaks for a state that
    // never had this problem.
    const vm = selectMarketStory(
      mkState(1000, { regime: dim("BALANCE"), direction: dim("UP") }),
    );
    expect(vm.reason).not.toMatch(/decision-grade/);
    // The list is BUILT from the owner, not typed here. The old literal ended
    // "…profile, orderFlow unresolved." — a raw machine identifier, observed
    // live in this exact sentence on production /charts. Spelling it here made
    // this file one more author of the dimension's name, and pinned the defect
    // in place: the fixture AGREED with the bug.
    const named = ["location", "aggression", "structure", "volatility", "profile", "orderFlow"]
      .map((k) => inSentence(dimensionName(k)))
      .join(", ");
    expect(vm.reason).toContain(`${named} unresolved.`);
    // …and the identifier itself never appears in trader prose.
    expect(vm.reason).not.toContain("orderFlow");
  });
});

describe("selectMarketStory — UNKNOWN / freshness path", () => {
  it("UNKNOWN when no dimensions resolved AND no prior chapters", () => {
    const vm = selectMarketStory(mkState(1000));
    expect(vm.current).toBeNull();
    expect(vm.resolution).toBe("UNKNOWN");
    // Names the unresolved dimensions rather than asserting a blanket
    // "insufficient dimensions" it never measured. See the no-chapter
    // diagnosis block below.
    expect(vm.reason).toMatch(/No chapter resolved/i);
    expect(vm.reason).toMatch(/0\/8 dimensions resolved/);
    expect(vm.recent).toEqual([]);
  });

  it("preserves prior chapter within freshness window (default 5min)", () => {
    const prior: ChapterEntry = {
      chapter: "TREND_EXPANSION",
      enteredAt: 1000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // now = 1000 + 2min → within 5min window
    const vm = selectMarketStory(mkState(1000 + 2 * 60_000), [], [prior]);
    expect(vm.current).toBe(prior);
    expect(vm.resolution).toBe("PARTIAL");
    expect(vm.reason).toMatch(/preserving prior chapter/i);
  });

  it("DROPS prior chapter after freshness window elapses", () => {
    const prior: ChapterEntry = {
      chapter: "BREAKOUT",
      enteredAt: 1000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // now = 1000 + 6min → past 5min default window
    const vm = selectMarketStory(mkState(1000 + 6 * 60_000), [], [prior]);
    expect(vm.current).toBeNull();
    expect(vm.resolution).toBe("UNKNOWN");
    // Prior remains in recent[]
    expect(vm.recent).toContain(prior);
  });

  it("custom freshnessMaxMs override honored", () => {
    const prior: ChapterEntry = {
      chapter: "BALANCE",
      enteredAt: 1000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // now = 1000 + 30s, but freshness = 10s → prior EXPIRED
    const vm = selectMarketStory(mkState(1000 + 30_000), [], [prior], { freshnessMaxMs: 10_000 });
    expect(vm.current).toBeNull();
  });
});

describe("selectMarketStory — transition mechanics", () => {
  it("same-chapter continuation retains prior entry (no new object)", () => {
    const prior: ChapterEntry = {
      chapter: "BALANCE",
      enteredAt: 1000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // BALANCE guard supports on regime=balance + volatility=low
    const state = mkState(2000, { regime: dim("balance"), volatility: dim("low") });
    const vm = selectMarketStory(state, [], [prior]);
    expect(vm.current).toBe(prior); // same reference
    expect(vm.resolution).toBe("RESOLVED");
  });

  it("new-chapter transition closes prior with exitedAt + creates new entry", () => {
    const prior: ChapterEntry = {
      chapter: "BALANCE",
      enteredAt: 1000,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    };
    // Force SWEEP verdict this time
    const state = mkState(2000, { structure: dim("sweep") });
    const vm = selectMarketStory(state, [], [prior]);
    expect(vm.current?.chapter).toBe("SWEEP");
    expect(vm.current?.enteredAt).toBe(2000);
    // Prior in recent has exitedAt set
    const priorInRecent = vm.recent.find((c) => c.chapter === "BALANCE");
    expect(priorInRecent?.exitedAt).toBe(2000);
  });

  it("historyCap default 6 slices recent[]", () => {
    // 7 prior chapters + a transition → recent should be capped to 6
    const priors: ChapterEntry[] = Array.from({ length: 7 }, (_, i) => ({
      chapter: "BALANCE",
      enteredAt: 100 + i,
      exitedAt: 100 + i + 1,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    }));
    // Force new chapter via SWEEP
    const state = mkState(2000, { structure: dim("sweep") });
    const vm = selectMarketStory(state, [], priors);
    expect(vm.recent.length).toBeLessThanOrEqual(6);
  });

  it("custom historyCap override honored", () => {
    const priors: ChapterEntry[] = Array.from({ length: 5 }, (_, i) => ({
      chapter: "BALANCE",
      enteredAt: 100 + i,
      resolution: "RESOLVED",
      evidence: [],
      contradictions: [],
    }));
    const state = mkState(2000, { structure: dim("sweep") });
    const vm = selectMarketStory(state, [], priors, { historyCap: 2 });
    expect(vm.recent.length).toBeLessThanOrEqual(2);
  });
});

describe("selectMarketStory — DEFAULT_GUARDS chapter matrix", () => {
  it("BALANCE fires on regime=balance + volatility=low", () => {
    const vm = selectMarketStory(mkState(1000, { regime: dim("balance"), volatility: dim("low") }));
    expect(vm.current?.chapter).toBe("BALANCE");
  });

  it("TREND_EXPANSION fires on regime=trend + volatility not-low", () => {
    const vm = selectMarketStory(mkState(1000, { regime: dim("trend"), volatility: dim("high") }));
    expect(vm.current?.chapter).toBe("TREND_EXPANSION");
  });

  it("SWEEP fires on structure=sweep", () => {
    const vm = selectMarketStory(mkState(1000, { structure: dim("sweep") }));
    expect(vm.current?.chapter).toBe("SWEEP");
  });

  it("BREAKOUT fires on structure=bos + direction resolved", () => {
    const vm = selectMarketStory(mkState(1000, { structure: dim("bos"), direction: dim("long") }));
    expect(vm.current?.chapter).toBe("BREAKOUT");
  });

  it("BREAKOUT does NOT fire on BOS alone without direction", () => {
    const vm = selectMarketStory(mkState(1000, { structure: dim("bos") }));
    expect(vm.current?.chapter).not.toBe("BREAKOUT");
  });

  it("LIQUIDITY_PROBE fires on at-level + high aggression + no BOS", () => {
    const vm = selectMarketStory(mkState(1000, {
      location: dim("vah"),
      aggression: dim("high"),
      // no structure = no BOS
    }));
    expect(vm.current?.chapter).toBe("LIQUIDITY_PROBE");
  });

  it("LIQUIDITY_PROBE suppressed when BOS present (structure trumps)", () => {
    const vm = selectMarketStory(mkState(1000, {
      location: dim("vah"),
      aggression: dim("high"),
      structure: dim("bos"), // blocks LIQUIDITY_PROBE
      direction: dim("long"),
    }));
    // BREAKOUT wins because it's checked before LIQUIDITY_PROBE
    expect(vm.current?.chapter).toBe("BREAKOUT");
  });

  it("VALUE_MIGRATION fires on profile=migrating", () => {
    const vm = selectMarketStory(mkState(1000, { profile: dim("migrating") }));
    expect(vm.current?.chapter).toBe("VALUE_MIGRATION");
  });

  it("ROTATION fires on regime=rotation", () => {
    const vm = selectMarketStory(mkState(1000, { regime: dim("rotation") }));
    expect(vm.current?.chapter).toBe("ROTATION");
  });
});

describe("selectMarketStory — ABSORPTION guard (history + ATR gated)", () => {
  it("ABSORPTION guard returns supports=false when history < 3", () => {
    const guard = DEFAULT_GUARDS.find((g) => g.chapter === "ABSORPTION")!.guard;
    const state = mkState(1000, { aggression: dim("high") });
    const result = guard(state, [state], { chapters: [], freshnessMaxMs: 300_000, historyCap: 6 });
    expect(result.supports).toBe(false);
    expect(result.reason).toMatch(/Insufficient history/i);
  });

  it("ABSORPTION guard returns supports=false when ATR extractor missing", () => {
    const guard = DEFAULT_GUARDS.find((g) => g.chapter === "ABSORPTION")!.guard;
    const state = mkState(1000, { aggression: dim("high") });
    const history = [state, state, state];
    const result = guard(state, history, { chapters: [], freshnessMaxMs: 300_000, historyCap: 6 });
    expect(result.supports).toBe(false);
    expect(result.contradictions).toContain("ATR unresolved — cannot normalize displacement");
  });

  it("ABSORPTION supports when high-agg throughout + tiny displacement/ATR", () => {
    const guard = DEFAULT_GUARDS.find((g) => g.chapter === "ABSORPTION")!.guard;
    const highAgg = { aggression: dim("high") };
    const history = [
      mkState(1000, { ...highAgg, price: { last: 100, bid: null, ask: null, eventAt: 1000, availableAt: 1000 } }),
      mkState(1001, { ...highAgg, price: { last: 100.05, bid: null, ask: null, eventAt: 1001, availableAt: 1001 } }),
      mkState(1002, { ...highAgg, price: { last: 100.1, bid: null, ask: null, eventAt: 1002, availableAt: 1002 } }),
    ] as CanonicalMarketState[];
    const result = guard(
      history[2],
      history,
      { chapters: [], freshnessMaxMs: 300_000, historyCap: 6, atrExtractor: () => 10 }, // ATR big → tiny ratio
    );
    expect(result.supports).toBe(true);
  });
});

describe("DEFAULT_MATCHERS — synonym coverage", () => {
  it("regime.balance accepts balance / balanced / range / ranging", () => {
    for (const v of ["balance", "BALANCED", "range", "Ranging"]) {
      expect(DEFAULT_MATCHERS.regime.balance!.matches(dim(v))).toBe(true);
    }
  });
  it("volatility.shock accepts shock / extreme (case-insensitive)", () => {
    expect(DEFAULT_MATCHERS.volatility.shock!.matches(dim("SHOCK"))).toBe(true);
    expect(DEFAULT_MATCHERS.volatility.shock!.matches(dim("extreme"))).toBe(true);
  });
  it("structure.sweep accepts sweep / liquidity-sweep (strip separators)", () => {
    expect(DEFAULT_MATCHERS.structure.sweep!.matches(dim("sweep"))).toBe(true);
    expect(DEFAULT_MATCHERS.structure.sweep!.matches(dim("liquidity_sweep"))).toBe(true);
  });
  it("all matchers reject UNKNOWN dimensions", () => {
    expect(DEFAULT_MATCHERS.regime.balance!.matches(UNK)).toBe(false);
    expect(DEFAULT_MATCHERS.structure.sweep!.matches(UNK)).toBe(false);
    expect(DEFAULT_MATCHERS.aggression.high!.matches(UNK)).toBe(false);
  });
});

describe("chapterName — one name, every surface", () => {
  it("× THE MACHINE IDENTIFIER: no chapter name reaches the trader with an underscore", () => {
    // The live defect: explainNoChapter and WhyInspector joined the raw enum
    // into prose, so /charts printed "TREND_EXPANSION" in a sentence.
    for (const chapter of Object.keys(CHAPTER_NAMES)) {
      expect(chapterName(chapter)).not.toContain("_");
    }
  });

  it("× THE THIRD NAME: every chapter in the union is named exactly once", () => {
    // TOTAL over StoryChapter by construction. Adding a chapter to the union
    // without naming it is a compile error in selectMarketStory.ts, not a
    // silent leak of the identifier onto a surface.
    const names = Object.values(CHAPTER_NAMES);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.length > 0)).toBe(true);
  });

  it("× THE PRESERVED SHORT FORM: the auctions keep the ribbon's own naming", () => {
    // Open / Close are a Founder-facing NAMING decision for a ~10-char chip,
    // not a truncation this module invented or is free to undo.
    expect(chapterName("OPENING_AUCTION")).toBe("Open");
    expect(chapterName("CLOSING_AUCTION")).toBe("Close");
  });

  it("× THE UNNAMED CHAPTER: an unmapped chapter discloses that nobody named it", () => {
    // `config.chapters` is caller-extensible by design, so an unnamed chapter
    // is legitimate. It renders de-underscored but NOT dressed up as prose:
    // leaving it in its identifier casing is what tells the reader this is a
    // raw id with no human name behind it. Lowercasing it would hide that.
    expect(chapterName("SOME_NEW_CHAPTER")).toBe("SOME NEW CHAPTER");
    expect(chapterName("SOME_NEW_CHAPTER")).not.toContain("_");
  });
});
