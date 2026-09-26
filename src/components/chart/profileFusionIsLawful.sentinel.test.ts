/**
 * G16 §23 · THE GLASS FUSES ONLY LAWFUL PAIRS AND SAYS WHAT IT DREW.
 *
 * The pure owners (fuseProfiles, profileFusionSources, profileEvidenceWord)
 * are proven by their own tests; this pins that MainChart hands the fuser the
 * parents through the ONE mapping, picks the auto pair lawfully, names a
 * refusal on the glass, captions the derived object, and that the bar-built
 * Composite / Visible Range captions carry CANDLE-EST.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CHART = readFileSync(join(__dirname, "MainChart.tsx"), "utf8");
const FUSED = CHART.slice(CHART.indexOf("H-601 #3 · PROFILE FUSION — the fused OBJECT"), CHART.indexOf("P-110 #10 · TPO — TIME AT PRICE, LEFT EDGE"));

describe("G16 §23 · Profile Fusion on the glass", () => {
  it("every parent reaches the fuser through fusionSourceFor — no inline parent literal that forgets unit or window", () => {
    expect(CHART).toContain("const fusionSourceOf = (sp: StackSpecies): FusionSourceProfile | null => fusionSourceFor(sp, fusionInputs);");
    expect(FUSED).toContain("const source = fusionSourceOf;");
    expect(FUSED).not.toMatch(/species: "(LIVING|COMPOSITE|VISIBLE_RANGE)"/);
  });

  it("the auto pair is the first lawful pair", () => {
    expect(CHART).toMatch(/const fusionAutoPair: StackSpecies\[\] \| null = layerOnRef\.current\.profileFusion === true && stackOrder\.length >= 2\s*\? pickLawfulFusionPair\(stackOrder, fusionSourceOf\)/);
  });

  it("the derived object wears its caption; a refused pair names its reason on the glass", () => {
    expect(FUSED).toContain("quietWords(fusedCaption(f),");
    expect(FUSED).toContain("ds.profileFusionEvidence = f.evidence;");
    expect(FUSED).toMatch(/if \(!fr\.ok\) \{[\s\S]*?quietWords\(fusionRefusalCaption\(pair, fr\.reason\)/);
    const at = CHART.indexOf("const PROFILE_GEOMETRY_RECEIPTS");
    const receipts = CHART.slice(at, CHART.indexOf("] as const;", at));
    for (const k of ["profileFusionCaption", "profileFusionEvidence", "profileFusionRefusal"]) expect(receipts).toContain(`"${k}"`);
  });

  it("bar-built Composite and Visible Range say CANDLE-EST", () => {
    expect(CHART).toContain("TODAY EXCLUDED${profileEstWord(cp.quality)}`");
    expect(CHART).toContain("MOVES WITH THE VIEW${profileEstWord(vrpVM.quality)}`");
  });
});
