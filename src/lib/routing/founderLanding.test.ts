/**
 * The landing decision must keep having exactly one owner.
 *
 * ── Why a source-reading test and not a unit test ────────────────────────────
 *
 * A unit test on a constant proves nothing. The defect here was never that the
 * constant held a wrong value — it was that THREE files each held their own
 * copy of the decision, agreed by coincidence, and therefore hid the fact that
 * the decision had three owners at all. The only thing that can catch that
 * coming back is a test that reads the arrival sites and checks they still
 * derive instead of retype.
 *
 * Comments are stripped before matching (see sourceGraph.stripComments). The
 * files under test EXPLAIN themselves in prose that necessarily names the old
 * route, and a guard that accepts prose as evidence is the defect one level in.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "../../app/manifest";
import { SRC_ROOT, sourceFiles, stripComments } from "../ops/sourceGraph";
import { FOUNDER_LANDING_ROUTE, INSTRUMENT_VIEW_ROUTE } from "./founderLanding";

/**
 * Every place a human can arrive WITHOUT having named a destination.
 *
 * Adding a fourth arrival path (an OAuth callback, a password-reset landing, a
 * push-notification deep link) means adding it here. An arrival site that is
 * not in this list is not guarded, and that is the whole failure being fenced.
 */
const ARRIVAL_SITES = [
  "app/page.tsx",
  "contexts/AuthContext.tsx",
  "app/auth/confirm/route.ts",
  // The fourth, found by hunting for what could still hand a Founder to the
  // July composition after the other three had moved: the installed PWA.
  // Tapping the home-screen icon names no destination. It lived in
  // public/manifest.json as `"start_url": "/charts"` — unreachable by the
  // cutover because static JSON cannot import an owner, which is exactly why it
  // was the copy left behind.
  "app/manifest.ts",
] as const;

const read = (rel: string): string => stripComments(readFileSync(join(SRC_ROOT, rel), "utf8"));

/** The owner module, relative to `src` — the one file allowed to say the route. */
const OWNER = "lib/routing/founderLanding.ts";

/**
 * The retyped-literal pattern, named ONCE. Both the arrival-site rule and the
 * positive control below match through this constant, so the guard cannot
 * certify a pattern the rule no longer uses.
 */
