import { describe, expect, it } from "vitest";
import { selectBusRunway, busReceipt } from "./busRunway";

const bar = (i: number, close: number) => ({ time: 1000 + i * 60, high: close + 1, low: close - 1, close });

describe("selectBusRunway — the bus is a measured break and the road to the next obstacle", () => {
  it("no break in the window → no bus (never a guess)", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(i, 100));
    expect(selectBusRunway({ bars, swingHighs: [{ time: 1000 + 3 * 60, price: 105 }], swingLows: [], obstacles: [] })).toEqual({ drawn: false, reason: "NO_BREAK" });
  });

  it("a close above the last swing high leaves UP; under half the road → BOARDABLE, past half → LEFT", () => {
    const closes = [100, 101, 102, 101, 100, 101, 102, 104, 106];
    const bars = closes.map((c, i) => bar(i, c));
    const hs = [{ time: 1000 + 2 * 60, price: 103 }];
    const v = selectBusRunway({ bars, swingHighs: hs, swingLows: [], obstacles: [{ price: 113, name: "CALL WALL" }] });
    expect(v.drawn && v.dir).toBe("UP");
    expect(v.drawn && v.state).toBe("BOARDABLE"); // (106-103)/(113-103) = 0.3
    const v2 = selectBusRunway({ bars, swingHighs: hs, swingLows: [], obstacles: [{ price: 108, name: "POC" }] });
    expect(v2.drawn && v2.state).toBe("LEFT"); // 3/5 = 0.6
    expect(busReceipt(v2)).toMatch(/^UP:LEFT\|BREAK:103\|TO:POC@108/);
  });

  it("price back behind the break level → STALLED; nothing mapped ahead → OPEN runway", () => {
    const closes = [100, 101, 102, 101, 100, 104, 102];
    const bars = closes.map((c, i) => bar(i, c));
    const v = selectBusRunway({ bars, swingHighs: [{ time: 1000 + 2 * 60, price: 103 }], swingLows: [], obstacles: [] });
    expect(v.drawn && v.state).toBe("STALLED");
    expect(v.drawn && v.target).toBeNull();
  });
});
