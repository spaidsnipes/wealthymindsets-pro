import { describe, expect, it } from "vitest";

import { planProfileStack, soloLane } from "./profileStackPlan";

const W = 1300;
const AX = 60;

const overlaps = (a: { right: number; width: number }, b: { right: number; width: number }) =>
  a.right - a.width < b.right && b.right - b.width < a.right;

describe("planProfileStack", () => {
  it("a single species alone keeps its solo geometry", () => {
    const p = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["LIVING"] });
    expect(p.lanes.LIVING).toEqual(soloLane(W));
    expect(p.stacked).toBe(false);
  });

  it("NO TWO LANES EVER SHARE A COLUMN — with fixed VP lanes and every species on", () => {
    for (const fixed of [0, 1, 2, 3]) {
      const p = planProfileStack({
        canvasWidth: W, axisWidth: AX, fixedLanes: fixed, order: ["LIVING", "COMPOSITE", "VISIBLE_RANGE"],
      });
      const ls = Object.values(p.lanes).filter(l => l!.fits) as { right: number; width: number }[];
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
        expect(overlaps(ls[i], ls[j])).toBe(false);
      }
      expect(p.stacked).toBe(true);
    }
  });

  it("the stack's left edge is the leftmost lane, and labels print left of it", () => {
    const p = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["LIVING", "COMPOSITE"] });
    const c = p.lanes.COMPOSITE!;
    expect(p.stackLeft).toBe(Math.round(c.right - c.width));
    expect(p.labelRight).toBeLessThan(p.stackLeft);
  });

  it("innermost first: LIVING sits right of COMPOSITE", () => {
    const p = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["LIVING", "COMPOSITE"] });
    expect(p.lanes.LIVING!.right).toBeGreaterThan(p.lanes.COMPOSITE!.right);
  });

  it("a species with fixed lanes present never takes solo geometry", () => {
    const p = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 2, order: ["LIVING"] });
    expect(p.lanes.LIVING).not.toEqual(soloLane(W));
    expect(p.stacked).toBe(true);
  });

  it("P110 · the Living body takes its room: no neighbour lane sits under it", () => {
    for (const fixed of [0, 2]) {
      const p = planProfileStack({
        canvasWidth: W, axisWidth: AX, fixedLanes: fixed, order: ["LIVING", "COMPOSITE", "VISIBLE_RANGE"], livingBodyTarget: 300,
      });
      const lv = p.lanes.LIVING!;
      const body = { right: lv.right, width: p.livingBodyWidth! };
      expect(p.livingBodyWidth!).toBeGreaterThan(lv.width);
      for (const sp of ["COMPOSITE", "VISIBLE_RANGE"] as const) {
        const l = p.lanes[sp]!;
        if (l.fits) expect(overlaps(body, l)).toBe(false);
      }
      // The stack's left edge includes the body's reach; labels print left of it.
      expect(p.stackLeft).toBeLessThanOrEqual(Math.round(lv.right - p.livingBodyWidth!));
      expect(p.labelRight).toBeLessThan(p.stackLeft);
    }
  });

  it("the body is never narrower than its lane, never into the left 140px, null without Living", () => {
    const small = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["LIVING"], livingBodyTarget: 10 });
    expect(small.livingBodyWidth).toBe(small.lanes.LIVING!.width);
    const huge = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["LIVING"], livingBodyTarget: 5000 });
    expect(huge.lanes.LIVING!.right - huge.livingBodyWidth!).toBeGreaterThanOrEqual(140);
    const none = planProfileStack({ canvasWidth: W, axisWidth: AX, fixedLanes: 0, order: ["COMPOSITE"] });
    expect(none.livingBodyWidth).toBeNull();
  });
});
