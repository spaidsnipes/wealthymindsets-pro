/**
 * RoomEquipmentLayer — the three depths, rendered.
 *
 * The Sentinel beside this file (`roomAdoptsEquipment.sentinel.test.ts`) asks
 * WHERE the grammar is wired. This file asks WHAT the trader actually sees at
 * each stage, which is a different question and neither one covers the other.
 *
 * THE DEFECT THIS FILE WAS BORN FROM
 * ----------------------------------
 * Measured live on /command-deck: the FULL stage took the whole screen — and
 * therefore took the chart away — while reading "MARKET REALITY · WAIT" over a
 * canvas naming eight unresolved dimensions, with NOTHING on that screen
 * saying it was about NQ1! on a 15m. The subject was legible at every depth
 * except the one where the trader could no longer see it for themselves.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RoomEquipmentLayer } from "./RoomEquipmentLayer";
import type { EquipmentJourney } from "@/lib/workspace/equipmentJourney";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

const vm: MarketCanvasVM = {
  version: "wm.market-canvas.v1",
  verdict: "WAIT",
  clear: false,
  headline: "Right-of-way is withheld — the market has not earned entry.",
  missing: ["Direction is unresolved."],
  resolved: [],
  blockers: ["Regime", "Direction"],
  blockerCount: 11,
  clearances: [],
  invalidators: [],
  hasSnapshot: true,
};

const journey = (stage: EquipmentJourney["stage"]): EquipmentJourney => ({
  stage,
  equipmentId: stage === "closed" ? null : "market-reality",
  decisionId: null,
  // Only FULL carries a place to come back to — invariant 3 of the grammar.
  returnTo: stage === "full" ? { stage: "drawer", scrollY: 1048 } : null,
});

const noop = () => {};

const render = (stage: EquipmentJourney["stage"]) =>
  renderToStaticMarkup(
    <RoomEquipmentLayer
      journey={journey(stage)}
      vm={vm}
      subject={{ symbol: "NQ1!", timeframe: "15m" }}
      onExpand={noop}
      onEnter={noop}
      onReturn={noop}
      onClose={noop}
    />,
  );

describe("RoomEquipmentLayer — the subject survives the depth", () => {
  it("names WHICH market at every stage that renders at all", () => {
    for (const stage of ["preview", "drawer", "full"] as const) {
      const html = render(stage);
      expect(html, `${stage} lost the symbol`).toContain("NQ1!");
      expect(html, `${stage} lost the timeframe`).toContain("15m");
      expect(html, `${stage} did not publish the subject`).toContain(
        'data-testid="equipment-subject"',
      );
    }
  });

  it("names it hardest at FULL — the only stage that takes the chart away", () => {
    // Regression guard with a name: the preview and the drawer sit BESIDE the
    // chart, so a trader who forgets the symbol can glance left. FULL cannot
    // be glanced past. If this assertion is ever the only one left passing,
    // the subject line is still doing the job it was added for.
    expect(render("full")).toContain("NQ1!");
  });

  it("renders nothing at all when closed", () => {
    expect(render("closed")).toBe("");
  });
});

describe("RoomEquipmentLayer — depth is depth, not size", () => {
  it("only FULL uncaps the canvas, and only FULL offers RETURN", () => {
    const full = render("full");
    expect(full).toContain('data-testid="equipment-return"');
    for (const shallow of ["preview", "drawer"] as const) {
      expect(render(shallow), `${shallow} must not offer RETURN`).not.toContain(
        'data-testid="equipment-return"',
      );
    }
  });

  it("the blocker shortfall is disclosed wherever the canvas renders", () => {
    // blockerCount 11 against a 2-entry sample. This is a DATA gap, so it must
    // survive the extra room FULL has — it is not a display choice.
    for (const stage of ["drawer", "full"] as const) {
      expect(render(stage), `${stage} absorbed the blocker shortfall`).toContain(
        "+9 more blocking, not named here",
      );
    }
  });
});
