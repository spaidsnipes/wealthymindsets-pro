/**
 * GARDEN 19 §12 OPACITY LAW — BUILT LAYERS RECEDE THROUGH THE GOVERNOR.
 *
 * The certificate audit (2026-10-08, gap #3) found built layers that painted
 * at a hand-set weight and so never receded with a selection, a stale feed or
 * the room's posture. Each now has a LAYER_ATTENTION row and asks the
 * governor at its paint block. Price-adjacent treatments (keels on the close
 * edge, the current launched from the wick) keep PRICE_ADJACENT_FLOOR; the
 * Clarity Candle IS the candle and stays sovereign (no row).
 *
 * A breadcrumb, not a renderer. It reads source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { LAYER_ATTENTION, PRICE_ADJACENT_FLOOR, TEXT_ALPHA_FLOOR } from "@/lib/marketData/viewModels/selectAttentionGovernor";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("§12 — built layers recede through the attention governor", () => {
  it("each has its tier", () => {
    expect(LAYER_ATTENTION.flowCurrent.tier).toBe("LIVE");
    expect(LAYER_ATTENTION.volumeProfile.tier).toBe("LIVE");
    for (const k of ["volumeField", "sessionBands", "wisdomLine", "forceResponse"] as const) {
      expect(LAYER_ATTENTION[k].tier, k).toBe("SUPPORTING");
    }
    expect("clarityCandle" in LAYER_ATTENTION, "price stays sovereign — the Clarity Candle IS the candle").toBe(false);
  });

  it("each paint block asks the governor", () => {
    for (const needle of [
      'if (att.paints("sessionBands")) ctx.globalAlpha = att.alpha("sessionBands");',
      'const sbSpeaks = att.speaks("sessionBands");',
      'if (att.paints("volumeField")) ctx.globalAlpha = att.alpha("volumeField");',
      'if (att.paints("volumeField")) ctx.globalAlpha = Math.max(PRICE_ADJACENT_FLOOR, att.alpha("volumeField"));',
      'ctx.globalAlpha = Math.min(ctx.globalAlpha, Math.max(PRICE_ADJACENT_FLOOR, att.alpha("flowCurrent")));',
      'if (ctx) ctx.globalAlpha = att.alpha("volumeProfile");',
      'ctx.globalAlpha = att.alpha("forceResponse", { selectedItem: true });',
      'ctx.globalAlpha = att.textAlpha("wisdomLine", wlSel);',
      'else if (!att.paints("wisdomLine")) { canvas.dataset.crossCandleWisdom = att.offWord(true);',
    ]) expect(CHART, needle).toContain(needle);
    // Both volume-field sites without the floor (RVOL tone, Effort → Response columns).
    expect(CHART.split('if (att.paints("volumeField")) ctx.globalAlpha = att.alpha("volumeField");').length - 1).toBe(2);
  });

  it("price-adjacent treatments never recede below legibility", () => {
    expect(PRICE_ADJACENT_FLOOR).toBeGreaterThanOrEqual(TEXT_ALPHA_FLOOR);
  });
});

describe("keel ATR fallback + session rails (2026-10-08)", () => {
  it("a keel walks its ATR in-frame after KEEL_ATR_WAIT_FRAMES frames waiting for the off-frame task", () => {
    expect(CHART).toContain("const KEEL_ATR_WAIT_FRAMES = 2;");
    expect(CHART).toContain("canvas.dataset.barDeltaKeelsAtr = `IN_FRAME:AFTER${KEEL_ATR_WAIT_FRAMES}`;");
    // WARMING stays honest while it waits.
    expect(CHART).toContain('if (!atrReadyDK) canvas.dataset.barDeltaKeels = "WARMING:ATR";');
  });
  it("the empty session rails are legible and quieter than a session strip", () => {
    const m = CHART.match(/const SESSION_RAIL_INK = ([0-9.]+);/);
    expect(m).not.toBeNull();
    const ink = Number(m![1]);
    expect(ink).toBeGreaterThanOrEqual(0.2);
    expect(ink).toBeLessThan(0.42);
  });
});
