import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);

describe("charts Asset-10 hierarchy", () => {
  it("renders MARKET before the supporting decision spine", () => {
    const marketPanel = source.indexOf('id="wm-chart-category-panel-chart"');
    const spine = source.indexOf("<DecisionSpineBand");

    expect(marketPanel, "chart MARKET panel is missing").toBeGreaterThan(0);
    expect(spine, "decision spine is missing").toBeGreaterThan(marketPanel);
    expect(source).not.toContain("<BottomIndexBar");
  });

  it("attaches one desktop rail and falls back to one band on narrow/options views", () => {
    const marketRoom = source.indexOf('data-wm-market-room="true"');
    const marketColumn = source.indexOf('data-wm-market-column="true"');
    const toolbar = source.indexOf("<ChartToolbar", marketColumn);
    const secondaryPanel = source.indexOf('id="wm-chart-category-panel"');
    const chartPanel = source.indexOf('id="wm-chart-category-panel-chart"');
    const optionsChain = source.indexOf("<OptionsChain", chartPanel);
    const rail = source.indexOf('<DecisionSpineBand {...decisionSpineProps} presentation="rail" />');

    expect(marketRoom, "shared market room is missing").toBeGreaterThan(0);
    expect(marketColumn, "MARKET column is missing").toBeGreaterThan(marketRoom);
    expect(toolbar, "toolbar is not owned by MARKET").toBeGreaterThan(marketColumn);
    expect(secondaryPanel).toBeGreaterThan(toolbar);
    expect(chartPanel).toBeGreaterThan(secondaryPanel);
    expect(optionsChain).toBeGreaterThan(chartPanel);
    expect(rail).toBeGreaterThan(optionsChain);
    expect(source.slice(marketRoom, marketColumn)).not.toContain("<ChartToolbar");
    expect(source.match(/<DecisionSpineBand\b/g) ?? []).toHaveLength(2);
    expect(source.match(/presentation="rail"/g) ?? []).toHaveLength(1);
    expect(source.match(/presentation="band"/g) ?? []).toHaveLength(1);
    expect(source).toMatch(/\{!narrowViewport && !optionsOpen && \(\s*<DecisionSpineBand \{\.\.\.decisionSpineProps\} presentation="rail" \/>\s*\)\}/);
    expect(source).toMatch(/\{\(narrowViewport \|\| optionsOpen\) && \(\s*<DecisionSpineBand \{\.\.\.decisionSpineProps\} presentation="band" \/>\s*\)\}/);
    expect(source.match(/const decisionSpineProps =/g)).toHaveLength(1);
  });

  it("keeps order-flow evidence behind the Smart Money doorway", () => {
    expect(source).not.toContain("<OrderFlowCockpitStrip");
    expect(source.match(/<SmartMoneyPanel/g)).toHaveLength(1);
    expect(source).toContain("smartMoneyOpen");
  });

  it("keeps MARKET dominant while desktop decision context stays attached", () => {
    const spine = readFileSync(
      resolve(process.cwd(), "src/components/experience/DecisionSpineBand.tsx"),
      "utf8",
    );

    expect(source).toContain('data-wm-market-column="true" style={{ flex:1');
    // C-101 (IFC 19 SEP 2026) requires the /charts camera at 70% of the 1440
    // floor area; it measured 50.4%. The rail gave ~72px back by folding RISK,
    // WHY and the fidelity plaque behind the S-501 disclosure. The assertion
    // still pins a CLAMP rather than a fixed width — the original point of this
    // line — and still refuses the fixed 320 it was written to extinguish.
    expect(spine).toContain('width: rail ? "clamp(232px, 17vw, 288px)" : undefined');
    expect(spine).not.toContain("width: rail ? 320 : undefined");
    expect(spine).not.toContain('clamp(260px, 22vw, 320px)');
  });

  /**
   * S-501 FOUR CHUNK ATTENTION BUDGET — "FIFTH CHUNK MUST COLLAPSE OR THE FRAME
   * FAILS." The desktop rail is chunk 2 (WAIT/DECISION). It was spending the
   * whole budget alone: eight chunks measured on a live 1440 render.
   *
   * This is a PRESERVATION rule, not a discovery rule. It has zero offenders
   * the day it lands; it exists to fail when a future cell is added to the rail
   * OUTSIDE the fold, which is exactly how the rail grew to eight in the first
   * place. Its acceptance evidence is the mutation proof in the shift baton,
   * not a count of what it caught today.
   */
  it("S-501: the rail folds its secondary organs and never deletes them", () => {
    const spine = readFileSync(
      resolve(process.cwd(), "src/components/experience/DecisionSpineBand.tsx"),
      "utf8",
    );

    // COLLAPSE, NOT DELETE (D-701 salvage note). All three organs must still be
    // constructed — a "fix" that dropped RISK on the floor would otherwise pass
    // the fold assertion below with flying colours.
    expect(spine, "RISK organ was deleted rather than folded").toContain("const riskCell =");
    expect(spine, "WHY organ was deleted rather than folded").toContain("const whyCell =");
    expect(spine, "fidelity organ was deleted rather than folded").toContain("const honestyCell =");

    // The fold itself, and the fact that the three organs are INSIDE it.
    const fold = spine.indexOf('<details data-testid="spine-detail-drawer"');
    expect(fold, "the S-501 fold is missing from the rail").toBeGreaterThan(0);
    const foldEnd = spine.indexOf("</details>", fold);
    expect(foldEnd).toBeGreaterThan(fold);
    const inside = spine.slice(fold, foldEnd);
    for (const organ of ["{honestyCell}", "{riskCell}", "{whyCell}"]) {
      expect(inside, `${organ} is not inside the fold`).toContain(organ);
    }

    // And the band keeps all six inline — the fold is the 1440 frame's rule,
    // not a repo-wide one. Without this, folding the BAND too would pass.
    expect(spine).toContain("{!rail && honestyCell}");
    expect(spine).toContain("{!rail && riskCell}");
    expect(spine).toContain("{!rail && whyCell}");
  });
});
