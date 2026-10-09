/**
 * SENTINEL — on the Options → Expression walk, NOTHING posts to a broker without a press (2026-10-09).
 *
 * Opening the options panel, opening the Expression · Contract Lens and reviewing a contract make only
 * GET reads (today's orders, the chain, positions, the connection status). Every POST / DELETE to a
 * broker order, preview or dry-run route lives in a named function, and that function is called ONLY
 * from a button's onClick — never from an effect, a render, or another function. If an edit moves one
 * into an effect, this fails.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const code = (f: string) => readFileSync(path.join(SRC, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** file → the functions that may write to a broker, and the routes they write to. */
const WRITERS: Readonly<Record<string, readonly { fn: string; routes: readonly string[] }[]>> = {
  "components/chart/FuturesOptionsPanel.tsx": [{ fn: "dryRun", routes: ["/api/broker/tastytrade/order-dry-run"] }],
  "components/chart/WebullOptionPreflight.tsx": [{ fn: "preflight", routes: ["/api/broker/webull/order-preview", "/api/broker/tastytrade/order-dry-run"] }],
  "components/chart/WebullLiveOrder.tsx": [{ fn: "send", routes: ["/api/broker/webull/order-submit"] }, { fn: "cancel", routes: ["/api/broker/webull/orders"] }],
  "components/chart/OptionExpressionIntent.tsx": [],
};

/** The body of `async function name() { … }` up to the next top-level `async function` / `function` / `if (` at two-space indent. */
function bodyOf(src: string, fn: string): string {
  const start = src.search(new RegExp(`async function ${fn}\\(`));
  if (start < 0) return "";
  const rest = src.slice(start + 10);
  const end = rest.search(/\n  (?:async function |function |if \(|const |return \()/);
  return src.slice(start, start + 10 + (end < 0 ? rest.length : end));
}

/** Each `useEffect(() => { … }` body, by matching braces (one-line and multi-line effects alike). */
function effectBodies(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/useEffect\(\(\) => \{/g)) {
    let depth = 1, i = m.index! + m[0].length;
    const start = i;
    while (i < src.length && depth > 0) { const ch = src[i]; if (ch === "{") depth++; else if (ch === "}") depth--; i++; }
    out.push(src.slice(start, i - 1));
  }
  return out;
}

describe("the options walk writes to a broker only from a press", () => {
  for (const [file, writers] of Object.entries(WRITERS)) {
    const src = code(file);
    it(`${file}: is read (vacuity guard)`, () => {
      expect(src.length).toBeGreaterThan(2_000);
    });

    it(`${file}: every POST / DELETE sits inside its named writer function`, () => {
      const writes = [...src.matchAll(/method:\s*"(POST|DELETE|PUT|PATCH)"/g)];
      const inside = writers.reduce((n, w) => n + (bodyOf(src, w.fn).match(/method:\s*"(POST|DELETE|PUT|PATCH)"/g) ?? []).length, 0);
      expect(inside, "writes outside the named writer functions").toBe(writes.length);
      for (const w of writers) {
        const body = bodyOf(src, w.fn);
        expect(body.length, `${w.fn} found`).toBeGreaterThan(50);
        for (const r of w.routes) expect(body, `${w.fn} → ${r}`).toContain(r);
      }
      if (!writers.length) expect(src).not.toMatch(/fetch\(/);
    });

    it(`${file}: each writer is CALLED only from an onClick`, () => {
      for (const w of writers) {
        const calls = [...src.matchAll(new RegExp(`(?<!function )\\b${w.fn}\\(\\)`, "g"))];
        expect(calls.length, `${w.fn} is called somewhere`).toBeGreaterThan(0);
        for (const c of calls) {
          const before = src.slice(Math.max(0, c.index! - 40), c.index!);
          expect(before, `${w.fn}() called outside an onClick: …${before.slice(-30)}`).toMatch(/onClick=\{\(\) => void $/);
        }
      }
    });

    it(`${file}: no effect body names a write route or a writer`, () => {
      const effects = effectBodies(src);
      expect(effects.length, "effects found").toBeGreaterThan(file.endsWith("OptionExpressionIntent.tsx") ? -1 : 0);
      for (const e of effects) {
        expect(e).not.toMatch(/order-submit|order-dry-run|order-preview|method:\s*"(POST|DELETE|PUT|PATCH)"/);
        for (const w of writers) expect(e, `effect calls ${w.fn}`).not.toMatch(new RegExp(`\\b${w.fn}\\(`));
      }
    });
  }

  it("what the walk DOES request on mount is GET reads only", () => {
    const panel = code("components/chart/FuturesOptionsPanel.tsx");
    for (const r of ["/api/broker/tastytrade/orders", "/api/broker/tastytrade/chain", "/api/broker/tastytrade/positions"]) {
      const at = panel.indexOf(`fetch(${r.endsWith("chain") ? "equity ? `" : "\""}${r}`);
      expect(at, r).toBeGreaterThan(0);
      expect(panel.slice(at, at + 260), r).not.toMatch(/method:/);
    }
    const pre = code("components/chart/WebullOptionPreflight.tsx");
    const at = pre.indexOf('fetch("/api/broker/tastytrade/status"');
    expect(at).toBeGreaterThan(0);
    expect(pre.slice(at, at + 80)).not.toMatch(/method:/);
  });
});
