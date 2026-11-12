import { describe, expect, it } from "vitest";
import { explainBrickWall, explainWall } from "./wallExplain";

describe("explainWall", () => {
  it("names the wall, keeps the chip's own numbers, and never promises", () => {
    const e = explainWall(["CALL_WALL"], 28600, "Call wall 28600 · 65 OI");
    expect(e.title).toBe("CALL WALL 28,600");
    expect(e.lines[0]).toBe("Call wall 28600 · 65 OI");
    expect(e.lines.at(-1)).toMatch(/not a promise/);
  });
  it("a strike that is both walls says so", () => {
    expect(explainWall(["CALL_WALL", "PUT_WALL"], 28500, "x").title).toMatch(/^CALL \+ PUT WALL/);
  });
  it("gamma reads as a model", () => {
    expect(explainWall(["GAMMA_FLIP"], 100, "x").lines.join(" ")).toMatch(/model/i);
  });
  it("brick walls map their polarity", () => {
    expect(explainBrickWall(72000, "PUT_HEAVY").title).toBe("PUT WALL 72,000");
  });
});
