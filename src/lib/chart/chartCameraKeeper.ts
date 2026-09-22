import {
  cameraRestoreLanded,
  planCameraRestore,
  type CameraResizePlan,
  type ChartLogicalRange,
} from "./chartCameraOnResize";

/**
 * THE ORDERING PROBLEM, AND THE ONLY DETERMINISTIC ANSWER TO IT.
 *
 * `chartCameraOnResize.ts` decides WHAT range to restore. This file solves the
 * part that actually made the atom hard: WHEN.
 *
 * ── Why a timer, a rAF, or a React effect all fail ───────────────────────────
 *
 * In lightweight-charts 5.2.0 with `autoSize: true`, the library installs its
 * OWN `ResizeObserver` on the same container (`_private__installObserver`, dist
 * ~11258) and, inside that callback, calls `_internal_resize(w, h, true)`. The
 * `true` is `forceRepaint`: the new width is written to the time scale AND the
 * chart is repainted SYNCHRONOUSLY, inside the observer callback, cancelling any
 * pending animation frame on the way through (dist ~10703).
 *
 * So the library's re-fit does not happen "some time after the resize". It
 * happens at one exact point in the resize-notification loop. Anything that
 * guesses — a `setTimeout(0)`, a single `requestAnimationFrame`, a React layout
 * effect — is racing a synchronous operation, and a restore issued before that
 * point is silently overwritten with no error. That race is the whole defect.
 *
 * ── The answer: register OUR observers around theirs ─────────────────────────
 *
 * The ResizeObserver spec's "broadcast active observations" step notifies
 * observers IN THE ORDER THEY WERE CONSTRUCTED. That is not an implementation
 * detail to lean on nervously; it is the ordering primitive this problem needs.
 * So this keeper builds TWO observers on the same element and sandwiches the
 * library's:
 *
 *   1. BEFORE  `createChart()` → the CAPTURE observer. Constructed first, so it
 *      is notified first, while the time scale still holds the OLD width. It
 *      reads the visible logical range: the true before-picture.
 *   2. The library's own observer runs second and applies the new width
 *      synchronously, re-fitting the view.
 *   3. AFTER   `createChart()` → the RESTORE observer. Constructed last, so it
 *      is notified last, with the re-fit already complete and nothing left to
 *      overwrite what it does.
 *
 * This is why `openChartCameraKeeper()` must be called BEFORE `LW.createChart`
 * and `attach()` immediately AFTER it. The call sites are not interchangeable
 * and the constructor says so out loud rather than leaving a future editor to
 * discover it by shipping a jump.
 *
 * ── And then it is MEASURED, not assumed ─────────────────────────────────────
 *
 * Even with the ordering right, `setVisibleLogicalRange` does not apply
 * immediately — it queues a time-scale invalidation the widget drains on a later
 * animation frame. So the keeper does not report success when it calls the
 * setter. It waits for frames to pass, reads the range BACK off the chart, and
 * compares. `outcome.preserved` is a measurement of what is on screen, not a
 * record of an intention.
 *
 * When the camera could NOT be held, the keeper does not half-restore. It
 * leaves the library's own honest result alone and reports the reason in words.
 * A bent camera and a preserved one look the same; only one of them can say
 * which it is.
 */

/**
 * The narrow slice of `IChartApi` this keeper needs. Narrow on purpose: the
 * keeper is then testable against a fake that mimics the library's DEFERRED
 * apply, which is the behaviour that breaks naive implementations.
 */
export interface CameraChartHandle {
  getVisibleLogicalRange(): ChartLogicalRange | null;
  setVisibleLogicalRange(range: ChartLogicalRange): void;
  /** `timeScale().options()` — only the two bar-spacing bounds are read. */
  barSpacingBounds(): { minBarSpacing: number; maxBarSpacing?: number | null };
  /** How many bars the series currently holds. */
  barCount(): number;
}

