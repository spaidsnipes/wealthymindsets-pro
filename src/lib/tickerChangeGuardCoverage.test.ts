import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Repo-wide day-change guard coverage.
 *
 * useWebSocket.flush() leaves change/changePct at their initial 0 until
 * prevCloseRef holds a REAL prior close. Five separate surfaces each
 * re-implemented the "is this a real change?" check and four got it wrong,
 * because finiteness and sign cannot distinguish "genuinely flat" from
 * "no reference close yet" — 0 and 0 are finite, and `>= 0` calls zero "up".
 *
 * Observed on prod:
 *   ChartsDashboard  "BTC 77,556.11 ↑ +0.00 +0.00%"
 *   MainChart        "381.33 +0.00 (+0.00%)"
 * both green, both beside a verified-looking badge, both while the tape showed
 * a real multi-percent move for the same symbol.
 *
 * This asserts no surface reintroduces the naive comparison.
 */
describe("ticker change guard coverage", () => {
  const files = walk(path.join(process.cwd(), "src"))
    .filter(f => !f.endsWith("selectTickerChangeDisplay.ts"));

  it("no surface treats ticker.change >= 0 as a direction", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      if (/ticker\.change\s*>=\s*0/.test(src) || /ticker\.changePct\s*>=\s*0/.test(src)) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no surface manufactures a zero percent when the value is absent", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      if (/changePct\s*\?\.\s*toFixed\([^)]*\)\s*\?\?\s*["']0\.00["']/.test(src)) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * NAMED FOR WHAT IT ACTUALLY PROVES, after it was caught overclaiming.
   *
   * This used to be titled "every day-change surface routes through the shared
   * guard", and it was GREEN on 2026-09-05 while the REGIME chip on the
   * Founder's live /charts read "SIDE +0.00% last session" — a fabricated
   * market state, printed from no data at all. Two independent reasons it
   * could not have seen that chip:
   *
   *   1. DETECTION. The `rendering` filter below keys on the rendered
   *      expression still being SPELLED `ticker.changePct`. The chip rendered
   *      `{p.toFixed(2)}%` after `const p = ... ticker.changePct : 0`. One
   *      local alias and the surface is invisible — and the aliasing line is
   *      exactly where the fabrication happened.
   *   2. SCOPE. Even once detected, the guard check is `src.includes(...)`,
   *      so one guard anywhere vouches for the whole file. ChartsDashboard's
   *      header guard on line ~1010 was vouching for a chip 600 lines below it.
   *
   * The file-level check is kept because it still catches the simplest shape.
   * The alias-taint check below is what closes the hole.
   */
  it("a file that renders ticker.changePct directly carries a guard", () => {
    const rendering = files.filter(f => {
      const src = strip(fs.readFileSync(f, "utf8"));
      return /ticker\.changePct(\s*as number)?\s*\)?\.toFixed\(/.test(src)
        || /chg\.changePct\.toFixed\(/.test(src)
        || /tickerChange\.changePct\.toFixed\(/.test(src);
    });
    expect(rendering.length).toBeGreaterThan(0);

    const unguarded = rendering.filter(f => {
      const src = strip(fs.readFileSync(f, "utf8"));
      const usesSelector = src.includes("selectTickerChangeDisplay");
      const inlineGuard = src.includes("ticker.change === 0 && ticker.changePct === 0");
      return !usesSelector && !inlineGuard;
    }).map(f => path.relative(process.cwd(), f));

    expect(unguarded).toEqual([]);
  });
});

/**
 * ALIAS TAINT — the check that would have caught the REGIME chip.
 *
 * Owners that are themselves proven to delegate to selectTickerChangeDisplay.
 * This is an allowlist, so it is a liability if it rots: an entry that stops
 * delegating turns into a rubber stamp for every call site downstream. The
 * suite below therefore re-proves each entry against its own source rather
 * than trusting this list.
 */
const GUARD_OWNERS = [
  "selectTickerChangeDisplay",
  "selectRegimeBadge",
  "formatChartContextNote",
] as const;

/** The literal zero-pair test, in the shapes the two chart headers spell it. */
const ZERO_PAIR = /change\s*===\s*0\s*&&\s*[\w.]*[Cc]hangePct\s*===\s*0/;

const BINDING = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?);/g;

/**
 * Returns the local binding names that carry a raw day-change value which was
 * never validated by an owner.
 *
 * A binding is SAFE when its initializer calls a guard owner, or contains the
 * explicit zero-pair test, or is GATED by an already-safe binding — "gated"
 * meaning the safe name is used as a condition (`safe ? … : …`, `safe && …`),
 * which is how both real inline guards are written. Merely mentioning a safe
 * name is not enough; that would let `safe ? 0 : rawFallback` launder itself.
 *
 * KNOWN LIMIT, stated rather than papered over: this is lexical, not a real
 * dataflow analysis. A determined revive can still construct a gate whose
 * false branch fabricates. It closes the alias hole that actually shipped; it
 * is not a proof of absence.
 */
