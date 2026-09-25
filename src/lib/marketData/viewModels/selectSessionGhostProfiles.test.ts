import { describe, expect, it } from "vitest";
import { selectSessionGhostProfiles, GHOST_ROWS } from "./selectSessionGhostProfiles";

const session = (start: number, n: number, mid: number) =>
  Array.from({ length: n }, (_, i) => ({
    time: start + i * 300, open: mid, close: mid, high: mid + (i % 3 === 0 ? 2 : 0.5), low: mid - 0.5, volume: 100,
  }));

describe("selectSessionGhostProfiles", () => {
  it("refuses with no bars", () => {
    expect(selectSessionGhostProfiles([]).reason).toBe("NO_BARS");
  });

  it("refuses a single session (24/7 tape has no prior session to remember)", () => {
    expect(selectSessionGhostProfiles(session(0, 60, 100)).reason).toBe("NO_PRIOR_SESSION");
  });

  it("compiles one ghost per completed session, newest first, labelled bar-distributed", () => {
    const bars = [...session(0, 30, 100), ...session(100_000, 30, 110), ...session(200_000, 30, 120)];
    const vm = selectSessionGhostProfiles(bars);
    expect(vm.drawn).toBe(true);
    expect(vm.fidelity).toBe("BAR_DISTRIBUTED");
    expect(vm.ghosts.map(g => g.sessionsAgo)).toEqual([1, 2]);
    expect(vm.ghosts[0].rows).toHaveLength(GHOST_ROWS);
    expect(Math.max(...vm.ghosts[0].rows.map(r => r.share))).toBe(1);
    // The heaviest row sits where every bar overlaps, near the session mid.
    expect(Math.abs(vm.ghosts[0].poc - 110)).toBeLessThan(0.6);
  });

  it("skips a session too short to have a shape", () => {
    const bars = [...session(0, 5, 100), ...session(100_000, 30, 120)];
    expect(selectSessionGhostProfiles(bars).reason).toBe("NO_PRIOR_SESSION");
  });
});
