/**
 * EVERY PAINTING LAYER HAS AN ATTENTION TIER.
 *
 * Before `selectAttentionGovernor`, a layer's alpha was a hand product at
 * each paint site — depth × question quiet × regime light × lane opacity ×
 * fusion fade, multiplied again at every site — and Profile Memory painted at
 * the same weight as the present Composite because nothing said which layers
 * are memory. The governor owns that arithmetic now. This file keeps it the
 * only owner:
 *
 *   (a) every layer the overlay can switch has a row in LAYER_ATTENTION, so a
 *       new layer cannot paint without a tier;
 *   (b) no paint site multiplies the density itself;
 *   (c) the question quiet and the regime light reach alpha only through the
 *       governor;
 *   (d) memory layers paint through the governor, so they sit below the
 *       present, and the receipt is published after the last governed site.
 *
 * Modelled on everyPaintingLayerNamesItsSilence.sentinel.test.ts.
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { LAYER_ATTENTION } from "@/lib/marketData/viewModels/selectAttentionGovernor";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const TIERED = new Set(Object.keys(LAYER_ATTENTION));

/** Every key the overlay reads off `layerOnRef`, plus every key it is born with. */
const READ_KEYS = [...new Set([...CHART.matchAll(/layerOnRef\.current\.([A-Za-z]+)/g)].map(m => m[1]))].sort();
const BORN_KEYS = (() => {
  const m = CHART.match(/const layerOnRef = useRef\(\{([^}]*)\}\)/);
  return m ? [...m[1].matchAll(/([A-Za-z]+)\s*:/g)].map(x => x[1]).sort() : [];
})();
/** Every key a paint site asks the governor for. */
const ASKED = [...CHART.matchAll(/\batt\.alpha\("([A-Za-z]+)"/g)];
const ASKED_KEYS = [...new Set(ASKED.map(m => m[1]))].sort();

describe("every painting layer has an attention tier", () => {
  it("the scans actually found layers (an empty sweep proves nothing)", () => {
    expect(READ_KEYS.length, "no layerOnRef reads found — did the ref move?").toBeGreaterThan(15);
    expect(BORN_KEYS.length, "layerOnRef initializer not found — did it move?").toBeGreaterThan(15);
    expect(ASKED_KEYS.length, "no att.alpha(...) sites found — did the governor call rename?").toBeGreaterThanOrEqual(20);
  });

  it("(a) every layerOnRef key — read or declared — is in LAYER_ATTENTION", () => {
    for (const k of new Set([...READ_KEYS, ...BORN_KEYS])) {
      expect(TIERED.has(k), `layer \`${k}\` paints with no attention tier — add it to LAYER_ATTENTION`).toBe(true);
    }
  });

  it("every key a paint site asks for is a tiered layer", () => {
    for (const k of ASKED_KEYS) expect(TIERED.has(k), `att.alpha("${k}") names no tiered layer`).toBe(true);
  });

  it("(b) no globalAlpha is a hand product of the density any more", () => {
    const alphaWrites = [...CHART.matchAll(/globalAlpha\s*=[^;]*;/g)].map(m => m[0]);
    expect(alphaWrites.length, "no globalAlpha writes found — the scan is blind").toBeGreaterThan(10);
    expect(alphaWrites.filter(w => /semanticDensity\./.test(w))).toEqual([]);
    expect(CHART).not.toMatch(/globalAlpha\s*=[^;]*semanticDensity\./);
    // The density owner is never rewritten by a dimmer after it speaks.
    expect(CHART).not.toMatch(/semanticDensity\s*=\s*\{/);
    // Neither is the lane opacity or the fusion fade multiplied at a site.
    expect(CHART).not.toMatch(/stackOpacity\(/);
    expect(CHART).not.toMatch(/parentFade/);
  });

  it("(c) the question quiet and the regime light reach alpha only through the governor", () => {
    expect(CHART).not.toMatch(/\bmagnetLight\b/);
    expect(CHART).not.toMatch(/\btrendLight\b/);
    expect(CHART).not.toMatch(/questionQuiet\s*\*|\*\s*questionQuiet/);
    const quietReads = CHART.split("\n").filter(l => /\bquestionQuiet\b/.test(l));
    expect(quietReads.length, "questionQuiet not found — the scan is blind").toBeGreaterThan(0);
    for (const l of quietReads) expect(l, "questionQuiet on an alpha line").not.toMatch(/[Aa]lpha\s*=/);
    expect(CHART).toMatch(/att = att\.withQuestionQuiet\(questionQuiet\);/);
    // The regime breaker is read into the governor, before the first governed site.
    const gov = CHART.indexOf("let att = selectAttentionGovernor({");
    expect(gov).toBeGreaterThan(-1);
    expect(CHART.slice(gov, gov + 600)).toMatch(/regimeLight: layerOnRef\.current\.regimeLighting === true \? regimeLightingRef\.current : null,/);
    expect(gov).toBeLessThan(ASKED[0].index ?? -1);
    expect(gov).toBeGreaterThan(CHART.indexOf("semanticDensity = semanticDensityForBarCount(visibleBarCount);"));
  });

  it("(d) memory layers paint through the governor, and the ghost's own ceiling still holds", () => {
    for (const k of ["profileMemory", "sessionGhosts", "valueMigration", "memoryGhost"]) {
      expect(LAYER_ATTENTION[k as keyof typeof LAYER_ATTENTION].tier, k).toBe("MEMORY");
      expect(ASKED_KEYS, `${k} does not ask the governor`).toContain(k);
    }
    expect(CHART).toMatch(/ctx\.globalAlpha = Math\.min\(ghost\.opacity, att\.alpha\("memoryGhost"\)\);/);
    // The session ghosts restore Living's own alpha when they finish.
    const g = CHART.indexOf('ctx.globalAlpha = att.alpha("sessionGhosts");');
    expect(g).toBeGreaterThan(-1);
    expect(CHART.slice(g, g + 4000)).toMatch(/ctx\.globalAlpha = livingAlpha;\s*\} else \{\s*delete ds\.sessionGhosts;/);
  });

  it("the tiers receipt is published after the last governed site", () => {
    // Moved to the frame's end when the SUPPORTING layers (liquidity
    // lifecycle paints last) began asking the governor.
    const receipt = CHART.indexOf("canvas.dataset.attentionTiers = att.tiersReceipt();");
    expect(receipt).toBeGreaterThan(-1);
    const lastAsk = Math.max(...ASKED.map(m => m.index ?? -1));
    expect(receipt).toBeGreaterThan(lastAsk);
    expect(CHART).toMatch(/canvas\.dataset\.attention = att\.receipt;/);
  });

  it("(e) the SUPPORTING layers ask the governor — context sits under the present", () => {
    for (const key of ["expectedEnvelope", "contradiction", "liquidityLifecycle", "anatomyCards"]) {
      expect(CHART, key).toContain(`ctx.globalAlpha = att.alpha("${key}");`);
    }
  });
});
