/**
 * Sentinel — /profile trade-row direction.
 *
 * PINNED TO MEANING, NOT FORM. Every assertion below fails when a direction is
 * CLAIMED that the record does not state, and passes under any refactor that
 * keeps the claim honest.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyTradeDirection,
  tradeDirectionBadge,
} from "./tradeRowDirection";

describe("classifyTradeDirection", () => {
  it("× THE DEFECT: a record with no direction must NOT be called LONG", () => {
    expect(classifyTradeDirection(undefined)).toBe("UNKNOWN");
    expect(classifyTradeDirection(null)).toBe("UNKNOWN");
  });

  it("reads the journal vocabulary", () => {
    expect(classifyTradeDirection("LONG")).toBe("LONG");
    expect(classifyTradeDirection("SHORT")).toBe("SHORT");
    expect(classifyTradeDirection("long")).toBe("LONG");
    expect(classifyTradeDirection(" Short ")).toBe("SHORT");
  });

  it("reads the paper-book vocabulary", () => {
    expect(classifyTradeDirection("buy")).toBe("LONG");
    expect(classifyTradeDirection("sell")).toBe("SHORT");
    expect(classifyTradeDirection("BUY")).toBe("LONG");
  });

  it("fails closed on anything it cannot read", () => {
    for (const raw of ["", "   ", "1", 1, 0, {}, [], true, NaN]) {
      expect(classifyTradeDirection(raw)).toBe("UNKNOWN");
    }
  });
});

describe("tradeDirectionBadge", () => {
  it("× THE AMPLIFICATION: an unreadable direction earns no directional tone", () => {
    const b = tradeDirectionBadge("UNKNOWN");
    expect(b.tone).toBe("UNKNOWN");
    expect(b.tone).not.toBe("LONG");
    expect(b.tone).not.toBe("SHORT");
  });

  it("says the absence in a word, never a bare glyph", () => {
    for (const d of ["LONG", "SHORT", "UNKNOWN"] as const) {
      const b = tradeDirectionBadge(d);
      expect(b.text.trim()).not.toBe("—");
      expect(b.text.trim()).not.toBe("-");
      expect(b.text.trim().length).toBeGreaterThan(1);
    }
  });

  it("the UNKNOWN reason explicitly refuses the long assumption", () => {
    const r = tradeDirectionBadge("UNKNOWN").reason.toLowerCase();
    expect(r).toContain("not assumed to be long");
    expect(r.length).toBeGreaterThan(80);
  });

  it("known directions keep their tone and text aligned", () => {
    expect(tradeDirectionBadge("LONG")).toMatchObject({ text: "LONG", tone: "LONG" });
    expect(tradeDirectionBadge("SHORT")).toMatchObject({ text: "SHORT", tone: "SHORT" });
  });

  it("every state carries a reason for title + aria-label", () => {
    for (const d of ["LONG", "SHORT", "UNKNOWN"] as const) {
      expect(tradeDirectionBadge(d).reason.length).toBeGreaterThan(20);
    }
  });
});

describe("/profile page", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/profile/page.tsx"),
    "utf8",
  );

  it("× THE DEFECT: the page must not default a missing direction to LONG", () => {
    expect(src).not.toContain('?? "LONG"');
  });

  it("× THE BINARY RENDER: the badge tone must not be decided by a two-way test on LONG", () => {
    expect(src).not.toMatch(/dir\s*===\s*"LONG"\s*\?\s*"bg-wm-green/);
  });

  it("the page routes direction through the owner", () => {
    expect(src).toContain("classifyTradeDirection");
    expect(src).toContain("tradeDirectionBadge");
  });
});
