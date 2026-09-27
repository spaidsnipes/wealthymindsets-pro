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

describe("G16 §20 · bar-built level chips wear EST on the glass, never on a candle", () => {
  it("Session / Fixed WM VP level names route through profileLevelTag(…, snap.quality) and the pair placer", () => {
    expect(CHART).toContain("const nameTxt = profileLevelTag(tag, snap.quality);");
    expect(CHART).toContain("ctx.fillText(nameTxt, nameRect.x + 3");
    expect(CHART).toContain("const edgeTxt = `${profileLevelTag(tag, snap.quality)} ");
  });

  it("Profile Memory's S-n chips say EST and are withheld, not printed, when no clear row exists", () => {
    expect(CHART).toContain("const text = `S-${l.sessionsAgo} ${profileLevelTag(l.kind, mem.quality)} ");
    expect(CHART).toMatch(/recordKeepOut\(keepOutLedger, spotM\);[\s\S]{0,300}if \(spotM\.onCandles\) \{ memChipsWithheld\+\+; continue; \}/);
  });
});

describe("G16 §20 · no bare VP price on a candle; withheld chips hold no row", () => {
  const VP_LEVEL = CHART.slice(CHART.indexOf("const nameTxt = profileLevelTag(tag, snap.quality);"), CHART.indexOf("vpLevel(pocPrice, vpPocRgba, \"POC\");"));
  const MEMORY = CHART.slice(CHART.indexOf("const labelYs: number[] = [];"), CHART.indexOf("delete ds.profileMemoryChipsWithheld;") + 40);

  it("a Session / Fixed level pair with no clear row withholds its gold chip (the rule already drew) and counts it", () => {
    expect(VP_LEVEL).toMatch(/const cr = pair\.chip;[\s\S]{0,900}?if \(pair\.onCandles \|\| !pair\.name\) \{\s*vpChipsWithheld\+\+;\s*vpWordsWithheld\+\+;\s*ctx\.restore\(\);\s*return;\s*\}/);
    // The withhold comes before any chip is reserved, counted or painted.
    const withheld = VP_LEVEL.indexOf("if (pair.onCandles || !pair.name) {");
    expect(withheld).toBeGreaterThan(-1);
    expect(VP_LEVEL.indexOf("forceChips.push({ ...cr });")).toBeGreaterThan(withheld);
    expect(VP_LEVEL.indexOf("vpChipsPlaced++;")).toBeGreaterThan(withheld);
    expect(VP_LEVEL.indexOf("ctx.fillRect(cr.x, cr.y, cr.w, cr.h);")).toBeGreaterThan(withheld);
    // No faded on-candle chip survives below the withhold.
    expect(VP_LEVEL).not.toMatch(/keepOutBackingAlpha\(pair,/);
    expect(VP_LEVEL.slice(withheld + "if (pair.onCandles || !pair.name) {".length)).not.toContain("pair.onCandles");
    // Off the candles too (round-5): a YIELDED pair has no name, so its chip is
    // withheld — below the withhold the name is always painted, never optional.
    expect(VP_LEVEL.slice(withheld)).not.toMatch(/if \(pair\.name\)|pair\.name \?|else vpWordsWithheld/);
    // Both name paints (halo + fill) carry the EST-bearing tag.
    expect(VP_LEVEL).toContain("ctx.strokeText(nameTxt, nameRect.x + 3, nameRect.y + nameRect.h / 2 + 0.5);");
    expect(VP_LEVEL).toContain("ctx.fillText(nameTxt, nameRect.x + 3, nameRect.y + nameRect.h / 2 + 0.5);");
    // The count is a receipt, written and cleared with its siblings.
    expect(CHART).toContain("ds.vpLevelChipsWithheld = String(vpChipsWithheld);");
    expect(CHART).toMatch(/delete ds\.vpLevelChips; delete ds\.vpWordsWithheld; delete ds\.vpLevelPairsMoved;\s*delete ds\.vpLevelChipsWithheld;/);
    expect(CHART).toContain('"vpLevelChips", "vpLevelChipsWithheld", "vpWordsWithheld"');
  });

  it("Profile Memory reserves a label row only for a chip it actually placed", () => {
    const pushes = MEMORY.split("labelYs.push(y);").length - 1;
    expect(pushes).toBe(1);
    const withheld = MEMORY.indexOf("if (spotM.onCandles) { memChipsWithheld++; continue; }");
    expect(withheld).toBeGreaterThan(-1);
    const push = MEMORY.indexOf("labelYs.push(y);");
    expect(push).toBeGreaterThan(withheld);
    expect(push).toBeLessThan(MEMORY.indexOf("ctx.fillText(text, spotM.rect.x + 4, y);"));
  });

  it("Profile Memory's chip-withheld receipt is written on the drawn path and cleared on the off path", () => {
    expect(MEMORY).toContain("ds.profileMemoryChipsWithheld = String(memChipsWithheld);");
    expect(MEMORY).toMatch(/\} else \{[\s\S]*?delete ds\.profileMemoryChipsWithheld;/);
  });
});
