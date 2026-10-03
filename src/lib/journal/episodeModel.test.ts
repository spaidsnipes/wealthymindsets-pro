import { describe, expect, it } from "vitest";
import { parseModels, resultsByModel } from "./episodeModel";
import type { Episode } from "@/lib/broker/webullLedger";

describe("Model 0/1/2 on broker episodes — the trader marks it, results by mark", () => {
  it("only marked trades count; M0 on a filled trade is kept as its own row", () => {
    const ep = (id: string, net: number) => ({ id, label: "RECONSTRUCTED", net } as unknown as Episode);
    const marks = parseModels(JSON.stringify({ a: "M1", b: "M1", c: "M2", d: "M0", e: "M9" }));
    const r = resultsByModel([ep("a", 20), ep("b", -10), ep("c", -5), ep("d", -30), ep("e", 99), ep("f", 1)], marks);
    expect(r.marked).toBe(4);
    expect(r.rows).toEqual([
      { model: "M1", n: 2, wins: 1, net: 10, expectancy: 5 },
      { model: "M2", n: 1, wins: 0, net: -5, expectancy: -5 },
      { model: "M0", n: 1, wins: 0, net: -30, expectancy: -30 },
    ]);
  });
});
