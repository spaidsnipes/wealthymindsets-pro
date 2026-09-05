/**
 * The REGIME chip may not invent a market state, and may not date a move it
 * cannot prove is today's.
 *
 * WHY THIS FILE EXISTS (2026-09-05, read off the Founder's live screen with
 * computer-use, not hypothesised). The /charts top-center overlay read:
 *
 *   REGIME  SIDE  |  -0.34% today
 *
 * on a Saturday, with GC1! proven closed — while the ticker rail one screen
 * above correctly said "SESSION CLOSED — LAST VERIFIED". Two untruths in one
 * 9-point chip, from a single call site:
 *
 *   const p = Number.isFinite(ticker.changePct) ? ticker.changePct : 0;
 *   const reg = p > 1.5 ? "BULL" : p < -1.5 ? "BEAR" : "SIDE";
 *
 * 1. The `: 0` fallback turns "no quote yet" into a printed "+0.00%" AND a
 *    classified regime of "SIDE" — a MARKET STATE derived from the absence of
 *    data. Missing is not flat.
 * 2. "today" was a string literal, so the chip claimed liveness it had not
 *    earned. Canon §8 bans stale-as-live, and a date word is a liveness claim.
 *
 * WHAT IS PINNED, AND WHY IT IS NOT JUST A SYMBOL CHECK. Asserting the file
 * merely *mentions* selectRegimeBadge is toothless: a revive can keep the
 * import and still hand-roll the old arithmetic beside it. So the literals
 * that ARE the defect are banned by name. Each ban below failed on the real
 * pre-fix source — that is the only reason it is here.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectRegimeBadge } from "./selectRegimeBadge";

const CHARTS_DASHBOARD = resolve(__dirname, "../../components/chart/ChartsDashboard.tsx");
const src = () => readFileSync(CHARTS_DASHBOARD, "utf8");

describe("the chip's claims are delegated, not hand-rolled", () => {
  it("ChartsDashboard composes the canonical owner", () => {
    // Necessary, not sufficient — the bans below are what actually hold.
    expect(src()).toContain("selectRegimeBadge");
  });

  it("no `: 0` fallback survives anywhere near changePct", () => {
    // THE DEFECT, verbatim in shape. Zero-filling an unverified change is how
    // silence became "SIDE". Any ternary that ends `changePct ... : 0` is the
    // same fabrication wearing different whitespace.
    const offenders = src().match(/changePct[^\n]*\?[^\n]*:\s*0\b/g) ?? [];
    expect(offenders).toEqual([]);
  });

  it("no period word is hardcoded next to the percentage", () => {
    // `{p.toFixed(2)}% today` is the exact string that lied on a Saturday.
    // The word must come from selectRegimePeriodLabel, which can return null.
    const offenders = src().match(/%\s+(today|last session)\s*$/gm) ?? [];
    expect(offenders).toEqual([]);
  });

  it("the ±1.5 thresholds are not re-inlined in the component", () => {
    // Two copies of a band boundary drift. The chip and the Markov state model
    // must reclassify together or not at all.
    const offenders = src().match(/[<>]\s*-?1\.5\b/g) ?? [];
    expect(offenders).toEqual([]);
  });
});

describe("the owner still refuses to classify silence", () => {
  it("returns nothing displayable without a verified change", () => {
    // Pinned here as well as in the unit suite: if someone softens the guard
    // in selectRegimeBadge itself, the component ban above would still pass.
    const at = new Date("2026-09-05T19:59:00Z");
    for (const absent of [undefined, null, NaN, "0"]) {
      expect(selectRegimeBadge({ changePct: absent, symbol: "GC1!", at }).displayable).toBe(false);
    }
  });

  it("earns 'last session' on the proven-closed Saturday that was observed", () => {
    expect(selectRegimeBadge({ changePct: -0.34, symbol: "GC1!", at: new Date("2026-09-05T19:59:00Z") }))
      .toMatchObject({ regime: "SIDE", periodLabel: "last session" });
  });
});
