/**
 * THE PROFILE FAMILY PAINTS THE CANON PLATES — P-110 / M47 / H-601 / H-201.
 *
 * Founder, 2026-09-25 13:58 CDT: "STOP BUILDING FROM MEMORY … WORK SIDE BY
 * SIDE WITH THE VISUALS CANON … I STILL HAVE A LOT OF JUST CARDS". Side by
 * side with the plates, serving (TSLA 15m desktop, 14:20 CDT) showed:
 *
 *   · Living: a 4–40% wash under a thin outline; "VAH 371.80" a tiny grey
 *     word left of the body; VAL not visible.            → P-110's solid gold
 *   · Composite / VRP: grey hairline bars THROUGH the newest candles; their
 *     "VAH / POC / VAL" words printed ON the big red candle; captions fixed at
 *     y=50 / y=66 under the semantic badge and INSPECT.
 *   · TPO: letter columns printed on top of the Sep-18 candles.
 *   · Structure: a 13-bar leg's histogram crammed inside the newest cluster.
 *   · Fusion alone: painted nothing, said nothing.
 *   · Memory: fifteen dim level names sprayed across the camera.
 *
 * The laws this file holds, each a line a reviewer can point at:
 *
 *   1. ONE CANDLE CUT-OUT for the whole family, from the one cut-out owner
 *      (chartKeepOut.candleCutOutRects), built once per frame, and every
 *      species' fill paints inside it.
 *   2. ONE LEVEL GRAMMAR: every species names POC / VAH / VAL with the level
 *      chip (right edge, keep-out = every candle body AND wick + every chip).
 *   3. THE P-110 BODY is solid (LIVING_BODY_CANON), in the family ink owner's
 *      roles; VAH/VAL are rules across the plot; POC a dashed rule + a dot.
 *   4. SILENCE IS NAMED: Structure's short leg and Fusion's missing species.
 *   5. MEMORY IS CAPPED by the attention tier, nearest to price.
 *   6. RECEIPTS say what the glass holds, withdrawn when nothing painted.
 *
 * A breadcrumb, not a renderer. It reads source. Every slice proves it found
 * its block before asserting anything about it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const slice = (from: string, to: string, min: number) => {
  const a = CHART.indexOf(from);
  expect(a, `landmark "${from}" is gone — re-point this gate, do not delete it`).toBeGreaterThan(-1);
  const b = CHART.indexOf(to, a + from.length);
  expect(b, `"${to}" no longer follows "${from}"`).toBeGreaterThan(a);
  const s = CHART.slice(a, b);
  expect(s.length, `the slice after "${from}" shrank to ${s.length} chars`).toBeGreaterThan(min);
  return s;
};

/** `inner` sits between `open` and `close` in `s` (all three present, in that order). */
const between = (s: string, open: string, inner: string, close: string) => {
  const o = s.indexOf(open);
  expect(o, `"${open}" not found`).toBeGreaterThan(-1);
  const i = s.indexOf(inner, o);
  expect(i, `"${inner}" is not after "${open}"`).toBeGreaterThan(o);
  const c = s.indexOf(close, i);
  expect(c, `"${close}" does not close "${open}" after "${inner}"`).toBeGreaterThan(i);
};

const VP = slice("function drawWMVP(", "function runWMVP()", 8000);
const LIVING = slice("const lp = livingProfileRef.current;", "const cp = compositeProfileRef.current;", 9000);
const COMPOSITE = slice("const cp = compositeProfileRef.current;", "const lane = stackPlan.lanes.VISIBLE_RANGE;", 3000);
const VRP = slice("const lane = stackPlan.lanes.VISIBLE_RANGE;", "const autoPair: StackSpecies[] | null =", 2800);
const FUSED = slice("const autoPair: StackSpecies[] | null =", "const tpo = tpoProfileRef.current;", 2500);
const TPO = slice("const tpo = tpoProfileRef.current;", "const sp = structureProfileRef.current;", 3000);
const STRUCTURE = slice("const sp = structureProfileRef.current;", "const fu = profileFusionRef.current;", 5000);
const FUSION = slice("const fu = profileFusionRef.current;", "const mem = profileMemoryRef.current;", 2000);
const MEMORY = slice("const mem = profileMemoryRef.current;", "const vmL = valueMigrationRef.current;", 4000);
const MIGRATION = slice("const vmL = valueMigrationRef.current;", "const zones = structureZonesRef.current;", 3000);

