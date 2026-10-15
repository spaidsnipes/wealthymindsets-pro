/** The seven Locate-Invention states, read from receipts captured on serving 2026-10-15. */
import { describe, expect, it } from "vitest";
import { compileInventionVisibility, parseInventionVisibility, visibilityOf } from "./inventionVisibility";

describe("visibilityOf — one receipt, one of seven states", () => {
  it("painted receipts are VISIBLE", () => {
    expect(visibilityOf("ON:4")).toBe("VISIBLE");
    expect(visibilityOf("ON:PARTIAL:POS1:NEG3:BALANCED")).toBe("VISIBLE");
    expect(visibilityOf("DRAWN")).toBe("VISIBLE");
    expect(visibilityOf("MEASURED:ALONE")).toBe("VISIBLE");
    expect(visibilityOf("2")).toBe("VISIBLE");
    expect(visibilityOf("SLAB:37x2,ANCHORS:2+BARS:12+POC:29992.50")).toBe("VISIBLE");
    expect(visibilityOf("PRESSURE:MIXED:0.02|ZG:99.25|WALLS:97/BORN/P")).toBe("VISIBLE");
  });
  it("switched off is DISABLED, a thrown layer is RENDER_FAULT", () => {
    expect(visibilityOf("OFF")).toBe("DISABLED");
    expect(visibilityOf(undefined)).toBe("DISABLED");
    expect(visibilityOf("FIELD_OFF")).toBe("DISABLED");
    expect(visibilityOf("ON:3", undefined, "TypeError: x is not a function")).toBe("RENDER_FAULT");
  });
  it("no qualifying event is NO_EVENT — and OFF_CAMERA when the edge chips name one beyond the camera", () => {
    expect(visibilityOf("ON:NO_CURRENT_WALL_EVENT", "ABOVE:0|BELOW:0|MARK:NONE")).toBe("NO_EVENT");
    expect(visibilityOf("ON:NO_CURRENT_WALL_EVENT", "ABOVE:2|BELOW:0|MARK:DRAWN")).toBe("OFF_CAMERA");
    expect(visibilityOf("NO_AGREEMENT|PAIR_OBJECT:NONE")).toBe("NO_EVENT");
    expect(visibilityOf("ON:PARTIAL:POS0:NEG0:BALANCED")).toBe("NO_EVENT");
  });
  it("a named silence about the data is MISSING_EVIDENCE; a market that cannot carry it is UNSUPPORTED", () => {
    expect(visibilityOf("ON:SILENT:NO_CHAIN")).toBe("MISSING_EVIDENCE");
    expect(visibilityOf("SILENCE:PROFILE_WITHHELD")).toBe("MISSING_EVIDENCE");
    expect(visibilityOf("ON:WAITING_FOR_EVIDENCE")).toBe("MISSING_EVIDENCE");
    expect(visibilityOf("SILENT:NO_TRADED_VOLUME")).toBe("MISSING_EVIDENCE");
    expect(visibilityOf("SILENT:UNSUPPORTED")).toBe("UNSUPPORTED");
  });
});

describe("compileInventionVisibility — the serving receipts of 2026-10-15 10:01 (NQ1! 5m, Brick Walls on)", () => {
  it("names each invention's state in one line, and the parser reads it back", () => {
    const line = compileInventionVisibility({
      brickWalls: "ON:4", brickWallsOffCamera: "ABOVE:0|BELOW:0|MARK:NONE", derivativesPressure: "FIELD_OFF",
      gammaHeatmap: "OFF", optionWalls: "OFF", indexMappedWalls: "CALL_OI@29725->29935.25|PUT_OI@29750->29960.25",
      livingProfile: "OFF", vpDrawn: "0", bigTradesDrawn: "1", fvg: "SILENT:NO_CLOSED_BARS",
    });
    const m = parseInventionVisibility(line);
    expect(m.BRICK_WALLS).toBe("VISIBLE");
    expect(m.DERIVATIVES_PRESSURE).toBe("DISABLED");
    expect(m.INDEX_MAPPED_WALLS).toBe("VISIBLE");
    expect(m.SESSION_VP).toBe("NO_EVENT");
    expect(m.BIG_TRADES).toBe("VISIBLE");
    expect(m.FVG).toBe("NO_EVENT");
    expect(m.LIVING_PROFILE).toBe("DISABLED");
    expect(line.split("|").length).toBeGreaterThan(20);
  });
  it("a paint fault marks every invention RENDER_FAULT — DOM 'ON' can never outrank a thrown painter", () => {
    const m = parseInventionVisibility(compileInventionVisibility({ brickWalls: "ON:3", paintFault: "RangeError" }));
    expect(m.BRICK_WALLS).toBe("RENDER_FAULT");
  });
});
