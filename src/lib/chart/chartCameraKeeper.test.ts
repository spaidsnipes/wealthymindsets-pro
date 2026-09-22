import { beforeEach, describe, expect, it, vi } from "vitest";
import { openChartCameraKeeper, type CameraChartHandle, type CameraResizeOutcome } from "./chartCameraKeeper";
import type { ChartLogicalRange } from "./chartCameraOnResize";

/**
 * This suite runs the keeper against a MODEL of lightweight-charts 5.2.0 whose
 * two hostile behaviours are copied straight out of the shipped bundle:
 *
 *   1. On a width change the scale re-fits SYNCHRONOUSLY, inside the resize
 *      notification, keeping bar spacing and sliding the left edge
 *      (`TimeScale._internal_setWidth`, dist ~6097, with
 *      `lockVisibleTimeRangeOnResize: false`).
 *   2. `setVisibleLogicalRange` does NOT apply. It queues, and the widget
 *      drains the queue on a later animation frame
 *      (`_internal_setTargetLogicalRange` → `_private__invalidateHandler`,
 *      dist ~7184 / ~11114).
 *
 * Both are reproduced here because both are how a naive implementation passes
 * its own tests and still jumps in production. The `keeps the same NUMBER of
 * bars` positive control below proves the model actually misbehaves — a fake
 * that never moved the camera would let a keeper that does nothing look green.
 */

interface FakeObserverRecord {
  cb: (entries: ResizeObserverEntry[]) => void;
  target: Element | null;
  live: boolean;
}

interface FakeResizeObserverRegistry {
  readonly ctor: typeof ResizeObserver;
  /** A third-party observer slotted between ours, standing in for the library's. */
  insertLibraryObserver(cb: () => void): void;
  broadcast(target: Element, width: number): void;
}

/** Notifies observers in CONSTRUCTION order, as the ResizeObserver spec requires. */
function makeResizeObserverRegistry(): FakeResizeObserverRegistry {
  const observers: FakeObserverRecord[] = [];

  class FakeResizeObserver {
    private record: FakeObserverRecord;
    constructor(cb: (entries: ResizeObserverEntry[]) => void) {
      this.record = { cb, target: null, live: false };
      observers.push(this.record);
    }
    observe(target: Element) {
      this.record.target = target;
      this.record.live = true;
    }
    disconnect() {
      this.record.live = false;
    }
    unobserve() {
      this.record.live = false;
    }
  }

  return {
    ctor: FakeResizeObserver as unknown as typeof ResizeObserver,
    insertLibraryObserver(cb) {
      observers.push({ cb: cb as unknown as FakeObserverRecord["cb"], target: null, live: true });
    },
    broadcast(target, width) {
      const entries = [{ contentRect: { width } }] as unknown as ResizeObserverEntry[];
      for (const o of [...observers]) {
        if (!o.live) continue;
        if (o.target !== null && o.target !== target) continue;
        o.cb(entries);
      }
    },
  };
}

/** A time scale that behaves like the real one, badly, on purpose. */
class FakeChart implements CameraChartHandle {
  width: number;
  barSpacing: number;
  bars: number;
  /** rightOffset = how far the right edge sits past the last bar, in bars. */
  rightOffset: number;
  private queued: ChartLogicalRange | null = null;

  constructor(opts: { width: number; barSpacing: number; bars: number; rightOffset: number }) {
    this.width = opts.width;
    this.barSpacing = opts.barSpacing;
    this.bars = opts.bars;
    this.rightOffset = opts.rightOffset;
  }

  getVisibleLogicalRange(): ChartLogicalRange {
    const right = this.rightOffset + (this.bars - 1);
    const left = right - this.width / this.barSpacing + 1;
    return { from: left, to: right };
  }

  setVisibleLogicalRange(range: ChartLogicalRange) {
    // QUEUED, not applied. This is the trap.
    this.queued = range;
  }

  /** The widget's animation frame draining the invalidation queue. */
  drainFrame() {
    if (!this.queued) return;
    const { from, to } = this.queued;
    this.queued = null;
    this.barSpacing = this.width / (to - from + 1);
    this.rightOffset = to - (this.bars - 1);
  }

  /** The library's own synchronous re-fit inside its resize observer callback. */
  applyWidth(next: number) {
    this.width = next; // bar spacing untouched → visible span changes
  }

