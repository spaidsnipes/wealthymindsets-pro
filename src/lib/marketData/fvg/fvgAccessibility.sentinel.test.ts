/**
 * FVG ACCESSIBILITY (Garden 19) — Inspect ticket, Scanner strip, Backtest
 * study, Journal FVG field, Academy lesson + diagram:
 *   · every control is a real <button> / link / form control (keyboard reachable + operable);
 *   · visible focus on every control;
 *   · names in trader words — no raw FVG|… ids read aloud;
 *   · each diagram has a text alternative (<title> + <desc>);
 *   · bullish / bearish is always a WORD, never colour alone;
 *   · ≥ 44 px touch targets on phone (`wm-tap` → 44 px under pointer: coarse, or min-h-11).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { FvgInspectTicket } from "@/components/chart/FvgInspectTicket";
import { FvgDiagram } from "@/components/education/FvgDiagram";
import { FVG_DIAGRAM_TEXT } from "@/lib/academy/fvgDiagramText";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const SRC = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(SRC, p), "utf8");
const FILES = [
  "components/chart/FvgInspectTicket.tsx",
  "components/scanner/FvgScanStrip.tsx",
  "components/backtest/FvgStudyPanel.tsx",
  "components/journal/JournalFvgReferenceField.tsx",
  "components/education/FvgLessonBody.tsx",
  "components/ai/AskSpaidbotButton.tsx",
];

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const bars: CanonicalBar[] = ([...Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row),
  [100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5], [104.5, 105, 103.5, 104.5]] as Row[]).map(([o, h, l, c], i) => ({
  barId: `NQ1!|1m|${T0 + i * MIN}|e0`, symbolId: "NQ1!", sessionId: "S", timeframe: "1m",
  open: o, high: h, low: l, close: c, volume: 1, asOf: T0 + i * MIN, receivedAt: 0,
  fidelity: "INDICATIVE", source: "f", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const obj = detectFvgs(bars, { symbolId: "NQ1!", timeframe: "1m" }).objects[0];

/** Opening tags of interactive elements in JSX source. */
function controls(src: string): string[] {
  const out: string[] = [];
  const re = /<(button|Link|a|select|summary)\b/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    // Scan to the tag's own '>' — skipping JSX expressions ({…}) and arrow '=>'.
    let depth = 0, i = m.index + m[0].length;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0 && src[i - 1] !== "=") break;
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
}

/** The text a screen reader announces: visible text + aria-label values, minus aria-hidden subtrees. */
function spoken(html: string): string {
  const noHidden = html.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, "");
  const labels = [...noHidden.matchAll(/aria-label="([^"]*)"/g)].map(m => m[1]).join(" ");
  return `${noHidden.replace(/<[^>]+>/g, " ")} ${labels}`;
}

describe("FVG accessibility — controls, focus, touch, words", () => {
  it("every control is a real element with visible focus and a ≥44 px phone target", () => {
    let n = 0;
    for (const f of FILES) {
      const src = read(f);
      for (const tag of controls(src)) {
        if (/^<a\b/.test(tag) && !/href=/.test(tag)) continue;
        n++;
        if (/^<(select|summary)\b/.test(tag)) continue; // native controls: focusable; select carries wm-tap where styled
        expect(tag, `${f}: ${tag.slice(0, 90)}`).toMatch(/wm-tap|min-h-11/);
        expect(tag, `${f}: ${tag.slice(0, 90)}`).toMatch(/focus-visible:outline/);
      }
    }
    expect(n).toBeGreaterThan(15);
  });

  it("no clickable non-control (div/span with onClick) — keyboard can reach everything", () => {
    for (const f of FILES) expect(read(f), f).not.toMatch(/<(div|span|li|tr|td)\b[^>]*\bonClick=/);
  });

  it("bullish / bearish is never colour alone: every direction ink sits on a direction word", () => {
    for (const f of FILES) {
      const src = read(f);
      for (const m of src.matchAll(/(text-wm-green|text-wm-red)[^>]*>\s*\{?([^<]{0,80})/g)) {
        expect(m[2], `${f}: ${m[0].slice(0, 120)}`).toMatch(/direction|BULLISH|BEARISH|bullish|bearish/);
      }
    }
  });

  it("no aria-label names a raw FVG|… id", () => {
    for (const f of FILES) {
      for (const m of read(f).matchAll(/aria-label=\{?`?"?([^"}`]*)/g)) expect(m[1], f).not.toMatch(/objectId|FVG\|/);
    }
  });

  it("the Inspect ticket speaks in trader words: direction in words, no ids read aloud", () => {
    const html = renderToStaticMarkup(React.createElement(FvgInspectTicket, {
      o: obj, fmt: (p: number) => p.toFixed(2), clock: (ms: number) => new Date(ms).toISOString(), onClose: () => {},
    }));
    const said = spoken(html);
    expect(said).toContain("BULLISH");
    expect(said).not.toMatch(/FVG\|/);
    expect(said).not.toMatch(/NQ1!\|1m\|\d+\|e0/);
    expect(html).toMatch(/<button[^>]*class="wm-tap[^"]*focus-visible:outline[^"]*"[^>]*aria-label="Close the gap&#x27;s inspect ticket"/);
  });

  it("every Academy diagram has a text alternative; bullish and bearish named in words", () => {
    for (const kind of Object.keys(FVG_DIAGRAM_TEXT) as (keyof typeof FVG_DIAGRAM_TEXT)[]) {
      const html = renderToStaticMarkup(React.createElement(FvgDiagram, { kind, title: "Lesson" }));
      expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-labelledby="fvg-dt-[^"]+"[^>]*aria-describedby="fvg-dd-[^"]+"/);
      expect(html).toMatch(/<title id="fvg-dt-[^"]+">Schematic: Lesson<\/title>/);
      expect(html).toContain(FVG_DIAGRAM_TEXT[kind].replace(/'/g, "&#x27;"));
    }
    expect(FVG_DIAGRAM_TEXT.bullish).toMatch(/^Bullish gap/);
    expect(FVG_DIAGRAM_TEXT.bearish).toMatch(/^Bearish gap/);
  });

  it("the Scanner strip and Backtest study render keyboard controls with names", async () => {
    const { FvgScanStrip } = await import("@/components/scanner/FvgScanStrip");
    const strip = renderToStaticMarkup(React.createElement(FvgScanStrip, { symbols: ["SPY"] }));
    expect(strip).toMatch(/<button[^>]*aria-expanded="false"[^>]*>FVG conditions<\/button>/);
    const { FvgStudyPanel } = await import("@/components/backtest/FvgStudyPanel");
    const study = renderToStaticMarkup(React.createElement(FvgStudyPanel, { symbol: "NQ1!", timeframe: "5m", rangeDays: 90, timeframes: ["5m"], onSymbolChange: () => {}, onTimeframeChange: () => {} }));
    expect(study).toMatch(/<select[^>]*data-testid="fvg-study-tf"/);
    expect(study).toMatch(/<button[^>]*data-testid="fvg-study-run"[^>]*>Add NQ1! 5m to the study<\/button>/);
  });
});
