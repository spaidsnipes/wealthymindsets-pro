/**
 * Delta Bubbles level ownership, second half: WHAT QUANTITY does a bubble
 * claim, and do the words match the number?
 *
 * THE DEFECT THESE GUARD, VERBATIM AS FOUND IN MainChart.tsx:
 *
 *   const bubbles = [...bubblesRef.current, ...deltaBubblesRef.current];
 *   ...
 *   text: `${vstr} ${base > 100 ? "shares" : "vol"} aggressive ` +
 *         `${hit.side === "buy" ? "buy" : "sell"} at ${pstr}`
 *
 * One sentence, two bubble kinds, and `hit.value` is a different quantity in
 * each of them:
 *
 *   big-trade   value = ±(bid + ask)   the level's GROSS TWO-SIDED total
 *   delta       value = ±|ask - bid|   the zone's NET
 *
 * A big-trade level with 7,000 bought and 5,400 sold said "12,400 shares
 * aggressive buy" — the 5,400 that were SOLD folded into a number labelled
 * BUY. A delta zone with 20,000 bought and 7,600 sold said "12,400 shares
 * aggressive buy" too: identical words, identical number, arrived at by
 * subtraction instead of addition, describing a different market fact.
 *
 * The unit noun was its own defect: `base > 100` is a PRICE test, and `base`
 * is `getBase(symbol)`, so NQ at 21,750 was described in "shares".
 *
 * NOTE ON METHOD — the ORKIN_F lesson applies here. A whole-file
 * `expect(src).toContain(...)` on a 7,000-line component is toothless: the
 * string it matches may live a thousand lines from the code under test. Every
 * Sentinel below extracts the SPECIFIC region first and asserts the region is
 * non-empty (a positive control), so a rename that moves the code makes the
 * extractor fail loudly rather than silently guarding nothing.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aggressorSide,
  bubbleClaimMagnitude,
  describeBubbleClaim,
  formatBubbleClock,
  formatBubbleExact,
  formatBubblePrice,
  formatBubbleVolume,
} from "./bubbleClaim";

const CHART = resolve(__dirname, "../components/chart/MainChart.tsx");
const chartSrc = (): string => readFileSync(CHART, "utf8");

/**
 * Strip comments before asserting a BAN.
 *
 * This was a real false positive while writing these Sentinels: the fix's own
 * comments quote the removed line verbatim — that is the point of them — and
 * a naive `not.toMatch` on the raw source then fails on the documentation
 * rather than on the defect. A ban is a claim about CODE. Keeping the quoted
 * history is more valuable than keeping the regex simple, so the regex adapts.
 *
 * Deliberately not a full tokenizer: it strips `//` to end-of-line and block
 * comments, which is exactly the shape the surrounding source uses. Ban
 * targets are code patterns like `bubbleTip.value`, never string literals, so
 * the string-literal edge cases a real lexer would handle cannot bite here.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Extract a region by start marker + end marker, with a positive control. */
function region(src: string, startMark: string, endMark: string, minLen: number): string {
  const start = src.indexOf(startMark);
  expect(start, `region start not found: ${startMark} — this Sentinel is guarding nothing`)
    .toBeGreaterThan(-1);
  const end = src.indexOf(endMark, start + startMark.length);
  expect(end, `region end not found: ${endMark} — this Sentinel is guarding nothing`)
    .toBeGreaterThan(start);
  const slice = src.slice(start, end);
  expect(slice.length, "extracted region is implausibly small").toBeGreaterThan(minLen);
  return slice;
}

// 2026-09-26 (F07B clusters): the hover list is the big-trade DISCS the last
// frame drew (a cluster is one target) plus the delta bubbles; the region
// still runs through both the cluster tip and the per-print claim tip.
const tooltipHandler = () =>
  region(chartSrc(), "const bubbles = [...bigTradeFrameRef.current.discs", "} else if (bubbleHoverRef.current", 400);

const tooltipRender = () =>
  region(chartSrc(), "{bubbleTip && (() => {", "Comic tail pointer", 400);

