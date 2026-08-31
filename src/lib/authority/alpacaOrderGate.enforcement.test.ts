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

/** Does this route submit an Alpaca order (a POST to /v2/orders)? */
function submitsAlpacaOrder(content: string): boolean {
  if (!content.includes("/v2/orders")) return false;
  // A POST anywhere in a file that also references the orders endpoint is the
  // order-submit signature. (The list path is a GET; cancel is a DELETE.)
  return /method:\s*["']POST["']/.test(content);
}

describe("Alpaca order gate enforcement — every order-submit route runs the gate", () => {
  const routes = walk(API_ROOT);

  it("finds the known Alpaca order routes (sanity — the walk actually sees them)", () => {
    const submitters = routes.filter((f) => submitsAlpacaOrder(readFileSync(f, "utf8")));
    const rels = submitters.map((f) => f.replace(API_ROOT + "/", "")).sort();
    expect(rels).toContain("alpaca/trade/route.ts");
    expect(rels).toContain("alpaca-trading/route.ts");
  });

  it("no Alpaca order-submit route bypasses authorizeAlpacaOrder", () => {
    const violations: string[] = [];
    for (const file of routes) {
      const content = readFileSync(file, "utf8");
      if (!submitsAlpacaOrder(content)) continue;
      if (!content.includes("authorizeAlpacaOrder")) {
        violations.push(file.replace(API_ROOT + "/", ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
