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

  const BANNER = path.resolve(__dirname, "selectMissingTapeBanner.ts");

  it("SmartMoneyPanel no longer hand-types asset-class coverage", () => {
    // Comments are stripped so the file may still QUOTE the removed paragraph
    // as the record of what failed — prose about a defect is not the defect.
    const src = stripComments(fs.readFileSync(PANEL, "utf8"));
    expect(src).not.toMatch(/carries them 24\/7/);
    expect(src).not.toMatch(/while the market is open/);
    expect(src).not.toMatch(/no aggressor tape wired up here yet/);
    // The class facts also may not come back through the SECOND paragraph
    // that used to recite the same menu under the delta-bubble tile.
    expect(src).not.toMatch(/Crypto streams it/);
    expect(src).not.toMatch(/Futures carry no aggressor tape here yet/);
  });

  it("the panel reaches the reason through exactly ONE path", () => {
    // 2026-09-17: the panel stopped calling `aggressorTapeReason` directly and
    // now reads it through `selectMissingTapeBanner`, which states the absence
    // ONCE for the whole drawer. That is a stronger arrangement, not a weaker
    // one — but only while the indirection actually terminates at this module.
    // Both halves are asserted, so the chain cannot be quietly cut at either
    // end and leave the panel free to retype the facts again.
    const panel = stripComments(fs.readFileSync(PANEL, "utf8"));
    const banner = stripComments(fs.readFileSync(BANNER, "utf8"));

    expect(panel).toContain("selectMissingTapeBanner(");
    expect(banner).toContain("aggressorTapeReason(");

    // And it must be ONE path: a panel that called both would be back to
    // having two voices for one fact, which is the defect this closed.
    expect(panel).not.toContain("aggressorTapeReason(");
  });

  it("the two panels that own their own absence prose defer to the banner", () => {
    // 2026-09-17, observed live on prod /charts with the banner SHIPPED: the
    // banner correctly named the missing input once and listed five blocked
    // readings — and two of those five went on printing their own paragraph
    // about the same absence a few hundred pixels below it. Three voices had
    // been removed and two were still talking.
    //
    // The panels are reusable and their standalone paragraphs are correct, so
    // the fix is a prop the SURFACE sets, not a rewrite. That makes this a
    // wiring fact, and wiring is what can silently come undone — hence a
    // Sentinel rather than trust.
    const panel = stripComments(fs.readFileSync(PANEL, "utf8"));
    const calls = panel.match(/absenceDeclaredAbove=\{missingTape !== null\}/g) ?? [];
    expect(calls.length, "both blocked panels must be told the absence is declared").toBe(2);

    // And each panel must actually BRANCH on it. A prop that is accepted and
    // ignored would pass the assertion above while changing nothing on screen,
    // which is the most expensive kind of green test.
    for (const file of ["ValueCandlePanel.tsx", "DeltaDivergencePanel.tsx"]) {
      const src = stripComments(
        fs.readFileSync(path.resolve(__dirname, "..", "..", "components/experience", file), "utf8"),
      );
      expect(src, `${file} must read the flag`).toContain("absenceDeclaredAbove");
      // The pattern must include the DEFERRAL TEXT, not just a `?`. An earlier
      // version of this assertion matched `absenceDeclaredAbove\s*\?` and was
      // satisfied by the OPTIONAL-PROPERTY question mark in the interface
      // (`readonly absenceDeclaredAbove?: boolean`), so it stayed green when
      // the branch was mutated away. Verified by mutation: replacing the
      // condition with `false` now fails this test.
      expect(src, `${file} must branch on it`).toMatch(
        /absenceDeclaredAbove\s*\n?\s*\?\s*\n?\s*"Blocked by the missing input named/,
      );
    }
  });

  it("the banner passes the sentence through instead of composing its own", () => {
    // The banner removes four voices. If it paraphrased the fifth it would
    // have removed four and added one — a net change of nothing, dressed up.
    const banner = stripComments(fs.readFileSync(BANNER, "utf8"));
    expect(banner).toMatch(/sentence:\s*reason\.sentence/);
  });
});