describe("1 · ONE candle cut-out for the whole profile family", () => {
  const cut = slice("function profileCandleCut() {", "function profileCandlesAt(", 600);

  it("is built from the one cut-out owner, over every candle in view, once per frame", () => {
    expect(cut).toContain("if (!profileCut) {");
    expect(cut).toMatch(/candleCutOutRects\(barsRef\.current \?\? \[\], \{[\s\S]*?barSpacing: bsp,[\s\S]*?\}, -1e9, 1e9\);/);
    expect(cut).toContain("path.rect(0, 0, W, H);");
    expect(cut).toContain("for (const r of rects) path.rect(r.x, r.y, r.w, r.h);");
    expect(cut).toContain('ctx.clip(profileCandleCut().path, "evenodd");');
    // Hoisted and its state declared before big-trades mode's early runWMVP().
    const firstRun = CHART.indexOf("runWMVP();");
    expect(CHART.indexOf("let profileCut: { path: Path2D;")).toBeGreaterThan(-1);
    expect(CHART.indexOf("let profileCut: { path: Path2D;")).toBeLessThan(firstRun);
    expect(CHART.indexOf("const profileCutBy = new Set<string>();")).toBeLessThan(firstRun);
    // The words' keep-out reads the SAME rects (bodies and wicks).
    expect(CHART).toContain("return profileCandleCut().rects.filter(r => r.y < yBot && r.y + r.h > yTop);");
  });

  it("the VP columns' rows and rules paint inside it", () => {
    between(VP, "clipProfileToCandles(vpSpecies);", "ctx.fillRect(vpRight - barW, rowY, barW, rh);", "ctx.restore(); // releases the column's candle cut-out");
    between(VP, "clipProfileToCandles(vpSpecies);\n          ctx.lineWidth = 1; ctx.setLineDash([5, 4]);", "ctx.lineTo(colLeft, midY)", "ctx.restore();");
  });

  it("the Living body, its rules and its POC mark paint inside it", () => {
    expect(LIVING).toContain('clipProfileToCandles("LIVING");');
    between(LIVING, "ctx.save(); clipToCandleCutOut();\n              const C = LIVING_BODY_CANON;", "ctx.fillStyle = g; ctx.fill(bodyPath);", "ctx.restore(); // releases the candle cut-out");
    between(LIVING, "ctx.save(); clipToCandleCutOut();\n                const edgeHi", "ctx.lineTo(plotRight, Math.round(+yh) + 0.5);", "ctx.restore(); // releases the rules' candle cut-out");
  });

  it("Composite, Visible Range, Structure, Memory, the fused object, Fusion's knots, the movie and Value Migration paint inside it", () => {
    between(COMPOSITE, 'ctx.save(); clipProfileToCandles("COMPOSITE");\n              for (const r of cp.rows)', "ctx.fillRect(xs - segW, y, segW, hRow);", "ctx.restore(); // releases the Composite's candle cut-out");
    between(VRP, 'ctx.save(); clipProfileToCandles("VISIBLE_RANGE");\n            for (const r of vrpVM.rows)', "ctx.fillRect(right - w, y, w, h);", "ctx.restore(); // releases the rows' candle cut-out");
    between(STRUCTURE, 'ctx.save(); clipProfileToCandles("STRUCTURE");', "ctx.fillRect(histX, y, w, Math.max(1, rowH - 1));", "ctx.restore(); // releases the Structure's candle cut-out");
    between(MEMORY, 'ctx.save(); clipProfileToCandles("MEMORY");', "ctx.lineTo(endX, y);", "ctx.restore(); // releases Memory's candle cut-out");
    between(FUSED, 'ctx.save(); clipProfileToCandles("FUSED");', "ctx.fillRect(spanR - w, Math.min(+y0, +y1), w, h);", "ctx.restore(); // releases the fused body's candle cut-out");
    between(FUSION, 'ctx.save(); clipProfileToCandles("FUSION");', "ctx.fillRect(knotX - 96, top, 96, h);", "ctx.restore(); // releases the knots' candle cut-out");
    // Pin updated 2026-09-26: the movie's value-area ribbon is retired (see
    // "7 · no generic rectangle"); its POC trail still paints inside the cut.
    between(MIGRATION, 'ctx.save(); clipProfileToCandles("LIVING_MOVIE");', 'ctx.strokeStyle = pk.rgba("POC", 0.6); ctx.lineWidth = 1.2; ctx.stroke();', "ctx.restore(); // releases the movie's candle cut-out");
    between(MIGRATION, 'ctx.save(); clipProfileToCandles("VALUE_MIGRATION");', 'stepLine("poc", pk.rgba("POC", 0.85), 1.5, [])', "ctx.restore(); // releases the steps' candle cut-out");
  });

  it("TPO: every cell a candle stands on is withheld, and the cut-out backs it up", () => {
    const clipAt = TPO.indexOf('clipProfileToCandles("TPO");');
    expect(clipAt).toBeGreaterThan(TPO.indexOf('ctx.clip("evenodd");'));
    expect(TPO).toContain("const tpoCandles = profileCandleCut().rects.filter(");
    between(TPO, "const x = leftEdge + k * cellW;", "if (onCandle(x, y, cellW, h)) { tpoCellsYielded++; continue; }", "ctx.fillText(r.letters[k], x, y + h / 2 + 0.5);");
    expect(TPO).toContain("ds.tpoCellsYielded = String(tpoCellsYielded);");
    expect(TPO).toContain("delete ds.tpoCellsYielded;");
  });
});

