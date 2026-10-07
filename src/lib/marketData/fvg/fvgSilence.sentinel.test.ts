/**
 * FVG SILENCE — with the layer OFF (wm_fvg false, the default) the FVG organism
 * costs nothing and says one word (Garden 19, coordinator order 2026-10-07):
 *
 *   · zero detector calls on the chart path — the ONE fvgSceneForCamera call
 *     sits in the ELSE branch of `if (!fvgPaints)`, and fvgPaints = fvgOn && …;
 *   · zero bar fetches from fvgBarSource on the chart path — no chart file
 *     imports it (the chart reads its own bars);
 *   · zero FVG paint, no fvg row in the governor — the governor is asked
 *     (`att.paints("fvg")`) only when fvgOn; the `fvgGov` receipt and every other
 *     FVG receipt is deleted; the scene is published as null;
 *   · the receipt reads `fvg = OFF`;
 *   · the room carries no FVG facts to SpaidBot and selects no FVG object;
 *   · Scanner / Backtest / Journal / Personal Edge FVG surfaces fetch ONLY from
 *     an explicit action (button), never from render or an effect.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const SRC = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(SRC, p), "utf8");

/** Bodies of every `useEffect(` / `useLayoutEffect(` / `useMemo(` call (paren-matched). */
function hookBodies(src: string): string[] {
  const out: string[] = [];
  const re = /\b(useEffect|useLayoutEffect|useMemo)\(/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") { depth--; if (depth === 0) break; }
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
}

describe("FVG SILENCE — layer OFF costs nothing on the chart", () => {
  const main = read("components/chart/MainChart.tsx");
  const dash = read("components/chart/ChartsDashboard.tsx");

  it("the default is OFF", () => {
    expect(dash).toMatch(/useState<boolean>\(\(\) => lsGet\(FVG_PREF_KEY, false\) as boolean\)/);
    expect(main).toMatch(/fvgOn = false,/);
  });

  it("OFF → no governor question, no detector call, receipts cleared, fvg = OFF, scene null", () => {
    expect(main.length).toBeGreaterThan(100_000);
    const begin = main.indexOf("FVG-GLASS-BEGIN"), end = main.indexOf("FVG-GLASS-END");
    const block = main.slice(begin, end);
    expect(block).toMatch(/const fvgPaints = fvgOn && att\.paints\("fvg"\);/);
    expect(block).toMatch(/const govLive = fvgPaints \? att\.alpha\("fvg"\) : 0;/);
    const off = block.indexOf("if (!fvgPaints) {");
    const elseAt = block.indexOf("} else {", off);
    expect(off).toBeGreaterThan(0);
    const offBranch = block.slice(off, elseAt);
    expect(offBranch).toContain('dsF.fvg = "OFF"');
    for (const k of ["fvgDrawn", "fvgAsOf", "fvgClear", "fvgSelected", "fvgStep", "fvgCost", "fvgHit", "fvgGov"]) expect(offBranch).toContain(`"${k}"`);
    expect(offBranch).toMatch(/cb\?\.\(null\)/);
    expect(offBranch).not.toMatch(/fvgSceneForCamera|detectFvgs|createFvgEngine|att\.alpha|ctx\./);
    // The one detector call is in the ON branch only.
    expect(block.indexOf("fvgSceneForCamera(")).toBeGreaterThan(elseAt);
    // Paint cost is receipted only while ON.
    expect(block).toMatch(/if \(fvgOn && !computedFvgThisFrame\) \{/);
  });

  it("no chart file fetches FVG bars (the chart path reads its own bars)", () => {
    const chartFiles = ["components/chart/MainChart.tsx", "components/chart/ChartsDashboard.tsx", "components/chart/ChartInspectTicket.tsx", "components/chart/FvgInspectTicket.tsx", "lib/chart/fvgGlass.ts", "lib/marketData/fvg/fvgCamera.ts"];
    for (const f of chartFiles) expect(read(f)).not.toMatch(/fvgBarSource|fetchFvgBars|loadFvgLedgerFor/);
  });

  it("OFF → no FVG facts to SpaidBot and no FVG object selected", () => {
    expect(dash).toMatch(/\.\.\.\(fvgOn && fvgScene\s*\n?\s*\? \{ fvg: spaidbotFvgScene/);
    expect(dash).toMatch(/const selectedFvgObject = isFvgObjectId\(selectedMarketObjectId\) && fvgOn/);
    expect(dash).toMatch(/\(\) => \(fvgOn && fvgScene \? fvgScene\.ledger\.objects\.map\(o => o\.objectId\) : \[\]\)/);
  });
});

describe("FVG SILENCE — reader surfaces fetch only when the trader asks", () => {
  const readers = [
    "components/scanner/FvgScanStrip.tsx",
    "components/backtest/FvgStudyPanel.tsx",
    "components/journal/JournalFvgReferenceField.tsx",
    "components/journal/BrokerTruthToday.tsx",
    "components/journal/PlanAdherenceBySetup.tsx",
  ];

  it("no FVG bar read inside an effect or memo (render / mount never fetches)", () => {
    let calls = 0;
    for (const f of readers) {
      const src = read(f);
      calls += (src.match(/fetchFvgBars\(|loadFvgLedgerFor\(/g) ?? []).length;
      for (const body of hookBodies(src)) expect(body, `${f}: an effect/memo reads FVG bars`).not.toMatch(/fetchFvgBars\(|loadFvgLedgerFor\(/);
    }
    expect(calls).toBeGreaterThanOrEqual(5);
  });

  it("rendering the Scanner strip and the Backtest study makes no request", async () => {
    const fetchSpy = vi.fn();
    const prev = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      vi.doMock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
      const { FvgScanStrip } = await import("@/components/scanner/FvgScanStrip");
      const html = renderToStaticMarkup(React.createElement(FvgScanStrip, { symbols: ["SPY", "NQ1!"] }));
      expect(html).toContain("FVG conditions");
      expect(html).not.toContain("scanner-fvg-run"); // closed until opened
      const { FvgStudyPanel } = await import("@/components/backtest/FvgStudyPanel");
      const html2 = renderToStaticMarkup(React.createElement(FvgStudyPanel, { symbol: "NQ1!", timeframe: "5m", rangeDays: 90, timeframes: ["5m"], onSymbolChange: () => {}, onTimeframeChange: () => {} }));
      expect(html2).toContain("fvg-study-run");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = prev;
      vi.doUnmock("next/navigation");
    }
  });
});
