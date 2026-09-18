/**
 * ContinuationHealthView — the rendered half of Asset 15's refusal.
 *
 * `selectContinuationHealth` already has a test proving it mints no score. That
 * guard covers the VM; it cannot cover the RENDERER, and the mockup's four
 * percentages are a rendering defect by nature — somebody adds a bar because
 * the picture wants one. So the ban is asserted a second time HERE, against the
 * actual markup, and against markup compiled from the REAL owner rather than a
 * hand-built VM. A view test that mocks its own reading can go green while the
 * two files disagree about the shape they share.
 *
 * The other thing this file exists for is the ABSENCE. `vm.unread` names the
 * VOLUME CONFIRMATION card the mockup asked for and this composition has no
 * owner for. A surface that quietly draws four of five cards teaches the
 * reviewer the fifth was never requested. It was requested; the refusal has to
 * be legible on screen, not only in a docblock.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ContinuationHealthView from "./ContinuationHealthView";
import { selectContinuationHealth } from "@/lib/marketData/viewModels/selectContinuationHealth";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { RegimeVM, RegimeVerdict } from "@/lib/marketData/viewModels/selectRegime";

function structureOf(over: Partial<MarketStructureVM> = {}): MarketStructureVM {
  return {
    measured: true,
    lookback: 5,
    barCount: 120,
    unconfirmedBars: 5,
    confirmationLagNote: "the newest 5 bars cannot yet be a pivot",
    swingHighs: [],
    swingLows: [],
    lastSwingHigh: null,
    lastSwingLow: null,
    bias: "HIGHER_HIGHS",
    biasNote: "the last two confirmed highs each printed higher",
    insufficientNote: null,
    ...over,
  } as MarketStructureVM;
}

function regimeOf(verdict: RegimeVerdict): RegimeVM {
  return {
    verdict,
    resolution: "RESOLVED",
    confidence: 0.6,
    narrative: `Regime narrative for ${verdict}`,
    evidence: [],
    contradictions: [],
    capturedAt: 1_700_000_000_000,
  } as RegimeVM;
}

/**
 * What a trader actually reads. Strips tags — and with them every style value,
 * which is where the only legitimate `%` on this surface lives.
 */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

const render = (bias: MarketStructureVM["bias"], verdict: RegimeVerdict) =>
  renderToStaticMarkup(
    <ContinuationHealthView
      vm={selectContinuationHealth({ structure: structureOf({ bias }), regime: regimeOf(verdict) })}
      symbol="BTC"
      timeframe="15m"
    />,
  );

describe("ContinuationHealthView", () => {
  it("PRINTS NO PERCENTAGE, on any of the four states", () => {
    const html = [
      render("HIGHER_HIGHS", "TREND"), //  COHERENT
      render("HIGHER_HIGHS", "BALANCE"), // CONTESTED
      render("RANGE", "BALANCE"), //        ROTATING
      renderToStaticMarkup(
        <ContinuationHealthView
          vm={selectContinuationHealth({
            structure: structureOf({ measured: false }),
            regime: regimeOf("TREND"),
          })}
          symbol="BTC"
        />,
      ), //                                 UNREADABLE
    ];
    for (const out of html) {
      // VISIBLE TEXT ONLY. Asserting against raw markup would catch the `100%`
      // in a gradient stop and redden on a style edit, which trains the next
      // reader to weaken the guard. What is banned is a percentage a TRADER
      // can read, so the tags come off first.
      const text = visibleText(out);
      // The mockup's own figures, by name.
      expect(text).not.toMatch(/\b(92|78|84|85)\s*%/);
      // And the general form: no number-with-a-percent anywhere in the prose,
      // because no field on the VM carries one.
      expect(text).not.toMatch(/\d\s*%/);
    }
  });

  it("states the verdict in WORDS and lets the reason line own the finding", () => {
    const out = render("HIGHER_HIGHS", "TREND");
    expect(out).toContain("COHERENT");
    expect(out).toContain("both owners describe a market that is going somewhere");
  });

  it("carries each owner's OWN sentence, and names the owner beside it", () => {
    const out = render("HIGHER_HIGHS", "TREND");
    // Verbatim from selectMarketStructure, not a rephrasing.
    expect(out).toContain("the last two confirmed highs each printed higher");
    expect(out).toContain("Regime narrative for TREND");
    // The audit trail: a reviewer can grep the file named on screen.
    expect(out).toContain("selectMarketStructure");
    expect(out).toContain("selectRegime");
  });

  it("DRAWS THE CARD IT DID NOT READ as a named absence", () => {
    const out = render("HIGHER_HIGHS", "TREND");
    expect(out).toContain("Not read here");
    expect(out).toContain("VOLUME CONFIRMATION");
  });

  it("carries the permanent pivot lag on a directional reading, and omits it otherwise", () => {
    expect(render("HIGHER_HIGHS", "TREND")).toContain("the newest 5 bars cannot yet be a pivot");
    // ROTATING states no direction, so there is no lag claim to make.
    expect(render("RANGE", "BALANCE")).not.toContain("cannot yet be a pivot");
  });

  it("heads the surface with the question the reading actually licenses", () => {
    // Over a rotating market the mockup's string would presume its own subject.
    expect(render("RANGE", "BALANCE")).toContain("Is anything continuing here at all?");
    expect(render("HIGHER_HIGHS", "TREND")).toContain("or is the move already spent?");
  });

  it("renders an UNREADABLE reading without throwing and without a fake verdict", () => {
    const out = renderToStaticMarkup(
      <ContinuationHealthView
        vm={selectContinuationHealth({ structure: null, regime: null })}
        symbol="BTC"
      />,
    );
    expect(out).toContain("UNREADABLE");
    expect(out).toContain("there is no move whose continuation could be judged");
    expect(out).not.toContain("COHERENT");
  });
});
