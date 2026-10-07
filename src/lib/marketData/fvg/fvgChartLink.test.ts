import { describe, expect, it } from "vitest";
import { parseProofScene } from "@/lib/chart/proofScene";
import { fvgChartHref } from "./fvgChartLink";

describe("fvgChartHref — the one door to a selected FVG", () => {
  it("round-trips through the proofScene parser", () => {
    const objectId = "FVG|NQ1!|5m|1791000000000|BEARISH|v1";
    const href = fvgChartHref({ symbol: "NQ1!", timeframe: "5m", objectId });
    expect(href.startsWith("/charts?")).toBe(true);
    const q = new URLSearchParams(href.slice("/charts".length));
    expect([q.get("symbol"), q.get("tf"), q.get("on"), q.get("select")]).toEqual(["NQ1!", "5m", "fvg", `fvg:${objectId}`]);
    expect(parseProofScene(href.slice("/charts".length)).selectObject).toEqual({ kind: "fvg", objectId });
  });
});
