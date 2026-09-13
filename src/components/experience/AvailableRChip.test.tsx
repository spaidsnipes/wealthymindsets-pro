import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AvailableRChip, {
  formatAvailableRLabel,
  selectAvailableRDetail,
} from "./AvailableRChip";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";

/**
 * Ticket T RISK-pixel guard.
 *
 * The deck ALREADY had `chainVm.availableR` for months — inside a `<details>`
 * drawer collapsed by default. The Founder asked for VISIBLE RISK pixels;
 * "one click away" doesn't count. This suite fences:
 *
 *   1. formatting is honest (UNKNOWN is a word, PARTIAL is qualified)
 *   2. detail names the missing input rather than opaque prose
 *   3. the deck actually mounts the chip in its primary viewport,
 *      not inside a details drawer
 */

const RESOLVED: AvailableRVM = {
  resolution: "RESOLVED",
  conservativeR: 1.83,
  optimisticR: 2.7,
  riskPerUnit: 1.20,
  costDragR: 0.05,
  destination: null,
  missingInputs: [],
  warnings: [],
};

const PARTIAL: AvailableRVM = {
  ...RESOLVED,
  resolution: "PARTIAL",
  conservativeR: 1.2,
};

const UNKNOWN_MISSING_STOP: AvailableRVM = {
  resolution: "UNKNOWN",
  conservativeR: "UNKNOWN",
  optimisticR: "UNKNOWN",
  riskPerUnit: "UNKNOWN",
  costDragR: "UNKNOWN",
  destination: null,
  missingInputs: ["structural stop"],
  reason: "cannot compute risk-per-unit",
  warnings: [],
};

describe("formatAvailableRLabel", () => {
  it("rounds a resolved conservative R to one decimal + 'R'", () => {
    expect(formatAvailableRLabel(RESOLVED)).toBe("1.8R");
  });

  it("qualifies a PARTIAL as such — the number alone would misread as full", () => {
    // A PARTIAL 1.2R has stood-in inputs; hiding that behind a bare "1.2R"
    // would let a trader size off it as if every leg were measured.
    expect(formatAvailableRLabel(PARTIAL)).toBe("1.2R · partial");
  });

  it("says UNKNOWN out loud when unresolved, and when the VM is null", () => {
    expect(formatAvailableRLabel(UNKNOWN_MISSING_STOP)).toBe("UNKNOWN");
    expect(formatAvailableRLabel(null)).toBe("UNKNOWN");
  });
});

describe("selectAvailableRDetail", () => {
  it("prefers a missing-input name over opaque prose", () => {
    // "Missing: structural stop" tells the trader what to place; "cannot
    // compute risk-per-unit" tells the trader nothing they can act on.
    expect(selectAvailableRDetail(UNKNOWN_MISSING_STOP)).toBe("Missing: structural stop.");
  });

  it("falls back to the reason string when no inputs are named", () => {
    const vm: AvailableRVM = { ...UNKNOWN_MISSING_STOP, missingInputs: [], reason: "session closed" };
    expect(selectAvailableRDetail(vm)).toBe("session closed");
  });

  it("names PARTIAL as partial when everything computed but stood in for something", () => {
    expect(selectAvailableRDetail(PARTIAL)).toContain("Partial");
  });
});

describe("AvailableRChip render", () => {
  it("renders the label and the detail — both visible without a drawer", () => {
    const html = renderToStaticMarkup(<AvailableRChip vm={RESOLVED} />);
    expect(html).toContain(">Available R<");
    expect(html).toContain("1.8R");
    expect(html).toContain('data-testid="available-r-chip"');
  });

  it("stays honest when the VM is null — never a stand-in number", () => {
    const html = renderToStaticMarkup(<AvailableRChip vm={null} />);
    expect(html).toContain("UNKNOWN");
    expect(html).not.toMatch(/\b0\.0R\b/);
  });

  it("aria-label includes both the label and the detail for screen readers", () => {
    const html = renderToStaticMarkup(<AvailableRChip vm={UNKNOWN_MISSING_STOP} />);
    expect(html).toContain('aria-label="Available R: UNKNOWN. Missing: structural stop."');
  });
});

describe("the deck actually hoists the RISK pixel out of the deep-read drawer", () => {
  it("command-deck imports and renders AvailableRChip", () => {
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(src).toContain('import AvailableRChip from "@/components/experience/AvailableRChip";');
    expect(src).toContain("<AvailableRChip vm={chainVm?.availableR ?? null}");
  });

  it("the chip sits BEFORE the DeckMarketChart (primary viewport, not a drawer)", () => {
    // Order matters: RISK is above the chart, not tucked below a details
    // toggle. If a future refactor pushes it into the deep-read drawer this
    // test goes red before the visible-RISK requirement regresses.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    const chipIdx = src.indexOf("<AvailableRChip");
    const chartIdx = src.indexOf("<DeckMarketChart");
    const deepIdx = src.indexOf('<details open={deckEmphasis.deepSectionsOpen}');
    expect(chipIdx, "AvailableRChip is not on the deck").toBeGreaterThan(0);
    expect(chartIdx, "DeckMarketChart is not on the deck").toBeGreaterThan(chipIdx);
    expect(chipIdx, "AvailableRChip must be OUTSIDE the deep-read drawer").toBeLessThan(deepIdx);
  });
});
