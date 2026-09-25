/**
 * DATA GAPS AND MEMORY GHOST — WHAT THE GLASS MAY NOT CLAIM.
 *
 * Found reviewing the Garden Pass 12 commits (586d3c62, f0ca2eaa) against HEAD
 * (2026-09-25): the hole mark called market closes "missing" bars, and the
 * ghost candles were painted brighter than their owner's ceiling and past the
 * newest bar. The owners' rules are unit-tested beside them; this pins the
 * canvas to projecting those owners and nothing more.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const slice = (from: string, to: string) => {
  const a = CHART.indexOf(from);
  const b = a < 0 ? -1 : CHART.indexOf(to, a);
  expect(a, from).toBeGreaterThan(-1);
  expect(b, to).toBeGreaterThan(a);
  return CHART.slice(a, b);
};

describe("data gap marks", () => {
  const block = () => slice("selectDataGaps(", "canvas.dataset.dataGaps");

  it("the session question goes to the owner with the bars' own session identity and the instrument's continuity", () => {
    const b = block();
    expect(b).toMatch(/identities: barIdentitiesRef\.current/);
    expect(b).toMatch(/continuous: canonicalAssetClass\(symbol\) === "crypto"/);
  });

  it("the words at the hole are the owner's label; the canvas never calls an empty interval missing", () => {
    const b = block();
    expect(b).toMatch(/`‑ ‑ \$\{g\.label\} ‑`/);
    expect(b).toMatch(/fillText\(t, mx, my\)/);
    expect(b).not.toMatch(/missing/i);
    expect(b).not.toMatch(/GAP ·/);
  });

  it("the receipt names the refusal instead of reporting an empty measurement", () => {
    expect(CHART).toMatch(/canvas\.dataset\.dataGaps = dg\.reason === "MEASURED" \? `\$\{dg\.gaps\.length\}:\$\{painted\}` : dg\.reason;/);
  });
});
