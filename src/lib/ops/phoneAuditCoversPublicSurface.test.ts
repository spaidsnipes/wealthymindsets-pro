/**
 * THE PHONE AUDIT MUST COVER EVERY PAGE IT IS ABLE TO COVER.
 *
 * ── The gap ──────────────────────────────────────────────────────────────────
 *
 * `scripts/audit-phone-parity.mjs` carries a hardcoded default route list. The
 * app declares its public surface separately, in `PUBLIC_AUTH_PATHS`. Two lists
 * describing the same thing, with nothing joining them, is a drift waiting for
 * a date: add a public route, ship it, and the phone gate reports green over a
 * surface it never opened. Coverage would shrink silently, which is the only
 * way coverage ever shrinks.
 *
 * This is the same shape as the defects the harness itself exists to catch —
 * a clean report about something nobody looked at — one level further out.
 *
 * ── Why this lives in a test and not in the script ───────────────────────────
 *
 * The harness is a dependency-free `.mjs` run by CI before any TypeScript is
 * loaded; it cannot import a `.ts` module without a build step that would make
 * the geometry gate depend on the thing it is measuring. A Sentinel can import
 * the real declaration AND read the script's source, so the join is enforced in
 * the one place that can see both halves honestly.
 *
 * ── The one exemption, made visible ──────────────────────────────────────────
 *
 * `/signup` is NOT audited as a bare path, and that is correct: it is a
 * `router.replace` alias for `/login?mode=signup`. Auditing the bare path would
 * land on the login form, measure it twice, and report the signup form clean
 * without ever rendering it. The exemption is DECLARED below with its alias
 * target, and the target must itself be audited — so the exemption can never be
 * used to quietly drop a route rather than to redirect the measurement.
 *
 * ── ANTI-VACUITY: how THIS gate could report green over nothing ──────────────
 *
 * This Sentinel is a set-difference: `PUBLIC_AUTH_PATHS - audited`. A set
 * difference is empty for two entirely different reasons, and the assertion
 * cannot tell them apart:
 *
 *   (a) NOTHING TO CHECK. `PUBLIC_AUTH_PATHS` empties or shrinks — a refactor
 *       moves the public surface into a route-group config, the export becomes
 *       a function, someone "temporarily" trims it. The minuend is empty, the
 *       difference is empty, and this file reports that the phone audit covers
 *       the whole public surface while comparing against zero routes.
 *
 *   (b) THE PATTERN WENT STALE. The audited list is read out of a `.mjs` by
 *       REGEX. Reformat that one line — prettier wraps it, someone switches to
 *       `const ROUTES = routes.length > 0 ? …`, or moves the defaults into a
 *       `DEFAULT_ROUTES` const — and the match dies. The existing `.not.toBeNull`
 *       does bite for a total miss, but a SHAPE drift that still matches while
 *       capturing a different, shorter list would not be seen at all. Equally,
 *       the alias exemption rests on a claim about a FILE: that `/signup` merely
 *       `router.replace`s to `/login?mode=signup`. The day that page grows a real
 *       form, the exemption silently waives measurement of a live surface — and
 *       nothing in the old assertions reads that page.
 *
 * So: the route-list regex is named ONCE below and used by both the guard and
 * the rule; both lists carry a floor; every declared public path must resolve to
 * a page on disk; and the alias is positively controlled against the redirect
 * page that is its only justification.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_AUTH_PATHS } from "@/lib/authRoutes";

const SCRIPT = resolve(process.cwd(), "scripts/audit-phone-parity.mjs");

/**
 * The route-list pattern, named ONCE. The guard below and the rule both read
 * the audited set through this constant, so a drift cannot make the guard look
 * at a healthy list while the rule compares against an empty one.
 */
const ROUTE_LIST_PATTERN = /const ROUTES = routes\.length \? routes : \[([^\]]*)\]/;

