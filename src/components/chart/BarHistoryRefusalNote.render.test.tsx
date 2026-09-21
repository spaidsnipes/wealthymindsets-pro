import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BarHistoryRefusalNote from "@/components/chart/BarHistoryRefusalNote";
import {
  compileBarHistoryRefusal,
  type VendorAttempt,
} from "@/lib/marketData/compileBarHistoryRefusal";

/**
 * TAGS OFF. The reasons for an empty chart already existed — inside a fetch
 * helper, and then not even there, because `return null` destroyed them. A
 * test permitted to read attributes could pass while the glass still said
 * nothing, which is the whole defect.
 */
const visible = (html: string) => html.replace(/<[^>]*>/g, " ");

/** Measured on the serving host for BTCUSDT · 5m, 2026-09-20. Four doors, four
 *  different answers, all of which the room was rendering as UNKNOWN. */
const BTCUSDT_5M: readonly VendorAttempt[] = [
  { vendor: "Alpaca", outcome: "EMPTY" },
  { vendor: "Finnhub", outcome: "REFUSED", edge: "FORBIDDEN" },
  { vendor: "Yahoo", outcome: "REFUSED", edge: "Yahoo HTTP 404" },
  {
    vendor: "Finnhub REST",
    outcome: "NOT_ASKED",
    rule: "this product does not route crypto to its equity vendors.",
  },
];

function markup(attempts: readonly VendorAttempt[]): string {
  return renderToStaticMarkup(
    <BarHistoryRefusalNote vm={compileBarHistoryRefusal(attempts)} />,
  );
}

describe("BarHistoryRefusalNote", () => {
  it("puts EVERY vendor's answer in readable text, not only in attributes", () => {
    const text = visible(markup(BTCUSDT_5M));
    for (const vendor of ["Alpaca", "Finnhub", "Yahoo"]) {
      expect(text, `${vendor} is not on the glass`).toContain(vendor);
    }
    expect(text).toContain("NO BAR HISTORY");
  });

  it("carries the vendor's own edge token onto the glass, verbatim", () => {
    // FORBIDDEN is what /api/finnhub actually returned for BTCUSDT candles on
    // 2026-09-20. If it does not survive to here, the trader is back to
    // FEED UNKNOWN with extra steps.
    expect(visible(markup(BTCUSDT_5M))).toContain("FORBIDDEN");
  });

  it("renders our own rule as OUR decision, beside a vendor's refusal", () => {
    const text = visible(markup(BTCUSDT_5M));
    expect(text).toMatch(/was not asked/i);
    expect(text).toMatch(/refused/i);
    // Both at once, or the note is not telling them apart — the only reason
    // it exists.
    expect(text).toMatch(
      /was not asked[\s\S]*refused|refused[\s\S]*was not asked/i,
    );
  });

  it("paints NOTHING when bars were actually served", () => {
    // A served chart explains itself. A note over live candles would be
    // clutter claiming an absence that is not there.
    expect(markup([{ vendor: "Yahoo", outcome: "SERVED" }])).toBe("");
  });

  it("does not invent vendors it was never handed", () => {
    const text = visible(markup([]));
    expect(text).not.toMatch(/Finnhub|Yahoo|Alpaca|Polygon/);
    expect(text).not.toMatch(/refused/i);
  });

  it("does not grade the feed in hue — Build Order §9", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/chart/BarHistoryRefusalNote.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/#00[Dd]4|rgba\(0,\s*212/);
    expect(source).not.toMatch(/text-wm-green|text-wm-red|#ef4444|#22c55e/i);
  });
});

describe("the refusal note reaches the trader on the chart itself", () => {
  const mainChart = readFileSync(
    resolve(process.cwd(), "src/components/chart/MainChart.tsx"),
    "utf8",
  );

  it("is rendered by MainChart, not left as an unused component", () => {
    expect(mainChart).toContain("<BarHistoryRefusalNote");
  });

  it("the candle cascade RECORDS each vendor's answer instead of dropping it", () => {
    // The defect was `if (!res.ok) return null` — a classified refusal
    // collapsed to null one frame below anything that could render it. If the
    // helpers stop recording, the note has nothing true left to say.
    expect(mainChart, "the cascade no longer collects vendor attempts")
      .toMatch(/VendorAttempt/);
    expect(mainChart, "Finnhub's classified edge is being thrown away again")
      .toMatch(/outcome:\s*"REFUSED"/);
    expect(mainChart, "a vendor skipped by our own rule is not being named")
      .toMatch(/outcome:\s*"NOT_ASKED"/);
  });

  it("compiles through the one owner — never a second sentence for one pixel", () => {
    expect(mainChart).toMatch(/compileBarHistoryRefusal\(/);
  });
});
