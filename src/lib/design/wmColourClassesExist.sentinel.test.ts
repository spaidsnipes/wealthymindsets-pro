/**
 * SENTINEL — every `wm-*` colour class in `src/` must name a key that actually
 * exists in the `wm` scale in `tailwind.config.ts`.
 *
 * ── THE FAILURE THIS EXISTS TO END ──────────────────────────────────────────
 *
 * Tailwind does not warn about an unknown colour token. `bg-wm-panel` is not an
 * error, not a build failure and not a console message — it simply generates no
 * CSS at all. The element renders with NO background. Every test passes, `tsc`
 * is clean, CI is green, and the defect is visible only to a human looking at
 * the running product.
 *
 * It was found exactly that way, on prod. The Profiles menu — the Founder's
 * "drop down for all the different vps and the profiles i created" — opened
 * over the chart with `bg-wm-panel`, and the candles read straight through the
 * panel whose entire job is legible enumeration. A repo-wide audit against the
 * real scale then turned up five more invalid names in class position.
 *
 * The worst of them were on `/paper`, where eighteen `role="note"` risk
 * disclosures and their `bg-wm-amber/5` caution blocks painted nothing: the
 * sentences saying the fill was not real, the cancel could not have raced and
 * the short located no shares all rendered in ordinary body colour. A caution
 * that does not look like a caution is a caution the trader reads as a fact.
 * That is a truthfulness defect wearing a styling defect's clothes, which is
 * why this gate lives here rather than in a lint config.
 *
 * ── WHY THE SCALE IS PARSED, NOT LISTED ─────────────────────────────────────
 *
 * A hardcoded list of valid names would be a second source of truth, and would
 * go stale the first time someone adds a colour — turning this gate into a
 * thing people delete rather than a thing people trust. So the allowed set is
 * read out of `tailwind.config.ts` itself: rename a token there and the classes
 * that referenced the old name fail here immediately.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const ROOT = process.cwd();

/**
 * The `wm` colour keys, read from the config's own source text.
 *
 * The config is a TS module with `satisfies Config` and long comment blocks, so
 * it is parsed as text rather than imported: importing it would drag the whole
 * Tailwind type surface into a unit test for no gain. The block is delimited by
 * its brace depth, so a nested object inside the scale cannot truncate it.
 */
function wmScaleKeys(): Set<string> {
  const src = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");
  const start = src.indexOf("wm: {");
  expect(start, "the `wm` colour scale moved in tailwind.config.ts — re-derive this check")
    .toBeGreaterThan(-1);

  let depth = 0;
  let end = -1;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  expect(end, "could not find the end of the `wm` scale").toBeGreaterThan(start);

  const block = src.slice(start, end);
  const keys = new Set<string>();
  // `name:` and `"name":` / `'name':` at the start of an entry.
  for (const m of block.matchAll(/(?:^|[{,])\s*(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\s*:/g)) {
    const k = m[1] ?? m[2] ?? m[3];
    if (k && k !== "wm") keys.add(k);
  }
  expect(keys.size, "parsed no keys out of the `wm` scale").toBeGreaterThan(5);
  return keys;
}

/** Every `.ts`/`.tsx` under `src/`, excluding the tests that talk ABOUT classes. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("wm-* colour classes name real tokens", () => {
  it("NO CLASS NAMES A TOKEN THAT DOES NOT EXIST — a dead class paints nothing", () => {
    const keys = wmScaleKeys();

    /*
     * The utility prefixes that resolve against the COLOUR scale. `wm-` also
     * appears in plain CSS class names (`wm-panel`, `wm-chart-toolbar-pinned`,
     * `wm-room-chrome`), which are hand-written in the stylesheet and are NOT
     * Tailwind's to resolve — matching only after a colour utility prefix is
     * what keeps those out of this gate.
     */
    const PREFIXES = "(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide|placeholder)";
    const re = new RegExp(`\\b${PREFIXES}-wm-([\\w-]+?)(?:\\/\\d+)?\\b`, "g");

    const offences: string[] = [];
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      /*
       * Comments are stripped FIRST, and that is not a convenience.
       *
       * The prose that explains this defect necessarily quotes the dead class
       * names — this file does, and so does the header of `/paper`'s advisory
       * constants. A gate that cannot tell a painted class from a sentence
       * about a class would forbid documenting its own subject matter, and the
       * first person to hit that would delete the gate rather than the comment.
       */
      const src = stripComments(fs.readFileSync(file, "utf8"));
      for (const m of src.matchAll(re)) {
        const token = m[1];
        // Longest-match: `text-muted` and `gold-dim` are single keys, so a
        // greedy suffix strip would wrongly accept `text-nonsense` as `text`.
        if (keys.has(token)) continue;
        offences.push(`${path.relative(ROOT, file)}: ${m[0]}`);
      }
    }

    expect(
      offences,
      "These classes name a colour that is not in the `wm` scale in tailwind.config.ts.\n" +
        "Tailwind emits NOTHING for them — the element renders with no colour at all, and\n" +
        "nothing else in CI will ever tell you. Either use a real token or, if the product\n" +
        "genuinely needs a tone the scale does not carry (amber/warn is the known case),\n" +
        "reach for the canonical owner `WM` in src/lib/design/wmTokens.ts by inline style.\n\n" +
        offences.join("\n"),
    ).toEqual([]);
  });

  it("the known-dead names stay dead: amber, panel, yellow and bg are not in the scale", () => {
    // A guard on the guard. If someone "fixes" a future occurrence by ADDING
    // `amber` to the scale, that is a palette decision with product-wide blast
    // radius — tokenOwnership.enforcement.test.ts owns that argument, and this
    // line makes the shortcut visible instead of silent.
    const keys = wmScaleKeys();
    for (const dead of ["amber", "panel", "yellow", "bg"]) {
      expect(keys.has(dead), `\`wm-${dead}\` was added to the scale — see tokenOwnership.enforcement.test.ts`)
        .toBe(false);
    }
  });
});
