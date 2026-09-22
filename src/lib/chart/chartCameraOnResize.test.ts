import { describe, expect, it } from "vitest";
import {
  cameraRestoreLanded,
  LWC_MIN_VISIBLE_BARS,
  planCameraRestore,
  type CameraResizeInput,
} from "./chartCameraOnResize";

/**
 * The scenario under test throughout: a trader is zoomed into bars 300–400 on a
 * 1200px chart and opens the equipment panel, which reflows the chart to 800px.
 */
const base: CameraResizeInput = {
  priorRange: { from: 300, to: 400 },
  priorWidth: 1200,
  nextWidth: 800,
  priorBarCount: 500,
  nextBarCount: 500,
  minBarSpacing: 2,
  maxBarSpacing: 0,
};

const input = (over: Partial<CameraResizeInput> = {}): CameraResizeInput => ({ ...base, ...over });

describe("planCameraRestore — the camera is carried across the width change", () => {
  it("restores the EXACT same bar indices, not a re-derived approximation", () => {
    const plan = planCameraRestore(input());
    expect(plan.action).toBe("restore");
    if (plan.action !== "restore") return;
    expect(plan.range).toEqual({ from: 300, to: 400 });
  });

  it("reports the narrower bar spacing the same bars now require", () => {
    const plan = planCameraRestore(input());
    if (plan.action !== "restore") throw new Error("expected a restore");
    // 101 slots (300..400 inclusive) across 800px.
    expect(plan.barSpacing).toBeCloseTo(800 / 101, 10);
    // And it really is tighter than before the panel opened.
    expect(plan.barSpacing).toBeLessThan(1200 / 101);
  });

  it("works in the widening direction too — closing the panel must not jump either", () => {
    const plan = planCameraRestore(input({ priorWidth: 800, nextWidth: 1200 }));
    if (plan.action !== "restore") throw new Error("expected a restore");
    expect(plan.range).toEqual({ from: 300, to: 400 });
    expect(plan.barSpacing).toBeCloseTo(1200 / 101, 10);
  });

  it("carries a fractional range verbatim — logical indices are fractional by design", () => {
    const plan = planCameraRestore(input({ priorRange: { from: 300.37, to: 400.91 } }));
    if (plan.action !== "restore") throw new Error("expected a restore");
    expect(plan.range).toEqual({ from: 300.37, to: 400.91 });
  });

  it("preserves a view that legitimately overhangs the newest bar (rightOffset whitespace)", () => {
    // 500 bars, base index 499, and the trader is parked with ~5 bars of
    // whitespace on the right — the chart's own default. That is a real camera
    // and it must survive.
    const plan = planCameraRestore(input({ priorRange: { from: 404, to: 504 } }));
    expect(plan.action).toBe("restore");
  });
});

describe("planCameraRestore — the no-ops, which fire far more often than the real case", () => {
  it("stands down when only the height changed", () => {
    const plan = planCameraRestore(input({ nextWidth: 1200 }));
    expect(plan).toMatchObject({ action: "stand-down", reason: "width-unchanged" });
  });

  it("stands down on a zero or non-finite width rather than dividing by it", () => {
    for (const w of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(planCameraRestore(input({ nextWidth: w }))).toMatchObject({
        reason: "width-unmeasurable",
      });
      expect(planCameraRestore(input({ priorWidth: w }))).toMatchObject({
        reason: "width-unmeasurable",
      });
    }
  });

  it("stands down when there was no before-picture to carry", () => {
    for (const r of [null, undefined, { from: Number.NaN, to: 400 }, { from: 400, to: 400 }, { from: 400, to: 300 }]) {
      expect(planCameraRestore(input({ priorRange: r as never }))).toMatchObject({
        reason: "no-prior-camera",
      });
    }
  });
});

