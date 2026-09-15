import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A REDIRECT THAT LANDS ON A REDIRECT IS A DETOUR THE USER PAYS FOR.
 *
 * `/vailbuild` sent the reader to `/veddbuild`, which is itself nothing but a
 * redirect to `/partnerships`. Two hops to reach one page, and the first hop
 * was a client component that shipped a bundle, hydrated, painted `null`, and
 * only then navigated.
 *
 * This guard is written against the SHAPE, not the route. It walks every page
 * in the app, works out which ones are pure redirect stubs and where each one
 * points, and fails if any stub lands on another stub. A future alias added
 * the same way is caught the same way, without anyone remembering this file.
 *
 * ON DELETION vs REDIRECTION. The fix was not to delete `/vailbuild`. Nothing
 * in the app links to it, but saved links and printed URLs may. Deleting it
 * trades a slow promise for a broken one. The alias is preserved and made
 * honest: one server-side hop, straight to the destination.
 */

const APP_DIR = resolve(__dirname, "..");

/** Every `page.tsx` under /src/app, as a route path → source pair. */
function pages(): Array<{ route: string; src: string }> {
  const out: Array<{ route: string; src: string }> = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = resolve(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (name !== "page.tsx") continue;
      const route =
        "/" +
        full
          .slice(APP_DIR.length + 1)
          .replace(/\/page\.tsx$/, "")
          .replace(/\(.*?\)\//g, ""); // route groups are not URL segments
      out.push({ route: route === "/" ? "/" : route, src: readFileSync(full, "utf8") });
    }
  };
  walk(APP_DIR);
  return out;
}

/**
 * A page is a REDIRECT STUB when navigating away is the whole of its body.
 *
 * Deliberately strict: a real page that happens to redirect on one branch is
 * not a stub and must not be swept up here. The test is that the file is tiny
 * AND contains a redirect AND renders nothing of its own.
 */
function redirectTarget(src: string): string | null {
  const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (body.split("\n").filter((l) => l.trim()).length > 14) return null;
  const server = body.match(/\bredirect\(\s*["'`]([^"'`]+)["'`]/);
  const client = body.match(/router\.(?:replace|push)\(\s*["'`]([^"'`]+)["'`]/);
  const hit = server ?? client;
  if (!hit) return null;
  if (!/return null|redirect\(/.test(body)) return null;
  return hit[1].split("?")[0]; // query strings do not change WHICH page
}

describe("× A REDIRECT THAT LANDS ON A REDIRECT IS A DETOUR", () => {
  const all = pages();
  const stubs = new Map<string, string>();
  for (const { route, src } of all) {
    const target = redirectTarget(src);
    if (target) stubs.set(route, target);
  }

  it("× THE VACUOUS WALK: the page walker reads a real, populated app tree", () => {
    // Without this, every assertion below passes on an empty list.
    expect(all.length).toBeGreaterThan(20);
    expect(all.some((p) => p.route === "/partnerships")).toBe(true);
    expect(stubs.size).toBeGreaterThan(0);
  });

  it("× THE DETOUR: no redirect stub targets another redirect stub", () => {
    const chains: string[] = [];
    for (const [route, target] of stubs) {
      if (stubs.has(target)) chains.push(`${route} -> ${target} -> ${stubs.get(target)}`);
    }
    expect(chains).toEqual([]);
  });

  it("× THE BLANK FLASH: /vailbuild redirects on the server, not after hydration", () => {
    const vail = all.find((p) => p.route === "/vailbuild");
    expect(vail).toBeDefined();
    const body = vail!.src.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toContain('"use client"');
    expect(body).not.toContain("useEffect");
    expect(body).toContain('redirect("/partnerships")');
  });

  it("the legacy alias is preserved, not deleted — old links still resolve", () => {
    // Retiring the path would 404 saved links. That is a worse promise, not a
    // kept one. Both aliases must continue to exist.
    expect(all.some((p) => p.route === "/vailbuild")).toBe(true);
    expect(all.some((p) => p.route === "/veddbuild")).toBe(true);
  });

  it("× THE SELF-JUSTIFIED CONSTANT: NAV_ITEMS is not resurrected in MainLayout", () => {
    const layout = readFileSync(
      resolve(__dirname, "../../components/layout/MainLayout.tsx"),
      "utf8",
    );
    const body = layout.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toMatch(/const\s+NAV_ITEMS\s*=/);
    // Non-vacuity: the real nav constants are still there and still exported
    // into the tree, so this file is being read and the sweep means something.
    expect(body).toMatch(/const\s+MOBILE_NAV_ITEMS\s*=/);
    expect(body).toMatch(/const\s+NAV_BOTTOM\s*=/);
  });
});
