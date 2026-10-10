/**
 * P1-A (Sheriff §15, 2026-10-08) — EVERY WORD / PLATE PAINTER HONOURS THE
 * NEWEST COLUMN.
 *
 * The newest candles' column (bodies + wicks of the newest 3, ±½ slot, 6px
 * air) was published as a receipt but only a few painters asked for it: the
 * scaffolding card, OI words, SUPPORT · BROKEN, the VAL chip and the WAIT
 * plate all sat on "now". `keepOut()` — the ONE keep-out — now carries the
 * column, so every placement through it honours it. This file enumerates
 * every `placeClearOfKeepOut(` call in MainChart and fails on any whose
 * keep-out list asks neither `keepOut()` nor `newestColumnRects()`, unless it
 * is named below with its reason.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

/** Calls allowed without the column, by a unique fragment of their keep-out argument. */
const EXEMPT: Record<string, string> = {
  "placeClearOfKeepOut(pref, nearBodies,": "NEAR micro-delta words paint before keepOut() exists in the frame; they sit above each bar's own high (their own column).",
  "placeClearOfKeepOut(pref, koC,": "the contradiction groups' koC is built from keepOut() one line above (pinned below).",
  "placeClearOfKeepOut(pref, profileCandlesAt(pref.y - 2 * B - 6,": "the VP name/price pair runs inside runWMVP, which big-trades mode calls before keepOut() exists; it asks every candle body + wick in its rows.",
};

describe("every word / plate painter honours the newest column (P1-A)", () => {
  it("the one keep-out carries the newest column", () => {
    expect(SRC).toContain("if (!keepOutWithColumn) keepOutWithColumn = [...keepOutLedger.boxes, ...newestColumnRects()];");
  });

  it("every placement asks keepOut() or newestColumnRects(), or is named with its reason", () => {
    const calls = [...SRC.matchAll(/placeClearOfKeepOut\(/g)].map(m => m.index!).filter(i => !SRC.slice(Math.max(0, i - 30), i).includes("import"));
    expect(calls.length, "scan is blind").toBeGreaterThan(30);
    const offenders: string[] = [];
    for (const i of calls) {
      const call = SRC.slice(i, i + 360);
      if (/keepOut\(\)|newestColumnRects\(\)/.test(call.slice(0, call.indexOf("{ minX") > 0 ? call.indexOf("{ minX") : 360))) continue;
      if (Object.keys(EXEMPT).some(k => call.startsWith(k))) continue;
      offenders.push(`line ${SRC.slice(0, i).split("\n").length}: ${call.slice(0, 90).replace(/\s+/g, " ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("the WAIT plaque and the scaffolding card keep off the newest column", () => {
    // Tightened 2026-10-09: the newest column is still a keep-out, now beside the inspect sheet.
    expect(SRC).toContain("[...rowBodiesAt(-1e9, 1e9), ...newestColumnRects(), ...chartSheetRects()], floatingChips);");
    expect(SRC).toContain("const koC = [...keepOut(), ...rowBodiesAt(aboveY, belowY + tallest)];");
    expect(SRC).toContain("const cardOnNewest = onNewestColumn(cx0, cy0, w * k, h * k);");
  });
});
