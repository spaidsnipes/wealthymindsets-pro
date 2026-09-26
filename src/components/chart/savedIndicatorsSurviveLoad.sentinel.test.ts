/**
 * SAVED INDICATORS SURVIVE A LOAD — serving, 2026-09-26 04:32 CDT.
 *
 * /charts?…&ind=VWAP,EMA 21,EMA 50,Bollinger Bands,RSI,MACD drew none of
 * them. The indicator effect depends on [activeInds, indSettings, ready,
 * cameraEpoch]; it ran at `ready`, before the history arrived, returned on an
 * empty barsRef, and nothing re-ran it when the bars landed — so every saved
 * indicator vanished on refresh and on symbol change (GP12 §69 continuity).
 * The history load now bumps the same epoch Bar Replay uses.
 *
 * A breadcrumb, not a renderer. It reads source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("saved indicators survive a history load", () => {
  it("the history load bumps cameraEpoch right after it publishes the bars", () => {
    const at = SRC.indexOf("      barsRef.current   = data;");
    expect(at).toBeGreaterThan(-1);
    const tail = SRC.slice(at, at + 1600);
    const set = tail.indexOf("setCandles(data);");
    const bump = tail.indexOf("setCameraEpoch(e => e + 1);");
    expect(set).toBeGreaterThan(-1);
    expect(bump).toBeGreaterThan(set);
  });

  it("the indicator effect still re-runs on cameraEpoch", () => {
    expect(SRC).toMatch(/\}, \[activeInds, indSettings, ready, cameraEpoch\]\);/);
  });
});
