import { describe, expect, it } from "vitest";

import { selectAbsorptionAnatomy, type AnatomyBarInput } from "@/lib/marketData/selectAbsorptionAnatomy";
import {
  anatomyReadingDrawn,
  anatomyReadingKey,
  anatomyTargetId,
  markTarget,
  padHitRect,
  pickAnatomyHit,
  selectAnatomyInspect,
  zoneTarget,
  type AnatomyHit,
} from "./anatomySelection";
import selectExhaustion, { MAX_MARKS } from "./selectExhaustion";

/* Resolved against the REAL owners over fixture bars — the resolver must agree
   with what the glass draws, and the glass draws these selectors' output. */
const frame = (input: AnatomyBarInput[], capped = false) => {
  const anatomy = selectAbsorptionAnatomy(input, { windowBars: input.length });
  return { anatomy, ex: selectExhaustion(anatomy), capped };
};
const bar = (t: number, open: number, close: number, volume: number): AnatomyBarInput =>
  ({ time: t, open, close, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, volume });

// ── ABSORPTION fixture: bars 120 and 180 carry the effort and barely move.
const b0 = bar(0, 100, 101, 100);
const b1 = bar(60, 101, 103, 100);
const b2 = bar(120, 103, 103.1, 1000);
const b3 = bar(180, 103.1, 103.2, 900);
const b4quiet = bar(240, 103, 105, 100);
const b4absorbing = bar(240, 103.2, 103.3, 800);
const b5 = bar(300, 103.3, 105.3, 100);

describe("selectAnatomyInspect · ABSORPTION", () => {
  const f = frame([b0, b1, b2, b3, b4quiet]);
  const zone = f.anatomy.zones[0]!;
  const target = zoneTarget(zone);

  it("the fixture draws one zone on bars 120–180", () => {
    expect(f.anatomy.zones).toHaveLength(1);
    expect([zone.startTime, zone.endTime]).toEqual([120, 180]);
    expect(anatomyTargetId(target)).toBe("abs:120");
  });

  it("the same zone drawn → SAME, with its own bars and the card's four metrics", () => {
    const vm = selectAnatomyInspect(target, f.anatomy, f.ex, f.capped);
    expect(vm.state).toBe("SAME");
    expect(vm.currentId).toBe("abs:120");
    expect(vm.zone).toBe(zone);
    expect(vm.bars.map(b => b.time)).toEqual([120, 180]);
    expect(vm.card?.kind).toBe("ABSORPTION");
    expect(vm.card?.metrics.map(m => m.label)).toEqual(["EFFORT LEVEL", "DISPLACEMENT", "EFFICIENCY RATIO", "ENERGY TRANSFER"]);
    expect(vm.window).toEqual({ basis: "VOLUME", bars: 5, from: 0, to: 240, capped: false });
    expect(anatomyReadingDrawn(vm)).toBe(true);
  });

  it("the run grows by one bar → RESHAPED onto the longer run, not lost", () => {
    const g = frame([b0, b1, b2, b3, b4absorbing, b5]);
    expect(g.anatomy.zones.map(z => [z.startTime, z.endTime])).toEqual([[120, 240]]);
    const vm = selectAnatomyInspect(target, g.anatomy, g.ex, false);
    expect(vm.state).toBe("RESHAPED");
    expect(vm.zone?.endTime).toBe(240);
    expect(vm.bars.map(b => b.time)).toEqual([120, 180, 240]);
    expect(vm.id).toBe("abs:120");
  });

  it("a window with a bigger bar renormalises it away while its bars are in view → NOT_GRADED, never OUT_OF_VIEW", () => {
    const g = frame([bar(-60, 99, 101, 5000), b0, b1, b2, b3, b4quiet]);
    expect(g.anatomy.zones).toEqual([]);
    const vm = selectAnatomyInspect(target, g.anatomy, g.ex, false);
    expect(vm.state).toBe("NOT_GRADED_IN_WINDOW");
    expect(vm.currentId).toBeNull();
    expect(vm.card).toBeNull();
    // The bars are carried as this window grades them now.
    expect(vm.bars.map(b => b.time)).toEqual([120, 180]);
    expect(vm.bars[0]!.effortNorm).toBeCloseTo(1000 / 5000, 12);
    expect(anatomyReadingDrawn(vm)).toBe(false);
  });

  it("a window wholly to the right of its span → OUT_OF_VIEW", () => {
    const g = frame([b4quiet, b5, bar(360, 105.3, 106, 200), bar(420, 106, 107, 300)]);
    const vm = selectAnatomyInspect(target, g.anatomy, g.ex, false);
    expect(vm.state).toBe("OUT_OF_VIEW");
    expect(vm.bars).toEqual([]);
  });

  it("no volume and no split → UNMEASURED, nothing current", () => {
    const g = frame([b0, b1, b2].map(b => ({ ...b, volume: 0 })));
    const vm = selectAnatomyInspect(target, g.anatomy, g.ex, false);
    expect(vm.state).toBe("UNMEASURED");
    expect(vm.window.basis).toBe("UNMEASURED");
  });
});

