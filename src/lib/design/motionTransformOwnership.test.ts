import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * MEASURED /login at 375x812 (iPhone metrics, real Chrome) 2026-09-08:
 *
 *   InstallPrompt wrapper   left 188   right 531   width 343
 *   viewport width 375  ->  156px (45%) off screen, dismiss button with it
 *   computed transform: "none"    inline transform: "none"
 *
 * The wrapper carried `left-1/2 ... -translate-x-1/2`. The class produced NO
 * transform at all, because Framer Motion OWNS `transform` on a motion element
 * and rewrites it on every frame — including writing `none` once the animation
 * settles. So the centering half of `left-1/2 + -translate-x-1/2` was silently
 * discarded and the card sat at left:50% uncompensated, clipped by the body's
 * `overflow-x: hidden` rather than reflowed. Nothing reported an error:
 * documentElement.scrollWidth still equalled clientWidth.
 *
 * The failure is silent by construction, which is why it needs a Sentinel and
 * not a code review. A transform utility class on a motion element is never
 * merely redundant — it is a layout instruction that will not run.
 *
 * Two repairs satisfy this rule and both are in the tree:
 *   - express the offset in Framer's own props (`x: "-50%"`)  — WMSBar
 *   - center without a transform at all (`inset-x-4 mx-auto`) — InstallPrompt
 */

const SRC = path.join(process.cwd(), "src");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Returns the text of every `<motion.*` OPENING TAG in a source file.
 *
 * Deliberately not a regex over the whole tag: a `>` inside an embedded
 * expression (`{a > b}`) or inside a prop string would truncate the tag and the
 * className could fall outside the captured text — the rule would then pass by
 * simply failing to look.
 */
function scanOpeningTags(src: string, marker: RegExp): string[] {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(src))) {
    let depth = 0;
    let quote: string | null = null;
    for (let i = m.index + m[0].length; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) { tags.push(src.slice(m.index, i + 1)); break; }
    }
  }
  return tags;
}

const motionOpeningTags = (src: string) => scanOpeningTags(src, /<motion\.[A-Za-z][\w.]*/g);
const openingTags = (src: string) => scanOpeningTags(src, /<[A-Za-z][\w.]*(?=[\s/>])/g);

/** Tailwind utilities that compile to `transform`. Framer will overwrite them. */
const TRANSFORM_UTILITY =
  /(^|[\s"'])-?(translate-[xyz]-|rotate-(?:x-|y-|z-)?\d|scale-(?:x-|y-)?\d|skew-[xy]-)/;

const classNamesIn = (tag: string): string[] =>
  Array.from(tag.matchAll(/className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\})/g)).map(
    (m) => m[1] ?? m[2] ?? "",
  );

describe("Framer owns `transform` on a motion element", () => {
  const files = tsxFiles(SRC);

  it("finds motion elements at all — the scan must not pass by looking at nothing", () => {
    // Without this, a broken tag scanner would report a clean repo forever.
    const withMotion = files.filter((f) =>
      motionOpeningTags(fs.readFileSync(f, "utf8")).length > 0,
    );
    expect(withMotion.length).toBeGreaterThan(0);
  });

  it("no motion element carries a transform utility class", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const tag of motionOpeningTags(fs.readFileSync(file, "utf8"))) {
        for (const cls of classNamesIn(tag)) {
          if (TRANSFORM_UTILITY.test(cls)) {
            offenders.push(`${path.relative(process.cwd(), file)}: ${cls.trim().slice(0, 90)}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no element hands `transform` to both a class and an inline style", () => {
    /**
     * The same rule one step out. `transform` has exactly one owner per
     * element; an inline `style={{ transform }}` wins over a utility class
     * silently, exactly as Framer does. VERIFIED 0 conflicts at the time this
     * was written — this rule holds that line rather than discovers it.
     */
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      for (const tag of openingTags(src)) {
        if (!/style\s*=/.test(tag) || !/transform\s*:/.test(tag)) continue;
        for (const cls of classNamesIn(tag)) {
          if (TRANSFORM_UTILITY.test(cls)) {
            offenders.push(`${path.relative(process.cwd(), file)}: ${cls.trim().slice(0, 80)}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the install prompt is centered without a transform, so it survives at 375px", () => {
    const src = fs.readFileSync(
      path.join(SRC, "components", "pwa", "InstallPrompt.tsx"),
      "utf8",
    );
    // `left-1/2` is only safe here WITH a compensating transform, which is
    // exactly what this element may not have. Inset centering needs neither.
    expect(src).toContain("inset-x-4 mx-auto");
    expect(src).not.toMatch(/className="[^"]*\bleft-1\/2\b/);
  });

  it("the WMS earn toast keeps its -50% offset in Framer's own props", () => {
    const src = fs.readFileSync(path.join(SRC, "components", "wms", "WMSBar.tsx"), "utf8");
    // It animates `scale`, so the offset must compose with Framer's transform
    // rather than compete with it. All three phases carry it: an exit that
    // dropped `x` would visibly jump the toast sideways on the way out.
    const phases = src.match(/(initial|animate|exit)=\{\{[^}]*\}\}/g) ?? [];
    const withX = phases.filter((p) => /x:\s*"-50%"/.test(p));
    expect(withX.length).toBe(3);
  });
});
