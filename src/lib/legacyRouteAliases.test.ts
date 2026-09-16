import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LEGACY_ROUTE_ALIASES, legacyAliasTarget } from "./legacyRouteAliases";

/**
 * A REDIRECT THAT SHIPS THE APP IS NOT A REDIRECT. IT IS A PAGE THAT LEAVES.
 *
 * `/vailbuild` was rewritten from a client `useEffect` hop into a server
 * `redirect()`, and the commit claimed that bought "no bundle, no hydration,
 * no paint, no chain." Measured against production serving that exact commit,
 * `/vailbuild` returned HTTP 200 with no Location header and an 18,275-byte
 * document carrying 17 script tags — 94% the weight of the destination.
 *
 * Three of those four claims were false. They were read out of the source
 * rather than measured. The chain was real and is still gone; the cost was not
 * gone at all.
 *
 * So the alias moved to middleware, which has a production receipt for issuing
 * a real 308 on this host. These tests hold the two halves of that repair:
 * the EDGE must own the alias, and the PROSE may not re-make the claim that
 * was never measured.
 */

const SRC = resolve(__dirname, "..");
const MIDDLEWARE = resolve(SRC, "middleware.ts");
const VAILBUILD_PAGE = resolve(SRC, "app/vailbuild/page.tsx");

/** Source with block and line comments removed. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("× A REDIRECT THAT SHIPS THE APP IS NOT A REDIRECT", () => {
  it("resolves each alias to its destination", () => {
    expect(legacyAliasTarget("/vailbuild")).toBe("/partnerships");
    expect(legacyAliasTarget("/veddbuild")).toBe("/partnerships");
  });

  it("tolerates a trailing slash — the same URL with a slash is the same URL", () => {
    expect(legacyAliasTarget("/vailbuild/")).toBe("/partnerships");
  });

  it("× THE GREEDY ALIAS: matching is exact, not prefix", () => {
    // `/vailbuild-notes` is a different route. A prefix match would swallow
    // every future path that merely starts with an alias.
    expect(legacyAliasTarget("/vailbuild-notes")).toBeNull();
    expect(legacyAliasTarget("/vailbuild/deep")).toBeNull();
    expect(legacyAliasTarget("/partnerships")).toBeNull();
    expect(legacyAliasTarget("/")).toBeNull();
  });

  it("× THE SELF-REFERRING ALIAS: no alias points at another alias", () => {
    // The original defect was a two-hop chain. It must not be reintroducible
    // through the map itself.
    for (const [from, to] of Object.entries(LEGACY_ROUTE_ALIASES)) {
      expect(to, `${from} points at another alias`).not.toBe(from);
      expect(LEGACY_ROUTE_ALIASES[to], `${from} -> ${to} -> …`).toBeUndefined();
    }
  });

  it("× THE UNGUARDED EDGE: middleware really consumes the alias map", () => {
    const body = code(MIDDLEWARE);
    // A DEAD IMPORT CAN SATISFY A TRUTH SENTINEL — so require the symbol to
    // appear more than once: the import AND at least one real call site.
    const uses = body.match(/legacyAliasTarget/g) ?? [];
    expect(uses.length).toBeGreaterThan(1);
    // It must issue a real HTTP redirect, not render anything.
    expect(body).toMatch(/NextResponse\.redirect\([\s\S]{0,80}30[78]\)/);
  });

  it("× THE NARROWED MATCHER: the middleware still runs for alias paths", () => {
    // The whole repair depends on middleware seeing these requests. If someone
    // narrows the matcher to, say, only /login, the aliases silently fall back
    // to the slow stub and this guard is the only thing that would say so.
    const body = code(MIDDLEWARE);
    const matcher = body.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(matcher).toBeTruthy();
    const patterns = [...matcher.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
    for (const alias of Object.keys(LEGACY_ROUTE_ALIASES)) {
      const covered = patterns.some((p) => {
        try {
          return new RegExp(`^${p}$`).test(alias);
        } catch {
          return false;
        }
      });
      expect(covered, `middleware matcher does not cover ${alias}`).toBe(true);
    }
  });

  it("× THE UNMEASURED BOAST: the stub does not re-claim what was never measured", () => {
    // The exact sentence that turned out to be false. A future edit that
    // restores the confident version fails here by name.
    const prose = readFileSync(VAILBUILD_PAGE, "utf8");
    expect(prose).not.toMatch(/no bundle,\s*no hydration,\s*no paint/i);
    // Non-vacuity: the correction, with its measurement, is actually present.
    expect(prose).toMatch(/18,275 bytes/);
    expect(prose).toMatch(/CORRECTION/);
  });

  it("the stubs are kept as a fallback — the aliases cannot 404", () => {
    // Deleting them would trade a fast promise for a broken one the day the
    // matcher changes. Both must still exist on disk.
    for (const alias of Object.keys(LEGACY_ROUTE_ALIASES)) {
      const page = resolve(SRC, `app${alias}/page.tsx`);
      expect(() => readFileSync(page, "utf8"), `${alias} stub was deleted`).not.toThrow();
    }
  });
});
