/**
 * DivisionWorksheetView — the rendered half of Asset 01's refusal.
 *
 * `selectDivisionWorksheet` already has a test proving it mints no score and
 * that MISSING EVIDENCE stays blank. That guard covers the VM; it cannot cover
 * the RENDERER, and Asset 01's defects are rendering defects by nature —
 * somebody prints a placeholder because the picture has a value in that slot,
 * or quietly drops a rung because there was nothing to put in it.
 *
 * So the markup is compiled from the REAL owner rather than a hand-built VM. A
 * view test that mocks its own reading can go green while the two files
 * disagree about the shape they share.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DivisionWorksheetView from "./DivisionWorksheetView";
import { SCAFFOLD_LEVELS } from "@/lib/marketData/viewModels/scaffoldWorksheet";
import {
  selectDivisionWorksheet,
  type DivisionWorksheetInput,
} from "@/lib/marketData/viewModels/selectDivisionWorksheet";
import type { AbsorptionAnatomyViewVM } from "@/lib/marketData/viewModels/selectAbsorptionAnatomyView";
import type { AggressionResponseVM } from "@/lib/marketData/viewModels/selectAggressionResponse";
import {
  CONTINUATION_HEALTH_VERSION,
  type ContinuationHealthVM,
} from "@/lib/marketData/viewModels/selectContinuationHealth";
import type { RegimeVM } from "@/lib/marketData/viewModels/selectRegime";

const FULL: DivisionWorksheetInput = {
  barCount: 120,
  tickCount: 4_310,
  anatomy: {
    version: 1,
    basis: "SIGNED_DELTA",
    measured: true,
    windowBars: 30,
    bars: [],
    zones: [],
    focusZone: null,
    aggression: {
      buyInitiated: 1_200_000,
      sellInitiated: 900_000,
      buyShare: 0.571,
      sellShare: 0.429,
      netDelta: 300_000,
      deltaSeries: [],
      totalVolume: 2_100_000,
    },
    checklist: [],
    conviction: { strength: "STRONG", ratio: 7.4, unbounded: false, ladderFill: 0.8 },
    reason: "effort is provider-stated aggressor delta — no absorption zone in the last 30 bars",
    zoneQualificationPossible: true,
    effortSpreadNote: null,
  } as AbsorptionAnatomyViewVM,
  response: {
    basis: "SIGNED_DELTA",
    measured: true,
    aggressionAxis: "NET_AGGRESSION",
    aggressionAxisNote: "the y-axis carries signed net aggression",
    points: [],
    netAggression: 300_000,
    meanResponse: 0.42,
    efficiency: 0.63,
    efficiencyScaleNote: "window-relative: it compares bars within this window only",
    zones: [],
    windowBars: 30,
    zoneQualificationPossible: true,
    effortSpreadNote: null,
    effortConcentration: 0.2,
  } as AggressionResponseVM,
  regime: {
    verdict: "TREND",
    resolution: "RESOLVED",
    confidence: 0.6,
    narrative: "Regime narrative for TREND",
    evidence: [],
    contradictions: [],
    capturedAt: 1_700_000_000_000,
  } as RegimeVM,
  continuation: {
    // Its OWN constant, not a hand-typed literal. `tsc` caught the first draft
    // writing `1` here: this owner versions with a namespaced string while the
    // anatomy owner beside it uses a number, and a fixture that guesses the
    // shape is a fixture that can go green against a VM nobody ships.
    version: CONTINUATION_HEALTH_VERSION,
    health: "COHERENT",
    measured: true,
    readings: [],
    unread: [],
    reason: "both owners describe a market that is going somewhere",
    levels: [],
    confirmationLagNote: null,
  } as ContinuationHealthVM,
};

const render = (input: DivisionWorksheetInput = {}) =>
  renderToStaticMarkup(
    <DivisionWorksheetView vm={selectDivisionWorksheet(input)} symbol="BTC" timeframe="15m" />,
  );

/**
 * What a trader actually reads. Strips tags — and with them every style value,
 * which is where the only legitimate numbers-in-markup live.
 */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

