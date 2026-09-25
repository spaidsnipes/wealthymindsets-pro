/**
 * THE CAMERA TELLS THE PROFILES DOOR WHY VISIBLE RANGE IS SILENT — once per change.
 *
 * Only the canvas knows the camera's time range, so only it can say the
 * Visible Range species refused (too few bars in view, no volume). The door
 * read READY over an empty lane. The canvas now reports the refusal to the
 * room — and ONLY when it changes, because this runs inside the ~30fps paint
 * and a setState per frame would re-render the whole room at frame rate.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

describe("visible range refusal reaches the Profiles door", () => {
  const chart = read("src/components/chart/MainChart.tsx");
  const room = read("src/components/chart/ChartsDashboard.tsx");

  it("the canvas reports only on change", () => {
    expect(chart).toMatch(/if \(vrpRefusal !== lastVrpRefusalRef\.current\) \{\s*lastVrpRefusalRef\.current = vrpRefusal;\s*onVisibleRangeRefusalRef\.current\?\.\(vrpRefusal\);/);
  });

  it("the room feeds it into the door's refusals", () => {
    expect(room).toContain("onVisibleRangeRefusal={setVisibleRangeRefusal}");
    expect(room).toMatch(/visibleRange: visibleRangeRefusal \? \{ reason: visibleRangeRefusal \} : null,/);
  });

  it("Session VP's column decline reaches the door the same way (on change only)", () => {
    expect(chart).toContain('const sessionRefusal = attempts.find(a => a.profile === "SESSION")?.declined ?? null;');
    expect(chart).toMatch(/if \(sessionRefusal !== lastSessionVpRefusalRef\.current\) \{\s*lastSessionVpRefusalRef\.current = sessionRefusal;\s*onSessionVpRefusalRef\.current\?\.\(sessionRefusal\);/);
    expect(room).toContain("onSessionVpRefusal={setSessionVpRefusal}");
    expect(room).toMatch(/session: sessionVpRefusal \? \{ reason: sessionVpRefusal \} : null,/);
  });
});
