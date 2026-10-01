import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const from = source.indexOf("const restoreNativeAfterClarityLoss = () => {");
const to = source.indexOf("\n      };", from);
const recovery = source.slice(from, to + "\n      };".length);

describe("Clarity price sovereignty after a successful paint", () => {
  it("restores native candle/wick ink and retries when a rebuilding series rejects restoration", () => {
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const factory = new Function("srs", "clarityHidRef", "chartSettings", "CANDLE_UP_DEFAULT", "CANDLE_DOWN_DEFAULT", `${recovery}; return restoreNativeAfterClarityLoss;`);
    const ref = { current: true };
    const applyOptions = vi.fn().mockImplementationOnce(() => { throw new Error("rebuilding"); });
    const restore = factory({ applyOptions }, ref, { candleUp: "#abc123", wickUp: "#def456" }, "up", "down");
    restore();
    expect(ref.current).toBe(true);
    restore();
    expect(ref.current).toBe(false);
    expect(applyOptions.mock.calls[1][0]).toMatchObject({ upColor: "#abc123", wickUpColor: "#def456", downColor: "down", wickDownColor: "down" });
    restore();
    expect(applyOptions).toHaveBeenCalledTimes(2);
  });
  it("invokes recovery both when the painter loses all candles and when it faults", () => {
    expect(source).toContain("if (drawnC === 0) restoreNativeAfterClarityLoss();");
    expect(source).toContain('catch (err) { restoreNativeAfterClarityLoss(); layerFault("CLARITY_CANDLE", err); }');
  });
});
