import { describe, expect, it } from "vitest";
import { fvgInspectDock, parseFvgSelectedMark } from "./fvgInspectDock";
import { passportDockSide } from "@/lib/marketData/viewModels/selectPassportSlots";

// Measured on serving 2026-10-09 (1440 desktop): plot 1195 px wide, card 268 px at x 8–276.
const PANE = 1195, CARD = 268;

describe("§46 — the gap's Inspect card stands on the wall away from the selected gap", () => {
  it("parses the chart's receipt FRAME:GOLD@x,y,w,h", () => {
    expect(parseFvgSelectedMark("FRAME:GOLD@1120,361,23,12")).toEqual({ x: 1120, y: 361, w: 23, h: 12 });
    expect(parseFvgSelectedMark("FRAME:GOLD@-40.5,12,300,8")).toEqual({ x: -40.5, y: 12, w: 300, h: 8 });
  });

  it("no geometry is not an error: the bare receipt, NONE and nothing all parse to null", () => {
    for (const m of ["FRAME:GOLD", "NONE", "", null, undefined, "FRAME:GOLD@1,2,3", "FRAME:GOLD@a,b,c,d"]) {
      expect(parseFvgSelectedMark(m), String(m)).toBeNull();
    }
  });

  it("a gap under the left wall sends the card to the right wall", () => {
    expect(fvgInspectDock({ mark: "FRAME:GOLD@60,300,120,14", paneWidth: PANE, cardWidth: CARD })).toBe("RIGHT");
  });

  it("a gap at the right keeps the card on the left wall", () => {
    expect(fvgInspectDock({ mark: "FRAME:GOLD@1000,300,60,14", paneWidth: PANE, cardWidth: CARD })).toBe("LEFT");
  });

  it("with no frame published the card keeps the left wall, as before", () => {
    expect(fvgInspectDock({ mark: "FRAME:GOLD", paneWidth: PANE, cardWidth: CARD })).toBe("LEFT");
    expect(fvgInspectDock({ mark: "NONE", paneWidth: PANE, cardWidth: CARD })).toBe("LEFT");
  });

  it("is the Passport's rule, not a second one: same answer as passportDockSide at the frame's centre", () => {
    for (const x of [0, 60, 142, 276, 400, 598, 900, 1100]) {
      const mark = `FRAME:GOLD@${x},200,40,10`;
      expect(fvgInspectDock({ mark, paneWidth: PANE, cardWidth: CARD }), mark)
        .toBe(passportDockSide({ objectX: x + 20, paneWidth: PANE, drawerWidth: CARD }));
    }
  });
});
