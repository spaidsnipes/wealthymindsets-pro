import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * CLIENT SECRET EXPOSURE LOCK — security recurrence nest (WM-SEC-P0-03 Finnhub,
 * WM-SEC-P0-05 Polygon) + migration security cutover check ("no server secret in
 * client bundle", Master Env Registry 2026-08-23).
 *
 * Next inlines every `process.env.NEXT_PUBLIC_*` reference found in client-bundled
 * code into the browser bundle. Provider API keys were twice shipped to the
 * browser this way and twice removed (P0-03, P0-05) by routing through server
 * proxies. This test locks the recurrence path: no client component may read a
 * provider-secret NEXT_PUBLIC_*_KEY in compiled code again. Comments (which
 * document the past fixes) are stripped before matching so they don't false-flag.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// Provider keys that must stay server-side (read only inside /api/* routes,
// which hold the server-only equivalents). Not exhaustive of NEXT_PUBLIC_* —
// public URLs/anon keys are legitimately client-side.
const SERVER_ONLY_PROVIDER_KEYS = [
  "NEXT_PUBLIC_FINNHUB_KEY",
  "NEXT_PUBLIC_POLYGON_KEY",
  "NEXT_PUBLIC_FMP_KEY",
];

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

/** Strip block and line comments so documentation of past fixes isn't flagged. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function isClientComponent(src: string): boolean {
  // "use client" directive appears in the first non-empty lines.
  const head = src.slice(0, 200);
  return /^\s*["']use client["']/m.test(head);
}

describe("client secret exposure lock — no provider secret in the browser bundle", () => {
  it("no client component reads a server-only provider NEXT_PUBLIC_*_KEY", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const raw = readFileSync(file, "utf8");
      if (!isClientComponent(raw)) continue;
      const code = stripComments(raw);
      for (const key of SERVER_ONLY_PROVIDER_KEYS) {
        if (code.includes(`process.env.${key}`)) {
          violations.push(`${relative(REPO_ROOT, file)} reads ${key}`);
        }
      }
    }
    expect(
      violations,
      `CLIENT SECRET EXPOSURE (WM-SEC recurrence): a client component reads a provider ` +
        `key that Next will inline into the browser bundle. Route the call through the ` +
        `server /api/* proxy (which holds the server-only key) instead:\n  ${violations.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the comment stripper does not hide a genuine live read (self-check)", () => {
    // Guards the stripper: a real (non-comment) read must survive stripping.
    const sample = `"use client";\n// process.env.NEXT_PUBLIC_FINNHUB_KEY in a comment\nconst k = process.env.NEXT_PUBLIC_FINNHUB_KEY;`;
    const stripped = stripComments(sample);
    expect(stripped).toContain("const k = process.env.NEXT_PUBLIC_FINNHUB_KEY");
    expect(stripped.match(/process\.env\.NEXT_PUBLIC_FINNHUB_KEY/g)?.length).toBe(1); // comment one removed
  });
});
