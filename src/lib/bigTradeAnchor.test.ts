import { describe, expect, it } from "vitest";
import { bigTradeAnchor } from "./bubbleDrawGeometry";

describe("individual-print anchor — event time and exact price", () => {
  const input = { barX: 100, barTime: 1000, intervalSec: 60, barSpacing: 12, priceY: 72.125 };

  it("places an execution at bar open on that bar's time coordinate", () => {
    expect(bigTradeAnchor({ ...input, eventTime: 1000 })).toEqual({ x: 100, y: 72.125 });
  });

  it("interpolates execution milliseconds toward the next bar, not half a bar earlier", () => {
    expect(bigTradeAnchor({ ...input, eventTime: 1030.125 })).toEqual({ x: 106.025, y: 72.125 });
  });

  it("keeps two same-price prints at their separate times", () => {
    const first = bigTradeAnchor({ ...input, eventTime: 1001 });
    const second = bigTradeAnchor({ ...input, eventTime: 1059 });
    expect(first!.x).toBeLessThan(second!.x);
    expect(first!.y).toBe(second!.y);
  });

  it("reprojects immediately on pan and scale, without animated displacement", () => {
    const before = bigTradeAnchor({ ...input, eventTime: 1030 });
    const after = bigTradeAnchor({ ...input, eventTime: 1030, barX: 200, priceY: 48.375 });
    expect(after!.x - before!.x).toBe(100);
    expect(after!.y).toBe(48.375);
  });

  it("refuses an unprojectable or wrongly bucketed event instead of clamping evidence", () => {
    for (const invalid of [
      { barX: null }, { priceY: null }, { barSpacing: 0 }, { intervalSec: 0 },
      { eventTime: 999.999 }, { eventTime: 1060 }, { eventTime: NaN },
    ]) {
      expect(bigTradeAnchor({ ...input, eventTime: 1030, ...invalid })).toBeNull();
    }
  });
});
