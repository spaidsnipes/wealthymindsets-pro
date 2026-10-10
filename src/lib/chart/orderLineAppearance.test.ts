import { describe, expect, it } from "vitest";

import {
  ORDER_LINE_ALPHA_FLOOR,
  ORDER_LINE_ROOM_INK,
  ORDER_LINE_ROOM_LOOKS,
  clampOrderLineAlpha,
  clampOrderLineWidth,
  inkAt,
  inksDistinct,
  lawfulOrderLineDash,
  lawfulOrderLineLooks,
  lwcLineStyle,
} from "./appearanceLaw";
import { orderLineWords, type ChartOrderLine } from "@/lib/execution/chartOrderLines";

const FIELD = "#07080a";
const STOP: ChartOrderLine = { id: "s", role: "STOP", status: "STAGED", price: 31_093.5, contract: "/NQZ6", detail: "SELL 1", pnlUsd: -690 };

describe("order lines by default — stop red, target green, entry distinct, crisp", () => {
  it("the room's looks", () => {
    expect(ORDER_LINE_ROOM_LOOKS.STOP).toEqual({ ink: ORDER_LINE_ROOM_INK.STOP, alpha: 1, width: 2, dash: "dashed" });
    expect(ORDER_LINE_ROOM_LOOKS.TARGET.ink).toBe(ORDER_LINE_ROOM_INK.TARGET);
    expect(ORDER_LINE_ROOM_LOOKS.ENTRY.ink).toBe(ORDER_LINE_ROOM_INK.ENTRY);
    const { ENTRY, STOP: S, TARGET } = ORDER_LINE_ROOM_INK;
    expect(inksDistinct(S, TARGET) && inksDistinct(ENTRY, S) && inksDistinct(ENTRY, TARGET)).toBe(true);
    for (const ink of [ENTRY, S, TARGET]) expect(inksDistinct(ink, FIELD)).toBe(true);
  });
  it("the stop's red is RED and the target's green is GREEN (channel dominance)", () => {
    const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [r, g] = hex(ORDER_LINE_ROOM_INK.STOP);
    expect(r).toBeGreaterThan(g + 60);
    const [r2, g2] = hex(ORDER_LINE_ROOM_INK.TARGET);
    expect(g2).toBeGreaterThan(r2 + 60);
  });
});

describe("the trader may restyle; nothing may vanish or lie", () => {
  it("colour, opacity, thickness and style are honoured inside their floors", () => {
    const l = lawfulOrderLineLooks({ orderLineStop: "#ff2020", orderLineTarget: "#20ff60", orderLineEntry: "#4a90ff", orderLineOpacity: 0.8, orderLineWidth: 3, orderLineStyle: "dotted" }, FIELD);
    expect(l.STOP).toEqual({ ink: "#ff2020", alpha: 0.8, width: 3, dash: "dotted" });
    expect(l.TARGET.ink).toBe("#20ff60");
    expect(l.ENTRY.ink).toBe("#4a90ff");
  });
  it("cannot be made invisible: opacity floored, width clamped, an ink the field swallows goes back", () => {
    expect(clampOrderLineAlpha(0)).toBe(ORDER_LINE_ALPHA_FLOOR);
    expect(clampOrderLineAlpha(Number.NaN)).toBe(1);
    expect(clampOrderLineWidth(0)).toBe(1);
    expect(clampOrderLineWidth(9)).toBe(4);
    const l = lawfulOrderLineLooks({ orderLineStop: "#08090b", orderLineOpacity: 0.05, orderLineWidth: -3 }, FIELD);
    expect(l.STOP).toMatchObject({ ink: ORDER_LINE_ROOM_INK.STOP, alpha: ORDER_LINE_ALPHA_FLOOR, width: 1 });
    expect(lawfulOrderLineLooks({ orderLineTarget: "not a colour" }, FIELD).TARGET.ink).toBe(ORDER_LINE_ROOM_INK.TARGET);
    expect(lawfulOrderLineDash("wavy")).toBe("dashed");
  });
  it("stop ≠ target: a pair made alike falls back whole", () => {
    const l = lawfulOrderLineLooks({ orderLineStop: "#33cc66", orderLineTarget: "#35cc68" }, FIELD);
    expect([l.STOP.ink, l.TARGET.ink]).toEqual([ORDER_LINE_ROOM_INK.STOP, ORDER_LINE_ROOM_INK.TARGET]);
  });
  it("entry distinct: an entry alike to the stop or the target goes back to ivory", () => {
    expect(lawfulOrderLineLooks({ orderLineEntry: "#e2786c" }, FIELD).ENTRY.ink).toBe(ORDER_LINE_ROOM_INK.ENTRY);
    expect(lawfulOrderLineLooks({ orderLineEntry: "#7fd0a9" }, FIELD).ENTRY.ink).toBe(ORDER_LINE_ROOM_INK.ENTRY);
    // A stop chosen ivory collides with the room's entry → the pair goes back too.
    const l = lawfulOrderLineLooks({ orderLineStop: "#ede6d3", orderLineEntry: "#ede6d3" }, FIELD);
    expect([l.ENTRY.ink, l.STOP.ink]).toEqual([ORDER_LINE_ROOM_INK.ENTRY, ORDER_LINE_ROOM_INK.STOP]);
  });
  it("stroke at opacity; LWC styles", () => {
    expect(inkAt("#e0786b", 0.6)).toBe("rgba(224,120,107,0.6)");
    expect(inkAt("#e0786b", 1)).toBe("#e0786b");
    expect([lwcLineStyle("solid"), lwcLineStyle("dotted"), lwcLineStyle("dashed")]).toEqual([0, 1, 2]);
  });
});

describe("the line paints the lawful look", () => {
  it("a STAGED stop takes the trader's dash, width and opacity; the words keep full ink", () => {
    const looks = lawfulOrderLineLooks({ orderLineOpacity: 0.7, orderLineWidth: 3, orderLineStyle: "solid" }, FIELD);
    expect(orderLineWords(STOP, looks)).toMatchObject({ ink: "#e0786b", stroke: "rgba(224,120,107,0.7)", lineWidth: 3, lineStyle: 0 });
  });
  it("alarm states keep their own ink — UNKNOWN never reads as a calm stop", () => {
    expect(orderLineWords({ ...STOP, status: "UNKNOWN" })).toMatchObject({ ink: "#e0786b", lineStyle: 2, lineWidth: 1 });
    expect(orderLineWords({ ...STOP, status: "RECONCILING" }).ink).toBe("#E8B54D");
    expect(orderLineWords({ ...STOP, role: "WORKING", status: "WORKING" }).ink).toBe("#C9A55C");
  });
});
