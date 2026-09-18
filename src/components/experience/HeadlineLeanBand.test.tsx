/**
 * THE BAND'S LAWS — written against the bar it replaced.
 *
 * `SentimentBar` drew `width: ${score}%` in green/red/amber with the number
 * printed beside it. Each test below forbids one of the things that bar did,
 * and the two hardest ones are about states it could not tell apart:
 *
 *   - nothing found vs. both found     (both were "Neutral", both were 50)
 *   - read-and-found-nothing vs. never-read   (H1)
 *
 * The compiler's own suite proves the TALLY is right. This proves the PICTURE
 * says the same thing the tally does.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HeadlineLeanBand, leanInWords } from "./HeadlineLeanBand";
import { selectHeadlineLean, LEAN_SLOTS, type HeadlineLean } from "@/lib/experience/selectHeadlineLean";

const render = (lean: HeadlineLean | null): string =>
  renderToStaticMarkup(<HeadlineLeanBand lean={lean} testId="t" />);

/** The real compiler, so the picture is always tested against a real reading. */
const of = (text: string) => selectHeadlineLean(text);

const marks = (html: string, side: "bullish" | "bearish"): number =>
  [...html.matchAll(new RegExp(`data-side="${side}"`, "g"))].length;

const attr = (html: string, name: string): string | null =>
  html.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;

