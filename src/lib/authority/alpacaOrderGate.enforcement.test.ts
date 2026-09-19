/**
 * Alpaca order-gate enforcement — canon (Aug-30) "NO MODEL OUTPUT ALONE
 * CREATES AUTHORITY."
 *
 * This shift found a SECOND real Alpaca order-submit path that had shipped
 * WITHOUT the authority gate, because the first wiring covered only one of two
 * sibling routes. That is a root-cause class, not a one-off: any future route
 * that POSTs to Alpaca `/v2/orders` could re-open the same hole.
 *
 * This Sentinel walks src/app/api and FAILS if any route submits an Alpaca
 * order (a POST to `/v2/orders`) without importing `authorizeAlpacaOrder`.
 * A new ungated order path can no longer pass CI silently.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const API_ROOT = resolve(__dirname, "..", "..", "app", "api");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".open-next") continue;
      walk(p, acc);
    } else if (name === "route.ts" || name === "route.tsx") {
      acc.push(p);
    }
  }
  return acc;
}

/** The Alpaca REST path an order submit POSTs to. */
const ORDERS_ENDPOINT = "/v2/orders";

/** The HTTP-verb shape that distinguishes a SUBMIT from a list (GET) or cancel (DELETE). */
const POST_METHOD_PATTERN = /method:\s*["']POST["']/;

/** The gate every order-submit route must call. */
const GATE_SYMBOL = "authorizeAlpacaOrder";

/**
 * The two routes known to submit orders today. They are the POSITIVE CONTROL
 * specimens for `submitsAlpacaOrder` below — see the ANTI-VACUITY test.
 */
const KNOWN_ORDER_ROUTES = ["alpaca/trade/route.ts", "alpaca-trading/route.ts"];

/** Does this route submit an Alpaca order (a POST to /v2/orders)? */
function submitsAlpacaOrder(content: string): boolean {
  if (!content.includes(ORDERS_ENDPOINT)) return false;
  // A POST anywhere in a file that also references the orders endpoint is the
  // order-submit signature. (The list path is a GET; cancel is a DELETE.)
  return POST_METHOD_PATTERN.test(content);
}

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(API_ROOT);

describe("Alpaca order gate enforcement — every order-submit route runs the gate", () => {
  const routes = ALL_FILES;

  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it reaches that emptiness
   * through TWO filters stacked in series — first `walk()` must find route
   * files, then `submitsAlpacaOrder()` must recognise one as an order submit.
   * Either filter going to zero produces the same green result, and both are
   * fragile for boring reasons:
   *
   *   - `walk()` collects ONLY files literally named `route.ts` / `route.tsx`.
   *     A Next.js convention change, a move of `src/app/api`, or a route
   *     expressed as `route.mts` empties the scan outright.
   *   - `submitsAlpacaOrder()` is a two-token string match. It needs the literal
   *     `/v2/orders` AND a literal `method: "POST"` in the same file. Move the
   *     endpoint into a shared constant (`ALPACA_ORDERS_PATH`), or build the
   *     request through a helper that sets the verb elsewhere, and the predicate
   *     stops recognising an order path that is still very much submitting
   *     orders. Nothing fails. The gate just quietly stops covering it.
   *
   * That second failure is the dangerous one, because it is the ROOT-CAUSE
   * CLASS this file was written for: a sibling order route shipping ungated.
   * A detector that cannot see order routes cannot notice the next one.
   *
   * So the guard is a POSITIVE CONTROL against both live order paths. These two
   * routes are the canonical writers — they are the ones the rule below is
   * actually policing, and they are named in the sanity test that follows. If
   * `submitsAlpacaOrder` cannot recognise THEM, it recognises nothing, and this
   * Sentinel is green over an empty set.
   */
  it("ANTI-VACUITY: the walk reaches the api tree and the submit predicate still recognises both order routes", () => {
    expect(
      ALL_FILES.length,
      "walk(src/app/api) found almost no route files — did src/app/api move, " +
        "did this test file move relative to it, or did Next.js stop naming " +
        "route handlers `route.ts`? An empty scan makes the rule below " +
        "permanently green while policing nothing. Re-point API_ROOT at the " +
        "real route tree and re-check the filename filter in walk()",
    ).toBeGreaterThan(30);

    for (const rel of KNOWN_ORDER_ROUTES) {
      const content = readFileSync(resolve(API_ROOT, rel), "utf8");
      expect(
        submitsAlpacaOrder(content),
        `submitsAlpacaOrder() no longer recognises ${rel} as an order submit — ` +
          "and that route is a KNOWN, live Alpaca order path. The detector needs " +
          `the literal "${ORDERS_ENDPOINT}" and a literal \`method: "POST"\` in ` +
          "the same file; one of those was refactored away (endpoint hoisted to " +
          "a constant, verb set inside a request helper). The rule below is now " +
          "green because it can see zero order routes, not because they are all " +
          "gated. Re-derive the predicate from how orders are actually submitted " +
          "today, then re-check that every submit path still calls " +
          `${GATE_SYMBOL}`,
      ).toBe(true);
    }
  });

  it("finds the known Alpaca order routes (sanity — the walk actually sees them)", () => {
    const submitters = routes.filter((f) => submitsAlpacaOrder(readFileSync(f, "utf8")));
    const rels = submitters.map((f) => f.replace(API_ROOT + "/", "")).sort();
    for (const known of KNOWN_ORDER_ROUTES) {
      expect(
        rels,
        `${known} is a known Alpaca order-submit route but the scan did not ` +
          "classify it as one. Either the route moved/was renamed, or " +
          "submitsAlpacaOrder() no longer recognises its shape. Until this is " +
          "fixed the rule below is policing fewer order paths than exist",
      ).toContain(known);
    }
  });

  it("no Alpaca order-submit route bypasses authorizeAlpacaOrder", () => {
    const violations: string[] = [];
    for (const file of routes) {
      const content = readFileSync(file, "utf8");
      if (!submitsAlpacaOrder(content)) continue;
      if (!content.includes(GATE_SYMBOL)) {
        violations.push(file.replace(API_ROOT + "/", ""));
      }
    }
    expect(
      violations,
      `These routes POST to ${ORDERS_ENDPOINT} without calling ${GATE_SYMBOL}: ` +
        `${violations.join(", ")}. Canon (Aug-30): NO MODEL OUTPUT ALONE CREATES ` +
        "AUTHORITY. Wire the gate into each route before the order is submitted",
    ).toEqual([]);
  });
});