const HARDCODED_ROUTE_PATTERN = /["'`]\/(charts|command-deck|paper|readiness)["'`]/;

/**
 * The whole-repo source set, resolved ONCE so the floor, the positive control
 * and the shadow-owner rule all judge the SAME files. Calling `sourceFiles()`
 * twice would let a guard pass over one set while the rule ran over another.
 */
const SOURCE_FILES = sourceFiles();

/**
 * MEASURED (2026-09-19, this tree): ARRIVAL_SITES = 4; sourceFiles() = 704
 * non-test `.ts`/`.tsx` files under `src`. Floors sit well below both.
 */
const MIN_ARRIVAL_SITES = 3;
const MIN_SOURCE_FILES = 400;

/**
 * ── ANTI-VACUITY ─────────────────────────────────────────────────────────────
 *
 * Every rule in this file is a loop or a filter that asserts an empty result,
 * and each is green in two entirely different situations:
 *
 *   (a) NOTHING TO CHECK. `ARRIVAL_SITES` is a HAND-DECLARED list of four
 *       paths. Trim it — during a refactor, or because a site "moved" — and the
 *       first two tests iterate zero files and pass. The same for the
 *       shadow-owner rule: if `sourceFiles()` ever walks the wrong root (it
 *       resolves `src` from `process.cwd()`, so a different runner cwd is
 *       enough), the offender filter runs over an empty array.
 *
 *   (b) THE PATTERN WENT STALE. The retype detector is a literal-string match:
 *       `"/charts"` with double quotes, and `HARDCODED_ROUTE_PATTERN`'s fixed
 *       alternation of four route names. Re-point the landing at a route that
 *       is not in that alternation, or let consumers build routes via a
 *       template (`` `/${section}` ``) or a route-map lookup, and the detector
 *       matches nothing — including in files that DO retype the decision. This
 *       is the failure a file count cannot see, so it is controlled against the
 *       OWNER module: the one file that is supposed to contain the literal.
 */
describe("ANTI-VACUITY: these guards are still reading files and still able to match", () => {
  it("the arrival-site list has not been trimmed to nothing", () => {
    expect(
      ARRIVAL_SITES.length,
      "ARRIVAL_SITES has shrunk — the two loops below then iterate (almost) nothing and report " +
        "that every no-destination arrival derives the owner while checking none of them",
    ).toBeGreaterThan(MIN_ARRIVAL_SITES - 1);
  });

  it("every declared arrival site still exists on disk", () => {
    // A declared path that was renamed is a site nobody guards any more. The
    // read below would throw, but stating it here names the actual fault
    // instead of an ENOENT stack, and makes deletion-by-rename impossible to
    // mistake for compliance.
    const missing = ARRIVAL_SITES.filter((site) => !existsSync(join(SRC_ROOT, site)));
    expect(
      missing,
      "these arrival sites are declared but no longer exist — they were renamed or deleted, and " +
        "whatever replaced them is arriving unguarded",
    ).toEqual([]);
  });

  it("the whole-repo scan actually walked the repo", () => {
    expect(
      SOURCE_FILES.length,
      `sourceFiles() returned almost nothing from ${SRC_ROOT}. The shadow-owner rule below then ` +
        "finds zero retypers because it opened zero files",
    ).toBeGreaterThan(MIN_SOURCE_FILES);
  });

  it("POSITIVE CONTROL: the retype detectors still match the owner's own source", () => {
    // The owner is the canonical WRITER of both routes and is the one file the
    // shadow-owner rule excludes. If the detector cannot find the literal in
    // the file that DECLARES it, it cannot find a retyped copy anywhere — and
    // every "no offenders" verdict below would be an artefact of the pattern,
    // not a fact about the repo.
    const owner = SOURCE_FILES.find((f) => f.file === OWNER);
    expect(
      owner,
      `${OWNER} is not in the scanned set — the owner moved, so the rule below is excluding a ` +
        "path that no longer exists while the real owner is judged as an offender",
    ).toBeDefined();
    // Pinned to the DECLARATION, not merely to the literal appearing somewhere
    // in the file: the two constants currently hold the same string, so a
    // file-wide `toContain` would be satisfied by FOUNDER_LANDING_ROUTE's copy
    // and would miss a quote-style change to the instrument view alone. That
    // exact miss was observed while proving this guard bites.
    expect(
      owner!.text,
      `${OWNER} no longer declares INSTRUMENT_VIEW_ROUTE as "${INSTRUMENT_VIEW_ROUTE}" in the ` +
        "exact double-quoted form the shadow-owner rule searches for (a switch to single " +
        "quotes or a template literal is enough). That rule is now matching a string nothing " +
        "writes, so it would report zero retypers over a repo full of them",
    ).toContain(`INSTRUMENT_VIEW_ROUTE = "${INSTRUMENT_VIEW_ROUTE}"`);
    expect(
      owner!.text,
      "HARDCODED_ROUTE_PATTERN no longer matches the owner's own route declarations — the " +
        "alternation of route names has gone stale, so the arrival-site literal check can no " +
        "longer recognise a hardcoded landing route",
    ).toMatch(HARDCODED_ROUTE_PATTERN);
  });
});

describe("the Founder landing route has one owner", () => {
  it("every no-destination arrival derives the route instead of retyping it", () => {
    for (const site of ARRIVAL_SITES) {
      expect(read(site), `${site} must import the landing owner`).toContain("FOUNDER_LANDING_ROUTE");
    }
  });

  it("no arrival site still carries a hardcoded route literal", () => {
    // This is the assertion that actually bites. An arrival site can import the
    // owner AND keep an old literal on a branch nobody reads — which is how a
    // half-done cutover survives a green suite.
    for (const site of ARRIVAL_SITES) {
      const text = read(site);
      // Same constant the positive control proved still matches the owner.
      expect(text, `${site} still hardcodes a landing route`).not.toMatch(HARDCODED_ROUTE_PATTERN);
    }
  });

  it("the landing route resolves to a page that exists", () => {
    const segment = FOUNDER_LANDING_ROUTE.replace(/^\//, "");
    expect(() => readFileSync(join(SRC_ROOT, "app", segment, "page.tsx"), "utf8")).not.toThrow();
  });

  it("landing and instrument-view are not the same decision", () => {
    /**
     * They were the same string for months, which is precisely how the landing
     * decision hid: every consumer could claim it was "just going to charts".
     *
     * ── RE-PINNED TO THE MEANING, NOT WEAKENED ──────────────────────────────
     *
     * This read `expect(FOUNDER_LANDING_ROUTE).not.toBe(INSTRUMENT_VIEW_ROUTE)`.
     * The 2026-09-17 Founder cut points the landing at the chart, so the two
     * constants hold the same VALUE — and that assertion would have failed for
     * a product decision it was never written to have an opinion about.
     *
     * The defect it exists to catch was never equal values. It was ONE
     * declaration wearing two names, so that editing "where a Founder lands"
     * silently edited "where a named instrument link goes". What has to stay
     * true is INDEPENDENCE: two separate declarations, neither defined in terms
     * of the other, each a literal a human can re-point alone.
     *
     * So the guard now reads the owner, and holds that invariant DIRECTLY
     * rather than inferring it from a value.
     *
     * Honest about the trade: this no longer fails when the two hold equal
     * strings, because equal strings are not the defect. What it gains is the
     * derived-but-unequal case the old assertion was blind to —
     *
     *   export const INSTRUMENT_VIEW_ROUTE = FOUNDER_LANDING_ROUTE.replace(…)
     *
     * — which is one declaration wearing two names while still LOOKING like
     * two decisions, and which the old `not.toBe` passed. Both mutations are
     * recorded in the commit that re-pinned this.
     */
    const owner = read("lib/routing/founderLanding.ts");

    for (const name of ["FOUNDER_LANDING_ROUTE", "INSTRUMENT_VIEW_ROUTE"] as const) {
      const decl = new RegExp(`export const ${name}\\s*=\\s*("[^"]+"|'[^']+')\\s*;`);
      expect(owner, `${name} is no longer its own literal declaration`).toMatch(decl);
    }

    // Neither may be expressed through the other. An alias is the relapse.
    expect(owner, "the landing route is an alias of the instrument view")
      .not.toMatch(/export const FOUNDER_LANDING_ROUTE\s*=\s*INSTRUMENT_VIEW_ROUTE/);
    expect(owner, "the instrument view is an alias of the landing route")
      .not.toMatch(/export const INSTRUMENT_VIEW_ROUTE\s*=\s*FOUNDER_LANDING_ROUTE/);

    // And both must still resolve to real, separately-nameable routes.
    for (const route of [FOUNDER_LANDING_ROUTE, INSTRUMENT_VIEW_ROUTE]) {
      expect(route).toMatch(/^\/[a-z0-9-]+$/);
    }
  });

  it("the landing surface does not offer a way BACK out of itself", () => {
    /**
     * A back arrow is a claim about hierarchy: that the human arrived from
     * somewhere else and that this surface sits beneath it. On the route a
     * human reaches having named NO destination, both halves of that claim are
     * false — and a screen reader says the false half out loud.
     *
     * The deck header carried `← CHARTS` with aria-label "Back to charts" for
     * exactly as long as /charts was the landing route. The cutover made that
     * sentence wrong without touching the sentence.
     */
    const segment = FOUNDER_LANDING_ROUTE.replace(/^\//, "");
    const page = read(join("app", segment, "page.tsx"));
    expect(page, "the landing surface renders a back arrow").not.toContain("ArrowLeft");
    expect(page, "the landing surface has a control whose accessible name says 'back'")
      .not.toMatch(/aria-label=["'][^"']*\bback\b/i);
  });

  it("the installed app opens on the landing route, not the instrument view", () => {
    // Source-reading cannot reach this one: start_url is a VALUE the generator
    // returns, so the guard has to call it. A manifest that imports the owner
    // and still starts somewhere else is the half-done cutover in its quietest
    // form — nothing in the repo looks wrong, and the home-screen icon is what
    // disagrees.
    const m = manifest();
    expect(m.start_url, "the installed PWA lands somewhere the owner did not choose")
      .toBe(FOUNDER_LANDING_ROUTE);
    const charts = m.shortcuts?.find((s) => s.short_name === "Charts");
    expect(charts?.url, "a NAMED shortcut must go where it says, not to the landing route")
      .toBe(INSTRUMENT_VIEW_ROUTE);
  });

  it("the served manifest link points at a path the app actually serves", () => {
    // Generating the manifest moves it from /manifest.json to
    // /manifest.webmanifest. A <link rel="manifest"> left on the old path is an
    // install that degrades in silence: no error, no icon, no start_url.
    const layout = read("app/layout.tsx");
    expect(layout).toContain("/manifest.webmanifest");
    expect(layout, "layout still links the retired static manifest").not.toContain("/manifest.json");
    const sw = stripComments(
      readFileSync(join(SRC_ROOT, "..", "public", "sw.js"), "utf8"),
    );
    expect(sw, "the service worker pre-caches a manifest path that 404s")
      .not.toContain("/manifest.json");
  });

  it("no file outside the owner retypes the instrument-view route", () => {
    /**
     * The arrival-site guards above only watch four files. That left
     * INSTRUMENT_VIEW_ROUTE a SHADOW OWNER: declared, exported, and consumed by
     * two files while SIX others — MainLayout, TickerTape (seven times in one
     * file), MobileSessionPill, ChartsDashboard, nectar, ai-bot — each kept a
     * private "/charts". That is strictly worse than having no owner at all,
     * because a reader who finds the constant concludes the decision is
     * centralised and stops looking.
     *
     * Whole-repo, because the defect is not located anywhere in particular —
     * it is located in every file that did not think of itself as routing.
     */
    // sourceFiles() already strips comments and excludes tests, so the only
    // exemption needed is the owner itself — the one file allowed to say it.
    // Filtered out of the SAME module-level set the anti-vacuity guards above
    // measured and positively controlled, rather than a second walk.
    const offenders = SOURCE_FILES.filter((f) => f.file !== OWNER)
      .filter((f) => f.text.includes(`"${INSTRUMENT_VIEW_ROUTE}"`))
      .map((f) => f.file);
    expect(offenders, "these files retype the route instead of importing it").toEqual([]);
  });

  it("both routes are absolute app paths, not fragments", () => {
    for (const route of [FOUNDER_LANDING_ROUTE, INSTRUMENT_VIEW_ROUTE]) {
      expect(route.startsWith("/")).toBe(true);
      expect(route).not.toContain("?");
      expect(route).not.toContain("#");
    }
  });
});
