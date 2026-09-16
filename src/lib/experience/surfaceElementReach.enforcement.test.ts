import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { SURFACE_ELEMENTS, type SurfaceElement } from "./compileScene";

/**
 * SURFACE ELEMENT REACH — the whole vocabulary, one table, machine-checked.
 *
 * `humilityReach.enforcement.test.ts` asked "does a human ever SEE this?" of
 * ONE element and found the answer was no. `sceneReachability` asked it of the
 * ten scenes. This file asks it of all twelve §10 nouns at once, because the
 * lesson of both was that the question had never been asked systematically —
 * and both times the measurement contradicted what the prose implied.
 *
 * ── What counts as reach ─────────────────────────────────────────────────────
 *
 * Exactly two things, and both are checked against route files rather than
 * believed:
 *
 *   GATED   — a route wraps something in `<SceneAdmits element="X">`. The OS
 *             can actually withhold it, which is the strongest form of reach:
 *             the element is on screen AND under the compiler's authority.
 *   MOUNTED — a named component carries the element's meaning and some route
 *             imports and renders it, but no gate applies. Legitimate when
 *             admission could never say no (HUMILITY_PANEL is admitted in all
 *             ten scenes, so gating it would inflate the governed count without
 *             the OS gaining anything — `humilityReach` pins that reasoning).
 *
 * Anything else is DEBT, and debt is enumerated rather than hidden.
 *
 * ── Why a component name is not required for every element ───────────────────
 *
 * PENDING_BANNER and FLATTEN_CONFIRM are inline JSX inside their gates, not
 * extracted components. That is not worse. A gate proves the compiler owns the
 * surface; a component name proves only that someone made a file. Requiring
 * extraction would be a style rule wearing a safety rule's clothes.
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

/** Blank comments, preserving length, so prose ABOUT a mount is not a mount. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
}

const ROUTES = routeFiles().map(path => ({ path, src: code(readFileSync(path, "utf8")) }));
const rel = (p: string) => p.replace(/.*\/app\//, "app/");

function gatedOn(element: SurfaceElement): string[] {
  return ROUTES.filter(r => r.src.includes(`element="${element}"`)).map(r => rel(r.path));
}

function mountedOn(component: string): string[] {
  return ROUTES.filter(
    r => r.src.includes(`<${component}`) && new RegExp(`import .*${component}.*from`).test(r.src),
  ).map(r => rel(r.path));
}

/**
 * The component carrying each element's meaning, where one exists.
 *
 * Measured, not assumed. Every entry below was confirmed by reading the mount,
 * and the two omissions are the finding.
 */
const CARRIER: Partial<Record<SurfaceElement, string>> = {
  MARKET_CANVAS: "MarketCanvasPanel",
  THESIS_GEOMETRY: "DLARStrip",
  EXPRESSION_CARD: "ContractStance",
  ONE_STORY: "OneStoryStrip",
  PROTECTION_GRADE: "ProtectionGradeLine",
  HUMILITY_PANEL: "HumilityPanel",
  // The provenance chips ARE the fidelity disclosure — "SESSION · OBSERVED",
  // "POSITION · UNOBSERVED" — and they live inside the admission panel.
  FIDELITY_CHIPS: "SceneAdmissionPanel",
  RECEIPT_SHEET: "DecisionReceiptPanel",
};

/**
 * Elements with no surface on any scene-compiling route. THE DEBT LEDGER.
 *
 * It may only SHRINK. An entry leaving this list means someone gave a noun a
 * screen; an entry arriving means a shipped surface was deleted and nobody
 * noticed, which is precisely what these files exist to make impossible.
 */
