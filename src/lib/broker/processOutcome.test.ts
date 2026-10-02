import { describe, expect, it } from "vitest";
import { episodeReviewKey, processOutcome } from "./processOutcome";
import type { Episode } from "./webullLedger";

const ep = (id: string, net: number) => ({ id, label: "RECONSTRUCTED", net } as unknown as Episode);

describe("Process × Outcome — the trader's marks beside the broker's result", () => {
  it("a profitable mistake stays a mistake; a disciplined loss stays disciplined; unreviewed is apart", () => {
    const eps = [ep("a", 50), ep("b", -20), ep("c", 30), ep("d", -40), ep("e", 10)];
    const reviews = {
      [episodeReviewKey(eps[0])]: { marks: { READ: "HELD" as const }, lesson: "", repeat: "", updatedAt: 1 },
      [episodeReviewKey(eps[1])]: { marks: { RISK: "HELD" as const, DISCIPLINE: "HELD" as const }, lesson: "", repeat: "", updatedAt: 1 },
      [episodeReviewKey(eps[2])]: { marks: { EXECUTION: "BROKE" as const }, lesson: "", repeat: "", updatedAt: 1 },
      [episodeReviewKey(eps[3])]: { marks: { EXECUTION: "BROKE" as const, DISCIPLINE: "BROKE" as const }, lesson: "", repeat: "", updatedAt: 1 },
    };
    const p = processOutcome(eps, reviews);
    expect(p).toMatchObject({ reviewed: 4, unreviewed: 1, goodWin: { n: 1, net: 50 }, goodLoss: { n: 1, net: -20 }, badWin: { n: 1, net: 30 }, badLoss: { n: 1, net: -40 }, brokeNet: -10 });
    expect(p.brokeBy[0]).toEqual({ dimension: "EXECUTION", broke: 2, net: -10 });
  });
});
