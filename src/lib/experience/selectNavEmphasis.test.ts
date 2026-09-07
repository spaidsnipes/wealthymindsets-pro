import { describe, it, expect } from "vitest";
import type { ExperienceMode } from "./decisionContextBus";
import { shellEmphasis } from "./shellLayout";
import {
  selectNavEmphasis,
  NAV_EMPHASIS_VERSION,
  TIER3_QUIET_OPACITY,
  TIER3_FULL_OPACITY,
  type NavCandidate,
} from "./selectNavEmphasis";

const ALL_MODES: readonly ExperienceMode[] = [
  "PREP",
  "OBSERVE",
  "WAIT",
  "EXECUTE",
  "MANAGE",
  "REVIEW",
  "LEARN",
];

const LIVE_MODES: readonly ExperienceMode[] = ["OBSERVE", "WAIT", "EXECUTE", "MANAGE"];
const REFLECTION_MODES: readonly ExperienceMode[] = ["PREP", "REVIEW", "LEARN"];

describe("selectNavEmphasis", () => {
  it("is total over every ExperienceMode and stamps the version", () => {
    for (const mode of ALL_MODES) {
      const nav = selectNavEmphasis(mode);
      expect(nav.version).toBe(NAV_EMPHASIS_VERSION);
      expect(nav.mode).toBe(mode);
    }
  });

  it("quiets Tier 3 in every live-market job (right-of-way for the trade)", () => {
    for (const mode of LIVE_MODES) {
      const nav = selectNavEmphasis(mode);
      expect(nav.liveFocus).toBe(true);
      expect(nav.tier3Quieted).toBe(true);
      expect(nav.tier3Opacity).toBe(TIER3_QUIET_OPACITY);
    }
  });

  it("restores full Tier 3 visibility in every reflection / safe-to-leave job", () => {
    for (const mode of REFLECTION_MODES) {
      const nav = selectNavEmphasis(mode);
      expect(nav.liveFocus).toBe(false);
      expect(nav.tier3Quieted).toBe(false);
      expect(nav.tier3Opacity).toBe(TIER3_FULL_OPACITY);
    }
  });

  it("never fully hides Tier 3 — the quiet opacity stays legible and clickable", () => {
    // Founder law: FOCUS THE PRODUCT; DO NOT ISOLATE THE PRODUCT.
    expect(TIER3_QUIET_OPACITY).toBeGreaterThan(0);
    for (const mode of ALL_MODES) {
      expect(selectNavEmphasis(mode).tier3Opacity).toBeGreaterThan(0);
      expect(selectNavEmphasis(mode).tier3Opacity).toBeLessThanOrEqual(1);
    }
  });

  it("keeps Tier 1 at full strength in every mode (live-decision block always leads)", () => {
    for (const mode of ALL_MODES) {
      expect(selectNavEmphasis(mode).tier1Opacity).toBe(1);
    }
  });

  it("never disagrees with the canon liveFocus source of truth", () => {
    for (const mode of ALL_MODES) {
      expect(selectNavEmphasis(mode).liveFocus).toBe(shellEmphasis(mode).liveFocus);
    }
  });

  it("emits an honest, mode-appropriate rationale", () => {
    expect(selectNavEmphasis("EXECUTE").rationale).toMatch(/quieted, not removed/);
    expect(selectNavEmphasis("REVIEW").rationale).toMatch(/full visibility/);
  });

  it("is deterministic — repeated calls return equal values", () => {
    for (const mode of ALL_MODES) {
      expect(selectNavEmphasis(mode)).toEqual(selectNavEmphasis(mode));
    }
  });
});

/**
 * v2 — THE CAPITAL COLUMN.
 *
 * "THE MOMENT CAPITAL IS LIVE, WM SHOULD REDUCE NAVIGATION."
 *
 * v1 of this selector was written, tested eight ways, and imported by nothing.
 * The tests below are the half that could not be written before, because they
 * are about a fact (exposure) that v1 had no input for — it was reasoning
 * entirely from `mode`, which is a preference the human clicks.
 *
 * The distinction is the point. Two of these tests exist ONLY to prove that a
 * preference can never produce a reduction and can never suppress one.
 */
const RAIL: readonly NavCandidate[] = [
  { href: "/morning-prep", label: "Morning Prep", tier: 1 },
  { href: "/command-deck", label: "Command Deck", tier: 1 },
  { href: "/charts",       label: "Charts",       tier: 1 },
  { href: "/education",    label: "Academy",      tier: 2 },
  { href: "/journal",      label: "Journal",      tier: 2 },
];

