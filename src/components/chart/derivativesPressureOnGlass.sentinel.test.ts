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
    expect(block).toContain('layerOnRef.current.derivativesPressure === true && att.paints("derivativesPressure")');
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
    expect(block).toContain("const cracks = broken ? 0 : Math.min(6, w.tests);");
    expect(block).toMatch(/if \(weak && r < 0\.16\) continue;/);
    expect(block).toMatch(/if \(broken\) \{/);
    expect(block).toContain("a lit cap on top, a cast shadow below");
  });
  it("price stays sovereign; words are placed and permitted; off-camera walls are said", () => {
    expect(block).toContain('ctx.clip(cutD, "evenodd");');
    expect(block).toContain('const dpSpeaks = att.speaks("derivativesPressure");');
    expect(block).toContain("placeClearOfKeepOut(");
    expect(block).toContain("OFF_CAMERA");
  });
  it("truth is named on the glass: source, delay, OI clock, epistemic class", () => {
    expect(block).toContain("Cboe delayed · OI prior session · INFERRED");
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
    expect(CD).toContain('actOnChartSelection({ type: "clear", kinds: ["PRESSURE_WALL", "PRESSURE_FRONT"] })');
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
    for (const w of ["DERIVATIVES ENVIRONMENT", "What · the price where expected dealer hedging flips", "Climate at price", "Class · INFERRED", "Lineage · Cboe delayed OI + IV"]) expect(IT).toContain(w);
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
    expect(block).toContain('"DERIVATIVES PRESSURE · withheld in replay — this positioning was published after the replay clock"');
  });
});
