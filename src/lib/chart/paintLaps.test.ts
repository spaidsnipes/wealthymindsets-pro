import { afterEach, describe, expect, it } from "vitest";
import { paintLap, paintLapBegin, paintLapReceipt, resetPaintLaps } from "./paintLaps";

afterEach(() => resetPaintLaps());

describe("paint laps — where the paint time goes", () => {
  it("credits the time since the previous lap to the section that just ran, costliest first", () => {
    paintLapBegin(0);
    paintLap(100, 1);   // section 0 (prelude) ran 1 ms
    paintLap(200, 9);   // section 100 ran 8 ms
    paintLap(300, 10);  // section 200 ran 1 ms
    expect(paintLapReceipt(2)).toBe("100:8.0|0:1.0");
  });
  it("smooths across paints instead of reporting one spike", () => {
    paintLapBegin(0); paintLap(100, 0); paintLap(200, 10);
    paintLapBegin(100); paintLap(100, 100); paintLap(200, 100);
    expect(paintLapReceipt(1)).toBe("100:8.0");
  });
});
