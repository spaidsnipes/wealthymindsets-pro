/**
 * A BROKER ENDPOINT WITH NO CONSUMER IS NOT A FEATURE. IT IS A CLAIM.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `/api/broker/certification` shipped a complete twelve-stage read side —
 * canon §W3 taxonomy, a pure level selector, auth gating, and its own test
 * file — and NOTHING in the app ever called it. The only place a human could
 * encounter the Certification Harness was one sentence of prose on /readiness
 * telling them the harness "owns that proof," pointing at a door that had never
 * been cut.
 *
 * Every source Sentinel was green the entire time, correctly: the endpoint was
 * well-typed, well-tested, and did exactly what it said. The defect was not in
 * the endpoint. It was in the absence of an edge leading to it, and absence has
 * no file to typecheck. This is BACKEND_GREEN_FRONTEND_DARK, and it is the
 * shape a codebase takes when the read side is easier to write than the wiring.
 *
 * ── What this guards, precisely ──────────────────────────────────────────────
 *
 * For every broker route under `src/app/api/broker/**`, at least one file
 * OUTSIDE `src/app/api/` and outside the test suite must reference its path.
 * That is a weak claim on purpose — it proves an edge EXISTS, not that the edge
 * renders anything a trader would understand. A strong claim would need a
 * rendered pixel, which lives in the phone-geometry harness, not here.
 *
 * Weak and enforced beats strong and aspirational. The failure this catches is
 * the total absence of a caller, which is exactly the failure that occurred.
 *
 * Comments are stripped before matching — see `stripComments` for the measured
 * reason. A module header that NAMES an endpoint is not a caller of it, and the
 * first draft of this guard could not tell the difference.
 *
 * ── The exemption, made to cost something ────────────────────────────────────
 *
 * `UNCONSUMED_BY_DESIGN` is deliberately empty. An endpoint added with no
 * consumer must either get one or be named here WITH a reason, so the choice is
 * visible in a diff instead of decided by nobody.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");
const BROKER_API = join(ROOT, "app", "api", "broker");

/**
 * Endpoints with no in-app caller, each carrying the reason and the ticket.
 *
 * This is a DEBT REGISTER, not a waiver list. An entry here does not say the
 * endpoint is fine unconsumed; it says the gap is known, named, and owned, so
 * it can be counted instead of forgotten. Adding a key is a decision that shows
 * up in a diff with someone's name on it.
 */
const UNCONSUMED_BY_DESIGN: Readonly<Record<string, string>> = {
  "/api/broker/tastytrade/market-metrics":
    "FOUND BY THIS GUARD on its first honest run (2026-09-12), immediately after " +
    "comment-stripping was added. Same defect class as certification: a working " +
    "endpoint returning tastytrade IV/volatility metrics that nothing renders. " +
    "Referenced only by its own test and by a path list in a tastytradeAdapter " +
    "doc comment. Exempted rather than silently wired, because giving IV rank a " +
    "surface is a real design decision about where volatility belongs in the " +
    "deck — not something to bolt on at the end of an unrelated atom. Task #47.",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every broker route's public path, e.g. "/api/broker/certification". */
function brokerRoutePaths(): string[] {
  return walk(BROKER_API)
    .filter((f) => f.endsWith(`${sep}route.ts`))
    .map((f) => f.slice(ROOT.length, -`${sep}route.ts`.length).split(sep).join("/"))
    .map((p) => p.replace(/^\/app/, ""))
    .sort();
}

/**
 * Remove comments before matching.
 *
 * MEASURED, not theorised: the first version of this guard did not strip them,
 * and when the /readiness fetch was deliberately typo'd to prove the guard
 * bites, IT STAYED GREEN — because the page's own explanatory JSX comment and
 * the selector's module header both spell the endpoint path. A guard that
 * accepts PROSE as evidence of wiring is the exact defect it was written to
 * catch, one level in: a clean report about something nobody connected.
 *
 * Conservative on purpose. Block comments go entirely; line comments are
 * dropped only when the line's first non-space characters are `//` or `*`, so
 * a `//` inside a real `https://` URL in live code is never touched.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("//") && !t.startsWith("*");
    })
    .join("\n");
}

/** Source files that could plausibly call an endpoint: app + lib + components,
 * minus the API handlers themselves and minus tests. A route referenced only by
 * its own test is exactly the state this guard exists to reject. */
function callerSources(): { readonly file: string; readonly text: string }[] {
  const apiPrefix = join(ROOT, "app", "api") + sep;
  return walk(ROOT)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !f.startsWith(apiPrefix))
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f))
    .map((f) => ({ file: f.slice(ROOT.length + 1), text: stripComments(readFileSync(f, "utf8")) }));
}

describe("every broker endpoint has something that actually calls it", () => {
  const routes = brokerRoutePaths();
  const sources = callerSources();

  it("finds broker routes to check at all", () => {
    // Guards the guard: if the directory layout changes and this walk returns
    // nothing, the suite below would pass vacuously over zero routes.
    expect(routes.length).toBeGreaterThan(0);
    expect(routes).toContain("/api/broker/certification");
    expect(sources.length).toBeGreaterThan(0);
  });

  it("no broker endpoint is reachable only from its own test file", () => {
    const orphans = routes.filter((route) => {
      if (route in UNCONSUMED_BY_DESIGN) return false;
      return !sources.some((s) => s.text.includes(route));
    });

    expect(
      orphans,
      "these broker endpoints exist, are typed, are tested, and NOTHING in the app " +
        "calls them. Every source Sentinel stays green because the defect is a missing " +
        "edge, and absence has no file to typecheck. Give each one a consumer, or name " +
        "it in UNCONSUMED_BY_DESIGN with the reason",
    ).toEqual([]);
  });

  it("every exemption names a route that still exists and still has no caller", () => {
    // A stale exemption is worse than none. It silently pre-forgives a path
    // that may have been deleted, renamed, or — the dangerous case — quietly
    // GIVEN a consumer, in which case the debt register is overstating the debt
    // and the next reader trusts a number that is wrong.
    for (const [path, reason] of Object.entries(UNCONSUMED_BY_DESIGN)) {
      expect(
        routes,
        `${path} is exempted but no such broker route exists — delete the entry ` +
          "rather than leaving it to cover a route that comes back",
      ).toContain(path);

      expect(
        sources.some((s) => s.text.includes(path)),
        `${path} is listed as unconsumed but something now calls it — delete the ` +
          "exemption so the register stops claiming a debt that was paid",
      ).toBe(false);

      expect(reason.length, `${path} is exempted without a reason`).toBeGreaterThan(40);
    }
  });

  it("the certification board is consumed from a surface, not just a lib", () => {
    // The specific regression. /api/broker/certification is the endpoint that
    // was dark; naming it here means a future refactor that drops the
    // /readiness wiring fails by name rather than sliding back into prose.
    const consumers = sources
      .filter((s) => s.text.includes("/api/broker/certification"))
      .map((s) => s.file);

    expect(
      consumers.some((f) => f.startsWith("app/") || f.startsWith("components/")),
      `certification is referenced only from ${JSON.stringify(consumers)} — no page or ` +
        "component reaches it, so the twelve-stage read side is once again something " +
        "the Founder is told about rather than shown",
    ).toBe(true);
  });
});