/** Read once, at module scope, so every assertion judges the same bytes. */
const SCRIPT_SOURCE = existsSync(SCRIPT) ? readFileSync(SCRIPT, "utf8") : null;
const ROUTE_LIST_MATCH = SCRIPT_SOURCE ? SCRIPT_SOURCE.match(ROUTE_LIST_PATTERN) : null;
const AUDITED_ROUTES: string[] = ROUTE_LIST_MATCH
  ? [...ROUTE_LIST_MATCH[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];

/**
 * MEASURED FLOORS (2026-09-19, counted on this tree):
 *   PUBLIC_AUTH_PATHS   = 3   (/login, /signup, /reset-password)
 *   AUDITED_ROUTES      = 3   (/login, /login?mode=signup, /reset-password)
 * Floors sit below both so ordinary product churn does not trip them, while a
 * collapse to zero or one — the shape that makes the set-difference vacuous —
 * fails loudly.
 */
const MIN_PUBLIC_PATHS = 2;
const MIN_AUDITED_ROUTES = 2;

/**
 * The page that is the ENTIRE justification for the `/signup` exemption. It is
 * a redirect and nothing else; the moment it renders a real form, auditing
 * `/login?mode=signup` stops standing in for auditing `/signup`.
 */
const SIGNUP_REDIRECT_PAGE = resolve(process.cwd(), "src/app/signup/page.tsx");

/**
 * A public path that is audited under a DIFFERENT string, with the reason. The
 * alias target is asserted to be in the audited list, so this is a redirection
 * of the measurement and never a waiver of it.
 */
const AUDITED_BY_ALIAS: Readonly<Record<string, string>> = {
  "/signup": "/login?mode=signup",
};

function auditedRoutes(): string[] {
  expect(
    ROUTE_LIST_MATCH,
    "the phone audit's default route list could not be read — it was renamed or restructured, " +
      "and this guard can no longer tell which routes CI actually measures",
  ).not.toBeNull();
  return AUDITED_ROUTES;
}

describe("ANTI-VACUITY: this gate is still comparing two real, populated lists", () => {
  it("the audit script this gate reads still exists", () => {
    expect(
      SCRIPT_SOURCE,
      `${SCRIPT} is gone. Every assertion below then compares against an empty audited list ` +
        "and the phone-coverage gate polices nothing",
    ).not.toBeNull();
  });

  it("the declared public surface has not collapsed", () => {
    // (a) NOTHING TO CHECK. An empty minuend makes the set-difference empty and
    // this whole file green while comparing zero routes against zero routes.
    expect(
      PUBLIC_AUTH_PATHS.length,
      "PUBLIC_AUTH_PATHS has shrunk to almost nothing, so the coverage subtraction below is " +
        "trivially empty — this gate would pass over a phone audit that opened no public route",
    ).toBeGreaterThan(MIN_PUBLIC_PATHS - 1);
  });

  it("the audited route list read out of the script is populated", () => {
    // (b) THE PATTERN WENT STALE, partially. A regex that still matches but
    // captures a truncated list is invisible to `.not.toBeNull()`.
    expect(
      AUDITED_ROUTES.length,
      "the regex matched but captured almost no routes — the default route list in " +
        `${SCRIPT} was restructured and this gate is now reading a fragment of it`,
    ).toBeGreaterThan(MIN_AUDITED_ROUTES - 1);
  });

  it("POSITIVE CONTROL: the two lists still speak the same dialect", () => {
    // If the script ever switched to full URLs, trailing slashes, or route
    // objects, EVERY public path would look uncovered — loud. But if the app
    // switched its declarations instead (e.g. to `/(auth)/login`), the overlap
    // would vanish the same way. Requiring at least one verbatim agreement
    // proves the `audited.includes(path)` comparison is still capable of
    // returning true at all, rather than being a permanent mismatch that would
    // have to be papered over with aliases.
    const agreed = PUBLIC_AUTH_PATHS.filter((p) => AUDITED_ROUTES.includes(p));
    expect(
      agreed.length,
      "not one declared public path appears verbatim in the audited route list — the two " +
        "sides no longer spell routes the same way, so this gate's membership test can never " +
        "match and coverage would have to be faked entirely through aliases",
    ).toBeGreaterThan(0);
  });

  it("every declared public path resolves to a page that exists", () => {
    // A path declared public but deleted from the app is a coverage claim about
    // a surface that is not there — and it also makes the audit measure a 404
    // and report it clean.
    const missing = PUBLIC_AUTH_PATHS.filter(
      (p) => !existsSync(resolve(process.cwd(), "src/app", p.replace(/^\//, ""), "page.tsx")),
    );
    expect(
      missing,
      "these paths are declared publicly reachable but have no page on disk — the phone audit " +
        "would measure a 404 and report it green",
    ).toEqual([]);
  });

  it("POSITIVE CONTROL: the /signup exemption's redirect page still only redirects", () => {
    // The exemption is a claim about this file and nothing else. If it grows a
    // real form, auditing /login?mode=signup stops standing in for it and the
    // exemption becomes exactly the silent route-drop it swears it is not.
    expect(existsSync(SIGNUP_REDIRECT_PAGE), `${SIGNUP_REDIRECT_PAGE} is missing`).toBe(true);
    const page = readFileSync(SIGNUP_REDIRECT_PAGE, "utf8");
    expect(
      page,
      "src/app/signup/page.tsx no longer redirects to /login?mode=signup, so the AUDITED_BY_ALIAS " +
        "exemption is now waiving measurement of a surface that renders on its own",
    ).toContain(AUDITED_BY_ALIAS["/signup"]);
    expect(
      page,
      "src/app/signup/page.tsx is no longer a bare router.replace alias — re-examine the " +
        "exemption before trusting it",
    ).toContain("router.replace");
  });
});

describe("the phone geometry gate covers the whole public surface", () => {
  it("audits every publicly reachable route, directly or through a declared alias", () => {
    const audited = auditedRoutes();
    const uncovered = PUBLIC_AUTH_PATHS.filter((path) => {
      const alias = AUDITED_BY_ALIAS[path];
      return !audited.includes(path) && !(alias && audited.includes(alias));
    });

    expect(
      uncovered,
      "these routes are reachable WITHOUT a session — so the phone audit is able to measure " +
        "them and does not. CI reports a green 375px check over a surface it never opened. " +
        "Add them to the default route list in scripts/audit-phone-parity.mjs, or declare an " +
        "alias in AUDITED_BY_ALIAS with the reason",
    ).toEqual([]);
  });

  it("an alias redirects the measurement rather than waiving it", () => {
    const audited = auditedRoutes();
    for (const [path, alias] of Object.entries(AUDITED_BY_ALIAS)) {
      expect(
        audited,
        `${path} is exempted as an alias for ${alias}, but ${alias} is not audited either — ` +
          "the exemption is being used to drop a route, not to redirect the measurement",
      ).toContain(alias);
    }
  });

  it("every exemption names a route that is actually public", () => {
    // A stale exemption is worse than none: it silently narrows the required
    // set for a path that may no longer exist or may no longer be public.
    for (const path of Object.keys(AUDITED_BY_ALIAS)) {
      expect(
        PUBLIC_AUTH_PATHS as readonly string[],
        `${path} is exempted from the phone audit but is no longer a public route — ` +
          "delete the exemption rather than leaving it to cover a route that comes back",
      ).toContain(path);
    }
  });
});