// ── EXHAUSTION fixture: repeated cycles of a fading 4-bar up-push (range 1,
// travel 9 = 9 median ranges) and three stalling bars that never out-reach it.
function cycles(n: number): AnatomyBarInput[] {
  const out: AnatomyBarInput[] = [bar(0, 101, 100, 100)];
  let t = 60, c = 100;
  for (let k = 0; k < n; k++) {
    for (const [step, vol] of [[2, 1000], [2, 900], [2, 300], [2, 200]] as const) {
      c += step; out.push({ time: t, open: c - 1, close: c, high: c + 0.5, low: c - 0.5, volume: vol }); t += 60;
    }
    for (let j = 0; j < 3; j++) {
      c -= 1; out.push({ time: t, open: c + 1, close: c, high: c + 0.5, low: c - 0.5, volume: 100 }); t += 60;
    }
  }
  return out;
}

describe("selectAnatomyInspect · EXHAUSTION", () => {
  const three = frame(cycles(3));
  const first = three.ex.marks[0]!;
  const target = markTarget(first);

  it("the fixture draws a mark per cycle", () => {
    expect(three.ex.marks).toHaveLength(3);
    expect(anatomyTargetId(target)).toBe(`exh:UP:${first.time}`);
  });

  it("the same mark drawn → SAME, carrying the owner's reading and an EXHAUSTED card", () => {
    const vm = selectAnatomyInspect(target, three.anatomy, three.ex, false);
    expect(vm.state).toBe("SAME");
    expect(vm.push).toEqual(first);
    expect(vm.card?.outcome).toBe("EXHAUSTED");
    expect(vm.bars.map(b => b.time)).toEqual([first.pushStartTime, 120, 180, first.pushEndTime]);
  });

  it("a fourth exhausted push evicts the oldest mark while it is in view → NOT_GRADED, its push still carried as exhausted", () => {
    const four = frame(cycles(4));
    expect(four.ex.marks).toHaveLength(MAX_MARKS);
    expect(four.ex.marks.some(m => m.time === first.time)).toBe(false);
    const vm = selectAnatomyInspect(target, four.anatomy, four.ex, false);
    expect(vm.state).toBe("NOT_GRADED_IN_WINDOW");
    expect(vm.currentId).toBeNull();
    expect(vm.push?.time).toBe(first.time);
    expect(vm.push?.exhausted).toBe(true);
  });

  it("follow-through bars cut off by the camera → the push is carried as a PENDING near miss", () => {
    // The window ends one bar after the first push: follow-through cannot be graded.
    const cut = frame(cycles(1).slice(0, 6));
    const vm = selectAnatomyInspect(target, cut.anatomy, cut.ex, false);
    expect(vm.state).toBe("NOT_GRADED_IN_WINDOW");
    expect(vm.push?.followThrough).toBeNull();
    expect(vm.card?.outcome).toMatch(/^NOT EXHAUSTED/);
    expect(vm.card?.metrics[2]).toMatchObject({ word: "PENDING" });
  });

  it("a window after the push → OUT_OF_VIEW", () => {
    const later = frame(cycles(3).slice(8));
    expect(selectAnatomyInspect(target, later.anatomy, later.ex, false).state).toBe("OUT_OF_VIEW");
  });
});

describe("the frame loop's change detector", () => {
  it("equal readings give equal keys; a moved window changes the key", () => {
    const f = frame([b0, b1, b2, b3, b4quiet]);
    const t = zoneTarget(f.anatomy.zones[0]!);
    const a = selectAnatomyInspect(t, f.anatomy, f.ex, false);
    expect(anatomyReadingKey(a)).toBe(anatomyReadingKey(selectAnatomyInspect(t, f.anatomy, f.ex, false)));
    expect(anatomyReadingKey(a)).not.toBe(anatomyReadingKey(selectAnatomyInspect(t, f.anatomy, f.ex, true)));
    expect(anatomyReadingKey(null)).toBe("");
  });
});

describe("pickAnatomyHit — what the glass painted, topmost first", () => {
  const shelf: AnatomyHit = { target: { reading: "ABSORPTION", startTime: 1, endTime: 2 }, rects: [{ x: 0, y: 0, w: 100, h: 40 }] };
  const smallShelf: AnatomyHit = { target: { reading: "ABSORPTION", startTime: 3, endTime: 4 }, rects: [{ x: 10, y: 10, w: 20, h: 10 }] };
  const mark: AnatomyHit = {
    target: { reading: "EXHAUSTION", direction: "UP", time: 5, startTime: 3, endTime: 5 },
    // Its body is LARGER than the shelf's: it wins by paint order, not by size.
    rects: [{ x: 50, y: 0, w: 80, h: 80 }, { x: 200, y: 200, w: 60, h: 14 }],
  };

  it("a mark wins over a shelf where they overlap (painted later)", () => {
    expect(pickAnatomyHit([shelf, mark], 60, 10)).toBe(mark);
    expect(pickAnatomyHit([mark, shelf], 60, 10)).toBe(mark);
  });

  it("among shelves the smaller body wins; a chip rect selects its own object", () => {
    expect(pickAnatomyHit([shelf, smallShelf], 15, 15)).toBe(smallShelf);
    expect(pickAnatomyHit([shelf, mark], 210, 205)).toBe(mark);
  });

  it("a click on nothing drawn is no hit, and falls through", () => {
    expect(pickAnatomyHit([shelf, mark], 500, 500)).toBeNull();
    expect(pickAnatomyHit([], 1, 1)).toBeNull();
  });

  it("a thin shelf is padded to a finger-sized target around its own centre", () => {
    expect(padHitRect({ x: 100, y: 50, w: 40, h: 2 })).toEqual({ x: 100, y: 37, w: 40, h: 28 });
    expect(padHitRect({ x: 0, y: 0, w: 60, h: 40 })).toEqual({ x: 0, y: 0, w: 60, h: 40 });
  });
});