describe("HeadlineLeanBand — the tally is the width, and there is no full", () => {
  it("DRAWS NO UNLIT SLOTS — a scale that runs to nothing must not look like six", () => {
    // The argument against the old bar, restated as geometry. Unlit slots would
    // tell a reader the reading runs out of six. It runs out of nothing; it is
    // a count.
    const html = render(of("record inflows")!);
    const total = marks(html, "bullish") + marks(html, "bearish");
    expect(total, "marks drawn for terms that did not match").toBe(of("record inflows")!.matched);
  });

  it("puts each side's marks on its own side, and counts them right", () => {
    const lean = of("Strong gains despite one concern")!;
    const html = render(lean);
    expect(marks(html, "bullish")).toBe(lean.bullish);
    expect(marks(html, "bearish")).toBe(lean.bearish);
    expect(lean.bullish).toBeGreaterThan(lean.bearish);
  });

  it("always draws the centre, so the reader can see where counting starts", () => {
    for (const t of ["surge", "crash", "surge crash", "a quiet regulatory filing"]) {
      expect(render(of(t)!), t).toContain('data-testid="t-centre"');
    }
  });

  it("prints NO NUMBER on the row — §15", () => {
    // The old bar printed the score beside itself. Nothing VISIBLE here is a
    // digit; the tally lives in the tooltip and in the screen-reader text,
    // where it is a fact stated on request rather than a badge worn on the row.
    //
    // The sr-only span is excluded — and the exclusion has to earn itself, so
    // the next assertion proves that span really is clipped. An exclusion that
    // is not checked is how a "no numbers" guard ends up ignoring the numbers.
    const html = render(of("record surge rally")!);
    expect(html).toMatch(/data-testid="t-sr"[^>]*clip:rect\(0 0 0 0\)/);

    const visible = html
      .replace(/<span data-testid="t-sr"[\s\S]*?<\/span>/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ");
    expect(visible).not.toMatch(/\d/);
    expect(render(of("record surge")!)).not.toMatch(/\d+%/);
  });
});

describe("HeadlineLeanBand — nothing found, both found, never read", () => {
  it("TELLS 'FOUND NOTHING' APART FROM 'FOUND BOTH' — the collision that was live", () => {
    // Both of these were a half-full amber bar reading "Neutral" and the number
    // 50. They are opposite states and now they cannot render the same.
    const nothing = render(of("Company files quarterly paperwork with the regulator")!);
    const both = render(of("Record inflows follow crash warning")!);

    expect(attr(nothing, "data-direction")).toBe("NO_VOCABULARY");
    expect(attr(both, "data-direction")).toBe("CONFLICTED");

    // Not merely a different attribute — a different PICTURE.
    expect(marks(nothing, "bullish") + marks(nothing, "bearish")).toBe(0);
    expect(marks(both, "bullish")).toBeGreaterThan(0);
    expect(marks(both, "bearish")).toBeGreaterThan(0);
  });

  it("draws the found-nothing reading as a bare centre — not as half of something", () => {
    const html = render(of("Company files quarterly paperwork with the regulator")!);
    expect(html).toContain('data-testid="t-centre"');
    expect(html).not.toContain('data-testid="t-mark"');
    // The tell of the old bar: a width that is a fraction of a container.
    expect(html).not.toMatch(/width:\s*\d+%/);
  });

  it("DRAWS ABSOLUTELY NOTHING FOR A HEADLINE THAT WAS NEVER READ — H1", () => {
    // The third state. If this drew a bare centre it would be claiming the
    // house read something and found nothing, which it did not do.
    expect(render(null)).toBe("");
    expect(render(of(""))).toBe("");
  });

  it("keeps all three states mutually distinguishable in the markup", () => {
    const seen = [
      render(of("")), // never read
      render(of("a quiet regulatory filing")!), // read, nothing
      render(of("record crash")!), // read, both
      render(of("record surge")!), // read, bullish
      render(of("crash losses")!), // read, bearish
    ];
    expect(new Set(seen).size, "two different states render identically").toBe(seen.length);
  });
});

describe("HeadlineLeanBand — §9, direction is position and never hue", () => {
  it("GIVES BULLISH AND BEARISH MARKS THE SAME COLOUR", () => {
    // A bullish headline is not safe. The old bar said green for bullish and
    // red for bearish, which is the house passing a verdict on the news.
    const html = render(of("record crash")!);
    const fills = new Set(
      [...html.matchAll(/data-side="\w+"[^>]*background:([^;"]+)/g)].map((m) => m[1].trim()),
    );
    expect(fills.size, "the two sides are drawn in different colours").toBe(1);
    expect([...fills][0]).toBe("#ede6d3");
  });

  it("carries no green-dominant colour in any state", () => {
    for (const t of ["record surge rally", "crash losses warning", "record crash", "quiet filing"]) {
      for (const m of render(of(t)!).matchAll(/#([0-9a-f]{6})\b/gi)) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
        expect(g > r && g > b, `green-dominant #${m[1]} for "${t}"`).toBe(false);
      }
    }
  });

  it("changes EXACTLY ONE thing between a bullish and a bearish mark — which side it is on", () => {
    // Compared property by property, so a geometry difference nobody thought to
    // forbid cannot slip in either. A bearish mark must not be shorter, thinner
    // or rounder than a bullish one.
    const html = render(of("record crash")!);
    const styles = [...html.matchAll(/data-side="\w+" style="([^"]*)"/g)].map((m) => m[1]);
    expect(styles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(styles).size, "the two sides differ by more than position").toBe(1);
  });
});

describe("HeadlineLeanBand — a picture that caps must say so", () => {
  it("CLAMPS THE DRAWING BUT NEVER THE TRUTH", () => {
    // A row can only hold so many marks. A picture that silently caps is
    // accurate on small readings and wrong on large ones, which is the worst
    // shape of error: it is right exactly where nobody is checking.
    const huge: HeadlineLean = {
      bullish: LEAN_SLOTS + 5,
      bearish: 0,
      matched: LEAN_SLOTS + 5,
      direction: "BULLISH",
    };
    const html = render(huge);
    expect(marks(html, "bullish")).toBe(LEAN_SLOTS);
    expect(html).toContain('data-clamped="true"');
    // The true count survives in the markup and in the words.
    expect(html).toContain(`data-count="${LEAN_SLOTS + 5}"`);
    expect(leanInWords(huge)).toContain(String(LEAN_SLOTS + 5));
  });

  it("does not claim to be clamped when it is not", () => {
    const html = render(of("record surge")!);
    expect(html).not.toContain('data-clamped="true"');
  });
});

describe("leanInWords — the reading, for anything that cannot see it", () => {
  it("SAYS WHAT THE TALLY IS, EVERY TIME", () => {
    // The lists hold "lead", "clear", "top", "signal" and "narrow". A reader who
    // mistakes this for a model output has been misled by us, not by the news.
    for (const t of ["record surge", "crash", "record crash", "a quiet filing"]) {
      expect(leanInWords(of(t)!), t).toContain("not a prediction");
      expect(leanInWords(of(t)!), t).toContain("keyword tally");
    }
  });

  it("says nothing matched rather than printing two zeroes", () => {
    // "0 bullish, 0 bearish keywords matched" is a fact nobody needs, and a
    // reader scanning for absence finds numbers there.
    const words = leanInWords(of("a quiet regulatory filing")!);
    expect(words).toContain("No sentiment keywords matched");
    expect(words).not.toMatch(/\b0\b/);
  });

  it("counts exactly what the marks count — walked across every reading", () => {
    // The words and the picture are built from the same fields, and this is the
    // assertion that keeps them that way.
    const TEXTS = [
      "a quiet regulatory filing",
      "record surge",
      "crash losses warning",
      "record inflows follow crash warning",
      "strong gains despite one concern",
      "surge beat upgrade raised rally accelerating record",
    ];
    for (const t of TEXTS) {
      const lean = of(t)!;
      const html = render(lean);
      const words = leanInWords(lean);
      if (lean.matched === 0) {
        expect(marks(html, "bullish") + marks(html, "bearish"), t).toBe(0);
        continue;
      }
      // An absent side is OMITTED from the words, so a missing match reads as
      // zero — which is what it means, and the assertion still bites if the
      // words ever disagree with the marks.
      const said = (side: string) => Number(words.match(new RegExp(`(\\d+) ${side}`))?.[1] ?? 0);
      expect(said("bullish"), `${t} — bullish`).toBe(lean.bullish);
      expect(said("bearish"), `${t} — bearish`).toBe(lean.bearish);
      expect(marks(html, "bullish"), `${t} — drawn bullish`).toBe(
        Math.min(lean.bullish, LEAN_SLOTS),
      );
      expect(marks(html, "bearish"), `${t} — drawn bearish`).toBe(
        Math.min(lean.bearish, LEAN_SLOTS),
      );
    }
  });

  it("is what a screen reader gets, since the marks are hidden from it", () => {
    const html = render(of("record crash")!);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("not a prediction");
  });
});
