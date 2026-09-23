/**
 * EVERY LAYER THAT PAINTS OWES THE TRADER A DOOR.
 *
 * This sentinel exists because the defect it guards actually happened, and it
 * happened silently.
 *
 * Four order-flow readings — stacked imbalance, the value candle, delta
 * divergence, liquidity weather — were given glass compilers and started
 * painting on the price axis. Every one of them was correct. Every one of them
 * was tested. And for that whole time there was no way for the trader to switch
 * a single one of them off, and no entry in the profiles menu saying they
 * existed. A chart the trader cannot quiet is not a chart the trader owns, and
 * a product that draws something it never lists is a product whose own
 * inventory is wrong.
 *
 * That was fixed by hand. Fixing it by hand protects exactly the four layers
 * that existed on the day; it does nothing about the fifth. So the rule is
 * written down here instead:
 *
 *   IF MainChart CALLS `select<X>Glass(`, THE PROFILES MENU MUST OWN `select<X>`.
 *
 * The mapping is mechanical on purpose. A glass compiler is named for the
 * engine selector it compiles — `selectLiquidityWeatherGlass` renders what
 * `selectLiquidityWeather` computed — so the menu's `owner` breadcrumb, which
 * already points at the engine module, is the join. No registry to keep in
 * sync, no list to remember to append to: adding a painting layer without a
 * door makes this file red.
 *
 * NOTE ON DIRECTION. Only one way is asserted. The menu is allowed to list
 * things that are not glass layers — Fixed Range VP and Session VP draw through
 * an older path entirely, and Absorption deliberately publishes no level at all
 * and lives in the drawer. Requiring a glass compiler for every menu row would
 * be a different rule, and a false one.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { selectProfileMenu, type ProfileMenuInput } from "./selectProfileMenu";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** Prose paints nothing, and this file's neighbours explain themselves at length. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));

/** Every glass compiler the chart actually calls, by the engine it renders. */
const PAINTING: readonly string[] = [
  ...new Set(
    [...CHART.matchAll(/\bselect([A-Za-z]+)Glass\s*\(/g)].map(m => `select${m[1]}`),
  ),
].sort();

const MENU_INPUT: ProfileMenuInput = {
  barsPresent: true,
  printsPresent: true,
  observedAggressorFlow: true,
  active: {},
};

describe("every layer that paints on the price axis has a door in the menu", () => {
  it("the chart is actually painting something — an empty sweep proves nothing", () => {
    // Without this, renaming the glass convention would make the whole file
    // pass by matching zero layers, which is the quietest way a sentinel dies.
    expect(PAINTING.length, "no select*Glass call sites found in MainChart").toBeGreaterThan(3);
  });

  it("NAMES EVERY PAINTING LAYER: each glass compiler's engine is owned by a menu entry", () => {
    const owned = new Set(
      selectProfileMenu(MENU_INPUT).entries.map(e => path.basename(e.owner, ".ts")),
    );
    for (const engine of PAINTING) {
      expect(
        owned.has(engine),
        `${engine}Glass paints on the chart, but no profiles-menu entry owns ${engine}. ` +
          `The trader cannot switch it off and cannot learn it exists.`,
      ).toBe(true);
    }
  });

  it("the owner a painting layer claims is a real file, not a plausible path", () => {
    const menu = selectProfileMenu(MENU_INPUT);
    for (const engine of PAINTING) {
      const entry = menu.entries.find(e => path.basename(e.owner, ".ts") === engine)!;
      expect(fs.existsSync(path.join(process.cwd(), entry.owner))).toBe(true);
    }
  });

  /**
   * THE SECOND JOIN, AND WHY ONE WAS NOT ENOUGH.
   *
   * The rule above is exactly as strong as the `select<X>Glass` naming
   * convention it reads, and H-701's effort mark proved that is not strong
   * enough: it paints on the price axis, at a bar's own extreme, and it calls
   * no glass compiler at all. It would have sailed past this file untouched —
   * which is the fifth layer this file's own header predicted.
   *
   * So the switch is the second join, and it is a better one because it is not
   * a naming convention: the overlay quiets a layer by reading a key off
   * `layerOnRef`, and every key there is, by construction, a layer that paints.
   * Each key is a word from its own menu row's id, which is the mechanical
   * link — no registry, nothing to remember to append to.
   */
  const SWITCH_KEYS: readonly string[] = [
    ...new Set([...CHART.matchAll(/layerOnRef\.current\.([A-Za-z]+)/g)].map(m => m[1])),
  ].sort();

  it("EVERY SWITCH IN THE OVERLAY IS A ROW IN THE MENU", () => {
    expect(SWITCH_KEYS.length, "no layerOnRef reads found — did the ref move?")
      .toBeGreaterThan(3);

    const ids = selectProfileMenu(MENU_INPUT).entries.map(e => e.id);
    // Compare with underscores stripped: menu ids are `DELTA_LEVELS`, ref
    // keys are `deltaLevels`. The join is layer-identity, not casing.
    const norm = (s: string) => s.toLowerCase().replace(/_/g, "");
    for (const key of SWITCH_KEYS) {
      const nk = norm(key);
      const matched = ids.filter(id => norm(id).includes(nk));
      expect(
        matched,
        `the overlay can quiet \`${key}\`, so \`${key}\` paints — and no single ` +
          `profiles-menu row owns it. The trader cannot switch it off from the ` +
          `menu and cannot learn it exists.`,
      ).toHaveLength(1);
    }
  });

  it("a painting layer is never advertised as READY on a tape that cannot feed it", () => {
    // Side-dependent glass is withheld; Liquidity Weather is the deliberate
    // raw-print exception because its selector never reads aggressor side.
    const unsided = selectProfileMenu({ ...MENU_INPUT, observedAggressorFlow: false });
    for (const engine of PAINTING) {
      const entry = unsided.entries.find(e => path.basename(e.owner, ".ts") === engine)!;
      expect(entry.availability).toBe(
        engine === "selectLiquidityWeather" ? "READY" : "NEEDS_SIDED_TAPE",
      );
    }
  });
});