describe("2 · ONE level grammar: the chip, placed clear of every candle body and wick", () => {
  const chip = slice("const levelChip = (y: number, text: string, ink: string, opts:", "const quietWords = (text: string, pref: WordsAt,", 1500);

  it("both chip sites print in the owner's readable chip type, not the old 9px words", () => {
    expect(chip).toContain("ctx.font = LEVEL_CHIP_FONT;");
    expect(VP).toMatch(/ctx\.font = LEVEL_CHIP_FONT;\s*const chipTxt = vpPrice\(p\);/);
  });

  it("the chip's slots are the pure owner's, and its keep-out is bodies + wicks + every chip, strict", () => {
    expect(chip).toContain("const slots = levelChipSlots({ y: yy, w: cw, rightX, floorY, footY: pane0Bottom - 2 });");
    expect(chip).toMatch(/\[\.\.\.keepOut\(\), \.\.\.profileCandlesAt\(slots\.top, slots\.bottom\)\]/);
    expect(chip).toMatch(/blockers: floatingChips, strict: true, alternates \}/);
    expect(chip).toContain("floatingChips.push({ x: r.x, y: r.y, w: r.w, h: r.h });");
  });

  it("every species names its levels through it — no species prints a level word of its own", () => {
    expect(CHART).not.toContain("stackLabel(");
    expect(LIVING).toMatch(/levelChip\(\+yr, text, ink\);/);
    expect(COMPOSITE).toMatch(/levelChip\(\+yr, text, ink\);/);
    expect(VRP).toMatch(/levelChip\(\+yr, text, ink\);/);
    expect(FUSED).toMatch(/levelChip\(\+y, label, /);
    expect(TPO).toContain("for (const c of tpoChips) levelChip(c.y, c.text, c.ink, { leftX: leftEdge + colMax + 8, minX: leftEdge + colMax + 4 });");
    // The old per-species fillText beside a lane is gone.
    expect(COMPOSITE).not.toContain("ctx.fillText(text, right - width - 8, +yr);");
    expect(VRP).not.toContain("ctx.fillText(text, right - width - 8, +yr);");
    expect(TPO).not.toContain("ctx.fillText(text, leftEdge + colMax + 8, y);");
  });

  it("species captions leave the header band and are keep-out placed at their own lane", () => {
    expect(COMPOSITE).not.toContain("const ty = 50;");
    expect(VRP).not.toContain("const ty = 66;");
    expect(COMPOSITE).toMatch(/quietWords\(text, \{ x: right, y: top - 18, right: true \}/);
    expect(VRP).toMatch(/quietWords\(text, \{ x: right, y: top - 18, right: true \}/);
    const words = slice("const quietWords = (text: string, pref: WordsAt,", "const livingLane =", 800);
    expect(words).toContain("const clampY = (y: number) => Math.max(HEADER_FLOOR_Y, Math.min(y, pane0Bottom - h - 2));");
    expect(words).toMatch(/\[\.\.\.keepOut\(\), \.\.\.profileCandlesAt\(/);
    expect(words).toContain("blockers: floatingChips, strict: true, alternates: alts");
  });

  it("M47: the VP columns name each level with a gold price chip at the axis edge; a number a candle stands on is withheld", () => {
    // Pin updated 2026-09-26: the chip travels with the level's name as ONE
    // pair (placeLevelPair; see §8), its slide no longer capped at 40px.
    expect(VP).toContain("const pair = placeLevelPair({");
    expect(VP).toContain("const cr = pair.chip;");
    expect(VP).toContain("forceChips.push({ ...cr });");
    expect(VP).toMatch(/if \(rectHits\(\{ x: vpRight - 4 - twN - 2, y: wd\.y - 7, w: twN \+ 4, h: 14 \}, profileCandlesAt\(wd\.y - 7, wd\.y \+ 7\)\) > 0\) \{\s*vpWordsWithheld\+\+;\s*continue;/);
    expect(VP).toContain('vpLevel(pocPrice, vpPocRgba, "POC");');
  });
});

describe("3 · the P-110 body: solid, in the family's ink, with rules across the plot", () => {
  it("fills with LIVING_BODY_CANON's strengths through the ink owner's roles — not the old 4–40% wash", () => {
    expect(LIVING).toContain('g.addColorStop(0, pk.rgbaAs("VALUE", "ANCHOR", C.tailBase));');
    expect(LIVING).toContain('gv.addColorStop(0, pk.rgbaAs("VALUE", "ANCHOR", C.valueBase));');
    expect(LIVING).toContain('gv.addColorStop(1, pk.rgbaAs("VALUE", "ANCHOR", C.valueTip));');
    expect(LIVING).not.toMatch(/pk\.rgbaAs\("VALUE", "ANCHOR", 0\.(40|16|04)\)/);
    expect(LIVING).toContain("ds.livingProfileBodyInk = `SOLID:${C.valueBase}-${C.valueTip}`;");
  });

  it("the solid body yields to every word already on the glass in its room, and to the live price line (one clip per hole)", () => {
    between(LIVING, "const bodyYields = floatingChips.filter(c => c.x < rightEdge + 2 && c.x + c.w > rightEdge - bodyW - 2);", 'ctx.clip(hole, "evenodd");', "ctx.fillStyle = g; ctx.fill(bodyPath);");
    expect(LIVING).toContain("const yLastL = lastBarL ? srs.priceToCoordinate(lastBarL.close) : null;");
    expect(LIVING).toContain("const holes = [...bodyYields, ...(yLastL != null ? [{ x: rightEdge - bodyW - 4, y: +yLastL - 1.5, w: bodyW + 8, h: 3 }] : [])];");
    expect(LIVING).toContain("for (const c of holes) {");
    expect(LIVING).toContain('ds.livingProfileBodyYields = `${bodyYields.length}${yLastL != null ? "+PRICE_LINE" : ""}`;');
  });

  it("VAH / VAL are solid rules from the plot's left edge to its right edge; POC is dashed across it with a dot on the body", () => {
    expect(LIVING).toContain("ctx.moveTo(0, Math.round(+yl) + 0.5); ctx.lineTo(plotRight, Math.round(+yl) + 0.5);");
    expect(LIVING).toContain("ctx.setLineDash([...C.pocRuleDash]); ctx.strokeStyle = pk.rgba(\"POC\", C.pocRuleAlpha);");
    expect(LIVING).toContain("ds.livingProfilePocMark = `DOT:${Math.round(px)},${Math.round(+yp)}`;");
  });

  it("the memory ghost stays grey and BEHIND the gold: painted before the body", () => {
    const ghost = LIVING.indexOf('ctx.globalAlpha = att.alpha("sessionGhosts");');
    const body = LIVING.indexOf("ctx.fillStyle = g; ctx.fill(bodyPath);");
    expect(ghost).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(ghost);
  });

  it("Composite and Visible Range speak the family's ink (bone / gold), not a steel of their own", () => {
    expect(COMPOSITE).not.toMatch(/rgba\((184,190,196|160,166,172),/);
    expect(COMPOSITE).toContain('pk.rgba("VALUE", +((0.34 + 0.34 * age) * band).toFixed(2))');
  });
});

describe("4 · silence is named", () => {
  it("Structure: a short or crowded leg draws its rule and says why its shape is withheld", () => {
    expect(STRUCTURE).toContain("const form = structureProfileForm(sp.legBars, room);");
    expect(STRUCTURE).toContain('if (form === "HISTOGRAM") {');
    expect(STRUCTURE).toMatch(/const silence = structureSilenceWords\(\{ form, kind: sp\.anchor\.kind, anchorPrice: sp\.anchor\.price, legBars: sp\.legBars, poc: sp\.poc, dp: pxDp \}\);/);
    expect(STRUCTURE).toContain("ds.structureProfileSilence = form;");
    expect(STRUCTURE).toContain("delete ds.structureProfileSilence;");
  });

  it("Fusion: on and not drawn, it names which silence — in the family's quiet words, placed clear of candles", () => {
    expect(FUSION).toContain('const words = fu ? fusionSilenceWords(fu, pxDp) : "PROFILE FUSION · silent — no reading";');
    expect(FUSION).toMatch(/quietWords\(words, \{ x: endXS, y: HEADER_FLOOR_Y \+ 8, right: true \}/);
    expect(FUSION).toContain('ds.profileFusionSilence = fu ? fu.reason : "NO_READING";');
  });
});

describe("5 · memory is a ghost, not a spray", () => {
  it("keeps the tier's count of levels nearest to price, and paints only those", () => {
    expect(MEMORY).toContain("const tierM = att.tierOf(\"profileMemory\");");
    expect(MEMORY).toContain("nearestMemoryLevels(mem.levels, lastCloseM, MEMORY_LEVEL_CAP[tierM]);");
    // Shelves, POC shelves and lines all walk the kept levels.
    expect(MEMORY).toContain("if (!keptSessions.has(l.sessionsAgo)) continue;");
    expect((MEMORY.match(/for \(const l of memLevels\)/g) ?? []).length).toBe(2);
    expect(MEMORY).toContain("ds.profileMemoryShown = `${memLevels.length}/${mem.levels.length}:${tierM}`;");
  });
});

describe("6 · the family's receipts", () => {
  it("publishes the cut-out and the chips after the last species, and withdraws them when nothing painted", () => {
    expect(CHART).toContain('if (profileCutBy.size > 0) ds.profileCandleCut = `${[...profileCutBy].join(",")}:${profileCut ? profileCut.rects.length : 0}`;');
    expect(CHART).toMatch(/else delete ds\.profileCandleCut;/);
    expect(CHART).toContain("if (levelChipsPlaced > 0) ds.profileLevelChips = `${levelChipsPlaced}:${levelChipsMoved}M:${levelChipsYielded}Y`;");
    expect(CHART).toMatch(/else delete ds\.profileLevelChips;/);
    expect(CHART).toContain("ds.vpLevelChips = String(vpChipsPlaced);");
    expect(CHART).toMatch(/delete ds\.vpLevelChips; delete ds\.vpWordsWithheld;/);
  });

  it("the new geometry receipts are withdrawn every frame before the stack paints", () => {
    const list = slice("const PROFILE_GEOMETRY_RECEIPTS = [", "] as const;", 200);
    for (const k of ["livingProfileRules", "livingProfileBodyInk", "livingProfilePocMark", "compositeCaption", "visibleRangeCaption"]) {
      expect(list, k).toContain(`"${k}"`);
    }
  });
});

describe("7 · no generic rectangle, nothing under the header chrome (P-110 side-by-side, serving 2026-09-26 03:57 CDT)", () => {
  // Sentinel read TSLA 15m, Living alone, beside P-110: (1) a dark-grey
  // translucent box with a stepped top behind the session's candles — the
  // Living movie's developing VAH…VAL ribbon (GP12 §43, generic rectangle);
  // (2) the body's upper tip climbing under the INSPECT DOM chip.
  const movie = (() => {
    const a = MIGRATION.indexOf('ctx.save(); ctx.globalAlpha = att.alpha("livingProfileMovie");');
    const b = MIGRATION.indexOf("ds.livingProfileMovie = ", a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return MIGRATION.slice(a, b);
  })();

  it("the Living movie paints no value-area ribbon — no wash fill, no VAH→VAL closed path — only its POC trail", () => {
    expect(movie.length).toBeGreaterThan(600);
    expect(movie).not.toMatch(/ctx\.fillStyle = pk\.rgba\("WASH"/);
    expect(movie).not.toContain("o.q.vah");
    expect(movie).not.toContain("xy[k].q.val");
    expect(movie).not.toContain("ctx.closePath();");
    expect(movie).toContain("const y = srs.priceToCoordinate(o.q.poc);");
    // The receipt names what is on the glass.
    expect(MIGRATION).toContain("ds.livingProfileMovie = `POC_TRAIL:${xy.length}:NO_RIBBON`;");
  });

  it("the Living body is clipped between HEADER_FLOOR_Y and the pane foot, after its chip holes, inside the save of its fill", () => {
    between(
      LIVING,
      "ctx.rect(0, HEADER_FLOOR_Y, plotRight, Math.max(0, pane0Bottom - HEADER_FLOOR_Y));",
      "ctx.clip();",
      "ctx.fillStyle = g; ctx.fill(bodyPath);",
    );
    const holes = LIVING.indexOf("for (const c of holes) {");
    const floor = LIVING.indexOf("ctx.rect(0, HEADER_FLOOR_Y, plotRight,");
    const fill = LIVING.indexOf("ctx.fillStyle = g; ctx.fill(bodyPath);");
    expect(holes).toBeGreaterThan(-1);
    expect(floor).toBeGreaterThan(holes);
    expect(LIVING.slice(floor, fill)).not.toContain("ctx.restore();");
    expect(LIVING).toContain('ds.livingProfileBodyClipped = bodyAboveFloor > 0 ? `HEADER:${bodyAboveFloor}` : "NONE";');
    const list = slice("const PROFILE_GEOMETRY_RECEIPTS = [", "] as const;", 200);
    expect(list).toContain('"livingProfileBodyClipped"');
  });
});

describe("8 · live defects, serving 2026-09-26 03:59–04:00 CDT", () => {
  it("VP (Regime desk): ONE label per level — name + price chip as one pair, clear of candles and chips", () => {
    expect(VP).toMatch(/const pair = placeLevelPair\(\{[\s\S]*?keepOut: profileCandlesAt\(bandTop, bandBot\), blockers: forceChips,\s*\}\);/);
    // The name is the tag alone — the price lives only in the chip.
    expect(VP).toContain("ctx.fillText(tag, pair.name.x + 3, pair.name.y + pair.name.h / 2 + 0.5);");
    expect(VP).not.toMatch(/`\$\{tag\} \$\{vpPrice\(p\)\}`/);
    expect(VP).toContain("ctx.fillText(chipTxt, cr.x + cr.w / 2, cr.y + cr.h / 2 + 0.5);");
    // The old 40px slide cap (why chips stayed on the Sep 25 bodies) is gone.
    expect(VP).not.toContain("minX: Math.max(4, colLeft - 40)");
    expect(CHART).toContain("ds.vpLevelPairsMoved = String(vpPairsMoved);");
  });

  it("Structure: the silence chip stays inside the plot right of the left chrome; its LEG POC is a level chip", () => {
    expect(STRUCTURE).toContain("const cx = Math.max(LEFT_CHROME_RIGHT, Math.min(x, maxX >= LEFT_CHROME_RIGHT ? maxX : plotRight - LEVEL_CHIP_EDGE_GAP - w));");
    between(STRUCTURE, "chip(silence, x0 + 4,", "levelChip(+ypS, `LEG POC ${sp.poc.toFixed(pxDp)}`, pk.rgba(\"POC\", 0.95));", "ds.structureProfileSilence = form;");
  });

  it("Composite sits against the axis: Living is the outermost lane whenever it shares the edge", () => {
    expect(CHART).toContain('const livingOuter = orderedStack.includes("LIVING") && orderedStack.length > 1;');
    expect(CHART).toContain('const edgeOrder = livingOuter ? [...orderedStack.filter(s => s !== "LIVING"), "LIVING" as const] : orderedStack;');
    expect(CHART).toContain("stackOrder.splice(0, stackOrder.length, ...edgeOrder);");
    const at = CHART.indexOf("stackOrder.splice(0, stackOrder.length, ...edgeOrder);");
    expect(CHART.indexOf("const stackPlan = planProfileStack({")).toBeGreaterThan(at);
  });

  it("Fusion draws the fused OBJECT itself: auto-paired from two stack species, recomputed body with a rim, family-ink chips, parents receding", () => {
    expect(FUSED).toContain('const pair = stackPrefsRef.current.fusion ?? autoPair;');
    expect(FUSED).toMatch(/layerOnRef\.current\.profileFusion === true && stackOrder\.length >= 2/);
    expect(FUSED).toContain("const fr = fuseProfiles(source(pair[0]), source(pair[1]));");
    expect(FUSED).toContain("fusedTips.push({ x: spanR - w, y: (+y0 + +y1) / 2 });");
    expect(FUSED).toContain('line(f.poc, `FUSED POC ${f.poc.toFixed(pxDp)}`, [], pk.rgba("POC", 0.95));');
    expect(FUSED).not.toContain("levelChip(+y, label, `rgba(${flowColorsRef.current.fused},1)`);");
    expect(CHART).toContain("fusedParents: fusionObjectRef.current ? (stackPrefsRef.current.fusion ?? fusionObjectRef.current.sources.map(s => s.species as StackSpecies)) : [],");
  });
});

describe("9 · every species wears its organism glyph (Garden 11 recognition test, `&proof=nolabels`)", () => {
  const painter = slice("function paintOrganismGlyph(kind: OrganismKind,", "function drawWMVP(", 1200);

  it("the painter draws only the pure owner's geometry — no text — placed clear of candles and chips, and records it", () => {
    expect(painter).toContain("for (const p of organismGlyph(kind)) {");
    expect(painter).not.toMatch(/fillText|strokeText/);
    expect(painter).toMatch(/placeClearOfKeepOut\(pref, profileCandlesAt\(/);
    expect(painter).toContain("minX: LEFT_CHROME_RIGHT, blockers, strict: true, alternates: alts,");
    expect(painter).toContain("if (spot.onCandles) return false;");
    expect(painter).toContain("profileGlyphs.push(tag);");
    expect(CHART).toContain('if (profileGlyphs.length > 0) ds.profileSpeciesGlyphs = profileGlyphs.join(",");');
    expect(CHART).toMatch(/else delete ds\.profileSpeciesGlyphs;/);
  });

  it("each species paints its own glyph, in its own block", () => {
    const expectGlyph = (block: string, name: string, kind: string) =>
      expect(block, `${name} paints no ${kind} glyph`).toMatch(new RegExp(`paintOrganismGlyph\\("${kind}"`));
    expectGlyph(LIVING, "Living", "LIVING");
    expectGlyph(LIVING, "DNA (in Living's block)", "DNA");
    expectGlyph(COMPOSITE, "Composite", "COMPOSITE");
    expectGlyph(VRP, "Visible Range", "VRP");
    expectGlyph(FUSED, "the fused object", "FUSION");
    expectGlyph(TPO, "TPO", "TPO");
    expectGlyph(STRUCTURE, "Structure", "STRUCTURE");
    expectGlyph(FUSION, "Profile Fusion", "FUSION");
    expectGlyph(MEMORY, "Memory", "MEMORY");
    expect(VP).toContain('paintOrganismGlyph(span === "SESSION" ? "SESSION" : "FIXED", vpRight - vpW / 2,');
    expect(VP).toContain('if (wall) paintOrganismGlyph("SESSION", x0, yT - 12, pk.rgba("ANCHOR", 0.95), forceChips, "SESSION_TICK");');
    expect(FUSED).toContain('paintOrganismGlyph("FUSION", mx, my, `rgba(${FU},0.95)`, floatingChips, "FUSION_LINK");');
  });

  it("TPO paints NO fillText at MID/FAR: letters are gated on NEAR; otherwise time-coloured blocks", () => {
    expect(TPO).toContain('const asText = att.permission.paints("nearGeometry") && rowH >= 7 && cellW >= ctx.measureText("M").width;');
    const texts = [...TPO.matchAll(/ctx\.fillText\(/g)];
    expect(texts.length, "TPO's only fillText is the NEAR letter").toBe(1);
    between(TPO, "if (asText) {", "ctx.fillText(r.letters[k], x, y + h / 2 + 0.5);", "} else {");
    expect(TPO).toContain("ctx.fillStyle = ink(tpoPeriodInk(pk.role.TAIL, pk.role.ANCHOR, late), base * (0.45 + 0.45 * late));");
  });

  it("Composite is a gapless body with session tint bands; VRP is framed by four lane corners; Structure is a cube box", () => {
    expect(COMPOSITE).toContain("const hRow = Math.max(1, rowH);");
    expect(COMPOSITE).toContain("const band = k % 2 === 1 ? 0.72 : 1;");
    expect(VRP).toContain("ctx.moveTo(xr - c, +yL); ctx.lineTo(xr, +yL); ctx.lineTo(xr, +yL - c);");
    expect(VRP).toContain("ds.visibleRangeGeometry = `RAILS+LANE_CORNERS:");
    expect(STRUCTURE).toContain("ctx.strokeRect(x0 + 0.5, Math.round(top) + 0.5, x1 - x0, Math.round(bot - top));");
    expect(STRUCTURE).toContain("+CUBE_BOX");
  });
});
