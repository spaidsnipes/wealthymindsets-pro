/**
 * EVERY 429 TELLS THE CALLER WHEN TO COME BACK, IN PLAIN WORDS (2026-10-09).
 *
 * Today's work put a ceiling on some thirty routes. A ceiling that answers 429
 * with no Retry-After leaves a client to guess (and a guessing client retries
 * at once); one that answers with a vendor's name or a variable leaks. This
 * sentinel reads the three places a 429 is built, then walks every route to
 * make sure none builds its own without the header and that every limiter's
 * refusal is actually returned.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_FAILURE_PLUMBING } from "@/lib/publicFailure";

const API = path.join(process.cwd(), "src/app/api");
function routes(): string[] {
  const out: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n === "route.ts") out.push(p); } };
  walk(API);
  return out;
}
const code = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/[^\n]*$/gm, "");
const rel = (f: string) => path.relative(API, f);

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T18:30:00Z")); });
afterEach(() => { vi.useRealTimers(); });

async function expectHonest429(res: Response, where: string) {
  expect(res.status, where).toBe(429);
  const retry = Number(res.headers.get("retry-after"));
  expect(Number.isFinite(retry) && retry > 0 && retry <= 600, `${where}: Retry-After "${res.headers.get("retry-after")}"`).toBe(true);
  const body = await res.json() as { error?: unknown };
  expect(typeof body.error, where).toBe("string");
  expect(String(body.error).length, where).toBeGreaterThan(8);
  expect(String(body.error), where).not.toMatch(PUBLIC_FAILURE_PLUMBING);
}

describe("the three places a 429 is built", () => {
  it("the in-isolate limiter: Retry-After is the real wait, the words are plain", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    expect(checkRateLimit("k", { max: 1, windowMs: 90_000 }).ok).toBe(true);
    vi.advanceTimersByTime(30_000);
    const r = checkRateLimit("k", { max: 1, windowMs: 90_000 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.headers.get("retry-after")).toBe("60");          // 90 s window, 30 s gone
    await expectHonest429(r.response, "checkRateLimit");
  });

  it("the edge limiter's refusal", async () => {
    const { tooManyRequests } = await import("@/lib/edgeRateLimit");
    await expectHonest429(tooManyRequests(), "tooManyRequests");
  });

  it.each(["market", "feed", "data"] as const)("the proxy ceiling, %s lane", async lane => {
    const { PUBLIC_PROXY_LIMIT, publicProxyLimit } = await import("@/lib/publicProxyLimit");
    const req = new Request("https://wm.test/api/x", { headers: { "cf-connecting-ip": "203.0.113.99" } });
    for (let i = 0; i < PUBLIC_PROXY_LIMIT[lane].perMinute; i++) expect(await publicProxyLimit(req, lane)).toBeNull();
    const stopped = await publicProxyLimit(req, lane);
    expect(stopped).not.toBeNull();
    await expectHonest429(stopped!, `publicProxyLimit ${lane}`);
  });
});

describe("every route", () => {
  const files = routes();

  it("the scan found the tree and its limited routes", () => {
    expect(files.length).toBeGreaterThan(85);
    expect(files.filter(f => /checkRateLimit\(|edgeAllows\(|publicProxyLimit\(|credentialProbeGate\(/.test(code(f))).length).toBeGreaterThan(35);
  });

  it("no route builds its own 429 without Retry-After", () => {
    const bare: string[] = [];
    for (const f of files) {
      for (const m of code(f).matchAll(/\{[^{}]*status: 429[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g)) {
        if (!/Retry-After/.test(m[0])) bare.push(`${rel(f)}: ${m[0].slice(0, 80)}`);
      }
    }
    expect(bare).toEqual([]);
  });

  it("every in-isolate limiter check hands back the limiter's own response (or the shared refusal) — never a silent pass, never a bespoke body", () => {
    const loose: string[] = [];
    let examined = 0;
    for (const f of files) {
      const src = code(f);
      for (const m of src.matchAll(/(?:const (\w+) = )?checkRateLimit\(/g)) {
        examined += 1;
        const after = src.slice(m.index!, m.index! + 420);
        const name = m[1];
        const returned = name
          ? new RegExp(`if \\(!${name}\\.ok\\) return (?:${name}\\.response|tooManyRequests\\(\\))`).test(after)
          : /\)\.ok\) return tooManyRequests\(\);/.test(after);
        // One deliberate exception: the news caller-key lane degrades to public feeds instead of refusing.
        const degrades = rel(f) === "news-rss/route.ts" && /const keyed = /.test(src.slice(Math.max(0, m.index! - 80), m.index! + 10));
        if (!returned && !degrades) loose.push(`${rel(f)}: ${after.slice(0, 70).replace(/\s+/g, " ")}`);
      }
    }
    expect(loose).toEqual([]);
    expect(examined).toBeGreaterThan(25);            // the scan found the checks it judges
  });

  it("every edge limiter check returns the shared refusal (the WOW hand-off alone falls back to its plain door)", () => {
    const loose: string[] = [];
    let examinedEdge = 0;
    for (const f of files) {
      const src = code(f);
      for (const m of src.matchAll(/edgeAllows\(/g)) {
        const line = src.slice(src.lastIndexOf("\n", m.index!) + 1, src.indexOf("\n", m.index!));
        if (/^import /.test(line.trim())) continue;
        const ok = /if \(!\(await edgeAllows\(.*\)\)\) return tooManyRequests\(\);/.test(line)
          || (rel(f) === "passport/to-wow/route.ts" && /if \(!\(await edgeAllows\(.*\)\)\) return plain;/.test(line));
        examinedEdge += 1;
        if (!ok) loose.push(`${rel(f)}: ${line.trim().slice(0, 90)}`);
      }
    }
    expect(loose).toEqual([]);
    expect(examinedEdge).toBeGreaterThan(10);
  });

  it("every proxy ceiling and probe gate is returned as built", () => {
    const loose: string[] = [];
    for (const f of files) {
      const src = code(f);
      for (const m of src.matchAll(/publicProxyLimit\(/g)) {
        const line = src.slice(src.lastIndexOf("\n", m.index!) + 1, src.indexOf("\n", m.index!));
        if (/^import /.test(line.trim())) continue;
        if (!/\{ const limited = await publicProxyLimit\((?:request|req), "(?:market|feed|data)"\); if \(limited\) return limited; \}/.test(line)) loose.push(`${rel(f)}: ${line.trim().slice(0, 90)}`);
      }
      for (const m of src.matchAll(/credentialProbeGate\(/g)) {
        const line = src.slice(src.lastIndexOf("\n", m.index!) + 1, src.indexOf("\n", m.index!));
        if (/^import /.test(line.trim())) continue;
        if (!/\{ const refusal = credentialProbeGate\(req, auth\.user\.sub\); if \(refusal\) return refusal; \}/.test(line)) loose.push(`${rel(f)}: ${line.trim().slice(0, 90)}`);
      }
    }
    expect(loose).toEqual([]);
  });
});
