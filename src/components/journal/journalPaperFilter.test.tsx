/** Live / Paper in the Journal and its proof scene; Alpaca SAMPLE orders in a proof scene. Synthetic data only. */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ALPACA_PAPER_SAMPLE_ORDERS, journalCaptureFromAlpacaPaperOrder } from "@/lib/journal/alpacaPaperCapture";
import { isPaperEntry, liveJournalRecords } from "@/lib/journal/paperEntry";

import { JournalPaperFilter, paperHeldOutNote } from "./JournalPaperFilter";
import { PAPER_SAMPLE_BOOK } from "./JournalProofScene";

const src = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
it("the scanned sources are not empty", () => {
  for (const p of ["components/journal/JournalProofScene.tsx", "app/journal/page.tsx", "components/broker/AlpacaTradingPanel.tsx"]) expect(src(p).length).toBeGreaterThan(3000);
});

describe("the Live / Paper filter", () => {
  it("is drawn only when the book holds a paper entry; the header clause says how many are left out", () => {
    expect(renderToStaticMarkup(<JournalPaperFilter paperCount={0} value="all" onChange={() => {}} />)).toBe("");
    const html = renderToStaticMarkup(<JournalPaperFilter paperCount={1} value="all" onChange={() => {}} />);
    expect(html.match(/data-testid="journal-paper-filter"/g)).toHaveLength(3);
    expect(html).toContain("Paper (1)");
    expect(paperHeldOutNote(0)).toBe("");
    expect(paperHeldOutNote(2)).toBe(" · 2 PAPER not in results");
  });
  it("the Journal and its proof scene use the one component", () => {
    expect(src("app/journal/page.tsx")).toContain("<JournalPaperFilter paperCount={paperCount} value={filterPaper} onChange={setFilterPaper} />");
    expect(src("components/journal/JournalProofScene.tsx")).toContain("<PaperSample />");
  });
  it("the scene's SAMPLE book: one paper entry, results over the two live ones", () => {
    expect(PAPER_SAMPLE_BOOK.filter(isPaperEntry).map(e => e.id)).toEqual(["SAMPLE-PAPER-1"]);
    expect(liveJournalRecords(PAPER_SAMPLE_BOOK).reduce((s, e) => s + e.pnl, 0)).toBe(150);
  });
});

describe("Alpaca SAMPLE orders in a proof scene", () => {
  it("two filled sample orders (the Journal button shows) and one open order (it does not)", () => {
    expect(ALPACA_PAPER_SAMPLE_ORDERS.map(o => !!journalCaptureFromAlpacaPaperOrder(o, 1))).toEqual([true, true, false]);
    expect(ALPACA_PAPER_SAMPLE_ORDERS.every(o => o.id.startsWith("SAMPLE-") && o.symbol === "SAMPLE")).toBe(true);
  });
  it("source: in a scene the panel reads no account orders, labels the sample, and the button opens nothing", () => {
    const P = src("components/broker/AlpacaTradingPanel.tsx");
    expect(P).toContain("if (proofSceneHoldsWrites()) { setOrders([...ALPACA_PAPER_SAMPLE_ORDERS] as Order[]); setOrdersLoad(\"ok\"); setSampleOrders(true); return; }");
    expect(P).toContain('data-testid="alpaca-sample-orders"');
    expect(P).toContain("if (typeof window === \"undefined\" || proofSceneHoldsWrites()) return;");
  });
});

it("1100–1279: the three-column panel narrows to min(960px, 100vw − 220px)", () => {
  expect(src("app/globals.css")).toContain('@media (min-width: 1100px) and (max-width: 1279px) {\n  [data-testid="trade-panel"][data-layout="full"]:has(.wm-ticket-entry-path[data-book="active"]) { width: min(960px, calc(100vw - 220px)) !important; }');
});
