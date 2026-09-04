/**
 * quoteReferenceRouteTruth — Sentinel over the QUOTE ROUTES themselves.
 *
 * ── Why this file has to exist ───────────────────────────────────────────────
 *
 * changeWindow.test.ts locks the pure resolver. resolveQuoteDayChange.test.ts
 * locks the pure display guard. Both are green today. Neither can see a route.
 *
 * That blindness is not hypothetical — it already cost us. Look at
 * resolveQuoteDayChange.test.ts:67: it names `prevClose = json?.prevDailyBar?.c
 * ?? price` as the defect it defends against. It has been green the entire time
 * that exact line sat live in src/app/api/alpaca/route.ts, because a pure
 * function test cannot reach its own call site. The guard downstream would have
 * caught the value; the route was still emitting the lie.
 *
 * So this Sentinel reads the SOURCE of the quote routes and refuses the two
 * mechanisms by which a missing reference becomes a confident number.
 *
 * ── Mechanism 1: the reference fabrication ───────────────────────────────────
 *
 *     prevClose = json?.prevDailyBar?.c ?? price     // alpaca, stocks
 *     open      = parseFloat(s.open) || price        // exchange, all venues
 *
 * Point the reference at the price and `price - reference` is EXACTLY ZERO. The
 * screen then asserts "unchanged on the session" — a claim — assembled out of
 * the absence of data. Three separate instances of this shape have now been
 * found in this codebase. It is a house pattern, which is why it gets a house
 * Sentinel rather than another one-off fix.
 *
 * ── Mechanism 2: the zero fallback ───────────────────────────────────────────
 *
 *     changePct: open      ? ...  : 0                // exchange
 *     changePct: prevClose ? ...  : 0                // alpaca
 *
 * The `: 0` branch fires precisely when there was nothing to measure against.
 * Worse, `parseFloat("nonsense")` is NaN and NaN is FALSY, so an instrument the
 * venue had never heard of took the `: 0` branch and was published as
 * `price: null, changePct: 0` — a flat quote for a thing that does not exist.
 *
 * Null withholds. Zero asserts. Only one of those is honest about ignorance.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROUTES = ["src/app/api/exchange/route.ts", "src/app/api/alpaca/route.ts"] as const;

/**
 * Strip comments so the prose ABOVE (which quotes both defects verbatim) can
 * never trip the detectors that police the code below. The `[^:]` guard keeps
 * `https://` inside string literals intact.
 */
function readStripped(rel: string): string {
  const raw = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
  return raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Mechanism 1: a day-change reference assigned from the price itself. */
const REFERENCE_ECHO = /\b(prevClose|referenceOpen|open)\s*=\s*[^;\n]*(\?\?|\|\|)\s*price\b/g;

/** Mechanism 2: a change field whose else-branch is the literal 0. */
const ZERO_FALLBACK = /\b(change|changePct)\s*:\s*[^,\n]*\?[^,\n]*:\s*0\s*[,}]/g;

/** The exact code that shipped before this defect was closed. */
const HISTORICAL_DEFECT = `
  const price = parseFloat(t.price), open = parseFloat(s.open) || price;
  prevClose = json?.prevDailyBar?.c ?? price;
  return { price, change: +(price - open).toFixed(2), changePct: open ? +((price - open) / open * 100).toFixed(2) : 0 };
`;

