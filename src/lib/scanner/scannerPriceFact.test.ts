import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scannerPriceFact, type ScannerPriceTone } from "./scannerPriceFact";
import { scannerQuoteTruth } from "../scannerQuoteTruth";

describe("scannerPriceFact — a carried price may not wear a fresh one's clothes", () => {
  it("× THE INHERITED FRESHNESS: a STALE row's price is a DIFFERENT tone", () => {
    const fresh = scannerPriceFact(421.55, "DELAYED", "TSLA");
    const carried = scannerPriceFact(421.55, "STALE", "TSLA");
    expect(fresh.text).toBe(carried.text);          // same figure …
    expect(fresh.tone).toBe("OBSERVED");            // … different declared tone
    expect(carried.tone).toBe("CARRIED");
    expect(carried.reason).toMatch(/CARRIED FORWARD/);
    expect(carried.reason).toMatch(/cannot say what the price is now/i);
  });

  it("× THE CONFIDENT UNTIMESTAMPED FIGURE: UNAVAILABLE is its own tone", () => {
    const f = scannerPriceFact(90.1, "UNAVAILABLE", "AMD");
    expect(f.tone).toBe("UNEVIDENCED");
    expect(f.measured).toBe(true);           // WM does hold it …
    expect(f.text).toBe("$90.10");           // … and still says it
    expect(f.reason).toMatch(/NO TIMESTAMPED QUOTE EVIDENCE/);
  });

  it("× THE BEST STATE IS STILL NOT LIVE: DELAYED refuses to claim real-time", () => {
    const f = scannerPriceFact(1.5, "DELAYED", "F");
    expect(f.reason).toMatch(/does NOT claim this is real-time/i);
    expect(f.reason).toMatch(/not a live price/i);
  });

  it("× THE PHANTOM ZERO: a non-positive or unreadable price is never $0.00", () => {
    for (const v of [0, -3, Number.NaN, "421.55", null, undefined, {}]) {
      const f = scannerPriceFact(v, "DELAYED", "TSLA");
      expect(f.tone).toBe("NONE");
      expect(f.measured).toBe(false);
      expect(f.text).toBe("No price");
      expect(f.text).not.toContain("NaN");
      expect(f.text).not.toBe("$0.00");
      expect(f.text).not.toBe("—");
    }
  });

  it("× THE PROVENANCE-BLIND TONE: every quality maps to a DISTINCT tone", () => {
    const tones = new Set<ScannerPriceTone>(
      (["DELAYED", "STALE", "UNAVAILABLE"] as const).map(
        (q) => scannerPriceFact(10, q, "X").tone,
      ),
    );
    expect(tones.size).toBe(3);
  });

  it("composes with the real scannerQuoteTruth — a failed refresh dims the price", () => {
    const reused = scannerQuoteTruth({ receivedAt: 1_757_959_240_000, reusedPrevious: true });
    expect(scannerPriceFact(50, reused.quality, "NVDA").tone).toBe("CARRIED");
    const none = scannerQuoteTruth({ receivedAt: 0, reusedPrevious: false });
    expect(scannerPriceFact(50, none.quality, "NVDA").tone).toBe("UNEVIDENCED");
  });
});

describe("/scanner price column adoption", () => {
  const src = readFileSync(join(process.cwd(), "src/app/scanner/page.tsx"), "utf8");

  it("× THE UNCONDITIONAL WHITE: the price cell styles from a declared tone", () => {
    expect(src).toContain("scannerPriceFact");
    expect(src).toContain("priceFact");
    expect(src).toContain("SCANNER_PRICE_TONE");
    // The old cell: full-strength on every row regardless of quote quality.
    expect(src).not.toContain('className="px-2 text-xs font-mono font-bold text-wm-text"');
  });

  it("× THE SILENT CELL: the price carries its reason like every other metric", () => {
    expect(src).toMatch(/title=\{r\.priceFact\.reason\}/);
    expect(src).toMatch(/aria-label=\{`[^`]*\$\{r\.priceFact\.reason\}`\}/);
  });

  it("× THE DEAD-IMPORT PASS: the owner is imported AND used", () => {
    expect(src.split("scannerPriceFact").length - 1).toBeGreaterThan(1);
  });
});
