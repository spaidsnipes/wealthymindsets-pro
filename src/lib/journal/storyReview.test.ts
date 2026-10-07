import { describe, expect, it } from "vitest";

import { REVIEW_DIMENSIONS, cycleMark, parseStoryReviews, reviewSummary } from "./storyReview";

describe("Garden 18 §XCI + §J — ten separate teachers, not one P&L", () => {
  it("has exactly the ten dimensions, in order (§J added ADHERENCE and SLIPPAGE to the original eight)", () => {
    expect(REVIEW_DIMENSIONS).toEqual(["READ", "DECISION", "ADHERENCE", "EXPRESSION", "EXECUTION", "SLIPPAGE", "RISK", "MANAGEMENT", "DISCIPLINE", "RESULT"]);
  });

  it("marks cycle unjudged → held → broke → unjudged", () => {
    expect(cycleMark(undefined)).toBe("HELD");
    expect(cycleMark("HELD")).toBe("BROKE");
    expect(cycleMark("BROKE")).toBeUndefined();
  });

  it("parses defensively and summarises in one line", () => {
    const r = parseStoryReviews(JSON.stringify({ "wmd_x": { marks: { READ: "HELD", RISK: "BROKE", RESULT: "MAYBE" }, lesson: "waited", repeat: 3 } }));
    expect(r.wmd_x?.marks).toEqual({ READ: "HELD", RISK: "BROKE" });
    expect(r.wmd_x?.repeat).toBe("");
    expect(reviewSummary(r.wmd_x)).toBe("1 held · 1 broke · 8 open");
    expect(parseStoryReviews("not json")).toEqual({});
  });

  it("keeps a separate note per dimension, and drops notes for dimensions that do not exist", () => {
    const r = parseStoryReviews(JSON.stringify({ k: { marks: {}, notes: { SLIPPAGE: "paid a tick", MOOD: "x", RISK: 4, ADHERENCE: "  " } } }));
    expect(r.k?.notes).toEqual({ SLIPPAGE: "paid a tick" });
  });
});