describe("quote routes — reference truth at the source", () => {
  // ── POSITIVE CONTROLS ──────────────────────────────────────────────────────
  // A Sentinel whose regex silently stopped matching would report "no
  // fabrication" forever, and that reads exactly like a clean bill of health.
  // Prove the detectors still bite before trusting a single green assertion.

  it("POSITIVE CONTROL: both detectors fire on the code that actually shipped", () => {
    expect([...HISTORICAL_DEFECT.matchAll(REFERENCE_ECHO)].length).toBe(2);
    expect([...HISTORICAL_DEFECT.matchAll(ZERO_FALLBACK)].length).toBe(1);
  });

  it("POSITIVE CONTROL: the routes were really read, and comment-stripping kept the code", () => {
    for (const rel of ROUTES) {
      const src = readStripped(rel);
      // Non-trivial length rules out a silently-empty read.
      expect(src.length, `${rel} looks empty after stripping`).toBeGreaterThan(2000);
      // The stripper must remove prose but keep the handler it is policing.
      expect(src, `${rel} lost its GET handler to comment-stripping`).toContain("export async function GET");
      expect(src, `${rel} still contains comment prose`).not.toContain("Mechanism 1");
    }
  });

  // ── The two forbidden mechanisms ───────────────────────────────────────────

  it("no quote route derives a change reference from the price itself", () => {
    for (const rel of ROUTES) {
      const hits = [...readStripped(rel).matchAll(REFERENCE_ECHO)].map((m) => m[0]);
      expect(
        hits,
        `${rel} fabricates a reference from price — this makes change exactly 0 out of missing data`,
      ).toEqual([]);
    }
  });

  it("no quote route falls back to a literal 0 change", () => {
    for (const rel of ROUTES) {
      const hits = [...readStripped(rel).matchAll(ZERO_FALLBACK)].map((m) => m[0]);
      expect(
        hits,
        `${rel} publishes 0 where it has no reference — a zero is a claim, use null`,
      ).toEqual([]);
    }
  });

  // ── Disclosure actually reaches the wire ───────────────────────────────────
  // Absence of the bad pattern is not presence of the fix. A route that simply
  // stopped reporting change at all would pass every assertion above.

  it("every quote route publishes WHICH measure its percent used", () => {
    for (const rel of ROUTES) {
      expect(readStripped(rel), `${rel} emits a percent without naming its reference`).toContain("changeWindow");
    }
  });

  it("the crypto route names the rolling window, the equity route names both of its cases", () => {
    // /api/exchange is 24h-rolling because crypto has no close.
    expect(readStripped(ROUTES[0])).toContain("ROLLING_24H");
    // /api/alpaca has a genuine two-case measure: a prior close when a prior
    // daily bar exists, the session open when only one bar came back. Collapsing
    // those into one label is the defect wearing a disclosure costume.
    const alpaca = readStripped(ROUTES[1]);
    expect(alpaca).toContain("PRIOR_CLOSE");
    expect(alpaca).toContain("SESSION_OPEN");
  });

  it("the crypto quote route rejects numeric-prefix garbage instead of parseFloat coercion", () => {
    const exchange = readStripped(ROUTES[0]);
    expect(exchange).toContain("strictProviderNumber");
    expect(exchange).not.toMatch(/parseFloat\(String\(value\)\)/);
  });

  // ── Disclosure reaches a HUMAN ─────────────────────────────────────────────
  // The whole point is a visible chip beside a percent. A window threaded
  // perfectly through the data layer and never rendered discloses nothing.

  //
  // NOTE on this assertion's own history: it first checked merely that the file
  // CONTAINED "changeWindowSuffix(item.changeWindow)". A revive-attempt that
  // deleted the rendered value left the boolean guard
  // `{changeWindowSuffix(...) && (` in place — and the test stayed green while
  // the chip had vanished from the screen. Presence of a call is not presence of
  // a render. These now require a JSX TEXT position and an attribute position.

  /** The suffix sitting in JSX text: `>{changeWindowSuffix(...)}</`. */
  const SUFFIX_RENDERED = />\s*\{\s*changeWindowSuffix\(item\.changeWindow\)\s*\}\s*<\//;
  /**
   * The description inside a title/aria attribute, not merely computed.
   *
   * The bound is a non-greedy any-char window, NOT `[^}]*`: the real attribute
   * is a template literal (`title={`${item.sym}: ${describe…}`}`) whose own
   * `${…}` interpolations contain `}`, so a "no closing brace" class stops dead
   * at the first one. That mistake made this control fail loudly, which is the
   * only reason it is not still sitting here matching nothing.
   */
  const DESCRIPTION_EXPOSED = /(title|aria-label)=\{[\s\S]{0,120}?describeChangeWindow\(item\.changeWindow\)/;

  it("POSITIVE CONTROL: the render detectors match a correct render and reject a bare call", () => {
    expect(SUFFIX_RENDERED.test(`<span>{changeWindowSuffix(item.changeWindow)}</span>`)).toBe(true);
    expect(SUFFIX_RENDERED.test(`{changeWindowSuffix(item.changeWindow) && (<span>x</span>)}`)).toBe(false);
    expect(DESCRIPTION_EXPOSED.test('title={`${item.sym}: ${describeChangeWindow(item.changeWindow)}`}')).toBe(true);
    expect(DESCRIPTION_EXPOSED.test("const d = describeChangeWindow(item.changeWindow);")).toBe(false);
  });

  it("the watchlist RENDERS the measure it received — not merely computes it", () => {
    const panel = readStripped("src/components/chart/WatchlistPanel.tsx");
    expect(panel.length).toBeGreaterThan(2000); // positive control on the read
    expect(
      SUFFIX_RENDERED.test(panel),
      "WatchlistPanel computes changeWindowSuffix but never puts it on screen",
    ).toBe(true);
    expect(
      DESCRIPTION_EXPOSED.test(panel),
      "the deviating measure has no accessible description on the row",
    ).toBe(true);
  });
});
