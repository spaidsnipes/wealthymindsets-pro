import { describe, expect, it, vi } from "vitest";
import { proofNoLabelsRequested, setCanvasTextSilenced } from "./proofNoLabels";

describe("proof=nolabels", () => {
  it("is requested only by the exact parameter", () => {
    expect(proofNoLabelsRequested("?symbol=TSLA&tf=15m&proof=nolabels")).toBe(true);
    expect(proofNoLabelsRequested("?proof=nolabels")).toBe(true);
    expect(proofNoLabelsRequested("?symbol=TSLA")).toBe(false);
    expect(proofNoLabelsRequested("?proof=labels")).toBe(false);
    expect(proofNoLabelsRequested("")).toBe(false);
  });

  it("silences text but nothing else, and restores the exact originals", () => {
    const fillText = vi.fn();
    const strokeText = vi.fn();
    const fillRect = vi.fn();
    const ctx = { fillText, strokeText, fillRect };
    expect(setCanvasTextSilenced(ctx, true)).toBe(true);
    ctx.fillText("POC 372.10", 0, 0);
    ctx.strokeText("VAH", 0, 0);
    ctx.fillRect(0, 0, 1, 1);
    expect(fillText).not.toHaveBeenCalled();
    expect(strokeText).not.toHaveBeenCalled();
    expect(fillRect).toHaveBeenCalledTimes(1);
    // Idempotent: a second frame does not wrap the no-op as the "original".
    setCanvasTextSilenced(ctx, true);
    setCanvasTextSilenced(ctx, false);
    expect(ctx.fillText).toBe(fillText);
    expect(ctx.strokeText).toBe(strokeText);
    ctx.fillText("back", 0, 0);
    expect(fillText).toHaveBeenCalledTimes(1);
  });
});
