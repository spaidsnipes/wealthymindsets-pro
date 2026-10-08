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

describe("price sovereignty asks from the Sheriff re-run (ASK-8 / ASK-9, 2026-10-08)", () => {
  it("ASK-8: a level name never takes the newest candles' column", () => {
    expect(CHART).toContain("[...keepOut(), ...newestColumnRects(), ...profileCandlesAt(slots.top, slots.bottom)],");
    expect(CHART).toContain("[...keepOut(), ...newestColumnRects(), ...profileCandlesAt(s2.top, s2.bottom)],");
  });
  it("ASK-9: FVG territory cuts round the countdown's own rect plus air", () => {
    expect(CHART).toContain("const boxH  = COUNTDOWN_BOX_H;");
    expect(CHART).toContain("pillCut.rect(0, cyP - COUNTDOWN_BOX_H / 2 - 2 - FVG_PILL_AIR, wP, COUNTDOWN_BOX_H + 4 + 2 * FVG_PILL_AIR);");
    expect(CHART).not.toContain("pillCut.rect(0, yPill - 13, 96, 26);");
  });
});

describe("ASK-4 (2026-10-08): Delta Levels' sign survives erasure by FORM, never hue (§9)", () => {
  it("BUY rungs solid, SELL rungs hollow, one ink, receipt names the form", () => {
    expect(CHART).toContain('ds.deltaLevelsSides = `BUY:${buyRungs}|SELL:${sellRungs}|FORM:SOLID_BUY+HOLLOW_SELL`;');
    expect(CHART).toContain("ctx.strokeRect(Math.min(centerX, xEnd) + 0.5, Math.round(y - rungPx / 2) + 0.5, Math.max(1, len - 1), Math.max(2, rungPx - 1));");
  });
});

describe("ASK-6 (2026-10-08): Delta Keel salience floor at every width", () => {
  it("no keel shorter than KEEL_MIN_L, named in its receipt", () => {
    expect(CHART).toContain("const KEEL_MIN_L = 3;");
    expect(CHART).toContain("const L = Math.max(KEEL_MIN_L, keelLength(kl.ratio, bodyW));");
    expect(CHART).toContain("canvas.dataset.barDeltaKeelsSalience = `L${KEEL_MIN_L}|W2`;");
  });
});

describe("ASK-6 (2026-10-08): RVOL tone salience", () => {
  it("every toned volume bar carries a 2px brass cap, named in its receipt", () => {
    expect(CHART).toContain('canvas.dataset.rvolWeightSalience = "CAP2";');
    expect(CHART).toContain("for (const r of steps) for (let i = 0; i < r.length; i += 4) ctx.rect(r[i], r[i + 1], r[i + 2], Math.min(2, r[i + 3]));");
  });
});

describe("ASK-7 (2026-10-08): the bar Clarity reads carries its own mark", () => {
  it("a gold bracket round the read bar's range, receipted", () => {
    expect(CHART).toContain("ds.clarityReadMark = `BRACKET:${hb.time}`;");
  });
});

describe("ASK-5 / ASK-6 receipts (2026-10-08)", () => {
  it("Derivatives Pressure names its tint per state; Value Candle names its CoG reach", () => {
    expect(CHART).toContain("ds.derivativesPressureTint = `NET_POS:BLUE:${posD}|NET_NEG:ORANGE:${negD}`;");
    expect(CHART).toContain("const cogExt = gw < 7 ? VC_COG_EXT_NARROW : 1;");
  });
});

describe("ASK-10 (2026-10-08): a selected FVG reads on the glass with Inspect closed", () => {
  it("the selected band gets the gold selection frame, receipted", () => {
    expect(CHART).toContain('dsF.fvgSelectedMark = selMarked ? "FRAME:GOLD" : "NONE";');
    expect(CHART).toContain('ctx.strokeStyle = "rgba(232,198,104,0.95)";');
  });
});

describe("ASK-16 (2026-10-08): the selected print's event line goes through its ring", () => {
  it("the ring's centre this frame sets the event x; the receipt names both", () => {
    expect(CHART).toContain("selectedDiscX = b.x;");
    expect(CHART).toContain("const ex = discX != null && Number.isFinite(discX) ? discX : +xe, ey = +yp, up = pr.dir > 0;");
  });
});

describe("ASK-15 (2026-10-08): no pressure wall shows as a sliver at the pane edge", () => {
  it("a wall without WALL_EDGE_BODY_PX of body inside the pane goes to the edge brick stack", () => {
    expect(CHART).toContain("const WALL_EDGE_BODY_PX = 24;");
    expect(CHART).toContain("const edgeUp = yc < HEADER_FLOOR_Y + WALL_EDGE_BODY_PX;");
  });
});

describe("ASK-14 (2026-10-08): footprint cells too narrow to read are said, not implied", () => {
  it("the receipt and the silence stack name it", () => {
    expect(CHART).toContain("dsFp.footprintCells = `TOO_NARROW:COL${colW}`;");
    expect(CHART).toContain('const wordsN = "FOOTPRINT · ROWS NEED A WIDER VIEW — ZOOM IN";');
  });
});
