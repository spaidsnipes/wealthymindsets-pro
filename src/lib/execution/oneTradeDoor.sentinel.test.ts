/**
 * ONE TRADE DOOR (Founder P0, 2026-10-10): Market Home has exactly one TRADE
 * button, it opens exactly one ticket, and every family is chosen inside that
 * ticket. Fails if a second trade system appears:
 *   A. a second TRADE door on the instrument strip, or a second TradePanel mount;
 *   B. a component outside the known send blocks posts to an order route;
 *   C. the family row stops reaching every family, or the family picker gains a
 *      path to any broker route (it only switches the chart / opens the chain).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe("A. one door, one ticket", () => {
  it("the instrument strip has exactly one TRADE door", () => {
    const strip_ = read("components/chart/InstrumentContextStrip.tsx");
    expect(strip_.length).toBeGreaterThan(1000);
    expect(strip_.match(/data-testid="context-trade"/g)).toHaveLength(1);
  });
  it("TradePanel is mounted exactly once, in Market Home", () => {
    const mounts = walk(path.join(SRC, "components")).concat(walk(path.join(SRC, "app")))
      .flatMap(f => (strip(readFileSync(f, "utf8")).match(/<TradePanel\b/g) ?? []).map(() => path.relative(SRC, f)));
    expect(mounts).toEqual(["components/chart/ChartsDashboard.tsx"]);
  });
});

describe("B. no second send system", () => {
  it("live order-submit routes are posted only from the known send blocks", () => {
    const allowed = new Set(["components/chart/TastytradeLiveOrder.tsx", "components/chart/WebullLiveOrder.tsx"]);
    const posters = walk(path.join(SRC, "components"))
      .filter(f => /\/api\/broker\/(tastytrade|webull)\/order-submit/.test(strip(readFileSync(f, "utf8"))))
      .map(f => path.relative(SRC, f));
    expect(posters.length).toBeGreaterThan(0);
    for (const p of posters) expect(allowed.has(p), p).toBe(true);
  });
});

describe("C. the family row lives in the ticket and never sends", () => {
  it("TradePanel renders the family row and its picker", () => {
    const panel = strip(read("components/chart/TradePanel.tsx"));
    expect(panel.length).toBeGreaterThan(5000);
    expect(panel).toMatch(/<TradeFamilySelector\b/);
    expect(panel).toMatch(/<FamilyContractPicker\b/);
  });
  it("the picker reaches no broker route and no send block", () => {
    const picker = strip(read("components/chart/TradeFamilyPicker.tsx"));
    expect(picker.length).toBeGreaterThan(2000);
    expect(picker).not.toMatch(/\/api\//);
    expect(picker).not.toMatch(/fetch\(/);
    expect(picker).not.toMatch(/LiveOrder/);
  });
  it("the rails hook only reads (status / account), never an order route", () => {
    const hook = strip(read("lib/execution/useTradeRails.ts"));
    expect(hook.length).toBeGreaterThan(500);
    expect(hook).not.toMatch(/order|method:\s*"(POST|DELETE)"/i);
  });
});
