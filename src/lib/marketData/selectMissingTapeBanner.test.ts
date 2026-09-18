import { describe, it, expect } from "vitest";
import { selectMissingTapeBanner } from "./selectMissingTapeBanner";
import { aggressorTapeReason } from "./aggressorTapeReason";

const READINGS = [
  "Delta domination",
  "Tape pressure",
  "Delta bubbles",
  "Value candle",
  "Delta divergence",
];

describe("selectMissingTapeBanner — the banner cannot outlive the absence", () => {
  it("is null whenever a signed tape is flowing", () => {
    expect(
      selectMissingTapeBanner({ symbol: "BTCUSD", hasSignedTape: true, blockedReadings: READINGS }),
    ).toBeNull();
  });

  it("is null for a futures symbol too, the moment a tape arrives", () => {
    // NOT_CARRIED is the strongest absence this codebase models, and even it
    // must yield to observed data. A banner that survived real prints would be
    // a permanent warning about a solved problem.
    expect(
      selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: true, blockedReadings: READINGS }),
    ).toBeNull();
  });

  it("appears when no signed tape is flowing", () => {
    const vm = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: READINGS });
    expect(vm).not.toBeNull();
    expect(vm!.missingInput).toBe("AGGRESSOR-TAGGED TAPE");
  });
});

describe("selectMissingTapeBanner — it adds no sixth voice", () => {
  it("passes the reason sentence through VERBATIM, never paraphrased", () => {
    // This is the whole discipline. The banner removes four voices; if it
    // rewrote the fifth it would have removed four and added one.
    for (const symbol of ["NQ1!", "AAPL", "BTCUSD", "ZZZZ_NOT_A_SYMBOL"]) {
      const reason = aggressorTapeReason(symbol, false);
      const vm = selectMissingTapeBanner({ symbol, hasSignedTape: false, blockedReadings: READINGS });
      expect(reason).not.toBeNull();
      expect(vm!.sentence).toBe(reason!.sentence);
    }
  });

  it("carries kind and assetClass through without re-deriving them", () => {
    for (const symbol of ["NQ1!", "AAPL", "BTCUSD", "ZZZZ_NOT_A_SYMBOL"]) {
      const reason = aggressorTapeReason(symbol, false)!;
      const vm = selectMissingTapeBanner({ symbol, hasSignedTape: false, blockedReadings: READINGS })!;
      expect(vm.kind).toBe(reason.kind);
      expect(vm.assetClass).toBe(reason.assetClass);
    }
  });

  it("distinguishes NOT_CARRIED from UNRECOGNISED, as the reason owner does", () => {
    const futures = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: READINGS })!;
    const junk = selectMissingTapeBanner({ symbol: "ZZZZ_NOT_A_SYMBOL", hasSignedTape: false, blockedReadings: READINGS })!;
    expect(futures.kind).toBe("NOT_CARRIED");
    expect(junk.kind).toBe("UNRECOGNISED");
  });
});

describe("selectMissingTapeBanner — the cost list", () => {
  it("names every blocked reading, in the caller's reading order", () => {
    const vm = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: READINGS })!;
    expect(vm.blockedReadings).toEqual(READINGS);
  });

  it("reports a count it derived, so no caller counts a list it was handed", () => {
    const vm = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: READINGS })!;
    expect(vm.blockedCount).toBe(vm.blockedReadings.length);
    expect(vm.blockedCount).toBe(5);
  });

  it("drops duplicates — naming one reading twice is the defect in miniature", () => {
    const vm = selectMissingTapeBanner({
      symbol: "NQ1!",
      hasSignedTape: false,
      blockedReadings: ["Tape pressure", "Tape pressure", "  Tape pressure  ", "Delta bubbles"],
    })!;
    expect(vm.blockedReadings).toEqual(["Tape pressure", "Delta bubbles"]);
    expect(vm.blockedCount).toBe(2);
  });

  it("drops blank names rather than rendering an empty bullet", () => {
    const vm = selectMissingTapeBanner({
      symbol: "NQ1!",
      hasSignedTape: false,
      blockedReadings: ["Delta bubbles", "", "   "],
    })!;
    expect(vm.blockedReadings).toEqual(["Delta bubbles"]);
  });

  it("still states the absence when nothing was named as blocked", () => {
    // The missing input is a fact about the feed, not about the drawer's
    // contents. A surface that happens to render no dependent reading must
    // still be able to say the tape is not there.
    const vm = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: [] })!;
    expect(vm.sentence.length).toBeGreaterThan(0);
    expect(vm.blockedCount).toBe(0);
  });

  it("does not mutate or alias the caller's array", () => {
    const input = ["Delta bubbles"];
    const vm = selectMissingTapeBanner({ symbol: "NQ1!", hasSignedTape: false, blockedReadings: input })!;
    expect(vm.blockedReadings).not.toBe(input);
    input.push("mutated");
    expect(vm.blockedReadings).toEqual(["Delta bubbles"]);
  });
});
