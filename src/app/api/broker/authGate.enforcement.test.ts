/**
 * /api/broker/** auth-gate enforcement — Sentinel source-tree scan.
 *
 * Every route.ts under src/app/api/broker/ must gate GET behind
 * `requireAuth` (or an equivalent WM-session guard). The per-provider
 * infra state (implemented / envConfigured / connected / certification
 * stages) is infra reconnaissance even without exposing secret VALUES —
 * historical bug (2026-08-31): four /api/broker aggregate routes were
 * publicly readable. Sentinel now enforces the fix so a new route can't
 * ship without the gate.
 *
 * Exemptions: none. If a broker route legitimately must be public, add
 * an explicit named exemption below with a written rationale.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const BROKER_ROOT = resolve(__dirname);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (p.endsWith("/route.ts") || p.endsWith("/route.tsx")) acc.push(p);
  }
  return acc;
}

describe("/api/broker/** — every route must gate GET behind requireAuth", () => {
  const routes = walk(BROKER_ROOT);

  it("discovers the known broker routes (guards against stale walker)", () => {
    expect(routes.length).toBeGreaterThanOrEqual(4);
  });

  it("every /api/broker route imports requireAuth", () => {
    const offenders: string[] = [];
    for (const path of routes) {
      const body = readFileSync(path, "utf8");
      if (!/from\s+["']@\/lib\/requireAuth["']/.test(body)) {
        offenders.push(path);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every /api/broker route calls requireAuth in the GET handler", () => {
    const offenders: string[] = [];
    for (const path of routes) {
      const body = readFileSync(path, "utf8");
      // Match either `await requireAuth(request)` or `await requireAuth(req)`.
      if (!/await\s+requireAuth\s*\(/.test(body)) {
        offenders.push(path);
      }
    }
    expect(offenders).toEqual([]);
  });
});