  barSpacingBounds() {
    return { minBarSpacing: 2, maxBarSpacing: 0 };
  }

  barCount() {
    return this.bars;
  }
}

const container = {
  getBoundingClientRect: () => ({ width: 1200 }) as DOMRect,
} as unknown as Element;

describe("openChartCameraKeeper — the ordering is the whole problem", () => {
  let registry: FakeResizeObserverRegistry;
  let chart: FakeChart;
  let frames: Array<() => void>;
  let outcomes: CameraResizeOutcome[];

  const runFrames = (n: number) => {
    for (let i = 0; i < n; i++) {
      const due = frames;
      frames = [];
      // The widget's own draw frame runs alongside ours.
      chart.drainFrame();
      for (const f of due) f();
    }
  };

  const open = () => {
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: registry.ctor,
      requestFrame: (cb) => frames.push(cb),
      onOutcome: (o) => outcomes.push(o),
    });
    // The library's observer is constructed BETWEEN ours, exactly as it is when
    // `createChart()` sits between `openChartCameraKeeper()` and `attach()`.
    registry.insertLibraryObserver(() => chart.applyWidth(nextWidth));
    keeper.attach(chart);
    return keeper;
  };

  let nextWidth = 800;

  beforeEach(() => {
    registry = makeResizeObserverRegistry();
    chart = new FakeChart({ width: 1200, barSpacing: 12, bars: 500, rightOffset: 5 });
    frames = [];
    outcomes = [];
    nextWidth = 800;
  });

  it("POSITIVE CONTROL: without the keeper the model really does move the camera", () => {
    const before = chart.getVisibleLogicalRange();
    chart.applyWidth(800);
    const after = chart.getVisibleLogicalRange();
    expect(after.to).toBe(before.to); // right edge pinned
    expect(after.from).toBeGreaterThan(before.from); // left edge slid — the jump
    expect(after.to - after.from).toBeLessThan(before.to - before.from);
  });

  it("holds the same bars on screen across a narrowing width change", () => {
    open();
    const before = chart.getVisibleLogicalRange();

    registry.broadcast(container, 800);
    runFrames(3);

    const after = chart.getVisibleLogicalRange();
    expect(after.from).toBeCloseTo(before.from, 6);
    expect(after.to).toBeCloseTo(before.to, 6);
    expect(chart.width).toBe(800);
    // The same bars in a narrower column means narrower bars. That is the
    // honest consequence, and it is what makes the restore real.
    expect(chart.barSpacing).toBeLessThan(12);
  });

  it("holds the same bars across a widening change too", () => {
    open();
    const before = chart.getVisibleLogicalRange();

    nextWidth = 1600;
    registry.broadcast(container, 1600);
    runFrames(3);

    const after = chart.getVisibleLogicalRange();
    expect(after.from).toBeCloseTo(before.from, 6);
    expect(after.to).toBeCloseTo(before.to, 6);
  });

  it("reports preserved ONLY after reading the range back off the chart", () => {
    open();
    registry.broadcast(container, 800);

    // The setter has been called but the widget has not drained it yet, and the
    // keeper has published nothing. An implementation that trusted the setter
    // would already be claiming success here.
    expect(outcomes).toHaveLength(0);

    runFrames(3);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].preserved).toBe(true);
    expect(outcomes[0].requested).toEqual(outcomes[0].plan.action === "restore" ? outcomes[0].plan.range : null);
    expect(outcomes[0].fromWidth).toBe(1200);
    expect(outcomes[0].toWidth).toBe(800);
  });

  it("does not report preserved when the chart failed to honour the range", () => {
    open();
    // The widget never drains — the queued range is simply dropped.
    chart.drainFrame = () => {};
    registry.broadcast(container, 800);
    runFrames(3);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].preserved).toBe(false);
    expect(outcomes[0].achieved).not.toEqual(outcomes[0].requested);
  });

  it("captures the camera BEFORE the library re-fits, not after", () => {
    open();
    const trueBefore = chart.getVisibleLogicalRange();
    registry.broadcast(container, 800);
    runFrames(3);

    // If the capture had run after the library's observer it would have grabbed
    // the already-slid range, and the restored `from` would match the post-fit
    // value instead of the trader's actual view.
    const postFitFromIfCapturedLate = trueBefore.to - 800 / 12 + 1;
    expect(outcomes[0].requested?.from).toBeCloseTo(trueBefore.from, 6);
    expect(outcomes[0].requested?.from).not.toBeCloseTo(postFitFromIfCapturedLate, 3);
  });
});

