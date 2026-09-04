/**
 * quoteReferenceSeedTruth — Sentinel over the ONE line that turns a withheld
 * day-change into a fabricated one.
 *
 * resolveQuoteDayChange.test.ts locks the pure resolver. It cannot, by
 * construction, see the call site — so a reviver who restored
 *
 *     if (Number.isFinite(q.change)) prevCloseRef.current = realPrice - q.change;
 *
 * would bring the whole defect back with every resolver test still green. That
 * is exactly the vacuity this file exists to deny.
 *
 * Why the seed is load-bearing: `flush()` gates on `prevCloseRef.current > 0`.
 * Seed it from a quote with no real reference close (change === 0, which is
 * finite) and it stores the CURRENT PRICE as yesterday's close. Every
 * subsequent websocket tick then reports `price - <an arbitrary intraday
 * snapshot>` as the day change — a NON-ZERO number, so
 * `selectTickerChangeDisplay` cannot withhold it and the UI paints a direction
 * arrow on a fabrication.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(path.join(process.cwd(), "src/hooks/useWebSocket.ts"), "utf8");

/**
 * Strip comments so the prose explaining this bug can never satisfy an
 * assertion about the code that fixes it. The `[^:]` guard keeps `wss://` and
 * `https://` inside string literals intact.
 */
const src = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const assignments = [...src.matchAll(/prevCloseRef\.current\s*=\s*([^;]+);/g)];

describe("useWebSocket prevCloseRef seed — reference-close truth", () => {
  it("POSITIVE CONTROL: the extractor actually finds the seeds it claims to police", () => {
    // A regex that quietly stopped matching would report "no unguarded seed"
    // forever, and that reads exactly like a clean bill of health. Prove the
    // matcher still sees both the reset and a real quote-derived seed before
    // trusting anything below.
    expect(assignments.length).toBeGreaterThanOrEqual(2);
    const rhs = assignments.map((m) => m[1].trim());
    expect(rhs).toContain("0"); // the symbol-change reset
    expect(rhs.some((r) => r.includes("q.change"))).toBe(true); // a real seed
  });

  it("seeds prevCloseRef ONLY from a quote carrying a real reference close", () => {
    for (const m of assignments) {
      const rhs = m[1].trim();
      if (rhs === "0") continue; // clearing the ref is always safe
      const guardWindow = src.slice(Math.max(0, (m.index ?? 0) - 300), m.index ?? 0);
      expect(
        guardWindow,
        `prevCloseRef seed "${rhs}" is not gated on hasReferenceClose`,
      ).toContain("hasReferenceClose");
    }
  });

  it("never resurrects `?? price` as its own day-change reference", () => {
    // The pre-fix expression was:
    //   const prev = j?.prevClose ?? j?.pc ?? j?.open ?? price;
    // whose final term manufactures change = price - price = 0 from missing
    // data. Both halves of that chain are barred.
    expect(src).not.toMatch(/j\?\.open\s*\?\?\s*price/);
    expect(src).not.toMatch(/j\?\.pc\s*\?\?\s*j\?\.open/);
  });

  it("delegates reference resolution to the shared pure resolver", () => {
    // Single-writer: the honesty rules live in one tested module, not inlined
    // per provider branch where they drift.
    expect(src).toContain("resolveQuoteDayChange");
  });

  it("keeps flush() gated on a positive prevCloseRef", () => {
    // The seed guard only matters because flush() trusts prevCloseRef. If this
    // gate ever disappears, the seed guard protects nothing.
    expect(src).toMatch(/prevCloseRef\.current\s*>\s*0/);
  });
});
