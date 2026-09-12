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
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_AUTH_PATHS } from "@/lib/authRoutes";

const SCRIPT = resolve(process.cwd(), "scripts/audit-phone-parity.mjs");

/**
 * A public path that is audited under a DIFFERENT string, with the reason. The
 * alias target is asserted to be in the audited list, so this is a redirection
 * of the measurement and never a waiver of it.
 */
const AUDITED_BY_ALIAS: Readonly<Record<string, string>> = {
  "/signup": "/login?mode=signup",
};

function auditedRoutes(): string[] {
  const source = readFileSync(SCRIPT, "utf8");
  const match = source.match(/const ROUTES = routes\.length \? routes : \[([^\]]*)\]/);
  expect(
    match,
    "the phone audit's default route list could not be read — it was renamed or restructured, " +
      "and this guard can no longer tell which routes CI actually measures",
  ).not.toBeNull();
  return [...(match as RegExpMatchArray)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

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
