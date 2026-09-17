import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import {
  overlayFrameBudgetMs,
  overlayFrameVerdict,
  PROFILE_OVERLAY_FRAME_MS,
  shouldDrawOverlay,
  STANDARD_OVERLAY_FRAME_MS,
} from "./chartOverlayGovernor";

describe("chart overlay governor", () => {
  it("uses a stricter budget for volume-profile paint", () => {
    expect(overlayFrameBudgetMs(false)).toBe(STANDARD_OVERLAY_FRAME_MS);
    expect(overlayFrameBudgetMs(true)).toBe(PROFILE_OVERLAY_FRAME_MS);
    expect(PROFILE_OVERLAY_FRAME_MS).toBeGreaterThan(STANDARD_OVERLAY_FRAME_MS);
  });

  it("never paints in a hidden tab", () => {
    expect(shouldDrawOverlay({ hidden: true, now: 1_000, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(false);
  });

  it("coalesces frames until the budget has elapsed", () => {
    expect(shouldDrawOverlay({ hidden: false, now: 32, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(false);
    expect(shouldDrawOverlay({ hidden: false, now: 33, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(true);
  });
});

/**
 * A skipped frame is not one fact — it is three, and only two of them are a
 * problem. The boolean above cannot tell them apart, and the overlay is the
 * ONLY publisher of the VP render receipt, so "did not paint" decides whether
 * that receipt exists at all.
 */
describe("overlayFrameVerdict — a skip has a reason", () => {
  const F = { now: 1_000, lastDrawAt: 0, frameBudgetMs: 33 };

  it("draw and skipped are mutually exclusive — never both, never neither", () => {
    // If a verdict could carry a reason alongside `draw: true`, a caller acting
    // on `skipped` would stamp a suspension over a frame that just painted.
    const cases = [
      { ...F, hidden: true },
      { ...F, hidden: false },
      { hidden: false, now: 10, lastDrawAt: 0, frameBudgetMs: 33 },
      { hidden: false, now: Number.NaN, lastDrawAt: 0, frameBudgetMs: 33 },
    ];
    for (const c of cases) {
      const v = overlayFrameVerdict(c);
      expect(v.draw === (v.skipped === null), JSON.stringify(c)).toBe(true);
    }
  });

  it("HIDDEN, BUDGET and BAD_CLOCK are distinguishable", () => {
    // Collapsing them would send a reader to fix the wrong thing: BUDGET is
    // correct pacing, HIDDEN is nobody watching, BAD_CLOCK is a frozen overlay.
    expect(overlayFrameVerdict({ ...F, hidden: true }).skipped).toBe("HIDDEN");
    expect(overlayFrameVerdict({ hidden: false, now: 10, lastDrawAt: 0, frameBudgetMs: 33 }).skipped).toBe("BUDGET");
    expect(overlayFrameVerdict({ hidden: false, now: Number.NaN, lastDrawAt: 0, frameBudgetMs: 33 }).skipped).toBe("BAD_CLOCK");
    expect(overlayFrameVerdict({ ...F, hidden: false }).skipped).toBeNull();
  });

  it("a hidden tab reports HIDDEN even when its clock is also broken", () => {
    // Hiddenness is the actionable fact and outranks the clock: a caller told
    // BAD_CLOCK would go hunting a bug that is really just a backgrounded tab.
    expect(
      overlayFrameVerdict({ hidden: true, now: Number.NaN, lastDrawAt: Number.NaN, frameBudgetMs: 33 }).skipped,
    ).toBe("HIDDEN");
  });

  it("shouldDrawOverlay stays a pure projection — no second copy of the pacing math", () => {
    for (const hidden of [true, false]) {
      for (const now of [0, 32, 33, 1_000, Number.NaN, Number.POSITIVE_INFINITY]) {
        const input = { hidden, now, lastDrawAt: 0, frameBudgetMs: 33 };
        expect(shouldDrawOverlay(input), JSON.stringify(input)).toBe(overlayFrameVerdict(input).draw);
      }
    }
  });
});

/**
 * SENTINEL — the reason must be ACTED ON, not merely computed.
 *
 * `overlayFrameVerdict` could pass every test above while MainChart kept calling
 * `shouldDrawOverlay` and throwing the reason away — which is precisely the
 * compiler-with-no-caller trap this repo has hit before (see
 * `vpRenderReceipt.test.ts`).
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */
describe("SENTINEL — a suspended overlay declares itself", () => {
  const REL = "src/components/chart/MainChart.tsx";
  /** COMMENT-STRIPPED: every claim below is also discussed in prose in that file. */
  const src = fs
    .readFileSync(path.join(process.cwd(), REL), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("the renderer consumes the verdict, not the boolean", () => {
    expect(src, REL).toMatch(/overlayFrameVerdict\s*\(/);
    expect(src, `${REL} → the discarded-reason form must be gone`).not.toMatch(
      /shouldDrawOverlay\s*\(/,
    );
  });

  it("a hidden tab with VP requested stamps vpSuspended", () => {
    // Without this, an absent `data-vp-*` means BOTH "no profile was asked for"
    // and "a profile was asked for and the tab was never looked at".
    expect(src, `${REL} → suspension must be published`).toMatch(/ds\.vpSuspended\s*=/);
    expect(src, `${REL} → only when a profile was actually requested`).toMatch(
      /fixedVPActive\s*\|\|\s*sessionVPActive\s*\)\s*ds\.vpSuspended/,
    );
  });

  it("a BUDGET skip stamps nothing — ordinary pacing is not a suspension", () => {
    // Stamping every inter-frame gap would make the attribute permanent and
    // therefore meaningless, since most frames are BUDGET skips by design.
    expect(src, `${REL} → BUDGET must be excluded`).toMatch(
      /verdict\.skipped\s*!==\s*"BUDGET"/,
    );
  });

  it("a resumed paint CLEARS the stamp — a stale suspension is a false one", () => {
    // The tab comes back to the foreground and paints. Leaving `vpSuspended` on
    // the canvas would report a withheld receipt while the receipt is right
    // there beside it, contradicting itself in the same dataset.
    expect(src, `${REL} → the stamp must be cleared on draw`).toMatch(
      /delete\s+canvasRef\.current\.dataset\.vpSuspended/,
    );
  });
});
