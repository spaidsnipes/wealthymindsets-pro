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

/**
 * SECOND LIVE OBSERVATION, same day, after the fix above shipped. /charts read:
 *
 *   REGIME  SIDE  +0.00% last session
 *   4,476.60  — (change unavailable)     ← header price line, one row below
 *
 * The date word was repaired; the fabrication was not. The component now
 * forwarded a real value, so the ban on `: 0` above passed — and the chip still
 * named a market state the header simultaneously said was unknown.
 *
 * The zero-pair (`change === 0 && changePct === 0`) is this ticker's "no
 * reference close yet" sentinel, set by useWebSocket.flush(). A caller that
 * forwards only `changePct` destroys the evidence needed to see it. So the wire
 * itself is pinned, not just the arithmetic: the bans above cannot detect an
 * argument that was never passed.
 */
describe("the call site forwards enough evidence to detect absence", () => {
  it("ChartsDashboard passes change alongside changePct", () => {
    // Comments are stripped BEFORE the argument object is delimited. A fixed
    // character window fails the moment someone documents the call site — this
    // assertion already broke once that way, on the very comment explaining
    // why the argument is required.
    const stripped = src().replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const call = stripped.match(/selectRegimeBadge\(\{[^}]*\}\)/);
    expect(call, "selectRegimeBadge call site not found").not.toBeNull();
    expect(call![0]).toMatch(/\bchange:\s*ticker\.change\b/);
    expect(call![0]).toMatch(/\bchangePct:\s*ticker\.changePct\b/);
  });
});

describe("the owner still refuses to classify silence", () => {
  it("returns nothing displayable without a verified change", () => {
    // Pinned here as well as in the unit suite: if someone softens the guard
    // in selectRegimeBadge itself, the component ban above would still pass.
    const at = new Date("2026-09-05T19:59:00Z");
    for (const absent of [undefined, null, NaN, "0"]) {
      expect(selectRegimeBadge({ canonRegime: null, change: -3.4, changePct: absent, symbol: "GC1!", at }).displayable).toBe(false);
    }
  });

  it("refuses the zero-pair that was rendering as '+0.00% last session'", () => {
    const at = new Date("2026-09-05T19:59:00Z");
    const view = selectRegimeBadge({ canonRegime: null, change: 0, changePct: 0, symbol: "GC1!", at });
    expect(view.displayable).toBe(false);
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  it("delegates the evidence test rather than re-deriving it", () => {
    // Hand-rolled finiteness is what let the zero-pair through. There is one
    // owner of "is this change backed by a real reference close".
    const owner = readFileSync(resolve(__dirname, "./selectRegimeBadge.ts"), "utf8");
    expect(owner).toContain("selectTickerChangeDisplay");
    const body = owner.slice(owner.indexOf("export function selectRegimeBadge"));
    expect(body).not.toMatch(/Number\.isFinite/);
  });

  it("earns 'last session' on the proven-closed Saturday that was observed", () => {
    expect(selectRegimeBadge({ canonRegime: null, change: -15.2, changePct: -0.34, symbol: "GC1!", at: new Date("2026-09-05T19:59:00Z") }))
      .toMatchObject({ regime: "SIDE", periodLabel: "last session" });
  });
});

/**
 * THIRD LIVE OBSERVATION, 2026-09-15, photographed on /charts with the Founder
 * watching. Both earlier defects had stayed fixed. This one was above them:
 *
 *   REGIME  BEAR  -2.62% today               ← this chip, top-centre of chart
 *   NOW · Unresolved: direction, location, aggression, REGIME, structure,
 *         volatility, profile, orderFlow (0/8 dimensions resolved).
 *   NEXT · Resolve regime — first of 9 unpaid evidence nodes.   ← same screen
 *
 * The chip answered a question the same screen was telling the trader to go
 * answer, and the rail was withholding right-of-way on the strength of it being
 * unanswered. The number was honest; the WORD was borrowed.
 *
 *   this chip        BULL / BEAR / SIDE   from the DAY CHANGE PERCENT
 *   canon dimension  TREND / BALANCE      from CLASSIFIED PER-TRADE TAPE
 *
 *     A DAY-CHANGE PERCENT IS NOT A MARKET REGIME. LABEL WHAT YOU MEASURED.
 *
 * Pinned at the COMPONENT, not only in the selector, because the selector can
 * return `verdictLabel` forever while a component prints a literal beside it.
 * That is precisely how the first fix here was nearly evaded — see the docblock
 * above on hand-rolled arithmetic surviving next to a live import.
 */
describe("× THE BORROWED WORD — the chart chip does not impersonate canon", () => {
  const codeOnly = () =>
    src()
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

  it("the verdict label is read from the owner, not typed into the component", () => {
    const code = codeOnly();
    expect(code, "the component no longer renders badge.verdictLabel").toContain("badge.verdictLabel");
    // Non-vacuity: prove the stripper really removed commentary, or every
    // assertion below is just matching prose. A COMMENT IS NOT A CONSUMER.
    expect(src()).toContain("A DAY-CHANGE PERCENT IS NOT A MARKET");
    expect(code).not.toContain("A DAY-CHANGE PERCENT IS NOT A MARKET");
  });

  it("the component never hard-codes REGIME as the label over its own verdict", () => {
    // THE DEFECT, verbatim in shape: a span whose text is REGIME immediately
    // followed by the span rendering {reg}. That adjacency IS the impersonation.
    const impersonation = />REGIME<\/span>\s*<span[^>]*>\{reg\}<\/span>/;
    expect(impersonation.test(codeOnly()),
      "the chart chip is labelling its day-change band 'REGIME' again").toBe(false);
  });

  it("the canon dimension is actually forwarded — the wire, not just the word", () => {
    // The bans above cannot see an argument that was never passed. Without
    // this the chip would simply go quiet about canon, which reads as agreement.
    const call = codeOnly().match(/selectRegimeBadge\(\{[^}]*\}\)/);
    expect(call, "selectRegimeBadge call site not found").not.toBeNull();
    expect(call![0]).toMatch(/\bcanonRegime:/);
    expect(call![0], "canonRegime is hard-wired to null — the chip could never report canon")
      .not.toMatch(/\bcanonRegime:\s*null\b/);
  });

  it("the component renders canon's unresolved state rather than staying silent", () => {
    const code = codeOnly();
    expect(code).toContain("badge.canon.resolved");
    expect(code, "canon's 'not yet' has no rendering, so an unresolved dimension looks like agreement")
      .toContain("UNRESOLVED");
  });
});