export interface CameraResizeOutcome {
  /** Width the scale was settled at before this resize, CSS px. */
  readonly fromWidth: number;
  /** Width the container became, CSS px. */
  readonly toWidth: number;
  readonly plan: CameraResizePlan;
  /** The range asked for, when a restore was attempted. */
  readonly requested: ChartLogicalRange | null;
  /** The range READ BACK off the chart after the frames settled. */
  readonly achieved: ChartLogicalRange | null;
  /**
   * TRUE only when a restore was attempted AND the read-back matches it. A
   * stand-down is never reported as preserved — the trader's bars did move.
   */
  readonly preserved: boolean;
}

export interface ChartCameraKeeperOptions {
  /** Called once per width change, after the read-back settles. */
  readonly onOutcome?: (outcome: CameraResizeOutcome) => void;
  /** Injectable for tests; defaults to the global `ResizeObserver`. */
  readonly ResizeObserverCtor?: typeof ResizeObserver;
  /** Injectable for tests; defaults to `requestAnimationFrame`. */
  readonly requestFrame?: (cb: () => void) => void;
}

export interface ChartCameraKeeper {
  /** Call IMMEDIATELY after `createChart()`. Installs the restore observer. */
  attach(chart: CameraChartHandle): void;
  dispose(): void;
  /** The most recent measured outcome, or null if no width change has happened. */
  lastOutcome(): CameraResizeOutcome | null;
}

/**
 * How many animation frames to let pass before reading the range back.
 *
 * ONE frame is when the widget drains the queued invalidation and applies the
 * range. Reading on that same frame is a coin flip on callback order within the
 * frame, so the read-back waits for the frame AFTER the apply. Two is the
 * smallest number that is not a race; more would only make the measurement
 * later, not truer.
 */
const FRAMES_BEFORE_READBACK = 2;

const NO_OP_KEEPER: ChartCameraKeeper = {
  attach() {},
  dispose() {},
  lastOutcome() {
    return null;
  },
};

/**
 * MUST be called BEFORE `createChart(container, ...)` on the same container.
 * See the header: the capture observer only sees the pre-resize camera because
 * it was constructed before the library's observer.
 */
