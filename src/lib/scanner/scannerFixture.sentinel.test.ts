/**
 * /scanner?scene=scanner-fixture — SAMPLE bar sets through the REAL engine, so
 * the too-few-bars and too-old refusal sentences can be read on serving
 * (coordinator order 2026-10-09). Token-gated, signed-in only, a banner on
 * screen, zero writes, no bar or chain request, no chart door.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PROOF_FIXTURE_SCENES, proofFixtureScene, parseProofScene, NO_PROOF_SCENE } from "@/lib/chart/proofScene";
import { FVG_SCAN_MIN_BARS, fvgScanConditions, fvgScanCoverage } from "@/lib/scanner/fvgScanConditions";
import {
  SCANNER_FIXTURE_BANNER, SCANNER_FIXTURE_FRESH, SCANNER_FIXTURE_OLD, SCANNER_FIXTURE_SHORT, SCANNER_FIXTURE_SYMBOLS, SCANNER_FIXTURE_TF, scannerFixtureBars,
} from "./scannerFixture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/scanner", useSearchParams: () => new URLSearchParams() }));

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
const NOWS = [Date.UTC(2026, 9, 9, 12, 50), Date.UTC(2026, 9, 10, 0, 0, 1), Date.UTC(2027, 0, 3, 23, 59)];
const scan = (symbol: string, nowMs: number) => fvgScanConditions({ symbol, timeframe: SCANNER_FIXTURE_TF, fetch: scannerFixtureBars(symbol, nowMs), nowMs });

describe("scanner-fixture — the token", () => {
  it("is a named page fixture scene, and not a chart proof scene", () => {
    expect(PROOF_FIXTURE_SCENES).toContain("scanner-fixture");
    expect(proofFixtureScene("?scene=scanner-fixture")).toBe("scanner-fixture");
    expect(parseProofScene("?scene=scanner-fixture")).toEqual(NO_PROOF_SCENE);
  });
});

describe("scanner-fixture — the real engine says its own refusals", () => {
  it.each(NOWS)("too few closed bars → the ATR(14) sentence (now %i)", nowMs => {
    const r = scan(SCANNER_FIXTURE_SHORT, nowMs);
    expect(r).toEqual({
      status: "REFUSED", symbol: SCANNER_FIXTURE_SHORT, timeframe: "1D",
      reason: `Only 9 closed 1D bars — at least ${FVG_SCAN_MIN_BARS} are needed before ATR(14) exists and a gap can be read.`,
    });
  });

  it.each(NOWS)("newest bar old → the too-old sentence, with its age in days (now %i)", nowMs => {
    const r = scan(SCANNER_FIXTURE_OLD, nowMs);
    expect(r.status).toBe("REFUSED");
    if (r.status !== "REFUSED") return;
    expect(r.reason).toMatch(/^The newest closed 1D bar closed 1[12]\.\d days ago — too old to be a current reading, so no condition is claimed\.$/);
  });

  it.each(NOWS)("a fresh full set READS — the scene can show a refusal beside a reading, with the denominator (now %i)", nowMs => {
    const all = SCANNER_FIXTURE_SYMBOLS.map(s => scan(s, nowMs));
    expect(all.find(r => r.symbol === SCANNER_FIXTURE_FRESH)?.status).toBe("READ");
    expect(fvgScanCoverage(all)).toEqual({ read: 1, refused: 2, of: 3 });
  });

  it("the sample bars are deterministic, closed, labelled SAMPLE, and unknown symbols are refused", () => {
    const now = NOWS[0]!;
    const a = scannerFixtureBars(SCANNER_FIXTURE_FRESH, now);
    const b = scannerFixtureBars(SCANNER_FIXTURE_FRESH, now);
    expect(a).toEqual(b);
    if (!a.ok) throw new Error("fresh sample did not build");
    expect(a.bars).toHaveLength(160);
    expect(a.bars.every(x => x.asOf + 86_400_000 <= now && x.source === "sample" && x.symbolId === SCANNER_FIXTURE_FRESH)).toBe(true);
    expect(a.provenance).toBe("SAMPLE");
    expect(scannerFixtureBars("TSLA", now).ok).toBe(false);
  });
});

describe("scanner-fixture — writes nothing, asks nothing, inert without the token or a signed-in trader", () => {
  it("the fixture module is pure: no storage, no request, no clock of its own", () => {
    const src = read("lib/scanner/scannerFixture.ts");
    expect(src.length).toBeGreaterThan(500);
    expect(src).not.toMatch(/setItem\(|localStorage|sessionStorage|fetch\(|method:\s*"POST"|indexedDB|Date\.now\(|new Date\(/);
  });

  it("the strip gates on token AND signed-in, takes sample bars in place of the fetch, asks for no chain, and offers no chart door", () => {
    const strip = read("components/scanner/FvgScanStrip.tsx");
    expect(strip).toContain('setSceneAsked(proofFixtureScene(window.location.search) === "scanner-fixture")');
    expect(strip).toContain("const fixture = sceneAsked && !!user;");
    expect(strip).toContain("const fetch = fixture ? scannerFixtureBars(s, nowMs) : await fetchFvgBars(");
    expect(strip).toContain("const walls = fixture ? SCANNER_FIXTURE_WALLS : await loadFvgScanWalls(");
    expect(strip).toContain("if (!open || fixture) return;");          // the trader's watchlist is not read in the scene
    expect(strip.match(/if \(fixture\) return; onOpenSymbol\?\.\(h\.symbol\); router\.push\(h\.href\);/g)).toHaveLength(2);
    expect(strip).toContain('data-testid="scanner-proof-banner"');
    expect(strip).toContain("{SCANNER_FIXTURE_BANNER}");
    expect(strip).not.toMatch(/setItem\(|method:\s*"POST"/);
  });

  it("rendered for a guest / without the token: no banner, the real list, zero storage writes, zero requests", async () => {
    const setItem = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem, removeItem: setItem, clear: setItem, key: () => null, length: 0 });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const { FvgScanStrip } = await import("@/components/scanner/FvgScanStrip");
      const html = renderToStaticMarkup(React.createElement(FvgScanStrip, { symbols: ["SPY", "NQ1!"] }));
      expect(html).toContain('data-testid="scanner-fvg"');
      expect(html).not.toContain(SCANNER_FIXTURE_BANNER);
      expect(html).not.toContain("data-proof-scene");
      expect(setItem).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
