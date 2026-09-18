/**
 * "MEASURE IVORY-ON-FIELD AFTER GRAIN."
 *
 * The Visual Canon's CSS addendum, §7, dated 2026-09-16:
 *
 *     "WCAG: measure ivory-on-field AFTER grain. If body text drops under
 *      4.5:1, drop opacity, do not thicken the type with a glow."
 *
 * `textLegibility.enforcement.test.ts` holds the token ramp to AA and does it
 * carefully, but every pair it checks is a clean token against a clean surface.
 * The trader has never seen either. The sanctuary paints a grain tile and a
 * vignette over every route in the product, and until this file existed nothing
 * asked what those layers do to the ratio.
 *
 * That is a particular kind of gap: not a wrong answer, a correct answer to a
 * question about a screen nobody ships.
 *
 * This file asks the Canon's question about the composited pixel. It also
 * writes down, as arithmetic, WHY the shell's layer order departs from the
 * Canon's own layer diagram — because that departure looks exactly like a bug,
 * and the next person to "fix" it will take the product's body text to 3.68:1.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { WM, TEXT_ON_SURFACE, wmContrast } from "./wmTokens";
import {
  GRAIN_OPACITY,
  GRAIN_OPACITY_CEILING,
  GRAIN_TILE,
  compositeGrain,
  compositeVignette,
  grainedPair,
} from "./sanctuaryComposite";

const AA_NORMAL = 4.5;

const SHELL = readFileSync(
  resolve(__dirname, "../../components/experience/WMExperienceShell.tsx"),
  "utf8",
);

/** Every pair the token system actually PERMITS. Illegal pairs are not this file's business. */
const LEGAL_PAIRS = (Object.keys(TEXT_ON_SURFACE) as (keyof typeof TEXT_ON_SURFACE)[]).flatMap(
  (t) => TEXT_ON_SURFACE[t].map((s) => [t, s] as const),
);

