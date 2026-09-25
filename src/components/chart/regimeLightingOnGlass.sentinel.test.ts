/**
 * H-901 REGIME LIGHTING PAINTS THE PLATE'S CANVAS, NOT ITS LEGEND.
 *
 * Founder, 2026-09-25 13:58 CDT: "STOP BUILDING FROM MEMORY … LOOK AT THE
 * ACTUAL SCREEN. I STILL HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS
 * WITHIN THE CANON THAT THE CHART SHOULD SHOW."
 *
 * Measured on wealthymindsetspro.com/charts (TSLA 15m, desktop, 14:00 CDT)
 * with the layer on: a card "REGIME CIRCUIT BREAKERS · ONLY ONE ON" — three
 * boxes TREND / RANGE / TRANSITION, all OFF, and a footer — painted at
 * x≈485–847, y≈148–222 straight over the candles. No light, no fixture.
 *
 * The plate (H-901, "Regime lighting — which geometry may speak") draws that
 * panel as the SHEET'S LEGEND. Its market canvas carries the fixtures: the
 * mean / ±σ magnets (☆) and the parallel hatched trend channel (△), each at
 * the light its one breaker gives it. F15A lights the room by state and puts
 * ONE unresolved chip on the state line. This file keeps it that way:
 *
 *   (a) no breaker panel — no three-box card, no legend words on the glass;
 *   (b) the fixtures are drawn at REAL coordinates — bars on camera, their
 *       closes, the chart's own time→x and price→y — first bar → newest bar;
 *   (c) the dimming goes through the attention governor (one loudness owner);
 *   (d) every candle body and wick is cut out before a fixture or the field
 *       paints, and the one mark is placed by the keep-out owner;
 *   (e) the receipts name what was lit/dimmed and are withdrawn every frame.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { LAYER_ATTENTION } from "@/lib/marketData/viewModels/selectAttentionGovernor";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const block = (() => {
  const start = CHART.indexOf("const lightOn = layerOnRef.current.regimeLighting === true;");
  const end = CHART.indexOf("if (layerOnRef.current.memoryGhost === true && srs) {", start);
  expect(start, "H-901 block not found — did it move?").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

const at = (needle: string) => {
  const i = block.indexOf(needle);
  expect(i, `not found in the H-901 block: ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe("H-901 regime lighting — the plate's canvas on the real chart", () => {
  it("(a) paints no breaker card: no legend words, no three-box panel, no breaker ids named at the paint site", () => {
    expect(CHART).not.toMatch(/ONLY ONE ON/);
    expect(CHART).not.toMatch(/CIRCUIT BREAKERS/);
    // The panel was a BRK list walked with forEach, one box per breaker.
    expect(block).not.toMatch(/\bBRK\b/);
    expect(block).not.toMatch(/"(TREND|RANGE|TRANSITION)"/);
    expect(block).not.toMatch(/\.forEach\(/);
    // Every filled rectangle is the field (inside the cut-out) or the ONE
    // keep-out-placed title — never a panel at fixed coordinates.
    const fills = [...block.matchAll(/ctx\.fillRect\(([^;]*)\);/g)].map(m => m[1]);
    expect(fills).toEqual(["xEdge - reach, 0, reach, pane0Bottom", "xEdge, 0, plotRight - xEdge, pane0Bottom", "r.x, r.y, r.w, r.h"]);
    expect([...block.matchAll(/ctx\.strokeRect\(/g)].length).toBe(1);
  });

  it("(b) measures the fixtures from the bars on camera and draws them on the chart's own coordinates", () => {
    at("const fx = selectRegimeFixtures(barsR.slice(iLo, iHi + 1).map(b => ({ time: Number(b.time), close: Number(b.close) })));");
    at("const xOfR = (t: number) => { const x = tsR.timeToCoordinate(t as never); return x == null ? null : +x; };");
    at("const yOfR = (p: number) => { const y = srs.priceToCoordinate(p); return y == null ? null : +y; };");
    // First measured bar → newest measured bar: nothing right of now.
    at("const xA = fx.fromTime != null ? xOfR(fx.fromTime) : null;");
    at("const xB = fx.toTime != null ? xOfR(fx.toTime) : null;");
    // △ the channel's three parallel lines and hatch, on its measured prices.
    for (const l of ["lower", "centre", "upper"]) {
      expect(block).toMatch(new RegExp(`yOfR\\(${l}\\.fromPrice\\)`));
      expect(block).toMatch(new RegExp(`yOfR\\(${l}\\.toPrice\\)`));
    }
    at("ctx.moveTo(xA, yUA); ctx.lineTo(xB, yUB); ctx.lineTo(xB, yLB); ctx.lineTo(xA, yLA); ctx.closePath();");
    at("ctx.beginPath(); ctx.moveTo(xA, ya); ctx.lineTo(xB, yb); ctx.stroke();");
    // ☆ the magnets at MEAN / ±σ / ±2σ prices, first bar → newest.
    at("const y = yOfR(lv.price);");
    at("ctx.beginPath(); ctx.moveTo(xA, yy); ctx.lineTo(xB, yy); ctx.stroke();");
  });

  it("(c) dims through the governor: every alpha in the block is asked of it, the light is never read at the site", () => {
    at('const aC = att.alpha("regimeChannel");');
    at('const aM = att.alpha("regimeMagnets");');
    at('const aF = att.alpha("regimeField");');
    const alphas = [...block.matchAll(/ctx\.globalAlpha\s*=\s*([^;]*);/g)].map(m => m[1].trim());
    expect(alphas.length).toBeGreaterThanOrEqual(4);
    // The fixtures' names take the governor's word alpha (legibility floor)
    // and hand the line alpha back when they finish.
    for (const a of alphas) expect(["aC", "aM", "aF", 'att.alpha("regimeLighting")', "att.textAlpha(key)", "prevA"], a).toContain(a);
    at('nameAt("△ CHANNEL", yUA, "rgba(237,230,211,0.9)", "regimeChannel");');
    at(', yy, "rgba(201,165,92,1)", "regimeMagnets");');
    // The breaker's multipliers reach alpha only through the governor.
    expect(block).not.toMatch(/regimeLight\.(magnets|trend|fixtures)\b/);
    expect(LAYER_ATTENTION.regimeChannel.light).toBe("CHANNEL_FIXTURES");
    expect(LAYER_ATTENTION.regimeMagnets.light).toBe("MAGNET_FIXTURES");
    expect(LAYER_ATTENTION.regimeField.light).toBeNull();
  });

  it("(d) cuts every candle out before the field and fixtures paint; the one mark is placed by the keep-out owner", () => {
    at("cutR.rect(xb - bsp * 0.42, top, bsp * 0.84, bot - top);");
    at("if (yhB != null && yhB < top) cutR.rect(xb - 1, yhB - 1, 2, top - yhB + 1);");
    at("if (ylB != null && ylB > bot) cutR.rect(xb - 1, bot, 2, ylB - bot + 1);");
    const clip = at('ctx.clip(cutR, "evenodd");');
    const release = at("ctx.restore(); // releases the candle cut-out");
    for (const k of ['att.alpha("regimeField")', 'att.alpha("regimeChannel")', 'att.alpha("regimeMagnets")', "ctx.fillRect(xEdge - reach"]) {
      const i = at(k);
      expect(i, k).toBeGreaterThan(clip);
      expect(i, k).toBeLessThan(release);
    }
    // ONE mark, after the cut-out: the title a breaker earns, else the coin.
    const title = at("if (regimeLight.title) {");
    expect(title).toBeGreaterThan(release);
    expect(block).toMatch(/ds\.regimeLightingMark = `TITLE:\$\{regimeLight\.breaker\}:\$\{spotT\.mode\}`;\s*\} else if \(newestR && xLiveR != null\) \{/);
    // The title sits in the top band below the header floor.
    at("const yT = HEADER_FLOOR_Y + 4;");
    // The coin sits on the live price, at the live edge.
    at("const yP = yOfR(Number(newestR.close));");
    at("const prefC = { x: x0, y: yP - chh / 2, w: cw, h: chh };");
    for (const s of ["spotT", "spotC"]) {
      expect(block).toMatch(new RegExp(`const ${s} = placeClearOfKeepOut\\(pref[TC], \\[\\.\\.\\.keepOut\\(\\), \\.\\.\\.rowBodiesAt\\(`));
      at(`recordKeepOut(keepOutLedger, ${s});`);
      at(`floatingChips.push(${s}.rect);`);
      at(`keepOutBackingAlpha(${s}, 0.82)`);
    }
  });

  it("(e) receipts: withdrawn every frame, re-published only for what painted, naming the light each class got", () => {
    const list = CHART.match(/const REGIME_LIGHTING_RECEIPTS = \[([^\]]*)\] as const;/);
    expect(list, "REGIME_LIGHTING_RECEIPTS not found").not.toBeNull();
    const names = [...list![1].matchAll(/"([A-Za-z]+)"/g)].map(m => m[1]);
    const written = [...new Set([...block.matchAll(/\bds\.(regimeLighting[A-Za-z]*)\s*=/g)].map(m => m[1]))]
      .filter(n => n !== "regimeLighting" && n !== "regimeLightingVerdict");
    expect(written.length).toBeGreaterThanOrEqual(6);
    for (const n of written) expect(names, `ds.${n} is never withdrawn`).toContain(n);
    const withdraw = at("for (const k of REGIME_LIGHTING_RECEIPTS) delete ds[k];");
    expect(withdraw).toBeLessThan(at("if (lightOn && regimeLight) {"));
    // What was lit or dimmed, and the governor's alpha for it.
    at("ds.regimeLightingChannel = `${regimeLight.fixtureState.channel}|a=${aC.toFixed(2)}|lines=${channelLines}|");
    at("ds.regimeLightingMagnets = `${regimeLight.fixtureState.magnets}|a=${aM.toFixed(2)}|lines=${magnetLines}|mean=${fx.magnets.mean.toFixed(pxDp)}|");
    at("ds.regimeLightingField = `${regimeLight.field}|a=${aF.toFixed(2)}`;");
    at('ds.regimeLighting = lightOn ? (regimeLight?.breaker ?? "NO_BREAKER") : "OFF";');
  });
});
