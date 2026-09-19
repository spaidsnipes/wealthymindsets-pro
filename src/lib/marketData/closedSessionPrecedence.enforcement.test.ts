import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";

/**
 * canon §8 — "CLOSED IS NOT DELAYED" call-site Sentinel.
 *
 * WHY THIS FILE EXISTS (§22 Orkin — a Sentinel that never fires is worthless):
 *
 * The closure signal is threaded as an OPTIONAL trailing parameter on every
 * fidelity writer, deliberately: that is what let it ship without touching
 * 3900+ existing tests, and it means only an explicit `false` can ever change
 * a verdict. The cost of that design is that DROPPING the argument is
 * type-safe and test-silent — `priceSourceBadge(source, connected)` compiles,
 * passes tsc, and passes every unit test, while quietly restoring the exact
 * bug the Founder photographed.
 *
 * That is precisely how the defect survived the first repair pass. Six
 * surfaces were wired; `candleDataStatus` was missed; on Saturday
 * 2026-09-05 the live /charts header showed a rail reading
 * "SESSION CLOSED — LAST VERIFIED" sitting inches from a chip reading
 * "ACTIVE DEGRADED · LAST 03:30 PM". Two writers, one screen, one fact,
 * two answers.
 *
 * So the unit tests prove the writers CAN tell the truth; this Sentinel
 * proves the surfaces actually ASK them to.
 */

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * Every function whose return value becomes a trader-facing fidelity label.
 * Adding a new one here without wiring its call sites fails this test —
 * which is the point.
 */
const CLOSURE_AWARE_WRITERS = [
  "priceSourceBadge",
  "resolveChartSurfaceBadge",
  "candleDataStatus",
  "selectPerCapabilityFidelity",
] as const;

/**
 * Blank out comments so prose can't be mistaken for a call site.
 *
 * The first draft of this Sentinel flagged MainChart.tsx and
 * CanonicalFidelityBadge.tsx because both DESCRIBE these writers in JSDoc
 * ("Truth stays in resolveChartSurfaceBadge (the H-Bkt 1/8 guard)"). A
 * Sentinel that cries wolf gets whitelisted into uselessness, so the
 * detector has to read code and only code.
 *
 * Characters are replaced with spaces rather than deleted so reported line
 * numbers still match the real file.
 */
function stripComments(src: string): string {
  const out = src.split("");
  let i = 0;
  type Mode = "code" | "line" | "block" | "sq" | "dq" | "tpl";
  let mode: Mode = "code";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") { mode = "line"; out[i] = out[i + 1] = " "; i += 2; continue; }
      if (c === "/" && n === "*") { mode = "block"; out[i] = out[i + 1] = " "; i += 2; continue; }
      if (c === "'") mode = "sq";
      else if (c === '"') mode = "dq";
      else if (c === "`") mode = "tpl";
    } else if (mode === "line") {
      if (c === "\n") mode = "code";
      else out[i] = " ";
    } else if (mode === "block") {
      if (c === "*" && n === "/") { out[i] = out[i + 1] = " "; mode = "code"; i += 2; continue; }
      if (c !== "\n") out[i] = " ";
    } else {
      // Inside a string literal: honour escapes, then look for the closer.
      if (c === "\\") { i += 2; continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) {
        mode = "code";
      }
    }
    i++;
  }
  return out.join("");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (
        name === "node_modules" || name === ".next" ||
        name === ".open-next" || name === "dist" || name === "build"
      ) continue;
      walk(p, acc);
    } else if (CODE_EXTENSIONS.has(extname(name))) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * Return the full argument text of every call to `fn` in `content`, by
 * walking balanced parentheses. A regex cannot do this: these call sites are
 * routinely multi-line and contain nested calls and object literals.
 */
