import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  fillPriceCell,
  limitPriceCell,
  type BlotterOrderInput,
} from "./orderBlotterCells";

const PAGE = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"),
  "utf8",
);
const PAGE_CODE = PAGE
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

function ord(over: Partial<BlotterOrderInput> = {}): BlotterOrderInput {
  return { type: "limit", status: "pending", limitPx: 10, ...over };
}

describe("one glyph was standing for five facts in the order blotter", () => {
  it("a market order has NO limit price — that is not a missing value", () => {
    const c = limitPriceCell(ord({ type: "market", limitPx: undefined }));
    expect(c.kind).toBe("NOT_APPLICABLE");
    expect(c.text).not.toBe("—");
    expect(c.reason).toContain("no limit price");
  });

  it("a stop order's price constraint is SHOWN, not hidden behind a dash", () => {
    // stopPx had no column at all, so the dash hid a field we hold.
    const c = limitPriceCell(ord({ type: "stop", limitPx: undefined, stopPx: 42.5 }));
    expect(c.kind).toBe("VALUE");
    expect(c.text).toContain("42.50");
  });

  it("a limit order with no limit price is a BROKEN RECORD, not an absence", () => {
    const c = limitPriceCell(ord({ type: "limit", limitPx: undefined }));
    expect(c.kind).toBe("MISSING");
    expect(c.reason).toContain("broken record");
  });

  it("a FILLED order with no fill price is a defect and must not look pending", () => {
    // The most dangerous branch. Under the old code this rendered pixel-for-
    // pixel identically to a pending order: `—`.
    const broken = fillPriceCell(ord({ status: "filled", fillPx: undefined }));
    const pending = fillPriceCell(ord({ status: "pending", fillPx: undefined }));
    expect(broken.kind).toBe("MISSING");
    expect(pending.kind).toBe("NOT_YET");
    expect(broken.text).not.toBe(pending.text);
    expect(broken.reason).not.toBe(pending.reason);
  });

  it("'not yet' and 'never' are opposite claims and must not render alike", () => {
    const pending = fillPriceCell(ord({ status: "pending", fillPx: undefined }));
    const cancelled = fillPriceCell(ord({ status: "cancelled", fillPx: undefined }));
    const rejected = fillPriceCell(ord({ status: "rejected", fillPx: undefined }));
    expect(pending.kind).toBe("NOT_YET");
    expect(cancelled.kind).toBe("NEVER");
    expect(rejected.kind).toBe("NEVER");
    // cancelled and rejected share a kind but not a reason — they died differently.
    expect(cancelled.reason).not.toBe(rejected.reason);
    expect(rejected.reason).toContain("rejected");
  });

  it("A RECORDED PRICE OF ZERO IS A FACT, NOT AN ABSENCE", () => {
    // `ord.limitPx ? … : "—"` is a TRUTHINESS test. 0 is falsy, so a recorded
    // zero rendered as a dash: a fact we hold, displayed as a fact we lack.
    const l = limitPriceCell(ord({ type: "limit", limitPx: 0 }));
    expect(l.kind).toBe("VALUE");
    expect(l.text).toBe("$0.00");

    const f = fillPriceCell(ord({ status: "filled", fillPx: 0 }));
    expect(f.kind).toBe("VALUE");
    expect(f.text).toBe("$0.00");
  });

  it("no cell ever renders a bare glyph and every cell carries a reason", () => {
    const cases: BlotterOrderInput[] = [
      ord({ type: "market", limitPx: undefined, status: "filled", fillPx: 1 }),
      ord({ type: "stop", limitPx: undefined, stopPx: 5, status: "pending" }),
      ord({ type: "stop", limitPx: undefined, stopPx: undefined }),
      ord({ type: "stop-limit", limitPx: 9, status: "cancelled" }),
      ord({ type: "limit", limitPx: undefined, status: "rejected" }),
      ord({ status: "filled", fillPx: undefined }),
    ];
    for (const o of cases) {
      for (const c of [limitPriceCell(o), fillPriceCell(o)]) {
        expect(c.text).not.toBe("—");
        expect(c.text.trim().length).toBeGreaterThan(0);
        expect(c.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("the five kinds are genuinely distinct, not five spellings of one", () => {
    const kinds = new Set([
      limitPriceCell(ord({ type: "market", limitPx: undefined })).kind,   // NOT_APPLICABLE
      limitPriceCell(ord({ type: "limit", limitPx: 3 })).kind,            // VALUE
      limitPriceCell(ord({ type: "limit", limitPx: undefined })).kind,    // MISSING
      fillPriceCell(ord({ status: "pending", fillPx: undefined })).kind,  // NOT_YET
      fillPriceCell(ord({ status: "cancelled", fillPx: undefined })).kind,// NEVER
    ]);
    expect(kinds.size).toBe(5);
  });

  it("the blotter reads the cells from the owner and spells neither branch", () => {
    expect(PAGE_CODE).toContain("limitPriceCell(ord)");
    expect(PAGE_CODE).toContain("fillPriceCell(ord)");
    // The truthiness bug must not survive anywhere in the blotter.
    expect(PAGE_CODE).not.toContain('ord.limitPx ? "$"+fmt2(ord.limitPx) : "—"');
    expect(PAGE_CODE).not.toContain('ord.fillPx ? "$"+fmt2(ord.fillPx) : "—"');
  });

  it("the reason is announced on a phone, not only hovered", () => {
    // Same law as the chart-header and /creator chains: a phone has no hover,
    // so `title` alone would leave these cells standing unexplained.
    expect(PAGE_CODE).toContain("title={limitCell.reason}");
    expect(PAGE_CODE).toContain("aria-label={`Limit price: ${limitCell.text}. ${limitCell.reason}`}");
    expect(PAGE_CODE).toContain("title={fillCell.reason}");
    expect(PAGE_CODE).toContain("aria-label={`Fill price: ${fillCell.text}. ${fillCell.reason}`}");
  });
});
