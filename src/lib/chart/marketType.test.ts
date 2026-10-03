import { describe, expect, it } from "vitest";

import { MARKET_MONO, MARKET_NUMBER_MIN_PX, crispText, footprintCellPx, marketFont } from "./marketType";

describe("market typography (§15/§16)", () => {
  it("numbers are mono and never below the floor", () => {
    expect(marketFont("FOOTPRINT_NUMBER", 7)).toBe(`700 ${MARKET_NUMBER_MIN_PX}px ${MARKET_MONO}`);
    expect(footprintCellPx(4)).toBe(9);
    expect(footprintCellPx(30)).toBe(12);
  });
  it("crisp text lands on whole pixels and never uses a blurred halo", () => {
    const calls: string[] = [];
    const ctx = {
      font: "", textAlign: "left", textBaseline: "alphabetic", fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "miter",
      shadowBlur: 5, shadowColor: "black",
      fillText: (t: string, x: number, y: number) => calls.push(`fill ${t} ${x} ${y}`),
      strokeText: (t: string, x: number, y: number) => calls.push(`stroke ${t} ${x} ${y}`),
    } as Parameters<typeof crispText>[0];
    crispText(ctx, "12", 10.5, 20.5, { fill: "#fff", outline: true });
    expect(ctx.shadowBlur).toBe(0);
    expect(calls).toEqual(["stroke 12 11 21", "fill 12 11 21"]);
  });
});
