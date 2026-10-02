import { describe, expect, it } from "vitest";
import { POSTURE_QUIET, TIER_CEILING } from "./selectAttentionGovernor";
import { DIMMED_ALPHA, HANDOVER_ALPHA } from "./selectRegimeLighting";

/**
 * Founder, 2026-10-01: "the ones that barely have an opacity … we need the
 * opacity so you can actually see everything". Measured on serving ES1! 5m:
 * WAIT posture × SUPPORTING ceiling put every supporting sense at 0.61, and a
 * dimmed regime fixture at 0.22. Floors raised; the hierarchy is kept.
 */
describe("senses stay visible while the room waits", () => {
  it("a supporting sense under WAIT reads at ≥ 0.74", () => {
    expect(TIER_CEILING.SUPPORTING * POSTURE_QUIET).toBeGreaterThanOrEqual(0.74);
    expect(POSTURE_QUIET).toBeLessThan(1);
  });
  it("a dimmed regime fixture is a dimmer, still readable, and below handover", () => {
    expect(DIMMED_ALPHA).toBeGreaterThanOrEqual(0.45);
    expect(DIMMED_ALPHA).toBeLessThan(HANDOVER_ALPHA);
  });
});
