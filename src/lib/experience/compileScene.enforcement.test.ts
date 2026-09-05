/**
 * compileScene enforcement — canon §Single-Writer / Many-Readers applied to the
 * BUILD ORDER §10 scene compiler.
 *
 * ── What this file is actually defending ─────────────────────────────────────
 *
 * `compileScene` is pure, total, and covered by 57 tests. Attacking it directly
 * is hard. The cheap way to make WM lie is not to break the compiler — it is to
 * FEED it. Ten `SceneSignals` fields are just an object literal, and the tidy
 * defaults a hurried developer reaches for are:
 *
 *     position: "FLAT", positionConfidence: "CONFIRMED"
 *
 * Hand the compiler that on a route with no broker panel and it will faithfully
 * answer DONE — "nothing is exposed, the day is answered" — about a book WM has
 * never read. The compiler would not be wrong. The wiring would be lying.
 *
 * §14.1 is explicit: FLAT is a FINDING, never a default. §H19 is explicit: do
 * not add vocabulary with no producer behind it. Those laws are enforced in the
 * compiler for the values it is GIVEN; this file enforces them one layer up, on
 * where those values are allowed to come from.
 *
 * ── The four locks ───────────────────────────────────────────────────────────
 *
 *  1. SINGLE WRITER   — only `compileScene` may name a scene or build a
 *                       `SceneCompilation`. No second scene authority (§24: do
 *                       not add a seventh owner).
 *  2. NO INLINE BOOK  — a surface that calls `compileScene` may not hand-build
 *                       its capital column inline. Signals must come from an
 *                       audited `*SceneSignals` adapter in `src/lib/experience/`.
 *  3. DECK HONESTY    — the /command-deck adapter must keep reporting the
 *                       capital column UNOBSERVED for as long as the deck has
 *                       no broker panel.
 *  4. NOT A BADGE     — the panel must keep rendering WITHHELD and provenance.
 *                       A scene name alone is decoration; §H19 calls that dead
 *                       vocabulary.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SRC = resolve(REPO_ROOT, "src");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * Files permitted to author scene vocabulary or construct raw signals.
 * Adding a name here is a deliberate act — it means "this file is an audited
 * producer", and it should come with tests that prove it does not invent.
 */
const COMPILER_FILES = new Set<string>(["compileScene.ts"]);
const SIGNAL_ADAPTER_FILES = new Set<string>(["deckSceneSignals.ts"]);

function basename(path: string): string {
  return path.split("/").pop() ?? "";
}

/**
 * Strip whole-line comments before asserting.
 *
 * Learned the hard way on the first run of this file: the deck adapter's header
 * documents the exact forbidden literal — `positionConfidence: "CONFIRMED"` —
 * in order to explain why it must never appear. A sentinel that greps raw text
 * flags that comment as a violation, which would force the next developer to
 * DELETE the explanation in order to get a green suite. That is a sentinel
 * teaching people to remove the reasoning that keeps them honest.
 *
 * So these locks bind executable code. Prose about the trap stays legal;
 * writing the trap does not.
 */
function stripComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .join("\n");
}

function codeOf(file: string): string | null {
  try { return stripComments(readFileSync(file, "utf8")); } catch { return null; }
}

function isTestFile(path: string): boolean {
  const b = basename(path);
  return b.endsWith(".test.ts") || b.endsWith(".test.tsx");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (
        name === "node_modules" || name === ".next" ||
        name === ".open-next" || name === "dist" || name === "build"
      ) continue;
      walk(p, acc);
    } else if (CODE_EXTENSIONS.has(extname(name))) {
      acc.push(p);
    }
  }
  return acc;
}

const ALL_FILES = walk(SRC);
const rel = (f: string) => f.replace(REPO_ROOT + "/", "");

describe("compileScene enforcement — §24 single writer, no second scene authority", () => {
  it("no file outside the compiler constructs a SceneCompilation", () => {
    // The compilation shape is identified by its two structural fields. A file
    // that literally builds `{ admits: [...], admitsAmbient: ... }` is deciding
    // admission — that is the compiler's job and only the compiler's job.
    const violations: string[] = [];
    for (const file of ALL_FILES) {
      const b = basename(file);
      if (COMPILER_FILES.has(b) || isTestFile(file)) continue;
      const content = codeOf(file);
      if (content === null) continue;
      if (/\badmitsAmbient\s*:/.test(content) && /\badmits\s*:/.test(content)) {
        violations.push(rel(file));
      }
    }
    expect(violations).toEqual([]);
  });

  it("no file outside the compiler decides admission with its own SurfaceElement list", () => {
    // A second `admissionFor`-style function would let one surface admit what
    // another withholds from the same market state — the exact divergence the
    // single-writer canon exists to prevent.
    const violations: string[] = [];
    for (const file of ALL_FILES) {
      const b = basename(file);
      if (COMPILER_FILES.has(b) || isTestFile(file)) continue;
      const content = codeOf(file);
      if (content === null) continue;
      if (/function\s+admissionFor\b/.test(content)) violations.push(rel(file));
    }
    expect(violations).toEqual([]);
  });
});

