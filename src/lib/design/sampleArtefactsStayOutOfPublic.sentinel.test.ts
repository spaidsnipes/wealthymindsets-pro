/**
 * MOCKUP SAMPLE PAGES ARE NOT PUBLIC ROUTES.
 *
 * public/ is deployed. A `*.sample.render.test.tsx` that writes its rendered
 * page there turns an art-direction mockup into a reachable route the moment
 * the suite runs — which happened with eleven writers, was fixed, and came
 * back two days later with a twelfth. The one sanctioned writer is the
 * founder-room sample, the route-scoped authority for the G12 gate.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const SANCTIONED = "src/components/layout/MainLayout.founderRoute.render.test.tsx";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("sample artefacts stay out of public/", () => {
  it("no test writes a *-sample.html into public/ except the founder-room gate", () => {
    const files = walk(SRC).map(p => ({ rel: path.relative(process.cwd(), p), src: readFileSync(p, "utf8") }));
    // Proves the walk reached the test tree, including the one sanctioned writer.
    expect(files.length).toBeGreaterThan(500);
    expect(files.some(f => f.rel === SANCTIONED)).toBe(true);
    const offenders = files
      .filter(f => f.rel !== SANCTIONED)
      .filter(f => /["']public["'][^;\n]*-sample\.html/.test(f.src) && /writeFileSync\s*\(/.test(f.src))
      .map(f => f.rel);
    expect(offenders).toEqual([]);
  });

  it("the ignore rule stays, with the founder-room exception", () => {
    const ignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    expect(ignore).toMatch(/^public\/\*-sample\.html$/m);
    expect(ignore).toMatch(/^!public\/founder-room-sample\.html$/m);
  });
});
