/**
 * THE EXPECTED ENVELOPE'S WORDS OBEY THE COLLISION GOVERNOR.
 *
 * Serving NQ1! 5m desktop, 2026-09-25 (order-flow set on): the "TYPICAL
 * REACH" name had no keep-out at all — a 0.82 backing at the live edge over
 * the newest candles — and an upper reach near the top printed inside the
 * header band, cut by the zoom plate and under the bar clock.
 *
 * UPDATED 2026-09-25 (lenses canon slice, H-801 / F03): the TYPICAL REACH
 * names are gone — the envelope is now the canon's analogue FAN, and its only
 * words are the plate's small caption and the MARKET SURPRISE flag. The law
 * this sentinel was written for still holds for both: below the header band,
 * a strict slot test against the row's candle bodies and the chips, joined to
 * the ledger, with the backing yielding if it must sit on a body. The fan's
 * geometry itself is pinned in lensesCanonGeometry.sentinel.test.ts.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("the envelope's words (Sentinel)", () => {
  const at = CHART.indexOf("const capT = `analogue envelope n=${nNow}");
  const block = CHART.slice(at, CHART.indexOf("EXPECTED ENVELOPE · needs 3 completed sessions", at));

  it("finds the caption and the flag", () => {
    expect(at).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(1200);
    expect(block).toContain("const flagT = `MARKET SURPRISE · ${sp.matchedBy} of ${sp.n} went this far`;");
  });

  it("no TYPICAL REACH name is printed any more", () => {
    expect(CHART).not.toContain("TYPICAL REACH");
  });

  it("never rises into the header band", () => {
    expect(block).toContain("const capAbove = { x: capX, y: Math.max(HEADER_FLOOR_Y + 2, Math.min(endC.y90, endC.y10) - capH - 6), w: capW, h: capH };");
    expect(block).toContain("const clampY = (y: number) => Math.max(HEADER_FLOOR_Y + 2, Math.min(H * 0.78 - fh, y));");
  });

  it("each takes a strict slot test against its rows' bodies and the chips, and joins the ledger", () => {
    expect(block).toMatch(/placeClearOfKeepOut\(\s*capAbove,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\([^)]*\)[^\]]*\],\s*\{ minX: keepOutMinX\(\), blockers: floatingChips, strict: true, alternates: \[capBelow\] \},?\s*\)/);
    expect(block).toMatch(/placeClearOfKeepOut\(\s*flagPref,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\([^)]*\)[^\]]*\],\s*\{ minX: keepOutMinX\(\), blockers: floatingChips, strict: true, alternates: \[flagAlt\] \},?\s*\)/);
    expect(block).toContain("recordKeepOut(keepOutLedger, spotCap);");
    expect(block).toContain("recordKeepOut(keepOutLedger, spotF);");
    expect(block).toContain("floatingChips.push({ x: spotCap.rect.x, y: spotCap.rect.y, w: spotCap.rect.w, h: capH });");
    expect(block).toContain("floatingChips.push({ x: spotF.rect.x, y: spotF.rect.y, w: fw, h: fh });");
    expect(block).toContain("ctx.fillStyle = `rgba(11,10,8,${keepOutBackingAlpha(spotCap, 0.85)})`;");
    expect(block).toContain("ctx.fillStyle = `rgba(11,10,8,${keepOutBackingAlpha(spotF, 0.9)})`;");
  });

  it("its refusal line is a chip too, so TPO letters yield to it", () => {
    expect(CHART).toContain("floatingChips.push({ x: 12, y: H - 86 - 7, w: ctx.measureText(refusal).width, h: 14 });");
  });
});
