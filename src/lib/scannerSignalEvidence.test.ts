/**
 * The scan row refuses to grade what it did not observe.
 *
 * Two halves. The first proves the REFUSAL — the new behaviour. The second
 * proves the NON-refusal is byte-for-byte what the page did before, because
 * an extraction that quietly changes the ladder would make any future
 * "the scanner classifies differently now" report unattributable.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { strengthScore } from "@/lib/scannerStrength";
import {
  classifyScan,
  type ScanEvidence,
  type Signal,
} from "@/lib/scannerSignalEvidence";

const REPO_ROOT = resolve(__dirname, "..", "..");
const PAGE = "src/app/scanner/page.tsx";

const full = (over: Partial<ScanEvidence> = {}): ScanEvidence => ({
  changePct: 2.0,
  volRatio: 2.5,
  rsi: 50,
  ...over,
});

describe("an absent input is not a zero", () => {
  it("refuses to classify when percent change was not observed", () => {
    const c = classifyScan(full({ changePct: null }));
    expect(c.unrated).toBe(true);
    expect(c.signal).toBeNull();
    expect(c.strength).toBeNull();
    expect(c.reason).toContain("percent change");
    expect(c.reason, "the volume ratio WAS observed and must not be blamed").not.toContain(
      "volume ratio",
    );
  });

  it("refuses to classify when the volume ratio was not observed", () => {
    const c = classifyScan(full({ volRatio: null }));
    expect(c.unrated).toBe(true);
    expect(c.reason).toContain("volume ratio");
    expect(c.reason).not.toContain("percent change");
  });

  it("names BOTH inputs when both are missing", () => {
    const c = classifyScan(full({ changePct: null, volRatio: null }));
    expect(c.reason).toContain("percent change and volume ratio");
  });

  it("treats NaN and Infinity as absent, not as numbers", () => {
    // `volume / avgVol` produces Infinity when avgVol is 0, and NaN when
    // either side is undefined-coerced. Both are "no observation" wearing
    // a number's clothes, and both would sail through a `!= null` check.
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(classifyScan(full({ volRatio: bad })).unrated, `${bad} was accepted`).toBe(true);
      expect(classifyScan(full({ changePct: bad })).unrated, `${bad} was accepted`).toBe(true);
    }
  });

  it("does NOT require RSI, which the ladder already treats as optional", () => {
    // RSI was nullable before this change and the ladder guards it with
    // `rsi != null`. Promoting it to required would silently unrate every
    // row whose RSI call failed — a regression dressed as rigour.
    const c = classifyScan(full({ rsi: null }));
    expect(c.unrated).toBe(false);
    expect(c.signal).not.toBeNull();
  });

  it("REGRESSION: a flat-but-observed market is still rated", () => {
    // The entire point is distinguishing "0 was measured" from "nothing was
    // measured". If a real 0.00% move started coming back unrated, the fix
    // would have overshot into hiding true information.
    const c = classifyScan({ changePct: 0, volRatio: 0, rsi: null });
    expect(c.unrated).toBe(false);
    expect(c.signal).toBe("gap-fill");
    expect(c.strength).toBe("C");
  });
});

describe("the ladder itself is unchanged by the extraction", () => {
  // The original page implementation, transcribed once, as an ORACLE. This
  // is a deliberate second copy and it is allowed to exist only here: its
  // whole job is to disagree if the extracted copy drifts. A test that
  // called the real function on both sides would prove nothing.
  function originalSignal(changePct: number, volRatio: number, rsi: number | null): Signal {
    if (changePct > 3 && volRatio > 3) return "breakout-bull";
    if (changePct < -3 && volRatio > 3) return "breakout-bear";
    if (changePct > 1.5 && volRatio > 2) return "momentum-long";
    if (changePct < -1.5 && volRatio > 2) return "momentum-short";
    if (volRatio > 5) return "volume-surge";
    if (rsi != null && rsi < 35) return "fib-bounce";
    if (rsi != null && rsi > 70) return "supply-reject";
    if (changePct > 0.5) return "vwap-reclaim";
    return "gap-fill";
  }
  function originalStrength(changePct: number, volRatio: number): string {
    const score = Math.abs(changePct) * 0.5 + volRatio * 0.3;
    if (score > 5) return "A+";
    if (score > 3) return "A";
    if (score > 1.5) return "B";
    return "C";
  }

  it("agrees with the original on a swept grid of observed inputs", () => {
    let compared = 0;
    for (let cp = -6; cp <= 6; cp += 0.25) {
      for (let vr = 0; vr <= 8; vr += 0.25) {
        for (const rsi of [null, 20, 34.9, 35, 50, 70, 70.1, 85]) {
          const c = classifyScan({ changePct: cp, volRatio: vr, rsi });
          expect(c.signal, `signal drift at cp=${cp} vr=${vr} rsi=${rsi}`).toBe(
            originalSignal(cp, vr, rsi),
          );
          expect(c.strength, `strength drift at cp=${cp} vr=${vr}`).toBe(
            originalStrength(cp, vr),
          );
          compared++;
        }
      }
    }
    // POSITIVE CONTROL. If the loop bounds ever collapse, the assertions
    // above stop running and this file reports a clean extraction over
    // zero comparisons.
    expect(compared, "the comparison grid was empty").toBeGreaterThan(2000);
  });

  it("scores through the weight OWNER rather than a local copy", () => {
    // The page carried `Math.abs(changePct) * 0.5 + volRatio * 0.3` inline
    // while scannerStrength exported the same two weights under a comment
    // reading "Keep in sync." That is the stale-restatement defect with a
    // note attached asking someone to remember. Nobody remembers.
    expect(strengthScore(4, 2)).toBeCloseTo(2.6, 10);
    expect(classifyScan({ changePct: 4, volRatio: 2, rsi: null }).strength).toBe("B");
  });
});

describe("the page no longer fabricates the inputs", () => {
  const page = readFileSync(join(REPO_ROOT, PAGE), "utf8");

  it("stopped defaulting change, percent change and volume to zero", () => {
    // These four lines are the defect, verbatim as measured. Matching the
    // exact expressions rather than a loose pattern so a reformat does not
    // silently retire the guard, and a REAL reintroduction cannot hide
    // behind different spacing.
    for (const field of ["change", "changePct", "volume"]) {
      expect(
        page.replace(/\s+/g, " "),
        `${field} is being defaulted to 0 again — an absent reading rendered ` +
          `as a flat market and fed into the signal classifier`,
      ).not.toMatch(new RegExp(`const ${field} = q\\?\\.${field} \\?\\? old\\?\\.${field} \\?\\? 0`));
    }
  });

  it("classifies through the owner instead of a local ladder", () => {
    expect(page).toMatch(/from "@\/lib\/scannerSignalEvidence"/);
    expect(page).toMatch(/classifyScan\(/);
    expect(
      page,
      "the local ladder must stay deleted — two ladders disagree eventually",
    ).not.toMatch(/function signalFromQuote/);
    expect(page).not.toMatch(/function strengthFromData/);
  });

  it("renders the unrated row instead of dropping it", () => {
    // A symbol with a real price is real news even when its change is
    // missing. Hiding the row would trade one dishonesty for another.
    expect(page).toMatch(/unrated/i);
  });
});
