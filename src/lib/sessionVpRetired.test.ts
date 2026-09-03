import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Session VP side panel — retired per spec, and must stay retired.
 *
 * ChartsDashboard carried `{sessionVPOpen && <WMSessionVP .../>}`. The state
 * was initialised false and its ONLY setter was the panel's own
 * onClose(false), so nothing could ever set it true. The branch was
 * unreachable and the component could never render.
 *
 * The surrounding comment records why: "The large stationary Volume Profile
 * panel was REMOVED per spec… frees ~340px so Smart Money + the DOM ladder are
 * fully visible with no cutoffs."
 *
 * This matters beyond tidiness. The dead branch read like a working feature
 * that merely lacked a toggle — it is the most likely explanation for §13's
 * "Live VP production visual behavior still requires direct proof", and an
 * engineer chasing that gate (as I did) would naturally try to wire it up,
 * silently reversing a Founder spec decision.
 *
 * WMSessionVP.tsx is retained but must have no live mount. Restoring the panel
 * should be a deliberate spec change, not an accident of gate-chasing.
 */
describe("session VP panel stays retired", () => {
  it("ChartsDashboard does not mount WMSessionVP", () => {
    expect(code).not.toContain("<WMSessionVP");
    expect(code).not.toContain('from "./WMSessionVP"');
  });

  it("the unreachable sessionVPOpen state is gone", () => {
    expect(code).not.toContain("sessionVPOpen");
    expect(code).not.toContain("setSessionVPOpen");
  });

  it("the surviving on-chart VP surfaces are untouched", () => {
    // Session VP + Fixed VP still draw on the chart.
    expect(code).toContain("sessionVPChart");
    expect(raw).toContain("WM Session VP");
    expect(raw).toContain("WM Fixed VP");
  });

  it("the retired component itself is preserved for history/future use", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "src/components/chart/WMSessionVP.tsx"))).toBe(true);
  });
});
