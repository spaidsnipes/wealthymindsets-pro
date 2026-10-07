import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Next.js route files may export ONLY its own names. Any other export (e.g. a
// shared constant) passes `tsc --noEmit` but fails `next build`'s generated
// route types — which is how the 2026-10-07 batch 2fc2346 failed on Cloudflare
// ("Property 'MEMBER_CONNECT_LIMIT' is incompatible with index signature").
const ALLOWED = new Set([
  "GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS",
  "dynamic", "dynamicParams", "revalidate", "fetchCache", "runtime", "preferredRegion", "maxDuration", "generateStaticParams", "config",
]);

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) routeFiles(p, out);
    else if (/^route\.(ts|tsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

describe("route files export only Next.js route names", () => {
  const appDir = join(__dirname, "../../app");
  const files = routeFiles(appDir);
  it("scanned the app's route files", () => {
    expect(files.length).toBeGreaterThan(50);
  });
  it("no route file exports anything else", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
        if (!ALLOWED.has(m[1])) bad.push(`${relative(appDir, f)}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
