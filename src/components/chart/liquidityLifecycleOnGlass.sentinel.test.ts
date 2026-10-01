/**
 * LIQUIDITY LIFECYCLE IS FORM ON PRICE, NOT A PANEL — Garden Pass 12.
 *
 *     Liquidity lifecycle should not look like another generic support box.
 *     Do not solve it by covering the market with another panel.
 *
 * The layer shipped as stage HUES (a green→red ramp) with numbered circles, a
 * 596px legend strip and an opaque 236×241 "LIFECYCLE STATUS" panel claiming
 * "ON THIS CAMERA" for pools compiled over all loaded bars — and it recompiled
 * the reading inside the animation frame. Then: one ink, biography as form,
 * one caption line, and the room compiles the reading once.
 *
 * PINS MOVED 2026-09-25 — F08A "liquidity lifecycle on the book". The Founder,
 * at the glass: "STOP BUILDING FROM MEMORY … LOOK AT THE ACTUAL SCREEN." The
 * pools still rendered as flat thin bands from x = 0 (or their first event)
 * across the camera to the axis, with dashed/solid edges, a hatch and a
 * caption line in the bottom-left corner. The plate draws each pool as a
 * glowing gold LADDER bounded in time by its lifecycle, with dashed phase
 * ticks. So the pins now say:
 *   · "edges dashed → solid → heavier" → rungs 2 → 3 → 4 → 5 (poolSpan owns
 *     the stretches), a soft glow, still ONE ink;
 *   · "notch / hatch" → a dashed PHASE TICK at every lifecycle event (TOUCH
 *     included) and an END CAP at the consume bar;
 *   · the span: from the APPEARED bar to the CONSUMED bar or the LIVE bar —
 *     never from x = 0 when the pool appeared on camera, never to the axis
 *     past the live bar;
 *   · "one caption line" → NO caption on the glass; the honesty statement is
 *     a receipt plus one compact tag placed through the keep-out placer;
 *   · candles stay in front: everything paints inside the candle cut-out.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

const CHART = read("src/components/chart/MainChart.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

const block = (() => {
  // 2026-09-26 (H-501 permission): the gate also asks the ONE permission
  // table, and the off receipt names OFF vs SILENT:<depth>.
  const start = CHART.indexOf('if (layerOnRef.current.liquidityLifecycle === true && att.paints("liquidityLifecycle")) {');
  const end = CHART.indexOf("ds.liquidityLifecycle = att.offWord(layerOnRef.current.liquidityLifecycle === true);", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("liquidity lifecycle on glass", () => {
  it("is compiled once by the room, never inside the canvas frame", () => {
    expect(CHART).not.toMatch(/\bselectLiquidityLifecycle\s*\(/);
    expect(ROOM).toMatch(/liquidityLifecycle=\{chartLiquidityLifecycle\}/);
    expect(block).toContain("liquidityLifecycleRef.current");
  });

  it("carries no panel, legend strip or camera-scope overclaim", () => {
    expect(block).not.toContain("LIFECYCLE STATUS");
    expect(block).not.toContain("ON THIS CAMERA");
    expect(block).not.toContain("liquidityLifecycleStatus");
    const wideRects = [...block.matchAll(/fillRect\([^)]*,\s*(\d{3,})\s*,/g)].filter(m => Number(m[1]) >= 200);
    expect(wideRects).toEqual([]);
  });

  it("tells the stage by form on one ink, not by hue or numbered circles", () => {
    expect(block).not.toContain("STAGE_RGB");
    expect(block).not.toMatch(/arc\([^)]*,\s*7\s*,/);
    expect(block).toContain('const INK = "201,165,92"');
    // Every stroke and fill is the one ink (or ivory words) — no stage hue.
    const inks = [...block.matchAll(/rgba\((\d+),(\d+),(\d+)/g)].map(m => `${m[1]},${m[2]},${m[3]}`);
    for (const c of inks) expect(["237,230,211"]).toContain(c);
  });
});

describe("F08A — each pool is a glowing LADDER bounded in time by its lifecycle", () => {
  it("reads its biography through the one span owner", () => {
    expect(block).toContain("const span = poolSpan(pool.events);");
    expect(block).toContain("for (const ph of span.phases)");
    expect(block).toContain("ladderRungYs(top, h, ph.rungs)");
  });

  it("starts at the APPEARED bar and ends at the CONSUMED bar or the live bar", () => {
    expect(block).toContain("const xStart = xOf(span.startTime);");
    expect(block).toContain("const xStop = span.endTime != null ? xOf(span.endTime) : xLive;");
    // Pin moved 2026-09-26 (GP12 §64): the birth x is xBirth; x0 is where
    // the ladder is DRAWN from (the last fifth of the pane for a pool born
    // before the camera, unless it is selected).
    expect(block).toContain("const xBirth = Math.max(0, xStart - spacingL / 2);");
    expect(block).toContain("const xEnd = Math.min(rightL, span.endTime != null ? xStop + spacingL / 2 : xStop);");
    // The live edge is the newest bar's slot, not the axis.
    expect(block).toContain("const xLive = Math.min(rightL, xLastBar == null ? rightL : xLastBar + spacingL / 2);");
    // The old flat band: from x = 0 whenever history ran left, to the axis.
    expect(block).not.toContain("const x0 = openLeft ? 0 : xFirst!;");
    expect(block).not.toContain("ctx.fillRect(x0, top, xEnd - x0, h);");
  });

  it("glows softly around the ladder, weighted by the pool's volume", () => {
    expect(block).toContain("const glow = ctx.createLinearGradient(0, top - halo, 0, top + h + halo);");
    // Pin moved 2026-09-26 (serving 04:04, "very faint next to F08A"): the
    // glow, blur, width and rung alpha come from ONE owner, ladderInk.
    expect(block).toContain("const ink = ladderInk({ rungs: lastRungs, consumed: span.consumed || span.pulled, barsQuiet, weight });");
    expect(block).toMatch(/ctx\.shadowBlur = ink\.blur;[\s\S]*ctx\.shadowBlur = 0;/);
    expect(block).toContain("ladderInk({ rungs: ph.rungs, consumed: span.consumed || span.pulled, barsQuiet, weight }).rungAlpha");
  });

  it("marks every lifecycle event with a dashed phase tick and a consumed pool with an end cap", () => {
    expect(block).toContain("for (const tk of span.ticks)");
    expect(block).toMatch(/ctx\.setLineDash\(\[2, 2\]\);[\s\S]*ctx\.moveTo\(xs, top - 6\);/);
    expect(block).toContain("words.push({ text: PHASE_WORD[tk.stage]");
    // Pin moved 2026-09-26 (Garden 11): the cap is a BOLD bar, the rungs fade after it.
    // Garden 16 §30: a PULLED pool (observed book only) ends too, on a DASHED cap.
    expect(block).toMatch(/if \(span\.consumed \|\| span\.pulled\) \{[\s\S]*ctx\.lineWidth = 2\.5;[\s\S]*if \(span\.pulled\) ctx\.setLineDash\(\[3, 2\]\);[\s\S]*ctx\.moveTo\(xEnd - 1\.25, top - 5\);/);
  });

  // Garden 16 §30 (2026-09-27): PULLED is observable ONLY on an observed book
  // (bookLiquidityLifecycle, Kraken USD crypto). On the candle basis it stays
  // refused, and the receipt and tag say which basis the glass is showing.
  // P-601 "OPACITY REGULATOR (MAX 0.30)" and F08A's depth glow: observed book only.
  it("the depth glow paints only on an observed book, behind the candles, never above 0.30", () => {
    expect(block).toContain('const depthL = lc.basis === "OBSERVED_BOOK" ? lc.depthByBar ?? [] : [];');
    expect(block).toContain("const DEPTH_ALPHA_MAX = 0.3;");
    expect(block).toMatch(/const a = DEPTH_ALPHA_MAX \* Math\.sqrt\(r\.size \/ maxCell\);/);
    // Painted after the candle cut-out clip, before the ladders.
    expect(block.indexOf('ctx.clip(cutL, "evenodd");')).toBeLessThan(block.indexOf("const depthL ="));
    expect(block.indexOf("const depthL =")).toBeLessThan(block.indexOf("for (let pi = 0; pi < lc.pools.length; pi++)"));
  });

  it("PULLED is refused on the candle basis and stated only on an observed book", () => {
    expect(block).toContain('ds.liquidityLifecycleRefused = lc.basis === "OBSERVED_BOOK" ? "NONE" : "PULLED,DEPTH:no-book";');
    expect(block).toContain("ds.liquidityLifecycleVenue = lc.venue");
  });

  it("keeps candles in front — ladders, glow and ticks paint inside the candle cut-out", () => {
    expect(block).toContain("candleCutOutRects(bsL,");
    expect(block).toContain('ctx.clip(cutL, "evenodd");');
    const clipAt = block.indexOf('ctx.clip(cutL, "evenodd");');
    const releaseAt = block.indexOf("ctx.restore(); // releases the candle cut-out");
    expect(releaseAt).toBeGreaterThan(clipAt);
    const inside = block.slice(clipAt, releaseAt);
    expect(inside).toContain("ctx.fillRect(x0, top - halo");
    expect(inside).toContain("ctx.lineTo(sb, yy);");
    // Words print whole, after the cut-out is released.
    expect(inside).not.toContain("fillText(");
  });

  it("stops short of the profile stack", () => {
    expect(block).toContain("ds.profileStackLeft");
  });
});

describe("no caption on the glass — the honesty is a receipt and one compact tag", () => {
  it("prints no LIQUIDITY LIFECYCLE caption line and keeps no caption-row owner", () => {
    expect(CHART).not.toContain("liquidityCaptionLine");
    expect(CHART).not.toContain("LIQUIDITY LIFECYCLE ·");
    expect(block).not.toMatch(/floatingChips\.push\(\{ x: 8, y: cy - 11/);
  });

  it("publishes the basis and the refusal as receipts", () => {
    expect(block).toContain("ds.liquidityLifecycleBasis = lc.basis;");
    expect(block).toContain("ds.liquidityLifecyclePainted =");
    expect(block).toContain("ds.liquidityLifecycleTicks =");
    expect(block).toContain("ds.liquidityLifecycleSpans = spans.join");
  });

  it("the one tag is placed clear of the candles and chips by the keep-out placer", () => {
    expect(block).toContain('const tag = lc.basis === "OBSERVED_BOOK" ? `BOOK · ${(lc.venue ?? "ONE VENUE").toUpperCase()} · ONE VENUE` : "CANDLE-EST · NO BOOK · PULL REFUSED";');
    expect(block).toMatch(/const tagSpot = placeClearOfKeepOut\(below, keepOut\(\), \{/);
    expect(block).toContain("recordKeepOut(keepOutLedger, tagSpot);");
    // Pin moved 2026-09-26: a placed tag must also sit inside the pane.
    expect(block).toMatch(/if \(tagSpot\.mode !== "BLOCKED" && tagSpot\.rect\.y >= paneTopL/);
  });

  it("withdraws its ancillary receipts when off", () => {
    // 2026-09-26 (H-501 permission): the off receipt names OFF vs SILENT:<depth>.
    const offAt = CHART.indexOf("ds.liquidityLifecycle = att.offWord(layerOnRef.current.liquidityLifecycle === true);");
    expect(offAt).toBeGreaterThan(-1);
    // Window widened 2026-09-26: the off branch now also withdraws Shown / Memory.
    const off = CHART.slice(offAt, offAt + 900);
    for (const k of ["Painted", "Ticks", "Spans", "Tag", "Basis", "Refused"]) expect(off).toContain(`delete ds.liquidityLifecycle${k};`);
  });
});

describe("the lifecycle stays in the pane and behind the chips — serving BTC-USD 5m, 2026-09-26 04:04 CDT", () => {
  // A pool near 84,350 sat at the top of the pane; its rungs ran through the
  // header band, the "Evidence saved" chip and the semantic badge.
  it("clips every paint to the pane below HEADER_FLOOR_Y, before the candle cut-out", () => {
    expect(block).toContain("const paneTopL = HEADER_FLOOR_Y, paneBotL = pane0Bottom;");
    expect(block).toMatch(/ctx\.rect\(0, paneTopL, W, Math\.max\(0, paneBotL - paneTopL\)\);\s*ctx\.clip\(\);/);
    const paneAt = block.indexOf("clipToPaneL();");
    expect(paneAt).toBeGreaterThan(-1);
    expect(block.indexOf('ctx.clip(cutL, "evenodd");')).toBeGreaterThan(paneAt);
  });

  it("cuts every chip already on the glass out, one clip per chip, padded 2px", () => {
    expect(block).toContain("const CHIP_PAD_L = 2;");
    expect(block).toMatch(/for \(const r of floatingChips\) \{\s*ctx\.beginPath\(\);\s*ctx\.rect\(0, 0, W, H\);\s*ctx\.rect\(r\.x - CHIP_PAD_L, r\.y - CHIP_PAD_L, r\.w \+ CHIP_PAD_L \* 2, r\.h \+ CHIP_PAD_L \* 2\);\s*ctx\.clip\("evenodd"\);/);
  });

  it("a pool wholly above the header floor draws nothing, and the receipt counts the clipped", () => {
    expect(block).toContain("if (top + h < paneTopL || top > paneBotL) { skipL.price++; continue; }");
    expect(block).toContain("ds.liquidityLifecycleSkipped = `SPAN:${skipL.span}|PRICE:${skipL.price}|TIME:${skipL.time}|TAIL:${skipL.tail}`;");
    expect(block).toContain("if (top - 10 < paneTopL) clippedTop++;");
    expect(block).toMatch(/ds\.liquidityLifecycleClipped = \[clippedTop \? `TOP:\$\{clippedTop\}` : ""/);
    // The OFF branch speaks through the governor since H-501 (0865484c).
    const offAt = CHART.indexOf("ds.liquidityLifecycle = att.offWord(layerOnRef.current.liquidityLifecycle === true);");
    expect(offAt).toBeGreaterThan(-1);
    const off = CHART.slice(offAt, offAt + 500);
    expect(off).toContain("delete ds.liquidityLifecycleClipped;");
  });

  it("the words and the tag stay in the pane too", () => {
    const words = block.slice(block.indexOf("ctx.restore(); // releases the candle cut-out"));
    expect(words).toMatch(/ctx\.rect\(0, paneTopL, W, Math\.max\(0, paneBotL - paneTopL\)\);\s*ctx\.clip\(\);/);
    expect(words).toContain('tagSpot.mode !== "BLOCKED" && tagSpot.rect.y >= paneTopL');
  });
});

describe("Garden 11 — with the words hidden, the stage is still geometry (TSLA 15m, &proof=nolabels, 2026-09-26 04:06 CDT)", () => {
  // Measured: the pools read as generic bundles of horizontal lines. F08A
  // tells the biography in shape; so does this block now, one ink.
  it("a pool born on camera opens with a BIRTH bracket at its APPEARED bar", () => {
    expect(block).toContain("const bornOnCamera = xStart - spacingL / 2 >= 0;");
    expect(block).toMatch(/if \(tk\.stage === "APPEARED"\) \{[\s\S]{0,200}ctx\.moveTo\(xs \+ 4, top - 5\);\s*ctx\.lineTo\(xs, top - 5\);\s*ctx\.lineTo\(xs, top \+ h \+ 5\);\s*ctx\.lineTo\(xs \+ 4, top \+ h \+ 5\);/);
  });

  it("a pool born before the camera FADES IN from the edge, and its span says so", () => {
    expect(block).toMatch(/if \(ph\.fromTime === span\.startTime && !bornOnCamera\) \{\s*[\s\S]{0,120}const fadeIn = ctx\.createLinearGradient\(x0, 0, x0 \+ 28, 0\);/);
    expect(block).toContain('spans.push(`${bornOnCamera ? "" : "<"}${Math.round(x0)}');
    expect(block).toContain("ds.liquidityLifecycleBirths = `${births}/${painted}`;");
  });

  it("a TOUCH bites the rungs and carries a caret", () => {
    expect(block).toContain("for (const [sa, sb] of splitAtBites(xa, xb, touchXs, 4)) {");
    expect(block).toMatch(/\} else if \(tk\.stage === "TOUCHED"\) \{[\s\S]{0,160}ctx\.moveTo\(xs - 3, top - 8\);\s*ctx\.lineTo\(xs, top - 4\);\s*ctx\.lineTo\(xs \+ 3, top - 8\);/);
  });

  it("a CONSUMED pool ends in a bold cap and its rungs fade out after it", () => {
    expect(block).toContain("const fadeOut = ctx.createLinearGradient(xEnd, 0, xEnd + tail, 0);");
    expect(block).toContain("const tail = Math.min(16, spacingL * 2, Math.max(0, rightL - xEnd));");
  });

  it("maturity is rung count AND brightness from one owner; all in family ink", () => {
    expect(block).toContain("const rungA = ladderInk({ rungs: ph.rungs, consumed: span.consumed || span.pulled, barsQuiet, weight }).rungAlpha;");
    expect(block).toContain("ctx.globalAlpha = att.textAlpha(\"liquidityLifecycle\");");
  });
});

describe("GP12 §64 — crowded glass: the near pools speak, the rest are memory (serving TSLA 15m, 2026-09-26 05:00 CDT)", () => {
  // Measured with the Founder's full layer set: six ladders ran the whole
  // pane (x 0 → ~1240 of 1567) at 374–381 — a band of gold hairlines.
  it("ranks pools with the lifecycle owner, by distance from price now, with the selected price", () => {
    expect(block).toContain("const rolesL = rankPoolsForGlass(lc.pools, priceNowL, { selectedPrice: selectedSliceRef.current });");
    expect(block).toContain("const priceNowL = lastBarL ? Number(lastBarL.close) : NaN;");
  });

  it("MEMORY pools are a short stub at their own right end, at the memory tier, and draw nothing else", () => {
    const mem = block.slice(block.indexOf('if (role === "MEMORY") {'), block.indexOf("memoryL++;"));
    expect(mem.length).toBeGreaterThan(200);
    expect(mem).toContain("const stub = Math.min(48, spacingL * 6);");
    expect(mem).toContain("const sx0 = Math.max(x0, xEnd - stub);");
    expect(mem).toContain("ctx.globalAlpha = memoryA;");
    // No glow, no marks, no words from a memory pool.
    expect(mem).not.toContain("createLinearGradient(0, top - halo");
    expect(mem).not.toContain("words.push(");
    expect(block).toMatch(/memoryL\+\+;\s*continue;/);
    expect(block).toContain("const memoryA = shownA * Math.min(1, TIER_CEILING.MEMORY / TIER_CEILING[att.tierOf(\"liquidityLifecycle\")]);");
  });

  it("a pool born before the camera draws only the last fifth of the pane before its END — unless selected", () => {
    expect(block).toContain("const OFFCAM_TAIL = 0.2;");
    // Measured from its end (consume cap, or now while it stands): measured
    // from now, a pool consumed earlier drew nothing (MNQ 1m, 2026-10-01).
    expect(block).toContain('const x0 = !bornOnCamera && role !== "SELECTED" ? Math.max(xBirth, xEnd - OFFCAM_TAIL * rightL) : xBirth;');
    expect(block).not.toContain("xLive - OFFCAM_TAIL");
  });

  it("the selected pool paints at the governor's selected strength", () => {
    expect(block).toContain('ctx.globalAlpha = role === "SELECTED" ? selectedA : shownA;');
    expect(block).toContain('const selectedA = Math.max(shownA, att.alpha("liquidityLifecycle", { selectedItem: true }));');
  });

  it("publishes liquidityLifecycleShown = k/N and withdraws it", () => {
    expect(block).toContain("ds.liquidityLifecycleShown = `${shownL}/${lc.pools.length}`;");
    expect(CHART.match(/delete ds\.liquidityLifecycleShown;/g)?.length).toBe(2);
  });
});
