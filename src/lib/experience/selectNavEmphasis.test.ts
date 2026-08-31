import { describe, it, expect } from "vitest";
import type { ExperienceMode } from "./decisionContextBus";
import { shellEmphasis } from "./shellLayout";
import {
  selectNavEmphasis,
  NAV_EMPHASIS_VERSION,
  TIER3_QUIET_OPACITY,
  TIER3_FULL_OPACITY,
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
