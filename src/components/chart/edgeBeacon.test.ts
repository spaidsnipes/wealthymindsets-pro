import { describe, expect, it } from "vitest";
import { BEACON_H, beaconKindOf, beaconReceipt, beaconWords, chooseBeacons, placeBeacon, type BeaconCandidate } from "./edgeBeacon";

const c = (dir: "above" | "below", price: number, what = "CALL_WALL", wallStrike?: number): BeaconCandidate =>
  ({ dir, price, what, priceText: price.toLocaleString("en-US"), wallStrike });

describe("edge beacons (plate 22b)", () => {
  it("speaks the plate's words, with a count for the other levels beyond the same edge", () => {
    expect(beaconWords(c("above", 30900), 0)).toBe("▲ Call wall 30,900 · Show me");
    expect(beaconWords(c("below", 29400, "PUT_WALL"), 2)).toBe("▼ Put wall 29,400 +2 · Show me");
    expect(beaconWords(c("above", 31000, "GAMMA_NEG"), 0)).toBe("▲ −Gamma level 31,000 · Show me");
    expect(beaconWords(c("above", 30900), 0, true)).toBe("▲ Call wall 30,900");
  });

  it("names a walls/gamma mark by its kinds, walls first", () => {
    expect(beaconKindOf(["CALL_WALL", "PUT_WALL"])).toBe("CALL_PUT_WALL");
    expect(beaconKindOf(["PUT_WALL", "GAMMA_CONC_NEG"])).toBe("PUT_WALL");
    expect(beaconKindOf(["GAMMA_FLIP"])).toBe("GAMMA_FLIP");
    expect(beaconKindOf(["GAMMA_CONC_POS"])).toBe("GAMMA_POS");
  });

  it("one beacon per direction: the nearest level leads, a duplicate price counts once and keeps the wall's strike", () => {
    const got = chooseBeacons([c("above", 31000), c("above", 30900), c("above", 30900, "CALL_WALL", 30900), c("below", 29400, "PUT_WALL")], 30100);
    expect(got).toEqual([
      { lead: c("above", 30900, "CALL_WALL", 30900), more: 1 },
      { lead: c("below", 29400, "PUT_WALL"), more: 0 },
    ]);
    expect(chooseBeacons([], 30100)).toEqual([]);
  });

  it("sits under the header / above the floor and steps aside for a blocker", () => {
    const frame = { plotLeft: 0, plotRight: 700, top: 90, bottom: 500 };
    const a = placeBeacon("above", 200, frame, []);
    expect(a.y).toBe(96);
    expect(placeBeacon("below", 200, frame, []).y).toBe(500 - 6 - BEACON_H);
    const b = placeBeacon("above", 200, frame, [a]);
    expect(b.x).not.toBe(a.x);
  });

  it("publishes a receipt the harness can tap", () => {
    expect(beaconReceipt([])).toBe("NONE");
    expect(beaconReceipt([{ x: 300, y: 96, w: 200, h: 28, words: "", choice: { lead: c("above", 30900), more: 1 } }])).toBe("ABOVE:CALL_WALL@30900+1:400,110");
  });
});