const bigTradeSpawn = () =>
  region(chartSrc(), "bubblesRef.current.push({", 'kind: "big-trade"', 200);

const deltaSpawn = () =>
  region(chartSrc(), "deltaBubblesRef.current.push({", 'kind: "delta"', 200);

// ───────────────────────────────────────────────────────────────────
describe("the two bubble kinds no longer share one sentence", () => {
  // 7,000 bought / 5,400 sold. Total 12,400 · net 1,600.
  const twoSided = { bid: 5_400, ask: 7_000, price: 150.01 };

  it("a big trade headlines the DOMINANT side, not the two-sided total", () => {
    const c = describeBubbleClaim({ kind: "big-trade", ...twoSided })!;
    expect(c.side).toBe("buy");
    expect(c.value).toBe(7_000);
    // The bug: 12,400 under the word BUY, with 5,400 sells folded in.
    expect(c.headline).not.toContain("12,400");
    expect(c.headline).toBe("+7,000");
  });

  it("a delta zone headlines the NET, and says the word 'net'", () => {
    const c = describeBubbleClaim({ kind: "delta", ...twoSided })!;
    expect(c.value).toBe(1_600);
    expect(c.headline).toBe("+1,600");
    expect(c.heading).toBe("NET BUY PRESSURE");
    // A net may never wear the bare one-sided word.
    expect(c.heading).not.toBe("AGGRESSIVE BUY");
  });

  it("THE CORE REGRESSION: identical flow yields DIFFERENT claims per kind", () => {
    const big = describeBubbleClaim({ kind: "big-trade", ...twoSided })!;
    const dlt = describeBubbleClaim({ kind: "delta", ...twoSided })!;
    // Before the fix these were byte-identical sentences.
    expect(big.headline).not.toBe(dlt.headline);
    expect(big.heading).not.toBe(dlt.heading);
    expect(big.detail).not.toBe(dlt.detail);
  });

  it("both kinds disclose BOTH aggressor sides", () => {
    for (const kind of ["big-trade", "delta"] as const) {
      const c = describeBubbleClaim({ kind, ...twoSided })!;
      expect(c.detail).toContain("7.0k bought");
      expect(c.detail).toContain("5.4k sold");
    }
  });

  it("no claim invents a unit noun the chart cannot back", () => {
    // "shares" was printed for NQ, ES, GC and BTC alike.
    for (const kind of ["big-trade", "delta"] as const) {
      for (const price of [21_750, 0.42, 226, 60_000]) {
        const c = describeBubbleClaim({ kind, bid: 3, ask: 9, price })!;
        expect(c.detail).not.toMatch(/\bshares\b/);
        expect(c.detail).not.toMatch(/\bvol\b/);
        expect(c.headline).not.toMatch(/\bshares\b/);
      }
    }
  });

  it("only a big trade says 'at <price>' — a delta zone says 'in this zone'", () => {
    const big = describeBubbleClaim({ kind: "big-trade", ...twoSided })!;
    const dlt = describeBubbleClaim({ kind: "delta", ...twoSided })!;
    // A big trade is a real print at an exact tick.
    expect(big.detail).toMatch(/at 150\.01/);
    expect(big.detail).not.toMatch(/zone/i);
    // A delta bubble's price is a bucket's heaviest tick — an anchor for
    // drawing, not the place all that volume happened.
    expect(dlt.detail).toMatch(/in this zone/i);
    expect(dlt.detail).toMatch(/heaviest tick 150\.01/);
    expect(dlt.detail).not.toMatch(/sold at 150/);
  });

  it("sell-dominant flow reverses side, heading and sign for both kinds", () => {
    const sellSide = { bid: 9_000, ask: 1_000, price: 150.01 };
    const big = describeBubbleClaim({ kind: "big-trade", ...sellSide })!;
    expect(big.side).toBe("sell");
    expect(big.heading).toBe("AGGRESSIVE SELL");
    expect(big.headline).toBe("−9,000");
    expect(big.value).toBe(-9_000);

    const dlt = describeBubbleClaim({ kind: "delta", ...sellSide })!;
    expect(dlt.side).toBe("sell");
    expect(dlt.heading).toBe("NET SELL PRESSURE");
    expect(dlt.headline).toBe("−8,000");
    expect(dlt.value).toBe(-8_000);
  });

  it("a perfectly balanced delta zone reports a real zero, not a fake lean", () => {
    const c = describeBubbleClaim({ kind: "delta", bid: 500, ask: 500, price: 12 })!;
    expect(c.value).toBe(0);
    expect(c.headline).toBe("+0");
    // 500 bought and 500 sold is genuine two-sided activity; the detail must
    // still show it, or a balanced zone reads as an empty one.
    expect(c.detail).toContain("500 bought");
    expect(c.detail).toContain("500 sold");
  });

  it("the HEADLINE keeps full precision — the detail line is the compact one", () => {
    // Regression on my own first draft: routing the headline through the M/k
    // formatter would have quietly downgraded the hero number from "12,400"
    // to "12.4k". Shipping a precision loss inside a truth fix is its own
    // overclaim, so the two formatters are pinned as distinct here.
    const c = describeBubbleClaim({ kind: "big-trade", bid: 1, ask: 12_400, price: 150.01 })!;
    expect(c.headline).toBe("+12,400");
    expect(c.headline).not.toContain("12.4k");
    expect(c.detail).toContain("12.4k bought");
  });

  it("discloses whether aggressor side came from a provider or inference", () => {
    const provider = describeBubbleClaim({
      kind: "big-trade", bid: 0, ask: 12, price: 150.01, aggressorMethod: "PROVIDER",
    })!;
    expect(provider.heading).toBe("AGGRESSIVE BUY");
    expect(provider.detail).toContain("aggressor provenance: provider-stamped");

    const maker = describeBubbleClaim({
      kind: "big-trade", bid: 12, ask: 0, price: 150.01, aggressorMethod: "MAKER_SIDE_INVERTED",
    })!;
    expect(maker.heading).toBe("AGGRESSIVE SELL");
    expect(maker.detail).toContain("aggressor provenance: provider maker-side inversion");

    const inferred = describeBubbleClaim({
      kind: "big-trade", bid: 0, ask: 12, price: 150.01, aggressorMethod: "TICK_RULE",
    })!;
    expect(inferred.heading).toBe("INFERRED BUY PRINT");
    expect(inferred.detail).toContain("aggressor provenance: inferred by tick rule");

    const undisclosed = describeBubbleClaim({
      kind: "big-trade", bid: 0, ask: 12, price: 150.01, aggressorMethod: "NONE",
    })!;
    expect(undisclosed.detail).toContain("aggressor provenance: undisclosed");
  });
});

