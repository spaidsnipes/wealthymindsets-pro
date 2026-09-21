import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import OverlayDrawingLedgerBlock from "@/components/chart/OverlayDrawingLedgerBlock";
import {
  selectOverlayDrawingLedger,
  type OverlayDrawingLedgerInput,
} from "@/lib/marketData/viewModels/selectOverlayDrawingLedger";

/**
 * TAGS OFF. An assertion that passes on an `aria-label` or a `data-` attribute
 * is exactly the defect this block was built to close — the state of these
 * layers ALREADY existed in `data-` attributes on the canvas, readable by a
 * probe and invisible to the trader. A test allowed to read attributes would
 * have passed against the broken product.
 */
const visible = (html: string) => html.replace(/<[^>]*>/g, " ");

function markup(input: OverlayDrawingLedgerInput): string {
  return renderToStaticMarkup(
    <OverlayDrawingLedgerBlock vm={selectOverlayDrawingLedger(input)} />,
  );
}

const ALL_ON_NOTHING_MEASURED: OverlayDrawingLedgerInput = {
  valueCandleOn: true,
  valueCandle: null,
  imbalanceStackOn: true,
  imbalanceStack: null,
  deltaDivergenceOn: true,
  deltaDivergence: null,
  liquidityWeatherOn: true,
  liquidityWeather: null,
};

describe("OverlayDrawingLedgerBlock", () => {
  it("puts every layer's state in READABLE TEXT, not only in attributes", () => {
    const text = visible(markup(ALL_ON_NOTHING_MEASURED));

    for (const label of [
      "Value Candle",
      "Imbalance Stack",
      "Delta Divergence",
      "Liquidity Weather",
    ]) {
      expect(text, `${label} is not on the glass`).toContain(label);
    }
    expect(text).toContain("NOTHING YET");
  });

  it("carries each layer's reason sentence on the glass", () => {
    const vm = selectOverlayDrawingLedger(ALL_ON_NOTHING_MEASURED);
    const text = visible(markup(ALL_ON_NOTHING_MEASURED));
    for (const row of vm.rows) {
      expect(text, `${row.id} rendered a state word with no reason`)
        .toContain(row.detail);
    }
  });

  it("distinguishes a layer the trader switched off from one with nothing to say", () => {
    const text = visible(markup({ ...ALL_ON_NOTHING_MEASURED, valueCandleOn: false }));
    expect(text).toContain("OFF");
    expect(text).toContain("NOTHING YET");
    // Both states must be present at once, or the block cannot be telling them
    // apart — which is the only reason it exists.
    expect(text).toMatch(/OFF[\s\S]*NOTHING YET|NOTHING YET[\s\S]*OFF/);
  });

  it("names what the list does not cover — ALL of it, on the glass", () => {
    const text = visible(markup(ALL_ON_NOTHING_MEASURED));
    expect(text, "the absorption field is not named as out of scope").toMatch(/absorption/i);
    expect(text, "the big-trade bubbles are switchable on this chart and the " +
      "block no longer tells the trader they are outside this list")
      .toMatch(/big[- ]trade/i);
  });

  it("does not grade drawing-ness in hue — Build Order §9", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/chart/OverlayDrawingLedgerBlock.tsx"),
      "utf8",
    );
    // A ramp would need more than the three fixed state colours. Green/red for
    // "drawing / not drawing" is the exact thing §9 forbids.
    expect(source).not.toMatch(/#00[Dd]4|rgba\(0,\s*212/);
    expect(source).not.toMatch(/text-wm-green|text-wm-red/);
  });
});

describe("the ledger reaches the trader through the Smart Money door", () => {
  const panel = readFileSync(
    resolve(process.cwd(), "src/components/smart-money/SmartMoneyPanel.tsx"),
    "utf8",
  );
  const dashboard = readFileSync(
    resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
    "utf8",
  );

  it("is rendered by the panel, not left as an unused component", () => {
    expect(panel).toContain("<OverlayDrawingLedgerBlock");
  });

  it("is COMPILED BY THE ROOM and handed down — never re-derived in the panel", () => {
    expect(dashboard, "the room no longer compiles the ledger")
      .toMatch(/selectOverlayDrawingLedger\(/);
    expect(dashboard, "the panel is not being handed the ledger")
      .toMatch(/layerLedger=\{overlayDrawingLedger\}/);
    // Two compilers for one set of pixels is Canon Weakness #1 word for word.
    expect(panel, "the panel compiled its own ledger — two owners, one pixel")
      .not.toMatch(/selectOverlayDrawingLedger\(/);
  });

  it("reads the trader's real switches, not a hard-coded set of trues", () => {
    const region = dashboard.slice(
      dashboard.indexOf("const overlayDrawingLedger"),
      dashboard.indexOf("const chartOrderFlowStanding"),
    );
    expect(region.length).toBeGreaterThan(0);
    for (const flag of [
      "valueCandleOn",
      "imbalanceStackOn",
      "deltaDivergenceOn",
      "liquidityWeatherOn",
    ]) {
      expect(region, `${flag} is not being read — OFF could not be reported`)
        .toContain(flag);
    }
    expect(region, "a switch was hard-coded on").not.toMatch(/On:\s*true/);
  });
});
