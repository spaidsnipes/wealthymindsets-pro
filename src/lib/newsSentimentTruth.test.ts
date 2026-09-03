import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/news/page.tsx"),
  "utf8",
);

/** Strip comments so a Sentinel documenting a defect cannot match its own prose. */
const page = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * News sentiment truth Sentinel — canon weakness #4 SCORE ADDICTION.
 *
 * scoreSentiment() is a keyword tally over the headline and summary. It
 * additionally emitted `confidence = 60 + |score - 50| * 0.8` and rendered it
 * as "N% confidence" beside a brain icon. That number measured nothing about
 * reliability — it was a restatement of the score's own distance from neutral,
 * so a headline matching more keywords looked more certain purely because it
 * matched more keywords.
 *
 * Canon: "preserve vectors ... narrow validated scores only where the construct
 * is defined."
 */
describe("news sentiment truth", () => {
  it("emits no fabricated confidence percentage", () => {
    expect(page).not.toMatch(/confidence\s*=\s*60\s*\+/);
    expect(page).not.toContain("% confidence");
    expect(page).not.toMatch(/confidence:\s*number/);
  });

  it("reports the real keyword tally instead", () => {
    expect(page).toContain("keywordHits");
    expect(page).toContain("keyword");
  });

  it("the keyword tally is derived from actual matches, not the score", () => {
    const i = page.indexOf("const keywordHits");
    expect(i).toBeGreaterThan(-1);
    const region = page.slice(i, i + 260);
    expect(region).toContain("BULLISH_WORDS.filter");
    expect(region).toContain("BEARISH_WORDS.filter");
    // Must not be re-derived from `score`.
    expect(region).not.toContain("score - 50");
  });

  it("the sentiment score itself is still a bounded keyword heuristic", () => {
    expect(page).toContain("Math.max(5, Math.min(95, score))");
  });
});
