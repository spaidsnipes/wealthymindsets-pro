/**
 * NEWS SENTIMENT TRUTH — the Sentinel outlived the thing it was watching.
 *
 * This file used to guard `scoreSentiment()` inside `src/app/news/page.tsx`. It
 * checked that the fabricated "N% confidence" was gone and that `keywordHits`
 * was counted from real matches rather than re-derived from the score. Those
 * were the right laws. The scorer they were written against no longer exists:
 * the reading now compiles in `selectHeadlineLean` and draws in
 * `HeadlineLeanBand`.
 *
 * A Sentinel that names a file instead of an invariant defends the LOCATION and
 * loses the LAW. So this file does not simply follow the code to its new home
 * and it does not quietly delete itself. It does three things:
 *
 *   1. Re-states each surviving law against whatever now implements it, so the
 *      law is enforced at its new address.
 *   2. REPEALS, out loud and with a reason, the one law that was only ever true
 *      of the scorer — "the score is bounded to 5..95" — because a bounded
 *      score is still a score, and §15 forbids the whole category.
 *   3. Asserts BY NAME that the successor suites exist. A migrated Sentinel is
 *      indistinguishable from a deleted one unless something checks that the
 *      laws actually landed somewhere.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** Strip comments so a Sentinel documenting a defect cannot match its own prose. */
const decomment = (raw: string) =>
  raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/news/page.tsx";
const COMPILER = "src/lib/experience/selectHeadlineLean.ts";
const BAND = "src/components/experience/HeadlineLeanBand.tsx";

const page = decomment(read(PAGE));
const compiler = decomment(read(COMPILER));

describe("news sentiment truth — the surviving laws, at their new address", () => {
  it("STILL EMITS NO FABRICATED CONFIDENCE PERCENTAGE", () => {
    // The original law, unchanged. `confidence = 60 + |score - 50| * 0.8` was a
    // restatement of the score's distance from neutral wearing the word
    // "confidence", so a headline looked more reliable purely for matching more
    // keywords. Checked across all three files now, because the number could
    // reappear in whichever one does the arithmetic.
    for (const [name, src] of [[PAGE, page], [COMPILER, compiler], [BAND, decomment(read(BAND))]] as const) {
      expect(src, name).not.toMatch(/confidence\s*=\s*60\s*\+/);
      expect(src, name).not.toContain("% confidence");
      expect(src, name).not.toMatch(/confidence:\s*number/);
    }
  });

  it("STILL COUNTS THE TALLY FROM REAL MATCHES — and now there is only one counter", () => {
    // The old law said `keywordHits` must come from `BULLISH_WORDS.filter` and
    // not from `score - 50`. The new arrangement enforces it structurally: the
    // vocabulary lives in exactly one module and is walked in exactly one
    // function, so there is no second door for the same evidence to arrive
    // through. That was the actual defect — ±6 a word, then ±12 again for the
    // verdict those same words produced.
    expect(compiler).toContain("BULLISH_WORDS.filter");
    expect(compiler).toContain("BEARISH_WORDS.filter");
    expect([...compiler.matchAll(/BULLISH_WORDS\.filter/g)].length).toBe(1);
    expect([...compiler.matchAll(/BEARISH_WORDS\.filter/g)].length).toBe(1);

    // And the route may not hold a copy of the vocabulary to walk itself.
    expect(page).not.toContain("BULLISH_WORDS");
    expect(page).not.toContain("BEARISH_WORDS");
  });

  it("REPEALS 'the score is bounded to 5..95' — a bounded score is still a score, §15", () => {
    // The one law that was true only of the implementation. Clamping kept the
    // number inside a range; it did not make the number mean anything. The
    // successor does not clamp because there is nothing to clamp.
    expect(page).not.toContain("Math.min(95, score)");
    expect(page).not.toContain("scoreSentiment");
    expect(page).not.toContain("SentimentBar");
    // The tell of the whole category: a neutral baseline that exists before
    // any evidence has been read.
    expect(page).not.toMatch(/score\s*=\s*50/);
  });

  it("DRAWS NO PROPORTION OF AN IMAGINARY WHOLE", () => {
    // `width: ${score}%` asked "how far along the scale is this" of a scale
    // that was never defined. The band's width IS its count.
    expect(page).not.toMatch(/width:\s*`\$\{[^}]*score/);
    expect(decomment(read(BAND))).not.toMatch(/width:\s*`?\$?\{?[^;`"]*%/);
  });
});

describe("news sentiment truth — proof the laws landed rather than lapsed", () => {
  it("NAMES THE SUITES THAT INHERITED THEM, AND FAILS IF THEY GO MISSING", () => {
    // Without this, deleting the successor tests would leave this Sentinel
    // green and the laws unguarded — which is exactly how a migration becomes
    // a deletion nobody voted for.
    for (const heir of [
      "src/lib/experience/selectHeadlineLean.test.ts",
      "src/components/experience/HeadlineLeanBand.test.tsx",
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), heir)), heir).toBe(true);
    }
  });

  it("the heirs carry the two states the old score could not tell apart", () => {
    const heir = read("src/lib/experience/selectHeadlineLean.test.ts");
    // Nothing-found and both-found both scored ~50 and both read "Neutral".
    // If a future edit collapses them again, it fails here as well as there.
    expect(heir).toContain("NO_VOCABULARY");
    expect(heir).toContain("CONFLICTED");
    expect(compiler).toContain("NO_VOCABULARY");
    expect(compiler).toContain("CONFLICTED");
  });

  it("the route says the reading is a keyword tally and not a prediction", () => {
    // The disclaimer is the price of showing the tally at all. It may move
    // between the row and the band, but it may not disappear from the surface
    // a reader is looking at.
    const band = read(BAND);
    expect(band).toContain("not a prediction");
  });
});
