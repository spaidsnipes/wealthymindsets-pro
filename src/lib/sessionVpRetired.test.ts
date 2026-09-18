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

  it("the surviving on-chart VP surfaces are still REACHABLE", () => {
    // Session VP + Fixed VP still draw on the chart, and the trader can still
    // switch them on. Both halves matter: state that nothing can set is exactly
    // the dead branch this file was written about.
    expect(code).toContain("sessionVPChart");
    expect(code).toContain("fixedVPActive");

    // The door changed. They used to be two standalone toolbar buttons labelled
    // "WM Session VP" and "WM Fixed VP"; they are now two entries in the
    // Profiles menu (Founder: "there should also have a profiles drop down for
    // all the different vps"). This test used to pin those button captions,
    // which made the LABELS the proof — so a rename read as a retirement. What
    // it always meant to assert is REACHABILITY, so it now asserts the door.
    expect(code).toContain("<ProfilesMenu");
    expect(code).toContain("SESSION:");
    expect(code).toContain("FIXED_RANGE:");
  });

  it("the retired component itself is preserved for history/future use", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "src/components/chart/WMSessionVP.tsx"))).toBe(true);
  });
});
