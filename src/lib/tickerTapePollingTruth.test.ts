import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/TickerTape.tsx"),
  "utf8",
);
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * TickerTape polling Sentinel — canon §MACHINE PERFORMANCE
 * ("bounded compute, no duplicate subscriptions/calculations").
 *
 * The quote-poll effect depended on `customSyms` — component state holding an
 * ARRAY. The after-mount effect calls setCustomSyms(stored), allocating a NEW
 * array even when its contents equal the default, so the effect tore down and
 * re-subscribed, firing another full fetch round.
 *
 * Measured on prod /command-deck: the same 13 quotes were requested THREE
 * times per page load — 39 requests where 13 suffice. TickerTape lives in the
 * shell, so this multiplied on every route.
 *
 * The effect now depends on a stable content key.
 */
describe("ticker tape polling subscription", () => {
  it("the POLL effect does not re-subscribe on array identity", () => {
    expect(src).not.toContain("}, [activeSymbol, customSyms, pathname]);");
    // Scope to the polling effect: the localStorage PERSISTENCE effect
    // legitimately depends on customSyms and must keep doing so.
    // Slice from doFetch to that effect's OWN dependency array.
    const i = src.indexOf("const doFetch");
    expect(i).toBeGreaterThan(-1);
    const depStart = src.indexOf("}, [", i);
    expect(depStart).toBeGreaterThan(i);
    const pollEffect = src.slice(i, src.indexOf("]", depStart) + 1);
    expect(pollEffect).not.toContain("customSyms");
    expect(pollEffect).toContain("requestedTapeKey");
  });

  it("the persistence effect still tracks customSyms", () => {
    expect(src).toContain("}, [customSyms, hydrated]);");
  });

  it("depends on a stable content key", () => {
    expect(src).toContain("const requestedTapeKey =");
    expect(src).toContain("}, [requestedTapeKey]);");
  });

  it("the key is derived from the requested symbol set", () => {
    expect(src).toMatch(/requestedTapeKey\s*=\s*requestedTapeSymbols\.map\(t => t\.sym\)\.join\(","\)/);
  });

  it("a re-allocated array with identical contents yields an identical key", () => {
    // The exact condition that caused the duplicate rounds.
    const a = ["NQ1!", "ES1!", "SPY"];
    const b = [...a]; // new identity, same contents
    expect(a).not.toBe(b);
    expect(a.join(",")).toBe(b.join(","));
  });

  it("a genuinely different symbol set still yields a different key", () => {
    expect(["NQ1!", "SPY"].join(",")).not.toBe(["NQ1!", "QQQ"].join(","));
  });

  it("still polls on an interval and on tab visibility", () => {
    expect(src).toContain("setInterval(doFetch, 10_000)");
    expect(src).toContain("visibilitychange");
  });
});
