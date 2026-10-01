/**
 * GARDEN 15 §2–§7 / GARDEN 16 §20 — DERIVATIVES PRESSURE IS A WORLD, NOT A CARD.
 *
 * Emergency order (2026-09-27): "build the static Founder form first" — the
 * derivatives environment under price, walls as material, the transition as a
 * front. These pins keep the manifestation from sliding back into a band + a
 * label, and keep its truth chain (Cboe delayed → one owner → canvas) intact.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
const block = (() => {
  const a = MC.indexOf("GARDEN 15 §2–§7 · DERIVATIVES PRESSURE");
  const b = MC.indexOf("T-210 / F10 · MTF IS NOT FOUR CHARTS");
  return a > 0 && b > a ? MC.slice(a, b) : "";
})();

describe("the pressure world on the glass", () => {
  it("paints only the room's ONE compilation, through the governor", () => {
    expect(block.length).toBeGreaterThan(0);
    // Garden 18 §XXII (2026-10-01): two lenses on one owner — the field and the masonry.
    expect(block).toContain('const fieldOn = layerOnRef.current.derivativesPressure === true && att.paints("derivativesPressure");');
    expect(block).toContain('const wallsOn = layerOnRef.current.brickWalls === true && att.paints("brickWalls");');
    expect(block).toContain('if ((fieldOn || wallsOn) && srs && dp) {');
    expect(block).toContain("for (const w of wallsOn ? dp.walls : []) {");
    expect(block).not.toMatch(/selectDerivativesPressure\(/);
    // Tests are observed only inside the positioning's relevance window — the
    // same window on every timeframe (TSLA 1D once counted a year of bars).
    expect(CD).toContain("const since = Date.now() / 1000 - WALL_TEST_WINDOW_DAYS * 86_400;");
    expect(CD).toMatch(/selectDerivativesPressure\(derivativesReceipt\.receipt, chartBars\.filter\(b => Number\(b\.time\) >= since\), Date\.now\(\)\)/);
    expect(CD).toContain("/api/market-data/cboe/options?symbol=");
  });
  it("FIELD: every price level tinted by its pressure, with climate texture (strata / wind)", () => {
    expect(block).toContain("const geo = dp.geography;");
    expect(block).toMatch(/net >= 0 \? `rgba\(84,140,204/);
    expect(block).toMatch(/: `rgba\(222,108,44/);
  });
  it("FRONT: zero-gamma transition as a weather front (triangles + semicircles)", () => {
    expect(block).toContain("ZERO-GAMMA FRONT");
    expect(block).toMatch(/Triangles point into the amplifying side/);
  });
  it("WALLS: brick courses in running bond with depth; cracks = observed tests; lifecycle changes material", () => {
    expect(block).toMatch(/const off = c % 2 === 0 \? 0 : brickW \/ 2;/);
    // Garden 16 reconstruction (2026-09-27): masonry — cracks still = observed
    // tests (≤ 6), weakening knocks bricks out as dark sockets, breaking breaches
    // every course with rubble below, broken leaves the ghost + a rubble scar.
    expect(block).toContain("const crackCount = broken ? 0 : Math.min(6, w.tests);");
    expect(block).toMatch(/if \(weak && r < 0\.2\) \{/);
    expect(block).toMatch(/if \(broken\) \{/);
    expect(block).toContain("Top face (the coping)");
    expect(block).toContain("The breach: rubble fallen below the gap");
    expect(block).toContain("The scar: a rubble line");
  });
  it("price stays sovereign; words are placed and permitted; off-camera walls are said", () => {
    expect(block).toContain('ctx.clip(cutD, "evenodd");');
    expect(block).toContain('const dpSpeaks = att.speaks("derivativesPressure");');
    expect(block).toContain("placeClearOfKeepOut(");
    expect(block).toContain("OFF_CAMERA");
  });
  it("truth is named on the glass: source, delay, OI clock, epistemic class", () => {
    // The source and its OI clock come from ONE owner (Cboe delayed · OI prior
    // session, or Deribit public · OI current) — never retyped at the paint.
    expect(block).toContain("const srcW = positioningSourceWords(dp.source);");
    expect(block).toContain("${srcW.name} · ${srcW.oi} · INFERRED");
  });
});

describe("a wall is an object: click → one selection → Inspect explains", () => {
  const SEL = readFileSync("src/lib/marketData/viewModels/chartSelection.ts", "utf8");
  const IT = readFileSync("src/components/chart/ChartInspectTicket.tsx", "utf8");
  it("the glass publishes the wall bodies it drew and hit-tests them", () => {
    expect(block).toContain("pressureWallHitRef.current.push({ strike: w.strike");
    expect(MC).toContain("onSelectPressureWall?.(wallHit.strike);");
    expect(block).toContain("ds.pressureWallHitAt =");
  });
  it("the selection is the ONE reducer's PRESSURE_WALL kind; the room scopes it to its chart", () => {
    expect(SEL).toContain('readonly kind: "PRESSURE_WALL";');
    expect(CD).toContain('selection: { kind: "PRESSURE_WALL", symbol, timeframe, strike }');
    // Garden 18: each lens releases its own object kind when switched off.
    expect(CD).toContain('if (!derivativesPressureOn) actOnChartSelection({ type: "clear", kinds: ["PRESSURE_FRONT"] });');
    expect(CD).toContain('if (!brickWallsOn) actOnChartSelection({ type: "clear", kinds: ["PRESSURE_WALL"] });');
  });
  it("Inspect answers what / where / evidence / class / fidelity / life / contradiction / lineage", () => {
    for (const w of ["What ·", "Where ·", "Evidence ·", "Class ·", "Fidelity ·", "Life ·", "Contradiction ·", "Lineage ·"]) expect(IT).toContain(w);
    expect(IT).toContain("NO LONGER A WALL");
  });
});

describe("the environment is inspectable: click the zero-gamma front", () => {
  const SEL = readFileSync("src/lib/marketData/viewModels/chartSelection.ts", "utf8");
  const IT = readFileSync("src/components/chart/ChartInspectTicket.tsx", "utf8");
  it("the front publishes its hit band and a click selects it through the one reducer", () => {
    expect(block).toContain("pressureFrontHitRef.current = { y, x1: plotRightD };");
    expect(MC).toContain("if (front && x <= front.x1 && Math.abs(y - front.y) <= 6) {");
    expect(SEL).toContain('readonly kind: "PRESSURE_FRONT";');
    expect(CD).toContain('selection: { kind: "PRESSURE_FRONT", symbol, timeframe }');
  });
  it("Inspect explains the environment: what, where, climate, evidence, class, fidelity, lineage", () => {
    for (const w of ["DERIVATIVES ENVIRONMENT", "What · the price where expected dealer hedging flips", "Climate at price", "Class · INFERRED", "Lineage · {positioningSourceWords(pressureFront.source).name} OI + IV"]) expect(IT).toContain(w);
  });
});

describe("no lookahead in replay (Garden 16 §46, serving c216f713)", () => {
  it("while replay drives the camera, a snapshot later than the replay clock is withheld before the owner runs", () => {
    const vm = CD.slice(CD.indexOf("const derivativesPressureVM = React.useMemo"), CD.indexOf("// T-210 — the ancestry the glass painted"));
    const guard = vm.indexOf("if (cameraWalksHistory && chartBars.length) {");
    expect(guard).toBeGreaterThan(-1);
    expect(vm).toContain("if (!Number.isFinite(asOfMs) || asOfMs / 1000 > clockSec) {");
    expect(vm).toContain('reason: "AFTER_REPLAY_CLOCK"');
    expect(guard).toBeLessThan(vm.indexOf("return selectDerivativesPressure("));
    expect(vm).toContain("[derivativesPressureOn, derivativesReceipt, symbol, chartBars, cameraWalksHistory]");
  });

  it("the glass says why it is silent", () => {
    expect(block).toContain('`${lensName} · withheld in replay — this positioning was published after the replay clock`');
  });
});

describe("the camera holds the walls it is showing (Garden 16 reconstruction §11)", () => {
  it("with the pressure world on, the nearest wall above/below (≤ WALL_CAMERA_REACH of price) joins the price range", () => {
    expect(MC).toContain("const WALL_CAMERA_REACH = 0.04;");
    expect(MC).toContain("if ((layerOnRef.current?.derivativesPressure === true || layerOnRef.current?.brickWalls === true) && dpCam && dpCam.drawn) {");
    expect(MC).toContain("const near = dpCam.walls.map(w => w.strike).filter(k => Math.abs(k - last) / last <= WALL_CAMERA_REACH);");
    expect(MC).toContain("return { priceRange: { minValue: lo - span * (wallBottom ? 0.3 : 0.06), maxValue: hi + span * (wallTop ? 0.34 : 0.06) } };");
  });
});

describe("climate is material, bound to the same exposure (Garden 16 reconstruction §26)", () => {
  it("damping bands are steel courses (seams + grain); amplifying bands carry ember streaks away from the front that hold in STILL", () => {
    expect(block).toContain("CLIMATE AS MATERIAL");
    expect(block).toContain("const emberDrift = motionOnRef.current ? (performance.now() / 1000) * 18 : 0;");
    expect(block).toContain("const away = dp.zeroGamma != null && ga.price > dp.zeroGamma ? -1 : 1;");
    expect(block).toContain("One pre-rendered tapered streak, stamped");
  });
});

describe("wall contact is caused by the forming candle, never by sprites (five-hour order)", () => {
  it("reads only the newest bar's real high/low against the strike, on the candle's price scale", () => {
    expect(block).toContain("const lb = (barsRef.current ?? [])[(barsRef.current ?? []).length - 1];");
    // 2026-09-28: the decision lives in the pure owner (wallContact), proven
    // from fixtures; the paint hands it the newest bar's real prices and the
    // face's price on the candle's own scale.
    expect(block).toContain("const wc = wallContact({ high: Number(lb.high), low: Number(lb.low), close: Number(lb.close), strike: w.strike, facePrice });");
    expect(block).toContain("const fp = srs?.coordinateToPrice(faceY);");
    expect(block).toContain("const state = wc.state;");
    expect(block).toContain("painted.push(`CONTACT@${w.strike}:${state}:${prox.toFixed(2)}`);");
  });
  it("dust moves only in LIVE and is bounded", () => {
    expect(block).toMatch(/if \(motionOnRef\.current\) \{[\s\S]*?for \(let k = 0; k < 8; k\+\+\)/);
  });
});

describe("positioning source words — one owner", () => {
  it("Cboe says delayed + prior-session OI; Deribit says public + current OI", async () => {
    const { positioningSourceWords } = await import("@/lib/marketData/cboeDelayedOptions");
    expect(positioningSourceWords("CBOE_DELAYED")).toEqual({ name: "Cboe delayed", oi: "OI prior session" });
    expect(positioningSourceWords("DERIBIT_PUBLIC")).toEqual({ name: "Deribit public", oi: "OI current" });
  });
});

describe("the zero-gamma front's name never sits on a candle (serving SPY 1h, 2026-09-28)", () => {
  it("searches above / below the line along it against the one candle cut-out; backed when nothing is clear", () => {
    expect(block).toContain("const candlesF = profileCandleCut().rects;");
    expect(block).toContain("spotF: for (const by of [y - 6, y + 15]) {");
    expect(block).toContain('painted.push(`FRONT_WORDS@${Math.round(fx)}:${clear ? "CLEAR" : "BACKED"}`);');
  });
});

describe("the zero-gamma name keeps out of the TPO column (serving ETH 15m, 2026-09-29)", () => {
  it("reserves the column from the ONE geometry owner while TPO paints", () => {
    expect(block).toContain('const tpoCol = layerOnRef.current.tpo && att.paints("tpo")');
    expect(block).toContain("if (![...candlesF, ...tpoCol, ...forceChips, ...floatingChips].some(");
    expect(MC).toContain("const { leftEdge, colMax } = tpoColumnGeometry(W, lensColumnActive ? QUESTION_LENS_COLUMN_RIGHT : null, railOcclusionX);");
  });
});
