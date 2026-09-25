/**
 * THE EXPECTED ENVELOPE'S "TYPICAL REACH" NAME OBEYS THE COLLISION GOVERNOR.
 *
 * Serving NQ1! 5m desktop, 2026-09-25 (order-flow set on): the name had no
 * keep-out at all — a 0.82 backing at the live edge over the newest candles —
 * and an upper reach near the top printed inside the header band, cut by the
 * zoom plate and under the bar clock.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("the envelope's reach name (Sentinel)", () => {
  const at = CHART.indexOf("`TYPICAL REACH ${side");
  const block = CHART.slice(at, CHART.indexOf("EXPECTED ENVELOPE · needs 3 completed sessions", at));

  it("finds the name", () => {
    expect(at).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(600);
  });

  it("never rises into the header band", () => {
    expect(block).toContain('const ly = side === "up" ? Math.max(yy - 8, HEADER_FLOOR_Y + 7) : yy + 8;');
  });

  it("takes a strict slot test against its row's bodies and the chips, and joins the ledger", () => {
    expect(block).toMatch(/placeClearOfKeepOut\(\s*\{ x: lx - 4, y: ly - 7, w: tw \+ 8, h: 14 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(ly - 7, ly \+ 7\)\],\s*\{ minX: Math\.max\(x0, keepOutMinX\(\)\), blockers: floatingChips, strict: true \},?\s*\)/);
    expect(block).toContain("recordKeepOut(keepOutLedger, spotE);");
    expect(block).toContain("floatingChips.push({ x: spotE.rect.x, y: spotE.rect.y, w: spotE.rect.w, h: 14 });");
    expect(block).toContain("ctx.fillStyle = `rgba(11,10,8,${keepOutBackingAlpha(spotE, 0.82)})`;");
    expect(block).not.toContain("fillRect(lx - 4, ly - 7");
  });
});