export function openChartCameraKeeper(
  container: Element,
  options: ChartCameraKeeperOptions = {},
): ChartCameraKeeper {
  const Observer =
    options.ResizeObserverCtor ??
    (typeof ResizeObserver === "undefined" ? undefined : ResizeObserver);

  // No ResizeObserver means no width notifications at all, which means no
  // width-change jump to defend against. Returning an inert keeper is honest;
  // throwing would take the chart down over a feature that has nothing to do.
  if (!Observer) return NO_OP_KEEPER;
  // Re-bound with an explicit type: the narrowing from the guard above does not
  // follow into the hoisted function declarations below.
  const ObserverCtor: typeof ResizeObserver = Observer;

  let chart: CameraChartHandle | null = null;
  let disposed = false;

  /** The width the time scale is currently settled at. Seeded at `attach()`. */
  let settledWidth = 0;

  /** The before-picture, held only between capture and restore of ONE resize. */
  let captured: {
    range: ChartLogicalRange | null;
    barCount: number;
    width: number;
  } | null = null;

  let outcome: CameraResizeOutcome | null = null;

  const requestFrame =
    options.requestFrame ??
    ((cb: () => void) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
      else cb();
    });

  const widthOf = (entries: ReadonlyArray<ResizeObserverEntry>): number | null => {
    // Last entry wins: the browser may batch several updates for one element
    // and the last is the most current. Same reasoning the library uses.
    const entry = entries[entries.length - 1];
    if (!entry) return null;
    const w = entry.contentRect?.width;
    return typeof w === "number" && Number.isFinite(w) ? w : null;
  };

  const afterFrames = (n: number, run: () => void) => {
    if (n <= 0) {
      run();
      return;
    }
    requestFrame(() => afterFrames(n - 1, run));
  };

  // ── 1. CAPTURE — constructed before the library's observer, notified first.
  const captureObserver = new ObserverCtor((entries) => {
    if (disposed || !chart) return;
    const nextWidth = widthOf(entries);
    if (nextWidth == null) return;
    // Height-only resizes fire this constantly and never move the camera.
    if (nextWidth === settledWidth) return;
    // The time scale has NOT been told about `nextWidth` yet — this read is the
    // trader's actual pre-resize view.
    let range: ChartLogicalRange | null = null;
    try {
      range = chart.getVisibleLogicalRange();
    } catch {
      range = null;
    }
    captured = { range, barCount: safeBarCount(chart), width: settledWidth };
  });
  captureObserver.observe(container, { box: "border-box" });

  function safeBarCount(c: CameraChartHandle): number {
    try {
      return c.barCount();
    } catch {
      return Number.NaN;
    }
  }

  function installRestoreObserver(): ResizeObserver {
    const restoreObserver = new ObserverCtor((entries) => {
      if (disposed || !chart) return;
      const toWidth = widthOf(entries);
      if (toWidth == null) return;
      if (toWidth === settledWidth) return;

      const before = captured;
      captured = null;
      const fromWidth = before?.width ?? settledWidth;
      settledWidth = toWidth;

      const bounds = safeBounds(chart);
      const plan = planCameraRestore({
        priorRange: before?.range ?? null,
        priorWidth: fromWidth,
        nextWidth: toWidth,
        priorBarCount: before?.barCount ?? Number.NaN,
        nextBarCount: safeBarCount(chart),
        minBarSpacing: bounds.minBarSpacing,
        maxBarSpacing: bounds.maxBarSpacing,
      });

      if (plan.action === "stand-down") {
        // Deliberately NOT calling the setter. The library's own resize result
        // stays on screen and the reason says so.
        publish({
          fromWidth,
          toWidth,
          plan,
          requested: null,
          achieved: readRange(),
          preserved: false,
        });
        return;
      }

      const requested = plan.range;
      try {
        chart.setVisibleLogicalRange(requested);
      } catch {
        publish({ fromWidth, toWidth, plan, requested, achieved: readRange(), preserved: false });
        return;
      }

      // The setter only QUEUED the range. Let the widget's frame drain it, then
      // look at what is actually on screen.
      afterFrames(FRAMES_BEFORE_READBACK, () => {
        if (disposed || !chart) return;
        const achieved = readRange();
        publish({
          fromWidth,
          toWidth,
          plan,
          requested,
          achieved,
          preserved: cameraRestoreLanded(requested, achieved),
        });
      });
    });
    restoreObserver.observe(container, { box: "border-box" });
    return restoreObserver;
  }

  function safeBounds(c: CameraChartHandle): { minBarSpacing: number; maxBarSpacing?: number | null } {
    try {
      return c.barSpacingBounds();
    } catch {
      return { minBarSpacing: 0, maxBarSpacing: null };
    }
  }

  function readRange(): ChartLogicalRange | null {
    if (!chart) return null;
    try {
      return chart.getVisibleLogicalRange();
    } catch {
      return null;
    }
  }

  function publish(next: CameraResizeOutcome) {
    outcome = next;
    try {
      options.onOutcome?.(next);
    } catch {
      /* an observer of the outcome must never break the chart */
    }
  }

  let restoreObserver: ResizeObserver | null = null;

  return {
    attach(next: CameraChartHandle) {
      if (disposed) return;
      chart = next;
      // Seed from the element itself rather than from a resize entry: the first
      // entry we ever receive would otherwise look like a change from 0 and
      // trigger a pointless stand-down on mount.
      const rect = container.getBoundingClientRect?.();
      settledWidth = rect && Number.isFinite(rect.width) ? rect.width : 0;
      if (!restoreObserver) restoreObserver = installRestoreObserver();
    },
    dispose() {
      disposed = true;
      chart = null;
      captured = null;
      try {
        captureObserver.disconnect();
      } catch {
        /* nothing to do */
      }
      try {
        restoreObserver?.disconnect();
      } catch {
        /* nothing to do */
      }
      restoreObserver = null;
    },
    lastOutcome() {
      return outcome;
    },
  };
}
