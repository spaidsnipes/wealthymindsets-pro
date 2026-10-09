/**
 * AN IN-APP DOOR TO A SCENE LANDS ON THAT SCENE — and a scene never writes.
 *
 * Serving 9f4d784, 2026-10-09: the Academy's "Show me on a chart" (an in-app
 * link to /charts?scene=clean&on=fvg) landed on the member's own layers; a
 * fresh load of the same address was clean. The room rendered before the
 * router committed the address, so the scene owner read the page being left.
 * The room now hands its router params to the owner at the top of its mount.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { adoptProofSceneSearch, currentProofScene, proofSceneHoldsWrites, proofSceneValue } from "@/lib/chart/proofScene";

const ROOT = resolve(__dirname, "..", "..", "..");
type FakeWindow = { location: { search: string; href: string } };
const g = globalThis as unknown as { window?: FakeWindow };
const at = (href: string) => { const u = new URL(href); g.window = { location: { search: u.search, href } }; };
afterEach(() => { delete g.window; });

describe("an in-app door to a scene", () => {
  it("reads the scene the room mounted with while the address bar still shows the room being left", () => {
    at("https://wm.test/education");
    adoptProofSceneSearch("scene=clean&on=fvg");
    const scene = currentProofScene();
    expect(scene.active).toBe(true);
    expect(scene.clean).toBe(true);
    // A clean scene switches the member's saved layers off for this view…
    expect(proofSceneValue(scene, "wm_ofBrickWalls")).toBe(false);
    // …and never writes them.
    expect(proofSceneHoldsWrites()).toBe(true);
  });

  it("keeps the same scene once the router commits the address", () => {
    at("https://wm.test/education");
    adoptProofSceneSearch("scene=clean&on=fvg");
    at("https://wm.test/charts?scene=clean&on=fvg");
    expect(currentProofScene().clean).toBe(true);
    expect(proofSceneHoldsWrites()).toBe(true);
  });

  it("a later in-room rewrite of the address is read live, and writes stay held for that mount", () => {
    at("https://wm.test/charts?scene=clean");
    adoptProofSceneSearch("scene=clean");
    at("https://wm.test/charts");
    expect(currentProofScene().active).toBe(false);
    expect(proofSceneHoldsWrites()).toBe(true);
  });

  it("a plain in-app mount after a scene mount gets its saves back", () => {
    at("https://wm.test/charts?scene=clean");
    adoptProofSceneSearch("scene=clean");
    expect(proofSceneHoldsWrites()).toBe(true);
    at("https://wm.test/journal");
    adoptProofSceneSearch("");
    expect(currentProofScene().active).toBe(false);
    expect(proofSceneHoldsWrites()).toBe(false);
  });

  it("the chart room adopts its params before it reads any preference", () => {
    const dash = readFileSync(resolve(ROOT, "src/components/chart/ChartsDashboard.tsx"), "utf8");
    const adopt = dash.indexOf("adoptProofSceneSearch(mountSearchParams");
    const repair = dash.indexOf("useState(repairChartPreferences)");
    const firstLsGet = dash.indexOf("function lsGet<T>");
    expect(adopt).toBeGreaterThan(-1);
    expect(adopt).toBeLessThan(repair);
    expect(adopt).toBeLessThan(firstLsGet);
  });
});