describe("DivisionWorksheetView", () => {
  it("DRAWS ALL SEVEN RUNGS even when only some could be worked", () => {
    // The whole point. A surface that rendered six of seven would teach the
    // reader the seventh was never asked for.
    for (const input of [FULL, {}, { barCount: 120 }]) {
      const out = render(input);
      expect(out.match(/data-testid="worksheet-rung"/g)).toHaveLength(7);
    }
  });

  it("names every rung, in the mockup's order, on an EMPTY room", () => {
    const text = visibleText(render());
    for (const label of [
      "RAW EVIDENCE",
      "PARTICIPATION",
      "RESPONSE",
      "EFFICIENCY",
      "CONTEXT",
      "INTERPRETATION",
      "MISSING EVIDENCE",
    ]) {
      expect(text).toContain(label);
    }
  });

  it("PRINTS NO PLACEHOLDER VALUE on a blank rung — it says the words instead", () => {
    const out = render();
    // Seven blanks, seven "Not read here", zero values.
    expect(out.match(/data-testid="worksheet-blank"/g)).toHaveLength(7);
    expect(out).not.toContain('data-testid="worksheet-value"');
  });

  it("REFUSES THE MOCKUP'S OWN NUMBERS — they were its canvas dimensions", () => {
    // Asset 01 prints `421 × 532` against six rungs and `421 × 423` against the
    // seventh. Asserted on VISIBLE TEXT, because a pixel value in a style
    // attribute is not something a trader reads and banning it there would
    // redden the guard on a layout edit.
    for (const input of [FULL, {}]) {
      const text = visibleText(render(input));
      expect(text).not.toContain("421");
      expect(text).not.toContain("532");
      expect(text).not.toContain("423");
    }
  });

  it("GRADES NOTHING IN HUE — §9. No bar, no fill, no green", () => {
    const out = render(FULL);
    // The green a filled score bar would need. Checked against RAW markup on
    // purpose: this one IS about the style values.
    expect(out).not.toMatch(/green/i);
    expect(out).not.toMatch(/#[0-9a-f]*[0-9a-f]{2}(?:cc|ff)[0-9a-f]{2}\b/i);
    expect(out).not.toMatch(/\d\s*%/);
    // A SCORE BAR IS A PROPORTIONAL WIDTH. That is the shape being banned —
    // not the word `width`, which `min-width` on the step-number gutter uses
    // legitimately. The first draft of this line banned the substring and went
    // red on a layout property that grades nothing, which is exactly how a
    // guard gets weakened by the next reader instead of understood.
    expect(out).not.toMatch(/\bwidth:\s*\d+(\.\d+)?%/);
  });

  describe("MISSING EVIDENCE — blank on screen, not blank in the markup", () => {
    it("stays UNREAD on the fully-worked worksheet, with its owner beside it", () => {
      const out = render(FULL);
      expect(out).toContain('data-step="7" data-state="UNREAD"');
      // Six worked, and the seventh visibly not. The pairing is the assertion.
      expect(out).toContain('data-read="6"');
      const text = visibleText(out);
      expect(text).toContain("decisionPermissionCompiler");
      expect(text).toContain("/command-deck");
    });
  });

  describe("RIGHT OF WAY — refused where the mockup put it", () => {
    it("draws the footer and names the owner rather than omitting the block", () => {
      const out = render(FULL);
      expect(out).toContain('data-testid="worksheet-right-of-way"');
      const text = visibleText(out);
      expect(text).toContain("computeRightOfWay");
    });

    it("NEVER PRINTS A PERMISSION WORD AS A VERDICT", () => {
      // `WAIT` / `NO TRADE` / `ACTION` are `RightOfWay` values owned by
      // decisionPermissionCompiler. They may appear inside the refusal sentence
      // — that is the sentence quoting what it refuses — but never as a value.
      const out = render(FULL);
      expect(out).not.toContain('data-testid="worksheet-value">WAIT');
      expect(out).not.toMatch(/data-testid="worksheet-value"[^>]*>\s*(NO TRADE|ACTION|CAUTION)/);
    });
  });

  describe("the division chain", () => {
    it("prints the dividend on EVERY rung, worked or blank", () => {
      const text = visibleText(render());
      expect(text.match(/divided:/g)).toHaveLength(7);
    });

    it("names the step each rung carried down from", () => {
      const text = visibleText(render(FULL));
      expect(text).toContain("carried from step 1");
      expect(text).toContain("carried from step 3");
      expect(text).toContain("carried from step 5");
    });
  });

  it("carries each owner's OWN sentence and the owner's name beside it", () => {
    const text = visibleText(render(FULL));
    expect(text).toContain("window-relative: it compares bars within this window only");
    expect(text).toContain("effort is provider-stated aggressor delta");
    expect(text).toContain("selectAggressionResponse");
    expect(text).toContain("selectAbsorptionAnatomyView");
    expect(text).toContain("selectRegime");
    expect(text).toContain("selectContinuationHealth");
  });

  it("PRINTS ONE EFFICIENCY, NEVER THE RECIPROCAL", () => {
    // selectAggressionResponse.ts:105-108 — the two ratios "must never be
    // printed under the same label". Both owners are on this screen.
    const text = visibleText(render(FULL));
    expect(text).toContain("0.63×");
    expect(text).not.toContain("7.4");
  });

  it("renders an empty room without throwing and without faking a step", () => {
    const out = render();
    expect(out).toContain('data-read="0"');
    expect(out).toContain('data-unread="7"');
    expect(visibleText(out)).toContain("None of the 7 steps");
  });
});

describe("Asset 12 · the scaffolding removal path, as rendered", () => {
  it("offers all three levels and lands on the fullest one", () => {
    // A reader who has never seen the worksheet must not arrive at a
    // compressed view of it. `SCAFFOLD_LEVELS[0]` owns that decision; this
    // asserts the renderer honours it rather than defaulting on its own.
    const out = render(FULL);
    expect(out).toContain('data-scaffold="FOUNDATION"');
    for (const level of SCAFFOLD_LEVELS) {
      expect(out, `${level} has no door`).toContain(`data-level="${level}"`);
    }
    expect(visibleText(out)).toContain("FROM DEPENDENCE TO DISCRETION".toLowerCase());
  });

  it("draws every step at the default level and withholds none", () => {
    const out = render(FULL);
    expect(out).toContain('data-shown="7"');
    expect(out).toContain('data-withheld="0"');
  });

  it("publishes the evidence counts off the SOURCE worksheet, not the level", () => {
    // THE AUDIT ATTRIBUTE. `data-read` / `data-unread` must be the worksheet's
    // own counts at every level — if a future edit sources them from the
    // scaffolded view instead, a compressed level would start reporting a
    // smaller evidence debt than the reading actually carries.
    const src = readFileSync(
      join(process.cwd(), "src/components/experience/DivisionWorksheetView.tsx"),
      "utf8",
    );
    expect(src).toContain("data-read={vm.readCount}");
    expect(src).toContain("data-unread={vm.unreadCount}");
    expect(src, "the counts must not be recomputed from the compressed view").not.toContain(
      "data-read={scaffolded.readCount}",
    );
  });

  it("states what the level stopped printing, on the surface", () => {
    const text = visibleText(render(FULL));
    expect(text).toContain("All 7 steps are drawn in full");
  });

  it("prints no percentage and no hue-graded verdict from the Asset 12 mockup", () => {
    // The mockup's ADVANCED panel carries `EFFICIENCY RATIO 62%` over a
    // red/green pressure diagram and the verdict `MODERATE DEFENSIVE SETUP`.
    // None has an owner in this repo.
    const text = visibleText(render(FULL));
    expect(text).not.toContain("62%");
    expect(text.toLowerCase()).not.toContain("defensive setup");
  });
});
