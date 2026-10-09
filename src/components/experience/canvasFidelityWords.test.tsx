/**
 * THE PLAQUE SAYS WHAT IT GRADES (ruling 2026-10-09).
 *
 * Serving b94f28c at 390, NQ1! 5m: MARKET read "LIVE · asOf 1:22:18 PM CDT"
 * beside a plaque reading "UNMEASURED — No fidelity has been established for
 * this canvas", and a minute later "INDICATIVE — No reason recorded against
 * this reading". This pins: the plaque names its subject, every grade and every
 * reason has trader words, an ungraded chart names the open question, and the
 * phone chip carries the same word in the first screenful.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CanvasFidelityChip } from "@/components/experience/CanvasFidelityChip";
import { MarketHonestyPlaque } from "@/components/experience/MarketHonestyPlaque";
import {
  CANVAS_FIDELITY_LABEL,
  CANVAS_FIDELITY_MEANING,
  CANVAS_UNGRADED_UNKNOWN,
  CANVAS_UNGRADED_WORDS,
  FIDELITY_REASON_WORDS,
  NO_FAULT_ON_FILE,
} from "@/lib/marketData/canvasFidelityWords";
import {
  FIDELITY_REASONS,
  MARKET_FIDELITIES,
  readMarketFidelity,
  type FidelityReason,
  type MarketFidelity,
} from "@/lib/marketData/marketFidelityAlgebra";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import { readCanvasHonesty, readCanvasUngraded, type CanvasHonestyInput } from "@/lib/marketData/readCanvasHonesty";

const reading = (f: MarketFidelity, reasons: FidelityReason[] = []) => {
  const r = readMarketFidelity(f, 1_700_000_000_000, reasons);
  if (!r) throw new Error("fixture could not be read");
  return r;
};
const plaque = (props: Parameters<typeof MarketHonestyPlaque>[0]) => renderToStaticMarkup(<MarketHonestyPlaque {...props} />);

const RETIRED = ["No reason recorded against this reading", "No fidelity has been established for this canvas", "one market fidelity"];

describe("every grade and reason has trader words", () => {
  it("covers all five fidelities and every reason — none blank, none the raw key", () => {
    const fidelities = Object.values(MARKET_FIDELITIES);
    const reasons = Object.values(FIDELITY_REASONS);
    expect(fidelities.length).toBe(5);
    expect(reasons.length).toBeGreaterThan(5);
    for (const f of fidelities) expect(CANVAS_FIDELITY_MEANING[f]?.length ?? 0, f).toBeGreaterThan(20);
    for (const r of reasons) {
      expect(FIDELITY_REASON_WORDS[r]?.length ?? 0, r).toBeGreaterThan(10);
      expect(FIDELITY_REASON_WORDS[r], r).not.toContain(r);
    }
  });

  it("INDICATIVE says what is missing: no broker quote for an order", () => {
    expect(CANVAS_FIDELITY_MEANING.INDICATIVE).toMatch(/broker/i);
    expect(CANVAS_FIDELITY_MEANING.INDICATIVE).toMatch(/order/i);
  });

  it("each open question has its own sentence, and the loading one separates chart from feed", () => {
    const words = Object.values(CANVAS_UNGRADED_WORDS);
    expect(new Set(words).size).toBe(3);
    expect(CANVAS_UNGRADED_WORDS.ASKING).toMatch(/bars are still loading/);
    expect(CANVAS_UNGRADED_WORDS.ASKING).toMatch(/feed word/);
    expect(CANVAS_UNGRADED_WORDS.NO_ANSWER).toMatch(/No bars and no quote/);
  });
});

describe("the plaque names its subject and never the retired sentences", () => {
  it("prints the subject label on a graded and on an ungraded chart", () => {
    for (const html of [plaque({ reading: reading("INDICATIVE") }), plaque({ reading: null })]) {
      expect(html).toContain("honesty-plaque-subject");
      expect(html).toContain(CANVAS_FIDELITY_LABEL);
    }
  });

  it("prints the grade's meaning beside the word, for all five", () => {
    for (const f of Object.values(MARKET_FIDELITIES)) {
      const html = plaque({ reading: reading(f) });
      expect(html, f).toContain("honesty-plaque-meaning");
      expect(html, f).toContain(CANVAS_FIDELITY_MEANING[f].replace(/'/g, "&#x27;"));
    }
  });

  it("a reason is printed in trader words, with its key kept for the test id", () => {
    const html = plaque({ reading: reading("DEGRADED", ["PARTIAL_TAPE"]), showRaw: true });
    expect(html).toContain("honesty-reason-PARTIAL_TAPE");
    expect(html).toContain(FIDELITY_REASON_WORDS.PARTIAL_TAPE.replace(/'/g, "&#x27;"));
    expect(html).not.toContain(">PARTIAL_TAPE<");
    expect(html).toContain("1 reason on file");
  });

  it("an empty reason list says so in trader words", () => {
    expect(plaque({ reading: reading("INDICATIVE") })).toContain(NO_FAULT_ON_FILE);
  });

  it("an ungraded chart names the open question; with no cause it says only that", () => {
    const loading = plaque({ reading: null, ungraded: "ASKING" });
    expect(loading).toContain('data-ungraded="ASKING"');
    expect(loading).toContain(CANVAS_UNGRADED_WORDS.ASKING.replace(/'/g, "&#x27;"));
    const bare = plaque({ reading: null });
    expect(bare).toContain('data-ungraded="UNKNOWN"');
    expect(bare).toContain(CANVAS_UNGRADED_UNKNOWN);
  });

  it("the retired sentences are gone from the plaque and its words", () => {
    const sources = ["src/components/experience/MarketHonestyPlaque.tsx", "src/lib/marketData/canvasFidelityWords.ts", "src/components/experience/CanvasFidelityChip.tsx"]
      .map((rel) => readFileSync(path.join(process.cwd(), rel), "utf8"));
    expect(sources.length).toBe(3);
    const rendered = [plaque({ reading: null }), plaque({ reading: null, ungraded: "NO_MOMENT" }), ...Object.values(MARKET_FIDELITIES).map((f) => plaque({ reading: reading(f) }))].join("\n");
    for (const phrase of RETIRED) expect(rendered.toLowerCase(), phrase).not.toContain(phrase.toLowerCase());
  });
});

describe("the open question is the same decision as the reading", () => {
  const base: CanvasHonestyInput = {
    badge: { label: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE, availability: undefined },
    capturedAtMs: 1_700_000_000_000,
    observedAtMs: null,
    execution: { adapterOwnsCanvasPrice: false },
  };
  const cases: Array<[string, CanvasHonestyInput, string | null]> = [
    ["graded", base, null],
    ["bars loading", { ...base, badge: { ...base.badge, availability: "awaiting" } }, "ASKING"],
    ["nothing answered", { ...base, badge: { ...base.badge, availability: "unavailable" } }, "NO_ANSWER"],
    ["no time on the chart", { ...base, capturedAtMs: null }, "NO_MOMENT"],
  ];
  it.each(cases)("%s", (_name, input, cause) => {
    expect(readCanvasUngraded(input)).toBe(cause);
    // Null cause exactly when there IS a reading — never both, never neither.
    expect(readCanvasHonesty(input) === null).toBe(cause !== null);
  });
});

describe("the phone chip carries the plaque's word", () => {
  const chip = (props: Parameters<typeof CanvasFidelityChip>[0]) => renderToStaticMarkup(<CanvasFidelityChip {...props} />);

  it("names its subject and the grade, and says the meaning to a screen reader", () => {
    const html = chip({ reading: reading("INDICATIVE"), ungraded: null });
    expect(html).toContain("CHART ·");
    expect(html).toContain(">INDICATIVE<");
    expect(html).toContain('data-fidelity="INDICATIVE"');
    expect(html).toContain("Chart fidelity: INDICATIVE.");
  });

  it("an ungraded chart reads NOT GRADED with the open question, never blank", () => {
    const html = chip({ reading: null, ungraded: "ASKING" });
    expect(html).toContain(">NOT GRADED<");
    expect(html).toContain("bars are still loading");
  });

  it("is words only — no link, no control", () => {
    const html = chip({ reading: reading("STALE"), ungraded: null });
    expect(html).not.toMatch(/<(a|button)\b/);
  });

  it("the chart room mounts it on the phone row from the plaque's own reading", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
    expect(src).toContain("<CanvasFidelityChip reading={chartHonesty} ungraded={chartHonestyUngraded} />");
    expect(src).toContain("honestyUngraded: chartHonestyUngraded,");
    expect(src).toContain("readCanvasUngraded(chartHonestyInput)");
  });
});
