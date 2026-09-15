/**
 * Sentinel — StockInfoPanel Quotes stats grid.
 *
 * PINNED TO MEANING. Each assertion fails when WM either invents a figure it
 * does not hold, hides a figure it does, or lets a capability gap masquerade
 * as a data gap.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatVolumeMagnitude,
  priceSessionFact,
  volumeSessionFact,
  turnoverSessionFact,
  type SessionFact,
} from "./stockInfoSessionFacts";

const px = (raw: unknown, observed = true) =>
  priceSessionFact(raw, 2, "High", "NVDA", observed);
const vol = (raw: unknown, observed = true) => volumeSessionFact(raw, "NVDA", observed);
const turn = () => turnoverSessionFact("NVDA");

describe("priceSessionFact", () => {
  it("states an observed figure", () => {
    expect(px(212.63).text).toBe("212.63");
    expect(px(212.63).state).toBe("OBSERVED");
  });

  it("× THE DEFECT: no quote and a quote missing the field are different facts", () => {
    const noQuote = px(212.63, false);
    const noField = px(undefined, true);
    expect(noQuote.state).toBe("NOT_OBSERVED");
    expect(noField.state).toBe("NOT_REPORTED");
    expect(noQuote.text).not.toBe(noField.text);
    expect(noQuote.reason).not.toBe(noField.reason);
  });

  it("an unobserved quote outranks whatever number was passed alongside it", () => {
    // The panel's realOHLC is null; a stale number in scope must not leak out.
    expect(px(999.99, false).text).not.toContain("999");
  });
});

describe("volumeSessionFact", () => {
  it("× THE DEFECT: an observed ZERO volume must NOT be erased", () => {
    const z = vol(0);
    expect(z.state).toBe("OBSERVED");
    expect(z.text).toBe("0K");
    expect(z.reason.toLowerCase()).toContain("zero");
  });

  it("× THE DEFECT: an omitted volume must NOT be written as zero", () => {
    for (const raw of [undefined, null, NaN, "100", {}]) {
      const f = vol(raw);
      expect(f.state).toBe("NOT_REPORTED");
      expect(f.text).not.toBe("0K");
      expect(f.text).not.toBe("0");
    }
  });

  it("a real volume is stated", () => {
    expect(vol(76.9e6).text).toBe("76.90M");
    expect(vol(2.1e9).text).toBe("2.10B");
    expect(vol(76.9e6).state).toBe("OBSERVED");
  });

  it("no quote is NOT_OBSERVED and does not claim nothing traded", () => {
    const f = vol(0, false);
    expect(f.state).toBe("NOT_OBSERVED");
    expect(f.reason.toLowerCase()).toContain("not a claim that nothing traded");
  });
});

describe("turnoverSessionFact", () => {
  it("× THE DEFECT: a capability gap must NOT look like a data gap", () => {
    const t = turn();
    expect(t.state).toBe("NOT_COMPUTED");
    expect(t.text).toBe("Not computed");
    // It must distinguish itself from every fetch-shaped refusal on the panel.
    expect(t.text).not.toBe(px(undefined).text);
    expect(t.text).not.toBe(px(1, false).text);
  });

  it("the reason says waiting will not help", () => {
    expect(turn().reason).toMatch(/capability gap/i);
    expect(turn().reason).toMatch(/not a provider outage/i);
  });
});

describe("no state renders a bare glyph", () => {
  it("every fact carries words and a reason", () => {
    const all: SessionFact[] = [
      px(1), px(undefined), px(1, false),
      vol(0), vol(undefined), vol(1e6), vol(0, false),
      turn(),
    ];
    for (const f of all) {
      expect(f.text.trim()).not.toBe("—");
      expect(f.text.trim()).not.toBe("-");
      expect(f.text.trim().length).toBeGreaterThan(1);
      expect(f.reason.length).toBeGreaterThan(40);
    }
  });
});

describe("formatVolumeMagnitude", () => {
  it("does not lie about scale", () => {
    expect(formatVolumeMagnitude(0)).toBe("0K");
    expect(formatVolumeMagnitude(1e6)).toBe("1.00M");
    expect(formatVolumeMagnitude(1e9)).toBe("1.00B");
  });
});

describe("StockInfoPanel", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/chart/StockInfoPanel.tsx"),
    "utf8",
  );

  it("× THE DEFECT: turnover must not be a hardcoded glyph", () => {
    expect(src).not.toMatch(/const\s+turn\s*=\s*["']—["']/);
  });

  it("× THE TRUTHINESS TEST: volume must not be gated on being truthy", () => {
    expect(src).not.toMatch(/realOHLC\?\.volume\s*\?/);
  });

  it("× THE LAUNDERING: an omitted volume must not be coerced to 0 on ingest", () => {
    expect(src).not.toMatch(/volume:\s*j\.volume\s*\?\?\s*0/);
  });

  it("the panel routes every session fact through the owner", () => {
    expect(src).toContain("priceSessionFact");
    expect(src).toContain("volumeSessionFact");
    expect(src).toContain("turnoverSessionFact");
  });
});
