/**
 * THE CHIP'S LAWS — each one written against the thing it replaced.
 *
 * Two routes drew this number in green. The colour tests below would have
 * failed on both. The rest are about the two facts a streak chip is uniquely
 * able to misstate: that a streak exists when it does not, and that a streak
 * means something it does not mean.
 *
 * The §9 Sentinel next door already sweeps this file for green-dominant hex,
 * which is why the chip lives here at all. These tests cover what a source
 * sweep cannot see — the RENDERED result, and the tailwind-class channel, where
 * `text-wm-green` carries a colour with no hex literal anywhere in the file.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DisciplineStreakChip,
  streakIsWorthShowing,
  STREAK_FLOOR,
  type DisciplineStreakKind,
} from "./DisciplineStreakChip";

const render = (
  kind: DisciplineStreakKind,
  current: number,
  best: number,
  measured?: number,
): string =>
  renderToStaticMarkup(
    <DisciplineStreakChip
      kind={kind}
      current={current}
      best={best}
      measured={measured}
      testId="t"
    />,
  );

describe("DisciplineStreakChip — §9, the house does not congratulate", () => {
  it("CARRIES NO GREEN-DOMINANT COLOUR IN ANY STATE", () => {
    // The repair, stated as the law it restores. /morning-prep drew this in
    // #88F5D3 on rgba(0,212,170,·); both are green-dominant.
    for (const kind of ["CLEAN_DAYS", "FOCUS"] as const) {
      for (const [c, b] of [[2, 2], [7, 30], [400, 400]] as const) {
        const html = render(kind, c, b);
        for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
          const [r, g, bl] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
          expect(g > r && g > bl, `green-dominant #${m[1]} for ${kind}`).toBe(false);
        }
        for (const m of html.matchAll(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
          const [r, g, bl] = [1, 2, 3].map((i) => Number(m[i]));
          expect(g > r && g > bl, `green-dominant ${m[0]} for ${kind}`).toBe(false);
        }
      }
    }
  });

  it("SPENDS NO HUE ON THE VERDICT — the figure and the label are the only colours", () => {
    // Not merely "not green". A chip that went amber for a long streak and grey
    // for a short one would pass the test above and commit the same offence:
    // the house grading the trader by colour. The palette must not move with
    // the number.
    const palette = (html: string) =>
      [...html.matchAll(/(?:color|background|border):\s*([^;"]+)/g)].map((m) => m[1].trim()).sort();
    expect(palette(render("CLEAN_DAYS", 2, 2))).toEqual(palette(render("CLEAN_DAYS", 400, 400)));
    expect(palette(render("CLEAN_DAYS", 3, 90))).toEqual(palette(render("FOCUS", 3, 90)));
  });

  it("does not reach for a green through the tailwind class channel either", () => {
    // How the /journal chips carried it: `text-wm-green` with no hex in sight.
    // A hex-literal sweep — including the Sentinel next door — sees nothing.
    const src = readFileSync(path.join(__dirname, "DisciplineStreakChip.tsx"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code).not.toMatch(/-wm-green/);
    expect(code).not.toMatch(/\bemerald|\bgreen-\d|\bteal-\d|\blime-\d/);
  });
});

describe("DisciplineStreakChip — a streak of one is a day", () => {
  it("DRAWS NOTHING BELOW THE FLOOR — §14, no manufactured pride", () => {
    for (const n of [0, 1]) {
      expect(render("CLEAN_DAYS", n, 9), `current=${n}`).toBe("");
      expect(render("FOCUS", n, 9), `current=${n}`).toBe("");
    }
    expect(STREAK_FLOOR).toBe(2);
  });

  it("draws from the floor upward", () => {
    expect(render("CLEAN_DAYS", 2, 2)).not.toBe("");
    expect(render("FOCUS", 2, 2)).not.toBe("");
  });

  it("GIVES BOTH ROUTES THE SAME ANSWER — one owner for 'is there a streak'", () => {
    // The live divergence: /journal was silent below 2 days and below 3 trades,
    // /morning-prep showed both from 1. The same book, the same morning, two
    // answers — and silence in this house means "we looked and found nothing",
    // so one of the two was misreporting a finding.
    for (const n of [0, 1, 2, 3, 99]) {
      expect(streakIsWorthShowing(n), `n=${n}`).toBe(n >= STREAK_FLOOR);
    }
  });

  it("treats a non-finite count as no streak rather than as a streak", () => {
    expect(streakIsWorthShowing(NaN)).toBe(false);
    expect(streakIsWorthShowing(Infinity)).toBe(false);
  });
});

describe("DisciplineStreakChip — what the number is, and is not", () => {
  it("SAYS ON ITS FACE THAT IT IS A COUNT AND NOT A GRADE", () => {
    // The chip is read fastest by the trader it is about. If it can be taken
    // for an assessment, we have made the assessment.
    const html = render("CLEAN_DAYS", 7, 30, 45);
    expect(html).toContain("not a grade");
  });

  it("NEVER CALLS THE DAYS 'CLEAN' — the selector counts no-trade days as clean", () => {
    // `selectRuleAdherenceStreak` scores a day with ZERO entries as clean, by
    // canon. So the longest streak in the book can be a fortnight of not
    // trading, and "clean days" would be the house characterising an absence of
    // evidence as a good result.
    const html = render("CLEAN_DAYS", 14, 14);
    // The KIND key is still CLEAN_DAYS — it names the selector, and renaming
    // the selector is a different change. What must not say "clean" is the
    // part a trader reads, so the data attributes are stripped first.
    const readable = html.replace(/data-\w+="[^"]*"/g, " ").toLowerCase();
    expect(readable).not.toContain("clean");
    expect(html).toContain("without a broken rule");
  });

  it("carries the measurement window when it has one", () => {
    // 4 of 5 days measured and 4 of 200 are different facts about the same 4.
    expect(render("CLEAN_DAYS", 4, 4, 5)).toContain("over 5 days measured");
    expect(render("CLEAN_DAYS", 4, 4)).not.toContain("days measured");
  });

  it("shows BEST only when it is actually better", () => {
    // Printing 7 beside 7 invites a reader to compare a figure with itself,
    // and reads as a second, corroborating number when it is the same one.
    expect(render("FOCUS", 7, 7)).not.toContain('data-testid="t-best"');
    expect(render("FOCUS", 7, 30)).toContain('data-testid="t-best"');
  });

  it("prints no percentage and no score — §15", () => {
    const html = render("FOCUS", 9, 30, 45);
    expect(html).not.toMatch(/\d+%/);
    expect(html).not.toMatch(/\/\s*100\b/);
  });

  it("keeps the true figures in the markup for anything that needs to check", () => {
    const html = render("CLEAN_DAYS", 7, 30, 45);
    expect(html).toContain('data-current="7"');
    expect(html).toContain('data-best="30"');
    expect(html).toContain('data-kind="CLEAN_DAYS"');
  });
});

describe("DisciplineStreakChip — the routes that used to draw this themselves", () => {
  const routeSource = (rel: string) =>
    readFileSync(path.join(process.cwd(), rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

  /**
   * Aimed at the EXPRESSION, not at the route's palette.
   *
   * `selectPrepChecklistBand.enforcement.test.ts` records why a whole-file
   * colour guard pointed at an app route is the wrong instrument: it
   * false-fires on unrelated elements, and "a guard that makes a route rename
   * its own palette to satisfy a rule about the prep count has started
   * distorting the thing it protects." /journal carries legitimate green
   * elsewhere and is entitled to.
   *
   * So these two assert one thing only: that the routes ask the chip instead of
   * drawing the streak themselves. If either ever hand-rolls it again, the
   * colour is back in a place no Sentinel can see, and this fails.
   */
  for (const rel of ["src/app/journal/page.tsx", "src/app/morning-prep/page.tsx"]) {
    it(`${rel} renders the streak through the chip and not by hand`, () => {
      const src = routeSource(rel);
      expect(src).toContain("DisciplineStreakChip");
      // The literal shapes that were there. Both routes gated the chip on a
      // hand-picked threshold and painted it themselves.
      expect(src).not.toMatch(/dayStreak\.current\s*>=?\s*\d/);
      expect(src).not.toMatch(/focusStreak\.current\s*>=?\s*[1-9]/);
      expect(src).not.toMatch(/text-wm-green[^"]*"[^"]*aria-label=[^"]*[Ss]treak/);
    });
  }

  it("neither route still carries the exact colours that were on these chips", () => {
    // NARROW ON PURPOSE, and the first draft of this test proves why.
    //
    // It banned `border-wm-green/40 bg-wm-green/N text-wm-green` across the
    // whole of /journal and failed — on the realizedR chip, the maturity
    // verdict and the mental-gate PASS badge. Those ARE §9 breaches of the same
    // family and are recorded as such, but they are not this change, and a test
    // that fails until someone repairs three unrelated surfaces is the
    // route-wide palette guard the prep-band enforcement file already warns
    // against. Scoped to the streak identifiers instead.
    const prep = routeSource("src/app/morning-prep/page.tsx");
    expect(prep).not.toContain("#88F5D3");
    expect(prep).not.toContain("#88f5d3");
    // The gradient BEHIND the badge faded brass-to-teal, which spent the same
    // verdict a second time across the whole panel. `rgba(0,212,170,·)` still
    // appears elsewhere on this route as brand teal and is entitled to.
    const badge = prep.slice(
      prep.indexOf("Morning discipline continuity") - 700,
      prep.indexOf("Morning discipline continuity") + 1600,
    );
    expect(badge).not.toMatch(/rgba\(0,\s*212,\s*170/);

    for (const rel of ["src/app/journal/page.tsx", "src/app/morning-prep/page.tsx"]) {
      for (const line of routeSource(rel).split("\n")) {
        if (!/dayStreak|focusStreak/.test(line)) continue;
        expect(line, `${rel} — a streak still painting itself`).not.toMatch(
          /wm-green|#[0-9a-f]{6}/i,
        );
      }
    }
  });
});