describe("compileScene enforcement — §14.1 the book is never hand-fed", () => {
  it("no surface calling compileScene builds its own capital column inline", () => {
    // `positionConfidence` is the tell. It is the field that decides whether WM
    // is ALLOWED to make a claim about the trader's money. If a page or
    // component types it as a literal next to a `compileScene` call, the deck's
    // honesty is now that developer's memory rather than an audited adapter.
    const violations: string[] = [];
    for (const file of ALL_FILES) {
      const b = basename(file);
      if (SIGNAL_ADAPTER_FILES.has(b) || COMPILER_FILES.has(b) || isTestFile(file)) continue;
      const content = codeOf(file);
      if (content === null) continue;
      if (!/\bcompileScene\s*\(/.test(content)) continue;
      if (/\bpositionConfidence\s*:/.test(content)) violations.push(rel(file));
    }
    expect(violations).toEqual([]);
  });

  it("every compileScene caller sources its signals from an audited adapter", () => {
    const adapterNames = [...SIGNAL_ADAPTER_FILES].map((f) => f.replace(/\.ts$/, ""));
    const violations: string[] = [];
    for (const file of ALL_FILES) {
      const b = basename(file);
      if (SIGNAL_ADAPTER_FILES.has(b) || COMPILER_FILES.has(b) || isTestFile(file)) continue;
      const content = codeOf(file);
      if (content === null) continue;
      if (!/\bcompileScene\s*\(/.test(content)) continue;
      if (adapterNames.some((n) => content.includes(n))) continue;
      violations.push(rel(file));
    }
    expect(violations).toEqual([]);
  });
});

describe("compileScene enforcement — the /command-deck adapter stays honest", () => {
  const adapter = stripComments(
    readFileSync(resolve(SRC, "lib/experience/deckSceneSignals.ts"), "utf8"),
  );

  it("reports the deck's capital column as UNOBSERVED, never FLAT/CONFIRMED", () => {
    // The deck has no broker panel. Until it does, these two constants ARE the
    // truth of this route. Relaxing them is how the compiler gets talked into
    // saying DONE about money it has never seen.
    expect(adapter).toContain('position: "POSITION UNCONFIRMED"');
    expect(adapter).toContain('positionConfidence: "UNOBSERVED"');
    expect(adapter).not.toContain('positionConfidence: "CONFIRMED"');
    expect(adapter).not.toContain('position: "FLAT"');
  });

  it("never claims exposure or a verified link it has not observed", () => {
    expect(adapter).toContain("intentInFlight: false");
    expect(adapter).toContain("exposureIncreasingWorkingOrders: 0");
    expect(adapter).toContain("linkVerified: null");
  });

  it("emits a provenance record — a scene from 2 real signals must not look like 5", () => {
    expect(adapter).toContain("SIGNAL_GROUPS");
    expect(adapter).toContain("observedCount");
    expect(adapter).toMatch(/POSITION:\s*"UNOBSERVED"/);
    expect(adapter).toMatch(/ORDERS:\s*"UNOBSERVED"/);
    expect(adapter).toMatch(/LINK:\s*"UNOBSERVED"/);
  });
});

describe("compileScene enforcement — /command-deck breadcrumb", () => {
  const page = stripComments(
    readFileSync(resolve(SRC, "app/command-deck/page.tsx"), "utf8"),
  );

  it("routes through the adapter and the compiler, and mounts the panel", () => {
    expect(page).toContain("deckSceneSignals");
    expect(page).toContain("compileScene");
    expect(page).toContain("SceneAdmissionPanel");
  });

  it("computes right-of-way through the canonical Decision owner, not a local copy", () => {
    // §24: a second CALLER of one owner is correct; a second IMPLEMENTATION is
    // a seventh owner wearing a disguise.
    expect(page).toContain("decisionPermissionCompiler");
    expect(page).toMatch(/computeSceneRightOfWay|computeRightOfWay/);
  });
});

describe("compileScene enforcement — §H19 the panel is not a badge", () => {
  const panel = stripComments(
    readFileSync(resolve(SRC, "components/experience/SceneAdmissionPanel.tsx"), "utf8"),
  );

  it("renders WITHHELD — the only visible proof that admission is real", () => {
    // A panel that prints the scene name and nothing else cannot show that the
    // compiler DID anything. Withheld is the load-bearing half.
    expect(panel).toContain("Withheld");
    expect(panel).toContain("SURFACE_ELEMENTS");
    // It must actually compute the complement, not hardcode a list.
    expect(panel).toMatch(/SURFACE_ELEMENTS\.filter\(/);
  });

  it("discloses signal provenance in both directions", () => {
    expect(panel).toContain("OBSERVED");
    expect(panel).toContain("UNOBSERVED");
    expect(panel).toContain("observedCount");
    expect(panel).toContain("totalCount");
  });

  it("names the scene's reason as a sentence, not a bare enum", () => {
    // §9: sentences, not badges. The compiler always produces `reason`; the
    // panel must render it.
    expect(panel).toMatch(/compilation\.reason/);
  });
});