const DEBT: Readonly<Record<string, string>> = {
  /**
   * DEAD VOCABULARY (§H19), and the most complete case of it in the repo.
   *
   * `HOT_PATH_REMOTE` is admitted in PENDING, MANAGE and DEGRADED — the three
   * scenes where capital is exposed. A grep for it across all of `src` returns
   * the type union, the SURFACE_ELEMENTS array, three admission branches, and
   * one entry in SceneAdmissionPanel's label map so the panel can print the
   * words "Hot path remote" when refusing it. That is the entire footprint.
   * There is no component, no producer, no test, and no definition of what it
   * would show.
   *
   * It must not be repaired by inventing one. §H19's rule is that vocabulary
   * with no producer behind it is either given an owner by an authority or
   * RETIRED, and guessing at the semantics of a safety element admitted only
   * while money is exposed is the worst possible place to guess.
   */
  HOT_PATH_REMOTE:
    "no component, no producer, no definition — awaiting an authority ruling to own or retire",
  /**
   * §9's escape hatch, and the subtler case.
   *
   * Unlike HOT_PATH_REMOTE, renderers for this DO exist — the broker panels on
   * /charts. What does not exist is any of them on a route that compiles a
   * scene, so the compiler's invariant ("OPEN_BROKER is admitted in every scene
   * where capital is at risk ... a degraded screen that hides the way out is
   * worse than no screen") is currently enforced over nothing.
   *
   * /paper is the only scene-compiling route with a book, and it is a PAPER
   * book with no live broker to open, so the fix is NOT to staple a button
   * there. The gap closes when a live-capital room compiles a scene.
   */
  OPEN_BROKER:
    "renderers exist on /charts, but no scene-compiling route has one — the invariant guards nothing yet",
};

describe("surface element reach — all twelve §10 nouns, measured", () => {
  it("every element is either gated, mounted, or named in the debt ledger", () => {
    const unaccounted: string[] = [];
    for (const element of SURFACE_ELEMENTS) {
      const gated = gatedOn(element);
      const carrier = CARRIER[element];
      const mounted = carrier ? mountedOn(carrier) : [];
      if (gated.length === 0 && mounted.length === 0 && !(element in DEBT)) {
        unaccounted.push(element);
      }
    }
    expect(
      unaccounted,
      "an element reached no screen and is not in the debt ledger. Either give " +
        "it a surface or write down, in DEBT, why it has none. Silence is the " +
        "one option this file removes.",
    ).toEqual([]);
  });

  it("the debt ledger is exactly these two, and it may only shrink", () => {
    const actuallyUnreached = SURFACE_ELEMENTS.filter(element => {
      const carrier = CARRIER[element];
      return gatedOn(element).length === 0 && (!carrier || mountedOn(carrier).length === 0);
    });
    expect(
      [...actuallyUnreached].sort(),
      "the set of unreached elements changed. If it SHRANK, delete the entry " +
        "from DEBT. If it GREW, a surface the OS admits stopped being painted.",
    ).toEqual(Object.keys(DEBT).sort());
  });

  it("no debt entry is a stub — each says why, not just that", () => {
    for (const [element, reason] of Object.entries(DEBT)) {
      expect(SURFACE_ELEMENTS as readonly string[]).toContain(element);
      expect(
        reason.length,
        `${element}'s debt entry is too short to be a reason. "TODO" is not a ` +
          `disclosure; the next reader needs to know what closing it requires.`,
      ).toBeGreaterThan(40);
    }
  });

  it("every declared carrier is a real component that a real route renders", () => {
    // Guards the opposite failure from the ledger: a mapping that quietly goes
    // stale after a rename would make this whole table report reach that no
    // longer exists.
    for (const [element, component] of Object.entries(CARRIER)) {
      expect(
        mountedOn(component),
        `${element} claims ${component} carries it, but no route imports and ` +
          `renders that component. The mapping is stale.`,
      ).not.toEqual([]);
    }
  });

  it("no element is BOTH in the debt ledger and reachable", () => {
    for (const element of Object.keys(DEBT) as SurfaceElement[]) {
      const carrier = CARRIER[element];
      expect(gatedOn(element), `${element} is gated but listed as debt`).toEqual([]);
      if (carrier) {
        expect(mountedOn(carrier), `${element} is mounted but listed as debt`).toEqual([]);
      }
    }
  });

  it("gating is not the only honest answer, and the split is recorded", () => {
    // Sanity on the measurement itself. If this ever reports zero gated
    // elements, the `code()` blanking or the route walk broke and every
    // assertion above became vacuously true.
    const gated = SURFACE_ELEMENTS.filter(e => gatedOn(e).length > 0);
    const mountedOnly = SURFACE_ELEMENTS.filter(
      e => gatedOn(e).length === 0 && CARRIER[e] && mountedOn(CARRIER[e]!).length > 0,
    );
    expect(gated.length).toBeGreaterThan(3);
    expect(mountedOnly.length).toBeGreaterThan(0);
    expect(gated.length + mountedOnly.length + Object.keys(DEBT).length).toBe(
      SURFACE_ELEMENTS.length,
    );
  });
});