// ───────────────────────────────────────────────────────────────────
describe("no aggressor volume means no claim", () => {
  it("returns null when both sides are zero", () => {
    expect(describeBubbleClaim({ kind: "delta", bid: 0, ask: 0, price: 5 })).toBeNull();
    expect(describeBubbleClaim({ kind: "big-trade", bid: 0, ask: 0, price: 5 })).toBeNull();
  });

  it("treats non-finite and negative volumes as absent, never as data", () => {
    for (const junk of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      expect(describeBubbleClaim({ kind: "delta", bid: junk, ask: 0, price: 5 })).toBeNull();
    }
    // One real side survives even when the other is junk.
    const c = describeBubbleClaim({ kind: "delta", bid: Number.NaN, ask: 40, price: 5 })!;
    expect(c.value).toBe(40);
    expect(c.detail).toContain("0 sold");
  });
});

// ───────────────────────────────────────────────────────────────────
describe("the ONE aggressor-side rule", () => {
  it("ask >= bid is buy, and ties resolve to buy", () => {
    expect(aggressorSide(5, 9)).toBe("buy");
    expect(aggressorSide(9, 5)).toBe("sell");
    expect(aggressorSide(7, 7)).toBe("buy");
  });

  it("PROOF: MainChart's two spellings are the same predicate", () => {
    // Big trades spawn with `lv.ask >= lv.bid`; delta zones with
    // `lv.delta >= 0`, and delta is ask - bid. Asserted over a real grid so
    // the equivalence is demonstrated rather than assumed.
    for (let bid = 0; bid <= 6; bid++) {
      for (let ask = 0; ask <= 6; ask++) {
        const bigTradeRule = ask >= bid ? "buy" : "sell";
        const deltaRule = ask - bid >= 0 ? "buy" : "sell";
        expect(deltaRule).toBe(bigTradeRule);
        expect(aggressorSide(bid, ask)).toBe(bigTradeRule);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────
describe("formatters keep small crypto sizes visible", () => {
  it("scales to M / k / integer", () => {
    expect(formatBubbleVolume(12_400_000)).toBe("12.4M");
    expect(formatBubbleVolume(12_400)).toBe("12.4k");
    expect(formatBubbleVolume(940)).toBe("940");
  });

  it("a 0.0431 BTC zone does NOT round to zero", () => {
    // Rounding sub-1 sizes to "0" would erase the very evidence the bubble
    // exists to show, on every crypto symbol.
    expect(formatBubbleVolume(0.0431)).toBe("0.0431");
    expect(formatBubbleVolume(0.25)).toBe("0.25");
    // 2026-09-26: whole-coin crypto sizes keep decimals; whole units do not grow any.
    expect(formatBubbleVolume(1.21)).toBe("1.21");
    expect(formatBubbleVolume(12.7)).toBe("12.7");
    expect(formatBubbleVolume(5)).toBe("5");
    expect(formatBubbleVolume(0)).toBe("0");
  });

  it("the exact formatter never abbreviates, and keeps crypto decimals", () => {
    expect(formatBubbleExact(12_400_000)).toBe("12,400,000");
    expect(formatBubbleExact(12_400)).toBe("12,400");
    expect(formatBubbleExact(0.0431)).toBe("0.0431");
    // 2026-09-26: a whole-coin crypto size keeps its decimals (was "1").
    expect(formatBubbleExact(1.21)).toBe("1.21");
    expect(formatBubbleExact(250)).toBe("250");
    expect(formatBubbleExact(Number.NaN)).toBe("—");
  });

  it("price precision follows magnitude", () => {
    expect(formatBubblePrice(21_750)).toBe("21,750");
    expect(formatBubblePrice(150.014)).toBe("150.01");
    expect(formatBubblePrice(0.4231)).toBe("0.4231");
    expect(formatBubblePrice(Number.NaN)).toBe("—");
  });
});

// ───────────────────────────────────────────────────────────────────
describe("MainChart delegates the claim rather than writing its own", () => {
  it("the hover handler calls the owner and passes the bubble KIND", () => {
    const h = tooltipHandler();
    expect(h).toContain("describeBubbleClaim({");
    // Without `kind` the owner cannot tell the two apart, which is the whole
    // defect. Pinned explicitly.
    expect(h).toMatch(/kind:\s*hit\.kind/);
    expect(h).toMatch(/bid:\s*hit\.bid/);
    expect(h).toMatch(/ask:\s*hit\.ask/);
  });

  it("BANS the shared one-sided sentence in the handler", () => {
    const h = stripComments(tooltipHandler());
    // Positive control: stripping must not have emptied the region.
    expect(h).toContain("describeBubbleClaim");
    expect(h).not.toMatch(/base > 100 \? "shares" : "vol"/);
    expect(h).not.toMatch(/aggressive \$\{hit\.side/);
  });

  it("BANS the hard-coded AGGRESSIVE chip in the renderer", () => {
    const r = stripComments(tooltipRender());
    expect(r).toContain("bubbleTip.heading");
    expect(r).toContain("bubbleTip.headline");
    // This chip sat above a number that meant two different things.
    expect(r).not.toMatch(/buy \? "AGGRESSIVE BUY" : "AGGRESSIVE SELL"/);
  });

  it("the renderer no longer formats the headline number itself", () => {
    // Re-deriving the number in the view is how it drifted from its label.
    const r = stripComments(tooltipRender());
    expect(r).toContain("bubbleTip.headline");
    expect(r).not.toMatch(/bubbleTip\.value/);
  });

  it("PROOF the comment-stripper does not neuter the bans", () => {
    // A stripper that ate everything would make every ban above vacuously
    // pass — the exact failure mode these Sentinels exist to prevent. Show it
    // removes prose and keeps code.
    const sample = `const a = 1; // base > 100 ? "shares" : "vol"\n/* bubbleTip.value */ const b = bubbleTip.value;`;
    const out = stripComments(sample);
    expect(out).toContain("const a = 1;");
    expect(out).toContain("const b = bubbleTip.value;");
    expect(out).not.toMatch(/"shares"/);
    // Exactly one survivor: the real code reference, not the commented one.
    expect(out.match(/bubbleTip\.value/g)).toHaveLength(1);
  });

  it("both spawn sites carry BOTH aggressor sides onto the bubble", () => {
    // The record used to keep only `value`, so the tooltip had nothing to be
    // honest WITH — the breakdown existed at spawn and was dropped one line
    // later. Same shape as the /paper reject-reason defect.
    for (const spawn of [bigTradeSpawn(), deltaSpawn()]) {
      expect(spawn).toMatch(/bid:\s*lv\.bid/);
      expect(spawn).toMatch(/ask:\s*lv\.ask/);
    }
  });
});

// ───────────────────────────────────────────────────────────────────
/**
 * ── 2026-09-18: THE WORDS WERE FIXED AND THE PIXELS WERE NOT ───────────────
 *
 * Everything above this line is about the SENTENCE on a bubble. It shipped,
 * and MainChart adopted it — while continuing to size the big-trade disc by
 * `lv.total`, the two-sided total this very module had just finished removing
 * from under the word BUY.
 *
 * So one bubble, at one instant, made two different magnitude claims: the
 * tooltip said 7,000 and the area drew 12,400. Weakness #1 inside a single
 * glyph, and it INVERTED the ranking of the printed number (see below).
 *
 * The delta path was already correct — but by coincidence, since |ask − bid|
 * happens to be both its size input and its claim. These tests make the
 * agreement a LAW rather than an accident, and prove it against
 * `describeBubbleClaim` itself instead of against a re-typed copy of its rule.
 */
describe("a bubble's SIZE and its SENTENCE claim the same number", () => {
  const cases = [
    { bid: 5_400, ask: 7_000 },
    { bid: 0, ask: 10_000 },
    { bid: 11_000, ask: 250 },
    { bid: 0.0431, ask: 0.0182 },
    { bid: 4, ask: 4 },
  ];

  it("bubbleClaimMagnitude equals |describeBubbleClaim().value| for both kinds", () => {
    for (const kind of ["big-trade", "delta"] as const) {
      for (const { bid, ask } of cases) {
        const claim = describeBubbleClaim({ kind, bid, ask, price: 150.01 })!;
        expect(claim, `no claim for ${kind} ${bid}/${ask}`).not.toBeNull();
        expect(bubbleClaimMagnitude(kind, bid, ask)).toBeCloseTo(Math.abs(claim.value), 10);
      }
    }
  });

  it("MEASURED: sizing by the two-sided total inverts the printed ranking", () => {
    // Two levels on one bar. A prints the larger number; B traded more in
    // total because it was churned back and forth.
    const A = { bid: 0, ask: 10_000 };
    const B = { bid: 5_000, ask: 6_000 };

    const headlineA = Math.abs(describeBubbleClaim({ kind: "big-trade", ...A, price: 1 })!.value);
    const headlineB = Math.abs(describeBubbleClaim({ kind: "big-trade", ...B, price: 1 })!.value);
    expect(headlineA).toBeGreaterThan(headlineB); // 10,000 > 6,000

    const oldSizeA = A.bid + A.ask; // 10,000
    const oldSizeB = B.bid + B.ask; // 11,000
    expect(oldSizeB).toBeGreaterThan(oldSizeA); // the disc said the opposite

    // The repair restores the ordering the tooltip states.
    expect(bubbleClaimMagnitude("big-trade", A.bid, A.ask))
      .toBeGreaterThan(bubbleClaimMagnitude("big-trade", B.bid, B.ask));
  });

  it("is a magnitude, never signed — a radius has no direction", () => {
    for (const kind of ["big-trade", "delta"] as const) {
      for (const { bid, ask } of cases) {
        expect(bubbleClaimMagnitude(kind, bid, ask)).toBeGreaterThanOrEqual(0);
      }
    }
    // A sell-dominant level is a positive magnitude, and the side is not lost:
    // it is `aggressorSide`'s answer, which colour reads.
    expect(bubbleClaimMagnitude("big-trade", 11_000, 250)).toBe(11_000);
    expect(aggressorSide(11_000, 250)).toBe("sell");
  });

  it("garbage in does not become a confident radius", () => {
    expect(bubbleClaimMagnitude("delta", Number.NaN, 5)).toBe(5);
    expect(bubbleClaimMagnitude("big-trade", -3, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("BAN: the big-trade renderer no longer sizes by the two-sided total", () => {
    const sizing = stripComments(
      region(chartSrc(), "const barPeak = ranked.reduce(", "bubblesRef.current.push({", 200),
    );
    // Both the numerator and the peak must come from the claim owner. Taking
    // the peak over a different quantity than the numerator is the same defect
    // one level up, and it would be invisible on a single bubble.
    expect(sizing).toMatch(/bigTradeBubbleRadius\(\s*bubbleClaimMagnitude\(/);
    expect(sizing).toMatch(/Math\.max\(m,\s*bubbleClaimMagnitude\(/);
    expect(sizing).not.toMatch(/bigTradeBubbleRadius\([^)]*lv\.total/);
    expect(sizing).not.toMatch(/Math\.max\(m,\s*lv\.total\)/);
  });

  it("BAN: the delta renderer sizes through the owner too", () => {
    const sizing = stripComments(
      region(chartSrc(), "const maxAbsD = Math.max(", 'kind: "delta"', 200),
    );
    expect(sizing).toMatch(/bubbleClaimMagnitude\(\s*"delta"/);
    // The old inline form. Equal in value today, and that is exactly why it
    // could drift without anything going red.
    expect(sizing).not.toMatch(/absDelta\s*=\s*Math\.abs\(lv\.delta\)/);
  });
});

describe("H-701B · bubble size relation", () => {
  it("ranks by the claimed magnitude among the same kind, with the median", async () => {
    const { bubbleRelation } = await import("./bubbleClaim");
    expect(bubbleRelation([100, 400, 250, 50], 250)).toEqual({ rank: 2, of: 4, median: 175 });
    expect(bubbleRelation([100, 400, 250], 400)).toEqual({ rank: 1, of: 3, median: 250 });
    // Ties share the better rank; empties are refused, not ranked "1 of 0".
    expect(bubbleRelation([300, 300, 100], 300)?.rank).toBe(1);
    expect(bubbleRelation([], 10)).toBeNull();
    expect(bubbleRelation([10, 20], 0)).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────
describe("a print's clock time is read in the axis's zone, not UTC", () => {
  // 2026-09-25 14:31:05 UTC — 10:31:05 in New York (EDT).
  const SEC = Date.UTC(2026, 8, 25, 14, 31, 5) / 1000;

  it("formats in the display zone the time axis uses", () => {
    expect(formatBubbleClock(SEC, "America/New_York", true)).toBe("10:31:05");
    expect(formatBubbleClock(SEC, "UTC", true)).toBe("14:31:05");
  });

  it("honours the 12-hour clock setting", () => {
    expect(formatBubbleClock(SEC, "America/New_York", false)).toMatch(/^10:31:05\sAM$/);
  });

  it("midnight on a 24-hour clock reads 00, never 24", () => {
    expect(formatBubbleClock(Date.UTC(2026, 8, 25, 4, 0, 7) / 1000, "America/New_York", true)).toBe("00:00:07");
  });

  it("a zone it cannot format falls back to UTC and says so", () => {
    expect(formatBubbleClock(SEC, "Not/AZone", true)).toBe("14:31:05 UTC");
    expect(formatBubbleClock(Number.NaN, "UTC", true)).toBe("—");
  });
});