function taintedChangeAliases(src: string): string[] {
  const safe = new Set<string>();
  const candidates: Array<{ name: string; init: string }> = [];

  BINDING.lastIndex = 0;
  for (let m = BINDING.exec(src); m; m = BINDING.exec(src)) {
    const [, name, init] = m;
    if (GUARD_OWNERS.some(o => init.includes(o)) || ZERO_PAIR.test(init)) {
      safe.add(name);
      continue;
    }
    if (/ticker\.change(Pct)?\b/.test(init)) candidates.push({ name, init });
  }

  // Fixed point: gating by a safe binding makes the derived value safe too.
  for (let pass = 0; pass < 8; pass++) {
    let grew = false;
    for (const c of candidates) {
      if (safe.has(c.name)) continue;
      const gated = [...safe].some(s =>
        new RegExp(`\\b${s.replace(/[$]/g, "\\$")}\\b\\s*(\\?|&&)`).test(c.init),
      );
      if (gated) { safe.add(c.name); grew = true; }
    }
    if (!grew) break;
  }

  return candidates.filter(c => !safe.has(c.name)).map(c => c.name);
}

/** Does a tainted name reach a rendered number? Directly or via a property. */
function rendersTainted(src: string, alias: string): boolean {
  const a = alias.replace(/[$]/g, "\\$");
  return new RegExp(`\\b${a}\\s*(?:\\.[\\w$]+)?\\.toFixed\\(`).test(src);
}

/**
 * The chip as it actually shipped, quoted from 375075c~1 lines 1626 and 1647.
 * Held as a fixture so this Sentinel proves it fails on the real defect, not
 * on a defect I invented to match the regex I had already written (§22).
 */
const OBSERVED_DEFECT = `
  const hasReal = ticker.price > 0 && Number.isFinite(ticker.change) && Number.isFinite(ticker.changePct) && !(ticker.change === 0 && ticker.changePct === 0);
  const p = Number.isFinite(ticker.changePct) ? ticker.changePct : 0;
  const reg = p > 1.5 ? "BULL" : p < -1.5 ? "BEAR" : "SIDE";
  return <span>{p >= 0 ? "+" : ""}{p.toFixed(2)}% today</span>;
`;

describe("no aliased day-change is rendered without an owner", () => {
  it("flags the REGIME chip exactly as it shipped", () => {
    // If this ever passes, the detector has stopped detecting and every green
    // result below is meaningless.
    const tainted = taintedChangeAliases(OBSERVED_DEFECT);
    expect(tainted).toContain("p");
    expect(rendersTainted(OBSERVED_DEFECT, "p")).toBe(true);
    // And note `hasReal` is present and correct in the same fixture — the
    // file-scoped check above was satisfied by it. That is the whole bug.
    expect(taintedChangeAliases(OBSERVED_DEFECT)).not.toContain("hasReal");
  });

  it("does not flag a gated alias", () => {
    // MainChart's real shape. The guard is one binding away, not inline.
    const gated = `
      const hasProviderChange = Number.isFinite(ticker.change) && !(ticker.change === 0 && ticker.changePct === 0);
      const change = hasProviderChange ? (ticker.change as number) : 0;
      const txt = \`\${change.toFixed(2)}\`;
    `;
    expect(taintedChangeAliases(gated)).toEqual([]);
  });

  it("does not flag a value taken from a guard owner", () => {
    const owned = `
      const badge = selectRegimeBadge({ change: ticker.change, changePct: ticker.changePct });
      const p = badge.changePct;
      return <span>{p.toFixed(2)}%</span>;
    `;
    expect(taintedChangeAliases(owned)).toEqual([]);
  });

  it("no file in src renders a tainted alias", () => {
    const offenders: string[] = [];
    for (const f of walk(path.join(process.cwd(), "src"))) {
      if (f.endsWith("selectTickerChangeDisplay.ts")) continue;
      const src = strip(fs.readFileSync(f, "utf8"));
      for (const alias of taintedChangeAliases(src)) {
        if (rendersTainted(src, alias)) {
          offenders.push(`${path.relative(process.cwd(), f)}: ${alias}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the guard-owner allowlist is not a rubber stamp", () => {
  it("every allowlisted owner really delegates to selectTickerChangeDisplay", () => {
    // An owner that stops delegating would silently bless every call site that
    // names it. Re-proven from source so the list cannot rot into a bypass.
    const roots = ["src/lib/marketData", "src/lib"];
    for (const owner of GUARD_OWNERS) {
      if (owner === "selectTickerChangeDisplay") continue;
      const found = roots
        .map(r => path.join(process.cwd(), r, `${owner}.ts`))
        .find(p => fs.existsSync(p));
      expect(found, `guard owner ${owner} has no source file`).toBeTruthy();
      const src = strip(fs.readFileSync(found!, "utf8"));
      expect(src, `${owner} no longer delegates`).toContain("selectTickerChangeDisplay");
    }
  });
});
