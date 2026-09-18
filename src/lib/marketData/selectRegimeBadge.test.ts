/**
 * State matrix for the REGIME chip. All three defects observed live 2026-09-05
 * are reproduced here as named cases, not paraphrased.
 */

import { describe, it, expect } from "vitest";
import {
  selectRegimeBadge,
  selectRegimePeriodLabel,
  selectCanonRegimeView,
  DAY_BIAS_LABEL,
} from "./selectRegimeBadge";
import type { MarketStateDimension } from "./canonicalMarketState";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SAT = new Date("2026-09-05T19:59:00Z"); // Saturday — session proven closed
const TUE = new Date("2026-09-08T18:00:00Z"); // Tuesday — closure NOT established

/** A change backed by a real reference close, for cases testing other axes. */
const backed = (pct: number) => ({ change: pct * 10, changePct: pct });

describe("missing data yields no regime", () => {
  it("does not classify when changePct is absent", () => {
    // THE DEFECT: `Number.isFinite(x) ? x : 0` turned "no quote" into 0, which
    // fell into the SIDE band. A fabricated market state out of pure silence.
    for (const absent of [undefined, null, NaN, Infinity, -Infinity, "0", "-0.34"]) {
      const view = selectRegimeBadge({ canonRegime: null, change: -3.4, changePct: absent, symbol: "GC1!", at: SAT });
      expect(view.displayable, `changePct=${String(absent)}`).toBe(false);
    }
  });

  it("does not classify when the absolute change is absent", () => {
    // Symmetric to the above. Both numbers are evidence; one alone is not.
    for (const absent of [undefined, null, NaN, Infinity, -Infinity, "0"]) {
      const view = selectRegimeBadge({ canonRegime: null, change: absent, changePct: -0.34, symbol: "GC1!", at: SAT });
      expect(view.displayable, `change=${String(absent)}`).toBe(false);
    }
  });

  it("never reports SIDE for an unverified change", () => {
    const view = selectRegimeBadge({ canonRegime: null, change: undefined, changePct: undefined, symbol: "GC1!", at: SAT });
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  /**
   * READ OFF THE LIVE SITE 2026-09-05, AFTER THE FIRST FIX SHIPPED. /charts:
   *
   *   REGIME  SIDE  +0.00% last session
   *   4,476.60  — (change unavailable)      ← one row below, same screen
   *
   * The version of this file that shipped with the first fix asserted the
   * OPPOSITE of the case below, under the heading "a real zero IS displayable —
   * flat is a fact, missing is not". That reasoning is sound in the abstract
   * and wrong for this ticker shape: useWebSocket.flush() leaves change and
   * changePct at their initial 0 until prevCloseRef holds a real prior close,
   * so the zero-pair IS the absence sentinel. A finiteness check cannot see it.
   *
   * selectTickerChangeDisplay already owned this exact question and already
   * documented that four of five sites got it wrong the same way. This one made
   * five. The regime selector now delegates instead of re-deriving.
   */
  it("withholds the zero-pair — that is 'no reference close', not 'flat'", () => {
    const view = selectRegimeBadge({ canonRegime: null, change: 0, changePct: 0, symbol: "GC1!", at: SAT });
    expect(view.displayable).toBe(false);
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  it("a genuinely flat percent with a real move in the absolute is kept", () => {
    // Proves the guard keys on the PAIR, not on changePct alone — otherwise it
    // would be a blanket "zero is never displayable" rule, which would drop
    // real data on any instrument whose rounded percent lands on 0.00.
    expect(selectRegimeBadge({ canonRegime: null, change: 0.004, changePct: 0, symbol: "GC1!", at: TUE }))
      .toMatchObject({ displayable: true, regime: "SIDE", changePct: 0 });
  });
});

describe("regime bands mirror the Markov state model", () => {
  const cases: ReadonlyArray<readonly [number, string]> = [
    [5, "BULL"], [1.51, "BULL"], [1.5, "SIDE"],
    [-1.5, "SIDE"], [-1.51, "BEAR"], [-9, "BEAR"],
  ];

  for (const [pct, regime] of cases) {
    it(`${pct}% -> ${regime}`, () => {
      const view = selectRegimeBadge({ canonRegime: null, ...backed(pct), symbol: "GC1!", at: TUE });
      expect(view).toMatchObject({ displayable: true, regime });
    });
  }

  it("boundaries are exclusive, so 1.5 is not yet BULL", () => {
    // Pinned because a > / >= slip silently reclassifies the market.
    expect(selectRegimeBadge({ canonRegime: null, ...backed(1.5), symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
    expect(selectRegimeBadge({ canonRegime: null, ...backed(-1.5), symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
  });
});

describe("'today' is a liveness claim and must be earned", () => {
  it("says 'last session' on a Saturday — the exact live observation", () => {
    // Screenshot 2026-09-05: "REGIME SIDE -0.34% today" with GC1! closed.
    const view = selectRegimeBadge({ canonRegime: null, ...backed(-0.34), symbol: "GC1!", at: SAT });
    expect(view).toMatchObject({ displayable: true, periodLabel: "last session" });
  });

  it("says 'today' when closure is not established", () => {
    expect(selectRegimePeriodLabel("GC1!", TUE)).toBe("today");
  });

  it("emits no period word before mount, so the label only sharpens", () => {
    // null at === the server render and first client render. Claiming either
    // word there is a coin flip that can require a retraction on settle.
    expect(selectRegimePeriodLabel("GC1!", null)).toBeNull();
    expect(selectRegimeBadge({ canonRegime: null, ...backed(-0.34), symbol: "GC1!", at: null }))
      .toMatchObject({ displayable: true, periodLabel: null });
  });

  it("still says 'today' for crypto on a Saturday — it never closed", () => {
    // Continuous markets have no session to close. Labelling BTC's Saturday
    // move "last session" would be the same overreach pointed the other way.
    expect(selectRegimePeriodLabel("BTC", SAT)).toBe("today");
  });
});

/**
 * THIRD LIVE OBSERVATION, 2026-09-15 — photographed on /charts, both earlier
 * defects still fixed. The chip read `REGIME BEAR -2.62% today` directly above
 * an evidence rail reading `Unresolved: … regime … (0/8 dimensions resolved)`
 * and a NEXT card instructing the trader to `Resolve regime`.
 *
 * The number was honest. The WORD was not. This chip bands a day-change
 * percent; the canonical dimension reads classified per-trade tape and speaks
 * TREND / BALANCE (deriveRegimeDimension.ts). Two owners, one reserved word.
 *
 *     A DAY-CHANGE PERCENT IS NOT A MARKET REGIME. LABEL WHAT YOU MEASURED.
 */
describe("the chip does not impersonate the canonical regime dimension", () => {
  const dim = (over: Partial<MarketStateDimension>): MarketStateDimension => ({
    resolution: "UNKNOWN", value: null, confidence: null,
    evidence: [], contradictions: [], unknowns: ["none supplied"],
    ...over,
  });

  it("× THE BORROWED WORD: its own verdict is labelled DAY BIAS, never REGIME", () => {
    const view = selectRegimeBadge({ canonRegime: null, ...backed(-2.62), symbol: "TSLA", at: TUE });
    expect(view.displayable).toBe(true);
    if (!view.displayable) return;
    expect(view.verdictLabel).toBe(DAY_BIAS_LABEL);
    expect(DAY_BIAS_LABEL).not.toContain("REGIME");
  });

  it("× THE BORROWED WORD: an unresolved canon dimension is reported unresolved", () => {
    // The exact photographed pairing: a real -2.62% day move while canon has
    // resolved nothing. The chip may still band the day; it may not claim the
    // dimension the rail is simultaneously asking the trader to resolve.
    const view = selectRegimeBadge({
      canonRegime: dim({ resolution: "UNKNOWN" }),
      ...backed(-2.62), symbol: "TSLA", at: TUE,
    });
    expect(view).toMatchObject({ displayable: true, regime: "BEAR", canon: { resolved: false } });
  });

  it("× THE BORROWED WORD: PARTIAL is not an answer", () => {
    // The rail renders PARTIAL as an OPEN evidence node. Treating it as
    // resolved here would rebuild the contradiction through a side door.
    const view = selectRegimeBadge({
      canonRegime: dim({ resolution: "PARTIAL", value: null, unknowns: ["thin tape"] }),
      ...backed(3), symbol: "TSLA", at: TUE,
    });
    expect(view).toMatchObject({ canon: { resolved: false } });
  });

  it("× THE BORROWED WORD: a RESOLVED-but-valueless dimension is not an answer", () => {
    // canonicalMarketState already calls this combination invalid. The chip is
    // not the place to start rendering an invalid state as a verdict.
    const view = selectRegimeBadge({
      canonRegime: dim({ resolution: "RESOLVED", value: "   " }),
      ...backed(3), symbol: "TSLA", at: TUE,
    });
    expect(view).toMatchObject({ canon: { resolved: false } });
  });

  it("quotes canon verbatim when canon has actually resolved", () => {
    const view = selectRegimeBadge({
      canonRegime: dim({ resolution: "RESOLVED", value: "BALANCE", confidence: 0.6 }),
      ...backed(-2.62), symbol: "TSLA", at: TUE,
    });
    // Non-vacuity: the two halves genuinely disagree in vocabulary here, which
    // is the whole reason they must be labelled separately rather than merged.
    expect(view).toMatchObject({ regime: "BEAR", canon: { resolved: true, value: "BALANCE" } });
  });

  it("carries canon through unchanged — it is quoted, not re-derived", () => {
    for (const value of ["TREND", "BALANCE"]) {
      expect(selectCanonRegimeView(dim({ resolution: "RESOLVED", value })))
        .toEqual({ resolved: true, value });
    }
  });
});

/**
 * FOURTH LIVE OBSERVATION, 2026-09-17 — read out of the DOM on /charts, NQ1! 30m.
 * The chip rendered `DAY BIAS · BULL · +2.52% today · REGIME · UNRESOLVED` and
 * EVERY span came back `[text, "", ""]`: no title, no aria-label, wrapper
 * included. The distinction this module exists to draw was stated only in its
 * own source comments.
 */
describe("the reason the two words may differ is SPOKEN, not buried in source", () => {
  const dim = (over: Partial<MarketStateDimension>): MarketStateDimension => ({
    resolution: "UNKNOWN", value: null, confidence: null,
    evidence: [], contradictions: [], unknowns: ["none supplied"],
    ...over,
  });
  const spokenOf = (canonRegime: MarketStateDimension | null, pct = 2.52) => {
    const v = selectRegimeBadge({ canonRegime, ...backed(pct), symbol: "NQ1!", at: TUE });
    if (!v.displayable) throw new Error("expected displayable");
    return v.spoken;
  };

  it("× THE UNEXPLAINED PAIR: a confident word beside a refusal says why", () => {
    // The photographed pairing. BULL and UNRESOLVED are two QUESTIONS, not one
    // instrument disagreeing with itself — and the chip has to say so, because
    // a trader reads what is rendered, not what the module believes.
    const s = spokenOf(dim({ resolution: "UNKNOWN" }));
    expect(s).toMatch(/day bias BULL/);
    expect(s).toMatch(/not resolved/);
    expect(s).toMatch(/different question/);
  });

  it("× THE MEASUREMENT UNNAMED: it says what the band was measured FROM", () => {
    // "BULL" with no stated input is a market opinion. "BULL from the day
    // change percent, which has not read the tape" is a measurement.
    const s = spokenOf(null);
    expect(s).toMatch(/day-change percent/);
    expect(s).toMatch(/has not read\s+the tape/);
  });

  it("the number and its period travel with the verdict", () => {
    expect(spokenOf(null)).toMatch(/\+2\.52%/);
    expect(spokenOf(null)).toMatch(/today/);
    const sat = selectRegimeBadge({ canonRegime: null, ...backed(-2.62), symbol: "TSLA", at: SAT });
    if (!sat.displayable) throw new Error("expected displayable");
    expect(sat.spoken).toMatch(/-2\.62% last session/);
  });

  it("canon is quoted in the spoken line when canon has resolved", () => {
    const s = spokenOf(dim({ resolution: "RESOLVED", value: "BALANCE" }));
    expect(s).toMatch(/it says BALANCE/);
    expect(s).not.toMatch(/not resolved/);
  });

  it("the instrument is named — a loose sentence belongs to no chart", () => {
    expect(spokenOf(null)).toMatch(/^NQ1!/);
  });

  /**
   * FIFTH LIVE OBSERVATION, 2026-09-18, production /charts?symbol=TSLA 12:20:07Z.
   * The chip's accessible name said regime "is not resolved YET".
   *
   *     AN ABSENCE THAT CANNOT END IS NOT A PENDING STATE.
   *
   * Regime is composed from per-trade tape; /charts has none and structurally
   * cannot get any. "Yet" tells the trader to wait for something that will
   * never arrive. The true explanation was already sitting on the dimension's
   * `unknowns` — this selector was dropping it.
   */
  const TAPE_NOTE =
    "120 candles are loaded for TSLA, but no per-trade tape has arrived, and this reading is measured trade by trade. The candles cannot answer it.";

  it("× THE FALSE PROMISE: the word 'yet' never appears beside an unresolved regime", () => {
    for (const d of [
      null,
      dim({ resolution: "UNKNOWN" }),
      dim({ resolution: "UNKNOWN", unknowns: [TAPE_NOTE] }),
      dim({ resolution: "PARTIAL", unknowns: [TAPE_NOTE] }),
      dim({ resolution: "RESOLVED", value: null, unknowns: [TAPE_NOTE] }),
    ]) {
      expect(spokenOf(d), "a promise the venue cannot keep").not.toMatch(/\byet\b/i);
    }
  });

  it("× THE DISCARDED REASON: the dimension's own explanation is spoken", () => {
    const s = spokenOf(dim({ resolution: "UNKNOWN", unknowns: [TAPE_NOTE] }));
    expect(s).toMatch(/because 120 candles are loaded for TSLA/);
    expect(s).toMatch(/The candles cannot answer it\./);
  });

  it("× THE PARAPHRASE: the quoted reason is altered in exactly one character", () => {
    const s = spokenOf(dim({ resolution: "UNKNOWN", unknowns: ["Direction is unresolved, so the regime cannot be characterised."] }));
    // Lower-cased first letter to splice after "because" — nothing else touched.
    expect(s).toContain("because direction is unresolved, so the regime cannot be characterised.");
  });

  it("× THE MANGLED QUOTE: a reason that starts with a digit or an acronym is untouched", () => {
    expect(spokenOf(dim({ resolution: "UNKNOWN", unknowns: ["120 candles are loaded."] })))
      .toContain("because 120 candles are loaded.");
    expect(spokenOf(dim({ resolution: "UNKNOWN", unknowns: ["TSLA has no tape."] })))
      .toContain("because TSLA has no tape.");
  });

  it("× THE INVENTED REASON: no canonical state at all yields no 'because' clause", () => {
    // `null` dimension is NOT the same situation as a dimension that explains
    // its silence. The chip must not blur them by manufacturing a sentence.
    const s = spokenOf(null);
    expect(s).not.toMatch(/because/);
    expect(s).toMatch(/it is not resolved, which is why no regime word is shown/);
  });

  it("× THE PARAGRAPH: only the first reason is spoken, however many exist", () => {
    const s = spokenOf(dim({ resolution: "UNKNOWN", unknowns: ["  ", "First reason.", "Second reason."] }));
    expect(s).toContain("because first reason.");
    expect(s).not.toContain("Second reason");
  });

  it("× THE OVER-CORRECTION: a reason does not promote the reading to resolved", () => {
    const v = selectRegimeBadge({
      canonRegime: dim({ resolution: "UNKNOWN", unknowns: [TAPE_NOTE] }),
      ...backed(2.52), symbol: "NQ1!", at: TUE,
    });
    if (!v.displayable) throw new Error("expected displayable");
    // A sharper sentence must not become a stronger claim.
    expect(v.canon.resolved).toBe(false);
    expect(v.regime).toBe("BULL");
  });

  it("the spoken line never calls the day-bias half a REGIME", () => {
    // The third observation's law, re-pinned in the new channel: the reserved
    // word may appear only attached to the canonical dimension's own answer.
    const s = spokenOf(dim({ resolution: "UNKNOWN" }));
    const before = s.slice(0, s.indexOf("Market regime"));
    expect(before, "the reserved word leaked into the day-bias half")
      .not.toMatch(/regime/i);
  });
});

describe("ChartsDashboard adoption", () => {
  const CODE = readFileSync(
    join(process.cwd(), "src", "components", "chart", "ChartsDashboard.tsx"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("× THE UNREACHABLE HOVER: the chip carries an accessible NAME, not a title", () => {
    /**
     * This chip is `pointerEvents:"none"` so the crosshair keeps working under
     * it. A `title` there is unreachable by any pointer — it would read as a
     * fix in the diff and be nothing in the product. The assertion below is
     * the one that stops that non-fix from being shipped.
     */
    const at = CODE.indexOf("aria-label={badge.spoken}");
    expect(at, "the regime chip lost its accessible name").toBeGreaterThan(-1);
    const chip = CODE.slice(at, CODE.indexOf("selectRegimeBadge", at) + 1 || at + 2600);
    expect(chip, "a title was added to a pointerEvents:none overlay")
      .not.toMatch(/title=\{/);
    expect(CODE).toContain('pointerEvents:"none"');
  });

  it("the canon half is readable from the DOM, not only from pixels", () => {
    expect(CODE).toContain("data-regime-badge-canon=");
  });
});