describe("planCameraRestore — refuses to lie about what is on screen", () => {
  it("stands down when bars arrived mid-resize, because index 300 is no longer bar 300", () => {
    const plan = planCameraRestore(input({ nextBarCount: 501 }));
    expect(plan).toMatchObject({ action: "stand-down", reason: "series-changed" });
    if (plan.action !== "stand-down") return;
    expect(plan.spoken).toMatch(/different stretch of the market/i);
  });

  it("stands down when holding the bars would need spacing below minBarSpacing", () => {
    // 101 slots into a 120px column needs ~1.19px/bar; the scale's floor is 2px.
    // The library would clamp and show a DIFFERENT range with no error.
    const plan = planCameraRestore(input({ nextWidth: 120, minBarSpacing: 2 }));
    expect(plan).toMatchObject({
      action: "stand-down",
      reason: "wider-than-the-scale-allows",
    });
  });

  it("does NOT stand down when the needed spacing is exactly minBarSpacing", () => {
    // The clamp is `< min`, not `<= min`; a plan that refused at the boundary
    // would give up a camera the scale can actually hold.
    const plan = planCameraRestore(input({ nextWidth: 202, minBarSpacing: 2 }));
    expect(plan.action).toBe("restore");
  });

  it("stands down when holding the bars would need spacing above the implied maxBarSpacing", () => {
    // maxBarSpacing defaults to half the pane. Under two slots is the only way
    // to exceed it, so a one-slot-ish camera cannot be held.
    const plan = planCameraRestore(input({ priorRange: { from: 300, to: 300.5 }, minBarSpacing: 0 }));
    expect(plan).toMatchObject({ reason: "tighter-than-the-scale-allows" });
  });

  it("honours an explicit maxBarSpacing over the half-width default", () => {
    const plan = planCameraRestore(
      input({ priorRange: { from: 300, to: 320 }, nextWidth: 800, maxBarSpacing: 10 }),
    );
    // 21 slots across 800px = 38px/bar, far above the stated 10px ceiling.
    expect(plan).toMatchObject({ reason: "tighter-than-the-scale-allows" });
  });

  it("stands down when the view sits further into the future than the scale will go", () => {
    // maxRightOffset = slots - 2. With 101 slots that is 99, so `to` may reach
    // baseIndex + 99 = 598. One past that is out of reach.
    expect(planCameraRestore(input({ priorRange: { from: 498, to: 598 } })).action).toBe("restore");
    expect(planCameraRestore(input({ priorRange: { from: 499, to: 599 } }))).toMatchObject({
      reason: "scrolled-past-the-last-bar",
    });
  });

  it("stands down when the view sits further into the past than the scale will go", () => {
    // minRightOffset = -(baseIndex) - 1 + 2, so `to` may fall to 1. Below that
    // fewer than two bars remain on screen and the library re-points the view.
    expect(planCameraRestore(input({ priorRange: { from: -99, to: 1 } })).action).toBe("restore");
    expect(planCameraRestore(input({ priorRange: { from: -100, to: 0 } }))).toMatchObject({
      reason: "scrolled-past-the-first-bar",
    });
  });

  it("stands down when the series is shorter than the scale's minimum visible bars", () => {
    const plan = planCameraRestore(
      input({ priorBarCount: 1, nextBarCount: 1, priorRange: { from: 0, to: 0.5 } }),
    );
    expect(plan).toMatchObject({ reason: "series-too-short" });
    expect(LWC_MIN_VISIBLE_BARS).toBe(2);
  });

  it("every stand-down speaks in plain words and never claims the view was held", () => {
    const refusals = [
      planCameraRestore(input({ nextWidth: 0 })),
      planCameraRestore(input({ nextWidth: 1200 })),
      planCameraRestore(input({ priorRange: null })),
      planCameraRestore(input({ nextBarCount: 501 })),
      planCameraRestore(input({ nextWidth: 120 })),
      planCameraRestore(input({ priorRange: { from: 499, to: 599 } })),
    ];
    for (const r of refusals) {
      expect(r.action).toBe("stand-down");
      if (r.action !== "stand-down") continue;
      expect(r.spoken.length).toBeGreaterThan(20);
      expect(r.spoken).not.toMatch(/preserved|restored your view/i);
      expect(r).not.toHaveProperty("range");
    }
  });
});

describe("cameraRestoreLanded — the measurement, not the intention", () => {
  const want = { from: 300, to: 400 };

  it("is true only when the same bars really came back", () => {
    expect(cameraRestoreLanded(want, { from: 300, to: 400 })).toBe(true);
    expect(cameraRestoreLanded(want, { from: 300.005, to: 399.995 })).toBe(true);
  });

  it("is false when the library clamped the range into something else", () => {
    expect(cameraRestoreLanded(want, { from: 320, to: 400 })).toBe(false);
    expect(cameraRestoreLanded(want, { from: 300, to: 380 })).toBe(false);
  });

  it("is false — never optimistically true — when nothing could be read back", () => {
    expect(cameraRestoreLanded(want, null)).toBe(false);
    expect(cameraRestoreLanded(want, undefined)).toBe(false);
    expect(cameraRestoreLanded(want, { from: Number.NaN, to: 400 })).toBe(false);
  });
});
