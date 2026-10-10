/**
 * Draft prices from the chart (Founder P0 2026-10-09): "Trade at <price>", a pick, or a drag of a staged
 * line only ever edit the ticket DRAFT — labelled, applied once (also when the ticket opens later), never
 * overwritten by the quote prefill, and never pulling focus or scroll.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { chartDraftNote, chartEntryEffect } from "./ticketTruth";
import { deliverChartDraftPrice, resetChartOrderLinesForTest } from "./chartOrderLines";

const src = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");

it("the scanned source is not empty", () => {
  expect(src("components/chart/TradePanel.tsx").length).toBeGreaterThan(5000);
});

describe("what an ENTRY price from the chart does to the order type", () => {
  it("'Trade at <price>' (MENU) is ALWAYS a Limit at that price — never Market, whatever the ticket held", () => {
    for (const t of ["Market", "Limit", "Stop", "Stop Limit"]) expect(chartEntryEffect("MENU", t)).toEqual({ entryType: "Limit", field: "LIMIT" });
  });
  it("a pick or a drag: Market becomes Limit; a Limit stays a Limit", () => {
    for (const s of ["PICK", "DRAG"] as const) {
      expect(chartEntryEffect(s, "Market")).toEqual({ entryType: "Limit", field: "LIMIT" });
      expect(chartEntryEffect(s, "Limit")).toEqual({ entryType: "Limit", field: "LIMIT" });
    }
  });
  it("a pick or a drag on a Stop / Stop Limit entry moves its TRIGGER and keeps the type", () => {
    for (const s of ["PICK", "DRAG"] as const) {
      expect(chartEntryEffect(s, "Stop")).toEqual({ entryType: "Stop", field: "TRIGGER" });
      expect(chartEntryEffect(s, "Stop Limit")).toEqual({ entryType: "Stop Limit", field: "TRIGGER" });
    }
  });
});

describe("the label beside the field", () => {
  it("says how the price arrived, and that it is a draft", () => {
    expect(chartDraftNote({ role: "ENTRY", px: 21000.25, source: "MENU" }, 21000.25, "ENTRY")).toBe("Entry picked from the chart at 21000.25 — a draft; nothing is sent until you preview and confirm.");
    expect(chartDraftNote({ role: "ENTRY", px: 21000.25, source: "PICK" }, 21000.25, "ENTRY")).toMatch(/^Entry picked from the chart at 21000\.25/);
    expect(chartDraftNote({ role: "STOP", px: 20990, source: "DRAG" }, 20990, "STOP")).toBe("Stop dragged on the chart at 20990 — a draft; nothing is sent until you preview and confirm.");
    expect(chartDraftNote({ role: "TARGET", px: 21050, source: "DRAG" }, 21050, "TARGET")).toMatch(/^Target dragged on the chart/);
  });
  it("is gone once the trader types another price, for another role, or with no draft", () => {
    expect(chartDraftNote({ role: "ENTRY", px: 21000.25, source: "MENU" }, 21000.5, "ENTRY")).toBeNull();
    expect(chartDraftNote({ role: "ENTRY", px: 21000.25, source: "MENU" }, 21000.25, "STOP")).toBeNull();
    expect(chartDraftNote({ role: "ENTRY", px: 21000.25, source: "MENU" }, null, "ENTRY")).toBeNull();
    expect(chartDraftNote(null, 21000.25, "ENTRY")).toBeNull();
  });
});

describe("delivery and the ticket's effect (source)", () => {
  const T = src("components/chart/TradePanel.tsx");
  it("a non-price is refused at the store", () => {
    resetChartOrderLinesForTest();
    expect(deliverChartDraftPrice("NQ1!", "ENTRY", Number.NaN, "MENU")).toBe(false);
    expect(deliverChartDraftPrice("NQ1!", "ENTRY", -1, "MENU")).toBe(false);
    expect(deliverChartDraftPrice("NQ1!", "ENTRY", 21000, "MENU")).toBe(true);
  });
  it("applied ONCE, across mounts: a draft delivered while the ticket was closed is applied when it opens, never twice", () => {
    expect(T).toContain("let consumedChartDraftSeq = 0;");           // module scope — outlives the panel
    expect(T).toContain("if (!picked || picked.seq <= consumedChartDraftSeq || picked.symbol !== symbol.toUpperCase()) return;");
    expect(T).toContain("consumedChartDraftSeq = picked.seq;");
    expect(T).not.toContain("const lastPick = useRef(0);");          // the per-mount guard that dropped a draft made while closed
  });
  it("the entry goes through chartEntryEffect; a chart limit is never overwritten by the quote prefill", () => {
    expect(T).toContain("const fx = chartEntryEffect(source, effectiveEntryType);");
    expect(T).toContain('if (fx.field === "TRIGGER") setEntryTrigger(v); else { setLimit(v); chartLimit.current = true; }');
    expect(T).toContain("seeded.current !== key && !chartLimit.current");
  });
  it("the draft effect only sets fields — no focus, no scroll, no step change, and nothing that sends", () => {
    const start = T.indexOf("const { pick, picked } = useChartPricePick();");
    const effect = T.slice(start, T.indexOf("}, [picked]);", start));
    expect(effect.length).toBeGreaterThan(400);
    expect(effect).not.toMatch(/\.focus\(|scrollIntoView|scrollTo|setReviewing|setFolded|setHalf|fetch\(|submit|send\(/);
    expect(T).toContain('data-testid="trade-chart-draft-note"');
  });
});
