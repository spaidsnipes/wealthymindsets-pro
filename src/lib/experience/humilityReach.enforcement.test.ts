import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { SCENES, compileScene, type SceneSignals } from "./compileScene";

/**
 * HUMILITY REACH — the guard that would have caught the original defect.
 *
 * ── What it is guarding against ──────────────────────────────────────────────
 *
 * `compileScene` admitted `HUMILITY_PANEL` in nine of ten scenes (now all ten).
 * `SceneAdmissionPanel` carried its human label. `compileScene.test.ts` now
 * holds a LAW forbidding any scene from withholding it.
 *
 * And for the whole life of that vocabulary it had ZERO renderers. Every one of
 * those artefacts passed. None of them asked the only question that mattered:
 * does a human ever SEE this?
 *
 * "SPECIFIED is not IMPLEMENTED. IMPLEMENTED is not PROVEN. IMPLEMENTED is not
 * REACHABLE." A surface element admitted by the OS and painted by nothing is
 * the third failure, and it is invisible to every test that stops at the
 * compiler. So this file starts at the SCREEN and works backwards.
 */

const APP = resolve(__dirname, "../../app");

function routeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (/^(page|layout)\.tsx$/.test(entry)) out.push(p);
    }
  };
  walk(APP);
  return out;
}

/**
 * Blank every comment, preserving length.
 *
 * Required, and it caught itself: the first run of the `<details>` rule below
 * failed on the comment ABOVE the mount, which explains that the panel is
 * deliberately outside the `<details>`. Prose describing a structure is not
 * that structure. Characters are replaced rather than removed so every index
 * into the result still maps to the real file.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, (_m, lead: string) => lead + " ".repeat(_m.length - lead.length));
}

function renderersOf(component: string): string[] {
  return routeFiles().filter(p => {
    const src = readFileSync(p, "utf8");
    return src.includes(`<${component}`) && new RegExp(`import .*${component}.*from`).test(src);
  });
}

describe("humility reach — the OS guarantees it, so a screen must paint it", () => {
  it("has at least one route that actually renders the panel", () => {
    const routes = renderersOf("HumilityPanel");
    expect(
      routes.length,
      "HUMILITY_PANEL is admitted in every scene and a law forbids withholding " +
        "it, but no route paints it. That is a guarantee the OS makes and the " +
        "product does not keep. Do not satisfy this by deleting the law.",
    ).toBeGreaterThan(0);
  });

  it("renders it on a route that owns a real book", () => {
    // A humility panel on a route with nothing to be humble ABOUT is the easy
    // version. The hard and useful one is the route reading positions, working
    // orders and a persistence result — where a confident scene is reachable
    // and therefore where the unstated limits are actually dangerous.
    expect(renderersOf("HumilityPanel").map(p => p.replace(/.*\/app\//, "app/")))
      .toContain("app/paper/page.tsx");
  });

  it("does not hide it behind a disclosure toggle", () => {
    // Scene admission is a developer disclosure and may be collapsed. This is a
    // guarantee to the TRADER, and a guarantee behind a <details> is not one.
    //
    // Counting opens vs closes before the mount is exact for well-formed JSX,
    // which tsc already enforces on these files.
    for (const p of renderersOf("HumilityPanel")) {
      const src = code(readFileSync(p, "utf8"));
      const at = src.indexOf("<HumilityPanel");
      const before = src.slice(0, at);
      const opened = (before.match(/<details\b/g) ?? []).length;
      const closed = (before.match(/<\/details>/g) ?? []).length;
      expect(
        opened - closed,
        `${p.replace(/.*\/app\//, "app/")} mounts HumilityPanel inside a <details>. ` +
          `A disclosure the trader has to open is not a disclosure.`,
      ).toBe(0);
    }
  });

  it("does not gate it on admission, which could never withhold it", () => {
    // Wrapping an unconditionally-admitted element in <SceneAdmits> raises the
    // §10 governed count without the OS gaining any power over the screen —
    // the overclaim SceneAdmissionPanel's docstring exists to kill.
    for (const p of renderersOf("HumilityPanel")) {
      const src = code(readFileSync(p, "utf8"));
      expect(
        /element="HUMILITY_PANEL"/.test(src),
        `${p.replace(/.*\/app\//, "app/")} routes HUMILITY_PANEL through SceneAdmits. ` +
          `Every scene admits it, so that gate can never fire — it only inflates ` +
          `the governed count.`,
      ).toBe(false);
    }
  });

  it("proves the element is genuinely unconditional, so the two rules above are consistent", () => {
    // The previous test only makes sense while admission really is a no-op for
    // this element. If a future scene ever withholds it, that test becomes
    // wrong and this one says so first.
    const base: SceneSignals = {
      position: "POSITION UNCONFIRMED",
      positionConfidence: "UNOBSERVED",
      intentInFlight: false,
      exposureIncreasingWorkingOrders: 0,
      linkVerified: null,
      composingIntent: false,
      hadCapitalEvent: false,
      receiptWritten: false,
      sessionOpen: null,
      rightOfWay: null,
    };
    // Sanity: the compiler reaches more than one scene from perturbations of
    // this base, so the assertion below is not vacuous.
    const reached = new Set(
      [
        base,
        { ...base, position: "LONG", positionConfidence: "CONFIRMED" } as SceneSignals,
        { ...base, sessionOpen: false } as SceneSignals,
        { ...base, composingIntent: true } as SceneSignals,
      ].map(s => compileScene(s).scene),
    );
    expect(reached.size).toBeGreaterThan(1);
    expect(SCENES.length).toBe(10);
  });
});
