/**
 * GARDEN 19 REPRODUCTIONS (Codex 01a1426c, 2026-10-16) — written against the
 * pre-fix tree first, where both went red:
 *
 *   B2 "Fusion refusing profiles with mismatched volume units" while the menu
 *      read "available": the dashboard's species map carried no fusion entry,
 *      so an ON Profile Fusion whose only pair was Living(tape prints) +
 *      Composite(bar volume) read READY.
 *   B3 "Risk on Price reporting that no position bracket was drawn" — same
 *      shape: ON with no position drawn read READY.
 *
 * The fixed contract: the row is NEEDS_YOUR_STEP and names the step, the
 * active-tools list says the step (never "ON" alone), and the preview's
 * verdict is NEEDS YOUR INPUT.
 */
import { describe, expect, it } from "vitest";
import * as menu from "./selectProfileMenu";
import { fuseProfiles } from "./fuseProfiles";
import { fusionSourceFor } from "./profileFusionSources";
import { selectRiskOnPrice } from "./selectRiskOnPrice";
import { activeToolWords } from "@/lib/workspace/activeTools";

const rows = (base: number) => [{ price: base, volume: 10 }, { price: base + 1, volume: 30 }, { price: base + 2, volume: 5 }];

/** What the dashboard hands the menu: data refusals + (after the fix) the trader's steps. */
function dashboardSpeciesMap(x: { fusionOn: boolean; fusionRefusal: string | null; riskOn: boolean; riskReason: string | null }) {
  const data = menu.profileSpeciesRefusals({});
  const steps = (menu as unknown as { profileSpeciesSteps?: typeof menu.profileSpeciesSteps }).profileSpeciesSteps;
  return {
    ...data,
    ...(steps ? steps({ fusion: { on: x.fusionOn, refusal: x.fusionRefusal, fused: false }, riskOnPrice: { on: x.riskOn, reason: x.riskReason } }) : {}),
  };
}

describe("B2 · Fusion refused on volume units is not 'available'", () => {
  it("Living from the tape + Composite is refused UNIT_MISMATCH by the fuser", () => {
    const inputs = {
      instrument: "NQ1!", firstBarTime: 1000, lastBarTime: 9000,
      living: { drawn: true, bars: rows(100), poc: 101, estimated: false },
      composite: { drawn: true, rows: rows(100), poc: 101, asOf: 5000, sessionStarts: [1000] },
      visibleRange: null,
    };
    const r = fuseProfiles(fusionSourceFor("LIVING", inputs), fusionSourceFor("COMPOSITE", inputs));
    expect(r).toEqual({ ok: false, reason: "UNIT_MISMATCH" });
  });
  it("the menu row names the step instead of reading READY", () => {
    const vm = menu.selectProfileMenu({
      barsPresent: true, printsPresent: true, observedAggressorFlow: true,
      active: { PROFILE_FUSION: true },
      speciesRefusal: dashboardSpeciesMap({ fusionOn: true, fusionRefusal: "UNIT_MISMATCH", riskOn: false, riskReason: null }),
    });
    const row = vm.entries.find(e => e.id === "PROFILE_FUSION")!;
    expect(row.availability).not.toBe("READY");
    expect(row.availability).toBe("NEEDS_YOUR_STEP");
    expect(row.availabilityNote).toMatch(/Composite with Visible Range/);
    expect(activeToolWords(row, "NO EVENT").words).toMatch(/your step: fuse two bar-volume profiles/);
  });
});

describe("B3 · Risk on Price with nothing bracketed is not 'available'", () => {
  it("no position drawn → NO_POSITION_DRAWN", () => {
    expect(selectRiskOnPrice([], [], 100).reason).toBe("NO_POSITION_DRAWN");
  });
  it("the menu row names the step instead of reading READY", () => {
    const vm = menu.selectProfileMenu({
      barsPresent: true, printsPresent: true, observedAggressorFlow: true,
      active: { RISK_ON_PRICE: true },
      speciesRefusal: dashboardSpeciesMap({ fusionOn: false, fusionRefusal: null, riskOn: true, riskReason: "NO_POSITION_DRAWN" }),
    });
    const row = vm.entries.find(e => e.id === "RISK_ON_PRICE")!;
    expect(row.availability).toBe("NEEDS_YOUR_STEP");
    expect(row.stateWords).toBe("draw a Long / Short Position");
    expect(vm.silentSummary).toBe("1 silent · needs a step from you");
  });
});

describe("the step owners", () => {
  it("only refusals the trader can cure carry a fusion step; data facts stay data refusals", async () => {
    const { fusionNextStep } = await import("./fuseProfiles");
    for (const r of ["NEEDS_TWO_SOURCES", "UNIT_MISMATCH", "WINDOW_UNKNOWN", "TIME_OVERLAP"]) expect(fusionNextStep(r)?.short.length).toBeGreaterThan(8);
    for (const r of ["INSTRUMENT_MISMATCH", "NO_VOLUME", "NO_OVERLAP"]) expect(fusionNextStep(r)).toBeNull();
    const m = menu.profileSpeciesSteps({ fusion: { on: true, refusal: "NO_OVERLAP", fused: false } });
    expect(typeof m.PROFILE_FUSION).toBe("string");
  });
  it("fusion ON with no pair reported reads 'switch on a second profile'; a fused object owes nothing", () => {
    const none = menu.profileSpeciesSteps({ fusion: { on: true, refusal: null, fused: false } });
    expect((none.PROFILE_FUSION as menu.SpeciesStep).words).toBe("switch on a second profile");
    expect(menu.profileSpeciesSteps({ fusion: { on: true, refusal: null, fused: true } }).PROFILE_FUSION).toBeUndefined();
    expect(menu.profileSpeciesSteps({ fusion: { on: false, refusal: "UNIT_MISMATCH", fused: false } }).PROFILE_FUSION).toBeUndefined();
  });
  it("every unbracketed risk reason has a step; BRACKETED and OFF owe nothing", async () => {
    const { riskNextStep } = await import("./selectRiskOnPrice");
    for (const r of ["NO_POSITION_DRAWN", "NO_STOP_ON_DRAWING", "STOP_ON_WRONG_SIDE"] as const) expect(riskNextStep(r)?.full.length).toBeGreaterThan(20);
    expect(riskNextStep("BRACKETED")).toBeNull();
    expect(menu.profileSpeciesSteps({ riskOnPrice: { on: false, reason: "NO_POSITION_DRAWN" } }).RISK_ON_PRICE).toBeUndefined();
    expect(menu.profileSpeciesSteps({ riskOnPrice: { on: true, reason: "BRACKETED" } }).RISK_ON_PRICE).toBeUndefined();
  });
  it("the preview verdict is NEEDS YOUR INPUT", async () => {
    const { educationTruthLines } = await import("@/lib/chart/inventionEducation");
    const vm = menu.selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: { RISK_ON_PRICE: true },
      speciesRefusal: menu.profileSpeciesSteps({ riskOnPrice: { on: true, reason: "NO_STOP_ON_DRAWING" } }) });
    const entry = vm.entries.find(e => e.id === "RISK_ON_PRICE")!;
    expect(educationTruthLines({ entry } as never).verdict).toBe("NEEDS YOUR INPUT");
  });
});
