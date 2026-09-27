/**
 * Garden 16 §26 — equity history is split-restated. Raw bars painted TSLA's
 * 2022 3:1 split as a −66% crash on serving (2026-09-27).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { EQUITY_BAR_ADJUSTMENT } from "./alpacaBarRoute";

describe("equity bars are split-adjusted, never raw", () => {
  it("the owner says split", () => {
    expect(EQUITY_BAR_ADJUSTMENT).toBe("split");
  });

  it("the stock bar request reads the owner and never asks for raw", () => {
    const src = readFileSync(join(process.cwd(), "src/app/api/alpaca/route.ts"), "utf8");
    expect(src).toContain("adjustment=${EQUITY_BAR_ADJUSTMENT}");
    expect(src).not.toMatch(/adjustment=raw/);
  });
});
