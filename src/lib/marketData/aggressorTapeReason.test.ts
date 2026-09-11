/**
 * The sentence a trader reads when the delta tug-of-war is missing must be
 * about the symbol on their screen, and must be true.
 *
 * These tests assert BEHAVIOUR ("a futures symbol is told it is not carried"),
 * never the wording, and never the membership of a class list — both of those
 * are owned elsewhere and a test that retyped them would be the same
 * restated-fact defect the module exists to end.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { aggressorTapeReason } from "./aggressorTapeReason";

describe("aggressorTapeReason", () => {
  it("says nothing at all while a signed tape is flowing", () => {
    // This module speaks only about absence. A version that also narrated
    // success would be the surface's SECOND opinion about whether data exists.
    expect(aggressorTapeReason("AAPL", true)).toBeNull();
    expect(aggressorTapeReason("NQ1!", true)).toBeNull();
  });

  it("THE MEASURED FAILURE: an equity trader is not told to wait for the bell", () => {
    // The paragraph this replaced said "stocks carry them while the market is
    // open". Signed equity prints come from the moomoo / webull / longbridge
    // lanes; an unconfigured provider produces none at 14:30 either. The
    // trader must be pointed at the provider wire, not at a clock.
    const reason = aggressorTapeReason("AAPL", false);
    expect(reason?.kind).toBe("NOT_FLOWING");
    expect(reason?.sentence).toContain("AAPL");
    expect(reason?.sentence.toLowerCase()).toContain("provider");
    expect(reason?.sentence.toLowerCase()).not.toContain("market is open");
  });

  it("separates 'not carried at all' from 'not right now'", () => {
    // Collapsing these is the "try again later" lie in one direction and
    // "give up on a sleeping feed" in the other.
    expect(aggressorTapeReason("NQ1!", false)?.kind).toBe("NOT_CARRIED");
    expect(aggressorTapeReason("EURUSD=X", false)?.kind).toBe("NOT_CARRIED");
    expect(aggressorTapeReason("BTC-USD", false)?.kind).toBe("NOT_FLOWING");
  });

  it("reads the two notations for one contract as the same answer", () => {
    // `NQ1!` and `NQ=F` are the same contract. Two routes once disagreed about
    // that; this sentence must not reintroduce the split.
    expect(aggressorTapeReason("NQ=F", false)?.kind).toBe(
      aggressorTapeReason("NQ1!", false)?.kind,
    );
  });

  it("tells a NOT_CARRIED trader that waiting will not help", () => {
    const sentence = aggressorTapeReason("NQ1!", false)!.sentence;
    expect(sentence).toContain("NQ1!");
    expect(sentence.toLowerCase()).toContain("waiting will not change it");
  });

  it("calls an unreadable symbol unrecognised rather than empty", () => {
    const reason = aggressorTapeReason("NOTATICKERATALL", false);
    expect(reason?.kind).toBe("UNRECOGNISED");
    expect(reason?.assetClass).toBe("UNKNOWN");
  });

  it("never returns a blank or symbol-less sentence for any input", () => {
    for (const symbol of ["AAPL", "BTC-USD", "NQ1!", "EURUSD=X", "^VIX", "", "   ", "???"]) {
      const reason = aggressorTapeReason(symbol, false);
      expect(reason, `${symbol || "<blank>"} must still be explained`).not.toBeNull();
      expect(reason!.sentence.length, `${symbol || "<blank>"} got an empty sentence`).toBeGreaterThan(40);
    }
  });
});

describe("the panel reads the reason instead of retyping the facts", () => {
  const PANEL = path.resolve(
    __dirname,
    "..",
    "..",
    "components/smart-money/SmartMoneyPanel.tsx",
  );

  it("SmartMoneyPanel no longer hand-types asset-class coverage", () => {
    // Comments are stripped so the file may still QUOTE the removed paragraph
    // as the record of what failed — prose about a defect is not the defect.
    const src = stripComments(fs.readFileSync(PANEL, "utf8"));
    expect(src).toContain("aggressorTapeReason(");
    expect(src).not.toMatch(/carries them 24\/7/);
    expect(src).not.toMatch(/while the market is open/);
    expect(src).not.toMatch(/no aggressor tape wired up here yet/);
  });
});
