import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { describe, it, expect } from "vitest";
import { stripComments } from "@/lib/sourceScan";

/**
 * HOST-NEUTRALITY LOCK — platform independence (Hosting Independence Runbook +
 * Master Env Registry Weakness #8: "HOST COUPLING CAN REAPPEAR LATER … A HOST
 * IS A RUNTIME, NOT THE COMPANY", 2026-08-23).
 *
 * The company must remain reconstructable on any host. This test bounds Vercel
 * coupling: app code may not import `@vercel/*` runtime packages or branch on
 * `process.env.VERCEL*` beyond an explicit, tracked allowlist — so a Cloudflare
 * (or any) migration cannot be silently re-coupled to Vercel by a new import.
 *
 * 2026-08-24: the last tracked exception (@vercel/analytics in src/app/layout.tsx)
 * was REMOVED — its beacon endpoint (/_vercel/insights) does not exist on the
 * Cloudflare Worker, so it was inert host-coupling. The allowlist is now empty:
 * ZERO Vercel runtime cords remain in app code.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// Files permitted to carry a Vercel-specific import, with the reason.
// EMPTY by design — no app module may import @vercel/* runtime packages.
const VERCEL_IMPORT_ALLOWLIST = new Set<string>([]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

describe("host-neutrality lock — bound Vercel coupling (migration portability)", () => {
  /**
   * POSITIVE CONTROL for stripComments — a vacuity guard on the guard.
   *
   * Every lock below scans stripped source. If the stripper were too greedy and
   * blanked real code, all three locks would pass on an empty string and report
   * a clean repo forever. This proves it removes prose and keeps code.
   */
  it("stripComments removes commentary but preserves executable code", () => {
    const sample = [
      '// reads x-vercel-ip-city historically',
      '/** block prose naming process.env.VERCEL_ENV */',
      'const url = "https://example.com/path";',
      'const city = h.get("x-vercel-ip-city");',
    ].join("\n");
    const out = stripComments(sample);
    // Prose occurrences are gone…
    expect(out).not.toContain("historically");
    expect(out).not.toContain("block prose");
    // …the real read survives, and a protocol slash-slash is not mistaken for one.
    expect(out).toContain('h.get("x-vercel-ip-city")');
    expect(out).toContain("https://example.com/path");
  });

  it("no NEW @vercel/* runtime import outside the tracked allowlist", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = stripComments(readFileSync(file, "utf8"));
      if (/from ["']@vercel\//.test(src)) {
        const rel = relative(REPO_ROOT, file);
        if (!VERCEL_IMPORT_ALLOWLIST.has(rel)) offenders.push(rel);
      }
    }
    expect(
      offenders,
      `HOST COUPLING: these modules import @vercel/* runtime packages, coupling the ` +
        `product to Vercel. Use a host-neutral equivalent, or add to the tracked ` +
        `allowlist with a migration note if genuinely required:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("no app code branches on process.env.VERCEL* (runtime host assumption)", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = stripComments(readFileSync(file, "utf8"));
      if (/process\.env\.VERCEL/.test(src)) offenders.push(relative(REPO_ROOT, file));
    }
    expect(
      offenders,
      `HOST ASSUMPTION: these modules read process.env.VERCEL* — a Vercel-only runtime ` +
        `signal that will be undefined on another host:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  /**
   * THE FOURTH MECHANISM — host config that is not code at all (2026-09-11).
   *
   * The locks in this file scan `src/`. A repository can also declare its host
   * in a file no scanner reads: `vercel.json` sat at the repo root declaring
   * `framework`, `installCommand` and `buildCommand` for a platform that has
   * not built this app since the Cloudflare cutover. Nothing imported it, so
   * every src-scanning lock was green; nothing executed it, so nothing failed.
   * It was a build instruction for a host that no longer builds us — the kind
   * of artifact that makes a future engineer believe there are two deploy
   * targets and reason about the wrong one.
   *
   * Deployment is declared by `wrangler.jsonc` + `open-next.config.ts` and the
   * `deploy:cf` script. One host, one set of instructions.
   */
  it("no retired-host deployment config sits at the repo root", () => {
    const strays = ["vercel.json", ".vercelignore", "now.json"].filter((f) =>
      existsSync(join(REPO_ROOT, f)),
    );
    expect(
      strays,
      `RETIREMENT DEBT: these files instruct a retired host how to build this app. ` +
        `Deployment is declared by wrangler.jsonc + open-next.config.ts. A build ` +
        `instruction for a host that no longer builds us is not portability, it is a ` +
        `second imagined deploy target:\n  ${strays.join("\n  ")}`,
    ).toEqual([]);
  });

  /**
   * THE THIRD COUPLING MECHANISM — added 2026-09-11.
   *
   * The two locks above bound `@vercel/*` IMPORTS and `process.env.VERCEL*`
   * READS. A codebase can couple to a host a third way, and this suite did not
   * cover it: by reading a header that only that host's edge injects.
   *
   * `src/lib/email.ts` read `x-vercel-ip-city` / `x-vercel-ip-country-region` /
   * `x-vercel-ip-country` to fill the location line of the "new sign-in to your
   * account" security email. After the Cloudflare cutover those headers were
   * never present again, so the location silently became `undefined` and the
   * security email shipped without it. Nothing threw; `tsc --noEmit` stayed at
   * exit 0, because `headers.get()` on an absent header is type-correct and
   * simply returns null. Both locks above were green the entire time — they
   * were guarding the two doors the defect did not walk through.
   *
   * A retired host's header names can never populate again, so any occurrence
   * is dead code that fabricates an absence. This lock is deliberately a plain
   * string scan rather than an allowlist: there is no legitimate reason for
   * current app code to name a retired host's header.
   */
  /**
   * THE FIFTH MECHANISM — the INSTALL, which no source scan can see (2026-09-12).
   *
   * Every lock above asks what the code SAYS. None asks what the build
   * INSTALLS. `package.json` dropped `@vercel/analytics` at the Cloudflare
   * cutover and this file's own header was updated to say "ZERO Vercel runtime
   * cords remain in app code" — true, and the truth of it is exactly what made
   * the miss invisible. `package-lock.json` still carried the package in the
   * root `dependencies` block AND as a resolved tree entry, so `npm ci` on the
   * Cloudflare build pulled Vercel's analytics package into every production
   * install. MEASURED 2026-09-12: `grep vercel package.json` → no match, while
   * `ls node_modules/@vercel` → `analytics`.
   *
   * The lockfile is the file that decides what actually lands on the build
   * machine; `package.json` only decides what was asked for. A retirement
   * completed in the manifest and not in the lockfile is not a retirement, and
   * no amount of source scanning can notice, because there is no source.
   *
   * BOTH files are checked. Checking only the lockfile would let a re-added
   * dependency pass until someone reinstalled; checking only the manifest is
   * the hole that produced this defect.
   */
  it("no @vercel/* package is declared or locked as a dependency", () => {
    const offenders: string[] = [];
    for (const file of ["package.json", "package-lock.json"]) {
      const manifest = JSON.parse(readFileSync(join(REPO_ROOT, file), "utf8"));
      // The root package's own declared deps — in package-lock.json these live
      // under packages[""], the lockfile's mirror of package.json.
      const roots = [manifest, manifest.packages?.[""]].filter(Boolean);
      for (const root of roots) {
        for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
          for (const name of Object.keys(root[field] ?? {})) {
            if (name.startsWith("@vercel/")) offenders.push(`${file} → ${field} → ${name}`);
          }
        }
      }
      // …and the resolved tree, which is what `npm ci` actually materialises.
      for (const path of Object.keys(manifest.packages ?? {})) {
        if (/(^|\/)node_modules\/@vercel\//.test(path)) offenders.push(`${file} → ${path}`);
      }
    }
    expect(
      offenders,
      `RETIRED-HOST DEPENDENCY: the build installs a Vercel package. Vercel is a ` +
        `retired host — its runtime packages cannot function here (the analytics ` +
        `beacon posts to /_vercel/insights, an endpoint the Cloudflare Worker does ` +
        `not serve), so this is weight and a false signal of a second deploy target, ` +
        `not portability. Remove it from package.json AND regenerate the lockfile ` +
        `(\`npm install --package-lock-only\`) — a dependency dropped from the ` +
        `manifest but left in the lockfile is still installed by \`npm ci\`:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("no app code reads x-vercel-* request headers (retired-host edge signal)", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = stripComments(readFileSync(file, "utf8"));
      if (/x-vercel-/i.test(src)) offenders.push(relative(REPO_ROOT, file));
    }
    expect(
      offenders,
      `GHOST HOST HEADER: these modules read an \`x-vercel-*\` request header. Vercel ` +
        `is a retired host (Command Center 2026-09-11, RETIREMENT / GHOST-HOST LAW), ` +
        `so that header is never present in production and the value silently ` +
        `degrades to undefined. Resolve the field from the CURRENT host's header ` +
        `names, and degrade honestly when absent:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
