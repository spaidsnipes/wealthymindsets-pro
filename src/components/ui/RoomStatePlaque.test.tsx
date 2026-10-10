/**
 * RoomStatePlaque — the house's one empty / reading / unavailable plaque.
 * Renders each kind with its WORD (never colour alone), the canon failure word
 * for a source that did not answer, and pins the rooms that adopted it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomStatePlaque } from "./RoomStatePlaque";

const SRC = resolve(__dirname, "../..");

describe("RoomStatePlaque", () => {
  it("names each state in words, not colour alone", () => {
    const empty = renderToStaticMarkup(<RoomStatePlaque kind="empty" title="No saved heat yet." />);
    const reading = renderToStaticMarkup(<RoomStatePlaque kind="reading" title="Reading the wire" />);
    const down = renderToStaticMarkup(<RoomStatePlaque kind="unavailable" title="The wires did not answer." />);
    expect(empty).toContain("NOTHING HERE YET");
    expect(empty).not.toContain('role="status"');
    expect(reading).toContain("READING");
    expect(reading).toContain('aria-busy="true"');
    expect(down).toContain("UNAVAILABLE");
    expect(down).toContain('role="status"');
    // Canon failure grammar: never invent ERROR / OFFLINE.
    expect(down).not.toMatch(/ERROR|OFFLINE/);
  });

  it("paints only canonical-owner colours", () => {
    const src = readFileSync(resolve(__dirname, "RoomStatePlaque.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(1500);
    expect(src).toContain('from "@/lib/design/wmTokens"');
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("the rooms that hand-rolled their empty line now read the plaque", () => {
    for (const [file, testId] of [
      ["app/research-heat/page.tsx", "heat-archive-empty"],
      ["app/backtesting/page.tsx", "backtest-empty"],
      ["app/news/page.tsx", "news-empty-state"],
      ["app/journal/page.tsx", "journal-list-empty"],
      ["app/journal/page.tsx", "journal-detail-empty"],
    ] as const) {
      const src = readFileSync(resolve(SRC, file), "utf8");
      expect(src.length, file).toBeGreaterThan(2000);
      expect(src, file).toContain("<RoomStatePlaque");
      expect(src, file).toContain(`testId="${testId}"`);
    }
  });
});
