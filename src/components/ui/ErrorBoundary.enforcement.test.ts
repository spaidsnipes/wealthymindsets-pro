/**
 * ErrorBoundary enforcement — ONE NAME, ONE OWNER.
 *
 * This lock exists because the repo shipped TWO classes both exported as
 * `ErrorBoundary`, in two files, for a long time:
 *
 *     src/components/ui/ErrorBoundary.tsx   <- the live one. Mounted by
 *                                              MainLayout and ChartsDashboard.
 *                                              Panel-scoped, takes a `fallback`,
 *                                              exports SafePanel, and RETRIES
 *                                              IN PLACE via setState.
 *
 *     src/components/ErrorBoundary.tsx      <- unmounted. No `fallback`, no
 *                                              SafePanel, minHeight 100vh, and
 *                                              its only recovery affordance was
 *                                              `window.location.reload()`.
 *
 * A duplicate that is merely dead is debt. THIS duplicate was a trap, because
 * the two were not equivalent and the dead one was the DESTRUCTIVE one. The
 * dead twin sat at the SHORTER, more guessable import path
 * (`@/components/ErrorBoundary`), so the cheaper thing to type was the wrong
 * thing to type. Had any panel been wrapped in it, a single panel throwing
 * would have blanked the entire viewport and offered the trader one button —
 * a full reload, which discards every unsaved in-memory thing the session
 * holds: drawings, order tickets, journal text not yet committed.
 *
 * AN ERROR BOUNDARY IS A PROMISE ABOUT HOW MUCH YOU LOSE WHEN SOMETHING
 * BREAKS. Two of them making different promises under one name is not a
 * duplicate, it is a coin flip.
 *
 * The dead twin was deleted. This test keeps it deleted, and — more usefully —
 * keeps ANY third one from appearing, because the next one will not be a
 * copy-paste of this one and will not be caught by looking for this one.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** The one file permitted to declare the class. */
const OWNER = "components/ui/ErrorBoundary.tsx";

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

/**
 * A DECLARATION, not a mention. `import { ErrorBoundary }` and
 * `<ErrorBoundary>` are readers and must stay legal — only a second
 * file DEFINING the class is a violation.
 */
const DECLARES = /(?:export\s+)?class\s+ErrorBoundary\b/;

describe("<ErrorBoundary> enforcement — one name, one owner", () => {
  it("× THE SECOND ERROR BOUNDARY: exactly one file in src/ declares class ErrorBoundary", () => {
    const declaring = walk(SRC_ROOT)
      .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
      .filter((f) => DECLARES.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(SRC_ROOT + "/", ""));

    expect(
      declaring,
      "more than one file declares class ErrorBoundary — see this file's docblock for why that is a coin flip, not a duplicate",
    ).toEqual([OWNER]);
  });

  it("× THE SECOND ERROR BOUNDARY: the owner still makes the non-destructive promise", () => {
    const owner = readFileSync(join(SRC_ROOT, OWNER), "utf8");

    // Non-vacuity for the lock above: the owner must really be findable by
    // the same regex the walk uses, or the lock is asserting on an empty set.
    expect(DECLARES.test(owner), "the owner no longer matches the declaration pattern").toBe(true);

    expect(
      owner.includes("setState"),
      "the surviving ErrorBoundary no longer recovers in place — the whole reason the other one was deleted",
    ).toBe(true);
    expect(
      owner.includes("fallback"),
      "the surviving ErrorBoundary no longer accepts a scoped fallback",
    ).toBe(true);
    expect(
      owner.includes("SafePanel"),
      "SafePanel left this module — panel-scoping is the difference that mattered",
    ).toBe(true);
    expect(
      /location\s*\.\s*reload/.test(owner),
      "the surviving ErrorBoundary now forces a full reload, which is the destructive behaviour of the deleted twin",
    ).toBe(false);
  });
});