function callArgumentTexts(content: string, fn: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const needle = new RegExp(`\\b${fn}\\s*\\(`, "g");
  let m: RegExpExecArray | null;
  while ((m = needle.exec(content)) !== null) {
    const open = content.indexOf("(", m.index);
    let depth = 0;
    let i = open;
    for (; i < content.length; i++) {
      const c = content[i];
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue; // unbalanced — ignore rather than throw
    out.push({
      text: content.slice(open + 1, i),
      line: content.slice(0, m.index).split("\n").length,
    });
  }
  return out;
}

/**
 * The painted surfaces, resolved ONCE. `.tsx` only: these are the files that
 * put pixels in front of a trader. Pure `.ts` producers are covered by the
 * deliberate-gap test below.
 */
const SURFACES = walk(SRC_ROOT).filter(
  (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"),
);

describe("closed-session precedence — call-site Sentinel (canon §8)", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * CREDIT WHERE IT IS DUE: this file was ALREADY half-guarded, and better than
   * most. The "§22 anti-placebo" self-test below proves `callArgumentTexts`
   * still parses a call site and still tells a wired call from an unwired one.
   * That is a genuine positive control on the DETECTOR, written by someone who
   * had thought about this exact failure.
   *
   * But a scan is `walk → filter → detect`, and that self-test covers only the
   * last step. It runs against a hardcoded `decoy` string, so it would keep
   * passing brightly if the walk handed the rule zero files. Two ways that
   * happens: the tree moves under `SRC_ROOT`, or — much likelier — the `.tsx`
   * filter stops selecting anything, which a move to `.mtsx`, a co-location
   * convention change, or a `.test.tsx` predicate edit would all do quietly.
   *
   * And there is a THIRD emptiness this file is uniquely exposed to, which
   * neither a file count nor the self-test can see. The rule skips any file not
   * containing `writer(`. If every surface stopped calling these writers — a
   * rename of `priceSourceBadge`, a refactor behind a hook — then CLOSURE_AWARE_
   * WRITERS would name four functions nobody calls, `violations` would be empty,
   * and this Sentinel would report that every surface passes the closure signal
   * while no surface asks for it at all.
   *
   * That is not an abstract worry here. The defect this file exists to prevent
   * was two writers on one screen disagreeing about whether the market was
   * open, photographed live by the Founder. The guard below therefore asserts
   * the real thing: surfaces exist, and they are still CALLING the writers.
   */
  it("ANTI-VACUITY: the walk reaches painted surfaces and they still call the writers", () => {
    expect(
      SURFACES.length,
      "walk(src) found almost no non-test .tsx surfaces — did src/ move, or did " +
        "the extension filter stop selecting the files that paint pixels? An " +
        "empty scan makes the rule below permanently green while enforcing nothing",
    ).toBeGreaterThan(100);

    const callers = SURFACES.filter((f) => {
      const code = stripComments(readFileSync(f, "utf8"));
      return CLOSURE_AWARE_WRITERS.some((fn) => code.includes(`${fn}(`));
    });
    expect(
      callers.length,
      `NO painted surface calls any of the closure-aware fidelity writers ` +
        `(${CLOSURE_AWARE_WRITERS.join(", ")}). Either they were renamed, or the ` +
        `call sites moved behind an indirection this Sentinel cannot see. Every ` +
        `surface then trivially "passes the closure signal" because none asks for ` +
        `it — which is the exact shape of the bug this file exists to catch, one ` +
        `level up. Re-derive CLOSURE_AWARE_WRITERS from the fidelity writers as ` +
        `they are actually named and called today`,
    ).toBeGreaterThan(0);
  });

  it("every rendered surface that calls a fidelity writer passes the closure signal", () => {
    const files = SURFACES;

    const violations: string[] = [];
    for (const file of files) {
      const content = stripComments(readFileSync(file, "utf8"));
      for (const fn of CLOSURE_AWARE_WRITERS) {
        // Skip files that merely re-export or type-reference the name.
        if (!content.includes(`${fn}(`)) continue;
        for (const call of callArgumentTexts(content, fn)) {
          if (/\bsessionOpen\b/.test(call.text)) continue;
          violations.push(
            `${relative(SRC_ROOT, file)}:${call.line} — ${fn}() called without sessionOpen`,
          );
        }
      }
    }

    // Named, not just counted: a failure here should read like a bug report.
    expect(violations).toEqual([]);
  });

  it("the Sentinel can actually see a violation (self-test — §22 anti-placebo)", () => {
    // If callArgumentTexts ever silently stops matching, the test above
    // would pass vacuously forever. Prove the detector still detects.
    const decoy = `
      const b = priceSourceBadge(source, connected);
      const c = resolveChartSurfaceBadge(
        source,
        connected,
        hasCandles,
        sessionOpen,
      );
    `;
    const bad = callArgumentTexts(decoy, "priceSourceBadge");
    const good = callArgumentTexts(decoy, "resolveChartSurfaceBadge");
    expect(bad).toHaveLength(1);
    expect(/\bsessionOpen\b/.test(bad[0].text)).toBe(false);
    expect(good).toHaveLength(1);
    expect(/\bsessionOpen\b/.test(good[0].text)).toBe(true);
  });

  it("names the surfaces currently wired for closure (breadcrumb, not a count)", () => {
    // A future reader should be able to find the pattern to copy.
    const wired = [
      "components/chart/ChartsDashboard.tsx",
      "components/chart/MainChart.tsx",
    ];
    for (const rel of wired) {
      const content = readFileSync(resolve(SRC_ROOT, rel), "utf8");
      expect(content).toContain("useProvenSessionClosure");
    }
  });

  it("documents the one KNOWN GAP that is deliberately still unwired", () => {
    // chartMarketStatePublisher feeds canonicalMarketStateStore, whose key
    // encodes `session`. Threading closure there would move the store key
    // under producers and readers at different moments — the documented P0
    // in canonicalIdentity.ts. It is a gap on purpose, and the breadcrumb
    // that explains it must survive.
    const gap = readFileSync(resolve(SRC_ROOT, "lib/marketData/canonicalIdentity.ts"), "utf8");
    expect(gap).toContain("KNOWN GAP");
    expect(gap).toContain("Closure is a property of the STATE, not of the IDENTITY.");
  });
});
