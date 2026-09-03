import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { normalizeTFId } from "@/lib/timeframes";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/ai-bot/page.tsx"),
  "utf8",
);
const page = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * /ai-bot Market Canvas identity Sentinel.
 *
 * The page built its canvas identity with timeframe "15". That is not a TFId
 * ("15m" is) and has no LEGACY alias, so normalizeTFId returned null and
 * canonicalMarketStateIdentity threw. The surrounding try/catch — there to
 * tolerate option OCC / non-canonical futures symbols — swallowed the throw and
 * set the identity to null, so useMarketCanvasVM always received null and the
 * Market Canvas never rendered. The feature was dead from the commit that added
 * it, and the catch made it silent.
 */
describe("ai-bot canvas identity", () => {
  it('uses a real TFId, not the invalid "15"', () => {
    expect(page).not.toMatch(/timeframe:\s*"15"/);
    expect(page).toContain('timeframe: "15m"');
  });

  it('"15" genuinely does not normalize — the bug was real', () => {
    expect(normalizeTFId("15")).toBeNull();
    expect(normalizeTFId("15m")).toBe("15m");
  });

  it("the timeframe the page uses builds a valid identity for every listed symbol", () => {
    for (const symbol of ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "META", "AMZN", "BTC", "ETH"]) {
      const id = canonicalMarketStateIdentity({ symbol, timeframe: "15m" });
      expect(id.timeframeContext).toEqual(["15m"]);
      expect(id.instrumentId.length).toBeGreaterThan(0);
    }
  });
});
