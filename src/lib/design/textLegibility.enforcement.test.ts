import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import { WM, TEXT_ON_SURFACE, wmContrast, wmLuminance } from "./wmTokens";

/**
 * TEXT LEGIBILITY — the ramp cannot quietly go dark.
 *
 * `TEXT_ON_SURFACE` in wmTokens.ts declares which text token may carry small
 * text on which surface. A declaration that nobody checks is a comment, so this
 * file RECOMPUTES the whole matrix from the token values and asserts the
 * declaration still matches the arithmetic.
 *
 * That direction matters. If someone darkens a text token or lightens a
 * surface, the declaration does not silently become a lie — it fails here, and
 * whoever made the change has to either revert it or move the token to a
 * shorter legal list on purpose.
 *
 * AA thresholds used: 4.5:1 for normal text, 3:1 for non-text UI components.
 */

const AA_NORMAL = 4.5;
const NON_TEXT_FLOOR = 3;

const SURFACES = Object.keys(WM.surface) as (keyof typeof WM.surface)[];
const TEXTS = Object.keys(WM.text) as (keyof typeof WM.text)[];

describe("text legibility — the declared ramp matches the measured ramp", () => {
  it("permits exactly the pairs that actually clear AA", () => {
    const measured: Record<string, string[]> = {};
    for (const t of TEXTS) {
      measured[t] = SURFACES.filter(s => wmContrast(WM.text[t], WM.surface[s]) >= AA_NORMAL);
    }

    for (const t of TEXTS) {
      expect(
        measured[t],
        `TEXT_ON_SURFACE.${t} no longer matches the measured contrast. Either a ` +
          `token moved, or the declaration is now a lie. Do not widen the list to ` +
          `silence this — widen it only if the MEASUREMENT says you may.`,
      ).toEqual([...TEXT_ON_SURFACE[t]]);
    }
  });

  it("keeps hero and body readable on every surface in the system", () => {
    // These two carry the product's actual prose and numerals. If either ever
    // fails anywhere, the sanctuary has stopped being readable.
    for (const t of ["hero", "body"] as const) {
      for (const s of SURFACES) {
        const r = wmContrast(WM.text[t], WM.surface[s]);
        expect(r, `${t} on ${s} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it("holds `dim` to non-text, and records why it is not simply brightened", () => {
    // Declared unusable for text...
    expect(TEXT_ON_SURFACE.dim).toEqual([]);

    // ...and it genuinely is. It fails AA on every surface, and on the lightest
    // one it fails even the floor for non-text UI components.
    for (const s of SURFACES) {
      expect(wmContrast(WM.text.dim, WM.surface[s])).toBeLessThan(AA_NORMAL);
    }
    expect(wmContrast(WM.text.dim, WM.surface.highest)).toBeLessThan(NON_TEXT_FLOOR);

    // The arithmetic that makes "just brighten it" impossible: a `dim` that
    // cleared AA on the lightest surface would have to out-shine `muted`, at
    // which point it is no longer a bottom rung. This is the load-bearing fact
    // behind the declaration, so it is asserted rather than left in prose.
    const needed = AA_NORMAL * (wmLuminance(WM.surface.highest) + 0.05) - 0.05;
    expect(
      needed,
      "a compliant `dim` would need to be brighter than `muted` — the ramp " +
        "cannot have four AA-legal rungs on near-black",
    ).toBeGreaterThan(wmLuminance(WM.text.muted));
  });

  it("has no call site painting text with `dim`", () => {
    // The declaration above is about the TOKEN. This is about the CODEBASE:
    // before this guard, all 45 uses of `WM.text.dim` in src/ were text, and
    // not one was a divider. The worst of them rendered missing evidence —
    // unknown fidelity, NO_MEMORY, zero observed events, CHANNELS UNAVAILABLE —
    // in the one colour that cannot be read, which turns "we do not know" into
    // calm-looking empty space. That is the §14.1 failure wearing a palette.
    //
    // `dim` remains available for genuine non-text use (borderColor, a
    // background rule), so this bans the TEXT property specifically rather than
    // the token.
    const offenders: string[] = [];
    const root = resolve(__dirname, "../..");
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
          if (entry !== "node_modules") walk(p);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.startsWith(resolve(__dirname))) continue; // the design system may discuss itself
        const src = readFileSync(p, "utf8");
        src.split("\n").forEach((line, i) => {
          if (/\bcolor\s*[:=]\s*\{?\s*WM\.text\.dim\b/.test(line)) {
            offenders.push(`${p.slice(root.length + 1)}:${i + 1}`);
          }
        });
      }
    };
    walk(root);

    expect(
      offenders,
      "`WM.text.dim` fails AA on every surface in the system (2.10–2.53:1). It " +
        "may not carry text. Use WM.text.muted — and if the text states an " +
        "ABSENCE, muted is the floor, not a preference.",
    ).toEqual([]);
  });

  it("keeps the ramp monotonic, so the names still describe the colours", () => {
    // hero > body > muted > dim. A ramp that crosses over is a ramp whose names
    // mislead at the call site, which is worse than an ugly one.
    const ordered = TEXTS.map(t => wmLuminance(WM.text[t]));
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i], `${TEXTS[i]} must be dimmer than ${TEXTS[i - 1]}`).toBeLessThan(ordered[i - 1]);
    }
  });
});
