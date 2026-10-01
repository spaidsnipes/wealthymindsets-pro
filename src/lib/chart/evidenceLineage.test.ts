import { describe, expect, it } from "vitest";

import { PROFILE_FAMILY } from "@/lib/marketData/viewModels/selectProfileMenu";
import { compileEvidenceLineage, evidenceFamilyOfIndicator, evidenceFamilyOfTool } from "./evidenceLineage";

describe("H-301 Evidence Lineage — do not count correlated readings twice (plate 118)", () => {
  it("plate 118: RSI, MACD, MA slope + POC + VWAP + CVD + absorption → 7 observations / 3 families", () => {
    const vm = compileEvidenceLineage({
      indicators: [
        { name: "RSI", cat: "Momentum" }, { name: "MACD", cat: "Momentum" }, { name: "EMA 21", cat: "Trend" },
        { name: "VWAP", cat: "Volume" }, { name: "CVD", cat: "Order Flow" },
      ],
      tools: [{ id: "LIVING_PROFILE", label: "Living Profile" }, { id: "ABSORPTION", label: "Absorption Shelf" }],
    })!;
    expect(vm.summary).toBe("7 observations / 3 independent families");
    expect(vm.warning).toBe("DO NOT COUNT 7");
    expect(vm.families.map(f => f.id)).toEqual(["MOMENTUM", "AUCTION", "PARTICIPATION"]);
    expect(vm.families[1].members).toEqual(["VWAP", "Living Profile"]);
  });

  it("one reading per family is independent — no warning", () => {
    const vm = compileEvidenceLineage({ indicators: [{ name: "RSI", cat: "Momentum" }], tools: [{ id: "TPO_PROFILE", label: "TPO" }] })!;
    expect(vm.warning).toBeNull();
    expect(vm.summary).toBe("2 observations / 2 independent families");
  });

  it("nothing evidential on → no card (lenses read nothing new)", () => {
    expect(compileEvidenceLineage({ indicators: [], tools: [{ id: "QUESTION_LENS", label: "Lens" }, { id: "REGIME_LIGHTING", label: "Regime" }] })).toBeNull();
  });

  it("files volatility bands and VWAP by what they are computed from, not their catalog shelf", () => {
    expect(evidenceFamilyOfIndicator("Bollinger Bands", "Trend")).toBe("VOLATILITY");
    expect(evidenceFamilyOfIndicator("VWAP", "Volume")).toBe("AUCTION");
    expect(evidenceFamilyOfIndicator("OBV", "Momentum")).toBe("PARTICIPATION");
  });

  it("every Tools switch is either an evidence family or a named lens — none silently dropped", () => {
    const LENSES = new Set(["REGIME_LIGHTING", "QUESTION_LENS", "MEMORY_GHOST", "CONTRADICTION", "RISK_ON_PRICE"]);
    for (const id of Object.keys(PROFILE_FAMILY)) {
      if (LENSES.has(id)) expect(evidenceFamilyOfTool(id), id).toBeNull();
      else expect(evidenceFamilyOfTool(id), id).not.toBeNull();
    }
  });
});
