import { describe, expect, it } from "vitest";
import { facetValueLabel } from "./FvgStudyPanel";

describe("FVG study filter labels speak trader words; keys stay the values (2026-10-07)", () => {
  it("session and regime keys are translated", () => {
    expect(facetValueLabel("session", "GLOBEX_DAY")).toBe("CME Globex day (18:00–17:00 ET)");
    expect(facetValueLabel("regime", "UNTAGGED")).toBe("Not tagged (no tape on these bars)");
  });
  it("an unknown key is shown as itself, never hidden", () => {
    expect(facetValueLabel("session", "SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