describe("selectNavEmphasis v2 — capital, not preference, decides admission", () => {
  it("withholds the strengthening tools from the rail while capital is at risk", () => {
    const nav = selectNavEmphasis("MANAGE", "AT_RISK", RAIL);
    expect([...nav.railWithheld].sort()).toEqual(["/education", "/journal"]);
  });

  it("NEVER withholds a Tier 1 live-decision surface, in any mode", () => {
    // §9 phone law: the exit path may not be blocked by anything. A trader
    // with an open position needs the decision surfaces MORE, not less, so a
    // "reduction" that took them away would be the opposite of the canon.
    for (const mode of ALL_MODES) {
      const withheld = selectNavEmphasis(mode, "AT_RISK", RAIL).railWithheld;
      for (const item of RAIL.filter(i => i.tier === 1)) {
        expect(`${mode} withholds ${item.href}: ${withheld.includes(item.href)}`)
          .toBe(`${mode} withholds ${item.href}: false`);
      }
    }
  });

  it("withholds NOTHING when no exposure was observed", () => {
    const nav = selectNavEmphasis("MANAGE", "NO_EXPOSURE_OBSERVED", RAIL);
    expect(nav.railWithheld).toEqual([]);
    expect(nav.reductionNote).toBeNull();
  });

  it("withholds NOTHING when capital is UNOBSERVED — absence is not a finding", () => {
    /**
     * §14.1: FLAT is a FINDING, never a default. UNOBSERVED means no route on
     * screen owns a book. The selector must neither reduce (which would imply
     * exposure it cannot see) nor announce safety (which would imply an
     * all-clear nobody computed). Doing nothing is the only honest answer, and
     * it is the answer on every route in the product that has no broker panel.
     */
    const nav = selectNavEmphasis("MANAGE", "UNOBSERVED", RAIL);
    expect(nav.railWithheld).toEqual([]);
    expect(nav.reductionNote).toBeNull();
    expect(nav.capital).toBe("UNOBSERVED");
  });

  it("defaults to UNOBSERVED — a v1 caller cannot accidentally assert safety", () => {
    expect(selectNavEmphasis("EXECUTE").capital).toBe("UNOBSERVED");
    expect(selectNavEmphasis("EXECUTE").railWithheld).toEqual([]);
  });

  it("a MODE cannot cause a reduction on its own", () => {
    // EXECUTE and MANAGE are the two loudest-sounding modes. Neither is
    // evidence of exposure — a human can click into MANAGE with a flat book.
    for (const mode of ALL_MODES) {
      expect(selectNavEmphasis(mode, "NO_EXPOSURE_OBSERVED", RAIL).railWithheld).toEqual([]);
      expect(selectNavEmphasis(mode, "UNOBSERVED", RAIL).railWithheld).toEqual([]);
    }
  });

  it("a MODE cannot SUPPRESS a reduction either", () => {
    // The dangerous direction. If quiet modes cleared the reduction, a trader
    // could dismiss a live-capital state by clicking the LEARN tab — the
    // interface obeying a wish instead of the book.
    for (const mode of ALL_MODES) {
      const withheld = selectNavEmphasis(mode, "AT_RISK", RAIL).railWithheld;
      expect(`${mode}: ${withheld.length}`).toBe(`${mode}: 2`);
    }
  });

  it("never withholds a surface without a word explaining it", () => {
    // §9's colour clauses all end "…and a word". A destination that vanishes
    // in silence is a worse version of the same failure: the trader cannot
    // tell whether the product is protecting them or broken.
    for (const mode of ALL_MODES) {
      for (const capital of ["AT_RISK", "NO_EXPOSURE_OBSERVED", "UNOBSERVED"] as const) {
        const nav = selectNavEmphasis(mode, capital, RAIL);
        expect(`${mode}/${capital}: note=${nav.reductionNote !== null} withheld=${nav.railWithheld.length > 0}`)
          .toBe(`${mode}/${capital}: note=${nav.railWithheld.length > 0} withheld=${nav.railWithheld.length > 0}`);
      }
    }
  });

  it("the note says WHERE they went, not just that they left", () => {
    const note = selectNavEmphasis("MANAGE", "AT_RISK", RAIL).reductionNote ?? "";
    expect(note).toMatch(/Workspace/);
    expect(note).toMatch(/one click away/);
    // No alarm vocabulary: this is a calm reduction, not a warning. §9 —
    // a failure may reduce capability, it may not increase certainty, and
    // nothing here has failed.
    expect(note).not.toMatch(/WARNING|DANGER|ALERT/i);
  });

  it("withholds nothing when the caller passes no rail at all", () => {
    // Emphasis-only callers (tooltips, tests, the mode bar) must not be
    // forced to know about admission.
    expect(selectNavEmphasis("MANAGE", "AT_RISK").railWithheld).toEqual([]);
    expect(selectNavEmphasis("MANAGE", "AT_RISK").reductionNote).toBeNull();
  });

  it("keeps EMPHASIS on mode and ADMISSION on capital — the two never cross", () => {
    /**
     * The structural claim of v2. tier3Opacity is a function of mode ALONE;
     * railWithheld is a function of capital ALONE. If a future edit routed
     * either through the other, this fails.
     */
    for (const mode of ALL_MODES) {
      const opacities = new Set(
        (["AT_RISK", "NO_EXPOSURE_OBSERVED", "UNOBSERVED"] as const)
          .map(c => selectNavEmphasis(mode, c, RAIL).tier3Opacity),
      );
      expect(`${mode} opacity varies with capital: ${opacities.size > 1}`)
        .toBe(`${mode} opacity varies with capital: false`);
    }
    const withheldByMode = new Set(
      ALL_MODES.map(m => selectNavEmphasis(m, "AT_RISK", RAIL).railWithheld.join(",")),
    );
    expect(withheldByMode.size).toBe(1);
  });

  it("still stamps the version, now v2", () => {
    expect(NAV_EMPHASIS_VERSION).toBe("wm.nav-emphasis.v2");
    expect(selectNavEmphasis("MANAGE", "AT_RISK", RAIL).version).toBe(NAV_EMPHASIS_VERSION);
  });

  it("is deterministic across the widened input", () => {
    for (const mode of ALL_MODES) {
      for (const capital of ["AT_RISK", "NO_EXPOSURE_OBSERVED", "UNOBSERVED"] as const) {
        expect(selectNavEmphasis(mode, capital, RAIL))
          .toEqual(selectNavEmphasis(mode, capital, RAIL));
      }
    }
  });
});