describe("openChartCameraKeeper — the quiet cases", () => {
  let registry: FakeResizeObserverRegistry;
  let frames: Array<() => void>;
  let outcomes: CameraResizeOutcome[];

  beforeEach(() => {
    registry = makeResizeObserverRegistry();
    frames = [];
    outcomes = [];
  });

  it("says nothing at all on a height-only resize", () => {
    const chart = new FakeChart({ width: 1200, barSpacing: 12, bars: 500, rightOffset: 5 });
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: registry.ctor,
      requestFrame: (cb) => frames.push(cb),
      onOutcome: (o) => outcomes.push(o),
    });
    keeper.attach(chart);
    const before = chart.getVisibleLogicalRange();

    registry.broadcast(container, 1200);
    for (let i = 0; i < 3; i++) {
      const due = frames;
      frames = [];
      for (const f of due) f();
    }

    expect(outcomes).toHaveLength(0);
    expect(chart.getVisibleLogicalRange()).toEqual(before);
  });

  it("stands down — and leaves the chart untouched — when the camera cannot be held honestly", () => {
    // 100 visible bars squeezed into a 150px column needs ~1.5px/bar against a
    // 2px floor. The restore would be clamped into a range that is not the
    // trader's, so no setter call is made at all.
    const chart = new FakeChart({ width: 1200, barSpacing: 12, bars: 500, rightOffset: 5 });
    const spy = vi.spyOn(chart, "setVisibleLogicalRange");
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: registry.ctor,
      requestFrame: (cb) => frames.push(cb),
      onOutcome: (o) => outcomes.push(o),
    });
    registry.insertLibraryObserver(() => chart.applyWidth(150));
    keeper.attach(chart);

    registry.broadcast(container, 150);

    expect(spy).not.toHaveBeenCalled();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].preserved).toBe(false);
    expect(outcomes[0].requested).toBeNull();
    expect(outcomes[0].plan).toMatchObject({
      action: "stand-down",
      reason: "wider-than-the-scale-allows",
    });
  });

  it("stands down when bars arrived while the panel was opening", () => {
    const chart = new FakeChart({ width: 1200, barSpacing: 12, bars: 500, rightOffset: 5 });
    const spy = vi.spyOn(chart, "setVisibleLogicalRange");
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: registry.ctor,
      requestFrame: (cb) => frames.push(cb),
      onOutcome: (o) => outcomes.push(o),
    });
    registry.insertLibraryObserver(() => {
      chart.applyWidth(800);
      chart.bars += 1; // a live bar closed mid-reflow
    });
    keeper.attach(chart);

    registry.broadcast(container, 800);

    expect(spy).not.toHaveBeenCalled();
    expect(outcomes[0].plan).toMatchObject({ reason: "series-changed" });
    expect(outcomes[0].preserved).toBe(false);
  });

  it("goes inert, without throwing, where there is no ResizeObserver", () => {
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: undefined as unknown as typeof ResizeObserver,
    });
    expect(() => keeper.attach(new FakeChart({ width: 1, barSpacing: 1, bars: 2, rightOffset: 0 }))).not.toThrow();
    expect(keeper.lastOutcome()).toBeNull();
    expect(() => keeper.dispose()).not.toThrow();
  });

  it("stops touching the chart once disposed", () => {
    const chart = new FakeChart({ width: 1200, barSpacing: 12, bars: 500, rightOffset: 5 });
    const spy = vi.spyOn(chart, "setVisibleLogicalRange");
    const keeper = openChartCameraKeeper(container, {
      ResizeObserverCtor: registry.ctor,
      requestFrame: (cb) => frames.push(cb),
      onOutcome: (o) => outcomes.push(o),
    });
    registry.insertLibraryObserver(() => chart.applyWidth(800));
    keeper.attach(chart);
    keeper.dispose();

    registry.broadcast(container, 800);
    expect(spy).not.toHaveBeenCalled();
    expect(outcomes).toHaveLength(0);
  });
});
