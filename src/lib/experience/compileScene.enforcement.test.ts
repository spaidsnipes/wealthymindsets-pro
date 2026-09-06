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
const SIGNAL_ADAPTER_FILES = new Set<string>([
  "deckSceneSignals.ts",
  // Added 2026-09-06 with the /paper cutover. This one is the opposite of the
  // deck adapter: it REPORTS the capital column instead of refusing to. That
  // makes it the higher-risk producer of the two, so it carries 30 tests of its
  // own, and the block below pins the two claims it is forbidden to invent.
  "paperSceneSignals.ts",
]);

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

describe("compileScene enforcement — the /paper adapter reports without inventing", () => {
  const adapter = stripComments(
    readFileSync(resolve(SRC, "lib/experience/paperSceneSignals.ts"), "utf8"),
  );

  it("routes the position through selectPositionTruth, never a hand-written label", () => {
    // The deck adapter is safe because it says UNOBSERVED and stops. This one
    // has a real book, so the failure mode inverts: it could write
    // `position: "FLAT"` straight from `positions.length === 0` and skip the
    // owner that knows about staleness and unobserved sources entirely.
    expect(adapter).toContain("selectPositionTruth");
    expect(adapter).toMatch(/position:\s*truth\.label/);
    expect(adapter).toMatch(/positionConfidence:\s*truth\.confidence/);
    expect(adapter).not.toContain('position: "FLAT"');
    expect(adapter).not.toContain('positionConfidence: "CONFIRMED"');
  });

  it("keeps the episode claims false — paper has no DECISION_ID (§B1)", () => {
    // The tempting move is `hadCapitalEvent: trades.length > 0`. That makes a
    // lifetime fact wear an episode's clothes and leaves RECEIPT owed forever
    // for a decision nobody can name.
    expect(adapter).toContain("hadCapitalEvent: false");
    expect(adapter).toContain("receiptWritten: false");
  });

  it("refuses to read an unhydrated ledger as an observation (§14.1)", () => {
    expect(adapter).toMatch(/hydrated\s*===\s*true/);
    expect(adapter).toContain("unobservedSources");
  });
});

