import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

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
 * KNOWN EXCEPTION (tracked migration item): @vercel/analytics in
 * src/app/layout.tsx. It builds on any host but only reports to Vercel; the
 * migration team must decide keep / replace / gate before VERCEL_EXIT_SAFE.
 * Removing it is an observability decision, not a blind edit — hence allowlisted
 * here rather than deleted.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// Files permitted to carry a Vercel-specific import, with the reason.
const VERCEL_IMPORT_ALLOWLIST = new Set<string>([
  "src/app/layout.tsx", // @vercel/analytics — tracked migration item
]);

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
  it("no NEW @vercel/* runtime import outside the tracked allowlist", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, "utf8");
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
      const src = readFileSync(file, "utf8");
      if (/process\.env\.VERCEL/.test(src)) offenders.push(relative(REPO_ROOT, file));
    }
    expect(
      offenders,
      `HOST ASSUMPTION: these modules read process.env.VERCEL* — a Vercel-only runtime ` +
        `signal that will be undefined on another host:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
