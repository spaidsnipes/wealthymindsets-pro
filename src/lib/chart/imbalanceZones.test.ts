import { describe, expect, it } from "vitest";
import { imbalanceTestWords, imbalanceZoneFate, imbalanceZoneName, imbalanceZonesReceipt, type ImbalanceZone } from "./imbalanceZones";

const buy: ImbalanceZone = { side: "buy", lo: 30112, hi: 30117, birth: 100 };
const b = (time: number, high: number, low: number, close: number) => ({ time, high, low, close });

describe("plate 28 · a stacked imbalance zone's fate", () => {
  it("is untested until a later bar reaches it — the birth bar never tests itself", () => {
    expect(imbalanceZoneFate(buy, [b(100, 30118, 30110, 30116), b(200, 30130, 30120, 30125)])).toEqual({ state: "UNTESTED", testTime: null });
  });
  it("held: a later bar came back and closed on the zone's side", () => {
    expect(imbalanceZoneFate(buy, [b(200, 30130, 30120, 30125), b(300, 30126, 30114, 30120)])).toEqual({ state: "HELD", testTime: 300 });
  });
  it("broke: it closed through", () => {
    expect(imbalanceZoneFate(buy, [b(300, 30120, 30100, 30105)])).toEqual({ state: "BROKE", testTime: 300 });
    expect(imbalanceZoneFate({ ...buy, side: "sell" }, [b(300, 30125, 30113, 30121)])).toEqual({ state: "BROKE", testTime: 300 });
  });
  it("speaks in the plate's words", () => {
    expect(imbalanceZoneName(buy, 0, "UNTESTED")).toBe("Stacked buy imbalance · 30,112–30,117 · untested");
    expect(imbalanceZoneName(buy, 2, "HELD")).toBe("Stacked buy imbalance · 30,112.00–30,117.00");
    expect(imbalanceTestWords("HELD")).toBe("✓ Tested · held");
    expect(imbalanceTestWords("BROKE")).toBe("✗ Tested · broke through");
    expect(imbalanceTestWords("UNTESTED")).toBeNull();
    expect(imbalanceZonesReceipt(["UNTESTED", "HELD"])).toBe("2:UNTESTED,HELD");
  });
});