describe("compileScene enforcement — /paper breadcrumb", () => {
  const page = stripComments(readFileSync(resolve(SRC, "app/paper/page.tsx"), "utf8"));

  it("routes through the paper adapter and the compiler, and mounts the panel", () => {
    expect(page).toContain("paperSceneSignals");
    expect(page).toContain("compileScene");
    expect(page).toContain("SceneAdmissionPanel");
  });

  it("feeds the ledger's own persistence result as the LINK signal, not a constant", () => {
    // `linkVerified: true` typed on this page would make DEGRADED unreachable
    // on the one route in WM Pro that can currently reach it.
    expect(page).toMatch(/persistence:\s*persistenceState/);
    expect(page).not.toMatch(/linkVerified\s*:/);
  });

  it("reads the session from the canonical owner, not from a local guess", () => {
    expect(page).toContain("selectCanonicalSessionToken");
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

describe("compileScene enforcement — §10 admission is OBEYED, not merely announced", () => {
  /**
   * ── Why this block exists (§22, ORKIN G — a SURVIVED attempt, then closed) ──
   *
   * `SceneAdmits` shipped with 9 tests and every one of them passed while
   * /command-deck rendered the One Story strip UNGATED. Deleting the
   * `<SceneAdmits>` wrapper from the page left the whole suite green — because
   * the component tests prove the gate WORKS, and nothing proved the page USES
   * it. That is precisely how the original defect shipped: a compiler that
   * withheld ONE_STORY, a panel that printed "Withheld · One story", and a
   * strip that rendered anyway thirteen lines above it.
   *
   * A gate nothing calls is not admission. These two locks bind the pair.
   */

  const surfaceFiles = ALL_FILES.filter((f) => !isTestFile(f));

  function mounts(content: string, component: string): boolean {
    // `<Name` catches the JSX mount and ignores a bare type-only import.
    return new RegExp(`<${component}\\b`).test(content);
  }

  it("no surface discloses WITHHELD without also gating on it", () => {
    // The panel names what was refused. If nothing on that screen actually
    // refuses it, the panel is reporting a decision no one honoured — §H19
    // dead vocabulary, and worse than silence because it sounds like proof.
    const violations: string[] = [];
    for (const file of surfaceFiles) {
      const content = codeOf(file);
      if (content === null) continue;
      if (!mounts(content, "SceneAdmissionPanel")) continue;
      if (!mounts(content, "SceneAdmits")) violations.push(rel(file));
    }
    expect(violations).toEqual([]);
  });

  it("no surface withholds silently without disclosing what it withheld", () => {
    // The converse, and the reason the gate is allowed to render `null` at all.
    // A gate with no panel removes cards and never says so — the trader cannot
    // tell "WM has nothing to say" from "WM is refusing to say it", and those
    // are very different claims about their money.
    const violations: string[] = [];
    for (const file of surfaceFiles) {
      const content = codeOf(file);
      if (content === null) continue;
      if (!mounts(content, "SceneAdmits")) continue;
      if (!mounts(content, "SceneAdmissionPanel")) violations.push(rel(file));
    }
    expect(violations).toEqual([]);
  });

  it("at least one real surface adopts the gate — the locks above are not vacuous", () => {
    // Both assertions are satisfied by a repo with zero gates. This is the
    // positive control that makes them mean something.
    const adopters = surfaceFiles.filter((f) => {
      const c = codeOf(f);
      return c !== null && mounts(c, "SceneAdmits");
    });
    expect(adopters.length).toBeGreaterThan(0);
  });

  /**
   * ── §22 ORKIN H: why this is a tag scan and not a regex ─────────────────────
   *
   * The first version of the lock below was:
   *
   *     /<SceneAdmits[^>]*element="ONE_STORY"[\s\S]{0,400}?<OneStoryStrip/
   *
   * and it SURVIVED an attack. A decoy gate wrapping nothing —
   *
   *     <SceneAdmits compilation={c} element="ONE_STORY"><span /></SceneAdmits>
   *     <div><OneStoryStrip vm={oneStory} /></div>
   *
   * — matched it, because the regex proves the two tokens are NEAR each other,
   * and "near" is not "inside". That decoy is exactly the shipped defect with a
   * paper hat on: the strip still renders in CLOSED.
   *
   * Proximity is not containment. So this walks the tags.
   */
  /**
   * The children of the first `<tag …>` matching `openAttrs`, or null if there
   * is no such gate.
   *
   * `tag` is a parameter and the scans below are word-boundary anchored for a
   * concrete reason: `SceneAdmits` is a strict PREFIX of `SceneAdmitsAmbient`.
   * An `indexOf("<SceneAdmits")` walk counts every ambient gate as a nested
   * element gate while never finding its closing tag, so depth drifts and the
   * scan reports whatever it happens to land on. That is not a hypothetical —
   * it is one rename away from silently disarming the ONE_STORY lock.
   */
  function gatedBody(source: string, tag: string, openAttrs = ""): string | null {
    const open = new RegExp(`<${tag}\\b${openAttrs}[^>]*>`);
    const m = open.exec(source);
    if (m === null) return null;
    if (m[0].endsWith("/>")) return ""; // self-closing gate: gates nothing

    // `\b` after the name stops `<SceneAdmits` matching `<SceneAdmitsAmbient`.
    const openTag = new RegExp(`<${tag}\\b`, "g");
    const closeTag = new RegExp(`</${tag}\\s*>`, "g");
    const find = (re: RegExp, from: number): number => {
      re.lastIndex = from;
      const hit = re.exec(source);
      return hit === null ? -1 : hit.index;
    };

    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      const nextOpen = find(openTag, i);
      const nextClose = find(closeTag, i);
      if (nextClose === -1) return null; // unbalanced — treat as no gate
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + tag.length + 1;
      } else {
        depth--;
        if (depth === 0) return source.slice(start, nextClose);
        i = nextClose + tag.length + 3;
      }
    }
    return null;
  }

  function gatedElementBody(source: string, element: string): string | null {
    return gatedBody(source, "SceneAdmits", `[^>]*element=(?:"${element}"|\\{"${element}"\\})`);
  }

  it("every element a route declares as GOVERNED has a real gate on that page", () => {
    /**
     * `governed` is how the panel decides what counts as a refusal. An element
     * named there but never gated would let the panel print "Withheld · X"
     * while X renders — the original defect, re-entering through the prop
     * instead of the page. The declaration is a claim; this checks it.
     */
    const violations: string[] = [];
    for (const file of surfaceFiles) {
      const content = codeOf(file);
      if (content === null) continue;
      if (!mounts(content, "SceneAdmissionPanel")) continue;

      const list = /GOVERNED_ELEMENTS[^=]*=\s*\[([^\]]*)\]/.exec(content);
      if (list === null) {
        violations.push(`${rel(file)}: mounts the panel with no GOVERNED_ELEMENTS list`);
        continue;
      }
      const declared = [...list[1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
      if (declared.length === 0) {
        violations.push(`${rel(file)}: declares an empty governed list`);
        continue;
      }
      for (const element of declared) {
        if (!new RegExp(`<SceneAdmits\\b[^>]*element="${element}"`).test(content)) {
          violations.push(`${rel(file)}: declares ${element} governed but never gates it`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no surface discloses the AMBIENT verdict without also obeying it", () => {
    /**
     * §9 INTERRUPTION LAW: "Only capital truth and material invalidation may
     * take the room. Academy may not. Nectar may not."
     *
     * `admitsAmbient` was computed by the compiler and rendered as a sentence
     * by the panel, and a grep for its readers found the panel, the compiler's
     * own tests, and nothing else. Announced by one surface, obeyed by none —
     * the same defect as the One Story strip and the over-counted refusals,
     * third location.
     *
     * The disclosure travels with `SceneAdmissionPanel` (which always prints
     * one of the two ambient sentences), so mounting the panel is the claim,
     * and `SceneAdmitsAmbient` is the only thing that makes it true.
     */
    const violations: string[] = [];
    for (const file of surfaceFiles) {
      const content = codeOf(file);
      if (content === null) continue;
      if (!mounts(content, "SceneAdmissionPanel")) continue;
      if (!mounts(content, "SceneAdmitsAmbient")) {
        violations.push(`${rel(file)}: prints the ambient verdict but gates no ambient surface`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("the ambient gate reads the compiler and nothing else", () => {
    // The failure mode this forbids: an ambient gate that takes a boolean prop.
    // A caller could then hand it `true` and call the result §9 compliance. It
    // must take the whole compilation, exactly like `SceneAdmits`, so the value
    // can only have come from `compileScene`.
    const gate = stripComments(
      readFileSync(resolve(SRC, "components/experience/SceneAdmits.tsx"), "utf8"),
    );
    expect(gate).toMatch(/readonly compilation:\s*SceneCompilation/);
    expect(gate).toMatch(/if\s*\(!compilation\.admitsAmbient\)\s*return null/);
    expect(gate).not.toMatch(/admitsAmbient\s*\?\?/);
  });

  it("the panel cannot report a refusal it was not told it governs", () => {
    // The prop must be REQUIRED. An optional `governed` with a
    // default-to-everything would silently restore the overclaim for the next
    // surface that forgets to pass it.
    const panel = stripComments(
      readFileSync(resolve(SRC, "components/experience/SceneAdmissionPanel.tsx"), "utf8"),
    );
    expect(panel).toMatch(/readonly governed:\s*readonly SurfaceElement\[\]/);
    expect(panel).not.toMatch(/governed\?\s*:/);
    expect(panel).not.toMatch(/governed\s*=\s*SURFACE_ELEMENTS/);
    // And withheld must be the GOVERNED complement, not the whole enum.
    expect(panel).toMatch(/governedSet\.has\(e\)\s*&&\s*!admittedSet\.has\(e\)/);
  });

  it("/command-deck gates the One Story strip — THE regression, pinned to the page", () => {
    const deck = stripComments(
      readFileSync(resolve(SRC, "app/command-deck/page.tsx"), "utf8"),
    );
    const body = gatedElementBody(deck, "ONE_STORY");
    expect(body).not.toBeNull();
    // INSIDE the gate's children, not merely somewhere nearby on the page.
    expect(body).toContain("<OneStoryStrip");
    // And the page must not ALSO render an ungated copy alongside it — one
    // escaped strip is the whole defect, however many gated ones exist.
    const total = (deck.match(/<OneStoryStrip/g) ?? []).length;
    const inside = ((body ?? "").match(/<OneStoryStrip/g) ?? []).length;
    expect(inside).toBe(total);
  });

  it("/command-deck gates the auction lens AND the decision chain as one THESIS_GEOMETRY", () => {
    /**
     * Sections 2 and 3 are the same claim at two resolutions: DLAR is the
     * four-dimension verdict, the decision chain is the nine nodes that
     * produced it. Splitting them across two gates would eventually let one
     * be admitted while the other is refused — a conclusion on screen with
     * its own workings withheld, which is "SHOW FIRST, EXPLAIN SECOND" run
     * backwards. So this asserts BOTH live in the SAME gate body.
     */
    const deck = stripComments(
      readFileSync(resolve(SRC, "app/command-deck/page.tsx"), "utf8"),
    );
    const body = gatedElementBody(deck, "THESIS_GEOMETRY");
    expect(body).not.toBeNull();
    expect(body).toContain("<DLARStrip");
    expect(body).toContain("<DecisionChainPanel");
    for (const mount of ["<DLARStrip", "<DecisionChainPanel"]) {
      const re = new RegExp(mount, "g");
      const total = (deck.match(re) ?? []).length;
      const inside = ((body ?? "").match(re) ?? []).length;
      expect(`${mount}: ${inside}/${total}`).toBe(`${mount}: ${total}/${total}`);
    }
  });

  it("/command-deck explains a THESIS_GEOMETRY refusal instead of leaving a hole", () => {
    /**
     * These are NUMBERED sections inside a collapsed "Deep read" drawer. A
     * trader who opens it and finds 1 then 4 cannot tell a refusal from a
     * bug, and a product that looks broken teaches people to distrust the
     * parts that work. Silent withholding is only honest when the admission
     * panel is beside the hole; here it is a thousand lines away.
     */
    const deck = stripComments(
      readFileSync(resolve(SRC, "app/command-deck/page.tsx"), "utf8"),
    );
    expect(deck).toMatch(/element="THESIS_GEOMETRY"[\s\S]{0,400}?withheldNote=/);
  });

  it("/paper puts the Academy Challenge INSIDE the ambient gate — §9, pinned to the page", () => {
    /**
     * The deck's ambient gate is a law obeyed on a route where the capital
     * column is permanently UNOBSERVED, which means `admitsAmbient` there is
     * essentially always true — obeyed, but never yet TESTED by reality.
     *
     * /paper is the first route where it bites. The Academy Challenge banner
     * shipped unconditionally on the one page in WM Pro where a position can
     * actually be open, so §9's named example — "Academy may not take the
     * room" — was violated by the literal surface §9 names. This pins the fix
     * to the page, not to a component test that would keep passing if the
     * wrapper were deleted.
     */
    const paper = stripComments(readFileSync(resolve(SRC, "app/paper/page.tsx"), "utf8"));
    const body = gatedBody(paper, "SceneAdmitsAmbient");
    expect(body).not.toBeNull();
    expect(body).toContain('id="academy-challenge"');
    const total = (paper.match(/id="academy-challenge"/g) ?? []).length;
    const inside = ((body ?? "").match(/id="academy-challenge"/g) ?? []).length;
    expect(inside).toBe(total);
  });

  it("/paper's exit ramp lives INSIDE the FLATTEN_CONFIRM gate — §9 PHONE law", () => {
    // A flatten control rendered outside the gate would appear in PREGAME and
    // CLOSED with nothing to close — §H19 dead vocabulary sitting on the most
    // dangerous button on the page.
    const paper = stripComments(readFileSync(resolve(SRC, "app/paper/page.tsx"), "utf8"));
    const body = gatedElementBody(paper, "FLATTEN_CONFIRM");
    expect(body).not.toBeNull();
    expect(body).toContain("closePosition(activeSymbol)");
    const total = (paper.match(/closePosition\(activeSymbol\)/g) ?? []).length;
    const inside = ((body ?? "").match(/closePosition\(activeSymbol\)/g) ?? []).length;
    expect(inside).toBe(total);
  });

  it("/paper's §B14 cancel control lives INSIDE the PENDING_BANNER gate", () => {
    const paper = stripComments(readFileSync(resolve(SRC, "app/paper/page.tsx"), "utf8"));
    const body = gatedElementBody(paper, "PENDING_BANNER");
    expect(body).not.toBeNull();
    expect(body).toContain("cancelExposureIncreasingOrders");
    const total = (paper.match(/onClick=\{cancelExposureIncreasingOrders\}/g) ?? []).length;
    const inside = ((body ?? "").match(/onClick=\{cancelExposureIncreasingOrders\}/g) ?? []).length;
    expect(inside).toBe(total);
    expect(total).toBe(1);
  });

  it("/command-deck puts Academy INSIDE the ambient gate — §9, pinned to the page", () => {
    // §9 names Academy explicitly. The Learning Genome is the deck's Academy
    // surface, so it is the one the ambient gate must actually contain — a gate
    // wrapped around nothing would satisfy the mount-level lock above while
    // leaving the law unenforced.
    const deck = stripComments(
      readFileSync(resolve(SRC, "app/command-deck/page.tsx"), "utf8"),
    );
    const body = gatedBody(deck, "SceneAdmitsAmbient");
    expect(body).not.toBeNull();
    expect(body).toContain("<LearningGenomeInspector");
    const total = (deck.match(/<LearningGenomeInspector/g) ?? []).length;
    const inside = ((body ?? "").match(/<LearningGenomeInspector/g) ?? []).length;
    expect(inside).toBe(total);
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