describe("atmosphere legibility — the Canon's §7, discharged", () => {
  it("has pairs to check — the guard is not vacuous", () => {
    // `dim` is legal nowhere, so a bug that emptied TEXT_ON_SURFACE would make
    // every assertion below pass over an empty list.
    expect(LEGAL_PAIRS.length).toBeGreaterThanOrEqual(13);
  });

  it.each([
    ["desktop", GRAIN_OPACITY.desktop],
    ["phone", GRAIN_OPACITY.phone],
  ])("keeps every legal pair at AA through the grain — %s", (_label, opacity) => {
    for (const [t, s] of LEGAL_PAIRS) {
      const { text, surface } = grainedPair(WM.text[t], WM.surface[s], opacity);
      const r = wmContrast(text, surface);
      expect(
        r,
        `${t} on ${s} falls to ${r.toFixed(2)}:1 once the grain is composited. ` +
          `The Canon's instruction is to DROP THE GRAIN OPACITY, not to brighten ` +
          `the token and not to put a glow behind the type.`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("records how little margin the thinnest legal pair has left", () => {
    // `muted` on `mid` is the tightest rung the system permits: 4.86:1 clean,
    // and the grain spends part of that. This is not a failure — it is the
    // number that tells you the grain opacity has almost no headroom above
    // 0.06, which is exactly what the Canon's 0.04-0.07 window already said
    // from the other direction.
    const { text, surface } = grainedPair(WM.text.muted, WM.surface.mid, GRAIN_OPACITY.desktop);
    const r = wmContrast(text, surface);
    expect(r).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(r).toBeLessThan(5);
  });

  it("would FAIL if the grain were pushed past the Canon's ceiling", () => {
    // Proves the guard above has teeth rather than passing because the layer is
    // too weak to matter. At the FALSE_RIPENESS ceiling the thinnest legal pair
    // goes under AA, so the two rules agree: 0.10 is not a safe opacity.
    const { text, surface } = grainedPair(
      WM.text.muted,
      WM.surface.mid,
      GRAIN_OPACITY_CEILING * 2,
    );
    expect(wmContrast(text, surface)).toBeLessThan(AA_NORMAL);
  });
});

describe("atmosphere legibility — why the room sits ABOVE the vignette", () => {
  /**
   * The Canon's §6 prints this layer order:
   *
   *     z 39   vignette overlay
   *     z 40   grain overlay
   *     "Vignette and grain are ABOVE the room and BELOW dialogs."
   *
   * The shell pins both to `z-index: 0` and lifts the content plane to 1. The
   * tests below are the reason, kept as measurements so that "align the shell
   * to the Canon diagram" cannot look like a tidy-up.
   */

  it("shows a vignette over the CONTENT destroying the ratio it is over", () => {
    const casualties: string[] = [];
    for (const [t, s] of LEGAL_PAIRS) {
      const r = wmContrast(compositeVignette(WM.text[t]), compositeVignette(WM.surface[s]));
      if (r < AA_NORMAL) casualties.push(`${t}/${s} ${r.toFixed(2)}`);
    }
    // Not a stray pair — most of the permitted ramp goes under.
    expect(casualties.length).toBeGreaterThanOrEqual(8);

    // The specific figure worth remembering: `body` is declared readable on
    // EVERY surface in the system, and a corner would take it to under 4:1.
    const body = wmContrast(compositeVignette(WM.text.body), compositeVignette(WM.surface.mid));
    expect(body).toBeLessThan(4);
    expect(wmContrast(WM.text.body, WM.surface.mid)).toBeGreaterThan(9);
  });

  it("shows the same vignette HELPING when it stays under the room", () => {
    // Which is what the shell ships. Under the content plane the vignette only
    // deepens the field, and a deeper field is a better ground for light text.
    for (const [t, s] of LEGAL_PAIRS) {
      const under = wmContrast(WM.text[t], compositeVignette(WM.surface[s]));
      expect(under).toBeGreaterThanOrEqual(wmContrast(WM.text[t], WM.surface[s]));
    }
  });

  it("keeps the shell's content plane above the atmosphere", () => {
    // If this selector ever loses its lift, every ratio in the suite above
    // becomes a statement about a room that is no longer being rendered.
    expect(SHELL).toMatch(
      /\.wm-sanctuary\s*>\s*\*:not\(\.wm-water-breath\)\s*\{[^}]*z-index:\s*1/,
    );
  });

  it("keeps the vignette itself un-lifted", () => {
    // The grain may rise (see the suite below). The vignette may not, and the
    // arithmetic two tests up is why.
    const before = SHELL.match(/\.wm-sanctuary::before\s*\{[^}]*\}/)?.[0] ?? "";
    expect(before).not.toMatch(/z-index:\s*(?!0)\d+/);
  });
});

describe("atmosphere legibility — FALSE_RIPENESS, §8", () => {
  it("holds the shipped grain opacity inside the Canon's window", () => {
    const declared = [...SHELL.matchAll(/\.wm-sanctuary::after\s*\{[^}]*opacity:\s*([\d.]+)/g)]
      .concat([...SHELL.matchAll(/\.wm-sanctuary::after\s*\{\s*opacity:\s*([\d.]+)/g)])
      .map((m) => Number(m[1]));
    expect(declared.length).toBeGreaterThan(0);
    for (const o of declared) {
      expect(o, `grain opacity ${o} is outside the Canon's 0.04-0.07 window`).toBeGreaterThanOrEqual(0.04);
      expect(o, `grain opacity ${o} is FALSE_RIPENESS — the Canon fails the merge above 0.10`).toBeLessThanOrEqual(
        GRAIN_OPACITY_CEILING,
      );
    }
  });

  it("keeps the atmosphere out of the pointer path", () => {
    // §4/§5: the grain lives on a pointer-events:none overlay. A click landing
    // on the vignette is the cheapest way to make the room feel broken.
    const block = SHELL.match(
      /\.wm-sanctuary::before,\s*\.wm-sanctuary::after,[\s\S]{0,260}?\}/,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block!).toContain("pointer-events: none");
  });

  it("never animates the noise", () => {
    // §4 forbidden list, and the sanctuary's own "NO OWNER = STILL". Grain is
    // one static tile; an animation on it would be motion with no owner.
    const after = SHELL.match(/\.wm-sanctuary::after\s*\{[^}]*\}/)?.[0] ?? "";
    expect(after).not.toMatch(/animation|transition/);
  });

  it("keeps the grain a composited layer, never a filter over the app", () => {
    // §4: `filter: url(#noise)` on the whole app would grain the text and the
    // candles — the FALSE_RIPENESS test about drawing atmosphere into the chart
    // framebuffer, arrived at from the CSS side.
    expect(SHELL).not.toMatch(/filter:\s*url\(#/);
  });

  it("uses the measured tile, not an invented one", () => {
    // Ties this suite to the asset `grainTile.enforcement.test.ts` decodes. If
    // someone regenerates the tile with a different excursion, the constants
    // here stop describing it and the two suites must be reconciled.
    expect(GRAIN_TILE.mean).toBe(128);
    expect(GRAIN_TILE.min).toBeLessThan(GRAIN_TILE.mean);
    expect(GRAIN_TILE.max).toBeGreaterThan(GRAIN_TILE.mean);
    expect(SHELL).toContain("/wm/grain-256.webp");
  });

  it("leaves a mid-grey pixel of the tile perfectly inert", () => {
    for (const s of Object.values(WM.surface)) {
      expect(compositeGrain(s, GRAIN_OPACITY.desktop, GRAIN_TILE.mean)).toBe(s);
    }
  });
});
